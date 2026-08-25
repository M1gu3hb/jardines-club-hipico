import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { sePuedeAnimar } from '@/lib/animacion';

/**
 * ParejaQueBaila — cuatro pasos de baile, encadenados.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * QUÉ ES Y POR QUÉ ESTÁ DIBUJADO A MANO
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * El dueño lo pidió así: *«una animación, un SVG o algo que hagas, de una pareja bailando,
 * con el estilo similar a lo de qué estás planeando, minimalista, pero que se entienda que es
 * una pareja bailando; que hagan varios pasos y vayan cambiando»*.
 *
 * No hay fotografía de las clases porque **las clases todavía no existen**. Una foto de banco
 * de imágenes está prohibida en este proyecto, y una foto de otra academia sería mentir sobre
 * algo que aún no ha abierto. Un dibujo dice «va a haber clases de baile» sin afirmar nada
 * falso sobre cómo serán.
 *
 * Comparte el lenguaje de `ArteDeEvento`: trazo fino, dorado de la marca, sin rellenos. Las
 * dos familias tienen que parecer del mismo sitio.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * CÓMO SE MUEVE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Cuatro posturas completas que se turnan con un fundido, no una interpolación de líneas. Si
 * intentara transformar un paso en el siguiente moviendo cada punto, los cuerpos pasarían por
 * posiciones imposibles a mitad de camino — brazos atravesando torsos, piernas del revés— y
 * el resultado se lee como un error, no como un baile.
 *
 * Fundiendo entre posturas terminadas, el ojo completa el movimiento solo. Es el mismo
 * principio que la animación cuadro a cuadro de toda la vida.
 *
 * Los cuatro pasos son una secuencia real y en este orden se leen como una figura continua:
 * posición cerrada → paso lateral → giro de ella → inclinación final.
 *
 * ── Cuándo NO se mueve ──────────────────────────────────────────────────────
 *
 * Con `prefers-reduced-motion`, y en una pestaña que el navegador ha congelado por estar en
 * segundo plano. En los dos casos se queda en la primera postura, que por sí sola ya se lee
 * como una pareja bailando. La regla del sitio: si algo falla, falla hacia «se ve».
 */

const TRAZO = /** @type {any} */ ({
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
});

/** El suelo. Va en todas las posturas para que las figuras no floten. */
function Suelo() {
  return <path d="M14 93 L106 93" {...TRAZO} opacity="0.22" />;
}

/** 1 · Posición cerrada. Los dos de frente, manos tomadas. */
function PasoUno() {
  return (
    <>
      <Suelo />
      {/* Él */}
      <circle cx="45" cy="27" r="5.2" {...TRAZO} />
      <path d="M45 32 L45 60" {...TRAZO} />
      <path d="M45 60 L39 93" {...TRAZO} />
      <path d="M45 60 L51 93" {...TRAZO} />
      <path d="M45 39 L61 43" {...TRAZO} />
      <path d="M45 39 L33 49" {...TRAZO} />
      {/* Ella */}
      <circle cx="76" cy="27" r="5.2" {...TRAZO} />
      <path d="M76 32 L76 56" {...TRAZO} />
      <path d="M67 56 L85 56 L88 76 L64 76 Z" {...TRAZO} />
      <path d="M72 76 L70 93" {...TRAZO} />
      <path d="M80 76 L82 93" {...TRAZO} />
      <path d="M76 39 L61 43" {...TRAZO} />
      <path d="M76 39 L88 49" {...TRAZO} />
    </>
  );
}

/** 2 · Paso lateral. Los dos abren la pierna hacia fuera y se inclinan. */
function PasoDos() {
  return (
    <>
      <Suelo />
      <circle cx="42" cy="28" r="5.2" {...TRAZO} />
      <path d="M42 33 L46 60" {...TRAZO} />
      <path d="M46 60 L32 91" {...TRAZO} />
      <path d="M46 60 L54 90" {...TRAZO} />
      <path d="M43 40 L62 45" {...TRAZO} />
      <path d="M43 40 L29 34" {...TRAZO} />
      <circle cx="79" cy="28" r="5.2" {...TRAZO} />
      <path d="M79 33 L75 56" {...TRAZO} />
      <path d="M65 56 L84 56 L92 76 L62 76 Z" {...TRAZO} />
      <path d="M73 76 L66 91" {...TRAZO} />
      <path d="M82 76 L90 91" {...TRAZO} />
      <path d="M78 40 L62 45" {...TRAZO} />
      <path d="M78 40 L93 34" {...TRAZO} />
    </>
  );
}

