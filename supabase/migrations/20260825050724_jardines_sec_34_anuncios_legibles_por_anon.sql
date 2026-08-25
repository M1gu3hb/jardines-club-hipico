-- ════════════════════════════════════════════════════════════════════════════
-- sec_34 · LOS ANUNCIOS TIENEN QUE PODER LEERSE
-- ════════════════════════════════════════════════════════════════════════════
--
-- ESTADO: aplicada. Corrige un fallo introducido por `sec_33` el mismo día.
--
-- ── EL FALLO ────────────────────────────────────────────────────────────────
--
-- `sec_33` creó una sola política de lectura para `anon` **y** `authenticated`:
--
--     using ( (activo and vigente) or jardines.is_admin() )
--
-- La idea era buena —que el filtro de publicación viviera en la política y no en el frontend,
-- para que un borrador no fuera legible ni consultando la tabla a mano— y la mitad de admin
-- estaba pensada para que el panel sí viera los borradores.
--
-- Pero `jardines.is_admin()` **solo la pueden ejecutar `postgres`, `service_role` y
-- `authenticated`**. `anon` no. Y PostgreSQL evalúa la política entera antes de decidir, así
-- que cualquier lectura hecha por `anon` moría con:
--
--     ERROR 42501: permission denied for function is_admin
--
-- O sea: **la tabla de anuncios era ilegible para el sitio público.** No «devolvía vacío»:
-- reventaba la consulta entera.
--
-- ── POR QUÉ NO SE VIO ANTES ─────────────────────────────────────────────────
--
-- Porque el bloque de verificación de `sec_33` corre con el rol que aplica migraciones, que sí
-- puede ejecutar la función. Verificó que había RLS, cuatro políticas y cero filas — todo
-- cierto, y todo irrelevante para el fallo real.
--
-- Salió al probar la política **desde el rol `anon`**, dentro de un bloque que se revierte
-- solo. Es la segunda vez en esta misma sesión que la diferencia entre «lo comprobé» y «lo
-- comprobé COMO EL VISITANTE» encuentra algo. Conviene apuntarlo.
--
-- ── LA CORRECCIÓN ───────────────────────────────────────────────────────────
--
-- Dos políticas en vez de una. `anon` recibe una que **no llama a ninguna función**, así que no
-- necesita permiso sobre nada. `authenticated` conserva la suya con el `or is_admin()`, que es
-- lo que deja al panel ver los borradores.
--
-- La alternativa —dar EXECUTE de `is_admin()` a `anon`— se descarta: `sec_17` cerró los
-- permisos de ejecución a propósito, y abrirlos para arreglar esto sería ampliar la superficie
-- pública para tapar un error de diseño de una política.

-- ── PRECONDICIONES ──────────────────────────────────────────────────────────
do $$
begin
  if to_regclass('jardines.anuncios') is null then
    raise exception 'Precondicion fallida: falta jardines.anuncios, aplicar sec_33 antes.';
  end if;
  if not exists (
    select 1 from pg_policies
     where schemaname = 'jardines' and tablename = 'anuncios' and policyname = 'anuncios_lectura'
  ) then
    raise exception 'Precondicion fallida: no esta la politica que hay que corregir.';
  end if;
end $$;

-- ── LA CORRECCIÓN ───────────────────────────────────────────────────────────
drop policy anuncios_lectura on jardines.anuncios;

-- `anon`: solo lo publicado y vigente. SIN llamar a ninguna funcion, que es el punto entero.
create policy anuncios_lectura_publica on jardines.anuncios
  for select to anon
  using (
    activo
    and (desde is null or desde <= now())
    and (hasta is null or hasta >= now())
  );

-- `authenticated`: lo mismo, y ademas TODO si es admin, para que el panel vea los borradores.
create policy anuncios_lectura_interna on jardines.anuncios
  for select to authenticated
  using (
    (activo
      and (desde is null or desde <= now())
      and (hasta is null or hasta >= now()))
    or jardines.is_admin()
  );

-- ════════════════════════════════════════════════════════════════════════════
-- ENSAYO — NO FORMA PARTE DE LA MIGRACION. Se ejecuta aparte, a mano.
-- ════════════════════════════════════════════════════════════════════════════
--
-- Va comentado porque TERMINA EN `raise exception` a proposito: es lo que garantiza que las
-- cuatro filas de prueba no queden guardadas. Dentro de la migracion, esa misma excepcion
-- revertiria tambien la correccion de las politicas, que es justo lo que se quiere conservar.
--
-- Ejecutado el 2026-08-24 contra produccion. Resultado: anon ve 1 publicado y 0 de los otros
-- tres, y nada quedo guardado.
-- ── VERIFICACIÓN, ESTA VEZ DESDE EL ROL QUE IMPORTA ─────────────────────────
--
-- Se insertan cuatro anuncios de prueba, se leen COMO `anon`, y el `raise exception` del final
-- garantiza que nada de esto se guarde: una excepcion dentro de un bloque DO aborta la
-- transaccion entera. Es la unica forma de probar esto contra produccion sin dejar rastro.
--
-- Resultado esperado: 0 borradores, 0 programados a futuro, 0 caducados, 1 publicado.
-- do $$
-- declare v_borrador int; v_futuro int; v_caducado int; v_vivo int;
-- begin
--   insert into jardines.anuncios (titulo, activo) values ('PRUEBA borrador', false);
--   insert into jardines.anuncios (titulo, activo, desde) values ('PRUEBA futuro', true, now() + interval '10 days');
--   insert into jardines.anuncios (titulo, activo, hasta) values ('PRUEBA caducado', true, now() - interval '1 day');
--   insert into jardines.anuncios (titulo, activo) values ('PRUEBA vivo', true);

--   set local role anon;
--   select count(*) into v_borrador from jardines.anuncios where titulo = 'PRUEBA borrador';
--   select count(*) into v_futuro   from jardines.anuncios where titulo = 'PRUEBA futuro';
--   select count(*) into v_caducado from jardines.anuncios where titulo = 'PRUEBA caducado';
--   select count(*) into v_vivo     from jardines.anuncios where titulo = 'PRUEBA vivo';
--   reset role;

--   if v_borrador <> 0 or v_futuro <> 0 or v_caducado <> 0 then
--     raise exception 'FALLO: anon ve lo que no debe. borrador=% futuro=% caducado=%',
--       v_borrador, v_futuro, v_caducado;
--   end if;
--   if v_vivo <> 1 then
--     raise exception 'FALLO: anon NO ve el anuncio publicado (vio %).', v_vivo;
--   end if;

--   raise exception 'PRUEBA SUPERADA Y REVERTIDA: anon ve 1 publicado y 0 de los otros tres.';
-- end $$;
