import { useEffect } from "react";

/**
 * useBackButtonClose
 * --------------------
 * Cuando `active` es true, empuja un estado al history para que el botón
 * "atrás" del teléfono cierre el overlay/modal en lugar de salir del sitio.
 *
 * - Push state al abrir.
 * - Si el usuario pulsa "atrás" (popstate), llama onClose() sin sacarlo de la página.
 * - Si el usuario cierra el overlay desde la UI (botón X, click fuera, etc.),
 *   hacemos history.back() para limpiar el estado que metimos, sin recargar.
 *
 * Esto no altera la URL visible (usamos pushState con la misma URL) ni la
 * navegación del sitio. Solo se interpone una entrada extra en el history.
 */
export default function useBackButtonClose(active, onClose) {
  useEffect(() => {
    if (!active) return;

    // Empujamos un estado marcador. Mantenemos la URL actual.
    const marker = { __jchOverlay: true, ts: Date.now() };
    window.history.pushState(marker, "");

    let closedByPop = false;

    const onPop = () => {
      closedByPop = true;
      onClose?.();
    };

    window.addEventListener("popstate", onPop);

    return () => {
      window.removeEventListener("popstate", onPop);
      // Si la limpieza ocurre porque el componente se cerró desde la UI
      // (no por popstate), quitamos la entrada que metimos para que el
      // history quede limpio y el siguiente "atrás" funcione normal.
      if (!closedByPop) {
        // Solo retrocedemos si el estado actual sigue siendo el nuestro.
        const st = window.history.state;
        if (st && st.__jchOverlay) {
          window.history.back();
        }
      }
    };
  }, [active, onClose]);
}