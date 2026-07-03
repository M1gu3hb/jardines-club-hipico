# ARCHITECTURE.md

## Vista general

```
Navegador
  └─ SPA React (Vite)  ── main.jsx → App.jsx (react-router)
        ├─ "/"      → Layout → Home.jsx  (sitio público)
        └─ "/Admin" → Layout → Admin.jsx (panel, edición en memoria)

Datos:  componentes → base44Client.js (SHIM) → src/data/site-data.json (+ resenas.json)
Correo: FormularioModal → shim functions.invoke → POST /api/solicitud (Vercel) → Gmail
Medios: public/media/** (servidos como estáticos por Vercel)
Deploy: push a GitHub main → Vercel build (vite) → producción
```

## Capas

### 1. Presentación (React + Tailwind + Framer Motion)
- Entrada `src/main.jsx` monta `<App/>`.
- `src/App.jsx`: `QueryClientProvider` + `BrowserRouter` + `Routes`. **Sin auth** (se eliminó el
  wrapper de Base44). Ruta `*` → `PageNotFound`.
- `src/Layout.jsx`: estilos globales (CSS-in-JS `<style>`), fuente Inter, tokens skeuomorphism
  (`.skeu-card`, `.skeu-gold-btn`, etc.), fondo `#0a0a0a`.
- Páginas en `src/pages/` se auto-registran vía `src/pages.config.js`.

### 2. Datos (SHIM estático)
- `src/api/base44Client.js` exporta `base44` con la misma forma que el SDK original:
  - `base44.entities.<Entidad>.list(sort) / filter(query, sort) / get(id) / create(data) / update(id, patch) / delete(id)`
  - `base44.functions.invoke(name, payload)` — solo `gmailSolicitud`/`notificarNuevaSolicitud` → `POST /api/solicitud`.
  - `base44.integrations.Core.UploadFile({file})` — devuelve un blob URL (solo sesión, para el admin).
  - `base44.auth.*` — stubs (el sitio público no usa auth).
- Store en memoria sembrado desde `src/data/site-data.json`. Lecturas = datos; escrituras = mutan
  el store en memoria (no persisten al recargar).
- **Orden/sort:** `sortBy` trata `null/undefined` como 0 y es estable. `Galeria` se pide con
  `.list()` (sin sort) en `Home.jsx` para que el orden del arreglo sea el mostrado.

### 3. Serverless (Vercel)
- `api/solicitud.js`: función Node. `POST` con los datos del formulario → arma el correo (mismo
  formato que la función original de Base44) → Nodemailer con `service: "gmail"` + App Password.
  Variables: `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `MAIL_TO` (default `mighuer427@gmail.com`).
- `GET` → 405. Sin credenciales → 500 (pero el front igual muestra confirmación al usuario).

### 4. Build / medios
- `scripts/build-media.mjs`: lee `scripts/raw/*.json`, descarga los medios (imgur/base44) a
  `public/media/`, reescribe URLs a rutas locales (limpia artefactos tipo `" ×"`), y genera
  `src/data/site-data.json`. Idempotente (salta medios ya descargados).
- Vite copia `public/` a `dist/`. Alias `@` → `src` en `vite.config.js`.

## Deploy
- Git conectado a Vercel: push a `main` → build automático (`vite build`, output `dist/`).
- `vercel.json`: `rewrites` → todo (excepto `/api/*`) a `/index.html` (SPA fallback).
- Para deploy manual desde local: `vercel deploy --prod --scope mh-astral-systems`.

## Diagrama de flujo del formulario
```
FormularioModal.handleSubmit
  → base44.entities.SolicitudEvento.create(data)   (shim: genera id/folio)
  → base44.functions.invoke("gmailSolicitud",{data})
       → fetch POST /api/solicitud
            → nodemailer.sendMail (Gmail)  → MAIL_TO
  → pantalla de confirmación (folio + WhatsApp)
```
