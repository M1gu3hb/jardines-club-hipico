-- jardines_sec_27 — Los privilegios por defecto de `jardines`
--
-- ✅ APLICADA el 2026-08-05 (version 20260805043150), con el visto bueno del dueño.
--
-- QUÉ TRAE, EXACTAMENTE:
--   1. El DEFAULT ACL de `jardines` (P0 1.3).
--   2. La FUENTE ÚNICA del avance de mesas (B.1): `progreso_mesas_staff` deja de leer la columna
--      que nadie llena y suma de donde se escribe de verdad.
--   3. La comprobación de AFORO al registrar (B.2): `registrar_acceso_staff` deja de mirar solo
--      el cupo de la invitación y cruza contra la capacidad de la mesa.
--
-- LO QUE **NO** TRAE, y por qué: `accesos` en CASCADE, las tres policies que conceden la fila
-- entera (`mesas`, `notificaciones`, `invitados`), la retirada del grant a `anon` de las
-- huérfanas y el índice único de `solicitud_id` (J-13). Son cambios de permisos y de integridad
-- referencial que merecen su propia migración y su propio ensayo; meterlos aquí haría que un
-- fallo en cualquiera de ellos revirtiera también lo que sí está probado. Van en `sec_28`,
-- escrita y **sin aplicar**.
--
-- ── EL PROBLEMA (P0 1.3) ────────────────────────────────────────────────────
-- Los DEFAULT ACL del schema `jardines`, consultados en producción:
--
--     r (tablas)     {anon=arwd/postgres, authenticated=arwd/postgres, service_role=arwd/postgres}
--     f (funciones)  {anon=X/postgres,    authenticated=X/postgres,    service_role=X/postgres}
--     S (secuencias) {anon=rU/postgres,   authenticated=rU/postgres,   service_role=rU/postgres}
--
-- Es decir: **toda tabla nueva de `jardines` nace con SELECT/INSERT/UPDATE/DELETE para
-- anónimos, y toda función nueva nace ejecutable por anónimos.** `sec_06` barrió los grants una
-- vez, tabla por tabla, pero un barrido no cambia lo que nace después. `sec_17` sí fijó los
-- defaults de `jardines_private`; de `jardines` solo revocó a `public`, que es un rol distinto.
--
-- Consecuencias que ya se pueden ver, no hipótesis:
--   · `sec_26` nacería ejecutable por `anon` el día que se apruebe — su `revoke … from public`
--     no toca un grant hecho a `anon` directamente. (Corregido además en el propio `sec_26`:
--     una migración no debe depender de que otra se haya aplicado para no abrir un agujero.)
--   · La primera tabla que cree cualquier migración futura nacerá con CRUD para anónimos, y
--     RLS no la protege hasta que alguien se acuerde de activarla a mano — que es justamente
--     lo que `CLAUDE.md` avisa que hay que hacer en `jardines`.
--
-- ── POR QUÉ NO SE TOCA `public` ─────────────────────────────────────────────
-- El schema `public` tiene el mismo defecto (`anon=arwdDxtm`), y **es de Vero Seguros**. No se
-- toca: es su superficie, su decisión y su riesgo. Queda anotado para que ellos lo valoren.
--
-- ── QUÉ HACE ESTA PARTE ─────────────────────────────────────────────────────
-- Altera los privilegios POR DEFECTO de `jardines` para `anon` y `authenticated`. NO revoca
-- nada de lo ya concedido: lo existente lo gobierna `sec_06`, y tocarlo aquí rompería las ocho
-- RPC públicas que `anon` sí debe poder ejecutar. Esto solo cambia con qué nacen las cosas
-- nuevas.
--
-- El `for role postgres` no es decorativo: un DEFAULT ACL pertenece al rol que crea el objeto.
-- Los de arriba dicen `/postgres`, así que hay que dirigirlo a ese rol o no se altera nada — y
-- la migración parecería haber funcionado.
do $$
declare
  v_r text;
  v_f text;
