# PROJECT_CONTEXT.md

> **Documento principal de transferencia.** Si vas a trabajar en este proyecto, léelo completo
> antes de tocar código. Última reescritura: **2026-08-03**.

---

## 1. Objetivo del proyecto

Sitio web y portal de **Jardines Club Hípico**, un salón de eventos grande en Xochimilco, CDMX
(bodas, XV años, corporativos, infantiles, eventos nocturnos).

El proyecto tiene **dos objetivos** que llegaron en dos fases:

1. **Captar cotizaciones (leads).** El visitante conoce los espacios y servicios y manda una
   solicitud, que se atiende por WhatsApp. Esta era la FASE-01 (sitio estático migrado de Base44).
2. **Operar el evento vendido.** Desde FASE-02 hay base de datos real: panel de administración,
   portal del cliente, documentos, mesas e invitaciones digitales, cronograma, música, RSVP y un
   módulo operativo para el personal del salón.

Se migró de **Base44** a un proyecto Vite/React independiente para dejar de depender de esa
plataforma. Base44 **ya no existe ni se usa**; solo sobrevive el nombre de un archivo.

## 2. Estado actual

**En producción y funcionando:**

- Sitio público completo (hero, espacios, animación por scroll, servicios, amenidades, galería,
  FAQ, contacto) — `https://jardinesclubhipico.com` vía Vercel.
- Formulario de cotización → fila en `jardines.solicitudes` (RPC validada) + correo al dueño.
- Panel de administración en ruta secreta: CMS del sitio, eventos, documentos, mesas,
  invitaciones, reseñas, solicitudes, administradores.
- Portal del cliente (`/portal`): su evento, documentos, invitación, sugerencias, reseña.
- Primer acceso del cliente por **enlace de un solo uso** (`/portal#entrar=…`).
- Vistas por QR: `/acceso/:token` (control de acceso), `/staff/:token` (meseros),
  `/invitacion/:token` (invitación pública con RSVP).
- Correos transaccionales por Gmail (Nodemailer) y un cron diario de recordatorios.
- Deploy automático: push a `main` → Vercel.

**Blindaje de seguridad (2026-08-01 → 2026-08-03):** 23 migraciones `jardines_sec_01..24`
aplicadas en producción. Detalle completo en `docs/SEGURIDAD.md` y `docs/CHANGELOG.md`.

**Estado formal: `ESPERANDO_VALIDACION_HUMANA_AUTENTICADA`.** El código está desplegado y
verificado por pruebas automáticas, pero **no se declara CERRADO** hasta que Miguel confirme
visualmente, con credenciales reales, los cinco flujos de §8.F. Es lo único que falta.

- Panel → **Personal del evento**: asigna operativos a eventos, con el guardarraíl que impide
  dejar a alguien sin acceso.
- Panel → **Salones**: sube el plano real de cada salón, que es el lienzo del editor de mesas.

**Incompleto / opcional:**

- Carrusel de reseñas: depende de que existan reseñas aprobadas en `jardines.resenas`.
- No hay pantalla de "cambiar mi contraseña" dentro del portal (J-05).
- `operativo_activo` no se maneja desde el panel: se enciende y apaga en la base (J-07).

**Roto:** nada conocido.

## 3. Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | React 18, Vite 6, Tailwind CSS 3, Framer Motion, shadcn/ui (Radix), Lucide, react-router-dom 7, TanStack Query 5 |
| Datos | **Supabase** — PostgreSQL 17, `us-east-1`, proyecto `vuzyhbiwnnngeohysxcw`, schemas `jardines` + `jardines_private` |
| Cliente de datos | `@supabase/supabase-js` 2 detrás del shim `src/api/base44Client.js` |
| Backend | 7 funciones serverless en `api/` (Node, Vercel) + Nodemailer 9 |
| Auth | Supabase Auth (email/contraseña). Los clientes usan **usuario**, que se convierte en un correo sintético interno |
| Hosting | Vercel (equipo `mh-astral-systems`, proyecto `jardines-club-hipico`) |
| Repo | GitHub `M1gu3hb/jardines-club-hipico` (privado) |
| Runtime | Node 24, npm |

