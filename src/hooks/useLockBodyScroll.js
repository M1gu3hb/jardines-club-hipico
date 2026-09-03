import { useEffect } from "react";

/**
 * useLockBodyScroll — el ÚNICO módulo del repositorio que escribe `style.overflow`.
 *
 * Bloquea el desplazamiento del fondo mientras `activo` sea cierto.
 *
 * Usa `overflow: hidden` (en `html` y `body`) en vez de `position: fixed`. La ventaja es que
 * conserva la posición del scroll **sin reescribirla** al cerrar, así que no dispara la animación
 * de `scroll-behavior: smooth` — que antes hacía que la página «se regresara escroleando» al
 * cerrar el modal. Y compensa el ancho de la barra para que el contenido no dé un salto lateral.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * B-01 · POR QUÉ ESTO LLEVA UN CONTADOR, Y POR QUÉ ES EL ÚNICO DUEÑO
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Porque guardar «cómo estaba» es seguro con UN dueño y una trampa con dos.
 *
 * El 2026-09-03 había tres módulos escribiendo este mismo estilo: este gancho,
 * `useDialogoAccesible` y `VisorDeFotos`. En `FormularioModal` coincidían dos: el primero ponía
 * `hidden`, el segundo capturaba el valor **ya modificado** —`"hidden"`— y al cerrar lo
 * restauraba. React ejecuta las limpiezas en orden de declaración, así que la primera devolvía
 * `""` y la segunda volvía a poner `"hidden"`.
 *
 * **El `<html>` se quedaba bloqueado para siempre.** Todo visitante que abriera «Cotizar mi
 * evento» desde la portada y lo cerrara —o que lo ENVIARA CON ÉXITO— se quedaba en una página
 * muerta. El CTA de más tráfico del negocio. Determinista, cada ciclo, y **ninguna de las cinco
 * puertas lo vio**: el fallo no vive en ningún archivo, vive en el encuentro de dos.
 *
 * La respuesta no es «que cada uno tenga cuidado». Es que haya **un dueño**, y que ese dueño
 * cuente: si dos cosas piden el bloqueo a la vez —un visor de fotos dentro de un diálogo, por
 * ejemplo—, el fondo se libera cuando se va la última, no cuando se va la primera. El valor
 * original se guarda **una sola vez**, al pasar de cero a uno.
 *
 * Un contrato comprueba que sigue siendo el único: `comun: un solo módulo escribe style.overflow`.
 */

/** Cuántos componentes piden ahora mismo el bloqueo. */
let pedidos = 0;
/** Cómo estaba el documento cuando lo pidió el primero. */
let original = null;

function bloquear() {
  pedidos += 1;
  if (pedidos > 1) return;

  const html = document.documentElement;
  const body = document.body;
  const anchoBarra = window.innerWidth - html.clientWidth;

  original = {
    htmlOverflow: html.style.overflow,
    bodyOverflow: body.style.overflow,
    htmlPadRight: html.style.paddingRight,
  };

  html.style.overflow = "hidden";
  body.style.overflow = "hidden";
  if (anchoBarra > 0) html.style.paddingRight = `${anchoBarra}px`;
}

function liberar() {
  pedidos = Math.max(0, pedidos - 1);
  if (pedidos > 0 || !original) return;

  const html = document.documentElement;
  const body = document.body;
  html.style.overflow = original.htmlOverflow;
  body.style.overflow = original.bodyOverflow;
  html.style.paddingRight = original.htmlPadRight;
  original = null;
}

/** @param {boolean} activo */
export default function useLockBodyScroll(activo) {
  useEffect(() => {
    if (!activo || typeof document === "undefined") return undefined;
    bloquear();
    return liberar;
  }, [activo]);
}
