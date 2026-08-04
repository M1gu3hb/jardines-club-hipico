# FILE_MAP.md — Mapa de archivos importantes

> Reescrito el **2026-08-03**. La versión anterior describía la etapa estática (FASE-01) y ya no
> correspondía a la realidad. Formato: archivo · qué hace · de qué depende · riesgo si se toca.

## Raíz

| Archivo | Qué hace | Riesgo |
|---|---|---|
| `CLAUDE.md` | Instrucciones permanentes para IA. Incluye el candado de Vero. | **Alto** — es la regla, no la sugerencia |
| `PROJECT_CONTEXT.md` | Transferencia principal del proyecto. | Alto — si queda obsoleto, la siguiente sesión rompe cosas |
| `vercel.json` | Rewrites SPA, **cabeceras HTTP** (CSP, HSTS…), cron. | **Alto** — un origen no declarado en la CSP se bloquea en producción, no en local |
| `eslint.config.js` | Flat config con `no-undef` **activo**. | Alto — declarar `rules` sobreescribe `recommended`; ese error dejó pasar un símbolo borrado |
| `index.html` | HTML base, meta/OG, JSON-LD (WebSite + EventVenue). | Medio |
| `vite.config.js` | Plugin react + alias `@` → `src`. | Bajo |
| `package.json` | Deps y scripts (`lint`, `build`, `typecheck`, `test:contratos`). | Medio |
| `jsconfig.json` | Config de `tsc` para el typecheck. | Bajo |
| `tailwind.config.js`, `postcss.config.js`, `components.json` | Estilos y shadcn/ui. | Bajo |

## `api/` — funciones serverless (Vercel, Node)

| Archivo | Qué hace | Riesgo |
|---|---|---|
| `_lib/guard.js` | **Módulo central de seguridad:** `clienteAdmin`, `autorizarJardines`, `leerBody`, `rateLimit`, `idemIniciar`/`idemCerrar`, `escHtml`, `rpcSeguro`, `escrituraOk`, `compensarAlta`, `auditar`, `ipCliente`, `generico`, `igualSeguro`. **Es el ÚNICO sitio del proyecto que puede llamar a `deleteUser`**, y su `borrarUsuario(admin, userId, permiso)` exige un `permiso` sin valor por defecto: olvidarlo niega el borrado. `auth.users` es la tabla compartida con Vero. Ver `docs/SEGURIDAD.md` §2. | **Muy alto** — todas las rutas dependen de él |
| `_lib/correo.js` | `plantillaOro`, `enviarCorreo`, `SITIO_URL`. | Medio |
| `_lib/reglas-credenciales.js` | **Las reglas de usuario y contraseña, en UN solo sitio**, importadas por la ruta Y por el panel. Solo constantes y funciones puras —sin `process.env` ni imports de Node— para que el navegador las pueda incluir. Duplicarlas es lo que hizo que divergieran (cliente ≥6, servidor ≥8). | Alto |
| `solicitud.js` | Avisa al dueño de un lead. Relee la fila con `service_role`; el body solo trae `solicitudId`. | Alto |
| `notificar.js` | Notifica al admin. Lista **cerrada** de acciones; `accionOcurrio()` verifica en la base que la acción pasó de verdad. | Alto |
| `correo-cliente.js` | Avisa al cliente de su cotización. Comprueba que el documento sea de ese evento. | Alto |
| `crear-admin.js` | Alta de administrador. Enlace de un solo uso, sin contraseña en el correo. | **Muy alto** |
| `crear-usuario-evento.js` | Alta de cliente + enlace de primer acceso + compensación si algo falla. | **Muy alto** |
| `canjear-acceso.js` | Canje en dos fases; el **servidor** decide el destino según el rol. | **Muy alto** |
| `eliminar-evento.js` | **Lo único irreversible del panel.** Borra archivos → huérfanas → fila → usuario de Auth, EN ESE ORDEN (los paths viven en `documentos`, que cae por CASCADE). Confirma cada eslabón antes de pasar al siguiente; las huérfanas se confirman releyendo que **no queda ninguna**, no comparando con el inventario (carrera con el cron). La reseña **no** se borra. Rechaza borrar un evento **sin nombre**: la confirmación por nombre exacto se cumpliría sola. Las rutas del bucket salen del listado **y** de `documentos.archivo_url`, acotadas a `<eventoId>/` — esa columna la escribe el navegador. Devuelve `homonimos`/`creadoEl` para distinguir eventos con el mismo nombre. | **Muy alto** |
| `cron-recordatorios.js` | Digest diario + recordatorio de reseña. **Fail-closed** sin `CRON_SECRET`. Semántica at-least-once. | Alto |

