# DECISIONS.md

Registro de decisiones técnicas y de producto (formato: decisión · razón · consecuencia · archivos).

## 2026-07-03

### D1 — Migración estática (sin backend) en vez de recrear la base de datos
- **Razón:** el cliente quería salir de Base44 rápido, con el sitio idéntico, simple y barato. No
  necesitaba edición en vivo constante.
- **Consecuencia:** contenido congelado en JSON; el panel admin no persiste; cambios de contenido se
  hacen en código (`scripts/raw/*.json`).
- **Archivos:** `src/data/site-data.json`, `scripts/build-media.mjs`, `scripts/raw/*`.

### D2 — SHIM que imita el SDK de Base44
- **Razón:** evitar reescribir todos los componentes (Home, formulario, admin) que llamaban
  `base44.entities.*`.
- **Consecuencia:** los componentes quedaron intactos; el archivo se llama `base44Client.js` pero es
  100% local. Cirugía mínima.
- **Archivos:** `src/api/base44Client.js`.

### D3 — Auto-hospedar TODOS los medios
- **Razón:** independencia total de Base44/imgur; que nada se rompa si esos servicios fallan.
- **Consecuencia:** repo pesado (~560 MB); descarga por `build-media.mjs`; se limpió un artefacto `" ×"`
  que traían algunas URLs.
- **Archivos:** `public/media/*`, `scripts/build-media.mjs`.

### D4 — Correo del formulario con Gmail App Password (Nodemailer), no OAuth
- **Razón:** replicar el envío por Gmail que hacía Base44 sin montar un flujo OAuth complejo.
- **Consecuencia:** función serverless simple; requiere `GMAIL_USER`/`GMAIL_APP_PASSWORD` en Vercel;
  la cuenta necesita verificación en 2 pasos + App Password. Remitente actual: `mighuer427@gmail.com`.
- **Archivos:** `api/solicitud.js`.

### D5 — Formulario corto (2 pasos) en vez de 6
- **Razón:** reducir fricción y aumentar conversión; el resto de datos se afinan por WhatsApp.
- **Consecuencia:** solo se piden nombre, teléfono, tipo, fecha, personas (+ opcionales). Se quitaron
  dirección, factura, montaje, alimentos, servicios extra del flujo.
- **Archivos:** `src/components/FormularioModal.jsx`.

### D6 — Reorden de la galería por análisis visual + `Galeria.list()` sin sort
- **Razón:** el orden original no gustaba; además el `-orden` con valores nulos invertía la lista.
- **Consecuencia:** el orden del arreglo = orden mostrado; outliers (mapa, collage, letrero) al final.
- **Archivos:** `scripts/raw/galeria.json`, `scripts/reorder-galeria.mjs`, `src/pages/Home.jsx`.

### D7 — Imágenes faltantes con Nano Banana (no Pollinations)
- **Razón:** Pollinations (gratis) daba resultados poco realistas; Nano Banana image-to-image con
  fotos reales del lugar dio imágenes realistas y en el estilo del venue.
- **Consecuencia:** Nano Banana requiere tier de pago en la API o generarlas manual con Google AI Pro
  (Pro NO aplica a la API). Se dejó la carpeta `nano-banana/` con prompts + referencias.
- **Archivos:** `public/media/img/{sanitarios,seguridad,montaje,horarios,trampolin}.jpg`, `nano-banana/*`.

### D8 — `useLockBodyScroll` con `overflow:hidden` (no `position:fixed`)
- **Razón:** con `position:fixed` + `scrollTo` y `scroll-behavior:smooth`, cerrar el formulario
  "animaba" el scroll (bug reportado).
- **Consecuencia:** al cerrar el modal se conserva la posición exacta, sin salto.
- **Archivos:** `src/hooks/useLockBodyScroll.js`.

### D9 — Descripciones al EXPANDIR (no en la miniatura)
- **Razón:** el cliente no quería ver la descripción en la tarjeta comprimida.
- **Consecuencia:** cada servicio/amenidad tiene descripción; se muestra al expandir, debajo de la
  imagen. Las tarjetas sin imagen también se expanden (canExpand = media o descripción).
- **Archivos:** `src/components/ServiceAmenityCard.jsx`, `scripts/raw/servicios.json`, `amenidades.json`.
