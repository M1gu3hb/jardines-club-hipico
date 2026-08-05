-- jardines_sec_25 — De qué solicitud salió cada evento
--
-- QUÉ AÑADE
--   `jardines.eventos.solicitud_id`, una referencia opcional a la solicitud que originó el
--   evento. Sin ella, convertir una solicitud en evento funciona pero queda **huérfana**: no
--   hay forma de saber después de dónde salió un evento, ni de ver desde una solicitud que ya
--   se convirtió — que es justo lo que impide convertirla tres veces sin enterarse.
--
-- POR QUÉ ANULABLE, Y POR QUÉ `ON DELETE SET NULL`
--   - **Anulable**: los seis eventos que ya existen no vienen de ninguna solicitud, y los que
--     se creen a mano tampoco. Exigirla obligaría a inventar una solicitud falsa por evento.
--   - **SET NULL, no CASCADE**: borrar una solicitud NO puede llevarse el evento. La solicitud
--     es el lead; el evento es el contrato. Perder el rastro es aceptable; perder el evento,
--     no. Es el mismo criterio que ya siguen `resenas`, `notificaciones` y
--     `operativo_ubicaciones` respecto a `eventos`.
--
-- ÍNDICE
--   Se añade sobre la columna nueva. La consulta que la usa es la inversa —"¿esta solicitud ya
--   generó un evento?"— y una FK sin índice es además lo que los advisors marcan y lo que el
--   bloque B7 ya limpió en el resto del schema.
--
-- ADITIVA: añade una columna anulable, una FK y un índice. No borra ni reescribe datos, no
-- toca policies ni grants, y **no toca absolutamente nada de Vero Seguros**.
--
-- OJO (J-10): las policies de `jardines` conceden la fila entera, no columnas, así que esta
-- columna la podrá escribir cualquier admin desde el navegador — igual que `salon_id` o
-- `estatus`. Aquí es aceptable: es trazabilidad, no una entrada de ninguna operación
-- destructiva. No añade superficie nueva al problema de J-10.
do $$
declare
  v_ya integer;
  v_pk text;
  v_tipo text;
  v_rls boolean;
begin
  -- ── PRECONDICIÓN 1: la columna no puede existir ya ──────────────────────────
  select count(*) into v_ya
  from information_schema.columns
  where table_schema = 'jardines' and table_name = 'eventos' and column_name = 'solicitud_id';

  if v_ya > 0 then
    raise notice 'sec_25: jardines.eventos.solicitud_id ya existe. Nada que hacer.';
    return;
  end if;

  -- ── PRECONDICIÓN 2: `solicitudes` tiene la PK esperada, y es uuid ───────────
  -- Sin esto la FK apuntaría a otra cosa o fallaría a mitad.
  select string_agg(a.attname, ',' order by k.ord) into v_pk
  from pg_constraint c
  join unnest(c.conkey) with ordinality k(attnum, ord) on true
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
  where c.conrelid = 'jardines.solicitudes'::regclass and c.contype = 'p';

  if v_pk is distinct from 'id' then
    raise exception
      'Precondicion fallida: la PK de jardines.solicitudes es "%", se esperaba "id". Nada modificado.', v_pk;
  end if;

  select format_type(atttypid, atttypmod) into v_tipo
  from pg_attribute
  where attrelid = 'jardines.solicitudes'::regclass and attname = 'id';

  if v_tipo is distinct from 'uuid' then
    raise exception
      'Precondicion fallida: jardines.solicitudes.id es "%", se esperaba uuid. Nada modificado.', v_tipo;
  end if;

  -- ── PRECONDICIÓN 3: RLS activo en `eventos` ANTES de tocar nada ─────────────
  select relrowsecurity into v_rls from pg_class where oid = 'jardines.eventos'::regclass;
  if not coalesce(v_rls, false) then
    raise exception
      'Precondicion fallida: RLS NO esta activo en jardines.eventos. Nada modificado.';
  end if;

  -- ── EL CAMBIO ───────────────────────────────────────────────────────────────
  alter table jardines.eventos
    add column solicitud_id uuid
    references jardines.solicitudes(id) on delete set null;

  create index if not exists eventos_solicitud_id_idx
    on jardines.eventos (solicitud_id)
    where solicitud_id is not null;

  -- ── POSCONDICIÓN: RLS sigue activo ─────────────────────────────────────────
  -- `alter table ... add column` no lo desactiva, pero afirmarlo es barato y esta base es
  -- compartida: si alguna vez dejara de cumplirse, es mejor que la migración lo grite.
  select relrowsecurity into v_rls from pg_class where oid = 'jardines.eventos'::regclass;
  if not coalesce(v_rls, false) then
    raise exception 'Poscondicion fallida: RLS quedo desactivado en jardines.eventos.';
  end if;

  raise notice 'sec_25: jardines.eventos.solicitud_id creada (uuid, anulable, on delete set null) + indice parcial.';
end $$;
