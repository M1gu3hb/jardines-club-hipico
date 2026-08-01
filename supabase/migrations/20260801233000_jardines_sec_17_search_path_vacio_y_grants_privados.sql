-- jardines_sec_17 — search_path vacío en las SECURITY DEFINER que faltaban
--
-- Con `search_path = 'jardines, public'` un objeto creado en `public` con el
-- mismo nombre que uno de `jardines` podría capturar la resolución. Con
-- search_path = '' no hay búsqueda posible: todo va calificado.
create or replace function jardines.es_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from jardines.perfiles p where p.user_id = auth.uid() and p.rol = 'admin'); $$;

create or replace function jardines.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from jardines.perfiles p where p.user_id = auth.uid() and p.rol = 'admin'); $$;

create or replace function jardines.is_my_event(evt uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from jardines.eventos e where e.id = evt and e.auth_user_id = auth.uid()); $$;

create or replace function jardines.client_can_edit(evt uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from jardines.eventos e
    join jardines.evento_reglas_mesas r on r.evento_id = e.id
    where e.id = evt and e.auth_user_id = auth.uid() and r.cliente_puede_editar = true);
$$;

create or replace function jardines.mi_personal_id() returns uuid
language sql stable security definer set search_path = ''
as $$ select p.id from jardines.operativo_personal p
      where p.auth_user_id = auth.uid() and p.activo = true limit 1; $$;

create or replace function jardines.resena_moderacion() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if not jardines.is_admin() then
    new.aprobada := false;
    new.enviada_google := coalesce(new.enviada_google, false);
  end if;
  return new;
end $$;

create or replace function jardines.info_mesa_publica(p_token text) returns json
language plpgsql security definer set search_path = ''
as $$
declare r json;
begin
  select json_build_object('ok', true, 'mesa', m.nombre, 'evento', e.nombre_evento,
    'fecha', e.fecha_evento, 'salon', s.nombre, 'tipo', e.tipo_evento)
  into r
  from jardines.mesas m
    join jardines.eventos e on e.id = m.evento_id
    left join jardines.salones s on s.id = e.salon_id
  where m.token = p_token;
  return coalesce(r, json_build_object('ok', false));
end $$;

-- CREATE OR REPLACE no repone grants; se vuelven a fijar los mínimos.
do $$
declare f text;
begin
  foreach f in array array[
    'jardines.is_admin()','jardines.es_admin()','jardines.is_my_event(uuid)',
    'jardines.client_can_edit(uuid)','jardines.mi_personal_id()',
    'jardines.mis_canales()','jardines.mis_canales_escuchar()','jardines.mis_canales_hablar()',
    'jardines.eventos_operativos_permitidos()']
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

revoke all on function jardines.info_mesa_publica(text) from public, anon, authenticated;
revoke all on function jardines.resena_moderacion()     from public, anon, authenticated;

-- Que las funciones futuras del esquema privado no nazcan con EXECUTE para
-- PUBLIC (el valor por omisión de PostgreSQL, y justo lo que arrastraron tres
-- funciones nuevas en sec_11).
alter default privileges for role postgres in schema jardines_private revoke all on functions from public;
alter default privileges for role postgres in schema jardines_private revoke all on tables    from public;
alter default privileges for role postgres in schema jardines         revoke execute on functions from public;

-- Barrido final: ninguna función de jardines_private con EXECUTE público.
do $$
declare r record;
begin
  for r in select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
           from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'jardines_private'
  loop
    execute format('revoke all on function %I.%I(%s) from public, anon, authenticated',
                   r.nspname, r.proname, r.args);
  end loop;
end $$;
