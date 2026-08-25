# DATABASE.md — Modelo de datos

> Estado real a **2026-08-03**. Verificado contra el proyecto en producción.

## Resumen

**Hay base de datos en vivo.** PostgreSQL 17 en Supabase, proyecto `vuzyhbiwnnngeohysxcw`
(`us-east-1`), **compartido con otra aplicación distinta (Vero Seguros)** que vive en el schema
`public`. Ver el candado en `CLAUDE.md` y `docs/SEGURIDAD.md` §1.

| Schema | Qué contiene | Expuesto en la Data API |
|---|---|---|
| `jardines` | 32 tablas: contenido del sitio + operación de eventos | Sí |
| `jardines_private` | 6 tablas internas: secretos, auditoría, rate limit, idempotencia, aprovisionamiento, accesos de un solo uso | **No** (`anon`/`authenticated` sin `USAGE`) |
| `public` | **Vero Seguros. No tocar.** | Sí (de ellos) |

**RLS activo en todas las tablas de `jardines`.** `anon` solo tiene `SELECT` sobre el contenido
público del sitio; **no** tiene INSERT/UPDATE/DELETE en ninguna tabla. La escritura pública
ocurre exclusivamente por RPC (`solicitud_crear`, `rsvp_crear`).

Los componentes no nombran tablas: usan el mapa `TABLES` de `src/api/base44Client.js`, que
traduce nombre de entidad → tabla y camelCase ↔ snake_case.

`src/data/site-data.json` **ya no es la fuente de verdad y tampoco es un fallback**: ningún
archivo de `src/` ni de `api/` lo importa. Es la entrada de `scripts/seed-supabase.mjs`, con el
que se hizo el seed inicial (histórico). **Si Supabase no responde, el sitio se renderiza vacío.**
`src/data/resenas.json` sí se importa en runtime, desde `src/components/Confianza.jsx`.

---

## A. Contenido del sitio (público, lectura para `anon`)

### ConfigSitio → `config_sitio` (1 fila)
- **Propósito:** configuración global del sitio público.
- **Campos:** `logo_url`, `telefono_contacto`, `whatsapp_numero`, `correo_admin`,
  `ubicacion_texto`, `ubicacion_link_mapa`, `informacion_servicios`, `texto_no_incluye`,
  `proximamente_activo`, `proximamente_imagen_url`, `proximamente_titulo`,
  `proximamente_descripcion`, `proximamente_texto_boton`,
  `proximamente_fecha` (**columna huérfana**: nada la lee ni la escribe — ni el seed, ni
  `AdminConfig`, ni ninguna migración; en producción está a `NULL`),
  `color_primario`, `color_secundario`.
- **Se usa en:** `Home.jsx` (props a Hero, Contacto, NoIncluye, WhatsApp), `AdminConfig`.
- **Reglas:** `whatsapp_numero` solo dígitos, sin `+` ni espacios (ej. `525548663656`).
  Si `proximamente_activo = false`, el cartel del hero no se muestra.

### Salon → `salones` (8 filas)
- **Propósito:** los espacios que se rentan.
- **Campos:** `nombre`, `descripcion`, `descripcion_larga`, `capacidad` (texto),
  `capacidad_min`, `capacidad_max`, `imagen_principal`, `imagenes[]`, `caracteristicas[]`,
  `activo`, `orden`.
- **Relaciones:** ← `eventos.salon_id`, ← `salon_planos.salon_id`.
- **Reglas:** `orden` controla la aparición; `activo = false` lo oculta del sitio.

### Galeria → `galeria` (69 filas)
- **Campos:** `imagen_url` (imagen o video), `titulo`, `orden`.
- **Reglas:** el orden mostrado es el de `orden`; los videos se detectan por extensión.

### ServicioItem → `servicios` · AmenidadItem → `amenidades`
- **Campos:** `titulo`, `descripcion`, `imagen_url`, `imagenes_url[]`, `activo`, `orden`,
  `portal_sugerible`.
