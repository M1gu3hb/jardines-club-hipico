/**
 * ¿Puede animarse ahora mismo?
 *
 * Los navegadores **congelan los fotogramas en una pestaña que no se ve**. Y una animación que
 * empieza en `opacity: 0` y sube a 1 necesita fotogramas para subir: sin ellos se queda en cero
 * PARA SIEMPRE, aunque el elemento esté perfectamente en su sitio.
 *
 * Eso no es un caso de laboratorio. Abrir un enlace en una pestaña de fondo —con la rueda del
 * ratón, o «abrir en pestaña nueva»— es de lo más común que hace la gente, y ahí el sitio se
 * pintaba entero en blanco hasta que la pestaña se enfocaba.
 *
 * La regla, que vale para todo el sitio: **una animación no puede ser la única razón por la que
 * un texto es visible.** Si no se puede animar, se enseña quieto. Se pierde el efecto, que es
 * decoración; no se pierde el contenido, que es el negocio.
 *
 * Se mide una sola vez al montar. Si la pestaña se enfoca después, el texto ya está visible y
 * volver a esconderlo para animarlo sería peor que no animar.
 */
export function sePuedeAnimar() {
  if (typeof document === 'undefined') return true; // En el prerender no hay pestaña que ocultar.
  return document.visibilityState === 'visible';
}
