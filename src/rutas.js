/**
 * rutas.js — LA ÚNICA FUENTE DE VERDAD DE LAS RUTAS DEL SITIO.
 *
 * ── Por qué existe ──────────────────────────────────────────────────────────
 *
 * Un sitio multipágina tiene cinco cosas que hablan de las mismas rutas: el enrutador, el
 * menú, las migas de pan, el `sitemap.xml` y el prerender. Cuando cada una lleva su propia
 * lista, divergen. Y divergen SIEMPRE, porque nadie añade una ruta en cinco sitios a la vez.
 *
 * El resultado clásico es un sitemap que anuncia a Google páginas que devuelven 404. Google
 * lo trata como señal de sitio descuidado, y nadie se entera porque el sitio «funciona».
 *
 * Aquí las cinco leen de este archivo. Si una ruta no está aquí, no existe en ninguna parte.
 *
 * ── Por qué es DATO PURO, sin JSX y sin imports ─────────────────────────────
 *
 * Porque `scripts/sitemap.mjs` y `scripts/prerender.mjs` lo importan desde Node, donde no hay
 * JSX ni alias de Vite. En cuanto este archivo importara un componente, esos scripts tendrían
 * que mantener su propia copia de la lista, y estaríamos exactamente donde no queremos.
 *
 * La correspondencia `clave → componente` vive en `App.jsx`, que sí es React.
 *
 * ── La regla de `indexable` ─────────────────────────────────────────────────
 *
 * Una página que existe no es necesariamente una página que se anuncia. `/cotizar` funciona
 * pero no aporta nada en resultados de búsqueda; una página de evento sin contenido propio
 * sería contenido delgado. `indexable: false` las deja fuera del sitemap y les pone
 * `noindex`, sin quitarlas del sitio.
 */

/**
 * @typedef {Object} Ruta
 * @property {string}  ruta        Camino. `:slug` marca el segmento dinámico.
 * @property {string}  clave       Identificador estable. `App.jsx` lo usa para el componente.
 * @property {string}  nombre      Cómo se llama en el menú y en las migas.
 * @property {string} [padre]      Clave de la ruta madre. Encadena las migas.
 * @property {boolean} [menu]      Sale en la navegación principal.
 * @property {boolean} [indexable] Entra en el sitemap. Por defecto sí.
 * @property {number}  [prioridad] `<priority>` del sitemap, 0-1.
 * @property {string}  [coleccion] Tabla de la que salen los hijos de una ruta dinámica.
 * @property {string}  [soloSiHay] Solo entra en el sitemap si esa colección tiene filas.
 * @property {string}  [titulo]    `<title>`. Si falta se compone con el nombre.
 * @property {string}  [descripcion] `<meta name="description">`.
 */