- **Reglas:** `descripcion` se muestra al **expandir** la tarjeta, no en la miniatura (D9).
  `portal_sugerible = true` lo ofrece el portal del cliente en "ármalo".

### ServicioExtra → `servicios_extra` · AlimentoMenu → `alimentos`
- `servicios_extra`: `nombre`, `categoria`, `descripcion`, `aplica_a`, `activo`, `orden`.
- `alimentos`: `nombre`, `descripcion`, `pdf_url` (Google Drive), `activo`, `orden`.

### Resena → `resenas` · ResenasConfig → `resenas_config`
- `resenas`: `autor`, `texto`, `estrellas`, `evento`, `aprobada`, `orden`, `evento_id`,
  `enviada_google`.
- `resenas_config`: `rating`, `google_url`, `stats` (jsonb).
- **Reglas:** el carrusel de Confianza solo muestra reseñas con `aprobada = true`. El trigger
  `resena_moderacion` impide que un cliente se auto-apruebe.

---

## A.bis Lo que añadió el rediseño (2026-08-24)

### `jardines.tipos_evento` — nueva (`sec_31`)

Una fila por tipo de evento. Alimenta `/eventos` y `/eventos/{slug}`.

`activo` es la pieza clave: **una fila apagada no se enlaza ni entra en el sitemap**. Se
enciende cuando tiene contenido propio real. Hoy hay 5 encendidas (bodas, xv-anos, infantiles,
corporativos, nocturnos) y `cumpleanos` apagada, porque no se escribió su contenido.

### `jardines.anuncios` — nueva (`sec_33`, corregida por `sec_34`)

Avisos con vigencia (`desde`/`hasta`), imagen, enlace y `destacado`. **Nace vacía.**

> ⚠️ **Su política de lectura es distinta al resto y a propósito.** En las demás tablas de
> contenido la política es `using (true)` y el filtro por `activo` lo pone el frontend. Aquí
> **el filtro vive en la política**: un borrador no es legible por `anon` ni consultando la
> tabla a mano.
>
> Y hay dos políticas de lectura, no una: la de `anon` **no llama a ninguna función**. La
> primera versión llamaba a `jardines.is_admin()` para que el panel viera los borradores, pero
> `anon` **no tiene EXECUTE** sobre esa función y Postgres evalúa la política entera: toda
> lectura pública moría con `permission denied for function is_admin`.

### Columnas nuevas en `jardines.salones` (`sec_30`)

`slug` · `tipo_espacio` · `capacidad_maxima_real` · `capacidad_hospedaje` ·
`eventos_ideales` · `servicios_relacionados` · `preguntas` · `datos_rapidos` ·
`seo_title` · `seo_description` · `og_image`

> **`capacidad_min` y `capacidad_max` significan RECOMENDADO, no límite.** Está escrito en un
> `COMMENT` de las propias columnas. `capacidad_maxima_real` es lo que de verdad cabe: Jardines
> se anuncia como 600 y admite ~1 000.

> **`slug` quedó ANULABLE a propósito.** El panel del CRM inserta salones sin enviarlo; un
> `not null` habría reventado esa inserción. Sin slug, simplemente no hay página pública.

### Columnas nuevas en `jardines.galeria` (`sec_32`)

`alt` · `salon_id` · `tipo_evento_slug` · `destacada`. Las claves foráneas van con
`on delete set null` y no `cascade`: borrar un salón del panel no puede llevarse por delante
sus fotos.

> **Están vacías.** Etiquetar las 69 piezas es trabajo humano y desbloquea a la vez los filtros
> de la galería, las fotos por espacio, las de cada evento y las imágenes de Open Graph.

### El trap de los permisos, que aplica a TODA columna nueva

Desde `sec_27` los permisos de este esquema son **por columna**. Una columna nueva nace **sin
permiso para `anon`**: el sitio la lee como `null` **sin un solo error**. Cada migración lleva
su `GRANT` explícito, y la comprobación se hace **desde el rol `anon`**, no desde el rol que
aplica migraciones.

---
## B. Operación del evento (privado, RLS por dueño)

