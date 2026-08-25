-- ════════════════════════════════════════════════════════════════════════════
-- sec_30 · CADA ESPACIO PUEDE TENER PÁGINA PROPIA
-- ════════════════════════════════════════════════════════════════════════════
--
-- ESTADO: aplicada con autorización explícita del dueño (2026-08-24).
--
-- ── QUÉ RESUELVE ────────────────────────────────────────────────────────────
--
-- El rediseño convierte la landing en un sitio: cada uno de los 8 espacios pasa a tener su
-- propia URL indexable. Para eso a `salones` le faltaba todo: no hay slug, no hay metadatos
-- de buscador, no hay forma de decir «este espacio es hospedaje, no un salón», y no hay dónde
-- guardar sus preguntas frecuentes ni sus datos rápidos.
--
-- ── EL HALLAZGO DE CAPACIDAD, QUE ES LO IMPORTANTE ──────────────────────────
--
-- `capacidad_min` NO ES UN MÍNIMO DE RENTA. Nunca lo fue. Preguntado el dueño directamente,
-- su respuesta fue que «no hay capacidad mínima de renta»: el número pequeño es una
-- RECOMENDACIÓN ESTÉTICA — por debajo de él «se ve medio vacío el salón». Y aun así rentan
-- por debajo, rellenando con salitas y sillones.
--
-- Eso da la vuelta al dato. Un comparador que descarte un salón por no llegar al «mínimo»
-- estaría rechazando rentas que el negocio hoy acepta con gusto. Por eso:
--
--   · `capacidad_min` / `capacidad_max` quedan documentados como RECOMENDADO (ver COMMENT).
--   · Nace `capacidad_maxima_real`: lo que de verdad cabe. Jardines se anuncia como 600 y
--     admite ~1 000. Sin esta columna, un evento de 800 personas se va a la competencia
--     porque nuestra propia web dice que no cabe.
--
-- ── DOS DECISIONES PARA NO ROMPER PRODUCCIÓN ────────────────────────────────
--
-- 1. `slug` queda ANULABLE, no `not null`. El panel del CRM inserta salones sin enviar slug;
--    un `not null` reventaría esa inserción desde el primer día. Un salón sin slug
--    simplemente todavía no tiene página — el sitio filtra por `slug is not null`.
--
-- 2. GRANT EXPLÍCITO, COLUMNA POR COLUMNA. Desde `sec_27` los permisos de este esquema son
--    por columna (13 de 13 en `salones`). Una columna nueva NACE SIN PERMISO: `anon` no la ve
--    y el sitio la leería como null sin un solo error en consola. Ese es el fallo silencioso
--    más caro posible aquí, y por eso los GRANT van abajo y la verificación también.
--
-- ── LO QUE NO TOCA ──────────────────────────────────────────────────────────
--
-- Nada del esquema `public` (Vero Seguros). Ninguna fila se borra. Ninguna columna existente
-- se elimina ni cambia de tipo. Solo se corrigen tres valores de capacidad, y se corrigen
-- porque hoy son falsos.

-- ── PRECONDICIONES ──────────────────────────────────────────────────────────
do $$
declare v_n int; v_cols int;
begin
  select count(*) into v_n from jardines.salones;
  if v_n <> 8 then
    raise exception 'Precondicion fallida: se esperaban 8 salones, hay %.', v_n;
  end if;

  select count(*) into v_cols from information_schema.columns
   where table_schema = 'jardines' and table_name = 'salones';
  if v_cols <> 13 then
    raise exception 'Precondicion fallida: salones deberia tener 13 columnas, tiene %.', v_cols;
  end if;

  if not exists (select 1 from jardines.salones where nombre = 'Jardines' and capacidad_min is null) then
    raise exception 'Precondicion fallida: Jardines ya no tiene capacidad_min nula, el estado cambio.';
  end if;
end $$;

-- ── 1. COLUMNAS NUEVAS ──────────────────────────────────────────────────────
alter table jardines.salones
  add column if not exists slug                   text,
  add column if not exists tipo_espacio           text,
  add column if not exists capacidad_maxima_real  integer,
  add column if not exists capacidad_hospedaje    integer,
  add column if not exists eventos_ideales        jsonb not null default '[]'::jsonb,
  add column if not exists servicios_relacionados jsonb not null default '[]'::jsonb,
  add column if not exists preguntas              jsonb not null default '[]'::jsonb,
  add column if not exists datos_rapidos          jsonb not null default '[]'::jsonb,
  add column if not exists seo_title              text,
  add column if not exists seo_description        text,
  add column if not exists og_image               text;

create unique index if not exists salones_slug_unico
  on jardines.salones (slug) where slug is not null;

alter table jardines.salones drop constraint if exists salones_tipo_espacio_valido;
alter table jardines.salones add constraint salones_tipo_espacio_valido
  check (tipo_espacio is null or tipo_espacio in
         ('salon', 'aire_libre', 'ceremonia', 'infantil', 'hospedaje'));

alter table jardines.salones drop constraint if exists salones_capacidad_coherente;
alter table jardines.salones add constraint salones_capacidad_coherente
  check (capacidad_maxima_real is null or capacidad_max is null
         or capacidad_maxima_real >= capacidad_max);

