# FILE_MAP.md — qué hace cada archivo del sitio público

> Recorrido real del repositorio el **2026-08-24**, sobre `9d0e053`. **689 archivos rastreados**
> en ese momento (`git ls-files | wc -l`), de los cuales **473 son medios**. Aquí están todos los
> que no son medios, uno a uno, más el resumen de los que sí.
>
> Si añades o borras un archivo importante, actualiza esta lista. Un mapa que miente cuesta más
> que no tener mapa.

---

## Raíz (14 archivos)

| Archivo | Qué hace |
|---|---|
| `index.html` | Plantilla de Vite. Meta de SEO, Open Graph, Twitter Card y **dos** bloques JSON-LD (`WebSite` y `EventVenue`, este último con dirección, coordenadas, aforo 600 y teléfono). **Ojo:** `og:url` y los dos `url` del JSON-LD apuntan a `jardinesclubhipico.com`, que no es el dominio servido — es J-04 |
| `vercel.json` | Los 3 redirects 301 (`/portal`, `/portal/`, `/invitacion/:token`), el rewrite de SPA, y las cabeceras: CSP, HSTS, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `nosniff`, y `no-store` para `/api/*`. **Sin `crons`** |
| `package.json` | **Siete** scripts (`dev`, `build`, `lint`, `lint:fix`, `typecheck`, `preview`, `test:contratos`) y las dependencias. Los cuatro de las puertas son `lint`, `build`, `test:contratos` y `typecheck`; `lint:fix` y `preview` son de conveniencia |
| `package-lock.json` | Lockfile |
| `vite.config.js` | Vite + plugin de React y un solo alias: `@` → `./src`. **Código común con los otros dos repos** |
| `jsconfig.json` | Configuración de `tsc` para `npm run typecheck`, con `checkJs: true`. **Su `include` real son `src/pages/**/*.jsx`, `src/Layout.jsx` y `src/vite-env.d.ts`** — ver la nota al final de este documento, porque el `exclude` no hace lo que parece |
| `eslint.config.js` | Tres bloques: componentes/páginas, `src/api/**` y `api/**`. `no-undef` **activo** a propósito (atrapa símbolos borrados; el caso real fue una función eliminada cuyas dos llamadas siguieron vivas). **Código común con los otros dos repos** |
| `tailwind.config.js` | Tema de Tailwind. Código común con los otros dos repos |
| `postcss.config.js` | Autoprefixer. Código común |
| `components.json` | Configuración de shadcn/ui (estilo `new-york`, base `neutral`, iconos Lucide). Código común |
| `CLAUDE.md` | Instrucciones del **juego GENERAL**. Las de esta app están en `docs/app/CLAUDE.md` |
| `PROJECT_CONTEXT.md` | Transferencia del proyecto entero (juego general) |
| `README.md` | **DESACTUALIZADO.** Sigue diciendo «panel de administración y portal del cliente» y «7 funciones serverless en `api/`». Después de la FASE 6 hay **una**. Anotado en `docs/app/NEXT_STEPS.md` |
| `.gitignore` | Código común con los otros dos repos |

---

## `api/` — 5 archivos, 1 función publicada

Vercel **no publica** las carpetas que empiezan por `_`, así que solo `solicitud.js` es una ruta.

