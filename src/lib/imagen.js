import { medidasDe } from '@/lib/medidas';

/**
 * imagen.js — la capa que decide QUÉ archivo se descarga para cada hueco.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * EL PROBLEMA MEDIDO, NO SUPUESTO
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Se contaron los 449 archivos de imagen de `public/media/`:
 *
 *   · Peso total: 257 MB. Media: 587 kB por imagen.
 *   · 77 pasan de 1 MB. La mayor: 4608 × 3072.
 *   · Pero la MEDIANA de ancho es 576 px.
 *
 * O sea que el problema no está repartido: **86 archivos de 449 son casi todo el peso**. Son
 * fotos salidas de la cámara, sin tocar. Y en la galería se enseñan a 300-500 px de ancho, así
 * que el navegador descarga alrededor de QUINCE VECES más píxeles de los que va a dibujar.
 *
 * Eso es exactamente lo que el dueño describía: *«tardan demasiado en cargar y da apariencia
 * de que la página está rota»*, y *«una imagen de plano nunca termina de cargar»* — que es lo
 * que pasa cuando una conexión móvil intenta traer ocho megas mientras otras sesenta y ocho
 * peticiones compiten por el mismo ancho de banda.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * POR QUÉ SE OPTIMIZA EN EL BORDE Y NO EN EL BUILD
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Se valoraron las dos:
 *
 *   · **Generar variantes en el build** (con `sharp`): control total y cero coste por
 *     petición, pero son 449 imágenes × 4 anchos = ~1 800 archivos nuevos, varios minutos más
 *     de build en cada despliegue y un repositorio bastante más gordo. Para 86 archivos que lo
 *     necesitan de verdad, es mucha maquinaria.
 *
 *   · **`/_vercel/image`**, la optimización del propio borde: se pide con parámetros y ya. Sin
 *     archivos nuevos, sin tiempo de build, y **negocia el formato con el navegador** — AVIF a
 *     quien lo acepte, WebP al resto—, que es un ahorro que la generación estática no da sin
 *     triplicar el número de archivos.
 *
 * Se factura **por imagen ORIGEN, no por variante**: 449 orígenes es una cifra pequeña, y las
 * transformaciones quedan cacheadas en el borde durante un año (`minimumCacheTTL`).
 *
 * Y no toca la política de seguridad: `/_vercel/image` es el MISMO origen, así que el
 * `img-src 'self'` que ya hay lo cubre. No se abre nada a terceros.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * PENSADO PARA REUTILIZARSE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Todo lo específico de Vercel vive en `ADAPTADOR`, abajo. Un proyecto que use otro CDN
 * —Cloudflare, imgix, un servidor propio— cambia esa función y nada más: `Foto` y el resto del
 * sitio no saben quién redimensiona.
 */

// ─────────────────────────────────────────────────────────────────────────────
// EL ADAPTADOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Traduce (ruta, ancho, calidad) a la dirección que sirve esa versión.
 *
 * @param {string} url      Ruta del original, desde la raíz del sitio.
 * @param {number} ancho    Ancho deseado en píxeles.
 * @param {number} calidad  1-100. Tiene que estar en `images.qualities` de `vercel.json`.
 */
function ADAPTADOR(url, ancho, calidad) {
  return `/_vercel/image?url=${encodeURIComponent(url)}&w=${ancho}&q=${calidad}`;
}

/**
 * Los anchos que se ofrecen. Coinciden con `images.sizes` de `vercel.json`: pedir uno que no
 * esté en esa lista devuelve un error del borde, no una imagen.
 */
export const ANCHOS = [256, 384, 512, 640, 768, 1024, 1280, 1600, 1920, 2560];

/**
 * Calidad por defecto: ALTA.
 *
 * Empezó en 72 y fue un error. El dueño lo vio antes que ninguna medición: *«todo se ve muy
 * pixelado, desde la miniatura, que es como la mayoría lo ve»*.
 *
 * Y lo que costaba bajarla era casi nada. Medido en producción sobre la misma foto:
 *
 *   · w=1280 con q=72 → 38 kB
 *   · w=960  con q=90 → 37 kB
 *
 * O sea: **subir la calidad a 90 cuesta lo mismo que servir un ancho mayor a 72**. En una
 * fotografía, donde el producto ES la imagen, esa elección no admite duda. Los 2 MB del
 * original siguen siendo dos órdenes de magnitud más, así que el ahorro se conserva entero.
 */
export const CALIDAD = 90;

// ─────────────────────────────────────────────────────────────────────────────

/**
 * ¿Esta dirección se puede optimizar?
 *
 * Solo las rutas locales que empiezan por `/media/`. Se dejan fuera:
 *   · Las direcciones absolutas (`https://…`), que no están declaradas en `localPatterns`.
 *   · Los `data:` y `blob:`, que ya son el archivo.
 *   · Los videos: `/_vercel/image` no los toca.
 */