**Variables de entorno.** Front (`VITE_*`, públicas por diseño): `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`, `VITE_ADMIN_SLUG`. Servidor (secretas, solo Vercel):
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `MAIL_TO`,
`CRON_SECRET`.

> ⚠️ **`VITE_ADMIN_SLUG` y `VITE_SUPABASE_URL` no son solo del build.** Las funciones de `api/`
> las leen **en runtime**: `VITE_ADMIN_SLUG` en `notificar.js`, `canjear-acceso.js`,
> `cron-recordatorios.js` y `crear-admin.js` (para armar el enlace al panel en los correos), y
> `VITE_SUPABASE_URL` como respaldo de `SUPABASE_URL` en `_lib/guard.js` y
> `cron-recordatorios.js`. Si cambias el slug y **no** expones la variable también al runtime de
> las funciones, todos los enlaces al panel de todos los correos seguirán apuntando al slug por
> defecto de `src/config/portal.js` — que ya no existirá.

> ⚠️ El proyecto de Supabase **está compartido con otra aplicación, Vero Seguros**, que vive en
> el schema `public`. Ver el CANDADO ABSOLUTO en `CLAUDE.md` y `docs/SEGURIDAD.md` §1.

## 4. Arquitectura general

```
Navegador
  └─ SPA React (Vite) ── main.jsx → App.jsx (AuthProvider + react-router)
        ├─ /                    → Home (sitio público)
        ├─ /<ADMIN_SLUG>        → RequireAdmin → Admin (panel)
        ├─ /portal              → PortalPage (login + portal del cliente)
        ├─ /acceso/:token       → AccesoPage  (QR de control de acceso)
        ├─ /staff/:token        → StaffPage   (vista de meseros)
        └─ /invitacion/:token   → InvitacionPublica (RSVP)

Datos    componentes → base44Client.js (SHIM) → supabaseClient.js → PostgREST → schema `jardines`
         Autorización = RLS en la base. El front NO decide permisos.
Correo   componentes → /api/* (Vercel, service_role) → Nodemailer → Gmail
Medios   públicos: public/media/**  ·  subidos: Storage (buckets clientes/planos/sitio/operativo)
Deploy   push a main → Vercel build (vite) → producción
```

Detalle profundo: `docs/ARCHITECTURE.md`.

## 5. Módulos principales

**Sitio público** — `src/pages/Home.jsx` monta en orden: `HeroSection`, `Confianza`,
`SalonesSection` (→ `SalonOverlay`), `ScrollAnimationSection` (241 frames),
`ServiciosAmenidades` (+ `BarraDulces`), `ComoFunciona`, `CtaCotizacion`, `GaleriaSection`
(→ `MediaViewer`), `FaqSection`, `ContactoSection`, `NoIncluyeSection`, footer,
`FormularioModal`, `ProximamenteModal` y WhatsApp flotante.

**Panel admin** — `src/pages/Admin.jsx` + `src/components/admin/*`: CMS del sitio (config,
salones, galería, servicios, amenidades, alimentos, reseñas), `AdminSolicitudes`,
`AdminAdministradores` y el módulo de eventos (`admin/eventos/*`: datos, ficha, documentos,
items contratados, RSVPs).

**Portal del cliente** — `src/components/portal/*`: login, inicio, "ármalo", contratado,
documentos, invitación, sugerencias, reseña, instalación PWA.

**Mesas e invitaciones** — `src/components/mesas/*` (editor y reglas) e
`src/components/invitacion/InvitacionPublica.jsx`.

**Meseros / operativo** — `src/components/meseros/*` (acceso por QR, vista de staff, generación
del enlace) + las tablas `operativo_*`.

Referencia componente por componente: `docs/COMPONENTES.md`. Dónde tocar para cada cambio:
`docs/MAPA.md`.

## 6. Entidades y base de datos

**Hay base de datos en vivo.** 32 tablas en `jardines` (contenido del sitio + operación del
evento) y 6 tablas en `jardines_private` (secretos, auditoría, rate limit, idempotencia,
aprovisionamiento, accesos de un solo uso). `jardines_private` **no** está expuesto en la Data
API y `anon`/`authenticated` no tienen `USAGE` sobre él.

Los componentes hablan con las tablas a través del mapa `TABLES` de `src/api/base44Client.js`
(p. ej. `ConfigSitio` → `config_sitio`, `Salon` → `salones`, `Evento` → `eventos`).