### Evento → `eventos` (tabla central, 31 columnas)
- **Propósito:** un evento vendido. Todo lo demás cuelga de aquí.
- **Campos de negocio:** `nombre_evento`, `tipo_evento`, `fecha_evento`, `salon_id`, `estatus`,
  `monto_total`, `anticipo_monto`, `anticipo_pagado`, `notas`, `creado_por`.
- **Cliente:** `usuario`, `auth_user_id`, `cliente_nombre`, `cliente_email`,
  `cliente_telefono`, `portal_activo`, `confirmado_cliente`.
- **Invitación:** `invitacion_token`, `invitacion_activa`, `invitacion_mensaje`,
  `invitacion_dress_code`.
- **Operativo / staff:** `operativo_activo`, `operativo_desde`, `staff_token_hash`,
  `staff_token_expira`, `staff_token_revocado_at`, `staff_token_rotado_at`.
- **Otros:** `resena_recordada` (marca del cron), **`solicitud_id`** (`sec_25`): de qué
  solicitud salió este evento. Anulable — los eventos creados a mano no vienen de ninguna.
- **Relaciones:** `salon_id → salones` (SET NULL), `auth_user_id → auth.users` (SET NULL),
  **`solicitud_id → solicitudes` (SET NULL)** — borrar el lead no puede llevarse el contrato.
  Hijos con `ON DELETE CASCADE`: `documentos`, `mesas`, `invitaciones`, `cronograma`, `musica`,
  `items_contratados`, `evento_notas`, `evento_wishlist`, `evento_reglas_mesas`, `rsvps`.
- **Reglas críticas:**
  - **No existe columna `staff_token` en claro** (retirada en `sec_20`). El token solo vive
    como HMAC en `staff_token_hash` y la rotación lo devuelve **una sola vez**.
  - Un cliente solo ve su evento (`is_my_event`); editar depende además de `client_can_edit`.

### Documento → `documentos`
- **Campos:** `evento_id`, `tipo`, `titulo`, `archivo_url`, `subido_por`.
- **Regla crítica:** el archivo va al bucket `clientes` en la carpeta **`<evento_id>/`**, sin
  prefijo `evento-`. La policy de Storage compara `foldername(name)[1]` contra `eventos.id`; con
  otro prefijo el cliente nunca puede abrir su documento.

### ItemContratado → `items_contratados`
- `evento_id`, `descripcion`, `cantidad`, `precio`, `notas`, `orden`.

### Mesa → `mesas` · Invitado → `invitados`
- `mesas`: `evento_id`, `nombre`, `forma`, `pos_x`, `pos_y`, `rotacion`, `capacidad`,
  `ocupadas`, `orden`, `token`.
- `invitados`: `mesa_id`, `nombre`, `notas`.
- **Reglas:** el `token` de mesa es una **credencial portadora** (quien tiene el QR entra).
  Se consulta con `info_mesa_token`, que sí lleva rate limit y error genérico. **No** con
  `info_mesa_publica`: esa quedó sin `EXECUTE` para `anon`/`authenticated` y su cuerpo no
  protege nada (ver §D).

### EventoReglasMesas → `evento_reglas_mesas`
- `evento_id`, `formas_permitidas`, `opciones_personas`, `capacidad_libre`,
  `cliente_puede_editar`. Es lo que consulta `client_can_edit`.

### Invitacion → `invitaciones` · Acceso → `accesos` · Rsvp → `rsvps`
- `invitaciones`: `evento_id`, `mesa_id`, `token`, `nombre_invitado`, `max_personas`,
  `personas_registradas`, `estatus`.
- `accesos`: `invitacion_id`, `mesa_id`, `personas`, `registrado_por`, `registrado_at`.
- `rsvps`: `evento_id`, `nombre`, `personas`, `mensaje`. Se crean con la RPC `rsvp_crear`
  (rate limit por invitación y por IP); `anon` no inserta directo.