begin
  select defaclacl::text into v_r from pg_default_acl d join pg_namespace n on n.oid = d.defaclnamespace
   where n.nspname = 'jardines' and d.defaclobjtype = 'r';
  select defaclacl::text into v_f from pg_default_acl d join pg_namespace n on n.oid = d.defaclnamespace
   where n.nspname = 'jardines' and d.defaclobjtype = 'f';

  -- PRECONDICIÓN: que el defecto sea el que este archivo dice arreglar. Si ya estuviera
  -- cerrado, o fuera otro, hay que mirarlo a mano antes de tocar nada.
  if v_r is null or v_r not like '%anon=arwd%' then
    raise notice 'sec_27: el default ACL de tablas ya no concede arwd a anon (es %). Nada que hacer en esa parte.', coalesce(v_r, '(ninguno)');
  end if;

  raise notice 'sec_27: default ACL antes -> tablas=%  funciones=%', coalesce(v_r, '(ninguno)'), coalesce(v_f, '(ninguno)');
end $$;

alter default privileges for role postgres in schema jardines
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema jardines
  revoke all on functions from anon, authenticated;
-- Y de `public`, que NO es lo mismo… aunque aquí no basta. Se deja porque no estorba y porque
-- documenta la intención, pero el límite hay que decirlo:
--
-- ⚠️ ESTO NO CIERRA EL `EXECUTE` DE PUBLIC SOBRE FUNCIONES NUEVAS. Comprobado ensayando contra
--    producción, como `postgres`, en un bloque revertido:
--
--      defaclacl tras el revoke : {service_role=X/postgres}      ← anon fuera, correcto
--      función nueva            : {=X/postgres, postgres=X/postgres, service_role=X/postgres}
--                                  ↑ ese `=X` es PUBLIC, y sigue ahí
--
--    PostgreSQL concede EXECUTE a PUBLIC sobre toda función nueva por defecto del motor, y en
--    esta base ese defecto sobrevive al `ALTER DEFAULT PRIVILEGES`. Como `anon` es miembro de
--    PUBLIC, **una función nueva de `jardines` sigue siendo ejecutable por anónimos aunque esta
--    migración se aplique**.
--
--    LA MITIGACIÓN REAL, por tanto, no es esta línea sino la CONVENCIÓN que `sec_26` ya sigue:
--    toda migración que cree una función en `jardines` tiene que revocarla explícitamente de
--    `public` **y** de `anon`. Y eso sí se puede hacer cumplir: hay un contrato estático que lo
--    comprueba sobre todos los archivos de `supabase/migrations/`.
--
--    Para TABLAS y SECUENCIAS el `ALTER DEFAULT PRIVILEGES` sí funciona — verificado en el mismo
--    ensayo: la tabla nueva nació `{postgres=…, service_role=arwd}`, sin `anon`. Esa mitad es la
--    que aporta este archivo.
alter default privileges for role postgres in schema jardines
  revoke execute on functions from public;
alter default privileges for role postgres in schema jardines
  revoke all on sequences from anon, authenticated;

-- `service_role` se queda: corre del lado del servidor, salta RLS por diseño y es quien ejecuta
-- las rutas de `api/`. Quitárselo rompería el borrado de eventos y el alta de usuarios.

-- ── POSCONDICIONES ──────────────────────────────────────────────────────────
do $$
declare
  v_r text;
  v_f text;
  v_publicas integer;
