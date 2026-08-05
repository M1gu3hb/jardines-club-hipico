-- ════════════════════════════════════════════════════════════════════════════
-- sec_29 · EL LIBRO DE ENTRADAS SOBREVIVE A LA INVITACIÓN
-- ════════════════════════════════════════════════════════════════════════════
--
-- ESTADO: ⛔ ESCRITA Y ENSAYADA. **NO APLICADA.** Necesita el visto bueno del dueño.
--         El ensayo (en `BEGIN … ROLLBACK`) está al final de este archivo, comentado.
--
-- ── EL HALLAZGO ─────────────────────────────────────────────────────────────
--
--   accesos.invitacion_id → invitaciones(id)   ON DELETE **CASCADE**
--
-- `jardines.accesos` es el libro mayor de la puerta: una fila por escaneo, con cuántas personas
-- entraron y cuándo. Es la única evidencia de quién llegó de verdad —`invitaciones
-- .personas_registradas` es un contador que se puede recalcular, `accesos` es el hecho.
--
-- Y hoy se borra en cascada con la invitación. `MesaEditor.borrar()` borra las invitaciones de una
-- mesa: reorganizar el salón A MITAD DEL EVENTO —que es cuando se reorganiza— se lleva por delante
-- el registro de quién ya había entrado por esas mesas. Sin aviso, sin rastro, y justo el dato que
-- el dueño querría al día siguiente para cobrar por asistente o para cuadrar con el catering.
--
-- Hoy `accesos` tiene 0 filas: ningún evento ha pasado todavía por el flujo de QR. Es la ventana
-- buena para cambiarlo — sin datos que migrar y sin riesgo de perder nada.
--
-- ── POR QUÉ NO `RESTRICT` ───────────────────────────────────────────────────
--
-- `on delete restrict` impediría borrar una invitación con entradas registradas. Suena más
-- seguro y es peor: rompería `MesaEditor.borrar()` en la cara del cliente y, sobre todo,
-- rompería `api/eliminar-evento.js`, donde el borrado en cascada del evento SÍ es lo que se
-- quiere (el dueño pidió borrar el evento entero, con todo). El objetivo no es impedir borrados:
-- es que borrar una invitación no se lleve la evidencia de la puerta.
--
-- ── EL CAMBIO ───────────────────────────────────────────────────────────────
--
--   1. `accesos.evento_id` — columna nueva, con la FK al evento en CASCADE. Es la que mantiene el
--      libro atribuible cuando la invitación desaparece, y la que deja que `eliminar-evento` siga
--      llevándose todo lo del evento de una pieza.
--   2. `accesos.invitado_nombre`, `accesos.mesa_nombre` — instantánea en texto. Un id que apunta a
--      una fila borrada no dice nada; el nombre con el que entró alguien, sí. Se llenan al
--      registrar, no se recalculan.
--   3. `invitacion_id` pasa a admitir NULL y su FK a `ON DELETE SET NULL`.
--   4. `registrar_acceso` y `registrar_acceso_staff` escriben los campos nuevos.
--
-- Aditivo primero: las columnas y el `set null` no rompen a nadie que ya esté desplegado, porque
-- las columnas nuevas admiten NULL. Las funciones se reemplazan en la misma migración porque son
-- las únicas que insertan en `accesos` (comprobado: no hay ningún otro `insert into
-- jardines.accesos` en el repo ni en el catálogo de funciones).
--
-- ── VERO ────────────────────────────────────────────────────────────────────
-- Nada de `public`, nada de `auth`, nada de Storage. Solo `jardines`.

-- ── PRECONDICIONES ──────────────────────────────────────────────────────────
do $$
declare v_del char;
begin
  select confdeltype into v_del
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
   where n.nspname = 'jardines' and t.relname = 'accesos' and c.conname = 'accesos_invitacion_id_fkey';
  if v_del is null then
    raise exception 'Precondicion fallida: no existe `accesos_invitacion_id_fkey`.';
  end if;
  if v_del <> 'c' then
    raise notice 'sec_29: `accesos_invitacion_id_fkey` ya no era CASCADE (era %) — se normaliza igual.', v_del;
  end if;

  if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                  where n.nspname = 'jardines' and c.relname = 'accesos' and c.relrowsecurity) then
    raise exception 'Precondicion fallida: `accesos` no tiene RLS activo. Abortar.';
  end if;
end $$;

