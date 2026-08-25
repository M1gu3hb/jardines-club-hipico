/**
 * marca.js — los recursos de marca que tienen que existir ANTES de que responda la base.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * POR QUÉ ESTO NO ESTÁ EN `negocio.js`
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Porque `negocio.js` es **copia byte a byte en los tres repositorios** —web, portal y CRM— y
 * un contrato lo vigila. Lo de aquí apunta a `/media/img/…`, un archivo que solo existe en el
 * `public/` de ESTE repositorio: compartirlo sería declarar una ruta que en los otros dos es
 * mentira.
 *
 * Es la tercera vez que aparece este reparto —pasó con `eslint.config.js` y con `theme.css`— y
 * la regla que sale de ahí es simple: **si depende de un archivo de este `public/`, no es
 * compartible.**
 */

/**
 * El logotipo, en ruta local.
 *
 * `config_sitio.logo_url` sigue siendo la fuente de verdad y manda en cuanto llega. Esta
 * constante existe para el instante ANTERIOR, que es el que se veía mal: la cortina de
 * `index.html` y el splash necesitan marca desde el primer fotograma, y una consulta a la base
 * no puede darla a tiempo.
 *
 * Sin esto, el arranque enseñaba un círculo con las siglas «JCH» y lo cambiaba por el logotipo
 * un momento después. El dueño lo describió tal cual: *«no sale el logo luego luego, sale
 * primero un círculo con JCH y luego el logo»*.
 *
 * Si el logotipo se cambia desde el panel, esta ruta se queda con el anterior durante los
 * primeros milisegundos y luego el de la base lo sustituye. Ese es todo el riesgo, y es
 * preferible a no tener marca al arrancar.
 */
export const LOGO = '/media/img/aMxWuH8.png';
