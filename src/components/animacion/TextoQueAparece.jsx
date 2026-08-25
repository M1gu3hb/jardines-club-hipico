import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { sePuedeAnimar } from '@/lib/animacion';

/**
 * TextoQueAparece — el texto entra palabra por palabra al llegar a él.
 *
 * ── Qué pidió el dueño ──────────────────────────────────────────────────────
 *
 * *«Mete las animaciones de texto: estás scrolleando y que el texto vaya apareciendo de alguna
 * forma dinámica, bonita.»*
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * EL FALLO QUE ESTE ARCHIVO YA TUVO, PORQUE NO PUEDE VOLVER
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * La primera versión ponía `whileInView` en CADA PALABRA. Y las palabras viven dentro de un
 * `<span>` con `overflow: hidden`, empezando desplazadas un 105% hacia abajo — o sea, fuera de
 * la caja que las recorta. Eso es lo que hace el efecto de «asomarse».
 *
 * **`IntersectionObserver` calcula el área visible DESPUÉS de aplicar los recortes de los
 * ancestros.** Una palabra recortada al cien por cien tiene área visible cero, así que el
 * observador la daba por fuera de pantalla. Y como solo se hacía visible al animar, y solo
 * animaba al ser visible, se quedaba trabada consigo misma. Para siempre.
 *
 * Resultado: TODOS los títulos del sitio salían con `opacity: 0`. El texto estaba en el HTML
 * —Google lo leía— pero el visitante veía un hueco. El dueño lo describió exacto: *«las
 * secciones no tienen título… o está bugeada y no sale»*.
 *
 * LA REGLA QUE SALE DE AHÍ: **se observa el contenedor, que no está recortado; nunca lo que
 * está dentro del recorte.** Por eso hay un solo `useInView` sobre el título entero y las
 * palabras se limitan a obedecerlo.
 *
 * Y la segunda regla, más general: una animación no puede ser la única razón por la que un
 * texto es visible. Si algo falla, tiene que fallar hacia «se ve», no hacia «no se ve».
 *
 * ── Por qué palabra por palabra y no letra por letra ────────────────────────
 *
 * Un título de ocho palabras son ocho elementos; letra por letra serían cuarenta y cinco, cada
 * uno con su capa de composición. En un móvil de gama media se nota, y encima se lee peor: las
 * letras sueltas obligan a esperar para entender la frase.
 *
 * ── Y por qué el texto ya está en el HTML ───────────────────────────────────
 *
 * Las palabras se parten en `<span>` **con el texto dentro desde el primer render**: lo que
 * cambia es su opacidad y su posición, no su existencia. Así el prerender escribe la frase
 * entera y quien busque con Ctrl+F la encuentra.
 *
 * ── Accesibilidad ──────────────────────────────────────────────────────────
 *
 * Con `prefers-reduced-motion` no hay animación: el texto sale entero y quieto. Y el original
 * viaja en `aria-label` porque un lector de pantalla, ante quince `<span>` sueltos, puede
 * leerlos como quince fragmentos en vez de como una frase.
 *
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
  const ancla = useRef(null);

  // DOS DISPARADORES, Y EL IMPORTANTE ES EL SEGUNDO.
  //
  // `useInView` sirve para lo que hay que ir a buscar scrolleando, y va sobre el CONTENEDOR
  // —que no está recortado—, nunca sobre las palabras.
  const enVista = useInView(ancla, { once: true, amount: 0 });

  // Y para lo que YA está en pantalla al cargar —los títulos de página, sin ir más lejos— no se
  // usa observador ninguno: se mide la posición y punto. Un observador solo avisa de un CAMBIO,
  // y aquí no va a haber ninguno: el título nunca «entra» porque nunca estuvo fuera. Esa espera
  // a un cambio que no llega es exactamente lo que dejó todos los títulos del sitio invisibles.
  const [visibleAlCargar, setVisibleAlCargar] = useState(false);
  useEffect(() => {
    const el = ancla.current;
    if (!el || typeof window === 'undefined') return;
    if (el.getBoundingClientRect().top < window.innerHeight) setVisibleAlCargar(true);
  }, []);

  const mostrar = enVista || visibleAlCargar;

  // Quieto y visible en los dos casos: quien pidió menos movimiento, y la pestaña que el
  // navegador ha congelado por estar en segundo plano. Ver `sePuedeAnimar`.
  const [puedeAnimar] = useState(sePuedeAnimar);

  if (menosMovimiento || !puedeAnimar) return <Como className={className}>{texto}</Como>;

  const palabras = String(texto).split(' ');

  return (
    <Como ref={ancla} className={className} aria-label={texto}>
      {palabras.map((palabra, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom">
          <motion.span
            aria-hidden="true"
            className="inline-block"
            initial={{ y: '105%', opacity: 0 }}
            // Solo `transform` y `opacity`: son las dos que el navegador anima sin recalcular
            // el diseño de la página en cada fotograma.
            animate={mostrar ? { y: '0%', opacity: 1 } : { y: '105%', opacity: 0 }}
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
          {i < palabras.length - 1 && ' '}
        </span>
      ))}
    </Como>
  );
}
