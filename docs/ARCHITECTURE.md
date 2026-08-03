# ARCHITECTURE.md

> Estado real a **2026-08-03**. El sitio es **dinámico**: los datos viven en Supabase.

## Vista general

```
Navegador
  └─ SPA React (Vite) ── main.jsx → App.jsx
        AuthProvider + QueryClientProvider + BrowserRouter
        ├─ /                    → Layout → Home.jsx        (sitio público)
        ├─ /<ADMIN_SLUG>        → RequireAdmin → Admin.jsx  (panel)
        ├─ /portal              → PortalPage                (portal del cliente)
        ├─ /acceso/:token       → AccesoPage                (QR de control de acceso)
        ├─ /staff/:token        → StaffPage                 (vista de meseros)
        ├─ /invitacion/:token   → InvitacionPublica         (RSVP)
        └─ *                    → PageNotFound              (incluye /Admin)

Datos   componentes → base44Client.js (SHIM) → supabaseClient.js → PostgREST → schema `jardines`
Correo  componentes → /api/*  (Vercel, service_role) → Nodemailer → Gmail
Medios  estáticos en public/media/**  ·  subidos a Storage (clientes, planos, sitio, operativo)
Cron    Vercel → GET /api/cron-recordatorios (0 15 * * *, con CRON_SECRET)
Deploy  push a main → Vercel build (vite) → producción
```

## Principio de autorización

**La autoridad es la base de datos, no el navegador.** El front usa la `anon key` pública y
todo lo que puede hacer lo decide RLS con la sesión del usuario. Las operaciones que exigen
`service_role` (crear usuarios, asignar roles, mandar correo, canjear accesos) viven
exclusivamente en `api/`, donde la clave nunca llega al cliente.

Corolario: **esconder un botón no es seguridad**. `ADMIN_SLUG` (ruta secreta del panel) es una
capa extra que pidió el dueño; la seguridad real es `RequireAdmin` + RLS.

## Capas

### 1. Presentación (React + Tailwind + Framer Motion)

- `src/main.jsx` monta `<App/>`.
- `src/App.jsx`: `QueryClientProvider` + `AuthProvider` + `BrowserRouter` + `Routes`.
  Las páginas auto-registradas en `src/pages.config.js` se montan salvo `Admin`, que se filtra
  a propósito: `/Admin` es 404 y el panel solo existe en `/${ADMIN_SLUG}` tras `RequireAdmin`.
- `src/styles/theme.css`: **los estilos globales** — fuente Inter, tokens skeuomorphism
  (`.skeu-card`, `.skeu-gold-btn`), scrollbar dorada, dorado `#C9A84C`. Lo importa
  `src/main.jsx`, **no** `Layout.jsx`, precisamente para que apliquen también al portal, al
  admin secreto y a `/acceso`, que no pasan por el Layout.
- `src/Layout.jsx`: 10 líneas. Solo envuelve las páginas públicas en el fondo `#0a0a0a`.
- `src/api/authContext.jsx`: sesión de Supabase + rol leído de `jardines.perfiles`.
- `src/config/portal.js`: `ADMIN_SLUG` (env `VITE_ADMIN_SLUG`), dominio del correo sintético de
  clientes y `usuarioAEmail()`.

### 2. Datos (SHIM sobre Supabase)

`src/api/base44Client.js` conserva la **misma API pública** que tenía el SDK de Base44, pero por
dentro habla con Supabase. Por eso ningún componente cambió al migrar.

- `base44.entities.<Entidad>.list(sort) / filter(query, sort) / get(id) / create(data) / update(id, patch) / delete(id)`
- `base44.functions.invoke(nombre, payload)` — **no es genérico**: solo reconoce
  `"gmailSolicitud"` y `"notificarNuevaSolicitud"`, y ambos van al mismo sitio,
  `POST /api/solicitud`.
- `base44.functions.crearAdmin / crearUsuarioEvento / correoCliente` — **métodos propios**, uno
  por ruta. Las demás funciones serverless se llaman así, no por `invoke`.
- `base44.integrations.Core.UploadFile({file})` → Storage (bucket `sitio`)
- `base44.auth.*`, `base44.storage`, `base44.rpc`

