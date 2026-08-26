import MANIFIESTO from '@/data/variantes.json';
import { medidasDe } from '@/lib/medidas';

/**
 * imagen.js — la capa que decide QUÉ archivo se descarga para cada hueco.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * LA HISTORIA COMPLETA, PORQUE EL SEGUNDO INTENTO SALIÓ PEOR QUE EL PRIMERO
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * **Punto de partida.** 449 imágenes, 257 MB, media de 587 kB. La mediana de ancho eran 576 px,
 * pero 86 archivos pasaban de 1 600 y llegaban a 4 608 × 3 072 — fotos de cámara sin tocar,
 * servidas tal cual y dibujadas a 300-500 px. Se descargaban quince veces más píxeles de los
 * que se pintaban.
 *
 * **Primer intento: optimizar en el borde** (`/_vercel/image`). Sobre el papel, mejor: sin
 * archivos nuevos, sin tiempo de build y negociando AVIF/WebP con el navegador. El peso cayó de
 * 2 MB a 20 kB por foto.
 *
 * **Y el sitio quedó PEOR.** El dueño: *«está muchísimo peor, cargan igual de mal»*. Tenía
 * razón, y la medición explicó por qué. Resource Timing sobre la galería en producción, con la
 * caché del borde ya caliente:
 *
 *   · tamaño por imagen ....... 8-19 kB
 *   · tiempo de DESCARGA ...... 0 ms
 *   · TTFB .................... 110-920 ms
 *   · BLOQUEADO EN COLA ....... media 1 780 ms, máximo 4 725 ms
 *
 * **El peso ya no era el problema: lo era el número de peticiones.** Un archivo estático del
 * CDN empieza a responder en unos 30 ms; el endpoint de optimización, aun acertando en caché,
 * tarda entre 110 y 920 ms. Con setenta imágenes y un navegador que abre unas seis conexiones
 * a la vez, esa diferencia se multiplica: 70 ÷ 6 × medio segundo son los cuatro y cinco
 * segundos de espera que él veía.
 *
 * Y por eso decía que «antes cargaban mejor»: antes eran archivos estáticos. Pesaban veinte
 * veces más, pero empezaban a llegar de inmediato.
 *
 * **Solución actual: archivos estáticos, pero del tamaño correcto.** Las variantes se generan
 * una vez con `scripts/variantes-imagenes.mjs` y se sirven como cualquier otro archivo del
 * sitio. Se conservan las dos mitades buenas —TTFB bajo y multiplexado del CDN, más el peso
 * pequeño— y se pierde la única mala.
 *
 * Es lo que hacen los sitios donde la fotografía es el producto: **no transforman bajo demanda,
 * pre-generan**.
 *
 * ── La lección, que vale para el próximo proyecto ───────────────────────────
 *
 * «Menos kilobytes» no es lo mismo que «más rápido». En una galería, el coste dominante no es
 * el tamaño de cada imagen sino **cuántas peticiones hay y cuánto tarda cada una en empezar**.
 * Optimizar el peso e ignorar la latencia empeoró el resultado midiendo mejor en la métrica
 * equivocada.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * PENSADO PARA REUTILIZARSE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Todo lo que depende de dónde viven las variantes está en `ADAPTADOR`. Un proyecto que las
 * sirva desde otro sitio —un bucket, un CDN de imágenes— cambia esa función y nada más.
 */

/**
 * Dónde vive cada variante.
 *
 * `/v/{ancho}/{misma ruta}.webp`. Se conserva la estructura de carpetas del original para que
 * sea evidente de un vistazo a qué archivo corresponde cada variante.
 */
