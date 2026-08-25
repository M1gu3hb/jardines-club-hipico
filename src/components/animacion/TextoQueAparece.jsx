import { Fragment, useEffect, useRef, useState } from 'react';
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
 * @param {string}  [props.resalta] Trozo del texto que se pinta como acento: serif en
 *                                  cursiva y en el dorado de la marca. Ver `partirEnPalabras`.
 */

/**
 * Parte el título en palabras y marca cuáles forman el acento.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * POR QUÉ LOS TÍTULOS LLEVAN DOS TIPOGRAFÍAS
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * El dueño lo pidió así: *«ponle diferente tipografía y diferentes colores a los títulos»*. Y
 * el problema real que señala es que todos los títulos del sitio eran la misma cosa —blanco,
 * `font-extralight`, mismo tamaño— y una página entera de eso se lee plana.
 *
 * La solución NO es meter una fuente nueva. La política de seguridad del sitio solo admite
 * recursos propios, y descargar y auto-hospedar una familia entera para decorar seis titulares
 * son cientos de kilobytes que paga cada visita desde el móvil.
 *
 * Lo que sí hay, gratis y en todas las máquinas, es una **serif del sistema**. Una palabra en
 * serif cursiva dentro de una frase en sans ligera es de los contrastes tipográficos más
 * viejos y más fiables que existen: la vista lo lee como énfasis, no como error. Con el dorado
 * de la marca encima, el título tiene dos voces sin costar un solo byte de descarga.
 *
 * ── Y por qué se resalta un TROZO y no el título entero ─────────────────────
 *
 * Porque un título entero en dorado y cursiva pesa demasiado y compite con el siguiente. Lo
 * que se resalta es la palabra que carga el significado —«pasar», «planeando», «nada de
 * fuera»— y el resto la sostiene. Eso da jerarquía dentro del propio titular.
 */
function partirEnPalabras(texto, resalta) {
  const palabras = String(texto).split(' ');
  const trozo = String(resalta || '').trim();
  if (!trozo) return palabras.map((palabra) => ({ palabra, acento: false }));

  const pos = texto.indexOf(trozo);
  if (pos < 0) return palabras.map((palabra) => ({ palabra, acento: false }));

  const desde = texto.slice(0, pos).split(' ').filter(Boolean).length;
  const hasta = desde + trozo.split(' ').filter(Boolean).length;
  return palabras.map((palabra, i) => ({ palabra, acento: i >= desde && i < hasta }));
}

/** El acento: serif en cursiva y con el degradado dorado recortado sobre el propio texto. */
const CLASE_ACENTO =
  'font-serif italic bg-gradient-to-br from-[#F0DFA6] via-[#E2C266] to-[#C9A84C] bg-clip-text text-transparent';

export default function TextoQueAparece({
  texto,
  className = '',
  como = 'span',
  retraso = 0,
  resalta = '',
}) {
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

  const piezas = partirEnPalabras(texto, resalta);

  if (menosMovimiento || !puedeAnimar) {
    return (
      <Como className={className}>
        {piezas.map(({ palabra, acento }, i) => (
          <Fragment key={i}>
            <span className={acento ? CLASE_ACENTO : undefined}>{palabra}</span>
            {i < piezas.length - 1 ? ' ' : null}
          </Fragment>
        ))}
      </Como>
    );
  }

  return (
    <Como ref={ancla} className={className} aria-label={texto}>
      {piezas.map(({ palabra, acento }, i) => (
        // ══════════════════════════════════════════════════════════════════
        // EL ESPACIO VA AQUÍ, HERMANO DE LA CAJA. NUNCA DENTRO.
        // ══════════════════════════════════════════════════════════════════
        //
        // Este archivo ya se comió los espacios una vez y salió
        // «Encuentradóndecabetuevento» en todas las páginas del sitio. El comentario que
        // había aquí decía que el espacio iba «fuera del span animado» — y era verdad, pero
        // insuficiente: estaba fuera del `motion.span` y DENTRO del `<span>` que recorta.
        //
        // Y eso basta para perderlo. Un `inline-block` **descarta el espacio en blanco que
        // queda al final de su contenido**: es una caja, y los espacios sobrantes al borde de
        // una caja no se dibujan. Da igual que el `overflow` no lo tape; nunca llega a existir.
        //
        // Puesto como hermano del `<span>` recortador, el espacio vive en el flujo normal del
        // título y se comporta como el espacio de cualquier frase.
        <Fragment key={i}>
          <span className="inline-block overflow-hidden align-bottom">
            <motion.span
              aria-hidden="true"
              className={acento ? `inline-block ${CLASE_ACENTO}` : 'inline-block'}
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
          </span>
          {i < piezas.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </Como>
  );
}