Esquema completo, funciones, RPCs y reglas: **`docs/DATABASE.md`**. Modelo de permisos:
**`docs/SEGURIDAD.md`**.

## 7. Mapeo de archivos importantes

Resumen (detalle en `docs/FILE_MAP.md`):

- `src/api/base44Client.js` — **SHIM de datos**. Única puerta a la base. No romper su API.
- `src/api/supabaseClient.js` — cliente Supabase (`db.schema = "jardines"`).
- `src/api/authContext.jsx` — sesión y rol; `src/components/auth/RequireAdmin.jsx` — guard.
- `src/config/portal.js` — `ADMIN_SLUG`, dominio del correo sintético, link de reseña.
- `src/pages/Home.jsx` / `src/pages/Admin.jsx` — orquestadores.
- `api/_lib/guard.js` — **módulo central de seguridad de las rutas serverless**.
- `api/*.js` — 7 rutas: solicitud, notificar, correo-cliente, crear-admin,
  crear-usuario-evento, canjear-acceso, cron-recordatorios.
- `supabase/migrations/*.sql` — migraciones forward-only.
- `supabase/tests/seguridad.sql` — 63 aserciones de seguridad.
- `scripts/test-contratos-api.mjs` — 127 contratos frontend ↔ API.
- `vercel.json` — rewrites SPA, cabeceras HTTP (CSP, HSTS…) y el cron.
- `src/data/resenas.json` — **el único JSON vivo**: lo importa `src/components/Confianza.jsx`.
- `src/data/site-data.json` — **no lo importa nadie** en `src/` ni en `api/`. Es solo la entrada
  de `scripts/seed-supabase.mjs` (y de `scripts/montage.mjs`). No es un fallback: si Supabase no
  responde, el sitio se renderiza vacío.
- `src/styles/theme.css` — **estilos globales reales** (Inter, tokens `.skeu-*`, scrollbar),
  importado en `src/main.jsx`. `Layout.jsx` son 10 líneas y solo pone el fondo.

## 8. Flujos críticos

**A) Cotización (lead).** `FormularioModal` → `base44.entities.SolicitudEvento.create()` →
RPC `jardines.solicitud_crear` (valida formato, aplica rate limit por IP y fija folio, estatus
y fechas del lado del servidor) → el front recibe el folio real → `POST /api/solicitud` con
solo el `solicitudId` → la función relee la fila con `service_role` y manda el correo al dueño.
Si el servidor no devuelve folio, **no** se muestra pantalla de éxito.

**B) Alta de un cliente.** Admin en el panel → `POST /api/crear-usuario-evento` (verifica que
quien llama es admin de Jardines) → registra el aprovisionamiento, crea el usuario con la Admin
API, asigna rol vía `asignar_rol` y crea un **enlace de un solo uso** (`crear_acceso_unico`) →
correo al cliente. La contraseña **no** viaja en el correo.

**C) Primer acceso del cliente.** El cliente abre `/portal#entrar=<token>` → `PortalLogin`
manda el token a `POST /api/canjear-acceso` → canje **en dos fases**
(`canjear_acceso_iniciar` → OTP → `canjear_acceso_confirmar`, con `canjear_acceso_liberar` si
algo falla en medio, para no quemar el token) → `verifyOtp` → el **servidor** decide el destino
según el rol leído en la base.

**D) Documentos.** Admin sube el archivo al bucket `clientes` en la carpeta `<evento_id>/`
(sin prefijo `evento-`: la policy compara `foldername(name)[1]` contra `eventos.id`) → registra
la fila en `documentos` → `POST /api/correo-cliente` con `documentoId` → la función comprueba
que el documento pertenece a ese evento y avisa al cliente.

**E) Enlace de meseros.** El panel llama a la RPC `rotar_staff_token`, que devuelve el token
**una sola vez** (256 bits). La columna en claro ya no existe: solo se guarda el HMAC. Tras
recargar, el panel ofrece "Generar nuevo enlace". Todas las validaciones pasan por
`jardines_private.evento_por_staff()`, que responde siempre el mismo error genérico.

