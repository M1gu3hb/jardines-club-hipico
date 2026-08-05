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
--   - **Genera el token ella misma**, con `jardines_private.token_seguro()` (el mismo de
--     `sec_04`). No lo recibe de fuera: así el cliente no puede elegir un token sin entropía y
--     no hace falta validar una forma que ya se demostró que se puede escribir mal (T.1).
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

  -- ── FOTO DE ANTES, para que las poscondiciones puedan comprobar de verdad que no se
  --    tocó nada. Va en una tabla temporal porque los bloques `do $$` no comparten variables:
  --    sin esto, la poscondición sobre policies no tendría con qué comparar y acabaría siendo
  --    la promesa vacía que era.
  create temp table if not exists _sec26_antes (clave text primary key, valor text);
  delete from _sec26_antes;
  insert into _sec26_antes values
    ('policies_eventos', (select string_agg(policyname, ',' order by policyname) from pg_policies
                          where schemaname = 'jardines' and tablename = 'eventos')),
    ('policies_vero',    (select count(*)::text from pg_policies where schemaname = 'public')),
    ('funciones_vero',   (select count(*)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                          where n.nspname = 'public'));

  raise notice 'sec_26: precondiciones OK, foto de antes tomada.';
end $$;

-- `search_path = ''` y nombres completamente calificados: regla del proyecto para toda función
-- `security definer`. Sin esto, un `search_path` hostil en la sesión del llamador puede hacer
-- que `eventos` resuelva a otra tabla y la función escriba donde no debe.
-- EL TOKEN LO GENERA EL SERVIDOR (fase B.5). No es un detalle de estilo: resuelve tres cosas
-- de una vez.
--
--   1. **La validación de forma desaparece**, y con ella la clase de bug de T.1: una regex que
--      no casaba con el generador y habría rechazado el 100 % de los tokens. Si nadie de fuera
--      aporta el token, no hay nada que validar.
--   2. **Deja de elegirlo el cliente.** `^[A-Za-z0-9_-]{43,128}$` aceptaba `AAAA…A`: 43 letras
--      A pasan la forma y no tienen entropía ninguna. Era autolesión —el token es la credencial
--      de SU invitación— pero un guardarraíl que depende de que la víctima se porte bien no es
--      un guardarraíl.
--   3. **Hace posible la rotación**, que el `coalesce` de T.2 había dejado sin salida: si a un
--      cliente se le filtra el enlace, hoy no hay forma de cambiarlo. Desactivar bloquea, pero
--      reactivar revive el mismo enlace. Con el token del lado del servidor, rotar es un
--      parámetro, no una operación nueva que haya que inventar.
--
-- La base ya tiene el generador —`jardines_private.token_seguro()`, el mismo que usa
-- `rotar_staff_token` desde `sec_04`—, así que esto no añade criptografía: la reutiliza. Y el
-- staff token ya tenía rotación y revocación; la invitación no. Esa asimetría no tenía motivo.
create or replace function jardines.invitacion_guardar(
  p_evento_id   uuid,
  p_activa      boolean,
  p_mensaje     text default null,
  p_dress_code  text default null,
  p_rotar       boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_filas integer;
  v_actual text;
  v_token  text;
begin
  -- 1) ¿Es SU evento? Fail-closed: `is_my_event` es la misma comprobación que gobierna todo el
  --    resto del portal.
  --
  --    OJO, Y ESTO IMPORTA PARA LA OPCIÓN B: `is_my_event` es **exactamente**
  --      `select exists (select 1 from jardines.eventos e where e.id = evt
  --                     and e.auth_user_id = auth.uid())`
  --    — comprobado leyendo la definición en la base, no supuesto. **No tiene rama
  --    `is_admin()`.** Así que un admin que no sea el `auth_user_id` de ese evento —que es el
  --    caso normal: ese uuid es el del cliente— recibe `no_disponible` por esta función.
  --
  --    Consecuencia: si la decisión del dueño fuera «la invitación la activa el dueño desde el
  --    panel», esta función **no sirve tal cual**. El panel seguiría por `eventos_upd`, que ya
  --    permite `is_admin()`, y entonces esta migración sobra entera. No se puede usar como
  --    respaldo de las dos opciones a la vez.
  if p_evento_id is null or not jardines.is_my_event(p_evento_id) then
    -- Respuesta genérica: no se distingue "no existe" de "no es tuyo". Mismo criterio que las
    -- rutas por token (sec_04/sec_20) — decir cuál de las dos es filtra qué eventos existen.
    return jsonb_build_object('ok', false, 'motivo', 'no_disponible');
  end if;

  -- 2) EL TOKEN. Se lee el que ya hubiera y se decide con una sola regla:
  --      · `p_rotar` -> uno nuevo, aunque ya hubiera (es la salida para un enlace filtrado);
  --      · si no hay ninguno y se está activando -> uno nuevo;
  --      · en cualquier otro caso -> el que ya estaba.
  --    Nunca se borra: desactivar conserva el enlace para poder reactivarlo tal cual.
  select e.invitacion_token into v_actual from jardines.eventos e where e.id = p_evento_id;
  v_token := case
               when p_rotar then jardines_private.token_seguro()
               when v_actual is not null then v_actual
               -- `and v_actual is null` es redundante por el orden del `case` — y va escrito a
               -- propósito. Que una rama sea segura solo porque otra la precede es una propiedad
               -- que no se ve leyendo la rama, y que se pierde el día que alguien reordene el
               -- `case`. Lo cazó el contrato de T.2, que exige que cada generación esté
               -- condicionada localmente.
               when p_activa and v_actual is null then jardines_private.token_seguro()
               else null
             end;

  -- 3) LONGITUDES. Este texto lo escribe el cliente y acaba en una página pública. Se acota por
  --    el mismo motivo que `solicitudes_longitudes` acota el formulario público.
  if length(coalesce(p_mensaje, '')) > 2000 or length(coalesce(p_dress_code, '')) > 200 then
    return jsonb_build_object('ok', false, 'motivo', 'demasiado_largo');
  end if;

  -- 4) La escritura, EXACTAMENTE cuatro columnas. Ninguna otra puede tocarse desde aquí, y esa
  --    es la razón de que esto sea una función y no una policy.
  update jardines.eventos
     -- El token sale de `v_token`, calculado arriba. La primera versión era
     --   `case when p_activa then p_token else invitacion_token end`
     -- que al ACTIVAR sobrescribía siempre — lo contrario de lo que el portal promete. Con dos
     -- pestañas bastaba: la A activa y reparte el enlace; la B, que sigue con el token en null
     -- porque su formulario solo se inicializa al montar, guarda un cambio de mensaje y genera
     -- otro. Los enlaces repartidos quedaban muertos, sin aviso.
     --
     -- Ahora el token se emite una vez y **solo cambia si se pide expresamente** (`p_rotar`).
     set invitacion_token      = v_token,
         invitacion_activa     = p_activa,
         invitacion_mensaje    = p_mensaje,
         invitacion_dress_code = p_dress_code
   where id = p_evento_id;

  get diagnostics v_filas = row_count;
  -- ¿ES ALCANZABLE ESTA RAMA? Casi nunca, y conviene dejar escrito el "casi". `is_my_event` ya
  -- probó que la fila existe; esta función es `security definer` y su dueño es `postgres`, que
  -- tiene `rolbypassrls`; y `relforcerowsecurity` es **false** en `jardines.eventos`
  -- (comprobado en producción). Así que RLS no filtra nada aquí dentro y el UPDATE toca una
  -- fila. **Salvo una carrera**: que el evento se borre entre la comprobación y el UPDATE.
  --
  -- Se queda, y no como decoración. Es el único camino por el que esta función podría
  -- responder "guardado" sin haber guardado, y cuesta dos líneas. Quitarlo porque "hoy no
  -- puede dispararse" es exactamente el razonamiento que dejó vivo el P0 del bloque 8: un
  -- guardarraíl que se da por innecesario hasta que un cambio de al lado lo hace necesario —y
  -- esta función es `create or replace`, así que ese cambio es una edición de distancia.
  if v_filas = 0 then
    return jsonb_build_object('ok', false, 'motivo', 'sin_efecto');
  end if;

  return jsonb_build_object('ok', true, 'token', (select invitacion_token from jardines.eventos where id = p_evento_id));
