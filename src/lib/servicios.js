/**
 * servicios.js — el reparto de las dos tablas a su sitio de verdad.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * LAS DOS TABLAS ESTÁN CRUZADAS
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * `jardines.servicios` y `jardines.amenidades` **no contienen lo que sus nombres prometen**.
 * Medido fila por fila (ver `rediseño-sitio-web/11-MAPEO-SERVICIOS.md`):
 *
 *   · `amenidades` guarda inflables, magos, cámaras 360, pantallas led y grupos musicales.
 *   · `servicios` guarda sanitarios, estacionamiento, jardines y área de bar — que son
 *     características del recinto, no servicios— **junto a** los servicios de verdad.
 *
 * **La regla: cada fila va donde le toca por LO QUE ES, no por la tabla en la que nació.**
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * Y «AMENIDAD» SIGNIFICA LO QUE EL DUEÑO DICE QUE SIGNIFICA
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * La primera versión de este archivo mandaba las atracciones a `/servicios` y dejaba en
 * `/amenidades` solo las características del recinto, con el argumento de que una página
 * llamada «amenidades» no debería ser una lista de inflables.
 *
 * **Ese argumento estaba mal.** El dueño le llama amenidades a las atracciones —inflables,
 * cámara 360, mago, pista pixel led—, el panel se lo llama, y sobre todo **es lo que oye el
 * cliente cuando habla con él por WhatsApp**. Cuando alguien llega a la web después de esa
 * conversación y busca «amenidades», busca eso. Imponer un vocabulario más correcto pero ajeno
 * es hacer que el sitio hable un idioma distinto al del negocio.
 *
 * Así que el reparto quedó en tres, no en dos:
 *
 *   · **SERVICIOS** — lo que se contrata para que el evento SALGA: montaje, mesa de honor,
 *     asesoría, coordinación, seguridad, sala de conferencias.
 *   · **AMENIDADES** — lo que se contrata para que el evento sea MEJOR: las atracciones.
 *   · **DEL RECINTO** — lo que ya está ahí sin contratar nada: bar, jardines, sanitarios,
 *     estacionamiento. Va al final de `/amenidades`, como contraste: «esto lo sumas tú, esto
 *     ya viene». Y así quien busca «¿tienen estacionamiento?» lo encuentra.
 *
 * ── Por qué no se renombran las tablas y ya ─────────────────────────────────
 *
 * Porque el panel del CRM —otro repositorio, otro despliegue— escribe en ellas por su nombre.
 * Renombrarlas obligaría a coordinar dos despliegues sobre una base de producción compartida
 * para arreglar algo que aquí se arregla sin tocar nada.
 *
 * ── Lo que NUNCA hace este archivo ──────────────────────────────────────────
 *
 * Tirar filas. Una fila cuyo título no reconozca cae en «Otros» y se enseña igual. Si se
 * descartaran las desconocidas, el dueño añadiría algo desde el panel y no aparecería nunca en
 * el sitio, sin ningún error que lo delatara.
 */

// El rango de marcas combinantes (U+0300–U+036F) se construye, no se escribe: como literal
// serían dos caracteres INVISIBLES, y cualquier herramienta que normalice el archivo puede
// comérselos. La expresión seguiría siendo válida y dejaría de quitar acentos, en silencio.
const ACENTOS = new RegExp(
  '[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']',
  'g',
);

