# ARCHITECTURE.md — el sitio público

> Alcance: **solo esta aplicación**. El portal del cliente y el CRM tienen su propia arquitectura
> en sus repos. Lo común a los tres —el mismo Supabase, la misma `anon key`, el código compartido
> por copia— está en `docs/ECOSISTEMA.md`.
>
> Todo lo de aquí está comprobado leyendo los archivos de este repo el 2026-08-24, sobre `9d0e053`.

---

## 1. Vista general

```
navegador
   |
   |  GET /            -> Vercel sirve dist/index.html  (rewrite de todo lo que no es /api/)
   |  GET /portal      -> 301 al portal del cliente     (redirect en el borde, no en React)
   |
React (una sola pagina: src/pages/Home.jsx)
   |
   |  lectura de contenido           escritura (una sola)
   v                                        v
src/api/base44Client.js  ------------------ shim, unico acceso a datos
   |                                        |
   v                                        v
supabase-js (anon key)              RPC jardines.solicitud_crear
   |                                        |
   v                                        v
Supabase / PostgreSQL 17, schema `jardines`, con RLS
                                            |
                     el navegador avisa a --> POST /api/solicitud  (Vercel, Node)
                                                     |
                                                     |  service_role, solo en el servidor
                                                     v
                                            relee la fila + Nodemailer -> correo al dueño
```

Dos cosas que conviene tener claras desde el principio:

1. **El navegador nunca compone el correo.** Solo manda el `solicitudId`. El servidor vuelve a
   leer esa fila con `service_role` y arma el aviso con los datos canónicos de la base. Antes no
   era así, y cualquiera podía inundar el buzón del dueño con contenido inventado y fijar el
   `replyTo` a la dirección que quisiera.
2. **El folio lo genera la base**, en el mismo INSERT, dentro del trigger `trg_solicitud_saneo`.
   El front no lo inventa: si la respuesta no trae folio, la pantalla **no** enseña éxito.

---

## 2. Principio de autorización

Este repo **no autentica a nadie**. No hay login, no hay `AuthProvider`, no hay rutas protegidas
— la FASE 1 retiró todo eso. Cada petición sale con la `anon key`, que es pública por diseño y
viaja dentro del bundle.

De ahí se sigue lo único que importa: **lo que este sitio puede hacer contra la base es
exactamente lo que RLS le concede al rol `anon`, ni un permiso más**. Blindar el frontend no
añade nada; la seguridad está en las policies. Ver `docs/app/SEGURIDAD.md` y
`docs/app/DATABASE.md`.

El shim (`base44Client.js`) sí expone `auth.loginEmail`, `auth.perfil` y las 27 entidades, porque
es código común byte a byte con los otros dos repos. Ningún componente de este repo los llama —
comprobado con `grep` sobre `src/` excluyendo `src/api/`: salen **diez** líneas en total — ocho
lecturas, una escritura y el `functions.invoke` del aviso. Están listadas en
`docs/app/DATABASE.md`.

---

## 3. Las capas

### 3.1 Presentación — React 18 + Vite 6 + Tailwind + Framer Motion

`src/main.jsx` monta `App`, importa los dos CSS globales y registra el service worker.
`src/App.jsx` envuelve todo en `ErrorBoundary` → `QueryClientProvider` → `BrowserRouter`, y las
rutas salen de `src/pages.config.js`, que desde la FASE 6 declara **una sola página**: `Home`.
Cualquier otra ruta cae en `src/lib/PageNotFound.jsx`.

`src/pages/Home.jsx` es el orquestador: pide los tres bloques de contenido, gobierna el splash, el
menú, el scroll-spy de secciones y el modal del formulario. Todo lo demás son componentes de
sección en `src/components/` (29 propios) sobre 49 primitivas de shadcn en `src/components/ui/`.

Dos detalles de esta capa que son decisiones, no accidentes:

