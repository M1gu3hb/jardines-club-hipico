-- jardines_sec_27 — Los privilegios por defecto de `jardines`
--
-- ⚠️ ESCRITA Y ENSAYADA, **NO APLICADA**.
--
-- ESTE ARCHIVO SE IRÁ AMPLIANDO. La fase 1 del bloque de cierre trae solo el P0 —el default
-- ACL—. Las fases siguientes añaden aquí: `accesos` en CASCADE, las tres policies que conceden
-- la fila entera (`mesas`, `notificaciones`, `invitados`), la retirada del grant a `anon` de las
-- huérfanas, la fuente única del aforo (B.1), la comprobación de cupo al registrar (B.2) y el
-- índice único de `solicitud_id` (J-13). Se aplica una sola vez, cuando esté completa.
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
