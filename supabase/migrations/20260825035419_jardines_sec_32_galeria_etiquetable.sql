-- ════════════════════════════════════════════════════════════════════════════
-- sec_32 · LA GALERÍA SE PUEDE ETIQUETAR
-- ════════════════════════════════════════════════════════════════════════════
--
-- ESTADO: aplicada con autorización explícita del dueño (2026-08-24).
--
-- ── QUÉ RESUELVE ────────────────────────────────────────────────────────────
--
-- 69 medios en la galería. Cero con título. Y, sobre todo, cero con forma de saber QUÉ SALE
-- EN LA FOTO. La tabla solo tiene `imagen_url`, `titulo` y `orden`.
--
-- Eso significa que hoy no se puede construir nada de esto:
--
--   · los filtros de /galeria por espacio y por tipo de evento
--   · la galería propia de cada página de espacio
--   · las fotos de las páginas de evento
--   · los textos `alt`, que son accesibilidad y son SEO de imágenes
--   · las imágenes de Open Graph, que es lo que se ve al compartir por WhatsApp
--
-- Cinco cosas distintas, bloqueadas por la misma causa: falta el dato.
--
-- ── ESTA MIGRACIÓN NO ETIQUETA NADA ─────────────────────────────────────────
--
-- Abre el hueco. Llenarlo es trabajo humano y no se puede automatizar sin inventar: nadie
-- más que quien conoce el recinto sabe si esa foto es del Salón Encanto o del de los Espejos.
-- Son 69 piezas a ~30 segundos cada una, media hora larga, y es la tarea de mayor retorno de
-- todo el rediseño porque desbloquea las cinco cosas de arriba de una sola vez.
--
-- Mientras tanto el sitio funciona: /galeria muestra los 69 medios sin filtros, y las columnas
-- nuevas vienen nulas sin romper nada.
--
-- ── POR QUÉ `on delete set null` Y NO `cascade` ─────────────────────────────
--
-- Borrar un salón del panel NO puede llevarse por delante sus fotos. La foto sigue siendo una
-- foto buena del recinto aunque el espacio se renombre o se reorganice; lo que se pierde es
-- la etiqueta, no el medio. `cascade` aquí borraría patrimonio por un cambio de catálogo.

-- ── PRECONDICIONES ──────────────────────────────────────────────────────────
do $$
declare v_cols int;
begin
  select count(*) into v_cols from information_schema.columns
   where table_schema = 'jardines' and table_name = 'galeria';
  if v_cols <> 5 then
    raise exception 'Precondicion fallida: galeria deberia tener 5 columnas, tiene %.', v_cols;
  end if;
  if to_regclass('jardines.tipos_evento') is null then
    raise exception 'Precondicion fallida: falta jardines.tipos_evento, aplicar sec_31 antes.';
  end if;
end $$;

-- ── 1. COLUMNAS NUEVAS ──────────────────────────────────────────────────────
alter table jardines.galeria
  add column if not exists alt              text,
  add column if not exists salon_id         uuid,
  add column if not exists tipo_evento_slug text,
  add column if not exists destacada        boolean not null default false;

alter table jardines.galeria drop constraint if exists galeria_salon_fk;
alter table jardines.galeria add constraint galeria_salon_fk
  foreign key (salon_id) references jardines.salones (id) on delete set null;

alter table jardines.galeria drop constraint if exists galeria_tipo_evento_fk;
alter table jardines.galeria add constraint galeria_tipo_evento_fk
  foreign key (tipo_evento_slug) references jardines.tipos_evento (slug) on delete set null;

create index if not exists galeria_por_salon  on jardines.galeria (salon_id) where salon_id is not null;
create index if not exists galeria_por_evento on jardines.galeria (tipo_evento_slug) where tipo_evento_slug is not null;
create index if not exists galeria_destacadas on jardines.galeria (destacada) where destacada;

comment on column jardines.galeria.alt is
  'Describe la imagen para quien no la ve. Sin amontonar palabras clave: eso penaliza.';
comment on column jardines.galeria.destacada is
  'Sale en la Home o en el hero de su pagina. Etiquetar pocas.';

-- ── 2. PERMISOS. Por columna, como el resto de esta tabla desde sec_27 ──────
grant select (alt, salon_id, tipo_evento_slug, destacada)
  on jardines.galeria to anon, authenticated;
grant insert (alt, salon_id, tipo_evento_slug, destacada)
  on jardines.galeria to authenticated;
grant update (alt, salon_id, tipo_evento_slug, destacada)
  on jardines.galeria to authenticated;

-- ── 3. VERIFICACIÓN ─────────────────────────────────────────────────────────
do $$
declare v_grants int; v_medios int;
begin
  select count(*) into v_grants from information_schema.column_privileges
   where table_schema = 'jardines' and table_name = 'galeria'
     and grantee = 'anon' and privilege_type = 'SELECT';
  if v_grants <> 9 then
    raise exception 'Verificacion fallida: anon deberia leer 9 columnas de galeria, lee %.', v_grants;
  end if;

  select count(*) into v_medios from jardines.galeria;
  if v_medios < 1 then
    raise exception 'Verificacion fallida: la galeria quedo vacia.';
  end if;
  raise notice 'sec_32: % medios listos para etiquetar.', v_medios;
end $$;
