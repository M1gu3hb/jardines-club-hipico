-- jardines_sec_23 — Retira las 3 RPC residuales que sec_19 dejó sin uso
--
-- QUÉ SE RETIRA Y POR QUÉ
--   1. jardines.info_mesa_publica(text)
--      sec_06 y sec_17 le revocaron el EXECUTE a PUBLIC/anon/authenticated porque
--      exponía nombre de evento, fecha y salón a cualquiera con un token de mesa.
--      Su cuerpo NO tiene rate limit ni error genérico: si alguien le devolviera
--      el grant a `anon`, reabriría la enumeración que cerró sec_06. La vía viva
--      y protegida es jardines.info_mesa_token(text, text).
--   2. jardines.api_idempotencia(text, text, integer)
--      Idempotencia NO recuperable: consumía la clave antes de saber si la
--      operación había salido bien, así que un fallo transitorio perdía el aviso
--      para siempre. La sustituyó sec_19 con api_idem_iniciar / api_idem_cerrar.
--   3. jardines.canjear_acceso_unico(text)
--      Quemaba el token en un solo paso: si fallaba la generación del OTP, el
--      cliente se quedaba fuera sin poder reintentar. La sustituyó sec_19 con
--      canjear_acceso_iniciar / _confirmar / _liberar.
--
-- VERIFICADO ANTES DE ESCRIBIR ESTA MIGRACIÓN (2026-08-03)
--   · 0 llamadores en src/, api/ y scripts/.
--   · 0 referencias en TODA la base — funciones, vistas, policies, triggers,
--     defaults de columna y constraints — incluido el schema `public`.
--   · EXECUTE actual de las tres: exactamente `postgres, service_role`,
--     que es lo que documenta docs/DATABASE.md §D.bis.
--
-- CANDADO DE VERO: no toca absolutamente nada de `public`. Las tres funciones
-- viven en `jardines` y ninguna aplicación de Vero las referencia (comprobado).
--
-- Sin `cascade`: si algo dependiera de ellas, preferimos que falle.
do $$
declare
  v_faltan text;
  v_sobran text;
  v_dependencias text;
  v_grants text;
begin
  -- ── PRECONDICIÓN 1: las tres existen, con la firma exacta ──────────────────
  select string_agg(f, ', ') into v_faltan
  from (values
    ('jardines.info_mesa_publica(text)'),
    ('jardines.api_idempotencia(text, text, integer)'),
    ('jardines.canjear_acceso_unico(text)')
  ) as t(f)
  where to_regprocedure(f) is null;

  if v_faltan is not null then
    raise exception
      'Precondicion 1 fallida: no existen con esa firma: %. Nada modificado.', v_faltan;
  end if;

  -- ── PRECONDICIÓN 2: nadie las referencia en NINGÚN schema ──────────────────
  -- Cubre `public` a propósito: si Vero las usara, no se tocan y se reporta.
  select string_agg(distinct d, ', ') into v_dependencias
  from (
    select n.nspname || '.' || p.proname as d
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    cross join (values ('info_mesa_publica'), ('api_idempotencia'), ('canjear_acceso_unico')) as o(nombre)
    where p.prosrc ilike '%' || o.nombre || '%'
      and p.proname <> o.nombre
      and n.nspname not in ('pg_catalog', 'information_schema')
    union all
    select v.schemaname || '.' || v.viewname
    from pg_views v
    cross join (values ('info_mesa_publica'), ('api_idempotencia'), ('canjear_acceso_unico')) as o(nombre)
    where v.definition ilike '%' || o.nombre || '%'
    union all
    select pp.schemaname || '.' || pp.tablename || ' :: ' || pp.policyname
    from pg_policies pp
    cross join (values ('info_mesa_publica'), ('api_idempotencia'), ('canjear_acceso_unico')) as o(nombre)
    where coalesce(pp.qual, '') || coalesce(pp.with_check, '') ilike '%' || o.nombre || '%'
    union all
    select c.table_schema || '.' || c.table_name || '.' || c.column_name
    from information_schema.columns c
    cross join (values ('info_mesa_publica'), ('api_idempotencia'), ('canjear_acceso_unico')) as o(nombre)
    where c.column_default ilike '%' || o.nombre || '%'
    union all
    select t.tgrelid::regclass::text || ' :: ' || t.tgname
    from pg_trigger t
    cross join (values ('info_mesa_publica'), ('api_idempotencia'), ('canjear_acceso_unico')) as o(nombre)
    where pg_get_triggerdef(t.oid) ilike '%' || o.nombre || '%'
  ) as dep(d);

  if v_dependencias is not null then
    raise exception
      'Precondicion 2 fallida: algo las referencia (%). Nada modificado.', v_dependencias;
  end if;

  -- ── PRECONDICIÓN 3: nadie más que postgres/service_role puede ejecutarlas ──
  -- Un grant no documentado significa que alguien las volvió a poner en uso.
  select string_agg(distinct p.proname || ' → ' ||
           case a.grantee when 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end, ', ')
    into v_grants
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'jardines'
  join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
       on a.privilege_type = 'EXECUTE'
  where p.proname in ('info_mesa_publica', 'api_idempotencia', 'canjear_acceso_unico')
    and (a.grantee = 0 or pg_get_userbyid(a.grantee) not in ('postgres', 'service_role'));

  if v_grants is not null then
    raise exception
      'Precondicion 3 fallida: grants no documentados (%). Nada modificado.', v_grants;
  end if;

  -- ── RETIRO ────────────────────────────────────────────────────────────────
  drop function if exists jardines.info_mesa_publica(text);
  drop function if exists jardines.api_idempotencia(text, text, integer);
  drop function if exists jardines.canjear_acceso_unico(text);

  -- ── COMPROBACIÓN POSTERIOR ────────────────────────────────────────────────
  select string_agg(f, ', ') into v_sobran
  from (values
    ('jardines.info_mesa_publica(text)'),
    ('jardines.api_idempotencia(text, text, integer)'),
    ('jardines.canjear_acceso_unico(text)')
  ) as t(f)
  where to_regprocedure(f) is not null;

  if v_sobran is not null then
    raise exception 'Siguen existiendo: %. Se revierte.', v_sobran;
  end if;

  -- Las vigentes tienen que seguir en pie: si el DROP se hubiera llevado algo
  -- por delante, aquí se revierte todo.
  if to_regprocedure('jardines.info_mesa_token(text, text)') is null
     or to_regprocedure('jardines.api_idem_iniciar(text, text, integer, integer)') is null
     or to_regprocedure('jardines.api_idem_cerrar(text, text, boolean)') is null
     or to_regprocedure('jardines.canjear_acceso_iniciar(text)') is null
     or to_regprocedure('jardines.canjear_acceso_confirmar(text)') is null
     or to_regprocedure('jardines.canjear_acceso_liberar(text)') is null then
    raise exception 'Falta alguna de las funciones VIGENTES. Se revierte.';
  end if;

  perform jardines_private.auditar(
    'rpcs_residuales_retiradas', 'ok', 'pg_proc', null, null, null,
    jsonb_build_object(
      'funciones', jsonb_build_array(
        'jardines.info_mesa_publica(text)',
        'jardines.api_idempotencia(text, text, integer)',
        'jardines.canjear_acceso_unico(text)'),
      'motivo', 'superadas por sec_19 (idempotencia recuperable y canje en dos fases) y por sec_06/sec_17 (info_mesa_publica); sin llamadores ni dependencias',
      'migracion', 'jardines_sec_23'));
end $$;
