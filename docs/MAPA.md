# MAPA de la web — Jardines Club Hípico

Documento maestro para orientar modificaciones futuras. Explica **cómo está armada la
página**, **cómo fluyen los datos** y **dónde tocar** para cada tipo de cambio.

---

## 1. Arquitectura en 30 segundos

- **SPA React** servida por Vite. Punto de entrada: [`src/main.jsx`](../src/main.jsx) → [`src/App.jsx`](../src/App.jsx).
- **Router** (`react-router-dom`): `/` (Home), la ruta secreta del panel, `/portal`,
  `/acceso/:token`, `/staff/:token` y `/invitacion/:token`. **`/Admin` es 404 a propósito.**
- **Estilos globales** en [`src/styles/theme.css`](../src/styles/theme.css), importado desde
  `src/main.jsx`: fuente Inter, scrollbar dorada y los **tokens skeuomorphism** (`.skeu-card`,
  `.skeu-gold-btn`, etc.). Está ahí, y no en el Layout, para que apliquen también al portal, al
  admin y a `/acceso`, que no pasan por el Layout.
- **`Layout.jsx`** son 10 líneas: solo envuelve las páginas públicas en el fondo `#0a0a0a`.
- **Datos en Supabase**: el contenido vive en el schema `jardines`. Los componentes lo consumen
  por el **shim** [`src/api/base44Client.js`](../src/api/base44Client.js), que conserva la API del
  viejo SDK de Base44 (`base44.entities.X.list()/filter()`, etc.) pero habla con Supabase.
  **No hay fallback:** si Supabase no responde, el sitio se renderiza vacío.
- **Backend:** 7 funciones serverless en [`api/`](../api) (Vercel).

```
main.jsx → App.jsx (AuthProvider + Router)
                 ├── "/"              → Layout → Home.jsx   ← contenido público
                 ├── "/<ADMIN_SLUG>"  → RequireAdmin → Admin.jsx
                 ├── "/portal"        → PortalPage          ← portal del cliente
                 └── "/acceso|/staff|/invitacion/:token"     ← vistas por QR

Home.jsx  ──lee──►  base44Client.js (shim)  ──►  Supabase (schema `jardines`, RLS)
FormularioModal ──RPC solicitud_crear──► base ──► POST /api/solicitud ──► Gmail
```

> Este documento cubre el **sitio público**. Para el panel, el portal, las mesas y el módulo
> operativo, ver [`ARCHITECTURE.md`](ARCHITECTURE.md) y [`FILE_MAP.md`](FILE_MAP.md).

---

## 2. La página principal (`Home.jsx`) — orden de secciones

[`src/pages/Home.jsx`](../src/pages/Home.jsx) monta el sidebar + las secciones en este orden.
Cada sección es un componente en [`src/components/`](../src/components):

| # | Sección (id) | Componente | Qué muestra |
|---|---|---|---|
| — | (splash) | `SplashScreen.jsx` | Pantalla de carga con el logo (aparece una vez) |
| — | (menú) | `StaggeredMenu.jsx` | Menú de secciones (overlay fijo, dep. `gsap`). Los items vienen de `MENU_ITEMS` en `Home.jsx` |
| — | (sonido) | `SoundToggle.jsx` | Control de sonido (antes vivía dentro del Sidebar) |
| 1 | `#inicio` | `HeroSection.jsx` | Video de fondo, título de venta (todo en un lugar), botón "Cotiza tu Evento", cartel "Próximamente" |
| 1b | — | `Confianza.jsx` | Números (+30 años, +500 eventos, 8 espacios) + rating de Google + carrusel de reseñas (datos en `src/data/resenas.json`) |
| 2 | `#salones` | `SalonesSection.jsx` | Tarjetas de los 8 espacios → abre `SalonOverlay` |
| 3 | — | `ScrollAnimationSection.jsx` | Animación de 241 frames dirigida por scroll |
| 4 | `#servicios` + `#amenidades` | `ServiciosAmenidades.jsx` | 2 listas con "ver más" (usa `ServiceAmenityCard`) |
| 5 | — | `CtaCotizacion.jsx` | Franja CTA con imagen de fondo |
| 6 | `#galeria` | `GaleriaSection.jsx` | Grid masonry de fotos/videos → `MediaViewer` |
| 4b | `#como-funciona` | `ComoFunciona.jsx` | 3 pasos (elige → cotiza → WhatsApp). Va entre Amenidades y el CTA "Listo para cotizar" |
| 6c | `#faq` | `FaqSection.jsx` | Acordeón de preguntas frecuentes (después de Galería). Contenido en el array `FAQS` del propio archivo |
| 7 | `#contacto` | `ContactoSection.jsx` | Teléfono, correo, ubicación, WhatsApp, Facebook |
| 8 | `#no-incluye` | `NoIncluyeSection.jsx` | Texto "Información de servicios" |
| — | (footer) | inline en `Home.jsx` | Copyright |
| — | (modales) | `FormularioModal.jsx`, `ProximamenteModal.jsx` | Formulario de cotización y anuncio |

