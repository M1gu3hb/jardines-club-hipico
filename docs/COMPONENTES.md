# Referencia de componentes

Todos en [`src/components/`](../src/components) salvo que se indique otra ruta.
Los props se muestran tal como los pasa [`Home.jsx`](../src/pages/Home.jsx).

## Estructura / layout

| Componente | Rol | Props / notas |
|---|---|---|
| `Layout.jsx` (`src/`) | Contenedor de las páginas públicas: **solo** el fondo `#0a0a0a` (10 líneas) | `children`. Los estilos globales (Inter, tokens `.skeu-*`, scrollbar) están en `src/styles/theme.css`, importado en `main.jsx` |
| `StaggeredMenu.jsx` | **Menú real de secciones** (overlay fijo, dep. `gsap`) + `StaggeredMenu.css` | Recibe `items`; **los items viven en `MENU_ITEMS` de `src/pages/Home.jsx`** |
| `SoundToggle.jsx` | Control de sonido del sitio (antes vivía en el Sidebar) | — |
| `Sidebar.jsx` | **Huérfano: 0 imports.** Lo sustituyó `StaggeredMenu`; editarlo no cambia nada | — |
| `SplashScreen.jsx` | Pantalla de carga con logo (una sola vez, al entrar) | `logoUrl`, `onFinish` |

## Secciones de la Home

