-- ════════════════════════════════════════════════════════════════════════════════
-- jardines_02_tables
-- ════════════════════════════════════════════════════════════════════════════════
--
-- RESCATADA DEL LEDGER, no escrita a mano. 2026-08-27.
--
-- Esta migración se aplicó a la base el 2026-07-05 y su archivo no existía en ningún
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


-- ============ CONTENIDO DEL SITIO ============
create table jardines.config_sitio (
  id uuid primary key default gen_random_uuid(),
  logo_url text, telefono_contacto text, whatsapp_numero text, correo_admin text,
  ubicacion_texto text, ubicacion_link_mapa text, informacion_servicios text, texto_no_incluye text,
  proximamente_activo boolean default true, proximamente_imagen_url text, proximamente_titulo text,
  proximamente_descripcion text, proximamente_texto_boton text,
  color_primario text default '#C9A84C', color_secundario text default '#FFFFFF',
  created_at timestamptz default now()
);

create table jardines.salones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null, descripcion text, descripcion_larga text, capacidad text,
  capacidad_min int, capacidad_max int, imagen_principal text,
  imagenes jsonb default '[]'::jsonb, caracteristicas jsonb default '[]'::jsonb,
  activo boolean default true, orden int, created_at timestamptz default now()
);

create table jardines.galeria (
  id uuid primary key default gen_random_uuid(),
  imagen_url text not null, titulo text, orden int, created_at timestamptz default now()
);

create table jardines.servicios (
  id uuid primary key default gen_random_uuid(),
  titulo text not null, descripcion text, imagen_url text, imagenes_url jsonb default '[]'::jsonb,
  activo boolean default true, orden int, created_at timestamptz default now()
);

create table jardines.amenidades (
  id uuid primary key default gen_random_uuid(),
  titulo text not null, descripcion text, imagen_url text, imagenes_url jsonb default '[]'::jsonb,
  activo boolean default true, orden int, created_at timestamptz default now()
);

create table jardines.servicios_extra (
  id uuid primary key default gen_random_uuid(),
  nombre text not null, categoria text, descripcion text, aplica_a text default 'todos',
  activo boolean default true, orden int, created_at timestamptz default now()
);

create table jardines.alimentos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null, descripcion text, pdf_url text,
  activo boolean default true, orden int, created_at timestamptz default now()
);

create table jardines.resenas_config (
  id uuid primary key default gen_random_uuid(),
  rating numeric, google_url text, stats jsonb default '[]'::jsonb, created_at timestamptz default now()
);

-- ============ AUTH / ROLES ============
create table jardines.perfiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  rol text not null default 'cliente' check (rol in ('admin','cliente')),
  nombre text, telefono text, email text, created_at timestamptz default now()
);

-- ============ EVENTOS / PORTAL ============
create table jardines.eventos (
  id uuid primary key default gen_random_uuid(),
  nombre_evento text not null, tipo_evento text, fecha_evento date,
  salon_id uuid references jardines.salones(id) on delete set null,
  estatus text default 'Apartado' check (estatus in ('Apartado','Confirmado','Realizado','Cancelado')),
  portal_activo boolean default false, anticipo_pagado boolean default false,
  usuario text unique, auth_user_id uuid references auth.users(id) on delete set null,
  cliente_nombre text, cliente_email text, cliente_telefono text, notas text,
  confirmado_cliente boolean default false, created_at timestamptz default now()
);

create table jardines.documentos (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references jardines.eventos(id) on delete cascade,
  tipo text default 'otro' check (tipo in ('cotizacion','contrato','otro')),
  titulo text, archivo_url text, subido_por uuid, created_at timestamptz default now()
);

create table jardines.items_contratados (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references jardines.eventos(id) on delete cascade,
  descripcion text not null, cantidad int default 1, precio numeric, notas text, orden int,
  created_at timestamptz default now()
);

-- ============ RESEÑAS (FK a eventos) ============
create table jardines.resenas (
  id uuid primary key default gen_random_uuid(),
  autor text, texto text, estrellas int, evento text,
  aprobada boolean default true, orden int,
  evento_id uuid references jardines.eventos(id) on delete set null,
  enviada_google boolean default false, created_at timestamptz default now()
);

-- ============ LEADS ============
create table jardines.solicitudes (
  id uuid primary key default gen_random_uuid(),
  folio text, fecha_envio text, hora_envio text, nombre_completo text, telefono text, email text,
  direccion text, rfc text, salon_seleccionado text, tipo_evento text, fecha_tentativa date,
  horario_inicio text, horario_fin text, numero_personas int, manteleria_preferida text,
  actividades_extras jsonb default '[]'::jsonb, comentarios text,
  acepto_aviso_privacidad boolean default false, estatus text default 'Nueva',
  created_at timestamptz default now()
);

-- ============ EDITOR DE MESAS ============
create table jardines.salon_planos (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid references jardines.salones(id) on delete cascade,
  imagen_plano_url text, ancho int default 1000, alto int default 700, notas text,
  created_at timestamptz default now()
);

create table jardines.evento_reglas_mesas (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null unique references jardines.eventos(id) on delete cascade,
  formas_permitidas jsonb default '["redonda","cuadrada"]'::jsonb,
  opciones_personas jsonb, capacidad_libre boolean default false,
  cliente_puede_editar boolean default false, created_at timestamptz default now()
);

create table jardines.mesas (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references jardines.eventos(id) on delete cascade,
  nombre text, forma text default 'redonda' check (forma in ('redonda','cuadrada')),
  pos_x numeric default 50, pos_y numeric default 50, rotacion numeric default 0,
  capacidad int default 8, orden int, created_at timestamptz default now()
);

create table jardines.invitados (
  id uuid primary key default gen_random_uuid(),
  mesa_id uuid not null references jardines.mesas(id) on delete cascade,
  nombre text, notas text, created_at timestamptz default now()
);

-- ============ QR / CONTROL DE ACCESO ============
create table jardines.invitaciones (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references jardines.eventos(id) on delete cascade,
  mesa_id uuid references jardines.mesas(id) on delete set null,
  token text not null unique, nombre_invitado text,
  max_personas int default 1, personas_registradas int default 0,
  estatus text default 'pendiente', created_at timestamptz default now()
);

create table jardines.accesos (
  id uuid primary key default gen_random_uuid(),
  invitacion_id uuid not null references jardines.invitaciones(id) on delete cascade,
  mesa_id uuid references jardines.mesas(id) on delete set null,
  personas int not null, registrado_por uuid, registrado_at timestamptz default now()
);

-- ============ CRONOGRAMA / MÚSICA ============
create table jardines.cronograma (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references jardines.eventos(id) on delete cascade,
  hora time, titulo text, descripcion text, orden int, created_at timestamptz default now()
);

create table jardines.musica (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references jardines.eventos(id) on delete cascade,
  tipo text default 'poner' check (tipo in ('poner','no_poner')),
  cancion text, artista text, notas text, created_at timestamptz default now()
);

-- Índices útiles
create index on jardines.salones(orden);
create index on jardines.galeria(orden);
create index on jardines.servicios(orden);
create index on jardines.amenidades(orden);
create index on jardines.eventos(auth_user_id);
create index on jardines.documentos(evento_id);
create index on jardines.items_contratados(evento_id);
create index on jardines.mesas(evento_id);
create index on jardines.invitaciones(evento_id);
create index on jardines.invitaciones(token);
create index on jardines.cronograma(evento_id);
create index on jardines.musica(evento_id);
;