> El **orden** de las secciones se cambia reordenando los componentes dentro del `<main>`
> de [`src/pages/Home.jsx`](../src/pages/Home.jsx). Los items del menú se definen en la
> constante `MENU_ITEMS` del mismo archivo, y los pinta `StaggeredMenu`.
>
> `src/components/Sidebar.jsx` **ya no se usa** (0 imports): quedó huérfano al sustituirlo por
> `StaggeredMenu`. Editarlo no cambia nada.

---

## 3. Flujo de datos (importante para editar contenido)

Todo el contenido editable vive en **Supabase** (schema `jardines`). El shim traduce nombre de
entidad → tabla:

| Entidad (front) | Tabla | Lo consume |
|---|---|---|
| `ConfigSitio` | `config_sitio` | Home (logo, WhatsApp, teléfono, correo, ubicación, cartel "Próximamente") |
| `Salon` | `salones` | `SalonesSection`, `FormularioModal` (lista de espacios) |
| `Galeria` | `galeria` | `GaleriaSection` |
| `ServicioItem` | `servicios` | `ServiciosAmenidades` (bloque "Servicios") |
| `AmenidadItem` | `amenidades` | `ServiciosAmenidades` (bloque "Amenidades") + `FormularioModal` |
| `ServicioExtra` | `servicios_extra` | `FormularioModal` (histórico del formulario largo) |
| `AlimentoMenu` | `alimentos` | `FormularioModal` (menús + PDF) |
| `Resena` / `ResenasConfig` | `resenas` / `resenas_config` | `Confianza` (solo las `aprobada = true`) |

El shim [`base44Client.js`](../src/api/base44Client.js) responde a `.list()`, `.filter()`,
`.get()`, `.create()`, `.update()`, `.delete()` contra la base, traduciendo camelCase ↔
snake_case. **Quién puede escribir lo decide RLS**, no el front: si una escritura "no hace
nada", sospecha primero de una policy (el shim registra el error en consola con `[shim]`).

Para **editar contenido**, se usa el panel admin — ver [`DATOS.md`](DATOS.md).

---

## 4. "Dónde tocar" — guía rápida por tipo de cambio

| Quiero cambiar... | Archivo(s) a tocar |
|---|---|
| Teléfono / WhatsApp / correo / ubicación | **Panel admin → Configuración** (tabla `config_sitio`) |
| Logo | Panel admin → Configuración (`logo_url`), o reemplazar `public/media/img/aMxWuH8.png` |
| Textos/fotos de un salón | **Panel admin → Salones** (tabla `salones`) |
| Fotos de la galería | **Panel admin → Galería** (tabla `galeria`) |
| Servicios / amenidades | **Panel admin → Servicios / Amenidades** |
| Opciones del formulario (servicios extra, alimentos) | **Panel admin** (tablas `servicios_extra` / `alimentos`) |
| Cartel "Próximamente" (imagen/título/texto) | Panel admin → Configuración (`proximamente_*`; `proximamente_activo = false` lo oculta) |
| Textos del hero (título, subtítulos) | `src/components/HeroSection.jsx` (están escritos en el JSX) |
| Reseñas del carrusel / números de confianza / rating | **Panel admin → Reseñas** (tablas `resenas` / `resenas_config`) |
| Preguntas del FAQ | `src/components/FaqSection.jsx` (array `FAQS`) |
| Pasos de "Cómo funciona" | `src/components/ComoFunciona.jsx` (array `PASOS`) |
| Videos de fondo del hero | Reemplazar `public/media/img/NBa3E9g.mp4` y `uykWsK9.mp4`, o editar el array `VIDEOS` en `HeroSection.jsx` |
| Textos de sección (eyebrows, títulos "Servicios", "Amenidades", "Galería") | El componente de esa sección (ver tabla §2) |
| Colores / estilos globales | **`src/styles/theme.css`** (tokens `.skeu-*`, Inter, scrollbar) y `tailwind.config.js`. El dorado de marca es `#C9A84C`. **No** `Layout.jsx` |
| Orden de las secciones | `src/pages/Home.jsx` (`<main>`) y la constante `MENU_ITEMS` del mismo archivo |
| Items del menú | Constante `MENU_ITEMS` en `src/pages/Home.jsx` (**no** `Sidebar.jsx`, que está huérfano) |
| Apariencia/animación del menú | `src/components/StaggeredMenu.jsx` + `StaggeredMenu.css` |
| A qué correo llega el formulario | Variable `MAIL_TO` en Vercel |
| Quién es admin | Alta desde el panel (`/api/crear-admin`). El rol vive en `jardines.perfiles`; **no** hay contraseña en el código |
| La ruta del panel | `ADMIN_SLUG` en `src/config/portal.js`, o la env `VITE_ADMIN_SLUG` |
| La animación de scroll (frames) | `public/media/frames/` + `src/components/ScrollAnimationSection.jsx` |
| Los textos flotantes de la animación | `src/components/ScrollAnimationCaptions.jsx` |

