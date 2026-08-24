# SEGURIDAD.md — el sitio público

> **Lee esto antes de tocar SQL, RLS, `api/`, `vercel.json` o el shim.** No es un resumen del
> modelo de seguridad del proyecto entero (eso está en `docs/SEGURIDAD.md` del juego general):
> es lo que aplica a **esta** aplicación.
>
> Todo lo de aquí sale de leer este repo el **2026-08-24**, sobre `9d0e053`. Donde algo no se
> puede comprobar desde aquí —el estado real de la base, la configuración de Vercel— lo digo.

---

## 1. CANDADO ABSOLUTO — Vero Seguros

El proyecto de Supabase `vuzyhbiwnnngeohysxcw` **está compartido con otra aplicación distinta,
Vero Seguros**. Este bloque es idéntico en los tres repositorios y no se negocia.

| | Jardines Club Hípico | Vero Seguros |
|---|---|---|
| Schema | `jardines` (+ `jardines_private`) | `public` |
| Autorización de admin | `jardines.perfiles.rol = 'admin'` | `public.admin_users` |
| Buckets | `clientes`, `operativo`, `planos`, `sitio` | `site-media` |

**No modificar, ni directa ni indirectamente:**

- Su frontend o su repositorio.
- Tablas, funciones, triggers, policies, índices o datos del schema `public` — incluidos
  `public.admin_users`, `public.insurers`, `public.services`, `public.content_audit`,
  `public.is_admin()` y `public.rls_auto_enable()`.
- El bucket `site-media`.
- Usuarios, sesiones o acceso administrativo de Vero. **Hay un solo administrador de Vero**, y su
  fila vive en `auth.users`, que sí es compartida.
- La configuración **global** de Supabase Auth: política de contraseñas, protección de
  contraseñas filtradas, JWT, SMTP, redirect URLs. Es compartida y puede romperles el login.

Lo único realmente compartido es **`auth.users`** y el trigger **`on_auth_user_created`**. Antes
de tocar cualquier cosa compartida hay que demostrar que Vero no cambia (`docs/SEGURIDAD.md` §2).

**Para el sitio público esto es casi teórico**, y conviene decirlo: esta aplicación no crea
usuarios, no autentica a nadie y no escribe en `auth.users`. La regla está aquí porque cualquier
migración que se escriba **desde este repo** sí puede tocar la base compartida — las 28
migraciones viven en `supabase/migrations/`, y una de ellas (`sec_22`) existió precisamente para
limpiar un perfil cruzado con Vero.

---

## 2. Qué puede hacer este sitio, y con qué rol

Una sola respuesta corta: **todo lo que el navegador hace, lo hace como `anon`.**

Aquí no hay login. La FASE 1 retiró el código de autenticación del sitio público: no hay
`AuthProvider`, ni rutas protegidas, ni pantalla de acceso. El shim expone `auth.loginEmail` y
`auth.perfil` porque es código común con los otros dos repos, pero **ningún componente de este
repo los llama** — comprobado con `grep`.

Los permisos de `anon`, tal y como los fijan las migraciones:

| Puede | No puede |
|---|---|
| **SELECT** sobre nueve tablas de contenido (`contenido_lectura`, `sec_06`) | INSERT / UPDATE / DELETE en **ninguna** tabla del schema (`sec_06` los revoca en bloque) |
| **SELECT** de reseñas **con `aprobada = true`** (`resenas_lectura_anon`) | Leer reseñas sin aprobar |
| **EXECUTE** sobre `jardines.solicitud_crear(...)` | INSERT ni SELECT sobre `jardines.solicitudes` (`sec_21` los revocó) |
| — | Invocar las funciones `api_*` de control: son de `service_role` |
| — | Ver eventos, perfiles, documentos, invitados, mesas ni nada del modelo del evento |

Detalle tabla por tabla en `docs/app/DATABASE.md`.

---

## 3. La `anon key` es pública, y separar los repos no protege datos

Esto hay que tenerlo claro porque es fácil escribir lo contrario sin darse cuenta.

Las tres aplicaciones usan la **misma `anon key`**. Viaja dentro del bundle, cualquiera la ve
abriendo las herramientas de desarrollo. **Está diseñada para eso**: no es un secreto.