| Componente | Sección | Props clave | Datos que usa |
|---|---|---|---|
| `HeroSection.jsx` | `#inicio` | `onFormClick`, `logoUrl`, `proximamente*`, `onProximamenteClick` | `config` + **videos de fondo** en la constante `VIDEOS` (rutas locales). Único sub-componente importado: `ProximamenteCartel` |
| `Confianza.jsx` | tras el hero | — | Números, rating de Google y carrusel. **El único componente que lee un JSON local** (`src/data/resenas.json`) |
| `ProximamenteCartel.jsx` | dentro del hero | `imagenUrl`, `titulo`, `descripcion`, `textoEtiqueta`, `onClick` | `config.proximamente*` |
| `SalonesSection.jsx` | `#salones` | `salones`, `onSelectSalon` | `salones[]`. Tarjeta por espacio → abre `SalonOverlay`. Tiene `defaultSalones` de respaldo (fotos Unsplash, no se usan porque siempre hay datos) |
| `SalonOverlay.jsx` | overlay | `salon`, `onClose`, `onCotizar` | Detalle del salón: descripción larga, características, galería (`SalonGallery`) |
| `SalonGallery.jsx` | dentro del overlay | `galeria`, `heroIdx`, `onThumbClick` | Grid de imágenes/videos del salón + lightbox |
| `ScrollAnimationSection.jsx` | (sin id) | — | 241 frames en `<canvas>` (`public/media/frames/`). Ver [MAPA §7](MAPA.md#7-la-animación-de-scroll) |
| `ScrollAnimationCaptions.jsx` | sobre la animación | `sectionRef` | Textos flotantes que aparecen según el scroll (editables en el JSX) |
| `ScrollHint.jsx` | sobre la animación | `visible` | Indicador "desliza" |
| `ServiciosAmenidades.jsx` | `#servicios`, `#amenidades` | — | Dos bloques `ItemsSection` con "ver más". Usa `servicios[]` y `amenidades[]`. **Monta `BarraDulces` entre ambos** |
| `ServiceAmenityCard.jsx` | tarjeta | `item`, `delay` | Tarjeta con imagen/video. La descripción se ve **al expandir**, no en la miniatura (D9) |
| `MediaCarrusel.jsx` | dentro de la tarjeta | media de un ítem | Carrusel de imágenes/videos del servicio o amenidad |
| `BarraDulces.jsx` | entre servicios y amenidades | — | Destacado de la colaboración con Dulce Corazón (acento rosa, flyer local) |
| `ComoFunciona.jsx` | (sin id) | — | Los 3 pasos del proceso (array `PASOS` en el JSX) |
| `CtaCotizacion.jsx` | (sin id) | `onOpenForm` | Franja CTA con imagen de fondo (Unsplash — decorativa) |
| `FaqSection.jsx` | tras la galería | — | Acordeón de preguntas (array `FAQS` en el JSX) |
| `AnimatedItem.jsx` | envoltura | `children` | Animación de entrada reutilizable |
| `GaleriaSection.jsx` | `#galeria` | `galeria` | Grid masonry responsivo → `MediaViewer`. Respaldo `placeholders` (Unsplash) |
| `MediaViewer.jsx` | lightbox | `items`, `startIdx`, `onClose`, `autoPlayVideos` | Visor full-screen de imágenes/videos. Exporta `isVideo(url)` |
| `ContactoSection.jsx` | `#contacto` | `telefono`, `correo`, `ubicacionTexto`, `ubicacionLinkMapa`, `whatsappNumero` | `config`. Tarjetas de teléfono/correo/ubicación + botón WhatsApp |
| `NoIncluyeSection.jsx` | `#no-incluye` | `texto` | Recibe `config.informacionServicios`, que **sí tiene contenido** (3 párrafos en producción) y se pinta: el componente parte el texto por saltos de línea. `config.textoNoIncluye` es un campo histórico que no se usa |

## Modales

| Componente | Rol | Props |
|---|---|---|
| `FormularioModal.jsx` | Formulario de cotización, **2 pasos** (0 = elegir espacio, 1 = datos) → RPC `solicitud_crear` + correo | `open`, `onClose`, `preselectedSalon`, `whatsappNumero`. **Solo consume `Salon`**; no usa `serviciosExtra`, `amenidades` ni `alimentos` |
| `ProximamenteModal.jsx` | Modal del anuncio "Próximamente" | `open`, `onClose`, `imagenUrl`, `titulo`, `descripcion` |

## Huérfanos (0 imports, no montados)

`Sidebar.jsx` (lo sustituyó `StaggeredMenu`), `HeroTrustBar.jsx` (ya no lo importa el hero),
`FormularioSection.jsx` (variante embebida del formulario) e `ItemImageOverlay.jsx` (lo sustituyó
`MediaCarrusel`). Editar cualquiera de los cuatro no cambia nada en el sitio.

## Utilitarios

| Archivo | Rol |
|---|---|
| `soundSystem.jsx` | Sistema de sonidos UI (Web Audio). `playSound()`, `isSoundEnabled()`, toggle |
| `hooks/useLockBodyScroll.js` | Bloquea el scroll del fondo cuando hay un modal abierto |
| `hooks/useBackButtonClose.js` | Cierra modales con el botón "atrás" del móvil |
| `hooks/use-mobile.jsx` | Detecta viewport móvil |
| `lib/utils.js` | `cn()` (merge de clases Tailwind) |
| `utils/index.ts` | `createPageUrl()` |
| `components/ui/*` | Primitivas shadcn/ui (Radix). No se tocan salvo rediseño |

## Panel admin (`src/components/admin/`)

CMS: `AdminConfig`, `AdminSalones`, `AdminGaleria`, `AdminServicioItems`, `AdminAmenidadItems`,
`AdminServicios` (servicios extra), `AdminAlimentos`, `AdminResenas`.
Operación: `AdminLogin`, `AdminInicio`, `AdminDashboard`, `AdminSolicitudes`,
`AdminAdministradores`, y `admin/eventos/*` (`AdminEventos`, `EventoDatos`, `EventoFicha`,
`EventoDocumentos`, `EventoItems`, `EventoRsvps`).

Todos leen y escriben vía el shim, y **persisten en Supabase**. Quién puede escribir lo decide
RLS, no la UI.

## Portal, mesas, meseros e invitación

`src/components/portal/*` (login, inicio, ármalo, contratado, documentos, invitación,
sugerencias, reseña, instalación PWA), `src/components/mesas/*` (editor y reglas),
`src/components/meseros/*` (acceso por QR, vista de staff, generación del enlace),
`src/components/invitacion/InvitacionPublica.jsx` y `src/components/evento/*` (cronograma,
música). Detalle y riesgos por archivo en [`FILE_MAP.md`](FILE_MAP.md).
