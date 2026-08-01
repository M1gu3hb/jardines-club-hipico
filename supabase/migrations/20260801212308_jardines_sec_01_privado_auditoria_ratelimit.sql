-- jardines_sec_01 — Esquema privado + auditoría + rate limit (Jardines Club Hípico)
--
-- ALCANCE: solo Jardines. No toca `public` (Vero) ni el bucket site-media.
--
-- Crea `jardines_private`, un esquema NO expuesto en la Data API: anon y
-- authenticated no tienen USAGE, así que nada de aquí es alcanzable por PostgREST.
-- Es el lugar donde viven los helpers internos, la auditoría y el rate limit.

create schema if not exists jardines_private;

-- Nadie salvo el propietario y el servidor. Sin USAGE no hay forma de resolver
-- un nombre dentro del esquema, ni siquiera para funciones con EXECUTE.
revoke all on schema jardines_private from public;
grant usage on schema jardines_private to postgres, service_role;

-- Que los objetos futuros tampoco queden abiertos por defecto.
alter default privileges in schema jardines_private revoke all on tables from public;
alter default privileges in schema jardines_private revoke all on functions from public;

-- ---------------------------------------------------------------------------
-- Pepper para hashes irreversibles
-- ---------------------------------------------------------------------------
-- Las claves de rate limit y auditoría se guardan hasheadas. Un SHA plano de un
-- correo o de un token es reversible por diccionario/fuerza bruta, así que se
-- usa HMAC con un pepper aleatorio que solo vive aquí.
create table if not exists jardines_private.secretos (
  clave      text primary key,
  valor      bytea not null,
  created_at timestamptz not null default now()
);
alter table jardines_private.secretos enable row level security;

insert into jardines_private.secretos (clave, valor)
values ('hash_pepper', extensions.gen_random_bytes(32))
on conflict (clave) do nothing;

create or replace function jardines_private.hash_clave(p_texto text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select encode(
    extensions.hmac(
      convert_to(coalesce(p_texto, ''), 'utf8'),
      (select s.valor from jardines_private.secretos s where s.clave = 'hash_pepper'),
      'sha256'::text),
    'hex');
$$;

-- ---------------------------------------------------------------------------
-- Auditoría de operaciones sensibles (aislada de public.content_audit de Vero)
-- ---------------------------------------------------------------------------
create table if not exists jardines_private.auditoria (
  id          bigint generated always as identity primary key,
  ocurrido_at timestamptz not null default now(),
  accion      text not null,
  entidad     text,
  entidad_id  uuid,
  evento_id   uuid,
  actor_uid   uuid,          -- auth.uid() cuando hay sesión
  actor_hash  text,          -- hash de la identidad operativa cuando no hay sesión
  resultado   text not null check (resultado in ('ok', 'denegado', 'error')),
  detalle     jsonb not null default '{}'::jsonb
);
alter table jardines_private.auditoria enable row level security;

create index if not exists auditoria_ocurrido_idx on jardines_private.auditoria (ocurrido_at desc);
create index if not exists auditoria_evento_idx   on jardines_private.auditoria (evento_id, ocurrido_at desc);
create index if not exists auditoria_accion_idx   on jardines_private.auditoria (accion, ocurrido_at desc);

-- Nunca recibe el token completo: quien llama pasa ya un hash o un prefijo corto.
create or replace function jardines_private.auditar(
  p_accion     text,
  p_resultado  text,
  p_entidad    text default null,
  p_entidad_id uuid default null,
  p_evento_id  uuid default null,
  p_actor_hash text default null,
  p_detalle    jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into jardines_private.auditoria
    (accion, resultado, entidad, entidad_id, evento_id, actor_uid, actor_hash, detalle)
  values
    (p_accion, p_resultado, p_entidad, p_entidad_id, p_evento_id,
     auth.uid(), p_actor_hash, coalesce(p_detalle, '{}'::jsonb));
exception when others then
  -- La auditoría nunca debe tumbar la operación que la origina.
  null;
end $$;

-- ---------------------------------------------------------------------------
-- Rate limit server-side, persistente y seguro ante concurrencia
-- ---------------------------------------------------------------------------
create table if not exists jardines_private.rate_limit (
  bucket         text        not null,
  clave_hash     text        not null,
  ventana_inicio timestamptz not null,
  intentos       integer     not null default 0,
  expira_at      timestamptz not null,
  primary key (bucket, clave_hash, ventana_inicio)
);
alter table jardines_private.rate_limit enable row level security;

create index if not exists rate_limit_expira_idx on jardines_private.rate_limit (expira_at);

-- Borra ventanas vencidas. Se invoca de forma oportunista desde consumir().
create or replace function jardines_private.rate_limit_limpiar()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from jardines_private.rate_limit where expira_at < now();
$$;

-- Consume una unidad del cubo y devuelve true si la operación sigue permitida.
--
-- El INSERT ... ON CONFLICT DO UPDATE ... RETURNING es una sola sentencia
-- atómica: toma el lock de la fila, así que dos llamadas en paralelo no pueden
-- perder un incremento (el caso clásico de lost update de leer-y-luego-escribir).
create or replace function jardines_private.rate_limit_consumir(
  p_bucket  text,
  p_clave   text,
  p_max     integer,
  p_ventana interval
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash   text;
  v_inicio timestamptz;
  v_n      integer;
begin
  -- La clave nunca se guarda en claro: ni token, ni correo, ni IP.
  v_hash   := jardines_private.hash_clave(p_bucket || ':' || coalesce(p_clave, ''));
  v_inicio := date_bin(p_ventana, now(), timestamptz 'epoch');

  insert into jardines_private.rate_limit (bucket, clave_hash, ventana_inicio, intentos, expira_at)
  values (p_bucket, v_hash, v_inicio, 1, v_inicio + p_ventana * 2)
  on conflict (bucket, clave_hash, ventana_inicio) do update
    set intentos = jardines_private.rate_limit.intentos + 1
  returning intentos into v_n;

  -- Limpieza oportunista: ~1 de cada 100 llamadas paga el costo.
  if random() < 0.01 then
    perform jardines_private.rate_limit_limpiar();
  end if;

  return v_n <= p_max;
end $$;

-- Identidad de red que sí controla el servidor: la cabecera que inyecta el
-- gateway de Supabase, nunca un campo del body. Si no hay, devuelve null y
-- quien llama debe usar otra clave (p. ej. el propio token).
create or replace function jardines_private.ip_solicitante()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_h text;
begin
  v_h := nullif(current_setting('request.headers', true), '');
  if v_h is null then return null; end if;
  -- El primer valor de x-forwarded-for es el cliente según el gateway.
  return nullif(split_part(coalesce((v_h::jsonb) ->> 'x-forwarded-for', ''), ',', 1), '');
exception when others then
  return null;
end $$;

-- Error genérico: no revela si el token existe, expiró o fue revocado.
create or replace function jardines_private.error_generico()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'no disponible' using errcode = '42501';
end $$;

revoke all on function jardines_private.hash_clave(text)                          from public;
revoke all on function jardines_private.auditar(text, text, text, uuid, uuid, text, jsonb) from public;
revoke all on function jardines_private.rate_limit_consumir(text, text, integer, interval) from public;
revoke all on function jardines_private.rate_limit_limpiar()                      from public;
revoke all on function jardines_private.ip_solicitante()                          from public;
revoke all on function jardines_private.error_generico()                          from public;
