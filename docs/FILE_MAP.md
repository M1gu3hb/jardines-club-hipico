# FILE_MAP.md

## Mapa de archivos importantes

### Raíz
- `CLAUDE.md` — instrucciones permanentes para IA. **No romper** las reglas de proyecto.
- `PROJECT_CONTEXT.md` — transferencia principal. Mantener actualizado.
- `index.html` — HTML base, meta/OG, JSON-LD (WebSite + EventVenue para SEO), favicon. Riesgo: `og:url`
  es placeholder hasta conectar dominio.
- `vercel.json` — rewrites SPA (`/api` excluido). No romper.
- `vite.config.js` — plugin react + alias `@`→`src`. (Ya no usa el plugin de Base44.)
- `package.json` — deps. Ya NO tiene `@base44/*`. Tiene `nodemailer` (para `api/solicitud.js`).

### `src/data/` — CONTENIDO
- `site-data.json` — **TODO el contenido** (generado). Riesgo alto: es la fuente que consume el shim.
- `resenas.json` — reseñas + números de confianza. Editar para activar el carrusel.

### `src/api/`
- `base44Client.js` — **SHIM** de datos (imita el SDK de Base44). **No reintroducir Base44.** Depende de
  `site-data.json`. Riesgo alto: todos los componentes usan `base44.entities.*`.

### `src/`
- `main.jsx` — monta `<App/>`.
- `App.jsx` — router (sin auth). Riesgo: no reintroducir wrappers de auth de Base44.
- `Layout.jsx` — estilos globales + tokens `.skeu-*`. Riesgo: aquí vive el dorado y el fondo.
- `pages.config.js` — registro de páginas (Home/Admin) + Layout.
- `pages/Home.jsx` — **orquesta todas las secciones** y el estado de modales/scroll-spy. Riesgo alto.
- `pages/Admin.jsx` — login (admin/hipico2024, sessionStorage) + dashboard. Edición no persiste.
- `lib/utils.js` (`cn`), `lib/query-client.js`, `lib/PageNotFound.jsx`.
- `hooks/useLockBodyScroll.js` — bloquea scroll con `overflow:hidden` (NO usar position:fixed; causaba
  salto con `scroll-behavior:smooth`). `hooks/useBackButtonClose.js`, `hooks/use-mobile.jsx`.

### `src/components/` (públicos)
- `HeroSection.jsx` — hero + videos de fondo (`/media/img/NBa3E9g.mp4`, `uykWsK9.mp4`). Textos de venta en el JSX.
- `Confianza.jsx` — números + rating Google + carrusel de reseñas (lee `resenas.json`).
- `SalonesSection.jsx` / `SalonOverlay.jsx` / `SalonGallery.jsx` — espacios y su detalle/galería.
- `ScrollAnimationSection.jsx` — 241 frames (`/media/frames/frame-NNN.jpg`). `ScrollAnimationCaptions.jsx`, `ScrollHint.jsx`.
- `ServiciosAmenidades.jsx` — dos `ItemsSection` + `<BarraDulces/>` entre ellas.
- `ServiceAmenityCard.jsx` — tarjeta: miniatura + expandible (imagen/video + descripción debajo). Expandible si hay media O descripción.
- `BarraDulces.jsx` — destacado en colaboración (Dulce Corazón). Flyer `/media/img/dulce-corazon.png`.
- `ComoFunciona.jsx` — 3 pasos (sin botón; el CTA está en `CtaCotizacion` abajo).
- `CtaCotizacion.jsx` — franja "Listo para cotizar".
- `GaleriaSection.jsx` — grid masonry (3 layouts responsivos) → `MediaViewer`. Renderiza `galeria` en orden.
- `MediaViewer.jsx` — lightbox imagen/video. Exporta `isVideo(url)`.
- `ContactoSection.jsx` — teléfono/correo/ubicación/WhatsApp/Facebook.
- `NoIncluyeSection.jsx` — muestra `config.informacionServicios`.
- `FaqSection.jsx` — acordeón (array `FAQS` en el archivo). Diseño con badge "P" + flecha.
- `FormularioModal.jsx` — **formulario corto** (2 pasos) → correo. Riesgo alto (flujo de conversión).
- `ProximamenteModal.jsx`, `ProximamenteCartel.jsx`, `HeroTrustBar.jsx` (huérfano, no usado), `SplashScreen.jsx`, `Sidebar.jsx`, `soundSystem.jsx`, `ItemImageOverlay.jsx`.
- `components/ui/*` — primitivas shadcn/ui. No tocar salvo rediseño.
- `components/admin/*` — panel admin (edición en memoria).

### `api/`
- `solicitud.js` — función serverless: envía el formulario por Gmail. Vars: `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `MAIL_TO`.

### `scripts/`
- `build-media.mjs` — genera `site-data.json` + descarga medios. Correr tras editar `scripts/raw/*`.
- `raw/*.json` — **fuente de verdad** del contenido (config, salones, galeria, servicios, amenidades, serviciosExtra, alimentos).
- `reorder-galeria.mjs` — documentó el reorden de la galería (histórico).
- `gen-images.mjs` — generador Nano Banana vía API (requiere `GEMINI_API_KEY` con billing).
- `montage.mjs` — arma hojas de contacto (requiere `npm i sharp`; utilitario de análisis).

### `nano-banana/`
- Prompts + imágenes de referencia para generar imágenes con Nano Banana. `README.md` + 5 subcarpetas.

### `public/media/`
- `img/` — imágenes y videos (incluye las 5 generadas: sanitarios/seguridad/montaje/horarios/trampolin.jpg + `dulce-corazon.png`).
- `frames/` — 241 frames de la animación. `b44/` — anuncio "Próximamente".