Por tanto:

- **La frontera de datos es RLS más el rol dentro del JWT**, no el dominio desde el que se cargó
  el código. Si una policy está mal, tener tres repos no salva nada.
- Lo que la separación **sí** da, y es real: **aislamiento de sesión** (orígenes distintos ⇒
  `localStorage` distinto ⇒ un XSS en la web pública no puede leer la sesión de un admin del CRM)
  y **menos superficie de código** (el bundle pasó de 1073 kB a 775 kB y ya no contiene el slug
  de la ruta del panel ni sus pantallas).

**Nota sobre `storageKey`:** el portal y el CRM fijan una clave propia en su cliente de Supabase.
**Este repo no lo hace** — comprobado: la palabra `storageKey` no aparece en `src/`. No es un
descuido pendiente de arreglar mientras el sitio no autentique a nadie: sin sesión no hay nada que
guardar, y el aislamiento entre orígenes es del navegador, no del nombre de la clave. **Si algún
día se añade login aquí, hay que poner uno.**

---

## 4. El único camino de escritura, y cómo está blindado

El formulario de cotización. Tiene **tres** capas, y ninguna confía en la anterior.

### 4.1 En el navegador — cortesía, no seguridad

`FormularioModal.jsx` valida los campos obligatorios **recortados** (`.trim()`, no `!!`, que dejaba
pasar una cadena de espacios) y no enseña éxito si la respuesta no trae folio. Nada de esto
protege: es lo que hace que el usuario no pierda lo que escribió. Cualquiera puede saltárselo.

### 4.2 En Postgres — el trigger, que es quien manda

`trg_solicitud_saneo` (`sec_13`) es un `BEFORE INSERT` sobre `jardines.solicitudes` y hace, en
este orden: rate limit (5/hora por IP, 200/hora sin IP, con la IP resuelta por
`jardines_private.ip_solicitante()`, **no** por el cliente); recorte y validación de cada campo;
y **fijación de los internos** — `estatus`, `folio`, `fecha_envio`, `hora_envio`, y `direccion` y
`rfc` a `null`. El navegador no puede fijar ninguno de ellos, ni inventarse un folio.

Está en el trigger y no en la RPC a propósito: cuando existían los dos caminos (RPC e INSERT
directo), los dos pasaban por aquí y tenían **exactamente** las mismas garantías. Poner el control
en la función habría dejado el INSERT sin él.

### 4.3 En el servidor — `api/solicitud.js`

**Qué estaba mal antes, porque explica el diseño de ahora:** la ruta aceptaba un cuerpo arbitrario
y mandaba correo con él. Sin sesión, sin rate limit y sin comprobar que la solicitud existiera.
Cualquiera podía inundar el buzón del dueño con contenido inventado, fijar el `replyTo` a la
dirección que quisiera, y saltarse el rate limit del formulario llamando aquí directamente.

Hoy:

| Control | Cómo |
|---|---|
| Método | Solo `POST`; cualquier otro, 405 |
| Tamaño del cuerpo | Tope de **4 KB** en `leerBody` |
| Entrada | **Solo** `solicitudId`, y tiene que tener forma de UUID |
| Rate limit | 10/hora por IP en el bucket `solicitud-correo`, persistente en Postgres. **Fail-closed**: si no se puede evaluar, no pasa |
| Origen del contenido | El servidor **relee la fila** con `service_role`. Si no existe, no sale correo |
| Ventana | La solicitud tiene que tener **menos de 15 minutos** |
| Idempotencia | Un reintento no duplica el aviso, pero un fallo real sí se puede reintentar: la clave solo se consume cuando el envío sale bien |
| `replyTo` | Sale de la fila, no del cuerpo de la petición |
| Escapado | **Todo** valor de la fila pasa por `escHtml` antes de entrar en el HTML |
| Respuestas | `generico(res, status)` — no revela si el recurso existe ni por qué falló |
| Auditoría | Cada resultado (`ok`, `denegado`, `error`) queda en la bitácora, con el motivo |