### Cronograma → `cronograma` · Musica → `musica`
- `cronograma`: `evento_id`, `hora`, `titulo`, `descripcion`, `orden`.
- `musica`: `evento_id`, `tipo`, `cancion`, `artista`, `enlace`, `notas`.

### EventoWishlist → `evento_wishlist` · EventoNota → `evento_notas` · Notificacion → `notificaciones`
- `evento_wishlist`: `evento_id`, `titulo`, `origen` (sugerencias del portal).
- `evento_notas`: `evento_id`, `texto` (notas internas del admin).
- `notificaciones`: `evento_id`, `tipo`, `titulo`, `detalle`, `leida`.

### Perfil → `perfiles`
- **Campos:** `user_id → auth.users` (CASCADE), `rol` (`cliente` | `operativo` | `admin`),
  `nombre`, `telefono`, `email`, `correo`.
- **Regla crítica:** el rol **nunca** sale de `raw_user_meta_data` (lo escribe el cliente).
  Solo lo concede `asignar_rol` / `aprovisionar_usuario`, con `EXECUTE` únicamente para
  `service_role`. El trigger `handle_new_user` como máximo asigna `cliente`, y solo si hay
  señal server-side de que el usuario es de Jardines (para no crear perfiles a usuarios de Vero).

### SalonPlano → `salon_planos`
- `salon_id` (CASCADE), `imagen_plano_url`, **`imagen_plano_path`**, `ancho`, `alto`, `notas`.
  Lienzo del editor de mesas.
- **Una fila por salón**, garantizado por `salon_planos_salon_id_uniq` (`sec_24`). Antes la regla
  vivía solo en el estado de React, y como el shim devuelve `[]` cuando la lectura falla, un fallo
  transitorio podía crear una segunda fila: con duplicados, `r[0]` es arbitrario y el panel podía
  enseñar un plano mientras `MesaEditor` pintaba otro.
- **`imagen_plano_path`** guarda la ruta del objeto en el bucket. Sin ella no se puede borrar el
  archivo al reemplazar o quitar el plano — y el bucket es público con el listado cerrado, así que
  el huérfano seguía descargable y sin forma de localizarlo.
- `ancho`/`alto` son las medidas **reales** de la imagen: el editor los usa como `aspectRatio` y
  las mesas se posicionan en `%` sobre ese lienzo. No escribir `null` encima de unas válidas.

### SolicitudEvento → `solicitudes`
- **Propósito:** leads del formulario público. **Sí se guardan** (antes solo se mandaban por correo).
- **Campos:** `folio`, `fecha_envio`, `hora_envio`, `nombre_completo`, `telefono`, `email`,
  `salon_seleccionado`, `tipo_evento`, `fecha_tentativa`, `numero_personas`, `comentarios`,
  `acepto_aviso_privacidad`, `estatus` (+ columnas históricas del formulario largo:
  `direccion`, `rfc`, `horario_inicio`, `horario_fin`, `manteleria_preferida`,
  `actividades_extras`).
- **Regla crítica:** se insertan **solo** por la RPC `solicitud_crear`. `anon` y
  `authenticated` no tienen INSERT (`sec_21`). El **folio lo genera el servidor**; el front
  nunca lo inventa ni lo actualiza.

### Módulo operativo → `operativo_*`
- `operativo_personal`: `usuario`, `nombre`, `rol`, `telefono`, `auth_user_id`, `activo`,
  `acceso_global`.
- `operativo_canales`: `nombre`, `color`, `es_general`. **Global, no por evento** (riesgo
  residual documentado).
- `operativo_personal_canal`: `personal_id`, `canal_id`, `puede_hablar`, `puede_escuchar`.
- `operativo_transmisiones`: `canal_id`, `personal_id`, `audio_path`, `duracion_ms`.
- `operativo_ubicaciones`: `personal_id`, `evento_id`, `lat`, `lng`, `precision_m`.
> ⚠️ **El módulo operativo entero no tiene frontend.** No es solo `operativo_asignacion`:
> **ningún componente de `src/` toca ninguna tabla ni RPC `operativo_*`** (la única aparición de
> la palabra en `src/` es un comentario en `EventoMeseros.jsx`). Las tablas, funciones, políticas
> y canales existen y están protegidos, pero hoy se operan solo desde la base. Lo que el panel sí
> tiene es la generación del enlace de meseros, que va por `rotar_staff_token`.