| Archivo | Qué hace |
|---|---|
| `api/solicitud.js` | **La única ruta.** Recibe `{ solicitudId }`, relee la fila con `service_role`, y manda el correo al dueño con los datos canónicos de la base. Rate limit por IP (10/hora), ventana de 15 minutos, idempotencia por solicitud, todo escapado con `escHtml`, y auditoría de cada resultado. Segundo botón de WhatsApp solo si el teléfono se pudo derivar |
| `api/_lib/guard.js` | Los controles compartidos: `escHtml` (los cinco caracteres, `'` incluido), `clienteAdmin()`, `leerBody` (tope **por defecto 16 KB**; el llamador puede apretarlo, y `solicitud.js` le pasa 4 KB), `bearer`, `igualSeguro`, `autorizarJardines`, `rateLimit`, `idemIniciar`/`idemCerrar`, `rpcSeguro`, `auditar`, `ipCliente`, `generico`. Respaldados por PostgreSQL. **Código común** |
| `api/_lib/correo.js` | Plantilla dorada (tablas + estilos en línea, porque Gmail borra el `<style>` del `<head>`) y envío por Nodemailer. Importa `escHtml` de `guard.js`: había dos escapadores y el de la plantilla no escapaba `'`. **Código común** |
| `api/_lib/urls.js` | `URL_WEB`, `URL_PORTAL`, `URL_CRM` y `RUTA_PANEL`, cada una desde su variable de entorno con el dominio de la web como paracaídas. **Código común** |
| `api/_lib/telefono.js` | `numeroWhatsApp()` y `enlaceWhatsApp()`. **Propio de esta app.** Regla: ante la duda, `null`. Exige que el campo parezca un teléfono y nada más — sin esa puerta, `<img src=x onerror=alert(1)>5564395810` producía un número válido y un botón que abre el chat de un desconocido |

---

## `src/` — 101 archivos

### Arranque y enrutado

| Archivo | Qué hace |
|---|---|
| `src/main.jsx` | Monta React, importa `index.css` y `theme.css`, registra el service worker |
| `src/App.jsx` | `ErrorBoundary` → `QueryClientProvider` → `BrowserRouter`. Su cabecera documenta qué había antes aquí y por qué se fue |
| `src/pages.config.js` | Declara las páginas. Desde la FASE 6, **solo `Home`**. `mainPage` decide qué se sirve en `/` |
| `src/Layout.jsx` | Diez líneas: un `div` con fondo `#0a0a0a`. Los estilos globales viven en `theme.css` |
| `src/pages/Home.jsx` | **La página.** Pide `ConfigSitio`, `Salon` y `Galeria`; gobierna splash, menú, scroll-spy y el modal del formulario. Aquí vive el plazo de 2.5 s que impide que una lectura colgada deje la portada en negro |
| `src/lib/PageNotFound.jsx` | El 404. **Código común** |

### Acceso a datos — `src/api/`

| Archivo | Qué hace |
|---|---|
| `src/api/base44Client.js` | **El shim, único acceso a datos.** 418 líneas: 27 entidades → tablas, traducción camelCase↔snake_case, `list`/`filter`/`get`/`create`/`update`/`delete` más las variantes **estrictas** (`filterEstricto`, `listEstricto`, `updateEstricto`, `deleteEstricto`) que sí lanzan, storage, auth y `rpc`. **Código común, byte a byte con los otros dos repos** |
| `src/api/supabaseClient.js` | Crea el cliente con `schema: "jardines"`. Si faltan las dos variables `VITE_*`, pinta el aviso en `#root` a mano y deja subir el fallo. **No fija `storageKey`** — ver `docs/app/ARCHITECTURE.md` §3.2 |
| `src/api/funciones.js` | **Propio de esta app.** `RUTAS = ["/api/solicitud"]` y el `functions.invoke` que traduce `gmailSolicitud` a esa ruta. Un nombre desconocido **lanza** |

### Componentes propios — 29 archivos en `src/components/`

