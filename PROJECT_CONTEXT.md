# PROJECT_CONTEXT.md

> Documento principal de transferencia. Léelo completo para entender el proyecto antes de tocar código.

## 1. Objetivo del proyecto

Sitio web de **Jardines Club Hípico**, un salón de eventos grande en Xochimilco, CDMX (bodas, XV
años, corporativos, infantiles, eventos nocturnos). El objetivo del sitio es **generar cotizaciones**
(leads): que el visitante conozca los espacios/servicios y envíe una solicitud, que se atiende por
WhatsApp. Se **migró de Base44** a un proyecto Vite/React independiente para dejar de depender de esa
plataforma, con todo el contenido y los medios auto-hospedados.

## 2. Estado actual

**Funciona (en producción):**
- Sitio público completo e idéntico/mejorado respecto al original de Base44.
- Formulario de cotización → envía correo por Gmail (probado, 200 OK).
- Deploy automático: push a `main` en GitHub → Vercel redespliega.
- Todas las secciones de conversión (hero de venta, confianza, cómo funciona, FAQ, etc.).
- 5 imágenes generadas con Nano Banana ya integradas; descripciones en los 29 servicios/amenidades.

**Incompleto / opcional:**
- **Carrusel de reseñas**: `src/data/resenas.json` → array `resenas` vacío. El bloque Confianza
  muestra números + rating de Google, pero el carrusel solo aparece cuando se llena ese array con
  reseñas reales (el usuario debe pegarlas).
- **Dominio propio**: aún no conectado. `index.html` tiene `og:url` con placeholder `jardinesclubhipico.com`.

**Roto:** nada conocido.

**Panel admin (`/Admin`):** existe y lee el contenido, pero las ediciones son **en memoria** (no
persisten) porque el sitio es estático. Es un remanente de Base44; sirve para previsualizar.

## 3. Stack técnico

- **Frontend:** React 18, Vite 6, Tailwind CSS 3, Framer Motion, shadcn/ui (Radix), Lucide icons, react-router-dom.
- **Datos:** estáticos en `src/data/site-data.json` (no hay base de datos en vivo).
- **Backend:** solo una función serverless en Vercel: `api/solicitud.js` (Nodemailer + Gmail App Password).
- **Hosting:** Vercel (equipo `mh-astral-systems`, proyecto `jardines-club-hipico`).
- **Repo:** GitHub `M1gu3hb/jardines-club-hipico` (privado).
- **Node:** v24. **Gestor:** npm.

## 4. Arquitectura general

- **SPA React** servida por Vite. Entrada: `src/main.jsx` → `src/App.jsx` (router, sin auth).
- **Router** con 2 páginas: `Home` (`/`) y `Admin` (`/Admin`) — ver `src/pages.config.js`.
- **Capa de datos = SHIM** (`src/api/base44Client.js`): imita la API del SDK de Base44
  (`base44.entities.X.list/filter/create/update/delete`, `functions.invoke`, `integrations.Core.UploadFile`,
  `auth`) pero sirviendo `src/data/site-data.json`. Lecturas = datos estáticos; escrituras (admin) =
  store en memoria (no persiste). Gracias a esto, ningún componente se reescribió al quitar Base44.
- **Medios** auto-hospedados en `public/media/` (img, frames de la animación, b44).
- **Correo:** `FormularioModal` → shim `functions.invoke("gmailSolicitud")` → `POST /api/solicitud` (Vercel).
- **SPA fallback:** `vercel.json` reescribe todo (excepto `/api`) a `/index.html`.

Detalle profundo: `docs/ARCHITECTURE.md`.

## 5. Módulos principales (secciones de la Home, en orden)

`src/pages/Home.jsx` monta, en orden:
1. `HeroSection` (`#inicio`) — video de fondo, mensaje de venta, CTA "Cotiza tu evento", cartel "Próximamente".
2. `Confianza` — números (+30 años, +500 eventos, 8 espacios) + rating Google + carrusel de reseñas (si hay).
3. `SalonesSection` (`#salones`) — 8 espacios → abre `SalonOverlay` (detalle + galería + cotizar).
4. `ScrollAnimationSection` — animación de 241 frames dirigida por scroll (`public/media/frames/`).
5. `ServiciosAmenidades` (`#servicios`, `#amenidades`) — dos listas; entre ellas, `BarraDulces`.
6. `BarraDulces` — servicio destacado en colaboración (Dulce Corazón, acento rosa).
7. `ComoFunciona` (`#como-funciona`) — 3 pasos.
8. `CtaCotizacion` — franja "Listo para cotizar".
9. `GaleriaSection` (`#galeria`) — grid masonry de 69 fotos/videos → `MediaViewer`.
10. `FaqSection` (`#faq`) — acordeón de 8 preguntas.
11. `ContactoSection` (`#contacto`) — teléfono, correo, ubicación, WhatsApp, Facebook.
12. `NoIncluyeSection` (`#no-incluye`) — avisos/información de servicios.
13. Footer + `FormularioModal` + `ProximamenteModal` + WhatsApp flotante.