> ⚠️ **`invoke()` falla en silencio.** Con cualquier nombre que no sea uno de esos dos devuelve
> `{}` — sin lanzar, sin avisar, sin log. Un typo en el nombre no da error: da un objeto vacío
> que el llamador interpreta como éxito. Es deuda conocida (`base44Client.js:138-147`). Si
> añades una ruta nueva, dale su propio método como `crearAdmin`, no la cuelgues de `invoke`.

Detalles que importan:

- Mapa `TABLES`: nombre de entidad → tabla de `jardines`. Traducción automática
  camelCase ↔ snake_case en ambos sentidos.
- Orden por defecto: las tablas de `CON_ORDEN` se ordenan por `orden` asc; `-created_date` se
  traduce a `created_at` desc.
- `create()` sobre `solicitudes` **no** hace INSERT: llama a la RPC `solicitud_crear`, que
  valida, aplica rate limit y fija folio/estatus/fechas en el servidor.
- `update()` usa `.select().maybeSingle()`: sin eso, un UPDATE que RLS rechaza devuelve "éxito"
  con cero filas — que fue exactamente el bug del folio que nunca se guardaba.

`src/api/supabaseClient.js` crea el cliente con `db: { schema: "jardines" }`. **Nunca**
`schema: "public"`: ahí vive otra aplicación.

### 3. Serverless (Vercel, `api/`)

Siete rutas Node. Todas pasan por `api/_lib/guard.js`, que centraliza la seguridad:

| Ruta | Qué hace | Quién puede |
|---|---|---|
| `solicitud.js` | Avisa al dueño de un lead nuevo | público, con rate limit por IP |
| `notificar.js` | Notifica al admin una acción del cliente | sesión con perfil de Jardines |
| `correo-cliente.js` | Avisa al cliente que su cotización está lista | admin |
| `crear-admin.js` | Alta de administrador | admin |
| `crear-usuario-evento.js` | Alta de cliente + enlace de primer acceso | admin |
| `canjear-acceso.js` | Canje del enlace de un solo uso (dos fases) | quien tenga el token |
| `cron-recordatorios.js` | Digest diario + recordatorio de reseña | solo el cron (`CRON_SECRET`) |

Lo que aporta `guard.js`:

- `clienteAdmin()` — cliente con `service_role`, solo aquí.
- `autorizarJardines(req, admin, {rol})` — exige una fila en `jardines.perfiles`, así que un
  usuario de Vero con sesión válida recibe 403.
- `leerBody(req, maxBytes)` — límite de tamaño (413) y JSON válido (400).
- `rateLimit(...)` — **fail-closed**: si el contador falla, se deniega.
- `idemIniciar` / `idemCerrar` — idempotencia **recuperable**: `procede` | `duplicado` |
  `en_curso` | `error`, con lease que expira. Un fallo real se puede reintentar; un doble clic no duplica.
- `escHtml` — todo valor interpolado en un correo se escapa. Lo verifica `test-contratos-api.mjs`.
- `rpcSeguro`, `escrituraOk`, `borrarUsuario`, `compensarAlta` — porque **supabase-js resuelve
  con `{ data, error }` en vez de rechazar**: un `.catch()` no atrapa nada y los errores hay que
  comprobarlos a mano.
- `ipCliente(req)` — la IP sale de `x-forwarded-for`, **nunca** del body.
- `generico(res, status)` — respuestas sin detalle, para no ayudar a enumerar.

**Semántica de correo: at-least-once.** Gmail y PostgreSQL no comparten transacción, así que se
prefiere un correo duplicado a un correo perdido. Está documentado en la cabecera de
`cron-recordatorios.js`.

### 4. Cabeceras y red (`vercel.json`)

