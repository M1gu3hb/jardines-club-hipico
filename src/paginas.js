/**
 * paginas.js — clave de ruta → el módulo que la pinta.
 *
 * ── Por qué es un mapa de FUNCIONES y no de componentes ─────────────────────
 *
 * Porque lo leen dos mundos que necesitan cosas opuestas:
 *
 *   · **El navegador** quiere `React.lazy`, para que entrar por la portada no descargue las
 *     catorce páginas del sitio.
 *   · **El prerender** quiere lo contrario: todas cargadas ANTES de renderizar. `renderToString`
 *     no sabe esperar a un `lazy` — se encuentra la promesa a medias y pinta el `fallback`.
 *     Prerenderizar catorce páginas de «Cargando» sería peor que no prerenderizar.
 *
 * Un mapa de funciones sirve a los dos: el navegador se lo pasa a `lazy`, el prerender las
 * ejecuta y espera. Y como es UNA lista, no pueden divergir. Con dos listas, añadir una página
 * y olvidarse de la del prerender da una página que en desarrollo funciona y en producción
 * sale vacía para Google, sin ningún error en ningún sitio.
 *
 * `Home` no está aquí a propósito: se importa directa en los dos entornos. Es la entrada de
 * casi todas las visitas y diferirla añade una ida y vuelta de red justo antes de pintar lo
 * primero que se ve.
 */
export const CARGADORES = {
  espacios: () => import('@/pages/Espacios'),
  espacio: () => import('@/pages/EspacioDetalle'),
  eventos: () => import('@/pages/Eventos'),
  evento: () => import('@/pages/EventoDetalle'),
  servicios: () => import('@/pages/Servicios'),
  amenidades: () => import('@/pages/Amenidades'),
  galeria: () => import('@/pages/Galeria'),
  avisos: () => import('@/pages/Avisos'),
  'clases-de-baile': () => import('@/pages/ClasesDeBaile'),
  'como-funciona': () => import('@/pages/ComoFunciona'),
  'preguntas-frecuentes': () => import('@/pages/PreguntasFrecuentes'),
  contacto: () => import('@/pages/Contacto'),
  cotizar: () => import('@/pages/Cotizar'),
  // `nosotros` esta APARCADA por decision del dueno (2026-08-25): sin ruta y sin carga
  // perezosa. El archivo sigue en `src/pages/Nosotros.jsx` con las instrucciones para
  // revivirla. `ubicacion` se fundio con `contacto` y su archivo se borro.
};