> ⚠️ **Todos los correos enlazan al dominio de Vercel, no al propio.** `api/_lib/correo.js:5`
> fija `SITIO_URL = "https://jardines-club-hipico.vercel.app"` como constante, sin leer ninguna
> variable de entorno — igual que el logo embebido. Al conectar el dominio propio hay que
> cambiarlo ahí también, o los correos seguirán apuntando al viejo. Ver `docs/BUGS_PENDING.md` (J-01).

**F) Validación humana pendiente.** Miguel debe confirmar en pantalla, con credenciales reales:
(1) alta de cliente, (2) enlace de primer acceso, (3) subir y abrir documentos, (4) aviso de
cotización, (5) generar y abrir el link de meseros.

## 9. Decisiones tomadas

Ver `docs/DECISIONS.md` (formato decisión · razón · consecuencia · archivos). Las clave:

- **D2** — shim que imita el SDK de Base44, para no reescribir todos los componentes.
- **D-SEC-1** — el rol **nunca** sale de `user_metadata`; solo de fuente server-side.
- **D-SEC-2** — el trigger compartido de `auth.users` no crea perfiles cruzados con Vero.
- **D-SEC-5** — la configuración global de Auth no se toca (es compartida).
- **D-SEC-7** — semántica **at-least-once** en los correos: se prefiere un duplicado a un
  correo perdido, porque Gmail y Postgres no comparten transacción.
- **D-SEC-9** — el token de staff se retiró en claro (`sec_20`); solo vive como hash.

## 10. Bugs pendientes

Ver `docs/BUGS_PENDING.md`. **No hay bugs críticos abiertos.** Quedan riesgos residuales
documentados (tokens portadores por diseño, canales operativos globales, pendientes
compartidos con Vero) y dos cosas menores de contenido/SEO.

## 11. Riesgos

- **Base compartida con Vero Seguros.** Un cambio descuidado en `public`, en `auth` global o en
  el trigger compartido puede romper una aplicación que no es esta. Ver el candado en `CLAUDE.md`.
- **Producción compartida = las migraciones afectan al sitio en línea de inmediato**, aunque el
  frontend nuevo siga en una rama. Primero lo aditivo, luego el front, y al final el retiro.
- **Tokens de mesa, invitación y staff son credenciales portadoras**: quien tenga el QR entra.
  Es el diseño del producto; se mitiga con 256 bits, expiración, revocación y rate limit.
- **`operativo_canales` es global, no por evento.** Con dos eventos simultáneos el personal
  compartiría canal de radio. Hoy el salón opera un evento a la vez.
- **Repo pesado (586 MB)** por los medios auto-hospedados: clonar y desplegar es lento.
- **`GMAIL_APP_PASSWORD`, `SUPABASE_SERVICE_ROLE` y `CRON_SECRET`** son secretos de Vercel. Si
  el correo o el cron dejan de funcionar, revisa esas variables antes que el código.

## 12. Próximos pasos

Ver `docs/NEXT_STEPS.md`. Resumen: cerrar la validación humana pendiente (§8.F); después,
pantalla para asignar personal a eventos, cambio de contraseña dentro del portal, canales
operativos por evento y acordar con Vero los pendientes compartidos.

## 13. Prompts útiles

Ver `docs/PROMPTS.md`: prompt de arranque para una sesión nueva, el **prompt fijo de
documentación viva** (el que se usa para transferir el proyecto a otra cuenta o IA), cómo
editar contenido, prompts de Nano Banana y deploy manual.

## 14. Cosas que NO se deben romper

- El **shim** `src/api/base44Client.js` y su API pública (todos los componentes dependen de ella).
- **RLS** en todas las tablas de `jardines`, y la regla de activarlo a mano en cada tabla nueva.
- El `search_path = ''` y los grants mínimos de las funciones `SECURITY DEFINER`.
- `api/_lib/guard.js`: autorización, rate limit, idempotencia y escapado de HTML de las rutas.
- El **candado de Vero** (schema `public`, bucket `site-media`, Auth global).
- Las cabeceras y el cron de `vercel.json`, y el fallback SPA.
- Los medios en `public/media/` (rutas `/media/...`) y los videos del hero (ya comprimidos).
- El tema oscuro + dorado `#C9A84C`.
- Que `/Admin` siga siendo 404 y el panel solo viva tras `ADMIN_SLUG` + `RequireAdmin`.