/** @type {Ruta[]} */
export const RUTAS = [
  {
    ruta: '/',
    clave: 'home',
    nombre: 'Inicio',
    menu: true,
    prioridad: 1.0,
    titulo: 'Jardines Club Hípico · Salón de eventos y jardines en Xochimilco, CDMX',
    descripcion:
      'Ocho espacios en un mismo recinto de Xochimilco: jardines, salones, capilla, ' +
      'área infantil y hospedaje. De 30 a 600 invitados. Cotiza tu evento sin compromiso.',
  },

  // ── ESPACIOS ──────────────────────────────────────────────────────────────
  {
    ruta: '/espacios',
    clave: 'espacios',
    nombre: 'Espacios',
    padre: 'home',
    menu: true,
    prioridad: 0.9,
    titulo: 'Los 8 espacios · Jardines Club Hípico, Xochimilco',
    descripcion:
      'Compara los ocho espacios del recinto por capacidad, tipo y características: ' +
      'jardines al aire libre, salones, capilla, área infantil y estancias para hospedaje.',
  },
  {
    ruta: '/espacios/:slug',
    clave: 'espacio',
    nombre: 'Espacio',
    padre: 'espacios',
    coleccion: 'salones',
    prioridad: 0.8,
  },

  // ── EVENTOS ───────────────────────────────────────────────────────────────
  {
    ruta: '/eventos',
    clave: 'eventos',
    nombre: 'Eventos',
    padre: 'home',
    menu: true,
    prioridad: 0.9,
    titulo: 'Qué evento estás planeando · Jardines Club Hípico',
    descripcion:
      'Bodas, XV años, cumpleaños, eventos infantiles, corporativos y nocturnos en un ' +
      'recinto de Xochimilco con capilla, jardines y hospedaje.',
  },
  {
    // Las filas apagadas de `tipos_evento` NO se expanden: sin contenido propio, publicar
    // seis páginas parecidas es contenido duplicado, que penaliza en vez de sumar.
    ruta: '/eventos/:slug',
    clave: 'evento',
    nombre: 'Evento',
    padre: 'eventos',
    coleccion: 'tipos_evento',
    prioridad: 0.8,
  },

  // ── LO QUE SE OFRECE ──────────────────────────────────────────────────────
  {
    ruta: '/servicios',
    clave: 'servicios',
    nombre: 'Servicios',
    padre: 'home',
    menu: true,
    prioridad: 0.8,
    titulo: 'Servicios para tu evento · Jardines Club Hípico',
    descripcion:
      'Alimentos y bebidas, decoración y mobiliario, música e iluminación, coordinación ' +
      'y personal. Todo lo que se puede contratar dentro del recinto.',
  },
  {
    ruta: '/amenidades',
    clave: 'amenidades',
    nombre: 'Amenidades',
    padre: 'home',
    menu: true,
    prioridad: 0.7,
    titulo: 'Amenidades del recinto · Jardines Club Hípico',
    descripcion:
      'Estacionamiento, seguridad, wifi, áreas verdes y todo lo que tus invitados ' +
      'encuentran al llegar a Jardines Club Hípico, en Xochimilco.',
  },
  {
    ruta: '/galeria',
    clave: 'galeria',
    nombre: 'Galería',
    padre: 'home',
    menu: true,
    prioridad: 0.7,
    titulo: 'Galería de fotos y video · Jardines Club Hípico',
    descripcion:
      'Fotografías y video reales del recinto: jardines, salones, capilla y áreas ' +
      'comunes de Jardines Club Hípico en Xochimilco, CDMX.',
  },

  {
    // AVISOS. La página existe siempre, pero solo se ANUNCIA cuando hay algo que anunciar.
    //
    // `soloSiHay` se lo lee el prerender: si `jardines.anuncios` no tiene ninguna fila
    // publicada, la ruta no entra en el `sitemap.xml`. Una página vacía anunciada a Google es
    // contenido delgado, y además le dice al buscador que el sitio promete cosas que no tiene.
    //
    // El día que se cargue el primer aviso, entra sola en el siguiente despliegue.
    ruta: '/avisos',
    clave: 'avisos',
    nombre: 'Avisos',
    padre: 'home',
    menu: true,
    prioridad: 0.6,
    soloSiHay: 'anuncios',
    titulo: 'Avisos y novedades · Jardines Club Hípico',
    descripcion:
      'Lo que está pasando en Jardines Club Hípico: novedades del recinto, nuevos ' +
      'servicios y fechas que conviene tener a mano.',
  },

  // ── DECIDIR Y CONTRATAR ───────────────────────────────────────────────────
  {
    ruta: '/como-funciona',
    clave: 'como-funciona',
    nombre: 'Cómo funciona',
    padre: 'home',
    menu: true,
    prioridad: 0.7,
    titulo: 'Cómo apartar tu fecha · Jardines Club Hípico',
    descripcion:
      'Los tres pasos para reservar: cotiza, visita el recinto y aparta tu fecha. ' +
      'Sin letra chica.',
  },
  {
    ruta: '/preguntas-frecuentes',
    clave: 'preguntas-frecuentes',
    nombre: 'Preguntas frecuentes',
    padre: 'home',
    menu: true,
    prioridad: 0.7,
    titulo: 'Preguntas frecuentes · Jardines Club Hípico',
    descripcion:
      'Capacidad, horarios, estacionamiento, hospedaje, capilla y cómo apartar fecha. ' +
      'Las dudas que más nos preguntan, resueltas.',
  },
  {
    ruta: '/ubicacion',
    clave: 'ubicacion',
    nombre: 'Ubicación',
    padre: 'home',
    menu: true,
    prioridad: 0.8,
    titulo: 'Cómo llegar · Jardines Club Hípico, Xochimilco CDMX',
    descripcion:
      'Duraznos S/N, Santa Inés, Xochimilco, 16810 CDMX. Mapa, referencias y ' +
      'estacionamiento dentro del recinto.',
  },
  {
    ruta: '/contacto',
    clave: 'contacto',
    nombre: 'Contacto',
    padre: 'home',
    menu: true,
    prioridad: 0.7,
    titulo: 'Contacto · Jardines Club Hípico',
    descripcion:
      'Teléfono, WhatsApp y correo de Jardines Club Hípico. Atendemos dudas sobre ' +
      'disponibilidad, capacidades y visitas al recinto.',
  },
  {
    // Existe y funciona, pero no aporta nada en un buscador: nadie busca «formulario de
    // cotización». Fuera del sitemap, y con `noindex` para no diluir el resto.
    ruta: '/cotizar',
    clave: 'cotizar',
    nombre: 'Cotizar mi evento',
    padre: 'home',
    indexable: false,
    titulo: 'Cotiza tu evento · Jardines Club Hípico',
    descripcion: 'Cuéntanos qué estás planeando y te respondemos con una cotización.',
  },

  // ── ESPERA CONTENIDO ──────────────────────────────────────────────────────
  {
    // Hoy no existe ni un párrafo de historia real, y no se inventa. La ruta está declarada
    // para que el día que haya material solo haya que quitar el `indexable: false`.
    ruta: '/nosotros',
    clave: 'nosotros',
    nombre: 'Nosotros',
    padre: 'home',
    indexable: false,
    titulo: 'Nosotros · Jardines Club Hípico',
    descripcion: 'La historia de Jardines Club Hípico, en Xochimilco.',
  },
];

/** Las rutas fijas: las que no dependen de una fila de la base. */
export const RUTAS_FIJAS = RUTAS.filter((r) => !r.coleccion);

/** Las dinámicas: una plantilla que se expande con las filas de su colección. */
export const RUTAS_DINAMICAS = RUTAS.filter((r) => Boolean(r.coleccion));

/** Busca una ruta por su clave. */
export const rutaPorClave = (clave) => RUTAS.find((r) => r.clave === clave);

/** Lo que va en la navegación principal, en el orden en que está declarado. */
export const RUTAS_MENU = RUTAS.filter((r) => r.menu);

/**
 * La cadena de migas hasta una clave, de la raíz hacia abajo.
 * Corta a las 10 vueltas: un `padre` mal puesto colgaría el render sin decir por qué.
 */
export function migasDe(clave) {
  const cadena = [];
  let actual = rutaPorClave(clave);
  let vueltas = 0;
  while (actual && vueltas < 10) {
    cadena.unshift(actual);
    actual = actual.padre ? rutaPorClave(actual.padre) : undefined;
    vueltas += 1;
  }
  return cadena;
}

/** Sustituye `:slug` por un valor real. */
export const construyeRuta = (plantilla, slug) => plantilla.replace(':slug', slug);