function ADAPTADOR(url, ancho) {
  const sinExtension = url.replace(/^\/media\//, '').replace(/\.[^.]+$/, '');
  return `/v/${ancho}/${sinExtension}.webp`;
}

/**
 * Qué anchos existen de cada imagen, generado por el script junto con los archivos.
 *
 * El navegador no puede mirar el disco: sin este manifiesto, `srcset` ofrecería direcciones que
 * quizá no existen y el navegador elegiría una que devuelve 404 — o sea, una imagen rota.
 *
 * @type {Record<string, number[]>}
 */
const VARIANTES = MANIFIESTO;

/** Los anchos que el generador produce. Informativo: la verdad está en el manifiesto. */
export const ANCHOS = [256, 384, 512, 768, 1024, 1600];

// ─────────────────────────────────────────────────────────────────────────────

/** Normaliza una dirección a la clave con la que se guardó en el manifiesto. */
function clave(url) {
  if (!url || typeof url !== 'string') return null;
  const ruta = url.replace(/^https?:\/\/[^/]+/, '').split('?')[0].split('#')[0];
  return ruta.startsWith('/media/') ? ruta : null;
}

/**
 * ¿Hay versiones optimizadas de esta imagen?
 *
 * Se comprueba contra el manifiesto y no por el nombre: una imagen más pequeña que el escalón
 * mínimo no tiene variantes —generarlas la ampliaría— y hay que servirla tal cual. Lo mismo
 * con los videos, que el generador no toca.
 */
export function sePuedeOptimizar(url) {
  const k = clave(url);
  return Boolean(k && VARIANTES[k] && VARIANTES[k].length > 0);
}

/** Los anchos disponibles de una imagen concreta, de menor a mayor. */
export function anchosPara(url) {
  const k = clave(url);
  return k && VARIANTES[k] ? VARIANTES[k] : [];
}

/**
 * La dirección de una versión concreta, o el original si no hay variantes.
 *
 * Si se pide un ancho mayor del que existe, se devuelve el mayor disponible: pedir 1600 de una
 * imagen que solo llega a 512 daría un 404, y un 404 es una imagen rota.
 */
export function fuenteDe(url, ancho) {
  const disponibles = anchosPara(url);
  if (disponibles.length === 0) return url;
  const elegido = disponibles.filter((a) => a >= ancho)[0] || disponibles[disponibles.length - 1];
  return ADAPTADOR(clave(url), elegido);
}

/**
 * El `srcset` completo: cada ancho con su descriptor `w`.
 *
 * Se le dan todas las opciones al navegador porque él sabe tres cosas que el servidor no: el
 * ancho real del hueco tras aplicar el CSS, la densidad de la pantalla y, en algunos casos, si
 * la conexión va mal.
 */
export function conjuntoDeFuentes(url) {
  const disponibles = anchosPara(url);
  if (disponibles.length === 0) return undefined;
  const k = clave(url);
  return disponibles.map((a) => `${ADAPTADOR(k, a)} ${a}w`).join(', ');
}

/**
 * Atributos listos para un `<img>`: `src`, `srcSet`, `width` y `height`.
 *
 * `width` y `height` van siempre que se conozcan, y no son decorativos: sin ellos la imagen
 * ocupa cero alto hasta que llega, y al llegar empuja todo lo que tiene debajo. En una galería
 * de sesenta y nueve piezas eso es la página entera moviéndose mientras alguien intenta tocar
 * una foto.
 */
export function atributosDeImagen(url, opciones = {}) {
  const { anchoPreferido = 1024 } = opciones;
  const med = medidasDe(url);

  return {
    src: fuenteDe(url, anchoPreferido),
    srcSet: conjuntoDeFuentes(url),
    width: med ? med.ancho : undefined,
    height: med ? med.alto : undefined,
  };
}

/**
 * Prepara las piezas de una galería para un visor a pantalla completa.
 *
 * Se mantiene por compatibilidad con `Ficha`, que se la pasa a su visor. 1600 px es lo que
 * ocupa una foto a pantalla completa con los márgenes del visor; pedir más sería descargar el
 * doble para dibujar lo mismo.
 */
export function piezasParaVisor(piezas) {
  if (!Array.isArray(piezas)) return piezas;
  return piezas.map((pieza) => {
    if (!pieza || !sePuedeOptimizar(pieza.url)) return pieza;
    return { ...pieza, url: fuenteDe(pieza.url, 1600) };
  });
}