- **El sitio arranca aunque la base no conteste.** `Home` monta el splash solo cuando llega
  `ConfigSitio`, así que una petición **colgada** —`fetch` no tiene tiempo límite propio— dejaba
  al visitante mirando un rectángulo negro para siempre. Hay un plazo de 2.5 s que sigue adelante
  con lo que haya. El contrato 3.1 lo vigila.
- **`ErrorBoundary` envuelve la aplicación entera.** En React una excepción durante el render
  desmonta el árbol completo; sin boundary, un fallo en una sección deja la página en blanco.
  El contrato 3.2 comprueba que exista **y** que envuelva.

### 3.2 Datos — el shim sobre Supabase

`src/api/supabaseClient.js` crea el cliente con `db: { schema: "jardines" }` y
`auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }`. Si faltan
`VITE_SUPABASE_URL` o `VITE_SUPABASE_ANON_KEY`, **pinta un mensaje en `#root` a mano** —sin React,
que aún no existe— y deja subir el fallo: una variable que falta es un error de despliegue, y
tiene que verse en la página, no solo en una consola que nadie abre. Contrato 3.3.

> **Este archivo NO fija `storageKey`** — comprobado: la palabra no aparece en `src/`. Los otros
> dos repos sí lo hacen. Aquí no hace falta porque este sitio no inicia sesión de nadie, y el
> aislamiento entre aplicaciones lo da el **origen** (dominios distintos ⇒ `localStorage`
> distinto), no el nombre de la clave. Si algún día se añadiera login aquí, habría que ponerlo.

`src/api/base44Client.js` (418 líneas) es el **único** acceso a datos: mapea 27 nombres de entidad
a sus tablas, traduce camelCase↔snake_case en los dos sentidos, ordena por `orden` en las tablas
que lo tienen, y expone `entities`, `functions`, `integrations`, `storage`, `asignaciones`, `auth`
y `rpc`. Es **código común compartido por copia**: `scripts/compartidos.json` guarda su `sha256` y
un contrato lo verifica en cada ejecución.

`src/api/funciones.js` es la pieza que **no** es común: declara `RUTAS = ["/api/solicitud"]`, las
rutas de `api/` que esta aplicación tiene desplegadas. En el monolito este bloque nombraba las
cinco rutas del proyecto entero, y en las otras apps viajaban nombres que allí dan 404. Un nombre
desconocido **lanza**; la versión vieja devolvía `{}` en silencio, que es la peor forma de fallar
porque quien llama cree haber enviado algo. Un contrato comprueba que `RUTAS` coincida con los
archivos reales de `api/`.

### 3.3 Serverless — `api/`, en Vercel

**Una sola función publicada: `api/solicitud.js`.** Los cuatro archivos de `api/_lib/` no se
publican, porque Vercel ignora las carpetas que empiezan por `_`.

`api/solicitud.js` hace, en este orden:

1. Rechaza todo lo que no sea `POST`.
2. Exige `GMAIL_USER`, `GMAIL_APP_PASSWORD` y el cliente de `service_role`; sin eso, 500.
3. Lee el cuerpo con tope de **4 KB** —el tope lo pasa esta ruta, `leerBody(req, 4 * 1024)`; el
   defecto de `leerBody` es **16 KB**— y exige que `solicitudId` tenga forma de UUID.
4. **Rate limit por IP** (10 por hora), persistente en Postgres — aparte del que ya aplica el
   trigger al INSERT. Sin esto se podía llamar aquí directamente para saltarse el control del
   formulario.
5. Relee la fila con `service_role` y exige que **exista** y tenga **menos de 15 minutos**.
6. **Idempotencia** por solicitud: un reintento no manda el correo dos veces, pero un fallo real
   sí se puede reintentar, porque la clave solo se consume cuando el envío sale bien.
7. Compone el correo con la plantilla común y **escapa todo** con `escHtml`: el nombre y los
   comentarios los escribe un desconocido en un formulario público, así que son la entrada menos
   confiable del proyecto. Manda HTML y texto plano.
8. Audita el resultado (`ok`, `denegado`, `error`) en la tabla privada de auditoría.

`api/_lib/`:

| Archivo | Qué es |
|---|---|
| `guard.js` | Lo que toda ruta necesita: `escHtml`, `clienteAdmin()` (service_role), `leerBody`, `rateLimit`, `idemIniciar`/`idemCerrar`, `auditar`, `ipCliente`, `generico`. Respaldado por PostgreSQL, para que no se pueda saltar llamando al endpoint directo |
| `correo.js` | La plantilla dorada (tablas + estilos inline, porque Gmail borra el `<style>` del `<head>`) y el envío por Nodemailer. Importa `escHtml` de `guard.js`: había dos escapadores y el débil era el de la plantilla |
| `urls.js` | Las **tres** URL del ecosistema y `RUTA_PANEL`, cada una desde su variable de entorno. Se separó de `correo.js` para que otras rutas pudieran leer una cadena sin arrastrar nodemailer |
| `telefono.js` | Convierte lo que el cliente escribió en un enlace de WhatsApp. **Ante la duda, `null`** — sin número no se pinta el botón, porque abrir el chat de un desconocido con los datos del evento delante es peor que no tener botón |

### 3.4 Red y cabeceras — `vercel.json`

- **Redirects 301**: `/portal`, `/portal/` y `/invitacion/:token` al portal del cliente. En el
  **borde**, no en React: un salto de cliente no transfiere las señales que Google ya tenía.
- **Rewrite** de todo lo que no empieza por `api/` a `/index.html` (SPA).
- **Cabeceras globales**: `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`,
  `Strict-Transport-Security`, `X-Frame-Options: DENY` y una **CSP** que solo admite `'self'`,
  Google Fonts para tipografías, y el dominio de Supabase para imágenes, media y `connect`.
  `frame-src`, `object-src` y `frame-ancestors` en `none`.
- **`/api/*`** además con `Cache-Control: no-store`.
- **Ya no hay `crons`**: se fueron con las funciones que los servían.

La CSP es la razón de que el proyecto auto-hospede todo: `img-src` no admite terceros, y hay un
contrato (9D) que impide ensancharla en silencio.

### 3.5 Build y medios

Vite 6 con el plugin de React y un solo alias, `@` → `./src`. Sin code-splitting manual: sale un
único chunk de 775 kB.

Los medios **no** se construyen en el despliegue: viven versionados en `public/media/`
(473 archivos, 25 de ellos video). `scripts/build-media.mjs` es la herramienta que los descargó en
su día y que regenera `src/data/site-data.json` — **descarga ~570 MB por red** y no forma parte
del ciclo normal.

PWA mínima: `public/manifest.json` y `public/sw.js`, un service worker que **no cachea nada** y
solo hace passthrough a la red. Existe para habilitar «Instalar app», no para servir offline; el
sitio es dinámico y una caché agresiva enseñaría contenido viejo.

En `public/` hay **dos** manifiestos, no uno: `manifest.json` (`start_url: "/"`) es el de este
sitio y es el que enlaza `index.html`; `manifest.webmanifest` (`start_url: "/portal"`) es el del
portal, sobrevivió a la separación y **nadie lo enlaza aquí**. Está anotado como limpieza en
`docs/app/NEXT_STEPS.md` §2.4 y descrito en `docs/app/FILE_MAP.md`.

### 3.6 Calidad

Cuatro puertas, ninguna con red: `lint`, `build`, `test:contratos` y `typecheck`. La suite de
contratos (`scripts/test-contratos-api.mjs`, 1473 líneas) hace comprobaciones **estáticas** sobre
el código y ejecuta unas pocas funciones puras. Lo que cubre y lo que no está en
`docs/app/CONTRATOS.md`.

---

## 4. Flujo completo — el formulario de cotización

Es el único camino de escritura de esta aplicación, y merece verse entero.

