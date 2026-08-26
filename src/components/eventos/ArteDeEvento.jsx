/**
 * ArteDeEvento — una escena dibujada para cada tipo de evento.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * QUÉ CAMBIÓ Y POR QUÉ
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * La primera versión eran iconos: un trazo fino, sin relleno, sin fondo. Cumplían —se entendía
 * qué era cada uno— y no hacían nada más. El dueño pidió lo que ya había visto funcionar en
 * otro sitio suyo: *«mantén la estética dorada, pero dale más vida, hazme mejores imágenes»*.
 *
 * Lo que separa un icono de una ilustración no es el número de líneas: es la PROFUNDIDAD.
 * Estas escenas tienen tres planos —fondo, motivo y suelo— con un halo detrás, relleno en
 * degradado sobre el dorado de la marca y una viñeta que cierra los bordes. Eso las hace
 * parecer un espacio con algo dentro, en vez de un símbolo sobre un rectángulo.
 *
 * ── Por qué siguen siendo dibujos y no fotografías ──────────────────────────
 *
 * Porque una foto tendría que ser DE AQUÍ: la regla del proyecto prohíbe bancos de imágenes. Y
 * de las 69 piezas de la galería ninguna está etiquetada por tipo de evento, así que elegir yo
 * cuál es «la de bodas» sería adivinar sobre un recinto que no conozco.
 *
 * El día que el dueño suba una fotografía a `tipos_evento.imagen_hero`, esa tarjeta cambia
 * sola: la foto manda y el dibujo se retira. Ver `QueEstasPlaneando` y `Eventos`.
 *
 * ── Por qué las catorce comparten el mismo marco ────────────────────────────
 *
 * Catorce ilustraciones hechas cada una a su aire se leen como catorce descargas distintas.
 * Compartiendo `viewBox`, halo, suelo, viñeta y paleta se leen como una familia — y una
 * familia dice «esto es un sitio cuidado», que es justo lo que tienen que transmitir.
 *
 * ── Peso ────────────────────────────────────────────────────────────────────
 *
 * Son SVG en el propio JavaScript: cero peticiones de red, cero espera, y se ven nítidas a
 * cualquier tamaño y en cualquier densidad de pantalla. En una página cuyo problema real era
 * la carga de imágenes, eso no es un detalle menor.
 */

/** El trazo común. Sin tipar: se reparte entre `path`, `circle`, `rect` y `ellipse`. @type {any} */
const T = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.15,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

/** Trazo fino, para lo que va al fondo. @type {any} */
const TF = { ...T, strokeWidth: 0.75, opacity: 0.45 };

/** Relleno tenue, para dar cuerpo sin tapar el trazo. @type {any} */
const R = { fill: 'url(#oro-suave)', stroke: 'none' };

// ─────────────────────────────────────────────────────────────────────────────
// PIEZAS COMPARTIDAS — lo que hace que las catorce parezcan de la misma mano
// ─────────────────────────────────────────────────────────────────────────────

/** El suelo con su sombra. Ancla la escena para que el motivo no flote. */
function Suelo({ y = 96 }) {
  return (
    <>
      <path d={`M18 ${y} L182 ${y}`} stroke="url(#linea-suelo)" strokeWidth="1" fill="none" />
      <ellipse cx="100" cy={y} rx="52" ry="4" fill="url(#sombra)" />
    </>
  );
}

/** Motas de luz. Dan aire y profundidad sin dibujar nada concreto. */
function Motas({ puntos }) {
  return (
    <>
      {puntos.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="currentColor" opacity={0.18 + (i % 3) * 0.1} />
      ))}
    </>
  );
}