const normaliza = (s = '') =>
  s.normalize('NFD').replace(ACENTOS, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** A dónde va cada fila. */
export const DESTINO = {
  SERVICIO: 'servicio',
  AMENIDAD: 'amenidad',
  DEL_RECINTO: 'del-recinto',
  COMO_FUNCIONA: 'como-funciona',
  FUERA: 'fuera',
};

/**
 * Título normalizado → destino.
 *
 * Un cambio de redacción en el panel hace que la fila caiga en «Otros»: sigue viéndose, solo
 * pierde su agrupación. Ese es el modo de fallo elegido a propósito — degradar, nunca
 * desaparecer.
 */
const MAPA = {
  // ── SERVICIOS: lo que hace que el evento salga ────────────────────────────
  'montajes hermosos y personalizables para tu evento': DESTINO.SERVICIO,
  'mesa de honor personalizada': DESTINO.SERVICIO,
  'asesoria en decoracion y logistica': DESTINO.SERVICIO,
  'coordinacion de montaje y desmontaje': DESTINO.SERVICIO,
  'seguridad privada durante el evento': DESTINO.SERVICIO,
  // El dueño zanjó que la sala para conferencias «no vive como salón, vive como servicio».
  'sala para conferencias': DESTINO.SERVICIO,

  // ── AMENIDADES: lo que hace que el evento sea mejor ───────────────────────
  alberca: DESTINO.AMENIDAD,
  'inflables infantiles': DESTINO.AMENIDAD,
  'futbolito inflable': DESTINO.AMENIDAD,
  gladiador: DESTINO.AMENIDAD,
  aereobonji: DESTINO.AMENIDAD,
  trampolin: DESTINO.AMENIDAD,
  mago: DESTINO.AMENIDAD,
  chinelo: DESTINO.AMENIDAD,
  'auto clasico': DESTINO.AMENIDAD,
  'set fotografico': DESTINO.AMENIDAD,
  'camara 360': DESTINO.AMENIDAD,
  'mega pantalla led': DESTINO.AMENIDAD,
  'pista pixel led': DESTINO.AMENIDAD,
  'variedad en grupos musicales': DESTINO.AMENIDAD,
  'mesa de dulces personalizada': DESTINO.AMENIDAD,
  'actividades recreativas': DESTINO.AMENIDAD,
  'entretenimiento para tu evento': DESTINO.AMENIDAD,

  // ── DEL RECINTO: ya está ahí, sin contratar nada ──────────────────────────
  'area de bar': DESTINO.DEL_RECINTO,
  'jardines naturales y vegetacion ornamental': DESTINO.DEL_RECINTO,
  'sanitarios amplios y limpios': DESTINO.DEL_RECINTO,
  'estacionamiento amplio para invitados': DESTINO.DEL_RECINTO,

  // ── Ni servicio ni amenidad ───────────────────────────────────────────────
  // Una política de la casa. Su sitio es la página que explica cómo se contrata.
  'flexibilidad de horarios segun tu evento': DESTINO.COMO_FUNCIONA,
  // Un tipo de evento, no un servicio. Vive en `/eventos/nocturnos`.
  'eventos nocturnos armalos a tu gusto': DESTINO.FUERA,
};

/** A dónde va una fila. Lo desconocido cae en servicios, que es el cajón menos raro. */
export const destinoDe = (fila) =>
  MAPA[normaliza(fila?.titulo || fila?.nombre || '')] || DESTINO.SERVICIO;

/**
 * Reparte todo lo que hay en las dos tablas.
 *
 * Dentro de cada grupo se ordena por **cuántas imágenes tiene**, de más a menos. No es
 * cosmético: lo que se enseña primero es lo que tiene con qué enseñarse. Un servicio con
 * catorce fotos merece la pieza grande; uno sin ninguna se vería como un hueco arriba del todo.
 *
 * @returns {{servicios: any[], amenidades: any[], delRecinto: any[], politicas: any[]}}
 */
export function reparte(servicios = [], amenidades = []) {
  const grupos = { servicios: [], amenidades: [], delRecinto: [], politicas: [] };

  [...servicios, ...amenidades].forEach((fila) => {
    const d = destinoDe(fila);
    if (d === DESTINO.AMENIDAD) grupos.amenidades.push(fila);
    else if (d === DESTINO.DEL_RECINTO) grupos.delRecinto.push(fila);
    else if (d === DESTINO.COMO_FUNCIONA) grupos.politicas.push(fila);
    else if (d === DESTINO.SERVICIO) grupos.servicios.push(fila);
    // `FUERA` no se pierde: vive en su propia página.
  });

  const porFotos = (a, b) => cuantasFotos(b) - cuantasFotos(a);
  grupos.servicios.sort(porFotos);
  grupos.amenidades.sort(porFotos);
  grupos.delRecinto.sort(porFotos);

  return grupos;
}

/**
 * Todas las imágenes de una fila, sin repetir.
 *
 * **La columna se llama `imagenes_url`, no `imagenes`.** El shim la entrega como
 * `imagenesUrl`, y leerla con el nombre equivocado devuelve `undefined` sin ningún error: las
 * tarjetas enseñaban una sola foto aunque la fila tuviera catorce. Pasó, y no se notó hasta
 * mirar las columnas de la tabla.
 */
export function fotosDe(fila) {
  const extra = Array.isArray(fila?.imagenesUrl) ? fila.imagenesUrl : [];
  return [fila?.imagenUrl, ...extra].filter(Boolean).filter((u, i, a) => a.indexOf(u) === i);
}

export const cuantasFotos = (fila) => fotosDe(fila).length;