- `operativo_asignacion`: `personal_id`, `evento_id`, `revocada_at`. **Sin UI**; hoy
  (**dato de producción al 2026-08-03, no un invariante**) los 3 operativos existentes tienen
  `acceso_global = true` porque el salón opera un evento a la vez. `sec_18` opera sobre un
  conjunto dinámico: si se dan de alta más operativos, este recuento cambia.
- **Regla:** el evento del operativo **se deriva o se valida**; nunca se confía en el `p_evento`
  que manda el cliente (`operativo_ubicar`). Comportamiento **fail-closed** desde `sec_14`.

---

## C. Schema `jardines_private` (no alcanzable desde el navegador)

| Tabla | Propósito |
|---|---|
| `secretos` | El *pepper* del HMAC. Nunca sale de la base. |
| `auditoria` | Registro de operaciones sensibles. Actores sin sesión se guardan como HMAC irreversible. |
| `rate_limit` | Conteo persistente y atómico por cubo + clave **hasheada**. |
| `idempotencia` | Estados `procesando` / `completado` / `fallido` con lease, para que un fallo se pueda reintentar. |
| `aprovisionamiento` | Invitaciones server-side que autorizan al trigger a crear perfil de Jardines. |
| `acceso_unico` | Enlaces de primer acceso de un solo uso, con canje en dos fases. |

---

## D. Funciones y RPCs

**Agrupadas por el `EXECUTE` real, no por la sensación de acceso.** La pregunta que se hace toda
revisión de seguridad es *"¿qué alcanza alguien sin sesión?"*, y la respuesta es el nivel 1
entero — las 8, no solo las 4 abiertas. Que las otras 4 exijan además un token de staff es una
comprobación **del cuerpo de la función**, no del grant.

Verificado contra `pg_proc`/`aclexplode` en producción (2026-08-03), no solo contra las
migraciones.

### Nivel 1 — `anon` + `authenticated`: alcanzables **sin sesión** (8)

Son todas las que `anon` puede ejecutar. Ninguna función de `jardines` tiene `EXECUTE` para
`PUBLIC` (`sec_11`).

**1a. Abiertas al público (3)** — no piden nada previo; se protegen con rate limit por IP y
error genérico:

| RPC | Para qué |
|---|---|
| `solicitud_crear` | Formulario de cotización (`sec_13` le dio el grant) |
| `rsvp_crear` | RSVP desde la invitación |
| `info_invitacion_publica` | Leer una invitación por su token |

**1b. Exigen además un token de staff válido (5)** — el grant es el mismo (`anon`), porque **el
staff opera sin sesión, con el token en la URL del QR**. Todas resuelven el token por
`jardines_private.evento_por_staff()`, con rate limit y la **misma** respuesta genérica para
inexistente, expirado, revocado o bloqueado:

| RPC | Para qué |
|---|---|
| `info_invitacion_staff` | Ver una invitación desde la vista de meseros |
| `registrar_acceso_staff` | Registrar entrada de invitados |
| `registrar_llegada_mesa` | Marcar la llegada de una mesa |
| `progreso_mesas_staff` | Progreso del evento para el staff |
| `info_mesa_token` | Leer una mesa. Pide token de staff **y** de mesa: su primera instrucción es `evento_por_staff(p_staff)` (`sec_04`) |

> El comportamiento de 1b es correcto: sin token válido no devuelven nada útil. Lo que hay que
> tener presente al auditar es que **el grant no las distingue de 1a**: si `evento_por_staff`
> se relajara, quedarían abiertas a `anon` sin que ningún grant cambiara.

### Nivel 2 — solo `authenticated`: exigen sesión

