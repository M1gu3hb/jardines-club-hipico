-- jardines_sec_26 — Que el cliente pueda activar SU invitación digital
--
-- ⚠️ ESCRITA Y ENSAYADA, **NO APLICADA**. Es una decisión de producto que le toca al dueño:
--    ¿la invitación la activa el cliente desde su portal, o el dueño desde el panel? Este
--    archivo implementa la primera opción. Si el dueño elige la segunda, este archivo se borra
--    y la pantalla se mueve al panel — no se aplica "por si acaso".
--
-- OJO CON EL NÚMERO: `sec_26` estaba reservado en `docs/NEXT_STEPS.md` para el índice único
-- sobre `eventos.solicitud_id` (J-13). Ese pasa a ser **`sec_27`**. Se renumera aquí y en la
-- documentación para que no queden dos migraciones distintas con el mismo nombre.
--
-- EL PROBLEMA
--   `PortalInvitacion` es el único escritor de `invitacion_token`, `invitacion_activa`,
--   `invitacion_mensaje` e `invitacion_dress_code` en todo el repo, y solo se monta para el rol
--   `cliente`. Pero `eventos_upd` es `using (jardines.is_admin()) with check
--   (jardines.is_admin())`, así que ese UPDATE nunca ha tocado una fila. Verificado contra
--   producción: `select count(invitacion_token) from jardines.eventos` = **0**. La función
--   lleva muerta desde el día uno y fallaba en silencio porque el shim daba el UPDATE de cero
--   filas por bueno.
--
-- POR QUÉ UNA RPC Y NO UNA POLICY NUEVA
--   Las policies de `jardines` conceden **la fila entera, no columnas** (J-10). Una policy que
--   dejara al cliente escribir su evento le dejaría escribir TAMBIÉN `auth_user_id`, `usuario`,
--   `estatus`, `saldo`, `salon_id` y `solicitud_id` — incluida la columna que fue la entrada
--   del P0 del bloque 8. Sería abrir de par en par exactamente lo que J-10 ya señala como
--   deuda.
--
--   Una función `security definer` acota la superficie a las cuatro columnas y a un evento: es
--   el mismo patrón que ya usa el resto del portal contra `is_my_event`.
--
-- LO QUE **NO** HACE
--   - No toca `eventos_upd` ni ninguna otra policy: no amplía lo que el navegador puede
--     escribir por su cuenta ni un milímetro.
--   - No genera el token: lo recibe. El token es la credencial pública de /invitacion/<token>
--     y lo produce `tokenSeguro()` con WebCrypto en el cliente. Aquí solo se valida su forma.
--     (Si algún día se decide generarlo en el servidor, es un cambio aparte y mayor: cambia
--     quién es la fuente del secreto.)
--   - No toca **absolutamente nada de Vero Seguros**: ni el schema `public`, ni `auth.users`,
--     ni el bucket `site-media`, ni configuración global de Auth.
--
-- ADITIVA: crea una función nueva y le da EXECUTE a `authenticated`. No borra, no reescribe, no
-- cambia policies ni datos.
do $$
declare
  v_rls boolean;
  v_ya integer;
begin
  -- ── PRECONDICIÓN 1: RLS activo en `eventos` ────────────────────────────────
  select relrowsecurity into v_rls from pg_class where oid = 'jardines.eventos'::regclass;
  if not coalesce(v_rls, false) then
    raise exception 'Precondicion fallida: RLS NO esta activo en jardines.eventos. Nada modificado.';
  end if;

  -- ── PRECONDICIÓN 2: existe `is_my_event`, que es de quien cuelga todo ──────
  select count(*) into v_ya from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'jardines' and p.proname = 'is_my_event';
  if v_ya = 0 then
    raise exception 'Precondicion fallida: jardines.is_my_event() no existe. Nada modificado.';
  end if;

  -- ── PRECONDICIÓN 3: las cuatro columnas existen y son las esperadas ────────
  select count(*) into v_ya from information_schema.columns
  where table_schema = 'jardines' and table_name = 'eventos'
    and column_name in ('invitacion_token','invitacion_activa','invitacion_mensaje','invitacion_dress_code');
  if v_ya <> 4 then
    raise exception
      'Precondicion fallida: se esperaban 4 columnas de invitacion en jardines.eventos, hay %. Nada modificado.', v_ya;
  end if;

  raise notice 'sec_26: precondiciones OK.';
end $$;

