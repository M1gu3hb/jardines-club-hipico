import { useEffect, useRef } from "react";

/**
 * useDialogoAccesible — los cinco comportamientos que un diálogo modal debe tener, en un sitio.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * POR QUÉ EXISTE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * La auditoría del 2026-09-02 contó **catorce modales en el ecosistema y ninguno completo**. El
 * peor era el formulario de cotización de la web —el que su propio archivo llama «el camino que da
 * de comer»—: sin Escape, sin trampa de foco, sin devolución de foco, sin `role` y sin
 * `aria-modal`. Solo se cerraba con el ratón. Quien navega con teclado, o con lector de pantalla,
 * quedaba encerrado detrás de un formulario que no podía ni cerrar ni rellenar.
 *
 * Arreglarlos de uno en uno habría dejado catorce implementaciones ligeramente distintas, que es
 * como se llegó aquí. Esto es uno.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * LOS CINCO COMPORTAMIENTOS
 * ══════════════════════════════════════════════════════════════════════════════
 *
 *   1. **Escape cierra.** Es la salida que la gente busca por instinto.
 *   2. **El foco entra** al abrirse, al primer elemento enfocable del diálogo.
 *   3. **El foco no se escapa**: `Tab` en el último vuelve al primero, y `Shift+Tab` en el primero
 *      va al último. Sin esto el tabulador se va a la página de detrás, que sigue ahí.
 *   4. **El foco vuelve** a donde estaba al cerrarse.
 *
 * **El bloqueo del fondo NO está aquí, y es deliberado.** Lo pone `useLockBodyScroll`, que es su
 * único dueño en todo el repositorio.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * B-01 · POR QUÉ ESTE GANCHO YA NO TOCA `overflow`
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Lo tocaba, y **congelaba la portada para siempre**. `FormularioModal` usa los dos ganchos:
 * `useLockBodyScroll` corre primero y pone `overflow: hidden`; este corría después y capturaba el
 * valor **ya modificado** —`"hidden"`—. React ejecuta las limpiezas en orden de declaración: la
 * primera restauraba `""` y la segunda **volvía a poner `"hidden"`**. El `<html>` quedaba
 * bloqueado y nada lo limpiaba jamás.
 *
 * La víctima: todo visitante que abriera «Cotizar mi evento» desde la portada y lo cerrara —con la
 * X, con el fondo o con Escape— **y también el que lo enviara con éxito**. El CTA de más tráfico
 * del negocio, dejando la página muerta. Determinista, cada ciclo.
 *
 * **Lo introdujo el arreglo de accesibilidad de la sesión anterior**, y ninguna de las cinco
 * puertas lo vio: un contrato estático no puede ver dos ganchos peleándose por un global.
 *
 * La regla que sale de aquí, y que un contrato vigila: **un global, un dueño**. Nadie más que
 * `useLockBodyScroll` escribe `documentElement.style.overflow`.
 *
 * Lo que este gancho NO pone, porque es del JSX y no se puede poner desde fuera: `role="dialog"`
 * (o `alertdialog`), `aria-modal="true"` y un `aria-labelledby` que apunte al título. Van en el
 * elemento que recibe la `ref`, y hay un contrato que lo comprueba.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * LA COPIA QUE SE DECLARA
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * `JCH-CRM/src/components/ui/Confirmar.jsx` trae esta misma lógica escrita a mano desde antes.
 * **No se ha migrado hoy a propósito**: lo usan muchas pantallas, funciona, y cambiarlo para
 * ahorrar veinte líneas es riesgo sin premio. Queda anotado para `16K`, que es la fase de los
 * otros once modales — y se dice aquí en vez de dejar dos verdades sin avisar.
 *
 * @param {{ current: HTMLElement|null }} refCaja  el elemento del diálogo
 * @param {{ abierto?: boolean, onCerrar?: () => void, enfocarAlAbrir?: boolean }} opciones
 */
export default function useDialogoAccesible(refCaja, { abierto = true, onCerrar, enfocarAlAbrir = true } = {}) {
  const focoPrevio = useRef(null);

  useEffect(() => {
    if (!abierto || !refCaja?.current) return undefined;

    /** Los enfocables del diálogo, en orden de DOM y en el momento de mirarlos. */
    const enfocables = () =>
      refCaja.current?.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [];

    focoPrevio.current = document.activeElement;
    if (enfocarAlAbrir) enfocables()[0]?.focus();

    const alPulsar = (e) => {
      if (e.key === "Escape" && typeof onCerrar === "function") {
        e.preventDefault();
        onCerrar();
        return;
      }
      if (e.key !== "Tab") return;

      // Se releen en cada pulsación: un diálogo por pasos cambia sus botones al avanzar, y una
      // lista capturada al abrir dejaría el ciclo apuntando a elementos que ya no existen.
      const focos = enfocables();
      if (focos.length === 0) return;
      const primero = focos[0];
      const ultimo = focos[focos.length - 1];

      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener("keydown", alPulsar);

    return () => {
      document.removeEventListener("keydown", alPulsar);
      // Devolver el foco a donde estaba. `focus` puede fallar si el elemento ya no existe —justo
      // lo que pasa cuando se acaba de borrar la fila desde la que se abrió—, y no pasa nada: el
      // navegador lo lleva al body.
      try { focoPrevio.current?.focus?.(); } catch { /* el origen ya no está */ }
    };
  }, [abierto, onCerrar, enfocarAlAbrir, refCaja]);
}