## `src/api/` — capa de datos

| Archivo | Qué hace | Riesgo |
|---|---|---|
| `base44Client.js` | **SHIM.** Única puerta a la base. Mapa `TABLES`, camelCase↔snake_case, `create()` de solicitudes vía RPC, `update()` con `.select().maybeSingle()`. **`filterEstricto`/`listEstricto` lanzan** en vez de devolver `[]`: `list`/`filter` no distinguen "no hay filas" de "la lectura falló" (J-02), y esa ambigüedad es la que hace que una pantalla afirme que algo no existe cuando lo que pasó es que no pudo mirarlo. | **Muy alto** — todos los componentes usan `base44.entities.*` |
| `supabaseClient.js` | Cliente Supabase con `db.schema = "jardines"`. | **Muy alto** — apuntar a `public` toca otra aplicación |
| `authContext.jsx` | Sesión + rol leído de `jardines.perfiles`. | Alto |

## `src/` — núcleo

| Archivo | Qué hace | Riesgo |
|---|---|---|
| `App.jsx` | Router. Filtra `Admin` de las páginas públicas: **`/Admin` es 404**; el panel vive en `/${ADMIN_SLUG}` tras `RequireAdmin`. | **Alto** |
| `styles/theme.css` | **Los estilos globales reales**: fuente Inter, tokens `.skeu-*`, scrollbar dorada, dorado `#C9A84C`. Importado en `main.jsx`, así que aplica **también** al portal, al admin y a `/acceso`, que no pasan por `Layout`. | **Alto** — tocar aquí cambia el aspecto de todo el producto |
| `Layout.jsx` | **Solo 10 líneas:** contenedor de las páginas públicas con el fondo `#0a0a0a`. No contiene estilos globales. | Bajo |
| `main.jsx` | Monta `<App/>` e **importa `@/styles/theme.css`**. | Medio |
| `pages.config.js` | Registro de páginas (auto-generado). | Bajo |
| `config/portal.js` | `ADMIN_SLUG`, `CLIENTE_EMAIL_DOMINIO`, `usuarioAEmail()`, link de reseña. | Alto |
| `components/auth/RequireAdmin.jsx` | Guard del panel. | **Alto** |
| `pages/Home.jsx` | Orquesta las secciones públicas, modales y scroll-spy. | Alto |
| `pages/Admin.jsx` | Panel de administración. | Alto |

## `src/components/` — sitio público

`HeroSection` (videos de fondo, ya comprimidos), `Confianza`, `SalonesSection` +
`SalonOverlay` + `SalonGallery`, `ScrollAnimationSection` (241 frames en `/media/frames/`) +
`ScrollAnimationCaptions` + `ScrollHint`, `ServiciosAmenidades` + `ServiceAmenityCard` +
`BarraDulces`, `ComoFunciona`, `CtaCotizacion`, `GaleriaSection` + `MediaViewer` (exporta
`isVideo`), `FaqSection`, `ContactoSection`, `NoIncluyeSection`, `ProximamenteModal` /
`ProximamenteCartel`, `SplashScreen`, `StaggeredMenu` (+ `StaggeredMenu.css` — **el menú real**;
sus items vienen de `MENU_ITEMS` en `Home.jsx`), `SoundToggle`, `soundSystem`, `AnimatedItem`,
`MediaCarrusel`.

- **`FormularioModal.jsx`** — riesgo **alto**: es el flujo de conversión. Tiene
  `ERRORES_VALIDACION` + `mensajeDeError()`, y **nunca muestra éxito sin folio del servidor**.
- **Los 4 huérfanos se borraron** el 2026-08-03 (`Sidebar.jsx`, `HeroTrustBar.jsx`,
  `FormularioSection.jsx`, `ItemImageOverlay.jsx`): 0 imports, y `Sidebar` inducía a error porque
  parecía el menú. Están en el historial de git. El menú real es `StaggeredMenu`.
