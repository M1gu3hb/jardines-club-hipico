-- ════════════════════════════════════════════════════════════════════════════════
-- operativo_01_schema
-- ════════════════════════════════════════════════════════════════════════════════
--
-- RESCATADA DEL LEDGER, no escrita a mano. 2026-08-27.
--
-- Esta migración se aplicó a la base el 2026-07-07 y su archivo no existía en ningún
-- repositorio: se perdió, o nunca se guardó. Durante meses el historial estuvo incompleto sin
-- que se notara, porque una migración aplicada no vuelve a hacer falta hasta el día que hay que
-- reconstruir desde cero — y ese día es tarde para descubrirlo.
--
-- El texto de abajo es EXACTAMENTE el que Supabase guardó en
-- `supabase_migrations.schema_migrations.statements` al aplicarla. No se ha reformateado ni
-- corregido nada: si algo aquí parece mejorable, se arregla en una migración NUEVA, porque
-- reescribir una ya aplicada hace que el archivo y la base cuenten historias distintas.
--
-- EL NOMBRE DEL ARCHIVO LLEVA SU VERSIÓN ORIGINAL a propósito. Con ese prefijo, el CLI de
-- Supabase la da por aplicada y un `db push` NO la vuelve a ejecutar. Cambiarlo la convertiría
-- en una migración nueva que intentaría crear tablas que ya existen.
-- ════════════════════════════════════════════════════════════════════════════════

-- ============ OPERATIVO (Modo Evento): esquema base ============

-- Roster GLOBAL del equipo (se reutiliza entre eventos)
create table if not exists jardines.operativo_personal (
  id uuid primary key default gen_random_uuid(),
  usuario text unique not null,
  nombre text not null,
  rol text not null default 'empleado' check (rol in ('empleado','staff','coordinador','gerente')),
  telefono text,
  auth_user_id uuid,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Canales de comunicación (grupos de radio). La membresía define quién habla/escucha con quién.
create table if not exists jardines.operativo_canales (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  color text default '#C9A84C',
  es_general boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists jardines.operativo_personal_canal (
  personal_id uuid not null references jardines.operativo_personal(id) on delete cascade,
  canal_id uuid not null references jardines.operativo_canales(id) on delete cascade,
  puede_hablar boolean not null default true,
  puede_escuchar boolean not null default true,
  primary key (personal_id, canal_id)
);

-- Activación del operativo por evento
alter table jardines.eventos
  add column if not exists operativo_activo boolean not null default false,
  add column if not exists operativo_desde timestamptz;

-- Ubicación en vivo (una fila por persona; se actualiza con GPS)
create table if not exists jardines.operativo_ubicaciones (
  personal_id uuid primary key references jardines.operativo_personal(id) on delete cascade,
  evento_id uuid references jardines.eventos(id) on delete set null,
  lat double precision,
  lng double precision,
  precision_m double precision,
  actualizado_at timestamptz not null default now()
);

-- Transmisiones de radio (push-to-talk): clip de audio por canal
create table if not exists jardines.operativo_transmisiones (
  id uuid primary key default gen_random_uuid(),
  canal_id uuid not null references jardines.operativo_canales(id) on delete cascade,
  personal_id uuid references jardines.operativo_personal(id) on delete set null,
  audio_path text not null,
  duracion_ms integer,
  created_at timestamptz not null default now()
);
create index if not exists op_tx_canal_fecha on jardines.operativo_transmisiones(canal_id, created_at desc);

-- Cupo por mesa: token para el QR + contador de ocupación
alter table jardines.mesas
  add column if not exists token text,
  add column if not exists ocupadas integer not null default 0;
update jardines.mesas
  set token = replace(replace(replace(encode(gen_random_bytes(9),'base64'),'/','_'),'+','-'),'=','')
  where token is null;
create unique index if not exists mesas_token_uidx on jardines.mesas(token);

-- Helpers de RLS (SECURITY DEFINER: evitan recursión al leer operativo/perfiles)
create or replace function jardines.es_admin() returns boolean
  language sql stable security definer set search_path = jardines, public as $$
  select exists(select 1 from jardines.perfiles where user_id = auth.uid() and rol = 'admin');
$$;

create or replace function jardines.mi_personal_id() returns uuid
  language sql stable security definer set search_path = jardines, public as $$
  select id from jardines.operativo_personal where auth_user_id = auth.uid() and activo = true limit 1;
$$;

grant execute on function jardines.es_admin() to anon, authenticated;
grant execute on function jardines.mi_personal_id() to anon, authenticated;;