- `rewrites`: todo salvo `/api/*` va a `/index.html` (fallback SPA).
- `crons`: `/api/cron-recordatorios` diario a las 15:00 UTC.
- Cabeceras globales: **CSP en modo enforcing** (`default-src 'self'`, `frame-src 'none'`,
  `object-src 'none'`, `frame-ancestors 'none'`), HSTS un año, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options: DENY`.
- **Deuda de la CSP, no está tan cerrada como suena:** `script-src` y `style-src` siguen
  admitiendo **`'unsafe-inline'`**, así que la CSP **no** protege contra XSS por inyección de
  scripts o estilos en línea — su valor real hoy es acotar los *orígenes* (`connect-src`,
  `img-src`, `frame-ancestors`), no bloquear inline. Quitarlo exige eliminar los estilos y
  scripts en línea que quedan; no está hecho.
- `img-src` ya **no** autoriza `i.imgur.com`: el JSON-LD apunta a la copia auto-hospedada
  desde el 2026-08-03. El único origen externo que queda es Google Fonts.
- `/api/*`: `Cache-Control: no-store`.

Si agregas un origen externo (fuente, CDN, imagen), **hay que declararlo en la CSP** o el
navegador lo bloqueará en producción sin avisar en local.

### 5. Build y medios

- `scripts/build-media.mjs` hace dos cosas: **descarga por red ~570 MB de medios** a
  `public/media/` (desde `i.imgur.com` y `media.base44.com`) y genera `src/data/site-data.json`
  con las rutas ya reescritas a local. Es idempotente (salta lo ya descargado), pero **no es
  offline**: depende de un CDN de Base44 que puede desaparecer sin aviso — si eso pasa, el
  script deja de poder reconstruir los medios y `public/media/` en git es la única copia.
- `scripts/seed-supabase.mjs` **no toca la base**: no importa `supabase-js`, no lee variables de
  entorno y no hace red. Solo lee los JSON de `src/data/` y **escribe `scripts/seed/*.sql`**, un
  archivo por tabla. Esos `.sql` son el seed real y se aplican aparte.
- `src/data/site-data.json` **no es un fallback de runtime:** no lo importa ningún archivo de
  `src/` ni de `api/`; solo lo leen `seed-supabase.mjs` y `montage.mjs`. **Si Supabase no
  responde, el sitio se renderiza vacío** — no hay red de seguridad. El único JSON que sí se
  importa en runtime es `src/data/resenas.json` (`src/components/Confianza.jsx`).
- `scripts/seed-supabase.mjs` fue el seed inicial de la base (histórico; no re-ejecutar a ciegas).
- Vite copia `public/` a `dist/`. Alias `@` → `src` en `vite.config.js`.

### 6. Calidad

```bash
npm run lint            # eslint flat config, con no-undef ACTIVO
npm run build           # vite build
npm run test:contratos  # 78 contratos estáticos frontend ↔ api/
npm run typecheck       # 59 errores = línea base actual; no debe subir
```

Dos suites existen por fallos reales:

- **`scripts/test-contratos-api.mjs`** — el front mandaba `{titulo, detalle}` y la API esperaba
  `{accion, eventoId, nota}`: compilaba, pasaba el lint y todos los correos morían con un 400 en
  silencio. Ninguna prueba de base de datos podía verlo.
- **`no-undef` en `eslint.config.js`** — al declarar un bloque `rules` se sobreescribía por
  completo `pluginJs.configs.recommended`, así que una función borrada con llamadas vivas pasaba
  el lint. Hoy no.

## Deploy

- Git conectado a Vercel: push a `main` → build automático (`vite build`, output `dist/`).
- Deploy manual: `vercel deploy --prod --scope mh-astral-systems`.
- **Orden con la base:** las migraciones afectan a producción de inmediato. Primero lo aditivo,
  luego el frontend, y al final el retiro de lo viejo (`docs/SEGURIDAD.md` §8.bis).

## Diagrama — formulario de cotización

```
FormularioModal.handleSubmit
  → base44.entities.SolicitudEvento.create(data)
       → RPC jardines.solicitud_crear   (valida, rate limit por IP, folio del servidor)
  → POST /api/solicitud { solicitudId }
       → relee la fila con service_role
       → rate limit + idempotencia
       → nodemailer.sendMail (Gmail) → MAIL_TO
  → pantalla de confirmación con el folio REAL (si no hay folio, no hay éxito)
```

## Diagrama — primer acceso del cliente

```
/portal#entrar=<token>
  → PortalLogin lee el fragmento
  → POST /api/canjear-acceso { token }
       → canjear_acceso_iniciar    (toma un lease; no quema el token todavía)
       → genera el OTP con la Admin API
       → canjear_acceso_confirmar  (ahora sí lo consume)
       → si algo falla en medio: canjear_acceso_liberar
  → supabase.auth.verifyOtp(...)
  → redirección al `destino` que decidió el SERVIDOR según el rol de la base
```