- `components/ui/*` — primitivas shadcn/ui. No tocar salvo rediseño. **Excepción propia:**
  **`ui/Estado.jsx`** — los tres estados de una lectura (esqueleto / vacío / falló) y los
  esqueletos que tienen la forma del contenido. **El orden dentro de `<Estado>` es la
  propiedad, no el estilo:** quien llama calcula `vacio` desde `datos || []`, así que cuando
  la lectura falla `vacio` también es cierto. Mirar vacío antes que error devuelve el bug.

## `src/components/admin/` — panel

CMS: `AdminConfig`, `AdminSalones`, `AdminGaleria`, `AdminServicioItems`,
`AdminAmenidadItems`, `AdminServicios`, `AdminAlimentos`, `AdminResenas`.
Operación: `AdminInicio`, `AdminDashboard`, `AdminLogin`, `AdminSolicitudes`,
`AdminAdministradores`, y **`AdminOperativo.jsx`** — riesgo alto: asigna personal a eventos y
**bloquea** apagar `acceso_global` a quien tenga 0 asignaciones, porque `operativo_eventos_permitidos`
resuelve con un OR y dejarlo sin ninguna de las dos vías lo deja en 0 eventos.
`SalonPlanoUpload.jsx` — sube el plano del salón al bucket `planos`; confirma cada escritura
releyendo y borra el objeto anterior al reemplazar.

`admin/eventos/`: `AdminEventos`, `EventoDatos`, `EventoFicha`, `EventoItems`, `EventoRsvps`,
`_ui.jsx` (primitivas compartidas del módulo de eventos),
**`EventoEliminar.jsx`** — riesgo **muy alto**: la pantalla del borrado. Pide el inventario al
servidor antes de enseñar nada, confirma escribiendo el nombre exacto (que el servidor vuelve a
comparar contra la fila) y, si hay **homónimos**, dice CUÁL se está borrando: hora de alta y si
tiene cuenta de portal. Escribir el nombre no distingue entre eventos que se llaman igual, y
en producción hay cuatro «Boda ortega». Y
**`EventoDocumentos.jsx`** — riesgo alto: la carpeta de Storage debe ser **`<eventoId>/`** sin
prefijo `evento-`, y manda `documentoId` (no el nombre del documento) a `/api/correo-cliente`.

## `src/components/portal/` — portal del cliente

`PortalPage`, `PortalShell`, `Dock`, `PortalInicio`, `PortalArmalo`, `PortalContratado`,
`PortalDocumentos`, `PortalInvitacion`, `PortalSugerencias`, `PortalResena`, `PortalInactivo`,
`PortalInstall`, `Celebracion`.

- **`PortalLogin.jsx`** — riesgo alto: lee `#entrar=<token>`, lo manda a
  `/api/canjear-acceso`, hace `verifyOtp` y **respeta el `destino` que decide el servidor**.
  Ya no decodifica credenciales en base64.

## Otros módulos

- `src/components/mesas/` — `EventoMesasAdmin`, `MesaEditor`, `MesaReglas`.
- `src/components/evento/` — `EventoCronograma`, `EventoMusica`, `SelectorHora`.
- `src/components/invitacion/InvitacionPublica.jsx` — invitación pública con RSVP.
- `src/components/meseros/` — `AccesoPage`, `StaffPage`, `QrImg` y **`EventoMeseros.jsx`**
  (riesgo alto): genera tokens con `crypto.getRandomValues` (256 bits), **no** lee ningún
  `staffToken` de la fila (la columna ya no existe) y ofrece "Generar nuevo enlace".

## `src/lib/` y `src/hooks/`

`lib/notificar.js` (**mapa `ACCIONES_CORREO`; el contrato con `/api/notificar` lo vigila
`test-contratos-api.mjs`**), `lib/catalogo.js`, `lib/sugerencias.js`,
`lib/cronogramaSugerencias.js`, `lib/fechas.js`, `lib/media.js`, `lib/utils.js` (`cn`),
`lib/query-client.js`, `lib/PageNotFound.jsx`.

- **`lib/catalogos.js`** — el **único** sitio donde vive una lista cerrada que espeja una
  restricción de la base (`DOCUMENTO_TIPOS`, `EVENTO_ESTATUS`, `SOLICITUD_ESTATUS`,
  `MESA_FORMAS`, `MUSICA_TIPOS`, `BUCKET_MIME`, `BUCKET_MAX_BYTES`). Cada una declara su
  `RESTRICCION:` en el comentario y un contrato cruza las dos. Un componente que declare la
  suya rompe la suite: es la familia de bugs que ya mordió dos veces (estatus de solicitud,
  tipo de documento).
