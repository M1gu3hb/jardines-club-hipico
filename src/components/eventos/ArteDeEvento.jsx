/**
 * ArteDeEvento — un dibujo por tipo de evento, hecho aquí.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * QUÉ PROBLEMA RESUELVE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Las seis filas de `tipos_evento` **no tienen fotografía** (`imagen_hero` vacío), así que sus
 * tarjetas eran seis rectángulos de texto idénticos. Y el dueño pidió lo contrario: *«a las
 * cards de cada tipo de evento ponle algo alusivo, alguna imagen, algo que tú crees»*.
 *
 * ── Por qué un dibujo y no una foto ─────────────────────────────────────────
 *
 * Porque una foto tendría que ser DE AQUÍ. La regla del proyecto es tajante: nada de bancos de
 * imágenes, ninguna foto de otro lugar. Y de las 69 piezas de la galería ninguna está
 * etiquetada todavía por tipo de evento, así que elegir yo cuál es «la de bodas» sería
 * adivinar sobre un recinto que no conozco.
 *
 * Un dibujo no finge ser una fotografía del sitio. Dice «esto es una boda» sin mentir sobre
 * cómo se ve una boda aquí — y el día que las fotos estén etiquetadas, la foto manda y el
 * dibujo se retira solo (ver `QueEstasPlaneando`).
 *
 * ── Por qué son de línea y en dorado ────────────────────────────────────────
 *
 * Porque tienen que verse como parte del sitio y no como iconos pegados. Un trazo fino en el
 * dorado de la marca sobre el fondo oscuro es el mismo lenguaje que ya usan los filetes, los
 * bordes de las tarjetas y el hilo bajo los antetítulos. Un icono relleno y de color plano
 * rompería eso.
 *
 * Todos comparten `viewBox`, grosor de trazo y aire alrededor, así que las seis tarjetas se
 * leen como una familia y no como seis descargas distintas.
 *
 * ── Accesibilidad ───────────────────────────────────────────────────────────
 *
 * Son decorativos: `aria-hidden`. El nombre del evento ya está en el `<h3>` de la tarjeta, y
 * describir «dos anillos entrelazados» a quien no ve la pantalla no añade nada — repetiría
 * «Bodas» con más palabras.
 */

/**
 * Los atributos de trazo que comparten los seis dibujos: mismo grosor, mismos remates.
 *
 * Va sin tipar a propósito. Se reparte con `{...TRAZO}` entre `<path>`, `<circle>`, `<rect>` y
 * `<ellipse>`, que en TypeScript son cuatro tipos distintos; atarlo a uno haría fallar los
 * otros tres. Lo que garantiza que las seis ilustraciones se vean como una familia es que
 * TODAS beban de aquí, y eso se ve leyendo el archivo.
 *
 * @type {any}
 */
const TRAZO = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.15,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

/** Dos anillos entrelazados bajo un arco de ceremonia. */
function Bodas() {
  return (
    <>
      <path d="M42 74 C42 44, 158 44, 158 74" {...TRAZO} opacity="0.35" />
      <circle cx="88" cy="76" r="17" {...TRAZO} />
      <circle cx="112" cy="76" r="17" {...TRAZO} />
      <path d="M100 45 l4 7 -4 7 -4 -7 z" {...TRAZO} opacity="0.7" />
      <path d="M56 96 q6 -9 12 0" {...TRAZO} opacity="0.3" />
      <path d="M132 96 q6 -9 12 0" {...TRAZO} opacity="0.3" />
    </>
  );
}

/** Una tiara: el símbolo de los quince, sin caer en el número escrito. */
function XVAnos() {
  return (
    <>
      <path d="M62 88 L70 56 L86 74 L100 48 L114 74 L130 56 L138 88 Z" {...TRAZO} />
      <path d="M62 88 L138 88" {...TRAZO} opacity="0.55" />
      <circle cx="70" cy="52" r="3" {...TRAZO} />
      <circle cx="100" cy="44" r="3.4" {...TRAZO} />
      <circle cx="130" cy="52" r="3" {...TRAZO} />
      <circle cx="100" cy="78" r="4" {...TRAZO} opacity="0.6" />
    </>
  );
}