-- `search_path = ''` y nombres completamente calificados: regla del proyecto para toda función
-- `security definer`. Sin esto, un `search_path` hostil en la sesión del llamador puede hacer
-- que `eventos` resuelva a otra tabla y la función escriba donde no debe.
create or replace function jardines.invitacion_guardar(
  p_evento_id   uuid,
  p_token       text,
  p_activa      boolean,
  p_mensaje     text default null,
  p_dress_code  text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_filas integer;
begin
  -- 1) ¿Es SU evento? Fail-closed: `is_my_event` es la misma comprobación que gobierna todo el
  --    resto del portal. Un admin también pasa por aquí sin problema si alguna vez hiciera
  --    falta, porque `is_my_event` no excluye a nadie que ya tenga acceso a la fila.
  if p_evento_id is null or not jardines.is_my_event(p_evento_id) then
    -- Respuesta genérica: no se distingue "no existe" de "no es tuyo". Mismo criterio que las
    -- rutas por token (sec_04/sec_20) — decir cuál de las dos es filtra qué eventos existen.
    return jsonb_build_object('ok', false, 'motivo', 'no_disponible');
  end if;

  -- 2) FORMA DEL TOKEN. Es una credencial portadora: 32 bytes en hex son 64 caracteres, que es
  --    lo que produce `tokenSeguro()`. Se acota aquí para que la RPC no pueda usarse para meter
  --    en esa columna un token corto y adivinable, ni un texto arbitrario de 10 KB.
  if p_activa and (p_token is null or p_token !~ '^[a-f0-9]{32,128}$') then
    return jsonb_build_object('ok', false, 'motivo', 'token_invalido');
  end if;

  -- 3) LONGITUDES. Este texto lo escribe el cliente y acaba en una página pública. Se acota por
  --    el mismo motivo que `solicitudes_longitudes` acota el formulario público.
  if length(coalesce(p_mensaje, '')) > 2000 or length(coalesce(p_dress_code, '')) > 200 then
    return jsonb_build_object('ok', false, 'motivo', 'demasiado_largo');
  end if;

  -- 4) La escritura, EXACTAMENTE cuatro columnas. Ninguna otra puede tocarse desde aquí, y esa
  --    es la razón de que esto sea una función y no una policy.
  update jardines.eventos
     set invitacion_token      = case when p_activa then p_token else invitacion_token end,
         invitacion_activa     = p_activa,
         invitacion_mensaje    = p_mensaje,
         invitacion_dress_code = p_dress_code
   where id = p_evento_id;

  get diagnostics v_filas = row_count;
  -- Se DEVUELVE cuántas filas se tocaron. Es la misma lección que `updateEstricto` en el shim:
  -- una escritura de cero filas no puede responder lo mismo que una de una.
  if v_filas = 0 then
    return jsonb_build_object('ok', false, 'motivo', 'sin_efecto');
  end if;

  return jsonb_build_object('ok', true, 'token', (select invitacion_token from jardines.eventos where id = p_evento_id));
end $$;

-- EXECUTE mínimo: `authenticated` y nadie más. Nunca `PUBLIC` — `anon` no tiene nada que hacer
-- aquí, y `revoke from public` es explícito porque `create function` lo concede por defecto.
revoke all on function jardines.invitacion_guardar(uuid, text, boolean, text, text) from public;
grant execute on function jardines.invitacion_guardar(uuid, text, boolean, text, text) to authenticated;

-- ── POSCONDICIONES ──────────────────────────────────────────────────────────
do $$
declare
  v_def boolean;
  v_path text[];
  v_publico integer;
  v_rls boolean;
begin
  select p.prosecdef, p.proconfig into v_def, v_path
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'jardines' and p.proname = 'invitacion_guardar';

  if not coalesce(v_def, false) then
    raise exception 'Poscondicion fallida: invitacion_guardar no quedo como SECURITY DEFINER.';
  end if;
  if not (coalesce(array_to_string(v_path, ','), '') like '%search_path=%') then
    raise exception 'Poscondicion fallida: invitacion_guardar no tiene search_path fijado.';
  end if;

  select count(*) into v_publico
  from information_schema.routine_privileges
  where routine_schema = 'jardines' and routine_name = 'invitacion_guardar' and grantee = 'PUBLIC';
  if v_publico > 0 then
    raise exception 'Poscondicion fallida: invitacion_guardar es ejecutable por PUBLIC.';
  end if;

  -- Y que nada de esto haya tocado RLS ni las policies de `eventos`.
  select relrowsecurity into v_rls from pg_class where oid = 'jardines.eventos'::regclass;
  if not coalesce(v_rls, false) then
    raise exception 'Poscondicion fallida: RLS quedo desactivado en jardines.eventos.';
  end if;

  raise notice 'sec_26: invitacion_guardar creada (security definer, search_path fijo, execute solo authenticated).';
end $$;