## 15. Última actualización

**2026-08-03** — Reescritura completa de la documentación viva para transferencia a otra
cuenta o IA. Se eliminaron los cuerpos obsoletos que aún describían la etapa estática
("no hay base de datos en vivo") en `PROJECT_CONTEXT.md`, `docs/ARCHITECTURE.md`,
`docs/DATABASE.md` y `docs/PROMPTS.md`, y se reescribió `docs/FILE_MAP.md`, que llevaba
sin actualizarse desde FASE-01.

**2026-08-03 (bloque 6)** — Se cierra la red de pruebas. Una auditoría mutó los 16 contratos que
añadió el bloque 5 y encontró **7 que no comprobaban lo que su nombre afirmaba** (3 vacuos, 1
frágil, 2 propiedades sin contrato, 1 acoplado al formato), todos por el mismo patrón: un `grep`
de identificador suelto sobre todo el archivo. Corregidos y validados **mutando la regresión real
en el archivo real**; contratos **94 → 99**. La regla queda escrita en `CLAUDE.md`,
`docs/PROMPTS.md` §9 y `docs/DECISIONS.md` D-COD-15. **Ningún cambio de producto, ninguna
migración.** Se corrigió además la afirmación del bloque 5C en `docs/CHANGELOG.md`, que decía que
los 16 se habían verificado mutando.

**2026-08-03 (despliegue)** — PR #5 **mergeado** a `main` (`7596324`) y desplegado en Vercel
(`dpl_B2tz9uFpuG33uepb7tAhCHH8DbMQ`, READY, 7 funciones). Producción sirve ya los bloques 3–6:
<https://jardines-club-hipico.vercel.app>. Verificado post-deploy sin sesión: las 6 cabeceras de
`vercel.json`, `no-store` en `/api/*`, las 7 funciones con su guard, las 7 rutas de la SPA, los
**228 medios** que la base referencia (0 rotos, 0 de imgur) y el **formulario público de punta a
punta** (folio del servidor, fila en `solicitudes`, correo enviado, auditoría en `ok`). El guion
de validación para el dueño está en **`docs/VALIDACION.md`**.

**2026-08-03 (bloque 7)** — Las cuatro cosas que encontró el dueño usando el panel. La más
importante: **el estatus de una solicitud no se podía cambiar**, y no era ni el GRANT ni el `[]`
mudo del shim, sino que el CHECK de `sec_07` admite `Nueva, En proceso, Cotizada, Cerrada,
Descartada` y el panel ofrecía otros tres nombres — solo coincidía `Nueva`, así que cualquier
cambio violaba el constraint, y `updateStatus` sin `try/catch` lo hacía invisible. Además: la
actividad del portal se borra (a mano y a los 7 días desde el cron), el resumen diario separa lo
que entró de lo que se enfría, y el aviso de nueva solicitud pasa a la plantilla dorada.
Contratos **99 → 127**. **Ninguna migración.** PR #6.

**Bloque 8 (2026-08-04, desplegado en `b1dbf69`, hoy dentro de `1b0fb4f`).** **8B** —
eliminar un evento: lo único irreversible del panel, con el orden archivos → huérfanas → fila →
Auth y confirmación negativa en cada eslabón—, **8C** — cuatro eventos «Boda ortega» idénticos en
producción, y la confirmación por nombre no distingue entre ellos: ahora el diálogo dice cuál se
borra (hora de alta + cuenta) y la lista los marca— y **8E** — cargando, vacío y falló dejan de
ser la misma pantalla. De 8E salieron dos cosas que **no** eran cosméticas: `AdminConfig` y
`MesaReglas` podían crear una **segunda fila** de configuración/reglas tras una lectura caída, y
tres pantallas se quedaban en "Cargando…" para siempre. **8D quedó bloqueado**: la trazabilidad
solicitud→evento exige una columna que no existe. Contratos **146 → 177**. **Ninguna migración.**

