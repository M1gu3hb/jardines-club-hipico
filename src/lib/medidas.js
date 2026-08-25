import MEDIDAS from '@/data/medidas-medios.json';

/**
 * medidas.js — el tamaño real de cada medio auto-hospedado.
 *
 * ── Para qué ────────────────────────────────────────────────────────────────
 *
 * Para que la página no salte al cargar. Un `<img>` sin dimensiones ocupa cero alto hasta que
 * la imagen llega, y al llegar empuja todo lo que tiene debajo. En una galería de 68 piezas
 * eso es la página entera moviéndose mientras alguien intenta tocar una foto — y acabando en
 * otra.
 *
 * El archivo lo genera `scripts/medidas-medios.mjs` leyendo la cabecera de cada archivo de
 * `public/media/`. No hace falta que nadie teclee números: el archivo ya sabe cuánto mide.
 *
 * ── Por qué esto se puede hacer aquí ────────────────────────────────────────
 *
 * Porque los medios están auto-hospedados. Con imágenes de un tercero habría que pedirlas para
 * medirlas, que es justo lo que se quiere evitar. Aquí son archivos en disco durante el build.
 *
 * ── Y cuando una imagen no está en la lista ─────────────────────────────────
 *
 * Se devuelve `null` y quien llama decide. **No se inventa una proporción por defecto**: un
 * 4:3 supuesto sobre una foto vertical reserva un hueco equivocado y produce el mismo salto
 * que se quería evitar, solo que en la otra dirección.
 */

// El JSON llega tipado como `number[]`, no como la tupla `[number, number]`: TypeScript no
// puede saber que cada lista tiene exactamente dos elementos leyendo un archivo de datos. El
// que sí lo sabe es quien lo genera, `scripts/medidas-medios.mjs`, que escribe siempre dos.
/** @type {Record<string, number[]>} */
const TABLA = MEDIDAS;

/**
 * Ancho y alto de un medio, si se conocen.
 * @returns {{ ancho: number, alto: number, proporcion: string } | null}
 */
export function medidasDe(url) {
  if (!url) return null;
  // La dirección puede venir con dominio, con parámetros o con la barra de más. Se normaliza
  // a la ruta desde la raíz, que es la clave con la que se guardó.
  const ruta = String(url).replace(/^https?:\/\/[^/]+/, '').split('?')[0].split('#')[0];
  const m = TABLA[ruta];
  if (!m) return null;
  return { ancho: m[0], alto: m[1], proporcion: `${m[0]} / ${m[1]}` };
}