- **Helpers de RLS** (las policies se evalúan con los privilegios de quien consulta):
  `is_admin`, `es_admin`, `is_my_event`, `client_can_edit`, `mi_personal_id`, `mis_canales`,
  `mis_canales_hablar`, `mis_canales_escuchar`, `eventos_operativos_permitidos`.
- **Cliente / invitación:** `info_invitacion` — **no es pública**, `sec_06` le dio `EXECUTE`
  solo a `authenticated`.
- **Operativo:** `operativo_evento_activo`, `operativo_ubicar`, `registrar_acceso`.
- **Admin** (el grant es `authenticated`; **el rol lo comprueba el cuerpo o RLS**, no el
  `EXECUTE`): `rotar_staff_token`, `revocar_staff_token`, `confirmar_evento`,
  `auditoria_reciente`.

### Nivel 3 — solo `service_role`: nunca desde el navegador

`asignar_rol`, `aprovisionar_usuario`, `revocar_aprovisionamiento`, `crear_acceso_unico`,
**`revocar_acceso_unico`** (`sec_16`: es de `service_role`, **no** de admin — desde el panel no
se puede llamar), `canjear_acceso_iniciar`, `canjear_acceso_confirmar`, `canjear_acceso_liberar`,
`api_rate_limit`, `api_idem_iniciar`, `api_idem_cerrar`, `api_auditar`.

(Las tres residuales que había aquí — `info_mesa_publica`, `api_idempotencia` y
`canjear_acceso_unico` — se **retiraron** en `sec_23`. Ver §D.bis.)

**Funciones de trigger**, también en este nivel pero no invocables desde la Data API porque
`anon` y `authenticated` no tienen su `EXECUTE`: `handle_new_user` (en `auth.users`,
**compartido con Vero**), `solicitud_saneo`, `resena_moderacion`, `auditar_cambio_operativo`.

## D.bis Retiro de las 3 RPC residuales (`sec_23`, 2026-08-03)

Tres funciones seguían en la base con `EXECUTE` para `service_role` y **cero llamadores**.
No eran alcanzables desde el navegador, así que no eran un agujero — el riesgo era que alguien
las reactivara o las tomara por vigentes. **Ya no existen.**

| Retirada | La sustituyó | Por qué importaba |
|---|---|---|
| `info_mesa_publica(text)` | `info_mesa_token(text, text)` | Su cuerpo **no** tenía rate limit ni error genérico: devolvía mesa, evento, fecha, salón y tipo con solo presentar el token. Devolverle el `EXECUTE` a `anon` habría reabierto la enumeración que cerró `sec_06` |
| `api_idempotencia(text, text, integer)` | `api_idem_iniciar` / `api_idem_cerrar` (`sec_19`) | Idempotencia **no recuperable**: consumía la clave antes de saber si la operación había salido bien, así que un fallo transitorio perdía el aviso para siempre |
| `canjear_acceso_unico(text)` | `canjear_acceso_iniciar` / `_confirmar` / `_liberar` (`sec_19`) | Quemaba el token en un solo paso: si fallaba el OTP, el cliente se quedaba fuera sin poder reintentar |

**Verificado antes de aplicar:** 0 llamadores en `src/`, `api/` y `scripts/`; 0 referencias en
toda la base (funciones, vistas, policies, triggers, defaults y constraints), **incluido el
schema `public` de Vero**; y `EXECUTE` exactamente `postgres, service_role`. La migración lleva
esas tres precondiciones dentro y **falla sin tocar nada** si alguna no se cumple. Se ensayó en
`BEGIN/ROLLBACK` antes de aplicarla de verdad. Sin `cascade`.

**Y `supabase/tests/seguridad.sql` ya prueba las vigentes**, no las retiradas: hasta `sec_23`
comprobaba `api_idempotencia` y `canjear_acceso_unico`, así que la idempotencia recuperable y el
canje en dos fases —lo más delicado de `sec_19`— solo estaban cubiertos por comprobaciones
textuales. Ese hueco quedó cerrado (ver `docs/CHANGELOG.md`, bloque 3).

## E. Storage

