-- ════════════════════════════════════════════════════════════════════════════
-- sec_31 · LOS TIPOS DE EVENTO EXISTEN COMO DATO
-- ════════════════════════════════════════════════════════════════════════════
--
-- ESTADO: aplicada con autorización explícita del dueño (2026-08-24).
--
-- ── QUÉ RESUELVE ────────────────────────────────────────────────────────────
--
-- Hoy «boda» no existe en ninguna parte de la base. Es una opción de un desplegable y una
-- palabra suelta dentro de la descripción de un salón. Nada más.
--
-- Y resulta que las páginas por tipo de evento son LAS DE MAYOR VALOR COMERCIAL de todo el
-- rediseño: son las que capturan «salón para boda en Xochimilco», que es como busca la gente.
-- Nadie busca «Salón de los Espejos» sin conocerlo ya; todo el mundo busca «salón para XV años».
--
-- ── LA PIEZA CLAVE ES `activo` ──────────────────────────────────────────────
--
-- Las seis filas nacen con `activo = false`, TODAS, sin excepción. Porque hoy el contenido
-- propio de cada una es literalmente de cero palabras.
--
-- Una fila inactiva no se enlaza desde ningún sitio y no entra en el sitemap. El día que
-- alguien escriba las 350 palabras propias y etiquete sus fotos, se pone en true y la página
-- aparece sola. Así la plantilla se puede construir hoy sin publicar seis páginas vacías, que
-- es exactamente lo que el encargo prohíbe y lo que Google castiga como contenido delgado.
--
-- Publicar seis páginas con el mismo texto reescrito sería peor que no publicar ninguna.
--
-- ── PERMISOS ────────────────────────────────────────────────────────────────
--
-- Tabla nueva en `jardines`: el RLS NO se activa solo. `rls_auto_enable` cubre `public`, y
-- `public` es de Vero. Aquí se activa a mano, y los GRANT van explícitos porque `sec_27`
-- retiró los privilegios por defecto.

-- ── PRECONDICIONES ──────────────────────────────────────────────────────────
do $$
begin
  if to_regclass('jardines.tipos_evento') is not null then
    raise exception 'Precondicion fallida: jardines.tipos_evento ya existe.';
  end if;
  if to_regclass('jardines.salones') is null then
    raise exception 'Precondicion fallida: no se ve jardines.salones, conexion equivocada.';
  end if;
end $$;

-- ── 1. LA TABLA ─────────────────────────────────────────────────────────────
create table jardines.tipos_evento (
  id                     uuid primary key default gen_random_uuid(),
  slug                   text not null unique,
  nombre                 text not null,
  descripcion_corta      text,
  descripcion_larga      text,
  imagen_hero            text,
  galeria                jsonb not null default '[]'::jsonb,
  espacios_recomendados  jsonb not null default '[]'::jsonb,
  servicios_relacionados jsonb not null default '[]'::jsonb,
  preguntas              jsonb not null default '[]'::jsonb,
  seo_title              text,
  seo_description        text,
  og_image               text,
  activo                 boolean not null default false,
  orden                  integer not null default 0,
  created_at             timestamptz not null default now()
);

comment on table jardines.tipos_evento is
  'Una fila por tipo de evento. Alimenta /eventos y /eventos/{slug}.';
comment on column jardines.tipos_evento.activo is
  'false = la pagina NO se enlaza ni entra en el sitemap. Se pone en true solo cuando la fila tiene contenido propio real: 350+ palabras distintas, 4+ fotos suyas y 3+ preguntas.';
comment on column jardines.tipos_evento.espacios_recomendados is
  'Array de slugs de jardines.salones. Sin FK a proposito: es una lista ordenada por criterio comercial, no una relacion.';

-- ── 2. RLS. A mano, porque este esquema no lo hereda ────────────────────────
alter table jardines.tipos_evento enable row level security;

create policy contenido_lectura on jardines.tipos_evento
  for select to anon, authenticated using (true);

create policy contenido_admin_ins on jardines.tipos_evento
  for insert to authenticated with check (jardines.is_admin());

create policy contenido_admin_upd on jardines.tipos_evento
  for update to authenticated using (jardines.is_admin()) with check (jardines.is_admin());

create policy contenido_admin_del on jardines.tipos_evento
  for delete to authenticated using (jardines.is_admin());

-- ── 3. PERMISOS EXPLÍCITOS ──────────────────────────────────────────────────
-- Nada sensible vive en esta tabla, asi que el grant va a nivel de tabla y no por columna.
grant select                         on jardines.tipos_evento to anon;
grant select, insert, update, delete on jardines.tipos_evento to authenticated;

-- ── 4. LAS SEIS FILAS, TODAS APAGADAS ───────────────────────────────────────
insert into jardines.tipos_evento (slug, nombre, orden, activo) values
  ('bodas',        'Bodas',                 1, false),
  ('xv-anos',      'XV Años',               2, false),
  ('cumpleanos',   'Cumpleaños',            3, false),
  ('infantiles',   'Eventos infantiles',    4, false),
  ('corporativos', 'Eventos corporativos',  5, false),
  ('nocturnos',    'Eventos nocturnos',     6, false);

-- ── 5. VERIFICACIÓN ─────────────────────────────────────────────────────────
do $$
declare v_filas int; v_activas int; v_pol int; v_rls boolean;
begin
  select count(*) into v_filas   from jardines.tipos_evento;
  select count(*) into v_activas from jardines.tipos_evento where activo;
  select count(*) into v_pol     from pg_policies
   where schemaname = 'jardines' and tablename = 'tipos_evento';
  select relrowsecurity into v_rls from pg_class
   where oid = 'jardines.tipos_evento'::regclass;

  if v_filas <> 6 then
    raise exception 'Verificacion fallida: se esperaban 6 tipos, hay %.', v_filas;
  end if;
  if v_activas <> 0 then
    raise exception 'Verificacion fallida: % tipos nacieron activos y ninguno tiene contenido.', v_activas;
  end if;
  if not v_rls then
    raise exception 'Verificacion fallida: RLS quedo APAGADO en tipos_evento.';
  end if;
  if v_pol <> 4 then
    raise exception 'Verificacion fallida: se esperaban 4 politicas, hay %.', v_pol;
  end if;
end $$;
