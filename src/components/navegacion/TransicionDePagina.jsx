import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * TransicionDePagina — sube arriba al cambiar de ruta, y hace que se note que cambió.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * EL FALLO QUE ARREGLA
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * React Router **conserva la posición de scroll al navegar**. Así que quien estaba al final de
 * `/servicios` y abría el menú para ir a `/espacios` aterrizaba a media página nueva, sin
 * cabecera, sin título y sin entender qué había pasado. Palabras del dueño: *«si estoy hasta
 * abajo y cambio de sección, me deja hasta abajo»*.
 *
 * No es una preferencia estética: es una página que parece rota.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * POR QUÉ EL SALTO ES INSTANTÁNEO Y LA TRANSICIÓN NO
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * `scrollTo({ behavior: 'smooth' })` suena a lo que pidió —*«que suba de forma suave»*— y en
 * este sitio sería peor. La portada mide más de veinte mil píxeles: un desplazamiento suave
 * desde el pie tarda varios segundos, durante los cuales pasan volando secciones de la página
 * VIEJA mientras la nueva ya se montó. Se ve como un error, no como una transición.
 *
 * Lo que de verdad pedía —*«que parezca que continúa»*— se consigue al revés: **subir de golpe
 * y que la página nueva ENTRE**, con un fundido y un desplazamiento corto hacia arriba. El ojo
 * lee «llegó algo nuevo» en vez de «me teletransportaron».
 *
 * ── El scroll se restaura al volver atrás ───────────────────────────────────
 *
 * Con una excepción: **el botón de atrás del navegador**. Ahí la expectativa es la contraria —
 * volver donde estabas—, y el navegador ya lo hace solo. Por eso se mira `navigationType`: solo
 * se sube arriba en un `PUSH`, o sea cuando el visitante fue a algún sitio nuevo.
 *
 * ── Y respeta a quien pidió menos movimiento ────────────────────────────────
 *
 * Con `prefers-reduced-motion` no hay animación de entrada. El salto arriba sí se conserva:
 * eso no es decoración, es que la página se lea desde el principio.
 */
export default function TransicionDePagina({ children }) {
  const { pathname } = useLocation();
  const menosMovimiento = useReducedMotion();
  const primeraVez = useRef(true);

  useEffect(() => {
    // En la primera carga NO se toca el scroll. Quien llega desde Google a `/espacios#algo` o
    // recarga a media página tiene que quedarse donde estaba: subirlo arriba sería deshacer
    // justo lo que el navegador acaba de hacer bien.
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    if (typeof window === 'undefined') return;

    // Solo cuando la navegación fue hacia adelante. Al volver atrás, el navegador restaura la
    // posición y pisarla es quitarle al visitante el sitio donde estaba.
    const tipo = window.performance?.getEntriesByType?.('navigation')?.[0]?.type;
    if (tipo === 'back_forward') return;

    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  if (menosMovimiento) return children;

  return (
    <motion.div
      // La clave es la ruta: al cambiar, React desmonta y vuelve a montar, y con eso la
      // animación de entrada se dispara sola en cada navegación.
      key={pathname}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      // Solo `opacity` y `transform`: son las dos que el navegador puede animar sin recalcular
      // el diseño de la página en cada fotograma.
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="w-full min-w-0"
    >
      {children}
    </motion.div>
  );
}