| Bucket | Público | Límite | MIME | Reglas |
|---|---|---|---|---|
| `clientes` | no | 20 MB | PDF + imágenes | Admin escribe; el cliente solo lee `<evento_id>/…` |
| `operativo` | no | 5 MB | audio | Escritura solo en `tx/<canal_id>/…` y solo donde puede hablar |
| `planos` | sí | 10 MB | imágenes (sin SVG) | Sin listado |
| `sitio` | sí | 50 MB | imágenes + video | Sin listado |
| `site-media` | — | — | — | **De Vero. No tocar.** |

---

## F. Migraciones

Forward-only, en `supabase/migrations/`, nombradas
`<timestamp>_jardines_sec_NN_<tema>.sql`. **24 aplicadas en producción** (`sec_01`…`sec_25`;
no existe `sec_10`: se planeó como archivo `.noapply` y su contenido acabó en `sec_20`).

| # | Tema |
|---|---|
| 01 | Schema privado, pepper, auditoría, rate limit |
| 02 | `handle_new_user` sin escalamiento + aprovisionamiento |
| 03 | Operativo aislado por evento |
| 04 | Tokens de staff: hash, expiración, rotación, revocación |
| 05 | RPC `solicitud_crear` + rate limits públicos |
| 06 | Matriz RLS y grants |
| 07 | 12 índices de FK, límites de Storage, constraints |
| 08 | Auditoría de operaciones sensibles |
| 09 | Consolidación de policies permisivas |
| 11 | Revoca `EXECUTE` residual a `PUBLIC` |
| 12 | Corrige el trigger de auditoría del operativo |
| 13 | Restablece (saneado) el INSERT público de solicitudes |
| 14 | Operativo fail-closed + `acceso_global` |
| 15 | Rate limit e idempotencia para las rutas `api/` |
| 16 | `acceso_unico` (enlace de primer acceso) |
| 17 | `search_path = ''` y grants privados |
| 18 | `acceso_global` a los operativos existentes; fuera la confianza por dominio |
| 19 | Idempotencia recuperable + canje en dos fases |
| 20 | **Retiro de `eventos.staff_token` en claro** |
| 21 | Retiro del INSERT público de compatibilidad |
| 22 | Limpieza del único perfil cruzado con Vero |
| 23 | **Retiro de las 3 RPC residuales** superadas por `sec_19` y `sec_06`/`sec_17` |
| 24 | `salon_planos`: índice único por salón + `imagen_plano_path` |
| 25 | `eventos.solicitud_id` + índice parcial: de qué solicitud salió cada evento |

**Regla de despliegue:** la base es producción compartida. Primero lo **aditivo**, luego se
despliega el frontend, y **solo entonces** se retira lo viejo. Ver `docs/SEGURIDAD.md` §8.bis.

**Al crear una tabla nueva** hay que activar RLS a mano (`public.rls_auto_enable` es de Vero y
solo cubre `public`):

```sql
alter table jardines.nueva enable row level security;
revoke insert, update, delete on jardines.nueva from anon;
-- + una policy por comando, con rol explícito (nunca PUBLIC)
```

---

## G. Reglas de negocio de datos

- El contenido del sitio se edita **desde el panel admin** (persiste en Supabase), no tocando JSON.
- Toda URL de medio propio apunta a `/media/...` (local) o a un bucket de Storage.
- El folio de una solicitud lo asigna el servidor dentro de `solicitud_crear`.
- La validación del formulario está en el servidor (formato y longitudes); el front valida
  además para dar buenos mensajes, pero no es la autoridad.
- Ninguna escritura pública ocurre por `INSERT` directo: siempre por RPC.
- La auditoría nunca guarda tokens completos, PIN, contraseñas ni `service_role`.

## H. Pruebas

`supabase/tests/seguridad.sql` — suite dentro de `BEGIN/ROLLBACK` (no deja rastro). Desde
`sec_23` prueba las RPC **vigentes**, no las retiradas.
Los datos sintéticos van con prefijo `sint-`.
