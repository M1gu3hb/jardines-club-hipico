-- ════════════════════════════════════════════════════════════════════════════
-- sec_33 · TABLERO DE ANUNCIOS
-- ════════════════════════════════════════════════════════════════════════════
--
-- ESTADO: aplicada. El dueño pidió la pieza expresamente el 2026-08-24:
--         «necesitamos una sección de avisos, de próximamente o cosas así.
--          Una sección de publicidad lista ya, porque a veces hacemos anuncios».
--
-- ── QUÉ RESUELVE ────────────────────────────────────────────────────────────
--
-- Hoy el sitio puede enseñar UN aviso, y a duras penas: `config_sitio` tiene tres columnas
-- sueltas (`proximamente_titulo`, `proximamente_descripcion`, `proximamente_imagen_url`) que
-- alimentan un cartel. Un solo aviso, sin fecha de caducidad, sin enlace y sin orden.
--
-- Lo que hace falta son VARIOS, con imagen y con vigencia. El caso concreto que viene es una
-- academia de clases de baile en el Salón de los Espejos: hay profesores y hay logística, pero
-- todavía no hay horarios ni precios. O sea, exactamente el caso para el que sirve `activo`.
--
-- ── LA VIGENCIA NO ES UN ADORNO ─────────────────────────────────────────────
--
-- Un aviso de un evento que ya pasó, todavía en la portada, hace más daño que no tener avisos:
-- dice que nadie mantiene el sitio. Con `desde` y `hasta`, el aviso se apaga solo el día que le
-- toca, sin que nadie tenga que acordarse.
--
-- ── LA POLÍTICA DE LECTURA FILTRA, Y ESO ES MEJOR QUE FILTRAR EN EL CLIENTE ──
--
-- En el resto de tablas de contenido la política es `using (true)` y el filtro por `activo` lo
-- pone el frontend. Para un catálogo eso da igual. Aquí NO: un borrador de anuncio puede llevar
-- una promoción sin cerrar o una fecha que aún no se anuncia, y con `using (true)` cualquiera
-- podría leerlo consultando la tabla directamente, aunque la web no lo pinte.
--
-- Así que **el filtro vive en la política**: `anon` no puede ver un borrador ni queriendo. El
-- panel sí lo ve, porque `jardines.is_admin()` lo deja pasar.
--
-- ── LO QUE NO HACE ──────────────────────────────────────────────────────────
--
-- No retira las tres columnas `proximamente_*` de `config_sitio`. Primero se despliega lo
-- aditivo, luego el frontend, y solo entonces se retira lo viejo. Revocar antes de desplegar ya
-- rompió el formulario público una vez en este proyecto.

-- ── PRECONDICIONES ──────────────────────────────────────────────────────────
do $$
begin
  if to_regclass('jardines.anuncios') is not null then
    raise exception 'Precondicion fallida: jardines.anuncios ya existe.';
  end if;
  if to_regclass('jardines.config_sitio') is null then
    raise exception 'Precondicion fallida: no se ve jardines.config_sitio, conexion equivocada.';
  end if;
end $$;

-- ── 1. LA TABLA ─────────────────────────────────────────────────────────────
create table jardines.anuncios (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique,
  titulo        text not null,
  resumen       text,
  cuerpo        text,
  imagen_url    text,
  enlace_texto  text,
  enlace_url    text,
  destacado     boolean not null default false,
  activo        boolean not null default false,
  desde         timestamptz,
  hasta         timestamptz,
  orden         integer not null default 0,
  created_at    timestamptz not null default now(),

  constraint anuncios_vigencia_coherente check (desde is null or hasta is null or hasta > desde),
  -- Un enlace a medias es peor que ninguno: un boton sin destino, o un destino sin boton que
  -- lo lleve. O van los dos o no va ninguno.
  constraint anuncios_enlace_completo check (
    (enlace_texto is null and enlace_url is null) or
    (enlace_texto is not null and enlace_url is not null)
  )
);

comment on table jardines.anuncios is
  'Avisos y anuncios del recinto. Alimenta /avisos y el bloque de la portada.';
comment on column jardines.anuncios.activo is
  'false = borrador. NO se publica y ni siquiera es legible por anon: lo impide la politica de lectura, no el frontend.';
comment on column jardines.anuncios.desde is
  'No se publica antes de esta fecha. Null = desde ya.';
comment on column jardines.anuncios.hasta is
  'Se apaga SOLO al llegar esta fecha. Un aviso caducado en la portada dice que nadie mantiene el sitio.';
comment on column jardines.anuncios.destacado is
  'Sale ademas en la portada. Los no destacados solo viven en /avisos.';

-- ── 2. RLS. A mano: este esquema no lo hereda ───────────────────────────────
alter table jardines.anuncios enable row level security;

-- EL FILTRO VIVE AQUI, no en el frontend. Un borrador no es legible por nadie de fuera.
create policy anuncios_lectura on jardines.anuncios
  for select to anon, authenticated
  using (
    (activo
      and (desde is null or desde <= now())
      and (hasta is null or hasta >= now()))
    or jardines.is_admin()
  );

create policy anuncios_admin_ins on jardines.anuncios
  for insert to authenticated with check (jardines.is_admin());

create policy anuncios_admin_upd on jardines.anuncios
  for update to authenticated using (jardines.is_admin()) with check (jardines.is_admin());

create policy anuncios_admin_del on jardines.anuncios
  for delete to authenticated using (jardines.is_admin());

-- ── 3. PERMISOS EXPLÍCITOS (sec_27 retiró los de por defecto) ───────────────
grant select                         on jardines.anuncios to anon;
grant select, insert, update, delete on jardines.anuncios to authenticated;

-- ── 4. ÍNDICE PARA LA CONSULTA QUE DE VERDAD SE HACE ────────────────────────
create index anuncios_publicados on jardines.anuncios (orden, created_at desc)
  where activo;

-- ── 5. NACE VACÍA ───────────────────────────────────────────────────────────
--
-- Ni una fila de ejemplo. Una fila de ejemplo en produccion se olvida encendida, y entonces el
-- sitio anuncia «Titulo de prueba» a quien pasaba por ahi.
--
-- El primer anuncio real sera la academia de baile del Salon de los Espejos, y NO se carga
-- todavia: faltan horarios y precios, y el dueño dijo «cuando te diga lo metes, aun no».

-- ── 6. VERIFICACIÓN ─────────────────────────────────────────────────────────
do $$
declare v_rls boolean; v_pol int; v_filas int;
begin
  select relrowsecurity into v_rls from pg_class where oid = 'jardines.anuncios'::regclass;
  select count(*) into v_pol from pg_policies
   where schemaname = 'jardines' and tablename = 'anuncios';
  select count(*) into v_filas from jardines.anuncios;

  if not v_rls then
    raise exception 'Verificacion fallida: RLS quedo APAGADO en anuncios.';
  end if;
  if v_pol <> 4 then
    raise exception 'Verificacion fallida: se esperaban 4 politicas, hay %.', v_pol;
  end if;
  if v_filas <> 0 then
    raise exception 'Verificacion fallida: la tabla deberia nacer vacia, tiene % filas.', v_filas;
  end if;
end $$;