- **`lib/solicitudAEvento.js`** — traduce una solicitud del formulario público a los campos
  del alta de evento. **Función pura.** Es donde se decide qué se copia de un dato que
  escribió un desconocido: el salón se resuelve por nombre **exacto** contra los salones
  reales o se deja vacío, la fecha solo si es una fecha, el correo solo si tiene forma de
  correo, y **usuario y contraseña salen vacíos siempre**.
- **`lib/useCarga.js`** — una lectura con sus tres estados: cargando, listo y falló. Lleva un
  turno por ejecución para que una respuesta vieja no pise a una nueva, y `recargar()` no borra
  lo último bueno.

`hooks/useLockBodyScroll.js` — con `overflow:hidden`, **no** `position:fixed` (causaba salto de
scroll, D8). `hooks/useBackButtonClose.js`, `hooks/use-mobile.jsx`.

## `supabase/`

- `migrations/*.sql` — 23 migraciones forward-only `jardines_sec_01..24`. **No reescribir las
  aplicadas.**
- `tests/seguridad.sql` — suite en `BEGIN/ROLLBACK`, datos sintéticos con prefijo `sint-`.
  Desde `sec_23` prueba las RPC **vigentes** (`api_idem_*`, `canjear_acceso_*`), no las retiradas.

## `scripts/`

| Archivo | Qué hace |
|---|---|
| `test-contratos-api.mjs` | **127 contratos estáticos** frontend ↔ `api/`. Sin red ni credenciales, así que **podría** correr en CI — pero no hay `.github/`: hoy se ejecuta a mano |
| `build-media.mjs` | **Descarga ~570 MB de medios por red** (`i.imgur.com`, `media.base44.com`) a `public/media/` y genera `src/data/site-data.json`. Idempotente, pero **no offline**: depende de un CDN de Base44 que puede desaparecer |
| `seed-supabase.mjs` | **No toca la base.** Sin `supabase-js`, sin env, sin red: solo genera `scripts/seed/*.sql` (uno por tabla), que se aplican aparte. Histórico |
| `raw/*.json` | Fuente de `site-data.json`. **Ya no es la fuente de verdad del sitio** |
| `seed/` | Datos del seed |
| `reorder-galeria.mjs`, `gen-images.mjs`, `montage.mjs` | Utilitarios históricos |

## `src/data/`

| Archivo | Qué hace | Riesgo |
|---|---|---|
| `resenas.json` | **El único JSON vivo:** lo importa `src/components/Confianza.jsx`. | Bajo |
| `site-data.json` | **No lo importa nadie** en `src/` ni en `api/`. Solo es entrada de `scripts/seed-supabase.mjs` y `scripts/montage.mjs`. | Bajo — pero **no es un fallback**: si Supabase cae, el sitio se renderiza vacío |

Para cambiar contenido se usa el panel admin, no estos archivos.

## `public/media/`

`img/` (**230** imágenes y videos, incluidas las 5 generadas con Nano Banana y `dulce-corazon.png`),
`frames/` (241 frames de la animación), `b44/`. Rutas siempre `/media/...`.

## `docs/`


**`ESTADO.md`** — el estado revisable de un vistazo, sin optimismo: qué está en producción
(commit y deployment), qué NO se ha hecho, lo que nunca se ha ejercitado de verdad, y la deuda
viva en una tabla. **Si contradice a otro documento, gana ESTADO.md.**
`SEGURIDAD.md` (modelo de seguridad — **lectura obligatoria antes de tocar SQL o `api/`**),
`ARCHITECTURE.md`, `DATABASE.md`, `FILE_MAP.md`, `DECISIONS.md`, `BUGS_PENDING.md`,
`NEXT_STEPS.md`, `CHANGELOG.md`, `PROMPTS.md`, y los mapas de UI `MAPA.md`, `COMPONENTES.md`,
`DATOS.md`, `DEPLOY.md`, `PLAN-EJECUCION.md`.

## `nano-banana/`

Prompts + imágenes de referencia para generar imágenes en el estilo del lugar.
