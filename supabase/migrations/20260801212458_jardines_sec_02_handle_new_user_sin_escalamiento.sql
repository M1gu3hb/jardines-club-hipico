-- jardines_sec_02 — Elimina el escalamiento de privilegios por raw_user_meta_data
--
-- HALLAZGO
--   jardines.handle_new_user() tomaba el rol de `new.raw_user_meta_data->>'rol'`.
--   Ese campo lo controla el cliente (es el `data` de signUp / updateUser), así que
--   cualquiera que pudiera registrarse podía pedir rol 'admin'.
--
-- SEGUNDO HALLAZGO (infraestructura compartida)
--   El trigger vive en auth.users, que Jardines COMPARTE con Vero Seguros. Por eso
--   los 9 usuarios de Auth tienen perfil de Jardines, incluido el administrador de
--   Vero (quedó como 'cliente'). Eso es un perfil cruzado entre aplicaciones.
--
-- AISLAMIENTO DE VERO — por qué este cambio no lo afecta
--   Vero autoriza con public.is_admin(), que lee EXCLUSIVAMENTE public.admin_users:
--     select exists (select 1 from public.admin_users a where a.user_id = auth.uid())
--   No consulta jardines.perfiles en ningún punto. Dejar de crear perfiles de
--   Jardines para usuarios de Vero no cambia una sola decisión de autorización suya.
--   Además el trigger nunca lanza excepción: si algo fallara, el alta del usuario de
--   Vero sigue completándose igual que antes.
--
-- MODELO NUEVO
--   1. Pertenencia a Jardines: solo por señal server-side (app_metadata, que únicamente
--      escribe la Admin API con service_role; tabla privada de aprovisionamiento; o los
--      dominios sintéticos que solo generan nuestras propias funciones serverless).
--   2. Rol: el trigger jamás concede más que el rol seguro por defecto ('cliente').
--      La promoción a 'operativo' o 'admin' exige jardines.asignar_rol(), que solo
--      puede ejecutar service_role desde una operación administrativa autenticada.
--   3. raw_user_meta_data NO se lee para autorización. Solo se usa 'nombre', que es
--      un dato de presentación sin efecto en permisos.

-- ---------------------------------------------------------------------------
-- Aprovisionamiento: invitaciones emitidas por el servidor
-- ---------------------------------------------------------------------------
create table if not exists jardines_private.aprovisionamiento (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  rol          text not null check (rol in ('cliente', 'operativo', 'admin')),
  creado_por   uuid,
  created_at   timestamptz not null default now(),
  expira_at    timestamptz not null default now() + interval '7 days',
  consumido_at timestamptz
);
alter table jardines_private.aprovisionamiento enable row level security;

create unique index if not exists aprovisionamiento_email_pendiente_idx
  on jardines_private.aprovisionamiento (lower(email))
  where consumido_at is null;

-- Dominios sintéticos que SOLO puede crear nuestro backend (api/crear-usuario-evento.js
-- y el alta de personal). Un usuario de Vero nunca cae en ellos.
create or replace function jardines_private.es_dominio_jardines(p_email text)
returns boolean
language sql
immutable
security definer
set search_path = ''
as $$
  select lower(coalesce(p_email, '')) like '%@portal.jardines.local'
      or lower(coalesce(p_email, '')) like '%@staff.jardines.local';
$$;

-- ---------------------------------------------------------------------------
-- Trigger de alta de usuario
-- ---------------------------------------------------------------------------
create or replace function jardines.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_apro jardines_private.aprovisionamiento;
  v_rol  text;
  v_es_jardines boolean;