| Archivo | Qué hace |
|---|---|
| `HeroSection.jsx` | El hero: los dos videos de siempre y el soporte del video temporal, hoy apagado. 420 líneas, el archivo más grande de `src/components/` |
| `SplashScreen.jsx` | Pantalla de entrada. Dispara la precarga del video del hero |
| `StaggeredMenu.jsx` + `StaggeredMenu.css` | Menú de secciones (adaptado de React Bits, usa GSAP). Tema oscuro + dorado `#C9A84C` |
| `ScrollAnimationSection.jsx` | La animación de scroll sobre **241 frames** (`TOTAL_FRAMES = 241`) |
| `ScrollAnimationCaptions.jsx` | Frases contextuales superpuestas a esa animación |
| `ScrollHint.jsx` | El indicador «Desliza para descubrir» |
| `SalonesSection.jsx` | Lista de espacios. Sus imágenes de respaldo están auto-hospedadas por la CSP |
| `SalonOverlay.jsx` | Ficha de un espacio, a pantalla completa |
| `SalonGallery.jsx` | Galería dentro de la ficha de un espacio (344 líneas) |
| `GaleriaSection.jsx` | La galería general del sitio |
| `MediaViewer.jsx` | Visor de imagen/video a pantalla completa. Exporta `isVideo(url)`, que decide por extensión. **Código común** |
| `MediaCarrusel.jsx` | Carrusel con flechas y swipe. **Código común (con el portal)** |
| `ServiciosAmenidades.jsx` | Lee `ServicioItem` y `AmenidadItem` activos y los pinta |
| `ServiceAmenityCard.jsx` | La tarjeta de un servicio o amenidad |
| `FormularioModal.jsx` | **El formulario de cotización.** 365 líneas. Único camino de escritura del sitio |
| `CtaCotizacion.jsx` | La llamada a la acción que abre el formulario. Su fondo se auto-hospedó por J-12 |
| `ContactoSection.jsx` | Contacto. Sus datos salen de `config/negocio.js`, no inventados |
| `ComoFunciona.jsx` | Los tres pasos del proceso |
| `FaqSection.jsx` | Preguntas frecuentes (contenido literal, no viene de la base) |
| `NoIncluyeSection.jsx` | Lo que el salón no incluye, a partir de un texto de la configuración |
| `Confianza.jsx` | Reseñas: lee `ResenasConfig` y `Resena` aprobadas, con `src/data/resenas.json` como base |
| `BarraDulces.jsx` | La sección de la barra de dulces, con su flyer |
| `ProximamenteCartel.jsx` | Cartel pegado dentro del hero |
| `ProximamenteModal.jsx` | El lightbox de ese cartel |
| `AnimatedItem.jsx` | Patrón de reveal con `useInView` |
| `SoundToggle.jsx` | Interruptor del sonido de interfaz |
| `soundSystem.jsx` | Tonos sintetizados con Web Audio API — sin archivos de audio. Recuerda la preferencia en `localStorage` bajo `jch_sound` |
| `ErrorBoundary.jsx` | **El único error boundary del proyecto.** Sin él, una excepción en el render deja la página en blanco. **Código común** |

### Primitivas de interfaz — 49 archivos en `src/components/ui/`

shadcn/ui sobre Radix: `accordion`, `alert`, `alert-dialog`, `aspect-ratio`, `avatar`, `badge`,
`breadcrumb`, `button`, `calendar`, `card`, `carousel`, `chart`, `checkbox`, `collapsible`,
`command`, `context-menu`, `dialog`, `drawer`, `dropdown-menu`, `form`, `hover-card`, `input`,
`input-otp`, `label`, `menubar`, `navigation-menu`, `pagination`, `popover`, `progress`,
`radio-group`, `resizable`, `scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`,
`slider`, `sonner`, `switch`, `table`, `tabs`, `textarea`, `toast`, `toaster`, `toggle`,
`toggle-group`, `tooltip`, `use-toast`.

De todas ellas, el sitio público solo usa unas pocas —`toaster`/`toast`/`use-toast` de verdad, vía
`App.jsx`—; el resto son la librería completa tal y como la instaló shadcn. `toast.jsx`,
`toaster.jsx` y `use-toast.jsx` son **código común** con los otros dos repos.

### Configuración, hooks, utilidades y datos