Seis contratos vigilan esta ruta archivo por archivo (ver `docs/app/CONTRATOS.md`).

### 4.4 El escapador, y por qué hay uno solo

Había **dos** escapadores de HTML y el débil era el de la plantilla de correo: no escapaba `'`.
En un atributo delimitado por comillas simples, o dentro de un `on*=`, una comilla sin escapar
cierra el atributo. `correo.js` ahora importa `escHtml` de `guard.js`, que escapa los cinco
caracteres. Un contrato lo ejecuta de verdad —no lo lee— y comprueba los cinco.

**El nombre y los comentarios del formulario son la entrada menos confiable del proyecto**: los
escribe un desconocido, sin sesión, desde un formulario público.

### 4.5 El botón de WhatsApp — «ante la duda, `null`»

`api/_lib/telefono.js` convierte lo que el cliente escribió en un enlace `wa.me`. `wa.me/<numero>`
abre un chat con **quien sea** que tenga ese número: si la conversión se equivoca, el dueño no ve
un error, le escribe a un desconocido con el nombre y los datos del evento delante.

Por eso el campo tiene que **parecer un teléfono y nada más** (solo dígitos y los separadores que
la gente escribe). Sin esa puerta bastaba con que los dígitos sueltos de cualquier texto sumaran
una longitud válida: `<img src=x onerror=alert(1)>5564395810` producía un número —con el `1` del
`alert(1)` pegado delante— y salía un botón hacia el chat equivocado. No era una inyección; era
exactamente el fallo que ese archivo existe para evitar. Cuatro contratos lo ejecutan con entradas
hostiles.

---

## 5. Cabeceras y CSP (`vercel.json`)