begin
  select defaclacl::text into v_r from pg_default_acl d join pg_namespace n on n.oid = d.defaclnamespace
   where n.nspname = 'jardines' and d.defaclobjtype = 'r';
  select defaclacl::text into v_f from pg_default_acl d join pg_namespace n on n.oid = d.defaclnamespace
   where n.nspname = 'jardines' and d.defaclobjtype = 'f';

  if coalesce(v_r, '') like '%anon=%' then
    raise exception 'Poscondicion fallida: las tablas nuevas de jardines siguen naciendo con permisos para anon (%).', v_r;
  end if;
  if coalesce(v_f, '') like '%anon=%' then
    raise exception 'Poscondicion fallida: las funciones nuevas de jardines siguen naciendo ejecutables por anon DIRECTAMENTE (%).', v_f;
  end if;

  -- NO se afirma que una función nueva nazca sin PUBLIC: se comprobó ensayando que **no es
  -- así**, y una poscondición que promete lo que no cumple es peor que ninguna. Lo que se hace
  -- es dejar constancia del estado real para quien aplique la migración, y que el contrato
  -- estático se encargue de la convención (cada función revocada a mano).
  create function jardines._sec27_prueba() returns int language sql as 'select 1';
  raise notice 'sec_27: una funcion nueva nace con ACL %  (el `=X` es PUBLIC: el motor lo concede y ALTER DEFAULT PRIVILEGES no lo quita — por eso cada migracion revoca a mano)',
    coalesce((select proacl::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'jardines' and p.proname = '_sec27_prueba'), '(sin acl)');
  drop function jardines._sec27_prueba();

  -- Para TABLAS sí se afirma, porque ahí sí funciona.
  create table jardines._sec27_prueba_t (id int);
  if coalesce((select relacl::text from pg_class where oid = 'jardines._sec27_prueba_t'::regclass), '') like '%anon=%' then
    drop table jardines._sec27_prueba_t;
    raise exception 'Poscondicion fallida: una tabla nueva de jardines sigue naciendo con permisos para anon.';
  end if;
  drop table jardines._sec27_prueba_t;

  -- Y LO QUE NO PUEDE ROMPERSE: las RPC públicas que `anon` sí necesita ejecutar hoy siguen
  -- concedidas. Cambiar un DEFAULT no debería tocarlas —solo gobierna lo que nazca después— y
  -- afirmarlo es barato. Si esto fallara, la puerta del mesero y la invitación pública se
  -- habrían quedado sin permiso y nadie lo notaría hasta la noche del evento.
  select count(*) into v_publicas
  from information_schema.routine_privileges
  where routine_schema = 'jardines' and privilege_type = 'EXECUTE' and grantee = 'anon';
  if v_publicas = 0 then
    raise exception 'Poscondicion fallida: `anon` se quedo sin EXECUTE sobre NINGUNA funcion de jardines.';
  end if;

  raise notice 'sec_27: default ACL despues -> tablas=%  funciones=%  (RPC publicas que anon aun ejecuta: %)',
    coalesce(v_r, '(ninguno)'), coalesce(v_f, '(ninguno)'), v_publicas;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2) LA FUENTE ÚNICA DEL AVANCE DE MESAS (B.1)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- `registrar_acceso_staff` —el ÚNICO camino de registro que existe— escribe