| Archivo | Qué hace |
|---|---|
| `src/config/negocio.js` | **Los datos de contacto verificados**: `WHATSAPP`, `TELEFONO`, `CORREO`, `UBICACION`, `MAPA`. Existe para que ningún respaldo se los invente, y dos contratos (1.4, 1.5) lo vigilan. **Código común (con el portal)** |
| `src/config/heroTemporal.js` | El interruptor del video temporal del hero, hoy en `activo: false`. No se borró nada: `activo: true` lo devuelve tal cual estaba |
| `src/hooks/use-mobile.jsx` | `useIsMobile()`, corte en 768 px |
| `src/hooks/useBackButtonClose.js` | Cierra un modal con el botón «atrás» del móvil, empujando un estado al history |
| `src/hooks/useLockBodyScroll.js` | Bloquea el scroll con `overflow: hidden` en `html` y `body` |
| `src/lib/precargaHero.js` | Deja el video del hero descargado antes de que el hero exista. Idempotente |
| `src/lib/query-client.js` | La instancia de TanStack Query. **Código común** |
| `src/lib/utils.js` | `cn()` (clsx + tailwind-merge). **Código común** |
| `src/utils/index.ts` | Dos líneas: `createPageUrl()` |
| `src/index.css` | Directivas de Tailwind y variables base. **Código común** |
| `src/styles/theme.css` | El tema global: Inter, tokens, scrollbar. Vive aquí y no en `Layout.jsx` porque hay rutas que no pasan por el Layout. **Código común** |
| `src/vite-env.d.ts` | Sin esto, cada lectura de una variable `VITE_*` cuenta como error de tipos. **Código común** |
| `src/data/resenas.json` | **El único JSON que se lee en runtime.** Lo importa `Confianza.jsx` |
| `src/data/site-data.json` | **NO es un fallback.** 967 líneas de contenido que solo alimentan `scripts/seed-supabase.mjs` y `scripts/montage.mjs`. Comprobado: nadie en `src/` ni en `api/` lo importa |

---

## `public/` — 477 archivos

| Ruta | Contenido |
|---|---|
| `public/media/frames/` | **241** JPG de la animación de scroll |
| `public/media/img/` | **231** archivos: fotos del salón, logos, flyers y los videos del hero. De todo `public/media/`, **25 son video** |
| `public/media/b44/` | 1 archivo heredado de la migración desde Base44 |
| `public/favicon.png` | El favicon |
| `public/manifest.json` | Manifiesto PWA **de este sitio** (`start_url: "/"`) — es el que enlaza `index.html` |
| `public/manifest.webmanifest` | Manifiesto del **portal** (`start_url: "/portal"`). Sobrevive a la separación y **este sitio no lo enlaza**: `index.html` apunta a `manifest.json`. Candidato a limpieza |
| `public/sw.js` | Service worker mínimo: solo passthrough a red, **sin caché**, para que el contenido dinámico no se quede viejo. Existe para habilitar «Instalar app». **Código común (con el portal)** |

---

## `scripts/` — 22 archivos

| Archivo | Qué hace |
|---|---|
| `scripts/test-contratos-api.mjs` | **La suite de contratos**, 1473 líneas. 59 casos, estáticos, sin red ni credenciales. Ver `docs/app/CONTRATOS.md` |
| `scripts/compartidos.json` | El registro del código común: **25 archivos** en `archivos` con su `sha256` y en qué repos aparecen, más **188** en `propios`. El contrato solo hashea los 25 de `archivos`; `propios` es inventario, no está vigilado |
| `scripts/build-media.mjs` | Descargó los medios a `public/media/` y regenera `src/data/site-data.json`. **Descarga ~570 MB por red.** No es parte del ciclo normal |
| `scripts/seed-supabase.mjs` | **No toca la base.** Lee `site-data.json` y escribe `scripts/seed/*.sql` |
| `scripts/montage.mjs` | Hojas de contacto de la galería, para revisarla visualmente |
| `scripts/reorder-galeria.mjs` | Reordena `scripts/raw/galeria.json` según un análisis visual |
| `scripts/gen-images.mjs` | Genera imágenes con Gemini. Requiere `GEMINI_API_KEY` en el entorno |
| `scripts/raw/*.json` | **7** volcados crudos del contenido: `alimentos`, `amenidades`, `config`, `galeria`, `salones`, `servicios`, `serviciosExtra` |
| `scripts/seed/*.sql` | **8** archivos de seed generados, `01_config` … `08_resenas`. Se aplicaron aparte, no desde el script |

