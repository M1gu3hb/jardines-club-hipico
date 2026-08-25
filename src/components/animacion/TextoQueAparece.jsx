import { motion, useReducedMotion } from 'framer-motion';

/**
 * TextoQueAparece — el texto entra palabra por palabra al llegar a él.
 *
 * ── Qué pidió el dueño ──────────────────────────────────────────────────────
 *
 * *«Mete las animaciones de texto: estás scrolleando y que el texto vaya apareciendo de alguna
 * forma dinámica, bonita.»*
 *
 * ── Por qué palabra por palabra y no letra por letra ────────────────────────
 *
 * Porque un título de ocho palabras son ocho elementos, y letra por letra serían cuarenta y
 * cinco. Cada uno con su animación, su capa de composición y su cálculo — en un móvil de gama
 * media eso se nota, y lo que se gana es un efecto que además se lee peor: las letras sueltas
 * entrando una a una obligan a esperar para entender la frase.
 *
 * Palabra por palabra se lee mientras aparece, que es justo lo que se quiere.
 *
 * ── Y por qué el texto ya está en el HTML ───────────────────────────────────
 *
 * Las palabras se parten en `<span>` **con el texto dentro desde el primer render**: lo que
 * cambia es su opacidad y su posición, no su existencia. Así el prerender escribe la frase
 * entera, Google la lee, y quien busque con Ctrl+F la encuentra.
 *
 * Una versión que fuera escribiendo el texto con JavaScript tendría el mismo efecto y dejaría
 * los títulos del sitio fuera del documento. No compensa.
 *
 * ── Accesibilidad ──────────────────────────────────────────────────────────
 *
 * Con `prefers-reduced-motion` no hay animación: el texto sale entero y quieto. Y el original
 * viaja en `aria-label` porque un lector de pantalla, ante quince `<span>` sueltos, puede
 * leerlos como quince fragmentos en vez de como una frase.
 */
/**
 * @param {Object}  props
 * @param {string}  props.texto
 * @param {string}  [props.className]
 * @param {any}     [props.como]    La etiqueta que envuelve: `h1`, `h2`, `p`… Por defecto `span`.
 * @param {number}  [props.retraso] Segundos antes de empezar.
 */
export default function TextoQueAparece({ texto, className = '', como = 'span', retraso = 0 }) {
  // La etiqueta llega como dato y se usa como componente, así que hay que sacarla del tipado:
  // TypeScript no puede saber qué props admite una etiqueta que se decide en tiempo de
  // ejecución, y sin esto cada uso sale como error.
  const Como = /** @type {any} */ (como);
  const menosMovimiento = useReducedMotion();

  if (menosMovimiento) return <Como className={className}>{texto}</Como>;

  const palabras = String(texto).split(' ');

  return (
    <Como className={className} aria-label={texto}>
      {palabras.map((palabra, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom">
          <motion.span
            aria-hidden="true"
            className="inline-block"
            initial={{ y: '105%', opacity: 0 }}
            whileInView={{ y: '0%', opacity: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            // Solo `transform` y `opacity`: son las dos que el navegador anima sin recalcular
            // el diseño de la página en cada fotograma.
            transition={{
              duration: 0.7,
              // El desfase se topa a medio segundo. Sin tope, un párrafo de cuarenta palabras
              // tardaría cuatro segundos en terminar de aparecer y la última línea llegaría
              // cuando el visitante ya pasó de largo.
              delay: retraso + Math.min(i * 0.045, 0.5),
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {palabra}
          </motion.span>
          {/* El espacio va FUERA del `<span>` animado y sin recortar: dentro, el `overflow`
              se lo comería y las palabras acabarían pegadas. */}
          {i < palabras.length - 1 && ' '}
        </span>
      ))}
    </Como>
  );
}
