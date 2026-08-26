/**
 * rejilla.js — que la última fila de una rejilla quede centrada.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * EL PROBLEMA
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Cinco tarjetas en tres columnas dejan la segunda fila con dos pegadas a la izquierda y un
 * hueco a la derecha. El dueño lo vio y lo describió exactamente por lo que parece: *«que no
 * se vean así como que falta uno»*. Y eso es: un hueco al final de una rejilla no se lee como
 * «se acabó», se lee como «aquí falta algo» — o peor, como que la página está rota.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * POR QUÉ NO SE PUEDE CENTRAR EN UNA REJILLA DE TRES COLUMNAS
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Porque centrar dos elementos entre tres columnas exige empezar en la columna 1.5, y las
 * columnas no tienen mitades. La solución es dar a la rejilla el DOBLE de columnas y que cada
 * tarjeta ocupe dos: con seis columnas, esas dos tarjetas empiezan en la 2 y terminan en la 5,
 * centradas de verdad. Es el mismo truco de siempre para esto, y no necesita nada más que
 * clases.
 *
 * Se aplica en dos escalones porque hay dos rejillas distintas: cuatro columnas en tabletas
 * —dos tarjetas por fila— y seis en escritorio —tres por fila—.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * EL DETALLE QUE MUERDE: `sm:` NO SE APAGA SOLO
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Las clases de Tailwind son de mínimo hacia arriba: un `sm:col-start-2` sigue mandando en
 * escritorio. Así que la tarjeta que hay que centrar en tabletas arrastraría ese arranque
 * hasta la rejilla de seis columnas y desplazaría toda la última fila.
 *
 * Por eso, cuando una tarjeta lleva arranque en `sm` y NO le toca llevarlo en `lg`, se le pone
 * `lg:col-start-auto` explícito para cancelarlo. Sin esa línea el arreglo de un tamaño rompe
 * el otro, que es la clase de fallo que solo se ve en el aparato que uno no tiene delante.
 */

/** Las clases fijas de la rejilla. Aquí para que las dos páginas no se separen con el tiempo. */
export const REJILLA_CENTRADA = 'grid gap-4 grid-cols-1 sm:grid-cols-4 lg:grid-cols-6';

/** Lo que lleva cada celda. Sin `col-span` en móvil: ahí la rejilla es de una sola columna. */
export const CELDA_CENTRADA = 'sm:col-span-2';

/**
 * El arranque de columna de una tarjeta, para que la última fila quede centrada.
 *
 * Las clases se escriben LITERALES y no se componen con plantillas: Tailwind lee el código
 * fuente como texto plano, y una clase construida a trozos no existiría en el CSS final.
 *
 * @param {number} indice  Posición de la tarjeta, empezando en 0.
 * @param {number} total   Cuántas tarjetas hay en la rejilla.
 * @returns {string}       Clases, o cadena vacía si esta tarjeta no necesita nada.
 */
export function arranqueCentrado(indice, total) {
  const clases = [];

  const restoSm = total % 2; // lo que sobra en la última fila de DOS por fila
  const restoLg = total % 3; // lo que sobra en la última fila de TRES por fila
  const primeraDeLaUltimaSm = restoSm ? total - restoSm : -1;
  const primeraDeLaUltimaLg = restoLg ? total - restoLg : -1;

  if (indice === primeraDeLaUltimaSm) clases.push('sm:col-start-2');

  if (indice === primeraDeLaUltimaLg) {
    // Una sola tarjeta suelta se centra empezando en la columna 3 de 6; dos, en la 2.
    clases.push(restoLg === 1 ? 'lg:col-start-3' : 'lg:col-start-2');
  } else if (indice === primeraDeLaUltimaSm) {
    clases.push('lg:col-start-auto');
  }

  return clases.join(' ');
}