-- ── 1) COLUMNAS NUEVAS (aditivo, todas nullable) ────────────────────────────
alter table jardines.accesos add column if not exists evento_id uuid;
alter table jardines.accesos add column if not exists invitado_nombre text;
alter table jardines.accesos add column if not exists mesa_nombre text;

-- Relleno de lo que ya hubiera (hoy: cero filas, pero la migración no lo da por hecho).
update jardines.accesos a
   set evento_id = i.evento_id
  from jardines.invitaciones i
 where a.invitacion_id = i.id and a.evento_id is null;

update jardines.accesos a
   set invitado_nombre = i.nombre_invitado
  from jardines.invitaciones i
 where a.invitacion_id = i.id and a.invitado_nombre is null;

update jardines.accesos a
   set mesa_nombre = m.nombre
  from jardines.mesas m
 where a.mesa_id = m.id and a.mesa_nombre is null;

do $$
begin
  if not exists (select 1 from pg_constraint c
                  join pg_class t on t.oid = c.conrelid
                  join pg_namespace n on n.oid = t.relnamespace
                 where n.nspname = 'jardines' and t.relname = 'accesos'
                   and c.conname = 'accesos_evento_id_fkey') then
    alter table jardines.accesos
      add constraint accesos_evento_id_fkey
      foreign key (evento_id) references jardines.eventos(id) on delete cascade;
  end if;
end $$;

create index if not exists accesos_evento_id_idx on jardines.accesos (evento_id);

-- ── 2) LA FK DE LA INVITACIÓN DEJA DE ARRASTRAR ─────────────────────────────
alter table jardines.accesos alter column invitacion_id drop not null;

alter table jardines.accesos drop constraint accesos_invitacion_id_fkey;
alter table jardines.accesos
  add constraint accesos_invitacion_id_fkey
  foreign key (invitacion_id) references jardines.invitaciones(id) on delete set null;

