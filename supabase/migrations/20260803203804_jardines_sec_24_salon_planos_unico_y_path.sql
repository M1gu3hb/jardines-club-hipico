-- jardines_sec_24 — Una sola fila de plano por salón, y guardar el path del objeto
--
-- QUÉ ARREGLA
--   1. `salon_planos` solo tenía el índice NO único `salon_planos_salon_id_idx`
--      (`sec_07`). La regla "una fila por salón" vivía únicamente en el estado de
--      React. El camino de fallo probable no es la concurrencia: el shim devuelve
--      `[]` cuando la lectura falla, así que un fallo transitorio pinta "Subir
--      plano" aunque la fila exista → `create()` → segunda fila. Con duplicados,
--      `r[0]` es arbitrario en los dos lados (la tabla no está en `CON_ORDEN` y
--      nadie pasa `sort`), así que el admin ve el plano nuevo y `MesaEditor`
--      sigue pintando el viejo.
--   2. La fila guardaba solo `imagen_plano_url`, nunca el path del objeto. Como
--      `storage.upload` genera ruta nueva cada vez (`upsert:false`), cada
--      reemplazo dejaba un huérfano en el bucket **y no quedaba forma de
--      localizarlo**: el bucket es público y el listado está cerrado, así que el
--      archivo seguía descargable para siempre sin asa para limpiarlo.
--
-- ADITIVA: añade una columna anulable y un índice. No borra ni reescribe datos,
-- no toca policies ni grants, y no toca absolutamente nada de `public` (Vero).
--
-- El índice único va SIN `concurrently` a propósito: dentro de un `do $$` no se
-- puede, y la tabla es diminuta (0 filas al escribir esto).
do $$
declare
  v_dups integer;
  v_nulos integer;
begin
  -- ── PRECONDICIÓN: no puede haber duplicados, o el índice fallaría ──────────
  select count(*) into v_dups
  from (select salon_id from jardines.salon_planos
        where salon_id is not null
        group by salon_id having count(*) > 1) d;

  if v_dups > 0 then
    raise exception
      'Precondicion fallida: % salon(es) con mas de una fila en salon_planos. Deduplica antes. Nada modificado.', v_dups;
  end if;

  -- Filas sin salón: no las cubre el índice (los NULL no colisionan) pero son
  -- basura que nadie puede usar. Se reporta en vez de borrarlas en silencio.
  select count(*) into v_nulos from jardines.salon_planos where salon_id is null;
  if v_nulos > 0 then
    raise exception
      'Precondicion fallida: % fila(s) de salon_planos sin salon_id. Revisalas a mano. Nada modificado.', v_nulos;
  end if;

  -- ── CAMBIOS ───────────────────────────────────────────────────────────────
  alter table jardines.salon_planos
    add column if not exists imagen_plano_path text;

  comment on column jardines.salon_planos.imagen_plano_path is
    'Ruta del objeto en el bucket `planos`. Sin ella no se puede borrar el archivo al reemplazar o quitar el plano, y el bucket es publico.';

  create unique index if not exists salon_planos_salon_id_uniq
    on jardines.salon_planos (salon_id);

  -- ── COMPROBACIÓN POSTERIOR ────────────────────────────────────────────────
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'jardines' and table_name = 'salon_planos'
      and column_name = 'imagen_plano_path'
  ) then
    raise exception 'No se creo imagen_plano_path. Se revierte.';
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'jardines' and tablename = 'salon_planos'
      and indexname = 'salon_planos_salon_id_uniq'
  ) then
    raise exception 'No se creo el indice unico. Se revierte.';
  end if;

  -- RLS tiene que seguir activo: la columna nueva no cambia policies, pero si
  -- alguien hubiera tocado la tabla entremedias, mejor enterarse aquí.
  if not (select relrowsecurity from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'jardines' and c.relname = 'salon_planos') then
    raise exception 'salon_planos quedo sin RLS. Se revierte.';
  end if;

  perform jardines_private.auditar(
    'salon_planos_unicidad', 'ok', 'salon_planos', null, null, null,
    jsonb_build_object(
      'cambios', jsonb_build_array(
        'add column imagen_plano_path text',
        'create unique index salon_planos_salon_id_uniq (salon_id)'),
      'motivo', 'una fila por salon a nivel de base, y poder borrar el objeto del bucket al reemplazar o quitar',
      'migracion', 'jardines_sec_24'));
end $$;
