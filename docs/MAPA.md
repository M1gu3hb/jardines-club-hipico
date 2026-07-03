# MAPA de la web — Jardines Club Hípico

Documento maestro para orientar modificaciones futuras. Explica **cómo está armada la
página**, **cómo fluyen los datos** y **dónde tocar** para cada tipo de cambio.

---

## 1. Arquitectura en 30 segundos

- **SPA React** servida por Vite. Punto de entrada: [`src/main.jsx`](../src/main.jsx) → [`src/App.jsx`](../src/App.jsx).
- **Router** (`react-router-dom`) con 2 páginas: `Home` (`/`) y `Admin` (`/Admin`).
  Registradas en [`src/pages.config.js`](../src/pages.config.js).
- **Layout global** ([`src/Layout.jsx`](../src/Layout.jsx)) envuelve todo: fija fuentes,
  fondo `#0a0a0a`, scrollbar dorada y los **tokens skeuomorphism** (`.skeu-card`,
  `.skeu-gold-btn`, etc.) usados en toda la UI.
- **Datos estáticos**: todo el contenido vive en [`src/data/site-data.json`](../src/data/site-data.json).
  Los componentes lo consumen a través del **shim** [`src/api/base44Client.js`](../src/api/base44Client.js),
  que imita la API del viejo SDK de Base44 (`base44.entities.X.list()/filter()`, etc.).
- **Sin backend salvo el correo**: la única pieza de servidor es [`api/solicitud.js`](../api/solicitud.js)
  (función serverless de Vercel) que manda el formulario por Gmail.

```
main.jsx → App.jsx (Router)
                 ├── "/"      → Layout → Home.jsx  ← contenido público
                 └── "/Admin" → Layout → Admin.jsx ← panel de edición

Home.jsx  ──lee──►  base44Client.js (shim)  ──sirve──►  src/data/site-data.json
FormularioModal ──envía──► /api/solicitud (Vercel) ──► Gmail
```

---

## 2. La página principal (`Home.jsx`) — orden de secciones

[`src/pages/Home.jsx`](../src/pages/Home.jsx) monta el sidebar + las secciones en este orden.
Cada sección es un componente en [`src/components/`](../src/components):

| # | Sección (id) | Componente | Qué muestra |
|---|---|---|---|
| — | (splash) | `SplashScreen.jsx` | Pantalla de carga con el logo (aparece una vez) |
| — | (lateral) | `Sidebar.jsx` | Menú lateral + logo + toggle de sonido |
| 1 | `#inicio` | `HeroSection.jsx` | Video de fondo, título, botón "Cotiza tu Evento", cartel "Próximamente" |
| 2 | `#salones` | `SalonesSection.jsx` | Tarjetas de los 8 espacios → abre `SalonOverlay` |
| 3 | — | `ScrollAnimationSection.jsx` | Animación de 241 frames dirigida por scroll |
| 4 | `#servicios` + `#amenidades` | `ServiciosAmenidades.jsx` | 2 listas con "ver más" (usa `ServiceAmenityCard`) |
| 5 | — | `CtaCotizacion.jsx` | Franja CTA con imagen de fondo |
| 6 | `#galeria` | `GaleriaSection.jsx` | Grid masonry de fotos/videos → `MediaViewer` |
| 7 | `#contacto` | `ContactoSection.jsx` | Teléfono, correo, ubicación, WhatsApp |
| 8 | `#no-incluye` | `NoIncluyeSection.jsx` | Texto "Información de servicios" |
| — | (footer) | inline en `Home.jsx` | Copyright |
| — | (modales) | `FormularioModal.jsx`, `ProximamenteModal.jsx` | Formulario de cotización y anuncio |

> El **orden** de las secciones se cambia reordenando los componentes dentro del `<main>`
> de [`src/pages/Home.jsx`](../src/pages/Home.jsx). El menú lateral se define en
> `Sidebar.jsx` (constante de secciones).

---

## 3. Flujo de datos (importante para editar contenido)

Todo el contenido editable proviene de [`src/data/site-data.json`](../src/data/site-data.json),
con estas claves:

| Clave en site-data.json | Entidad original | Lo consume |
|---|---|---|
| `config` | ConfigSitio | Home (logo, WhatsApp, teléfono, correo, ubicación, cartel "Próximamente") |
| `salones` | Salon | `SalonesSection`, `FormularioModal` (lista de espacios) |
| `galeria` | Galeria | `GaleriaSection` |
| `servicios` | ServicioItem | `ServiciosAmenidades` (bloque "Servicios") |
| `amenidades` | AmenidadItem | `ServiciosAmenidades` (bloque "Amenidades") + `FormularioModal` |
| `serviciosExtra` | ServicioExtra | `FormularioModal` (checkboxes de servicios extra) |
| `alimentos` | AlimentoMenu | `FormularioModal` (menús + PDF) |

El shim [`base44Client.js`](../src/api/base44Client.js) carga ese JSON en un store en memoria
y responde a las llamadas `.list()`, `.filter()`, `.create()`, `.update()`, `.delete()`.
Las **lecturas** salen del JSON; las **escrituras** (panel admin) mutan la memoria y **no
persisten** al recargar.

