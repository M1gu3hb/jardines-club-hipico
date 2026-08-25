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

/**
 * Alto al que se apunta antes de justificar.
 *
 * ── En el teléfono se apunta MÁS ALTO, no más bajo ──────────────────────────
 *
 * Es lo contrario de lo que parece razonable, y por eso conviene explicarlo. En una pantalla
 * de 375 px el ancho útil es de unos 335. Con un objetivo bajo caben dos fotos por fila, y al
 * justificarlas cada una acaba midiendo unos 122 px de alto: exactamente la queja original del
 * dueño —*«se ve muy chiquita, la gente mayor no ve nada»*—.
 *
 * Con un objetivo de 250, una foto apaisada normal ya llena la fila ella sola y se ve a 335 px
 * de ancho. Las verticales, que son estrechas, siguen emparejándose de dos en dos, que es justo
 * lo que hay que hacer con ellas.
 *
 * O sea: el objetivo alto no fuerza una foto por fila, deja que el CONTENIDO lo decida. Una
 * panorámica ocupa el ancho entero y dos retratos comparten fila. Eso es lo que hace que en el
 * teléfono se vea variado en vez de una columna monótona.
 */
function altoObjetivo(ancho) {
  if (ancho < 480) return 250;
  if (ancho < 768) return 240;
  if (ancho < 1280) return 230;
  return 260;
}

/**
 * Cuántas fotos como mínimo por fila antes de poder cerrarla.
 *
 * En el teléfono es 1: una foto apaisada sola llenando el ancho es exactamente lo que se
 * busca. De 480 px en adelante son 2 y 3, para que no queden fotos sueltas gigantes en una
 * pantalla donde sí caben varias.
 */
function minimoPorFila(ancho) {
  return ancho < 480 ? 1 : ancho < 768 ? 2 : 3;
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
  let suma = 0;

  /** El alto que hace que un conjunto de piezas mida EXACTAMENTE el ancho disponible. */
  const altoDe = (sumaProporciones, cuantas) =>
    (anchoDisponible - hueco * (cuantas - 1)) / sumaProporciones;

  const empujarFila = (alto) => {
    filas.push({
      alto,
      items: actual.map(({ item, proporcion }) => ({ item, alto, ancho: proporcion * alto })),
    });
  };

  piezas.forEach((item) => {
    const med = medidasDe(item.imagenUrl);
    // LA PROPORCIÓN SE CALCULA, NO SE LEE.
    //
    // `medidasDe()` devuelve `proporcion` como la CADENA que espera la propiedad CSS
    // `aspect-ratio` —«1024 / 576»—, no como número. `Number('1024 / 576')` da `NaN`, así que
    // usarla aquí hacía que TODAS las piezas cayeran en el 4:3 por defecto: la galería salía
    // perfectamente justificada y con todas las fotos exactamente del mismo tamaño, que es lo
    // contrario de un collage.
    //
    // Lo que hace falta es el número, y sale de dividir los dos lados que sí son números.
    const proporcion = med && med.alto ? med.ancho / med.alto : PROPORCION_POR_DEFECTO;

    const anteriores = actual.length;
    actual.push({ item, proporcion });
    suma += proporcion;

    const altoCon = altoDe(suma, actual.length);

    // Mientras el alto siga por encima del objetivo, la fila admite más piezas.
    if (altoCon > objetivo) return;

    // ══════════════════════════════════════════════════════════════════════════
    // LA DECISIÓN QUE FALTABA: ¿ESTA PIEZA ENTRA EN ESTA FILA O EN LA SIGUIENTE?
    // ══════════════════════════════════════════════════════════════════════════
    //
    // La versión anterior metía la pieza y cerraba, siempre. En pantallas anchas da igual —una
    // foto más o menos entre cinco apenas mueve el alto— pero en un teléfono era el desastre:
    // dos fotos apaisadas en 335 px salen a 122 px de alto, que es exactamente la queja del
    // dueño («se ve muy chiquita, la gente mayor no ve nada»).
    //
    // Lo correcto es comparar las dos opciones y quedarse con la que deja la fila MÁS CERCA
    // del alto objetivo. Con una sola foto apaisada: 252 px. Con dos: 122. Gana la de una, y
    // la segunda foto abre la fila siguiente.
    //
    // Así el contenido decide: una panorámica ocupa el ancho entero, dos retratos comparten
    // fila. Es lo que hace que se vea variado en vez de una columna monótona.
    if (anteriores >= minimo) {
      const sumaSin = suma - proporcion;
      const altoSin = altoDe(sumaSin, anteriores);
      if (Math.abs(altoSin - objetivo) < Math.abs(altoCon - objetivo)) {
        actual.pop();
        suma = sumaSin;
        empujarFila(altoSin);
        actual = [{ item, proporcion }];
        suma = proporcion;
        return;
      }
    }

    if (actual.length >= minimo) {
      empujarFila(altoCon);
      actual = [];
      suma = 0;
    }
  });

  // La última fila NO se estira: si sobran dos fotos para llenar el ancho, estirarlas las
  // dejaría enormes respecto al resto. Se quedan a la altura objetivo y el hueco cae al final,
  // que es lo único que el dueño dijo que sí aceptaba.
  if (actual.length > 0) empujarFila(objetivo);

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