Referencia componente por componente: `docs/COMPONENTES.md`. Dónde tocar para cada cambio: `docs/MAPA.md`.

## 6. Entidades y base de datos

No hay base de datos en vivo. El "modelo de datos" son las entidades que Base44 tenía, ahora
**congeladas** en `src/data/site-data.json`. Claves: `config` (1), `salones` (8), `galeria` (69),
`servicios` (14), `amenidades` (15), `serviciosExtra` (11), `alimentos` (3), `resenas` (en
`resenas.json`). Detalle de campos/relaciones: `docs/DATABASE.md`.

## 7. Mapeo de archivos importantes

Resumen (detalle en `docs/FILE_MAP.md`):
- `src/data/site-data.json` — TODO el contenido (generado desde `scripts/raw/*.json`).
- `src/data/resenas.json` — reseñas + números de confianza.
- `src/api/base44Client.js` — SHIM de datos (no romper la API).
- `src/pages/Home.jsx` — orquesta las secciones.
- `src/components/*` — UI. `api/solicitud.js` — correo. `scripts/build-media.mjs` — genera datos + descarga medios.
- `nano-banana/` — prompts + referencias para generar imágenes con Nano Banana.

## 8. Flujos críticos

**A) Cotización (lead) → correo:**
1. Usuario abre `FormularioModal` (CTA en varios lugares).
2. Paso 0: elige espacio (o "aún no lo decido"). Paso 1: nombre, teléfono/WhatsApp, tipo de evento,
   fecha, nº personas (+ correo/comentarios opcionales + aviso de privacidad).
3. Al enviar: `base44.entities.SolicitudEvento.create()` (shim, genera folio `JCH-XXXXXX`) +
   `base44.functions.invoke("gmailSolicitud", {data})` → `POST /api/solicitud`.
4. `api/solicitud.js` (Vercel) envía el correo con Nodemailer + Gmail App Password a `MAIL_TO`
   (default `mighuer427@gmail.com`).
5. Pantalla de confirmación con folio + botón de WhatsApp.

**B) Ver un espacio:** `SalonesSection` → click card → `SalonOverlay` (descripción larga,
características, galería `SalonGallery`) → "Cotizar este salón" (abre el form con salón preseleccionado).

**C) Galería:** `GaleriaSection` renderiza `galeria` en orden del arreglo (3 grids responsivos) → click
abre `MediaViewer` (lightbox). Nota: `Home.jsx` usa `Galeria.list()` (sin sort) para que el orden del
arreglo = orden mostrado.

**D) Regenerar contenido:** editar `scripts/raw/*.json` → `node scripts/build-media.mjs` → `npm run build`.

## 9. Decisiones tomadas

Ver `docs/DECISIONS.md` (formato fecha/decisión/razón/consecuencia/archivos). Las clave:
migración estática (no backend), shim de Base44, correo por Gmail App Password (no OAuth), reorden
de galería por análisis visual, imágenes con Nano Banana (no Pollinations por calidad).

## 10. Bugs pendientes

Ver `docs/BUGS_PENDING.md`. No hay bugs críticos abiertos.

## 11. Riesgos

- **Repo pesado (~560 MB)** por videos/imágenes auto-hospedados. Push/deploy iniciales lentos.
- **Admin no persiste** (estático): si alguien espera guardar desde `/Admin`, se confundirá.
- **Dependencias externas menores no-Base44**: fuentes de Google (Inter), placeholders de Unsplash en
  fallbacks que nunca se renderizan, PDFs de menús en Google Drive (`alimentos[].pdfUrl`).
- **`GMAIL_APP_PASSWORD`** es un secreto en Vercel; no exponerlo. Si el correo deja de llegar, revisar
  esa variable y los logs de la función.

## 12. Próximos pasos

Ver `docs/NEXT_STEPS.md`. Resumen: (Después) llenar `resenas.json` con reseñas reales; conectar dominio
y actualizar `og:url`. (Ideas) más testimonios, blog, analítica.

## 13. Prompts útiles

Ver `docs/PROMPTS.md` (incluye los prompts de Nano Banana y un prompt para continuar el proyecto).

## 14. Cosas que NO se deben romper

- El **shim** `base44Client.js` y su API (los componentes dependen de ella).
- El pipeline `scripts/raw/*.json` → `build-media.mjs` → `site-data.json`.
- Los medios en `public/media/` (rutas `/media/...`).
- La función `api/solicitud.js` y las variables `GMAIL_USER` / `GMAIL_APP_PASSWORD` / `MAIL_TO` en Vercel.
- El tema oscuro + dorado `#C9A84C`. Los videos del hero (ya comprimidos).
- `vercel.json` (fallback SPA).

## 15. Última actualización

**2026-07-03** — Documentación viva creada (`CLAUDE.md`, `PROJECT_CONTEXT.md`, `docs/*`). El proyecto
quedó completo: migración + mejoras de conversión + Dulce Corazón + descripciones + 5 imágenes Nano
Banana. Ver `docs/CHANGELOG.md` para el historial completo. Último commit relevante: imágenes generadas
integradas. Pendiente único: carrusel de reseñas (falta contenido del cliente).