**8F (2026-08-04), correcciones de la auditoría del bloque 8.** Un **P0**: `eliminar-evento` le
pasaba a `deleteUser` el uuid de `eventos.auth_user_id` sin comprobar de quién era, y esa columna
la escribe cualquier admin desde el navegador (`eventos_upd` autoriza la fila entera, no
columnas). `deleteUser` es un hard delete sobre `auth.users`, **la tabla compartida con Vero**,
que tiene un único administrador. Ahora `guard.js` es el único sitio que puede llamar a
`deleteUser` y exige un permiso explícito sin valor por defecto. Además: un `nombre_evento` vacío
anulaba la confirmación de borrado (cerrado en servidor, botón y ficha), la comprobación de
`notificaciones` era una carrera con el cron que abortaba **con el bucket ya vaciado**, y el
inventario no contaba cuatro tablas que sí se borran. Los dos hallazgos de RLS (J-10, J-11) se
anotan y esperan decisión: exigen migración. Contratos **177 → 202**.

**Bloque 9 (2026-08-04).** **9A** mergea por fin 8A —llevaba un mes sin mergear y su bug seguía
vivo: el panel pedía 6 caracteres de contraseña y el servidor exige 8—; los conflictos fueron tres
y se resolvieron con `main` de base. **9B** aplica `sec_25` (`eventos.solicitud_id`, aditiva,
ensayada en `BEGIN/ROLLBACK`, Vero idéntico antes y después). **9C** convierte una solicitud en
evento con los datos ya puestos, resolviendo el salón por nombre exacto, sin copiar nada que no se
pueda comprobar y **sin derivar jamás las credenciales** de datos que escribió un desconocido.
**9D** cierra J-12: catorce imágenes de Unsplash que la CSP bloqueaba, auto-hospedadas — sin
ensanchar la CSP.

**9E (correcciones de la auditoría del bloque 9).** Los cuatro hallazgos eran la misma pregunta
sin responder: **un array vacío por fallo tratado como uno por ausencia**. Con la lectura de
salones caída, la conversión afirmaba que el salón del cliente «no coincide con ninguno de los
registrados» sin haber mirado ninguno; el guardarraíl de «ya se convirtió» vivía donde se pinta y
no donde se escribe; la ficha se quedaba en «(cargando…)» para siempre; y nada anclaba
`PASSWORD_MIN` a la política de Auth, que es un tercer validador que no se puede leer desde aquí.
Contratos **206 → 259**.

**9F (2026-08-04), auditoría de los contratos de 9E.** La pregunta era «¿este contrato comprueba
que el código hace algo, o solo que la frase está escrita?», y la respuesta salió **cuatro veces
"solo la frase"**. **G1**: la señal de salones llamaba "no legible" a una lista que el desplegable
estaba pintando, porque juntaba «¿tengo lista?» con «¿está al día?» — `useCarga` conserva `datos`
cuando una recarga falla, así que ese estado ocurre; ahora son dos señales, con lista vieja se
puede trabajar avisando, y el contrato se afirma sobre la propiedad (el aviso de "no sale ninguno"
cuelga de la longitud del mismo array que llena el desplegable), no sobre el texto. **G2**: el
contrato del rechazo de Auth sobrevivía a `const debil = false` —las tres cadenas que buscaba
seguían escritas—, reescrito sobre alcanzabilidad. **G3**: `setFalloConvertidas` no tenía
contrato. **G4**: `/password|weak|.../i` afirmaba "tu contraseña es débil" ante cualquier error de
Auth que mencionara "password"; ahora se clasifica por código o por frase completa, y el código de
Auth queda auditado siempre. Y del repaso de los 14 contratos de 9E, **uno no comprobaba lo que
decía**: se podía consumir el traspaso antes del guardarraíl con la suite en verde.
Contratos **259 → 270**.

Estado del código: **bloques 3–9 + 9E desplegados** (commit `1b0fb4f`, PR #10, 2026-08-04);
**9F escrito y sin desplegar**. El estado revisable completo está en **`docs/ESTADO.md`**.
Batería: `lint` 0, `build` exit 0, `test:contratos` **270/270**, `typecheck` 59. Base en
`sec_01..25`, Vero intacto. Estado formal: **`ESPERANDO_VALIDACION_HUMANA_AUTENTICADA`**
(ver §8.F) — solo faltan los cinco flujos con credenciales reales, con el guion en
`docs/VALIDACION.md`. Historial completo en `docs/CHANGELOG.md`.