---

## `supabase/` — 30 archivos

| Ruta | Contenido |
|---|---|
| `supabase/migrations/*.sql` | **28** migraciones, `sec_01` … `sec_29` **sin `sec_10`**. El prefijo de cada nombre es la versión que registró la base, no una fecha inventada |
| `supabase/migrations/APLICADAS.txt` | La copia del ledger. Dice qué corrió de verdad y **advierte de que el proyecto no se puede reconstruir desde cero**: las 19 migraciones fundacionales están en el ledger y no existen como archivo aquí. El contrato 1.1 compara este archivo contra los nombres |
| `supabase/tests/seguridad.sql` | Pruebas de seguridad en `BEGIN/ROLLBACK`. No dejan rastro |

---

## `docs/` y `nano-banana/`

- **`docs/`** — dos juegos. El **GENERAL** (`ESTADO.md`, `ARCHITECTURE.md`, `DATABASE.md`,
  `SEGURIDAD.md`, `FILE_MAP.md`, `BUGS_PENDING.md`, `NEXT_STEPS.md`, `CHANGELOG.md`,
  `DECISIONS.md`, `MAPA.md`, `COMPONENTES.md`, `DATOS.md`, `DEPLOY.md`, `PROMPTS.md`,
  `VALIDACION.md`, los cuatro `PLAN-*.md`) describe el proyecto **entero**, incluidas partes que
  ya no viven aquí; lo mantiene otra persona. El de **esta app** es `docs/app/`.
  `docs/ECOSISTEMA.md` es idéntico en los tres repos y **no se edita solo aquí**: es el único
  `.md` de los **25** que `scripts/compartidos.json` registra con `sha256`, así que editarlo
  aquí solo **rompe la suite**. `docs/muestras/` son dos correos de ejemplo en HTML.
- **`nano-banana/`** — 16 archivos: cinco carpetas con el `prompt.md` y las imágenes de referencia
  que se usaron para generar ilustraciones, más un `README.md`. No entra en el build.
- **`.claude/launch.json`** — arranque del servidor de desarrollo (`npm run dev`, puerto 5173).

---

## Nota importante — el alcance real de `lint` y `typecheck`

Los dos cubren menos de lo que sus configuraciones aparentan. Comprobado ejecutándolos, no leído:

**ESLint.** `npx eslint src/App.jsx --format json` responde
*«File ignored because no matching configuration was supplied»* — igual que `src/main.jsx`. Los
tres bloques de `eslint.config.js` cubren `src/components/**`, `src/pages/**`, `src/Layout.jsx`,
`src/api/**` y `api/**`, y nada más. `src/hooks/`, `src/config/`, `src/pages.config.js` y
`scripts/` son `.js`/`.mjs`, así que caen en la configuración por defecto de ESLint, **que no
tiene ninguna regla activa**: pasan siempre.

**Typecheck.** El `include` de `jsconfig.json` nombra `src/components/**/*.js` (y bajo
`src/components/` **no hay ni un `.js`**: son todos `.jsx`), `src/pages/**/*.jsx`, `src/Layout.jsx`
y `src/vite-env.d.ts`. Es decir: la única raíz real es `Home.jsx`. Y su `exclude` —que lista
`src/api` y `src/lib`— **no impide** que `tsc` revise esos archivos, porque `exclude` solo filtra
lo que entra por `include`, no lo que llega siguiendo un `import`. Por eso tres de los nueve
errores de la línea base están en `src/api/base44Client.js`, que figura como excluido.

Consecuencia práctica: **`api/` no se typechequea en absoluto**, y `src/App.jsx` y `src/main.jsx`
no se lintean. La red que de verdad cubre esos archivos son los contratos.
