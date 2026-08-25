import { motion, useReducedMotion } from 'framer-motion';

/**
 * PistaQueSeDibuja — el trazo del club ecuestre, dibujándose.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * POR QUÉ ESTE DIBUJO Y NO OTRO
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * El dueño pidió *«algo que construyas tú: un dibujo, una animación»*. Un adorno abstracto
 * habría cumplido el encargo y no habría dicho nada.
 *
 * Esto dice algo. **El campo grande de Jardines Club Hípico tiene forma ovalada porque era la
 * pista de equitación**, y el Salón Encanto ocupa el sitio donde estaba el picadero: un corral
 * redondo con un tubo al centro. Las dos formas siguen en el terreno.
 *
 * Así que el dibujo es el plano: la pista ovalada, el picadero redondo dentro, y el punto del
 * centro que era el tubo. Se dibuja solo al llegar a él, como si alguien lo estuviera trazando.
 * No es decoración: es la planta del lugar del que habla el párrafo de al lado.
 *
 * ── Cómo se dibuja ─────────────────────────────────────────────────────────
 *
 * `pathLength` de un SVG animado de 0 a 1 recorre el trazo de principio a fin. Es lo mismo que
 * hace `stroke-dasharray` a mano, sin tener que medir cada camino: el navegador lo normaliza.
 * Y anima solo una propiedad de trazo, así que no obliga a recalcular el diseño de la página.
 *
 * ── Y desaparece para quien pidió menos movimiento ─────────────────────────
 *
 * Con `prefers-reduced-motion` sale dibujado y quieto. `aria-hidden` porque es una ilustración:
 * lo que cuenta la historia es el texto de al lado, y describirla dos veces en un lector de
 * pantalla no aporta nada.
 */
export default function PistaQueSeDibuja({ className = '' }) {
  const menosMovimiento = useReducedMotion();

  const trazo = {
    initial: menosMovimiento ? { pathLength: 1, opacity: 0.55 } : { pathLength: 0, opacity: 0 },
    whileInView: { pathLength: 1, opacity: 0.55 },
  };

  return (
    <svg
      viewBox="0 0 400 220"
      className={className}
      aria-hidden="true"
      focusable="false"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* LA PISTA. El óvalo grande: el campo de equitación de los avanzados, hoy el Campo
          Grande que entra con la renta del Salón de los Espejos. */}
      <motion.ellipse
        cx="200"
        cy="110"
        rx="185"
        ry="95"
        stroke="#C9A84C"
        strokeWidth="1.2"
        {...trazo}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 2.2, ease: 'easeInOut' }}
      />

      {/* La cuerda interior de la pista. Dos líneas hacen que se lea como un carril y no como
          una elipse suelta. */}
      <motion.ellipse
        cx="200"
        cy="110"
        rx="168"
        ry="80"
        stroke="#C9A84C"
        strokeWidth="0.6"
        strokeDasharray="3 5"
        initial={menosMovimiento ? { pathLength: 1, opacity: 0.3 } : { pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 0.3 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 2.2, delay: 0.3, ease: 'easeInOut' }}
      />

      {/* EL PICADERO. El corral redondo donde se trabajaba al caballo en círculos, y donde hoy
          está el Salón Encanto. */}
      <motion.circle
        cx="200"
        cy="110"
        r="46"
        stroke="#C9A84C"
        strokeWidth="1"
        initial={menosMovimiento ? { pathLength: 1, opacity: 0.45 } : { pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 0.45 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 1.6, delay: 0.9, ease: 'easeInOut' }}
      />

      {/* La cuerda, del centro al borde: es lo que ataba al caballo al tubo. */}
      <motion.line
        x1="200"
        y1="110"
        x2="246"
        y2="110"
        stroke="#C9A84C"
        strokeWidth="0.7"
        initial={menosMovimiento ? { pathLength: 1, opacity: 0.35 } : { pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 0.35 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.7, delay: 2.2, ease: 'easeOut' }}
      />

      {/* EL TUBO DEL CENTRO. Lo último que aparece, y lo único relleno: es el punto donde
          empezaba todo. */}
      <motion.circle
        cx="200"
        cy="110"
        r="3"
        fill="#C9A84C"
        initial={menosMovimiento ? { opacity: 0.7, scale: 1 } : { opacity: 0, scale: 0 }}
        whileInView={{ opacity: 0.7, scale: 1 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.5, delay: 2.6, ease: 'backOut' }}
      />
    </svg>
  );
}