end $$;

-- EXECUTE mínimo: `authenticated` y nadie más. Nunca `PUBLIC` — `anon` no tiene nada que hacer
-- aquí, y `revoke from public` es explícito porque `create function` lo concede por defecto.
revoke all on function jardines.invitacion_guardar(uuid, boolean, text, text, boolean) from public;
grant execute on function jardines.invitacion_guardar(uuid, boolean, text, text, boolean) to authenticated;

-- ── POSCONDICIONES ──────────────────────────────────────────────────────────
do $$
declare
  v_def boolean;
  v_path text[];
  v_publico integer;
  v_rls boolean;
  v_policies_eventos text;
  v_policies_vero text;
  v_funciones_vero text;
begin
  select valor into v_policies_eventos from _sec26_antes where clave = 'policies_eventos';
  select valor into v_policies_vero    from _sec26_antes where clave = 'policies_vero';
  select valor into v_funciones_vero   from _sec26_antes where clave = 'funciones_vero';
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

  -- Y que nada de esto haya tocado RLS **ni las policies** de `eventos`.
  --
  -- La primera versión decía "ni las policies" y solo miraba `relrowsecurity`: un
  -- `drop policy eventos_upd` la habría superado sin despeinarse. Una poscondición que promete
  -- más de lo que comprueba es la misma clase de mentira que este bloque persigue, y en una
  -- migración es peor, porque es lo único que separa "no toqué nada" de "creo que no toqué
  -- nada". Ahora se comprueban las policies **por nombre**, no por cuántas hay: quitar una y
  -- añadir otra deja el recuento igual.
  select relrowsecurity into v_rls from pg_class where oid = 'jardines.eventos'::regclass;
  if not coalesce(v_rls, false) then
    raise exception 'Poscondicion fallida: RLS quedo desactivado en jardines.eventos.';
  end if;

  if (select string_agg(policyname, ',' order by policyname) from pg_policies
      where schemaname = 'jardines' and tablename = 'eventos')
     is distinct from v_policies_eventos then
    raise exception
      'Poscondicion fallida: cambiaron las policies de jardines.eventos. Antes: [%]. Ahora: [%].',
      v_policies_eventos,
      (select string_agg(policyname, ',' order by policyname) from pg_policies
        where schemaname = 'jardines' and tablename = 'eventos');
  end if;

  -- Candado de Vero: esto no debería poder tocar `public` ni de rebote, pero afirmarlo es
  -- barato y la base es compartida.
  if (select count(*)::text from pg_policies where schemaname = 'public') is distinct from v_policies_vero then
    raise exception 'Poscondicion fallida: cambiaron las policies del schema public (Vero).';
  end if;
  if (select count(*)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public') is distinct from v_funciones_vero then
    raise exception 'Poscondicion fallida: cambiaron las funciones del schema public (Vero).';
  end if;

  drop table if exists _sec26_antes;

  raise notice 'sec_26: invitacion_guardar creada (security definer, search_path fijo, execute solo authenticated).';
end $$;
