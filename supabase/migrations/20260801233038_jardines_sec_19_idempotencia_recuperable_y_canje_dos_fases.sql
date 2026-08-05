-- jardines_sec_19 — Idempotencia recuperable y canje de acceso en dos fases
--
-- (A) sec_15 reclamaba la clave con ON CONFLICT DO NOTHING: evita el duplicado,
--     pero si el envío fallaba DESPUÉS de reclamar, la clave quedaba consumida
--     para siempre y el correo no se podía reintentar nunca.
-- (B) canjear_acceso_unico marcaba el token usado ANTES de que generateLink
--     confirmara: si Supabase fallaba en medio, el enlace quedaba quemado.
alter table jardines_private.idempotencia
  add column if not exists estado      text not null default 'completado',
  add column if not exists lease_hasta timestamptz,
  add column if not exists intentos    integer not null default 0;
alter table jardines_private.idempotencia drop constraint if exists idempotencia_estado_valido;
alter table jardines_private.idempotencia add constraint idempotencia_estado_valido
  check (estado in ('procesando','completado','fallido'));

-- Devuelve 'procede' | 'duplicado' | 'en_curso'
create or replace function jardines.api_idem_iniciar(
  p_endpoint text, p_clave text, p_lease_seg integer default 60, p_horas integer default 24)
returns text language plpgsql security definer set search_path = ''
as $$
declare v_hash text; v_fila jardines_private.idempotencia; v_ins integer;
begin
  delete from jardines_private.idempotencia where expira_at < now();
  v_hash := jardines_private.hash_clave('idem:' || p_endpoint || ':' || coalesce(p_clave,''));
  insert into jardines_private.idempotencia (clave_hash,endpoint,expira_at,estado,lease_hasta,intentos)
  values (v_hash,p_endpoint, now() + make_interval(hours => greatest(coalesce(p_horas,24),1)),
          'procesando', now() + make_interval(secs => greatest(coalesce(p_lease_seg,60),5)), 1)
  on conflict (clave_hash) do nothing;
  get diagnostics v_ins = row_count;
  if v_ins = 1 then return 'procede'; end if;

  select * into v_fila from jardines_private.idempotencia where clave_hash = v_hash for update;
  if v_fila.estado = 'completado' then return 'duplicado'; end if;
  if v_fila.estado = 'procesando' and v_fila.lease_hasta is not null
     and v_fila.lease_hasta > now() then return 'en_curso'; end if;

  -- 'fallido', o 'procesando' con lease vencido (proceso interrumpido): se retoma.
  update jardines_private.idempotencia
     set estado='procesando',
         lease_hasta = now() + make_interval(secs => greatest(coalesce(p_lease_seg,60),5)),
         intentos = v_fila.intentos + 1
   where clave_hash = v_hash;
  return 'procede';
end $$;

create or replace function jardines.api_idem_cerrar(p_endpoint text, p_clave text, p_ok boolean)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  update jardines_private.idempotencia
     set estado = case when p_ok then 'completado' else 'fallido' end, lease_hasta = null
   where clave_hash = jardines_private.hash_clave('idem:' || p_endpoint || ':' || coalesce(p_clave,''));
end $$;

alter table jardines_private.acceso_unico add column if not exists lease_hasta timestamptz;

-- Fase 1: toma el enlace SIN consumirlo. Devuelve también el rol, porque el
-- enlace de un admin no puede terminar en el portal del cliente.
create or replace function jardines.canjear_acceso_iniciar(p_token text)
returns table (user_id uuid, rol text) language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid;
begin
  if coalesce(trim(p_token),'') = '' then return; end if;
  update jardines_private.acceso_unico a set lease_hasta = now() + interval '2 minutes'
   where a.token_hash = jardines_private.hash_clave('acceso:' || p_token)
     and a.usado_at is null and a.expira_at > now()
     and (a.lease_hasta is null or a.lease_hasta < now())
  returning a.user_id into v_uid;
  if v_uid is null then
    perform jardines_private.auditar('acceso_unico_canjeado','denegado','perfiles',null);
    return;
  end if;
  return query select v_uid,
    coalesce((select p.rol from jardines.perfiles p where p.user_id = v_uid),'cliente');
end $$;

-- Fase 2: solo se consume cuando el paso siguiente ya salió bien.
create or replace function jardines.canjear_acceso_confirmar(p_token text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  update jardines_private.acceso_unico set usado_at = now(), lease_hasta = null
   where token_hash = jardines_private.hash_clave('acceso:' || p_token) and usado_at is null;
  perform jardines_private.auditar('acceso_unico_canjeado','ok','perfiles',null);
end $$;

create or replace function jardines.canjear_acceso_liberar(p_token text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  update jardines_private.acceso_unico set lease_hasta = null
   where token_hash = jardines_private.hash_clave('acceso:' || p_token) and usado_at is null;
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'jardines.api_idem_iniciar(text, text, integer, integer)',
    'jardines.api_idem_cerrar(text, text, boolean)',
    'jardines.canjear_acceso_iniciar(text)',
    'jardines.canjear_acceso_confirmar(text)',
    'jardines.canjear_acceso_liberar(text)']
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