export function sePuedeOptimizar(url) {
  if (!url || typeof url !== 'string') return false;
  if (!url.startsWith('/media/')) return false;
  return !/\.(mp4|webm|mov|ogg|m4v)(\?|#|$)/i.test(url);
}

/**
 * ¿Estamos donde existe `/_vercel/image`?
 *
 * En `npm run dev` NO existe: pedirlo devuelve el HTML de la aplicación con tipo `text/html`, y
 * el navegador dibuja el icono de imagen rota. Así que en desarrollo se sirve el original.
 *
 * Se mira `import.meta.env.PROD` y no el nombre del dominio: el prerender del build también
 * corre con `PROD`, y ahí SÍ interesa escribir las direcciones optimizadas en el HTML.
 */
function hayOptimizador() {
  try {
    return Boolean(import.meta.env && import.meta.env.PROD);
  } catch {
    return false;
  }
}

/**
 * El ancho máximo que tiene sentido pedir de una imagen.
 *
 * ESTE DETALLE IMPORTA MÁS DE LO QUE PARECE. La mediana de este sitio son 576 px de ancho: si
 * a una imagen de 576 se le piden 1920, el optimizador **la agranda**, y el resultado pesa más
 * que el original y se ve peor. Con las medidas reales a mano —`medidas-medios.json`, generado
 * leyendo las cabeceras de los archivos— se recorta la lista de anchos al tamaño de origen.
 *
 * Sin medidas conocidas se devuelve `null` y se ofrecen todos los anchos: es preferible pedir
 * de más una vez que no optimizar nunca.
 */
function anchoDeOrigen(url) {
  const m = medidasDe(url);
  return m && m.ancho ? m.ancho : null;
}

/**
 * Los anchos que se van a ofrecer para una imagen concreta.
 * Siempre al menos uno, aunque el original sea diminuto.
 */
export function anchosPara(url) {
  const origen = anchoDeOrigen(url);
  if (!origen) return ANCHOS;
  const utiles = ANCHOS.filter((a) => a <= origen);
  return utiles.length > 0 ? utiles : [ANCHOS[0]];
}

/**
 * La dirección de una sola versión. Se usa como `src` de respaldo, para los navegadores que
 * no entienden `srcset`.
 */
export function fuenteDe(url, ancho, calidad = CALIDAD) {
  if (!sePuedeOptimizar(url) || !hayOptimizador()) return url;
  return ADAPTADOR(url, ancho, calidad);
}

/**
 * El `srcset` completo: cada ancho con su descriptor `w`.
 *
 * El navegador elige solo, sabiendo tres cosas que el servidor no sabe: el ancho real del
 * hueco tras aplicar el CSS, la densidad de la pantalla y —en algunos— si la conexión va mal.
 * Por eso se le dan las opciones en vez de decidir por él.
 */
export function conjuntoDeFuentes(url, calidad = CALIDAD) {
  if (!sePuedeOptimizar(url) || !hayOptimizador()) return undefined;
  return anchosPara(url)
    .map((a) => `${ADAPTADOR(url, a, calidad)} ${a}w`)
    .join(', ');
}

/**
 * Atributos listos para un `<img>`: `src`, `srcSet`, `width` y `height`.
 *
 * `width` y `height` van SIEMPRE que se conozcan, y no son decorativos: sin ellos el navegador
 * no sabe cuánto sitio reservar, la imagen ocupa cero alto hasta que llega y al llegar empuja
 * todo lo que tiene debajo. En una galería de sesenta y nueve piezas eso es la página entera
 * moviéndose mientras alguien intenta tocar una foto.
 *
 * @param {string} url
 * @param {Object} [opciones]
 * @param {number} [opciones.calidad]
 * @param {number} [opciones.anchoPreferido] Ancho para el `src` de respaldo.
 */
export function atributosDeImagen(url, opciones = {}) {
  const { calidad = CALIDAD, anchoPreferido = 1280 } = opciones;
  const med = medidasDe(url);
  const disponibles = anchosPara(url);

  // Para el respaldo se elige el ancho ofrecido más cercano al preferido, sin pasarse.
  const respaldo =
    disponibles.filter((a) => a <= anchoPreferido).pop() || disponibles[0];

  return {
    src: fuenteDe(url, respaldo, calidad),
    srcSet: conjuntoDeFuentes(url, calidad),
    width: med ? med.ancho : undefined,
    height: med ? med.alto : undefined,
  };
}

/**
 * Prepara las piezas de una galería para el visor a pantalla completa.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * POR QUÉ ESTO EXISTE EN VEZ DE ARREGLAR EL VISOR
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * `MediaViewer` es **copia byte a byte en los tres repositorios** y hay un contrato que lo
 * vigila. Tocarlo aquí crearía la divergencia que ese contrato existe para evitar.
 *
 * Pero el problema no está en el visor: está en lo que se le da. Recibía la dirección del
 * ORIGINAL, así que abría un JPEG de dos a ocho megas. Palabras del dueño: *«cambio de imagen
 * y sale todo sin nada, y se pinta de arriba hacia abajo y tarda como tres segundos»*. Eso es
 * exactamente lo que se ve descargando ocho megas por una conexión normal.
 *
 * La solución no necesita tocar el visor: **se le entregan las direcciones ya optimizadas**. A
 * 1600 px y calidad 95, una foto de cámara pasa de megas a unos cien kilobytes, y a pantalla
 * completa es indistinguible del original.
 *
 * ── Por qué 1600 y no 2560 ──────────────────────────────────────────────────
 *
 * Porque el visor no ocupa la pantalla entera: deja márgenes y la imagen cabe con
 * `object-contain`. En una pantalla de portátil normal el hueco real ronda los 1 200 px, y en
 * una grande los 1 600. Pedir 2560 sería descargar el doble para dibujar lo mismo.
 *
 * Y la calidad sube a 95, no 90: aquí la foto se mira de cerca y a tamaño grande, que es
 * justo donde un artefacto de compresión sí se nota.
 *
 * @param {Array} piezas  Cada una con `url`. El resto de campos se conserva.
 */
export function piezasParaVisor(piezas) {
  if (!Array.isArray(piezas)) return piezas;
  return piezas.map((pieza) => {
    if (!pieza || !sePuedeOptimizar(pieza.url)) return pieza;
    return { ...pieza, url: fuenteDe(pieza.url, 1600, 95) };
  });
}
