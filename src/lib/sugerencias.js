/**
 * sugerencias.js — qué proponerle a alguien según el evento que está planeando.
 *
 * ── Para qué es esto ────────────────────────────────────────────────────────
 *
 * Lo pidió el dueño, y con un motivo muy concreto:
 *
 *   *«Una vez que seleccionen el tipo de evento, sugiérele servicios o amenidades. Me ahorraría
 *   mucho tiempo, la verdad, estárselos vendiendo. Si lo eligen y lo mandan en el formulario,
 *   ya sé que eso quieren, o al menos lo pensaron.»*
 *
 * O sea: no es un adorno del formulario. Es mover una parte de la conversación comercial —la
 * de enumerar qué existe— del WhatsApp del dueño a un momento en el que la persona está
 * imaginando su fiesta y tiene toda la atención puesta ahí.
 *
 * Y para quien rellena el formulario también gana: casi nadie sabe que en este recinto hay
 * cámara 360, chinelos o una alberca. Enseñarlo justo cuando dice «XV años» es informar, no
 * vender.
 *
 * ── DE DÓNDE SALEN LOS NOMBRES ──────────────────────────────────────────────
 *
 * De `jardines.servicios` y `jardines.amenidades`, tal cual. **Aquí no se inventa ni un
 * servicio.** Lo único que este archivo aporta es el CRITERIO de a qué evento le pega cada uno.
 *
 * Por eso el emparejamiento se hace contra las filas que llegan de la base y no contra una
 * lista escrita a mano: si el dueño borra un servicio del panel, deja de sugerirse solo. Si
 * añade uno nuevo, no se sugiere hasta que alguien decida a qué evento pertenece — que es el
 * comportamiento correcto, porque esa decisión es comercial y no la puede tomar el código.
 *
 * ── Lo que NO hace ──────────────────────────────────────────────────────────
 *
 * No pone precios, no promete disponibilidad y no da nada por contratado. Es una lista de
 * «esto también existe, ¿te interesa?». Lo que se elija viaja en la solicitud como interés,
 * no como pedido.
 */

/** Sin acentos ni mayúsculas: los títulos se comparan contra texto escrito a mano. */
const ACENTOS = new RegExp(
  '[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']',
  'g',
);
const normaliza = (s = '') =>
  s.normalize('NFD').replace(ACENTOS, '').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Qué se sugiere para cada tipo de evento, por título normalizado.
 *
 * El orden importa: lo primero de cada lista es lo que más se contrata para ese evento, y es
 * lo que se enseña primero. Una lista de quince casillas en desorden no la lee nadie.
 */
const POR_EVENTO = {
  Boda: [
    'mesa de honor personalizada',
    'montajes hermosos y personalizables para tu evento',
    'asesoria en decoracion y logistica',
    'variedad en grupos musicales',
    'auto clasico',
    'camara 360',
    'set fotografico',
    'mega pantalla led',
    'seguridad privada durante el evento',
    'area de bar',
  ],
  'XV Años': [
    'pista pixel led',
    'mesa de dulces personalizada',
    'camara 360',
    'variedad en grupos musicales',
    'mega pantalla led',
    'set fotografico',
    'chinelo',
    'mesa de honor personalizada',
    'montajes hermosos y personalizables para tu evento',
  ],
  'Cumpleaños': [
    'mesa de dulces personalizada',
    'camara 360',
    'pista pixel led',
    'mago',
    'entretenimiento para tu evento',
    'area de bar',
  ],
  Infantil: [
    'inflables infantiles',
    'trampolin',
    'futbolito inflable',
    'gladiador',
    'aereobonji',
    'mago',
    'alberca',
    'actividades recreativas',
    'mesa de dulces personalizada',
  ],
  Empresarial: [
    'sala para conferencias',
    'mega pantalla led',
    'coordinacion de montaje y desmontaje',
    'seguridad privada durante el evento',
    'asesoria en decoracion y logistica',
    'area de bar',
  ],
  Otro: [
    'montajes hermosos y personalizables para tu evento',
    'entretenimiento para tu evento',
    'area de bar',
    'asesoria en decoracion y logistica',
  ],
};

/**
 * Lo que se sugiere por TAMAÑO, no por tipo.
 *
 * Un evento de cuatrocientas personas tiene problemas que uno de ochenta no tiene, y son los
 * mismos sea boda o sea posada de empresa. Va aparte a propósito: mezclarlo con lo anterior
 * obligaría a repetir estas dos entradas en las seis listas.
 */
const POR_TAMANO = [
  {
    desde: 250,
    titulos: ['seguridad privada durante el evento'],
    motivo: 'A partir de cierto tamaño, la puerta deja de cuidarse sola.',
  },
];

/**
 * Sugerencias para un evento.
 *
 * @param {string} tipoEvento La opción del formulario, tal cual ("Boda", "XV Años"…).
 * @param {number} personas   Invitados aproximados. 0 si aún no lo dice.
 * @param {any[]} disponibles Filas de `servicios` y `amenidades` que llegaron de la base.
 * @returns {{items: any[], porTamano: string[]}}
 */
export function sugerenciasPara(tipoEvento, personas, disponibles = []) {
  if (!tipoEvento) return { items: [], porTamano: [] };

  const orden = POR_EVENTO[tipoEvento] || POR_EVENTO.Otro;

  // Se indexa lo que EXISTE, y se recorre el orden comercial. Al revés —recorrer lo disponible
  // y preguntar si está en la lista— se perdería el orden, que es justo lo que hace que las
  // primeras tres casillas sean las que de verdad importan.
  const indice = new Map();
  disponibles.forEach((f) => {
    const t = normaliza(f?.titulo || f?.nombre || '');
    if (t && !indice.has(t)) indice.set(t, f);
  });

  const items = orden.map((t) => indice.get(t)).filter(Boolean);

  const porTamano = POR_TAMANO
    .filter((r) => personas >= r.desde)
    .filter((r) => r.titulos.some((t) => indice.has(t)))
    // Solo se avisa de lo que NO estaba ya sugerido para ese tipo de evento: repetir la misma
    // recomendación dos veces en la misma pantalla resta credibilidad a las dos.
    .filter((r) => !r.titulos.every((t) => orden.includes(t)))
    .map((r) => r.motivo);

  return { items, porTamano };
}

/**
 * Convierte lo elegido en una línea de texto para la solicitud.
 *
 * ── Por qué texto y no una columna nueva ────────────────────────────────────
 *
 * Porque `jardines.solicitudes` **no admite INSERT directo**: la única vía es la RPC
 * `solicitud_crear`, que valida, aplica límite por IP y genera el folio en el servidor. Añadir
 * un campo obliga a tocar la RPC **y** el trigger de saneo, y ésa es la única vía de escritura
 * pública que existe: si se rompe, se cae el formulario, que es lo que da de comer.
 *
 * Así que de momento el interés viaja dentro del campo libre, claramente separado. El dueño lo
 * ve en el correo desde el primer día —que es lo que pidió— sin arriesgar el camino de pago.
 * La columna `contexto` en condiciones se hace después, con su ensayo aparte.
 */
export function comoTexto(seleccionados) {
  if (!seleccionados || seleccionados.length === 0) return '';
  return 'Le interesa: ' + seleccionados.join(', ') + '.';
}
