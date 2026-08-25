import { useEffect, useMemo, useRef, useState } from 'react';
import { medidasDe } from '@/lib/medidas';

/**
 * MosaicoJustificado — filas que se llenan exactas, sin un solo hueco.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * POR QUÉ UNA REJILLA NUNCA IBA A FUNCIONAR
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * El collage anterior repartía las fotos en celdas de tamaño fijo —unas de dos por dos, otras
 * de una por una— y eso **siempre** deja agujeros: cuando la pieza que toca no cabe en el
 * hueco que queda, la rejilla lo deja negro. `grid-auto-flow: dense` tapa algunos, no todos.
 *
 * El dueño lo vio enseguida: *«tiene muchísimos espacios negros vacíos… y cuando abres la
 * foto, en realidad no es toda la foto»*. Y la segunda parte es lo peor: al recortar una foto
 * vertical dentro de una celda apaisada, lo que se enseña **no es la fotografía**. Se pierde
 * justo lo que el dueño quiere enseñar.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * CÓMO SE RESUELVE: FILAS JUSTIFICADAS
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Es el mismo método que usan las galerías de Flickr o Google Fotos, y no es un truco visual
 * sino aritmética simple:
 *
 *   1. Se van metiendo fotos en una fila sumando sus **proporciones** (ancho ÷ alto).
 *   2. Cuando la suma pasa de lo que cabe, se cierra la fila.
 *   3. Se calcula el alto exacto que hace que esa fila mida **justo el ancho disponible**:
 *      `alto = (ancho − huecos) ÷ suma de proporciones`.
 *   4. Cada foto toma ese alto y el ancho que le corresponda por su proporción.
 *
 * Resultado: **cero huecos por construcción**, y cada foto conserva su forma —una vertical se
 * ve estrecha y alta, una apaisada ancha y baja—. No hay recortes, así que lo que se ve en el
 * mosaico es lo mismo que se ve al abrirla.
 *
 * Y da variedad sola, sin patrones inventados: los tamaños los decide el contenido real.
 *
 * ── De dónde salen las proporciones ─────────────────────────────────────────
 *
 * De `src/data/medidas-medios.json`, que se genera leyendo las cabeceras de los 448 archivos
 * en el build (`scripts/medidas-medios.mjs`). No las teclea nadie. Lo que no esté en esa
 * lista —un video, un archivo nuevo— entra como 4:3, que es lo más común y falla de la forma
 * menos escandalosa.
 *
 * ── La última fila ──────────────────────────────────────────────────────────
 *
 * No se estira. Si sobran tres fotos para completar el ancho, estirarlas las dejaría enormes
 * y desproporcionadas respecto al resto. Se quedan a la altura objetivo y el hueco queda al
 * final — que es exactamente lo que el dueño dijo que sí aceptaba: *«ya que terminaron las
 * imágenes, esa sí»*.
 *
 * ── Antes de que el navegador mida ──────────────────────────────────────────
 *
 * En el prerender no hay ancho que medir, así que se parte de 1200 px. El HTML sale completo
 * —Google lo lee igual— y en cuanto el navegador monta, `ResizeObserver` da el ancho real y
 * las filas se recalculan. Ese primer cálculo nunca se ve: ocurre antes del primer pintado.
 */

const PROPORCION_POR_DEFECTO = 4 / 3;
const ANCHO_SUPUESTO = 1200;

/** Alto al que se apunta antes de justificar. Más bajo en el teléfono, que es más estrecho. */
function altoObjetivo(ancho) {
  if (ancho < 480) return 170;
  if (ancho < 768) return 200;
  if (ancho < 1280) return 230;
  return 260;
}

/** Cuántas fotos como mínimo por fila, para que en el teléfono no salga una sola gigante. */
function minimoPorFila(ancho) {
  return ancho < 480 ? 2 : ancho < 768 ? 2 : 3;
}

/**
 * Reparte las piezas en filas y le da a cada una su tamaño exacto.
 * @returns {Array<{items: Array<{item: any, ancho: number, alto: number}>, alto: number}>}
 */
function repartirEnFilas(piezas, anchoDisponible, hueco) {
  const objetivo = altoObjetivo(anchoDisponible);
  const minimo = minimoPorFila(anchoDisponible);
  const filas = [];
  let actual = [];
  let sumaProporciones = 0;

  const cerrar = (estirar) => {
    if (actual.length === 0) return;
    const huecos = hueco * (actual.length - 1);
    // El alto que hace que la fila mida EXACTAMENTE el ancho disponible.
    const alto = estirar
      ? (anchoDisponible - huecos) / sumaProporciones
      : objetivo;
    filas.push({
      alto,
      items: actual.map(({ item, proporcion }) => ({
        item,
        alto,
        ancho: proporcion * alto,
      })),
    });
    actual = [];
    sumaProporciones = 0;
  };

  piezas.forEach((item) => {
    const med = medidasDe(item.imagenUrl);
    // `Number()` no es adorno: `medidas-medios.json` guarda la proporción como cadena en
    // algunas piezas, y sumar una cadena convertiría el total en texto concatenado — la
    // fila entera saldría con el ancho equivocado.
    const proporcion = Number(med?.proporcion) || PROPORCION_POR_DEFECTO;
    actual.push({ item, proporcion });
    sumaProporciones += proporcion;

    // ¿Ya sobrepasa el ancho a la altura objetivo? Entonces esta fila está llena.
    const anchoNatural = sumaProporciones * objetivo + hueco * (actual.length - 1);
    if (anchoNatural >= anchoDisponible && actual.length >= minimo) cerrar(true);
  });

  cerrar(false); // La última fila se queda a su altura, sin estirar.
  return filas;
}

/**
 * @param {Object} props
 * @param {Array}  props.piezas      Filas de `galeria`, cada una con `imagenUrl`.
 * @param {(item: any, i: number, medidas: {ancho: number, alto: number}) => any} props.pinta
 *        Cómo dibujar cada pieza. Recibe el tamaño ya calculado.
 * @param {number} [props.hueco]     Separación en píxeles.
 */
export default function MosaicoJustificado({ piezas, pinta, hueco = 10 }) {
  const contenedor = useRef(null);
  const [ancho, setAncho] = useState(ANCHO_SUPUESTO);

  useEffect(() => {
    const el = contenedor.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const medir = () => setAncho(el.clientWidth || ANCHO_SUPUESTO);
    medir();

    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  // Recalcular sesenta y nueve fotos en cada render sería trabajo tirado: solo cambia cuando
  // cambia el ancho o la lista.
  const filas = useMemo(
    () => repartirEnFilas(piezas, ancho, hueco),
    [piezas, ancho, hueco],
  );

  let indice = -1;

  return (
    <div ref={contenedor} className="w-full">
      {filas.map((fila, f) => (
        <div key={f} className="flex" style={{ gap: hueco, marginBottom: hueco }}>
          {fila.items.map(({ item, ancho: a, alto: h }) => {
            indice += 1;
            return pinta(item, indice, { ancho: a, alto: h });
          })}
        </div>
      ))}
    </div>
  );
}
