/**
 * capacidad.js — cómo se decide si un espacio le sirve a un evento.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * LO MÁS IMPORTANTE DE ESTE ARCHIVO
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * **`capacidadMin` NO es un mínimo de renta.** Nunca lo fue.
 *
 * Preguntado el dueño directamente, el 2026-08-24: *«no hay capacidad mínima de renta»*. El
 * número pequeño es una **recomendación estética** — por debajo de él *«se ve medio vacío el
 * salón»*. Y aun así rentan por debajo: el Salón de los Espejos se ha rentado para 60
 * personas y el Eclipse para 40, *«lo demás se rellena con sillones, con salitas»*.
 *
 * Un comparador que descarte un espacio por no llegar a ese número estaría rechazando rentas
 * que el negocio ACEPTA HOY CON GUSTO. El filtro habría convertido un dato interno mal
 * entendido en pérdida de ingresos, en silencio y sin que nadie lo notara nunca.
 *
 * Así que aquí:
 *
 *   · **El máximo sí descarta.** Si no caben, no caben — y eso hay que decirlo antes de que
 *     alguien se ilusione.
 *   · **El mínimo NUNCA descarta.** Marca el espacio como «se adapta» y explica cómo.
 *   · **El máximo que descarta es el REAL**, no el anunciado. Jardines se anuncia como 600 y
 *     admiten ~1 000. Sin esa distinción, un evento de 800 personas se iría a la competencia
 *     porque nuestra propia web le dijo que no cabía.
 *
 * El hospedaje queda fuera del cálculo: las Estancias son para dormir, no para el evento.
 */

/** @typedef {'ideal'|'se-adapta'|'no-cabe'|'no-aplica'} Ajuste */

/**
 * El tipo va escrito con los literales, no deducido.
 *
 * Sin esta anotacion TypeScript deduce `string` para cada valor, y entonces NINGUN retorno de
 * `ajusteDe` encaja con `Ajuste`. Escribirlo aqui ademas hace que un error de dedo
 * —`'se_adapta'` en vez de `'se-adapta'`— falle al compilar en lugar de fallar en pantalla.
 *
 * @type {{ IDEAL: 'ideal', SE_ADAPTA: 'se-adapta', NO_CABE: 'no-cabe', NO_APLICA: 'no-aplica' }}
 */
export const AJUSTE = {
  IDEAL: 'ideal',
  SE_ADAPTA: 'se-adapta',
  NO_CABE: 'no-cabe',
  NO_APLICA: 'no-aplica',
};

/** Lo que de verdad cabe: el real si está, y si no, el anunciado. */
export const topeReal = (salon) => salon?.capacidadMaximaReal || salon?.capacidadMax || null;

/**
 * Cómo le queda un espacio a un número de invitados.
 * @returns {{ajuste: Ajuste, nota?: string}}
 */
export function ajusteDe(salon, personas) {
  if (!salon || salon.tipoEspacio === 'hospedaje') {
    return { ajuste: AJUSTE.NO_APLICA };
  }
  if (!personas || personas <= 0) {
    return { ajuste: AJUSTE.IDEAL };
  }

  const tope = topeReal(salon);
  if (tope && personas > tope) {
    return {
      ajuste: AJUSTE.NO_CABE,
      nota: `Su tope es de ${tope} personas.`,
    };
  }

  const min = salon.capacidadMin;
  if (min && personas < min) {
    return {
      ajuste: AJUSTE.SE_ADAPTA,
      nota:
        `Se ve mejor a partir de ${min} personas, pero se puede: el montaje se ajusta con ` +
        'salas lounge y sillones para que el espacio no se sienta vacío.',
    };
  }

  // Se anuncia hasta `capacidadMax` pero cabe hasta el real. En esa franja sí cabe, y merece
  // dicho explícitamente, porque el número que la gente vio en la ficha decía otra cosa.
  if (salon.capacidadMax && personas > salon.capacidadMax) {
    return {
      ajuste: AJUSTE.IDEAL,
      nota: `Por encima de lo que solemos anunciar (${salon.capacidadMax}), pero caben.`,
    };
  }

  return { ajuste: AJUSTE.IDEAL };
}

/**
 * Ordena los espacios para un número de invitados: primero los que le quedan bien, luego los
 * que se adaptan, y al final los que no caben — que se enseñan igual, en gris, porque saber
 * qué NO sirve también es información útil cuando se está comparando.
 */
export function ordenaPorAjuste(salones = [], personas) {
  const peso = { [AJUSTE.IDEAL]: 0, [AJUSTE.SE_ADAPTA]: 1, [AJUSTE.NO_APLICA]: 2, [AJUSTE.NO_CABE]: 3 };
  return [...salones]
    .map((s) => ({ salon: s, ...ajusteDe(s, personas) }))
    .sort((a, b) => peso[a.ajuste] - peso[b.ajuste] || (a.salon.orden || 0) - (b.salon.orden || 0));
}

/** El rango recomendado, en texto, para enseñarlo en una ficha. */
export function rangoTexto(salon) {
  const { capacidadMin: min, capacidadMax: max } = salon || {};
  if (min && max) return `${min} a ${max}`;
  if (max) return `hasta ${max}`;
  if (min) return `desde ${min}`;
  return null;
}

export const ETIQUETA_TIPO = {
  salon: 'Salón',
  aire_libre: 'Al aire libre',
  ceremonia: 'Ceremonia',
  infantil: 'Área infantil',
  hospedaje: 'Hospedaje',
};