/** 3 · El giro. Él levanta el brazo, ella pasa por debajo. */
function PasoTres() {
  return (
    <>
      <Suelo />
      <circle cx="40" cy="28" r="5.2" {...TRAZO} />
      <path d="M40 33 L42 60" {...TRAZO} />
      <path d="M42 60 L36 93" {...TRAZO} />
      <path d="M42 60 L49 92" {...TRAZO} />
      {/* El brazo en alto, que es el eje del giro */}
      <path d="M41 39 L55 22 L68 26" {...TRAZO} />
      <path d="M41 39 L30 47" {...TRAZO} />
      {/* Ella, girando: torso torcido y falda abierta por la fuerza del giro */}
      <circle cx="78" cy="31" r="5.2" {...TRAZO} />
      <path d="M78 36 L74 57" {...TRAZO} />
      <path d="M62 57 L86 57 L94 75 L58 75 Z" {...TRAZO} />
      <path d="M72 75 L69 93" {...TRAZO} />
      <path d="M81 75 L86 88" {...TRAZO} />
      <path d="M77 41 L68 26" {...TRAZO} />
      <path d="M77 41 L90 46" {...TRAZO} />
    </>
  );
}

/** 4 · La inclinación. Ella se deja caer hacia atrás sostenida por él. */
function PasoCuatro() {
  return (
    <>
      <Suelo />
      <circle cx="47" cy="26" r="5.2" {...TRAZO} />
      <path d="M47 31 L47 60" {...TRAZO} />
      <path d="M47 60 L40 93" {...TRAZO} />
      <path d="M47 60 L56 91" {...TRAZO} />
      <path d="M47 38 L66 48" {...TRAZO} />
      <path d="M47 38 L35 44" {...TRAZO} />
      {/* Ella, en diagonal: cabeza abajo a la derecha, pierna levantada */}
      <circle cx="97" cy="56" r="5.2" {...TRAZO} />
      <path d="M92 54 L70 46" {...TRAZO} />
      <path d="M64 40 L74 36 L84 52 L70 58 Z" {...TRAZO} />
      <path d="M70 50 L74 82" {...TRAZO} />
      <path d="M70 50 L58 74" {...TRAZO} />
      <path d="M74 82 L74 93" {...TRAZO} opacity="0.6" />
      <path d="M88 52 L66 48" {...TRAZO} />
    </>
  );
}

const PASOS = [PasoUno, PasoDos, PasoTres, PasoCuatro];
const MILISEGUNDOS_POR_PASO = 1500;

/**
 * @param {Object} props
 * @param {string} [props.className]
 */
export default function ParejaQueBaila({ className = '' }) {
  const menosMovimiento = useReducedMotion();
  const [puedeAnimar] = useState(sePuedeAnimar);
  const [paso, setPaso] = useState(0);

  const quieta = menosMovimiento || !puedeAnimar;

  useEffect(() => {
    if (quieta) return undefined;
    const reloj = setInterval(
      () => setPaso((p) => (p + 1) % PASOS.length),
      MILISEGUNDOS_POR_PASO,
    );
    return () => clearInterval(reloj);
  }, [quieta]);

  return (
    <svg
      viewBox="0 0 120 100"
      aria-hidden="true"
      className={`text-[#C9A84C] ${className}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {PASOS.map((Paso, i) => (
        <motion.g
          key={i}
          initial={false}
          animate={{ opacity: quieta ? (i === 0 ? 1 : 0) : paso === i ? 1 : 0 }}
          // El fundido dura una fracción del paso: lo justo para que no haya parpadeo, no
          // tanto como para que se vean las dos posturas encimadas a la vez.
          transition={{ duration: 0.35, ease: 'easeInOut' }}
        >
          <Paso />
        </motion.g>
      ))}
    </svg>
  );
}
