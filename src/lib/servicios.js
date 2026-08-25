/**
 * servicios.js — el reparto de servicios y amenidades a su sitio de verdad.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * LAS DOS TABLAS ESTÁN CRUZADAS
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * `jardines.servicios` y `jardines.amenidades` **no contienen lo que sus nombres prometen**.
 * Medido fila por fila el 2026-08-24 (ver `rediseño-sitio-web/11-MAPEO-SERVICIOS.md`):
 *
 *   · `amenidades` no tiene ni una amenidad: tiene inflables, magos, cámaras 360, pantallas
 *     led y grupos musicales. Eso son **atracciones contratables**.
 *   · `servicios` sí tiene amenidades: sanitarios, estacionamiento, jardines, área de bar.
 *     Eso son **características del recinto**.
 *
 * Si `/amenidades` se construyera leyendo la tabla `amenidades`, sería una página de
 * inflables y magos. Y `/servicios` sería una página sobre baños. Las dos dirían justo lo
 * contrario de lo que su dirección promete, y quien busque «¿tienen estacionamiento?» no lo
 * encontraría donde tiene que estar.
 *
 * **La regla: cada fila va donde le toca por LO QUE ES, no por la tabla en la que nació.**
 *
 * ── Por qué no se renombran las tablas y ya ─────────────────────────────────
 *
 * Porque el panel del CRM —que es otro repositorio, con su propio despliegue— escribe en
 * ellas por su nombre. Renombrarlas obligaría a coordinar dos despliegues sobre una base de
 * producción compartida para arreglar algo que aquí se arregla sin tocar nada. Resolverlo en
 * el código es aditivo y reversible; renombrar no lo es.
 *
 * ── Lo que NUNCA hace este archivo ──────────────────────────────────────────
 *
 * Tirar filas. Una fila cuyo título no reconozca cae en «Otros servicios» y se enseña igual.
 * Si se descartaran las desconocidas, el dueño añadiría un servicio desde el panel y no
 * aparecería nunca en el sitio, sin ningún error que lo delatara.
 */

/** Sin acentos, sin mayúsculas y sin espacios de sobra: los títulos se escriben a mano. */
// El rango de marcas combinantes (U+0300–U+036F) se construye, no se escribe.
//
// Escrito como literal dentro de la expresión regular serían dos caracteres INVISIBLES en el
// editor, y cualquier herramienta que reescriba o normalice el archivo puede comérselos sin
// dejar rastro: la expresión seguiría siendo válida, solo que ya no quitaría acentos. Y
// entonces «Cámara 360» dejaría de encontrar su familia, en silencio.
const ACENTOS = new RegExp(
  '[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']',
  'g',
);

const normaliza = (s = '') =>
  s.normalize('NFD').replace(ACENTOS, '').toLowerCase().replace(/\s+/g, ' ').trim();

export const FAMILIAS = [
  {
    clave: 'alimentos',
    nombre: 'Alimentos y bebidas',
    entradilla:
      'El menú de tres tiempos es el que más se contrata, pero no es el único camino: ' +
      'hay taquiza, buffet, barbacoa y servicio formal o informal según cómo quieras la fiesta.',
  },
  {
    clave: 'experiencias',
    nombre: 'Experiencias y entretenimiento',
    entradilla:
      'Es lo que separa a un recinto de un salón: aquí hay cosas que hacer, no solo un ' +
      'lugar donde sentarse.',
  },
  {
    clave: 'decoracion',
    nombre: 'Decoración y mobiliario',
    entradilla: 'El montaje se adapta al evento, no al revés.',
  },
  {
    clave: 'musica',
    nombre: 'Música, audio e iluminación',
    entradilla: 'Desde la pantalla led hasta el grupo en vivo.',
  },
  {
    clave: 'coordinacion',
    nombre: 'Coordinación y personal',
    entradilla:
      'La parte que nadie ve y que decide si el evento sale bien: quién monta, quién ' +
      'coordina y quién cuida la puerta.',
  },
  {
    clave: 'otros',
    nombre: 'Otros servicios',
    entradilla: null,
  },
];