Para **editar contenido de forma permanente**, ver [`DATOS.md`](DATOS.md).

---

## 4. "Dónde tocar" — guía rápida por tipo de cambio

| Quiero cambiar... | Archivo(s) a tocar |
|---|---|
| Teléfono / WhatsApp / correo / ubicación | `src/data/site-data.json` → `config` (`telefonoContacto`, `whatsappNumero`, `correoAdmin`, `ubicacionTexto`, `ubicacionLinkMapa`) |
| Logo | Reemplazar `public/media/img/aMxWuH8.png` o cambiar `config.logoUrl` |
| Textos/fotos de un salón | `src/data/site-data.json` → `salones[]` |
| Fotos de la galería | `src/data/site-data.json` → `galeria[]` |
| Servicios / amenidades | `src/data/site-data.json` → `servicios[]` / `amenidades[]` |
| Opciones del formulario (servicios extra, alimentos) | `src/data/site-data.json` → `serviciosExtra[]` / `alimentos[]` |
| Cartel "Próximamente" (imagen/título/texto) | `config.proximamente*` (o `proximamenteActivo:false` para ocultarlo) |
| Textos del hero (título, subtítulos) | `src/components/HeroSection.jsx` (están escritos en el JSX) |
| Videos de fondo del hero | Reemplazar `public/media/img/NBa3E9g.mp4` y `uykWsK9.mp4`, o editar el array `VIDEOS` en `HeroSection.jsx` |
| Textos de sección (eyebrows, títulos "Servicios", "Amenidades", "Galería") | El componente de esa sección (ver tabla §2) |
| Colores / estilos globales | `src/Layout.jsx` (tokens `.skeu-*`) y `src/index.css` / `tailwind.config.js`. El dorado de marca es `#C9A84C` |
| Orden de las secciones | `src/pages/Home.jsx` (`<main>`) y `src/components/Sidebar.jsx` (menú) |
| Menú lateral (items) | `src/components/Sidebar.jsx` |
| A qué correo llega el formulario | Variable `MAIL_TO` en Vercel (o el default en `api/solicitud.js`) |
| Contraseña del admin | `src/pages/Admin.jsx` (`ADMIN_USER` / `ADMIN_PASS`) |
| La animación de scroll (frames) | `public/media/frames/` + `src/components/ScrollAnimationSection.jsx` |
| Los textos flotantes de la animación | `src/components/ScrollAnimationCaptions.jsx` |

---

## 5. Sistema de diseño (tokens)

Definidos como CSS global en [`src/Layout.jsx`](../src/Layout.jsx):

- **Color de marca (dorado):** `#C9A84C` (y variantes `#E2C266`, `#E6C870`). Aparece hardcodeado
  en muchos componentes como `#C9A84C`.
- **Fondo:** `#0a0a0a` / `#080808` / `#050505` (negros).
- **Clases skeuomorphism:** `.skeu-card`, `.skeu-card-hover`, `.skeu-gold-btn`, `.skeu-dark-btn`,
  `.skeu-inset` — dan el relieve dorado premium.
- **Animaciones CTA:** `.ver-detalles-cta`, `.ver-detalles-sheen` (brillo pulsante de los botones "Ver detalles").
- **Fuente:** Inter (Google Fonts, importada en `Layout.jsx`).

---

## 6. El formulario de cotización

[`src/components/FormularioModal.jsx`](../src/components/FormularioModal.jsx) — modal multi-paso (6 pasos):

1. Selección de espacio → 2. Datos del cliente → 3. Datos del evento →
4. Montaje y alimentos → 5. Servicios y amenidades → 6. Comentarios + aviso de privacidad.

Al enviar:
1. `base44.entities.SolicitudEvento.create()` (el shim genera un folio `JCH-XXXXXX`).
2. `base44.functions.invoke("gmailSolicitud", {data})` → el shim hace `POST /api/solicitud`.
3. [`api/solicitud.js`](../api/solicitud.js) manda el correo por Gmail (nodemailer + App Password).
4. Muestra pantalla de confirmación con el folio y botón de WhatsApp.

> El correo destino se controla con la variable `MAIL_TO` en Vercel (default `mighuer427@gmail.com`).

---

## 7. La animación de scroll

[`src/components/ScrollAnimationSection.jsx`](../src/components/ScrollAnimationSection.jsx) dibuja
en un `<canvas>` una secuencia de **241 frames** (`public/media/frames/frame-001.jpg` … `frame-241.jpg`)
según el progreso de scroll. Precarga por lotes y usa `position: sticky`.
Los textos que flotan encima los pone [`ScrollAnimationCaptions.jsx`](../src/components/ScrollAnimationCaptions.jsx).

---

## 8. Panel de administración (`/Admin`)

[`src/pages/Admin.jsx`](../src/pages/Admin.jsx) + [`src/components/admin/`](../src/components/admin).
Login con `admin` / `hipico2024` (sessionStorage). Pestañas: Config, Salones, Servicios,
Amenidades, Galería, Alimentos, Servicios extra, Solicitudes.

En esta versión **estática** el admin lee del snapshot y edita **en memoria** (no persiste).
Es útil para previsualizar cambios; para hacerlos permanentes, editar los datos en el código
(ver [`DATOS.md`](DATOS.md)).
