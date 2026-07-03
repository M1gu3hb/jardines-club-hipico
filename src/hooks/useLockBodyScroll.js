import { useEffect } from "react";

/**
 * Bloquea el scroll mientras `active` sea true.
 *
 * Usa `overflow: hidden` (en html + body) en vez de `position: fixed`.
 * Ventaja: conserva la posición del scroll SIN reescribirla al cerrar, así
 * que no dispara la animación de `scroll-behavior: smooth` (que antes hacía
 * que la página "se regresara escroleando" al cerrar el modal).
 * Compensa el ancho de la scrollbar para que el contenido no dé un salto lateral.
 */
export default function useLockBodyScroll(active) {
  useEffect(() => {
    if (!active) return;

    const html = document.documentElement;
    const body = document.body;
    const scrollbarW = window.innerWidth - html.clientWidth;

    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      htmlPadRight: html.style.paddingRight,
    };

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    if (scrollbarW > 0) html.style.paddingRight = `${scrollbarW}px`;

    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      html.style.paddingRight = prev.htmlPadRight;
    };
  }, [active]);
}