-- ── 2. QUÉ SIGNIFICA CADA COSA (queda en la base, no solo en un .md) ────────
comment on column jardines.salones.capacidad_min is
  'RECOMENDADO, no minimo de renta. Por debajo el salon se ve vacio; se renta igual y se rellena con salitas. NUNCA usar para descartar un espacio en un filtro.';
comment on column jardines.salones.capacidad_max is
  'Maximo RECOMENDADO, el que se anuncia. Para el tope real usar capacidad_maxima_real.';
comment on column jardines.salones.capacidad_maxima_real is
  'Lo que de verdad cabe, cuando supera al anunciado. Null = no supera a capacidad_max.';
comment on column jardines.salones.slug is
  'Fijado a mano, nunca derivado del nombre. Anulable: sin slug no hay pagina publica. Una vez publicado no se cambia sin redirect 301.';
comment on column jardines.salones.tipo_espacio is
  'salon | aire_libre | ceremonia | infantil | hospedaje. Distingue lo que NO es capacidad de evento.';

-- ── 3. SLUGS, a mano, porque derivarlos da nombres feos ─────────────────────
update jardines.salones set slug = 'salon-de-los-espejos' where nombre = 'Salón de los Espejos';
update jardines.salones set slug = 'salon-encanto'        where nombre = 'Salón Encanto';
update jardines.salones set slug = 'eclipse'              where nombre = 'Espacio Nocturno (Eclipse)';
update jardines.salones set slug = 'jardines'             where nombre = 'Jardines';
update jardines.salones set slug = 'area-infantil-pony'   where nombre = 'Área Infantil Pony';
update jardines.salones set slug = 'capilla'              where nombre = 'Capilla';
update jardines.salones set slug = 'quiosco'              where nombre = 'Quiosco';
update jardines.salones set slug = 'estancias'            where nombre = 'Estancias (Bungalos)';

update jardines.salones set tipo_espacio = 'salon'
  where slug in ('salon-de-los-espejos', 'salon-encanto', 'eclipse');
update jardines.salones set tipo_espacio = 'aire_libre'
  where slug in ('jardines', 'quiosco');
update jardines.salones set tipo_espacio = 'ceremonia'  where slug = 'capilla';
update jardines.salones set tipo_espacio = 'infantil'   where slug = 'area-infantil-pony';
update jardines.salones set tipo_espacio = 'hospedaje'  where slug = 'estancias';

-- ── 4. LAS TRES CAPACIDADES QUE HOY SON FALSAS ──────────────────────────────
-- Espejos: la ficha decia 300-400 y el dato guardado 150. El dueño zanja: «ponle cien
-- personas; a partir de cien ya se ve bien». Lo han rentado desde 60.
update jardines.salones
   set capacidad_min = 100, capacidad = '100-400 personas'
 where slug = 'salon-de-los-espejos';

-- Eclipse: la ficha decia 80-120 y el dato guardado 50. El dueño: «lo mismo, el minimo es
-- para no verse vacio». Se alinea al texto que el propio dueño ya habia escrito.
update jardines.salones
   set capacidad_min = 80
 where slug = 'eclipse';

-- Jardines: el espacio mas grande quedaba FUERA DE TODO FILTRO NUMERICO por tener las dos
-- capacidades nulas. Se anuncia 400-600; caben ~1 000 «facil», palabra del dueño.
update jardines.salones
   set capacidad_min = 400, capacidad_max = 600, capacidad_maxima_real = 1000
 where slug = 'jardines';

-- ── 5. PERMISOS. Sin esto el sitio no ve NADA de lo anterior ────────────────
grant select (slug, tipo_espacio, capacidad_maxima_real, capacidad_hospedaje,
              eventos_ideales, servicios_relacionados, preguntas, datos_rapidos,
              seo_title, seo_description, og_image)
  on jardines.salones to anon, authenticated;

grant insert (slug, tipo_espacio, capacidad_maxima_real, capacidad_hospedaje,
              eventos_ideales, servicios_relacionados, preguntas, datos_rapidos,
              seo_title, seo_description, og_image)
  on jardines.salones to authenticated;

grant update (slug, tipo_espacio, capacidad_maxima_real, capacidad_hospedaje,
              eventos_ideales, servicios_relacionados, preguntas, datos_rapidos,
              seo_title, seo_description, og_image)
  on jardines.salones to authenticated;

-- ── 6. VERIFICACIÓN. Falla ruidosamente si algo quedo a medias ──────────────
do $$
declare v_sin_slug int; v_grants int;
begin
  select count(*) into v_sin_slug from jardines.salones where slug is null;
  if v_sin_slug > 0 then
    raise exception 'Verificacion fallida: % salones quedaron sin slug.', v_sin_slug;
  end if;

  select count(*) into v_grants from information_schema.column_privileges
   where table_schema = 'jardines' and table_name = 'salones'
     and grantee = 'anon' and privilege_type = 'SELECT';
  if v_grants <> 24 then
    raise exception 'Verificacion fallida: anon deberia leer 24 columnas, lee %.', v_grants;
  end if;

  if exists (select 1 from jardines.salones
              where tipo_espacio <> 'hospedaje' and capacidad_max is null) then
    raise exception 'Verificacion fallida: queda un espacio de evento sin capacidad_max.';
  end if;
end $$;
