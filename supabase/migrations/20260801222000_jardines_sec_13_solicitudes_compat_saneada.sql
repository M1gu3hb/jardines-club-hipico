-- jardines_sec_13 — Restablece el alta pública de solicitudes, ya saneada
--
-- ERROR DE ORDEN DE DESPLIEGUE (corregido aquí)
--   sec_05 movió el alta a la RPC `solicitud_crear` y revocó el INSERT de anon.
--   Pero la base es PRODUCCIÓN y el frontend nuevo todavía vive en la rama: el
--   formulario público desplegado seguía insertando directo, así que quedó roto.
--   El orden correcto es aditivo primero, retiro después.
--
-- SOLUCIÓN
--   Se devuelve el INSERT a anon, pero endurecido de verdad (no el WITH CHECK true
--   original): un trigger BEFORE INSERT sanea, valida y limita la tasa, así que da
--   igual qué mande el cliente. Los campos internos los fija el servidor.
--   Ambos caminos (INSERT directo y RPC) pasan por el MISMO trigger, así que tienen
--   exactamente las mismas garantías. El INSERT directo se podrá revocar cuando el
--   frontend nuevo esté desplegado y verificado.

create or replace function jardines.solicitud_saneo()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_ip text;
begin
  if jardines.is_admin() then
    return new;
  end if;

  v_ip := jardines_private.ip_solicitante();
  if not jardines_private.rate_limit_consumir('solicitud', coalesce(v_ip, 'global'),
        case when v_ip is not null then 5 else 200 end, interval '1 hour') then
    perform jardines_private.auditar('solicitud_crear', 'denegado', 'solicitudes', null, null, null,
      jsonb_build_object('motivo', 'rate_limit'));
    raise exception 'Demasiadas solicitudes. Intenta más tarde.' using errcode = '42501';
  end if;

  new.nombre_completo    := left(trim(coalesce(new.nombre_completo, '')), 120);
  new.telefono           := left(trim(coalesce(new.telefono, '')), 30);
  new.email              := nullif(left(trim(lower(coalesce(new.email, ''))), 160), '');
  new.salon_seleccionado := left(trim(coalesce(new.salon_seleccionado, 'Por definir')), 120);
  new.tipo_evento        := left(trim(coalesce(new.tipo_evento, '')), 80);
  new.comentarios        := left(trim(coalesce(new.comentarios, '')), 2000);

  if length(new.nombre_completo) < 2 then raise exception 'Nombre inválido'; end if;
  if new.telefono !~ '^[0-9+()\-\s]{7,30}$' then raise exception 'Teléfono inválido'; end if;
  if new.email is not null and new.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Correo inválido';
  end if;
  if new.acepto_aviso_privacidad is not true then
    raise exception 'Falta aceptar el aviso de privacidad';
  end if;
  if new.numero_personas is not null and (new.numero_personas < 0 or new.numero_personas > 5000) then
    raise exception 'Número de personas inválido';
  end if;
  if new.fecha_tentativa is not null
     and (new.fecha_tentativa < current_date - 1
          or new.fecha_tentativa > current_date + interval '5 years') then
    raise exception 'Fecha tentativa inválida';
  end if;

  new.estatus     := 'Nueva';
  new.folio       := 'JCH-' || upper(right(new.id::text, 6));
  new.fecha_envio := to_char(now() at time zone 'America/Mexico_City', 'DD/MM/YYYY');
  new.hora_envio  := to_char(now() at time zone 'America/Mexico_City', 'HH24:MI');
  new.direccion   := null;
  new.rfc         := null;

  return new;
end $$;

revoke all on function jardines.solicitud_saneo() from public, anon, authenticated;

drop trigger if exists trg_solicitud_saneo on jardines.solicitudes;
create trigger trg_solicitud_saneo
  before insert on jardines.solicitudes
  for each row execute function jardines.solicitud_saneo();

grant insert on jardines.solicitudes to anon;

drop policy if exists solicitudes_anon_ins on jardines.solicitudes;
create policy solicitudes_anon_ins on jardines.solicitudes
  as permissive for insert to anon, authenticated
  with check (
    acepto_aviso_privacidad = true
    and nombre_completo is not null
    and telefono is not null
  );

-- La RPC ya no consume su propio cubo: el rate limit vive en el trigger, así que
-- los dos caminos comparten exactamente el mismo contador.
create or replace function jardines.solicitud_crear(
  p_nombre_completo text,
  p_telefono        text,
  p_email           text default null,
  p_salon           text default null,
  p_tipo_evento     text default null,
  p_fecha_tentativa date default null,
  p_numero_personas integer default null,
  p_comentarios     text default null,
  p_acepto          boolean default false
) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_id uuid; v_folio text;
begin
  insert into jardines.solicitudes (
    nombre_completo, telefono, email, salon_seleccionado, tipo_evento,
    fecha_tentativa, numero_personas, comentarios, acepto_aviso_privacidad
  ) values (
    p_nombre_completo, p_telefono, p_email, p_salon, p_tipo_evento,
    p_fecha_tentativa, p_numero_personas, p_comentarios, p_acepto
  ) returning id, folio into v_id, v_folio;

  perform jardines_private.auditar('solicitud_crear', 'ok', 'solicitudes', v_id);

  return jsonb_build_object('id', v_id, 'folio', v_folio);
end $$;

revoke all on function jardines.solicitud_crear(text, text, text, text, text, date, integer, text, boolean) from public;
grant execute on function jardines.solicitud_crear(text, text, text, text, text, date, integer, text, boolean)
  to anon, authenticated;
