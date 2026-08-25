/**
 * LA DIRECCIÓN DEL SITIO — un solo sitio, literalmente.
 *
 * Este valor lo necesitan cuatro cosas distintas y ninguna puede inventárselo:
 *
 *   · el `<link rel="canonical">` de cada página
 *   · `og:url` y `og:image`, que es lo que se ve al compartir por WhatsApp
 *   · el JSON-LD que Google usa para la ficha del negocio
 *   · el `sitemap.xml`, donde una URL de otro dominio simplemente se ignora
 *
 * Hasta el 2026-08-24 estaba escrito a mano en `index.html` como `jardinesclubhipico.com`,
 * **un dominio que no es del negocio**. O sea que la ficha que Google publicaba y la vista
 * previa de cada enlace compartido apuntaban a un sitio ajeno. Ese es el tipo de fallo que
 * no rompe nada, no sale en ninguna consola y cuesta tráfico durante meses.
 *
 * `vite.config.js` importa esta constante para sustituir `%VITE_SITE_URL%` en el HTML
 * durante el build, así que el valor del HTML y el del JavaScript no pueden divergir.
 *
 * El día que se compre el dominio propio, se cambia `VITE_SITE_URL` en Vercel y ya.
 */

/**
 * Este archivo lo lee el NAVEGADOR (donde `process` no existe) y también NODE, desde
 * `vite.config.js` y desde `scripts/` (donde `import.meta.env` no existe). Leer la variable
 * de un solo modo rompería la mitad de los sitios que la usan, y el optional chaining NO
 * protege de un identificador no declarado: `process?.env` peta igual si `process` no existe.
 */
const deVite = typeof import.meta !== 'undefined' && import.meta.env
  ? import.meta.env.VITE_SITE_URL
  : undefined;

// Se llega a `process` por `globalThis` y no por su nombre a secas. Nombrarlo directo es un
// error de tipos en este repo, que no tiene los tipos de Node cargados para `src/`; y en el
// navegador el identificador NO EXISTE, asi que `typeof process` es la unica forma segura de
// preguntar por el. Por `globalThis` las dos cosas se resuelven de golpe.
const global = /** @type {any} */ (globalThis);
const deNode = global.process && global.process.env
  ? global.process.env.VITE_SITE_URL
  : undefined;

/** Sin barra final: las rutas se concatenan tal cual y `//` rompe el canonical. */
export const URL_SITIO = (
  deVite || deNode || 'https://jardines-club-hipico.vercel.app'
).replace(/\/+$/, '');

/** URL absoluta de una ruta. El canonical y el sitemap las exigen absolutas. */
export const urlAbsoluta = (ruta) =>
  ruta === '/' ? `${URL_SITIO}/` : `${URL_SITIO}${ruta.startsWith('/') ? ruta : `/${ruta}`}`;

/** Nombre del negocio, tal como se firma en los títulos. */
export const NOMBRE_SITIO = 'Jardines Club Hípico';