begin
  -- 1) ¿Este usuario pertenece a Jardines? Solo señales controladas por el servidor.
  select * into v_apro
  from jardines_private.aprovisionamiento a
  where lower(a.email) = lower(coalesce(new.email, ''))
    and a.consumido_at is null
    and a.expira_at > now()
  limit 1;

  v_es_jardines :=
       v_apro.id is not null
    or coalesce(new.raw_app_meta_data ->> 'app', '') = 'jardines'
    or jardines_private.es_dominio_jardines(new.email);

  -- 2) Si no es de Jardines (caso típico: usuario de Vero Seguros), no se crea
  --    ningún perfil. Ahí termina el perfil cruzado entre aplicaciones.
  if not v_es_jardines then
    return new;
  end if;

  -- 3) El rol NUNCA sale de raw_user_meta_data. O viene de una invitación emitida
  --    por el servidor, o es el rol seguro por defecto.
  v_rol := coalesce(v_apro.rol, 'cliente');
  if v_rol not in ('cliente', 'operativo', 'admin') then
    v_rol := 'cliente';
  end if;

  insert into jardines.perfiles (user_id, rol, nombre, email)
  values (new.id, v_rol, new.raw_user_meta_data ->> 'nombre', new.email)
  on conflict (user_id) do nothing;

  if v_apro.id is not null then
    update jardines_private.aprovisionamiento
       set consumido_at = now()
     where id = v_apro.id;
  end if;

  perform jardines_private.auditar(
    'alta_usuario', 'ok', 'perfiles', new.id, null, null,
    jsonb_build_object('rol', v_rol, 'via', case when v_apro.id is not null then 'aprovisionamiento' else 'default' end));

  return new;
exception when others then
  -- Regla dura: el alta en auth.users (compartida con Vero) jamás debe fallar
  -- por culpa de este trigger.
  perform jardines_private.auditar('alta_usuario', 'error', 'perfiles', new.id, null, null,
    jsonb_build_object('sqlstate', sqlstate));
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Promoción de rol: operación administrativa protegida
-- ---------------------------------------------------------------------------
-- Única vía para conceder 'operativo' o 'admin'. EXECUTE exclusivo de service_role,
-- es decir: solo desde el servidor, después de que la función serverless verificó
-- que quien llama es admin. Ni anon ni authenticated pueden invocarla.
create or replace function jardines.asignar_rol(
  p_user_id uuid,
  p_rol     text,
  p_nombre  text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_rol not in ('cliente', 'operativo', 'admin') then
    raise exception 'rol invalido';
  end if;

  insert into jardines.perfiles (user_id, rol, nombre)
  values (p_user_id, p_rol, p_nombre)
  on conflict (user_id) do update
    set rol    = excluded.rol,
        nombre = coalesce(excluded.nombre, jardines.perfiles.nombre);

  perform jardines_private.auditar(
    'cambio_rol', 'ok', 'perfiles', p_user_id, null, null,
    jsonb_build_object('rol', p_rol));
end $$;

revoke all on function jardines.asignar_rol(uuid, text, text) from public, anon, authenticated;
grant execute on function jardines.asignar_rol(uuid, text, text) to service_role;

-- Registra una invitación de aprovisionamiento (la usa el backend antes de crear
-- el usuario). También exclusiva de service_role.
create or replace function jardines.aprovisionar_usuario(
  p_email text,
  p_rol   text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_rol not in ('cliente', 'operativo', 'admin') then
    raise exception 'rol invalido';
  end if;

  insert into jardines_private.aprovisionamiento (email, rol, creado_por)
  values (lower(trim(p_email)), p_rol, auth.uid())
  on conflict (lower(email)) where consumido_at is null
  do update set rol = excluded.rol, expira_at = now() + interval '7 days';

  perform jardines_private.auditar('aprovisionar_usuario', 'ok', 'aprovisionamiento', null, null,
    jardines_private.hash_clave(lower(trim(p_email))), jsonb_build_object('rol', p_rol));
end $$;

revoke all on function jardines.aprovisionar_usuario(text, text) from public, anon, authenticated;
grant execute on function jardines.aprovisionar_usuario(text, text) to service_role;

-- El rol solo puede tomar valores conocidos.
alter table jardines.perfiles drop constraint if exists perfiles_rol_valido;
alter table jardines.perfiles add constraint perfiles_rol_valido
  check (rol in ('cliente', 'operativo', 'admin'));