-- `invitaciones.personas_registradas` y una fila en `accesos`. `progreso_mesas_staff` leía
-- `mesas.ocupadas`, que **no escribe nadie**: su único escritor, `registrar_llegada_mesa`, lleva
-- meses sin un solo llamador. Nada reconcilia las dos.
--
-- Resultado en la puerta: Rosa escanea 40 QR y registra 95 personas, cada pantalla le dice
-- «Registradas 8/8 ✓», y el tablero sigue en 0/120 con las 15 mesas en 0/8. Y el admin, en la
-- misma hora, ve el número real porque su pantalla lo suma de la otra tabla.
--
-- LA FUENTE ÚNICA ES `invitaciones.personas_registradas`. Se elige esa y no `mesas.ocupadas`
-- porque es la que el único camino de escritura real llena, porque es la que el panel del dueño
-- ya suma —así las dos pantallas coinciden sin tocar la suya—, y porque `accesos` la respalda
-- con una fila por escaneo, mientras que `ocupadas` es un contador desnormalizado que además el
-- cliente puede escribir desde el navegador.
--
-- Se devuelve `fuente` para que la pantalla sepa de dónde viene el número: el aviso provisional
-- que hoy pinta el tablero cuelga de ese campo y **se apaga solo** cuando esta función está
-- puesta. Sin él habría que acordarse de quitarlo a mano, que es como se quedan los avisos
-- viejos afirmando cosas que ya no pasan.
create or replace function jardines.progreso_mesas_staff(p_staff text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_evento uuid; v_nombre text; res jsonb; treg int := 0; tcap int := 0;
begin
  v_evento := jardines_private.evento_por_staff(p_staff);
  select e.nombre_evento into v_nombre from jardines.eventos e where e.id = v_evento;

  select coalesce(jsonb_agg(x order by x ->> 'nombre'), '[]'::jsonb),
         coalesce(sum((x ->> 'registradas')::int), 0),
         coalesce(sum((x ->> 'capacidad')::int), 0)
    into res, treg, tcap
  from (
    select jsonb_build_object(
      'id', m.id, 'nombre', coalesce(m.nombre, 'Mesa'),
      'capacidad', coalesce(m.capacidad, 0),
      -- De `invitaciones`, que es donde `registrar_acceso_staff` escribe.
      'registradas', coalesce((select sum(i.personas_registradas)
                                 from jardines.invitaciones i
                                where i.mesa_id = m.id), 0),
      -- `ocupadas` se sigue devolviendo por compatibilidad con quien la leyera, pero ya NO es la
      -- que gobierna el avance. Queda a la vista para poder comprobar la divergencia.
      'ocupadas', coalesce(m.ocupadas, 0)) as x
    from jardines.mesas m where m.evento_id = v_evento
  ) t;

  return jsonb_build_object('evento', v_nombre, 'mesas', res,
                            'totalReg', treg, 'totalCap', tcap,
                            'fuente', 'invitaciones');
end $$;

revoke all on function jardines.progreso_mesas_staff(text) from public;
grant execute on function jardines.progreso_mesas_staff(text) to anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3) LA COMPROBACIÓN DE AFORO AL REGISTRAR (B.2)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- No existe ningún constraint que cruce `invitaciones` con `mesas.capacidad`, y esta función
-- solo comparaba contra `inv.max_personas`. Con dos invitaciones para la misma mesa —el caso
-- normal: «una por mesa» y luego un QR aparte para los abuelos— se pueden registrar 20 personas
-- en una mesa de 10, y nada lo impide.
--
-- El front ya ofrece por defecto el cupo LIBRE en vez de la capacidad entera, pero eso es un
-- valor por defecto: se puede escribir a mano, y no cubre las invitaciones ya emitidas. El
-- freno tiene que estar aquí, que es por donde pasa cada escaneo.
--
-- Se cuenta lo ya registrado en TODA la mesa, no solo en esta invitación. Una invitación sin
-- mesa (`mesa_id is null`) no se comprueba: no hay aforo que exceder.
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

  -- EL AFORO DE LA MESA, que antes no se miraba.
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

  insert into jardines.accesos (invitacion_id, mesa_id, personas, registrado_por)
  values (inv.id, inv.mesa_id, p_personas, null);

  select * into m from jardines.mesas mm where mm.id = inv.mesa_id;

  perform jardines_private.auditar('registrar_acceso_staff', 'ok', 'invitaciones', inv.id, v_evento,
    jardines_private.hash_clave(p_staff), jsonb_build_object('personas', p_personas));

  return jsonb_build_object('ok', true, 'mesa', coalesce(m.nombre, 'Sin mesa'),
    'registradas', inv.personas_registradas + p_personas, 'max', inv.max_personas);
end $$;

revoke all on function jardines.registrar_acceso_staff(text, text, integer) from public;
grant execute on function jardines.registrar_acceso_staff(text, text, integer) to anon, authenticated;

-- ── POSCONDICIONES de (2) y (3) ─────────────────────────────────────────────
do $$
begin
  if (select prosrc from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'jardines' and p.proname = 'progreso_mesas_staff') not like '%personas_registradas%' then
    raise exception 'Poscondicion fallida: progreso_mesas_staff sigue sin leer invitaciones.personas_registradas.';
  end if;
  if (select prosrc from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'jardines' and p.proname = 'progreso_mesas_staff') not like '%fuente%' then
    raise exception 'Poscondicion fallida: progreso_mesas_staff no devuelve `fuente` — el aviso del tablero no se apagaria solo.';
  end if;
  if (select prosrc from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'jardines' and p.proname = 'registrar_acceso_staff') not like '%aforo de la mesa%' then
    raise exception 'Poscondicion fallida: registrar_acceso_staff sigue sin comprobar el aforo de la mesa.';
  end if;
  -- Las dos son rutas por token: `anon` DEBE poder ejecutarlas, o la puerta del evento se queda
  -- sin funcionar. Es la mitad que un `revoke` distraído rompería sin que nadie lo notara hasta
  -- la noche.
  if not has_function_privilege('anon', 'jardines.progreso_mesas_staff(text)', 'EXECUTE')
     or not has_function_privilege('anon', 'jardines.registrar_acceso_staff(text,text,integer)', 'EXECUTE') then
    raise exception 'Poscondicion fallida: anon perdio EXECUTE sobre las rutas por token del mesero.';
  end if;
  raise notice 'sec_27: fuente unica del aforo y comprobacion de capacidad, verificadas.';
end $$;