---

## 5. Sistema de diseño (tokens)

Definidos en [`src/styles/theme.css`](../src/styles/theme.css), que importa `src/main.jsx`:

- **Color de marca (dorado):** `#C9A84C` (y variantes `#E2C266`, `#E6C870`). Aparece hardcodeado
  en muchos componentes como `#C9A84C`.
- **Fondo:** `#0a0a0a` / `#080808` / `#050505` (negros).
- **Clases skeuomorphism:** `.skeu-card`, `.skeu-card-hover`, `.skeu-gold-btn`, `.skeu-dark-btn`,
  `.skeu-inset` — dan el relieve dorado premium.
- **Animaciones CTA:** `.ver-detalles-cta`, `.ver-detalles-sheen` (brillo pulsante de los botones "Ver detalles").
- **Fuente:** Inter (importada en `theme.css`).

> Como `theme.css` entra por `main.jsx` y no por el Layout, estos tokens aplican a **todo** el
> producto: sitio público, portal del cliente, admin secreto y las vistas por QR.

---

## 6. El formulario de cotización

[`src/components/FormularioModal.jsx`](../src/components/FormularioModal.jsx) — modal **corto, de
2 pasos** (D5, para bajar la fricción):

0. Elegir espacio (o "aún no lo decido") → 1. Nombre, teléfono/WhatsApp, tipo de evento, fecha y
   nº de personas (+ correo y comentarios opcionales + aviso de privacidad).

Al enviar:
1. `base44.entities.SolicitudEvento.create()` → el shim llama a la RPC
   `jardines.solicitud_crear`, que **valida en el servidor**, aplica rate limit por IP y asigna
   el **folio real**. El front nunca inventa folios.
2. `POST /api/solicitud` con **solo** el `solicitudId`; la función relee la fila con
   `service_role` y arma el correo con los datos canónicos de la base.
3. Pantalla de confirmación con el folio del servidor y botón de WhatsApp. Si el servidor no
   devolvió folio, **no** se muestra éxito: `ERRORES_VALIDACION` / `mensajeDeError()` explican qué pasó.

> El correo destino se controla con la variable `MAIL_TO` en Vercel. Si el envío falla, el lead
> **igual quedó guardado** en `jardines.solicitudes`.

---

## 7. La animación de scroll

[`src/components/ScrollAnimationSection.jsx`](../src/components/ScrollAnimationSection.jsx) dibuja
en un `<canvas>` una secuencia de **241 frames** (`public/media/frames/frame-001.jpg` … `frame-241.jpg`)
según el progreso de scroll. Precarga por lotes y usa `position: sticky`.
Los textos que flotan encima los pone [`ScrollAnimationCaptions.jsx`](../src/components/ScrollAnimationCaptions.jsx).

---

## 8. Panel de administración

[`src/pages/Admin.jsx`](../src/pages/Admin.jsx) + [`src/components/admin/`](../src/components/admin).

**No vive en `/Admin`** (esa ruta devuelve 404 a propósito): vive en la ruta secreta `ADMIN_SLUG`
([`src/config/portal.js`](../src/config/portal.js), sobreescribible con `VITE_ADMIN_SLUG`) y
detrás de [`RequireAdmin`](../src/components/auth/RequireAdmin.jsx).

El acceso es con cuenta de Supabase Auth y rol `admin` en `jardines.perfiles`. **La autorización
real la aplica RLS en la base**, no el navegador; la ruta secreta es solo una capa extra. Ya no
hay usuario ni contraseña escritos en el código.

Secciones: Configuración, Salones, Galería, Servicios, Amenidades, Alimentos, Reseñas,
Solicitudes, Administradores y el módulo de **Eventos** (datos, ficha, documentos, items
contratados, RSVPs, mesas e invitaciones).

**Los cambios persisten en Supabase**: no hace falta editar JSON ni redesplegar. Ver
[`DATOS.md`](DATOS.md).