/** Un pastel de dos pisos con sus velas. */
function Cumpleanos() {
  return (
    <>
      <path d="M74 96 L74 78 Q100 72 126 78 L126 96 Z" {...TRAZO} />
      <path d="M64 96 L64 96 L136 96" {...TRAZO} opacity="0.55" />
      <path d="M82 78 L82 64 Q100 59 118 64 L118 78" {...TRAZO} />
      <path d="M100 59 L100 48" {...TRAZO} />
      <path d="M100 48 q-4 -5 0 -9 q4 4 0 9" {...TRAZO} opacity="0.85" />
      <path d="M86 64 L86 56" {...TRAZO} opacity="0.6" />
      <path d="M114 64 L114 56" {...TRAZO} opacity="0.6" />
      <path d="M74 86 q13 -6 26 0 q13 6 26 0" {...TRAZO} opacity="0.35" />
    </>
  );
}

/** Globos: lo que un niño reconoce antes que cualquier otra cosa. */
function Infantiles() {
  return (
    <>
      <ellipse cx="82" cy="60" rx="15" ry="18" {...TRAZO} />
      <path d="M82 78 L82 84 q-3 6 3 10 q6 -6 0 -12" {...TRAZO} opacity="0.7" />
      <ellipse cx="116" cy="68" rx="12" ry="15" {...TRAZO} opacity="0.8" />
      <path d="M116 83 L116 88 q3 5 -2 8" {...TRAZO} opacity="0.55" />
      <path d="M60 98 L150 98" {...TRAZO} opacity="0.3" />
      <path d="M140 52 l3 6 6 1 -4.5 4.5 1 6.5 -5.5 -3 -5.5 3 1 -6.5 -4.5 -4.5 6 -1 z" {...TRAZO} opacity="0.6" />
    </>
  );
}

/** Una pantalla de proyección y sillas: la sala de conferencias que sí se ofrece. */
function Corporativos() {
  return (
    <>
      <rect x="64" y="42" width="72" height="42" rx="2" {...TRAZO} />
      <path d="M74 72 L88 60 L98 68 L112 54 L126 66" {...TRAZO} opacity="0.6" />
      <path d="M100 84 L100 92" {...TRAZO} opacity="0.55" />
      <path d="M86 96 L114 96" {...TRAZO} opacity="0.55" />
      <circle cx="54" cy="92" r="4" {...TRAZO} opacity="0.5" />
      <circle cx="146" cy="92" r="4" {...TRAZO} opacity="0.5" />
    </>
  );
}

/** Luna, estrellas y la línea del jardín de noche. */
function Nocturnos() {
  return (
    <>
      <path d="M112 44 a20 20 0 1 0 18 30 a22 22 0 0 1 -18 -30 z" {...TRAZO} />
      <path d="M66 56 l2.5 5 5 .8 -3.7 3.7 .9 5.3 -4.7 -2.5 -4.7 2.5 .9 -5.3 -3.7 -3.7 5 -.8 z" {...TRAZO} opacity="0.65" />
      <circle cx="146" cy="52" r="1.8" {...TRAZO} opacity="0.7" />
      <circle cx="58" cy="80" r="1.4" {...TRAZO} opacity="0.5" />
      <path d="M46 98 q18 -10 36 0 q18 10 36 0 q18 -10 36 0" {...TRAZO} opacity="0.35" />
    </>
  );
}

const POR_SLUG = {
  bodas: Bodas,
  'xv-anos': XVAnos,
  cumpleanos: Cumpleanos,
  infantiles: Infantiles,
  corporativos: Corporativos,
  nocturnos: Nocturnos,
};

/**
 * @param {Object} props
 * @param {string} props.slug      Slug de `tipos_evento`. Si no hay dibujo para él, no pinta nada.
 * @param {string} [props.className]
 */
export default function ArteDeEvento({ slug, className = '' }) {
  const Dibujo = POR_SLUG[slug];

  // Un tipo de evento nuevo, creado desde el panel, no tendrá dibujo. Se devuelve `null` y la
  // tarjeta cae en su versión de solo texto: nunca un hueco con un interrogante dentro.
  if (!Dibujo) return null;

  return (
    <div
      aria-hidden="true"
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
    >
      {/* El halo. Separa el dibujo del negro plano y le da la profundidad que tienen el resto
          de las superficies del sitio. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 45%, rgba(201,168,76,0.13) 0%, rgba(201,168,76,0.04) 42%, transparent 72%)',
        }}
      />
      <svg
        viewBox="0 0 200 120"
        className="relative h-full w-full text-[#C9A84C]/70 transition-colors duration-500 group-hover:text-[#C9A84C]"
        preserveAspectRatio="xMidYMid meet"
      >
        <Dibujo />
      </svg>
    </div>
  );
}