| Cabecera | Valor |
|---|---|
| `Content-Security-Policy` | `default-src 'self'`; `script-src 'self' 'unsafe-inline'`; `style-src` + Google Fonts; `font-src` + `fonts.gstatic.com`; `img-src`/`media-src` = `'self'`, `data:`, `blob:` y el dominio de Supabase; `connect-src` = `'self'` y Supabase (https y wss); `frame-src 'none'`; `object-src 'none'`; `base-uri 'self'`; `form-action 'self'`; `frame-ancestors 'none'` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=()`, `microphone=(self)`, `geolocation=(self)`, `payment=()`, `usb=()`, `interest-cohort=()` |
| `/api/*` | además `Cache-Control: no-store` |

**`img-src` no admite orígenes de terceros, y no se ensancha.** Es la razón de que el proyecto
auto-hospede todo en `public/media/`: ya se sacó imgur (D3) y después Unsplash (J-12), y un
contrato (9D) impide volver a añadir un origen externo en silencio. Si una imagen no se ve en
producción, lo primero que hay que mirar es si su origen está en la CSP.

**Lo que la CSP no da:** `script-src` lleva `'unsafe-inline'`, así que no protege contra un XSS
inyectado en la propia página. Está anotado, no resuelto: quitarlo exige nonces por petición, y
esto es un sitio estático servido desde el borde.

---

## 6. Secretos

**Regla:** nunca poner en commits, logs, documentación, mensajes de PR ni salida de pruebas:
tokens, `service_role`, JWT, contraseñas, correos personales, datos personales ni el **valor** de
una variable de entorno. Los **nombres** sí.

| Variable | Dónde vive | Notas |
|---|---|---|
| `VITE_SUPABASE_URL` | navegador (build) | pública |
| `VITE_SUPABASE_ANON_KEY` | navegador (build) | **pública por diseño** |
| `VITE_URL_PORTAL` | navegador (build) | el enlace del menú al portal |
| `SUPABASE_SERVICE_ROLE` | **solo servidor** | **secreto de verdad.** No lleva prefijo `VITE_` justamente para que Vite no pueda incluirla en el bundle |
| `SUPABASE_URL` | servidor | con `VITE_SUPABASE_URL` como alternativa |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | **solo servidor** | credenciales del envío |
| `MAIL_TO` | servidor | destinatario del aviso |
| `URL_WEB`, `URL_PORTAL`, `URL_CRM` | servidor | las tres URL del ecosistema, en `api/_lib/urls.js` |
| `VITE_ADMIN_SLUG` | servidor | la ruta del panel **del CRM**, usada solo para componer el botón del correo |
| `GEMINI_API_KEY` | local | solo `scripts/gen-images.mjs`, fuera del despliegue |

**Dos cosas que hay en el código y conviene conocer:** `api/solicitud.js` tiene un destinatario
por defecto escrito a mano para cuando falta `MAIL_TO`, y `api/_lib/urls.js` tiene la ruta del
panel también con un valor por defecto. Ninguno es una credencial, pero **el segundo hace que el
nombre de la ruta secreta del panel esté en este repositorio, que es público**. No lo copies a
otros sitios, y si algún día esa ruta se rota, hay que rotarla también aquí.

`urls.js` da a las tres URL el dominio de la web como valor por defecto para que un enlace roto
lleve a un sitio que existe en vez de a `undefined/...`. Es un paracaídas, no la configuración.

---

## 7. Reglas para escribir SQL desde este repo

1. **Forward-only.** Migraciones nuevas en `supabase/migrations/`, nombradas
   `<timestamp>_jardines_sec_NN_<tema>.sql`. **No se reescribe una migración aplicada.**
2. **El prefijo tiene que ser la versión que registró la base.** `supabase db push` compara el
   prefijo del archivo con `supabase_migrations.schema_migrations.version`; cualquier archivo cuyo
   prefijo no esté ahí lo considera **pendiente y lo reejecuta**. Ya pasó: dieciséis archivos
   tenían prefijos inventados, y un `db push` habría reabierto el INSERT público sobre
   `solicitudes` y luego abortado a mitad. `APLICADAS.txt` es la copia del ledger y el contrato
   1.1 la compara.
3. **RLS a mano en toda tabla nueva de `jardines`.** `rls_auto_enable` solo cubre `public`, y es
   de Vero.
4. **Toda función `SECURITY DEFINER` nueva:** `set search_path = ''`, nombres completamente
   calificados, `revoke all ... from public` y `EXECUTE` mínimo. Nunca a `PUBLIC`.
5. **Orden de despliegue: aditivo → frontend → restrictivo.** Revocar antes de desplegar el
   sustituto **ya rompió el formulario público en producción** (`sec_05` → `sec_13`). La base es
   producción compartida.
6. **Toda migración pendiente se declara pendiente** en `APLICADAS.txt` y sus funciones se revocan
   de `public` y de `anon`; hay un contrato (1.3) que lo comprueba.
7. Si tocaste SQL, corre `supabase/tests/seguridad.sql` — va en `BEGIN/ROLLBACK` y no deja rastro.

---

## 8. Lo que sigue abierto y es de seguridad

Detalle en `docs/app/BUGS_PENDING.md`. Resumido:

- **J-16** — dos RPC concedidas a **`anon`** que ningún código invoca: `registrar_llegada_mesa`
  (escribiría `mesas.ocupadas`) e `info_mesa_token`. `anon` es el rol de esta aplicación, así que
  son invocables desde cualquier navegador, sin sesión. Las dos validan token y aplican rate
  limit, pero son superficie que nadie usa. **La lista solo puede encoger.**
- **J-10** — las policies de `jardines` autorizan la **fila entera**, no columnas. No se dispara
  desde aquí (exigen `is_admin()`), pero es de la base que este sitio comparte.
- **J-11** — `eventos_del` permite borrar un evento desde el navegador saltándose el endpoint.
  Mismo caso: exige `is_admin()`, así que `anon` no llega.
- **`script-src 'unsafe-inline'`** en la CSP. Anotado, no resuelto.
- **`sec_29`** escrita y **sin aplicar**.

---

## 9. Estado formal

**`ESPERANDO_VALIDACION_HUMANA`, no cerrado.** Las cuatro puertas pasan y el código está
desplegado, pero **el único flujo de escritura de esta aplicación no se ha ejercitado a mano desde
la FASE 4**: nadie ha llenado el formulario y comprobado que llega el correo. Se saltó a propósito
porque escribe en producción. Está en `docs/app/NEXT_STEPS.md` con su procedimiento, y **no se da
por bueno.**