```
1. El visitante abre el modal (src/components/FormularioModal.jsx).
   El desplegable de salones sale de base44.entities.Salon.list("orden"),
   filtrando los inactivos en cliente.

2. Envia. El componente arma el objeto y llama:
       base44.entities.SolicitudEvento.create(datos)

3. El shim NO hace INSERT. Para la tabla `solicitudes` desvia a la RPC:
       supabase.rpc("solicitud_crear", { p_nombre_completo, p_telefono, ... })
   `anon` tiene EXECUTE sobre esa funcion; NO tiene INSERT sobre la tabla
   (se retiro en sec_21).

4. Dentro de Postgres, el trigger BEFORE INSERT `trg_solicitud_saneo`:
      - rate limit: 5/hora por IP (200/hora si no hay IP)
      - recorta y valida nombre, telefono, email, aviso de privacidad,
        numero de personas y fecha tentativa
      - FIJA los campos internos: estatus, folio, fecha_envio, hora_envio
      - anula direccion y rfc
   La RPC devuelve { id, folio } y audita 'solicitud_crear'.

5. De vuelta en el navegador:
       if (!creada?.folio) throw new Error("SIN_CONFIRMACION")
   Sin folio del servidor no hay registro confirmado, y NO se enseña exito.
   El usuario conserva lo que escribio para reintentar.

6. Aviso al dueño, dispara-y-olvida (si falla, la solicitud YA quedo guardada):
       base44.functions.invoke("gmailSolicitud", { solicitudId: creada.id })
         -> POST /api/solicitud  con SOLO el id

7. api/solicitud.js: rate limit por IP -> relee la fila (service_role) ->
   comprueba que existe y tiene < 15 min -> idempotencia -> compone el correo
   escapando todo -> Nodemailer/Gmail -> audita.
   El boton de WhatsApp solo se pinta si `telefono.js` pudo derivar el numero.

8. La pantalla enseña el folio que devolvio la BASE. Nunca uno inventado.
```

Lo que este flujo garantiza y lo que no: garantiza que el registro y el correo digan lo mismo, que
un reintento no duplique el aviso, y que el HTML del correo no pueda inyectarse. **No** garantiza
que hoy funcione de punta a punta — eso exige llenar el formulario a mano y nadie lo ha hecho
desde la FASE 4 (ver `docs/app/NEXT_STEPS.md`).

---

## 5. Flujo secundario — un enlace viejo a `/portal`

```
Enlace enviado hace meses:  https://jardines-club-hipico.vercel.app/portal#entrar=<token>
   |
   v
Vercel, en el borde: 301 -> https://jch-portal-cliente.vercel.app/
   |
   |  el fragmento #entrar=<token> NO viaja al servidor,
   |  asi que el navegador lo conserva y lo re-adjunta al destino
   v
El portal lo lee en su origen y canjea el acceso.
```

Por eso el redirect es 301 y está en `vercel.json`. Un `<Navigate>` de React habría hecho el salto
después de descargar el bundle, sin transferir señales de SEO y con el token ya en manos de un
JavaScript que no le hacía falta. El contrato «web: `/portal` y la invitación redirigen 301 a otra
aplicación» lo vigila.

---

## 6. Despliegue

Vercel, desde `main`. `npm run build` produce `dist/`; las funciones de `api/` se publican solas.
Variables de entorno necesarias (**nombres**, nunca valores):

| Ámbito | Variables |
|---|---|
| Navegador (build) | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_URL_PORTAL` |
| Servidor (`api/`) | `SUPABASE_URL` (o `VITE_SUPABASE_URL`), `SUPABASE_SERVICE_ROLE`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `MAIL_TO`, `URL_WEB`, `URL_PORTAL`, `URL_CRM`, `VITE_ADMIN_SLUG` |

`SUPABASE_SERVICE_ROLE` **solo** existe en el servidor. No lleva prefijo `VITE_` justamente para
que Vite no pueda incluirla en el bundle ni por accidente.

`urls.js` da a las tres URL un valor por defecto —el dominio de la web— para que un enlace roto
lleve a un sitio que existe en vez de a `undefined/...`. Es un paracaídas, no la configuración:
las tres se definen de verdad en cada proyecto de Vercel.