-- ── 3) LOS DOS ÚNICOS ESCRITORES LLENAN LOS CAMPOS NUEVOS ───────────────────
create or replace function jardines.registrar_acceso(p_token text, p_personas integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare inv jardines.invitaciones; m jardines.mesas;
begin
  if not jardines.is_admin() then
    perform jardines_private.error_generico();
  end if;
  if not jardines_private.rate_limit_consumir('acceso_admin', auth.uid()::text, 600, interval '1 minute') then
    perform jardines_private.error_generico();
  end if;
  if p_personas is null or p_personas < 1 or p_personas > 50 then
    raise exception 'personas debe estar entre 1 y 50';
  end if;

  select * into inv from jardines.invitaciones i where i.token = p_token for update;
  if inv.id is null then
    perform jardines_private.fallo_token('invitacion');
    perform jardines_private.error_generico();
  end if;

  if inv.personas_registradas + p_personas > inv.max_personas then
    raise exception 'excede el cupo (max %, ya %, intento %)',
      inv.max_personas, inv.personas_registradas, p_personas;
  end if;

  update jardines.invitaciones
     set personas_registradas = personas_registradas + p_personas,
         estatus = case when personas_registradas + p_personas >= max_personas
                        then 'completo' else 'parcial' end
   where id = inv.id;

  select * into m from jardines.mesas mm where mm.id = inv.mesa_id;

  insert into jardines.accesos
    (invitacion_id, mesa_id, personas, registrado_por, evento_id, invitado_nombre, mesa_nombre)
  values
    (inv.id, inv.mesa_id, p_personas, auth.uid(), inv.evento_id, inv.nombre_invitado, m.nombre);

  perform jardines_private.auditar('registrar_acceso', 'ok', 'invitaciones', inv.id, inv.evento_id);

  return jsonb_build_object('ok', true, 'mesa', coalesce(m.nombre, 'Sin mesa'),
    'registradas', inv.personas_registradas + p_personas, 'max', inv.max_personas);
end $$;

revoke all on function jardines.registrar_acceso(text, integer) from public;
revoke all on function jardines.registrar_acceso(text, integer) from anon;
grant execute on function jardines.registrar_acceso(text, integer) to authenticated;

create or replace function jardines.registrar_acceso_staff(p_staff text, p_token text, p_personas integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_evento uuid; inv jardines.invitaciones; m jardines.mesas; v_en_mesa integer;
begin
  v_evento := jardines_private.evento_por_staff(p_staff);

  if p_personas is null or p_personas < 1 or p_personas > 50 then
    raise exception 'numero de personas invalido';
  end if;

  select * into inv from jardines.invitaciones i
   where i.token = p_token and i.evento_id = v_evento for update;
  if inv.id is null then
    perform jardines_private.fallo_token('invitacion');
    perform jardines_private.error_generico();
  end if;

  if inv.personas_registradas + p_personas > inv.max_personas then
    raise exception 'excede el cupo (max %, ya %, intento %)',
      inv.max_personas, inv.personas_registradas, p_personas;
  end if;

  -- EL AFORO DE LA MESA (sec_27).
  if inv.mesa_id is not null then
    select * into m from jardines.mesas mm where mm.id = inv.mesa_id;
    select coalesce(sum(i.personas_registradas), 0) into v_en_mesa
      from jardines.invitaciones i where i.mesa_id = inv.mesa_id;
    if m.capacidad is not null and v_en_mesa + p_personas > m.capacidad then
      raise exception 'excede el aforo de la mesa % (capacidad %, ya %, intento %)',
        coalesce(m.nombre, 'sin nombre'), m.capacidad, v_en_mesa, p_personas;
    end if;
  end if;

  update jardines.invitaciones
     set personas_registradas = personas_registradas + p_personas,
         estatus = case when personas_registradas + p_personas >= max_personas
                        then 'completo' else 'parcial' end
   where id = inv.id;

  select * into m from jardines.mesas mm where mm.id = inv.mesa_id;

  insert into jardines.accesos
    (invitacion_id, mesa_id, personas, registrado_por, evento_id, invitado_nombre, mesa_nombre)
  values
    (inv.id, inv.mesa_id, p_personas, null, v_evento, inv.nombre_invitado, m.nombre);

  perform jardines_private.auditar('registrar_acceso_staff', 'ok', 'invitaciones', inv.id, v_evento,
    jardines_private.hash_clave(p_staff), jsonb_build_object('personas', p_personas));

  return jsonb_build_object('ok', true, 'mesa', coalesce(m.nombre, 'Sin mesa'),
    'registradas', inv.personas_registradas + p_personas, 'max', inv.max_personas);
end $$;

revoke all on function jardines.registrar_acceso_staff(text, text, integer) from public;
grant execute on function jardines.registrar_acceso_staff(text, text, integer) to anon, authenticated;

-- ── POSCONDICIONES ──────────────────────────────────────────────────────────
do $$
declare v_del char; v_null boolean; v_ev char;
begin
  select confdeltype into v_del
    from pg_constraint c join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
   where n.nspname = 'jardines' and t.relname = 'accesos' and c.conname = 'accesos_invitacion_id_fkey';
  if v_del <> 'n' then
    raise exception 'Poscondicion fallida: `accesos.invitacion_id` no quedo en SET NULL (quedo %).', v_del;
  end if;

  select attnotnull into v_null from pg_attribute
   where attrelid = 'jardines.accesos'::regclass and attname = 'invitacion_id';
  if v_null then
    raise exception 'Poscondicion fallida: `accesos.invitacion_id` sigue siendo NOT NULL.';
  end if;

  select confdeltype into v_ev
    from pg_constraint c join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
   where n.nspname = 'jardines' and t.relname = 'accesos' and c.conname = 'accesos_evento_id_fkey';
  if v_ev is distinct from 'c' then
    raise exception 'Poscondicion fallida: `accesos.evento_id` no cae en cascada con el evento.';
  end if;

  -- Los dos escritores llenan de verdad los campos nuevos.
  if (select pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname='jardines' and p.proname='registrar_acceso_staff') not like '%invitado_nombre%' then
    raise exception 'Poscondicion fallida: `registrar_acceso_staff` no guarda el nombre del invitado.';
  end if;
  if (select pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname='jardines' and p.proname='registrar_acceso') not like '%invitado_nombre%' then
    raise exception 'Poscondicion fallida: `registrar_acceso` no guarda el nombre del invitado.';
  end if;

  -- Y `anon` NO puede ejecutar la ruta de admin.
  if has_function_privilege('anon', 'jardines.registrar_acceso(text, integer)', 'EXECUTE') then
    raise exception 'Poscondicion fallida: `anon` puede ejecutar `registrar_acceso`.';
  end if;

  raise notice 'sec_29: el libro de entradas sobrevive al borrado de la invitacion.';
end $$;