/** Una guirnalda de luces colgada, que aparece en las escenas de fiesta. */
function Guirnalda({ y = 26, caida = 14 }) {
  const desde = 24;
  const hasta = 176;
  return (
    <>
      <path d={`M${desde} ${y} Q100 ${y + caida} ${hasta} ${y}`} {...TF} />
      {[0.18, 0.36, 0.5, 0.64, 0.82].map((t, i) => (
        <circle
          key={i}
          cx={desde + (hasta - desde) * t}
          cy={y + caida * 4 * t * (1 - t) + 3}
          r="1.7"
          fill="currentColor"
          opacity="0.55"
        />
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LAS CATORCE ESCENAS
// ─────────────────────────────────────────────────────────────────────────────

/** Bodas — el arco de flores, los anillos y el pasillo. */
function Bodas() {
  return (
    <>
      <path d="M46 96 C46 40, 154 40, 154 96 L146 96 C146 48, 54 48, 54 96 Z" {...R} />
      <path d="M46 96 C46 40, 154 40, 154 96" {...TF} />
      <Motas puntos={[[58, 60, 2.2], [74, 46, 1.8], [100, 40, 2.4], [126, 46, 1.8], [142, 60, 2.2], [50, 76, 1.5], [150, 76, 1.5]]} />
      <path d="M78 96 L94 62 L106 62 L122 96" {...TF} />
      <circle cx="90" cy="76" r="12.5" {...T} />
      <circle cx="110" cy="76" r="12.5" {...T} />
      <path d="M100 56 l3.2 5.6 -3.2 5.6 -3.2 -5.6 z" {...T} />
      <Suelo />
    </>
  );
}

/** XV años — la tiara sobre el vuelo del vestido. */
function XVAnos() {
  return (
    <>
      <path d="M100 52 L74 96 L126 96 Z" {...R} />
      <path d="M100 52 L74 96 M100 52 L126 96 M78 88 Q100 82 122 88" {...T} />
      <path d="M76 40 L84 24 L92 34 L100 18 L108 34 L116 24 L124 40 Z" {...T} />
      <path d="M76 40 L124 40" {...TF} />
      <circle cx="84" cy="21" r="2" {...T} />
      <circle cx="100" cy="15" r="2.4" {...T} />
      <circle cx="116" cy="21" r="2" {...T} />
      <Motas puntos={[[60, 44, 1.6], [140, 44, 1.6], [66, 66, 1.3], [134, 66, 1.3]]} />
      <Suelo />
    </>
  );
}

/** Cumpleaños — el pastel de dos pisos bajo la guirnalda. */
function Cumpleanos() {
  return (
    <>
      <Guirnalda y={24} />
      <path d="M72 96 L72 76 Q100 70 128 76 L128 96 Z" {...R} />
      <path d="M72 96 L72 76 Q100 70 128 76 L128 96" {...T} />
      <path d="M82 76 L82 60 Q100 55 118 60 L118 76" {...T} />
      <path d="M72 86 q14 -6 28 0 q14 6 28 0" {...TF} />
      <path d="M100 55 L100 44 M88 60 L88 51 M112 60 L112 51" {...T} />
      <path d="M100 44 q-4.5 -5.5 0 -10 q4.5 4.5 0 10" fill="url(#oro-vivo)" stroke="none" />
      <circle cx="88" cy="49" r="1.9" fill="url(#oro-vivo)" />
      <circle cx="112" cy="49" r="1.9" fill="url(#oro-vivo)" />
      <Suelo />
    </>
  );
}

/** Infantiles — los globos y el castillo inflable. */
function Infantiles() {
  return (
    <>
      <path d="M112 96 L112 72 Q140 60 168 72 L168 96 Z" {...R} />
      <path d="M112 96 L112 72 Q140 60 168 72 L168 96 M132 96 L132 82 Q140 78 148 82 L148 96" {...T} />
      <path d="M118 68 l4 -8 4 8 M136 62 l4 -8 4 8 M154 68 l4 -8 4 8" {...TF} />
      <ellipse cx="62" cy="46" rx="14" ry="17" {...T} />
      <path d="M62 63 L62 70 q-4 8 3 13" {...TF} />
      <ellipse cx="88" cy="58" rx="10" ry="12.5" {...TF} />
      <path d="M88 70.5 L88 78 q3 6 -2 9" {...TF} />
      <path d="M40 40 l2.6 5.2 5.2 .9 -3.9 3.8 .9 5.4 -4.8 -2.6 -4.8 2.6 .9 -5.4 -3.9 -3.8 5.2 -.9 z" {...T} />
      <Suelo />
    </>
  );
}

/** Corporativos — la pantalla, el atril y las filas de sillas. */
function Corporativos() {
  return (
    <>
      <rect x="60" y="30" width="80" height="46" rx="2.5" {...R} />
      <rect x="60" y="30" width="80" height="46" rx="2.5" {...T} />
      <path d="M68 66 L84 52 L96 61 L112 44 L132 62" {...TF} />
      <path d="M100 76 L100 84 M88 88 L112 88" {...TF} />
      <path d="M40 96 L40 88 L52 88 L52 96 M56 96 L56 88 L68 88 L68 96" {...TF} />
      <path d="M132 96 L132 88 L144 88 L144 96 M148 96 L148 88 L160 88 L160 96" {...TF} />
      <Motas puntos={[[46, 42, 1.4], [154, 42, 1.4]]} />
      <Suelo />
    </>
  );
}

/** Nocturnos — la luna, los árboles y los haces de luz sobre la pista. */
function Nocturnos() {
  return (
    <>
      <path d="M138 26 a17 17 0 1 0 15 26 a19 19 0 0 1 -15 -26 z" fill="url(#oro-vivo)" stroke="none" />
      <path d="M64 96 L52 62 L76 62 Z M40 96 L30 70 L50 70 Z" {...TF} />
      <path d="M100 96 L78 46 M100 96 L100 42 M100 96 L122 46" stroke="url(#haz)" strokeWidth="7" fill="none" strokeLinecap="round" />
      <path d="M78 96 L122 96" {...T} />
      <Motas puntos={[[34, 34, 1.5], [58, 24, 1.2], [170, 40, 1.4], [24, 54, 1.1], [176, 66, 1.2]]} />
      <Suelo />
    </>
  );
}

/** Bautizos — la concha, la gota y el arco de la capilla. */
function Bautizos() {
  return (
    <>
      <path d="M70 96 L70 52 Q100 26 130 52 L130 96 Z" {...R} />
      <path d="M70 96 L70 52 Q100 26 130 52 L130 96" {...TF} />
      <path d="M100 34 L100 46 M94 40 L106 40" {...TF} />
      <path d="M76 64 q24 -22 48 0 q-24 18 -48 0 z" {...T} />
      <path d="M88 58 q5 10 5 17 M100 55 q0 12 0 20 M112 58 q-5 10 -5 17" {...TF} />
      <path d="M100 82 q-5 7 0 11 q5 -4 0 -11" fill="url(#oro-vivo)" stroke="none" />
      <Motas puntos={[[58, 48, 1.4], [142, 48, 1.4]]} />
      <Suelo />
    </>
  );
}

/** Presentaciones — la vela con su lazo, bajo el arco. */
function Presentaciones() {
  return (
    <>
      <path d="M66 96 L66 54 Q100 30 134 54 L134 96" {...TF} />
      <path d="M88 96 L88 50 L112 50 L112 96 Z" {...R} />
      <path d="M88 96 L88 50 L112 50 L112 96" {...T} />
      <path d="M100 50 L100 38" {...T} />
      <path d="M100 38 q-4.5 -5.5 0 -10.5 q4.5 5 0 10.5" fill="url(#oro-vivo)" stroke="none" />
      <path d="M76 68 q12 -7 24 0 q12 7 24 0" {...T} />
      <path d="M100 68 l-14 9 4.5 -9 -4.5 -9 z M100 68 l14 9 -4.5 -9 4.5 -9 z" {...T} />
      <Suelo />
    </>
  );
}

/** Graduaciones — el birrete, el diploma y el escenario. */
function Graduaciones() {
  return (
    <>
      <path d="M54 46 L100 28 L146 46 L100 64 Z" {...R} />
      <path d="M54 46 L100 28 L146 46 L100 64 Z" {...T} />
      <path d="M74 54 L74 74 q26 13 52 0 L126 54" {...T} />
      <path d="M146 46 L146 70" {...TF} />
      <circle cx="146" cy="74" r="3.6" fill="url(#oro-vivo)" />
      <path d="M62 90 L86 90 L84 96 L64 96 Z" {...T} />
      <path d="M66 90 L66 84 L82 84 L82 90" {...TF} />
      <Motas puntos={[[42, 36, 1.6], [158, 34, 1.6], [36, 62, 1.2], [166, 60, 1.2]]} />
      <Suelo />
    </>
  );
}

/** Baby showers — los globos, el banderín y los patucos. */
function BabyShowers() {
  return (
    <>
      <path d="M26 28 L174 28" {...TF} />
      {[38, 60, 82, 104, 126, 148].map((x, i) => (
        <path key={i} d={`M${x} 28 L${x + 11} 28 L${x + 5.5} 40 Z`} {...(i % 2 ? TF : T)} />
      ))}
      <ellipse cx="72" cy="62" rx="15" ry="18" {...R} />
      <ellipse cx="72" cy="62" rx="15" ry="18" {...T} />
      <path d="M72 80 L72 88 q-4 7 3 8" {...TF} />
      <ellipse cx="100" cy="70" rx="10" ry="12" {...TF} />
      <path d="M124 96 q0 -13 9 -13 q9 0 9 13 z" {...T} />
      <path d="M133 83 q0 -9 -7 -9 q-6 0 -6 7" {...TF} />
      <Suelo />
    </>
  );
}

/** Despedidas — el brindis bajo la bola de espejos. */
function Despedidas() {
  return (
    <>
      <path d="M100 16 L100 26" {...TF} />
      <circle cx="100" cy="34" r="9" {...R} />
      <circle cx="100" cy="34" r="9" {...T} />
      <path d="M91 34 L109 34 M100 25 L100 43 M94 27 L106 41 M106 27 L94 41" {...TF} />
      <path d="M100 43 L74 62 M100 43 L126 62 M100 43 L100 66" stroke="url(#haz)" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M60 58 L82 58 L74 76 q-3 3 -6 0 z" {...T} />
      <path d="M71 76 L71 92 M62 94 L80 94" {...T} />
      <path d="M118 58 L140 58 L132 76 q-3 3 -6 0 z" {...T} />
      <path d="M129 76 L129 92 M120 94 L138 94" {...T} />
      <Suelo />
    </>
  );
}

/** Aniversarios — el laurel alrededor de los dos anillos. */
function Aniversarios() {
  return (
    <>
      <path d="M100 90 q-26 -10 -30 -33 q-2 -14 7 -21" {...T} />
      <path d="M100 90 q26 -10 30 -33 q2 -14 -7 -21" {...T} />
      <path d="M79 40 q-8 2 -10 9 M74 56 q-8 2 -9 9 M72 72 q-8 1 -9 8" {...TF} />
      <path d="M121 40 q8 2 10 9 M126 56 q8 2 9 9 M128 72 q8 1 9 8" {...TF} />
      <circle cx="92" cy="60" r="13" {...T} />
      <circle cx="108" cy="60" r="13" {...T} />
      <path d="M100 38 l3 5.4 -3 5.4 -3 -5.4 z" fill="url(#oro-vivo)" stroke="none" />
      <Suelo y={94} />
    </>
  );
}

/** Posadas — la piñata bajo las luces. */
function Posadas() {
  return (
    <>
      <Guirnalda y={20} caida={10} />
      <path d="M100 28 L100 42" {...TF} />
      <circle cx="100" cy="60" r="17" {...R} />
      <circle cx="100" cy="60" r="17" {...T} />
      <path d="M100 43 l5.5 -13 -11 0 z" {...T} />
      <path d="M83 54 l-14 -7 4.5 11 z" {...T} />
      <path d="M117 54 l14 -7 -4.5 11 z" {...T} />
      <path d="M88 73 l-10 12 11 1 z" {...T} />
      <path d="M112 73 l10 12 -11 1 z" {...T} />
      <path d="M100 77 L100 90" {...TF} />
      <Motas puntos={[[42, 46, 1.5], [158, 46, 1.5], [34, 68, 1.2], [166, 68, 1.2]]} />
      <Suelo />
    </>
  );
}

/** Reuniones — la mesa larga bajo el árbol. */
function Reuniones() {
  return (
    <>
      <path d="M42 34 q16 -20 34 -5 q10 -6 14 4" {...TF} />
      <path d="M42 34 q-8 14 5 21 q-2 10 9 11" {...TF} />
      <path d="M58 30 L58 72" {...TF} />
      <path d="M56 72 L152 72 L152 76 L56 76 Z" {...R} />
      <path d="M56 72 L152 72 L152 76 L56 76 Z" {...T} />
      <path d="M66 76 L66 94 M142 76 L142 94" {...T} />
      <circle cx="84" cy="66" r="3.6" {...T} />
      <circle cx="104" cy="66" r="3.6" {...T} />
      <circle cx="124" cy="66" r="3.6" {...T} />
      <path d="M74 94 L74 84 L84 84 L84 94 M124 94 L124 84 L134 84 L134 94" {...TF} />
      <Suelo />
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
  bautizos: Bautizos,
  presentaciones: Presentaciones,
  graduaciones: Graduaciones,
  'baby-showers': BabyShowers,
  despedidas: Despedidas,
  aniversarios: Aniversarios,
  posadas: Posadas,
  reuniones: Reuniones,
};

/**
 * @param {Object} props
 * @param {string} props.slug        Slug de `tipos_evento`. Sin escena, no pinta nada.
 * @param {string} [props.className]
 */
export default function ArteDeEvento({ slug, className = '' }) {
  const Escena = POR_SLUG[slug];

  // Un tipo de evento nuevo creado desde el panel no tendrá escena. Se devuelve `null` y la
  // tarjeta cae en su versión de solo texto: nunca un hueco con un interrogante dentro.
  if (!Escena) return null;

  // El halo y la viñeta llevan `id` por slug. Un `id` repetido en dos SVG de la misma página
  // hace que el segundo herede el del primero — y con catorce tarjetas juntas eso se notaría.
  const pref = `arte-${slug}`;

  return (
    <div aria-hidden="true" className={`relative overflow-hidden bg-[#0b0a08] ${className}`}>
      <svg
        viewBox="0 0 200 110"
        className="h-full w-full text-[#C9A84C]"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id={`${pref}-halo`} cx="50%" cy="42%" r="62%">
            <stop offset="0%" stopColor="#C9A84C" stopOpacity="0.20" />
            <stop offset="45%" stopColor="#C9A84C" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#C9A84C" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="oro-suave" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C9A84C" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#C9A84C" stopOpacity="0.03" />
          </linearGradient>
          <linearGradient id="oro-vivo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F0DFA6" />
            <stop offset="100%" stopColor="#C9A84C" />
          </linearGradient>
          <linearGradient id="linea-suelo" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#C9A84C" stopOpacity="0" />
            <stop offset="50%" stopColor="#C9A84C" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#C9A84C" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="sombra" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#C9A84C" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#C9A84C" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="haz" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#C9A84C" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#C9A84C" stopOpacity="0" />
          </linearGradient>
          {/* La viñeta cierra los bordes: sin ella la escena se corta en seco contra la
              tarjeta y se nota que es un dibujo pegado, no un espacio con fondo. */}
          <radialGradient id={`${pref}-vineta`} cx="50%" cy="50%" r="72%">
            <stop offset="55%" stopColor="#0b0a08" stopOpacity="0" />
            <stop offset="100%" stopColor="#0b0a08" stopOpacity="0.85" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width="200" height="110" fill={`url(#${pref}-halo)`} />
        <Escena />
        <rect x="0" y="0" width="200" height="110" fill={`url(#${pref}-vineta)`} />
      </svg>
    </div>
  );
}