/** Destinos que NO son una familia de `/servicios`. */
export const DESTINO = {
  AMENIDAD: 'amenidad',
  COMO_FUNCIONA: 'como-funciona',
  FUERA: 'fuera',
};

/**
 * Título normalizado → destino.
 *
 * Los títulos son los reales de producción. Un cambio de redacción en el panel hace que la
 * fila caiga en «Otros servicios»: sigue viéndose, solo pierde su agrupación. Ese es el modo
 * de fallo que se eligió a propósito — degradar, nunca desaparecer.
 */
const MAPA = {
  // ── De la tabla `servicios` ───────────────────────────────────────────────
  'actividades recreativas': 'experiencias',
  'entretenimiento para tu evento': 'experiencias',
  'mesa de honor personalizada': 'decoracion',
  'montajes hermosos y personalizables': 'decoracion',
  'asesoria en decoracion y logistica': 'coordinacion',
  'coordinacion de montaje y desmontaje': 'coordinacion',
  'seguridad privada durante el evento': 'coordinacion',

  // El dueño zanjó el 2026-08-24 que la sala para conferencias «no vive como salón, vive
  // como servicio». Así que no es un noveno espacio: es lo que se ofrece a una empresa.
  'sala para conferencias': 'coordinacion',

  // Características del recinto que nacieron en la tabla equivocada.
  'area de bar': DESTINO.AMENIDAD,
  'jardines naturales y vegetacion ornamental': DESTINO.AMENIDAD,
  'sanitarios amplios y limpios': DESTINO.AMENIDAD,
  'estacionamiento amplio para invitados': DESTINO.AMENIDAD,

  // Una política de la casa, no un servicio. Su sitio es la página que explica cómo se contrata.
  'flexibilidad de horarios segun tu evento': DESTINO.COMO_FUNCIONA,

  // Un tipo de evento, no un servicio. Vive en `/eventos/nocturnos`, cuando esa página tenga
  // contenido propio; hasta entonces no se enseña en un listado que promete servicios.
  'eventos nocturnos armalos a tu gusto': DESTINO.FUERA,

  // ── De la tabla `amenidades`, que en realidad son atracciones ─────────────
  alberca: 'experiencias',
  'inflables infantiles': 'experiencias',
  'futbolito inflable': 'experiencias',
  'set fotografico': 'experiencias',
  'camara 360': 'experiencias',
  gladiador: 'experiencias',
  aereobonji: 'experiencias',
  trampolin: 'experiencias',
  mago: 'experiencias',
  chinelo: 'experiencias',
  'auto clasico': 'experiencias',

  'mega pantalla led': 'musica',
  'pista pixel led': 'musica',
  'variedad en grupos musicales': 'musica',

  'mesa de dulces personalizada': 'alimentos',
};

/** A dónde va una fila. */
export const destinoDe = (fila) => MAPA[normaliza(fila?.titulo || fila?.nombre || '')] || 'otros';

/**
 * Reparte todo lo que hay en las dos tablas.
 * @returns {{familias: Array, amenidades: Array, politicas: Array}}
 */
export function reparte(servicios = [], amenidades = []) {
  const todo = [...servicios, ...amenidades];

  const porFamilia = new Map(FAMILIAS.map((f) => [f.clave, []]));
  const enAmenidades = [];
  const politicas = [];

  todo.forEach((fila) => {
    const destino = destinoDe(fila);
    if (destino === DESTINO.AMENIDAD) enAmenidades.push(fila);
    else if (destino === DESTINO.COMO_FUNCIONA) politicas.push(fila);
    else if (destino === DESTINO.FUERA) { /* su sitio es otra página */ }
    else porFamilia.get(destino)?.push(fila);
  });

  return {
    familias: FAMILIAS
      .map((f) => ({ ...f, items: porFamilia.get(f.clave) || [] }))
      .filter((f) => f.items.length > 0),
    amenidades: enAmenidades,
    politicas,
  };
}
