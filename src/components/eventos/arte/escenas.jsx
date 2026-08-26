import { Pieza, aro, disco, globo, Suelo, Chispas, Guirnalda, Fondo, useTono } from './piezas';

/**
 * escenas.jsx — las quince escenas, una por tipo de evento.
 *
 * Todas viven en el mismo lienzo de 200 × 112 con el suelo en y = 92, y todas se dibujan con
 * `Pieza`, que les pone canto, cara y filo. Eso es lo que las hace hermanas.
 *
 * ── El criterio de cada dibujo: RECONOCIMIENTO, no ingenio ──────────────────
 *
 * El encargo fue explícito: *«que se entienda a la primera qué es»*. Así que cada escena usa
 * el símbolo que la gente YA tiene aprendido, grande y en el centro, y no el más original:
 * tiara para los XV, birrete para la graduación, piñata para la posada. Un dibujo listo que
 * hay que descifrar es un dibujo fallido.
 *
 * Y de ahí salió la corrección de dos que no funcionaban: los XV eran un triángulo que se
 * leía como una letra A, y los corporativos una pantalla con un paisaje dentro que parecía
 * una fotografía. Ahora son una tiara y una gráfica de barras.
 *
 * ── El color oscuro de los huecos ───────────────────────────────────────────
 *
 * Las puertas y arcos se pintan con `#0b0a08`, el fondo de la propia tarjeta, no con negro.
 * Un negro puro sobre un fondo que no lo es se ve como una mancha pegada encima.
 */

/** El fondo de la tarjeta. Los huecos se pintan con esto, no con negro. */
const HUECO = '#0b0a08';

// ═════════════════════════════════════════════════════════════════════════════
// 1 · BODAS — dos anillos entrelazados
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Los anillos van RELLENOS y con agujero, no dibujados con un trazo grueso.
 *
 * Un trazo no tiene borde propio, así que no admite canto ni filo: el anillo habría quedado
 * plano en medio de piezas con bulto. Ver `aro()` en `piezas.jsx`.
 *
 * El entrelazado se resuelve con un tercer trazo: el arco del anillo izquierdo repintado por
 * encima del derecho en la zona donde se cruzan. Sin él serían dos anillos superpuestos —que
 * es un dibujo de dos anillos, no de un matrimonio.
 */
export function Bodas() {
  return (
    <>
      <Fondo d="M40,92 C40,40 160,40 160,92 L152,92 C152,50 48,50 48,92 Z" opacity={0.1} />
      <Suelo ancho={64} />
      <Chispas puntos={[[54, 30, 1.6], [70, 20, 1.2], [130, 20, 1.2], [146, 30, 1.6], [100, 14, 1.5]]} />

      <Pieza d={aro(85, 56, 25, 5.5)} fillRule="evenodd" />
      <Pieza d={aro(115, 56, 25, 5.5)} fillRule="evenodd" />
      {/* El cruce: el arco del anillo izquierdo, otra vez, por encima del derecho. */}
      <Pieza
        d="M101.07,36.85 A25,25 0 0,1 106.65,68.5 L101.89,65.75 A19.5,19.5 0 0,0 97.53,41.06 Z"
        dx={0.8}
        dy={1.1}
      />

      {/* El brillante, encima del anillo de la izquierda. */}
      <Pieza d="M85,20 L91,27 L85,35 L79,27 Z" dx={0.7} dy={1} filo={false} />
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 2 · XV AÑOS — la tiara
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Antes era una silueta triangular que pretendía ser el vuelo del vestido, y en la tarjeta se
 * leía como una letra A mayúscula. La tiara no admite esa duda.
 */
export function XVAnos() {
  return (
    <>
      <Suelo ancho={58} />
      <Chispas puntos={[[52, 34, 1.6], [148, 34, 1.6], [64, 20, 1.2], [136, 20, 1.2]]} />

      {/* Las tres puntas, detrás de la diadema. */}
      <Pieza d="M100,20 C103,38 105,52 107,72 L93,72 C95,52 97,38 100,20 Z" />
      <Pieza d="M74,34 C77,48 79,58 81,74 L67,74 C69,58 71,46 74,34 Z" />
      <Pieza d="M126,34 C129,46 131,58 133,74 L119,74 C121,58 123,48 126,34 Z" />

      {/* La diadema, por delante: es lo que une las puntas y hace que se lea como una pieza.
          Curva SUAVE y poco grosor. El primer intento bajaba 16 unidades en el centro y medía
          10 de canto, y con eso dejaba de parecer una diadema para parecer un cuenco con una
          corona dentro. */}
      <Pieza d="M58,68 Q100,79 142,68 L142,74.5 Q100,85.5 58,74.5 Z" />

      {/* Las piedras. Sin filo: a este tamaño el hilo de luz solo las ensucia. */}
      <Pieza d={disco(100, 19, 4.2)} filo={false} dx={0.6} dy={0.9} />
      <Pieza d={disco(74, 33, 3.4)} filo={false} dx={0.6} dy={0.9} />
      <Pieza d={disco(126, 33, 3.4)} filo={false} dx={0.6} dy={0.9} />
      <Pieza d={disco(100, 76, 3.6)} filo={false} dx={0.5} dy={0.8} />
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 3 · CUMPLEAÑOS — el pastel de dos pisos
// ═════════════════════════════════════════════════════════════════════════════

export function Cumpleanos() {
  const halo = useTono('piso');
  return (
    <>
      <Suelo ancho={60} />

      <Pieza d="M56,88 L56,68 Q56,63 61,63 L139,63 Q144,63 144,68 L144,88 Z" />
      {/* El glaseado que escurre: es el detalle que lo convierte en pastel y no en un cajón. */}
      <Pieza d="M56,68 Q64,76 72,68 Q80,76 88,68 Q96,76 104,68 Q112,76 120,68 Q128,76 136,68 Q140,72 144,68 L144,63 L56,63 Z" filo={false} />

      <Pieza d="M72,63 L72,45 Q72,41 76,41 L124,41 Q128,41 128,45 L128,63 Z" />
      <Pieza d="M72,46 Q79,53 86,46 Q93,53 100,46 Q107,53 114,46 Q121,53 128,46 L128,41 L72,41 Z" filo={false} />

      {/* Las velas. */}
      {[86, 100, 114].map((x) => (
        <Pieza key={x} d={`M${x - 2.6},41 L${x - 2.6},27 L${x + 2.6},27 L${x + 2.6},41 Z`} dx={0.7} dy={1} />
      ))}
      {[86, 100, 114].map((x) => (
        <g key={`f${x}`}>
          <circle cx={x} cy="21" r="9" fill={halo} />
          <path d={`M${x},13 C${x + 4},18 ${x + 3.4},25 ${x},25 C${x - 3.4},25 ${x - 4},18 ${x},13 Z`} fill="#F7EBC4" opacity="0.92" />
        </g>
      ))}
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 4 · EVENTOS INFANTILES — el inflable y los globos
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Un inflable y no unos globos sueltos, porque el inflable es lo que de verdad se renta aquí
 * —está en el catálogo de amenidades— y además no se confunde con ningún otro tipo de evento.
 */
export function Infantiles() {
  return (
    <>
      <Suelo ancho={66} />

      <Pieza d="M54,88 L54,58 Q54,50 62,50 L138,50 Q146,50 146,58 L146,88 Z" />
      <Pieza d="M40,88 L40,46 Q40,39 47,39 L55,39 Q62,39 62,46 L62,88 Z" />
      <Pieza d="M138,88 L138,46 Q138,39 145,39 L153,39 Q160,39 160,46 L160,88 Z" />

      {/* Las banderolas de las torres. */}
      <Pieza d="M51,39 L51,24 L64,29 L51,33 Z" dx={0.7} dy={1} filo={false} />
      <Pieza d="M149,39 L149,24 L136,29 L149,33 Z" dx={0.7} dy={1} filo={false} />

      {/* La boca del inflable: hueca, del color de la tarjeta. */}
      <path d="M86,88 L86,70 Q100,58 114,70 L114,88 Z" fill={HUECO} />
      <path d="M86,70 Q100,58 114,70" fill="none" stroke="#F7EBC4" strokeOpacity="0.3" strokeWidth="0.7" />

      {/* Globos. */}
      {[[72, 22, 8], [100, 14, 9], [128, 22, 8]].map(([x, y, r], i) => (
        <g key={i}>
          <path d={`M${x},${y + r * 1.16} C${x - r * 0.4},${y + r * 1.16 + 4} ${x + r * 0.4},${y + r + 5} ${x},${y + r + 12}`} fill="none" stroke="#C9A84C" strokeOpacity="0.4" strokeWidth="0.7" />
          <Pieza d={globo(x, y, r)} dx={0.9} dy={1.3} />
        </g>
      ))}
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 5 · EVENTOS CORPORATIVOS — la pantalla con la gráfica
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Antes la pantalla llevaba dentro un paisaje de montañas y se leía como un marco de fotos.
 * Una gráfica de barras dice «trabajo» sin que haya que pensarlo.
 */
export function Corporativos() {
  const vidrio = useTono('vidrio');
  return (
    <>
      <Suelo ancho={56} />

      {/* Las butacas del fondo: silueta con RESPALDO, no bloques.
          Al principio eran cuatro rectángulos redondeados apagados y en la tarjeta se leían
          como cajas tiradas en el suelo. Un respaldo alto y un asiento bajo es lo mínimo que
          hace falta para que una silla se lea como una silla. */}
      <Fondo
        d="M20,92 L20,72 Q20,69 23,69 L27,69 Q30,69 30,72 L30,80 L40,80 Q43,80 43,83 L43,92 L39,92 L39,84 L24,84 L24,92 Z
           M52,92 L52,72 Q52,69 55,69 L59,69 Q62,69 62,72 L62,80 L72,80 Q75,80 75,83 L75,92 L71,92 L71,84 L56,84 L56,92 Z
           M128,92 L128,72 Q128,69 131,69 L135,69 Q138,69 138,72 L138,80 L148,80 Q151,80 151,83 L151,92 L147,92 L147,84 L132,84 L132,92 Z
           M160,92 L160,72 Q160,69 163,69 L167,69 Q170,69 170,72 L170,80 L180,80 Q183,80 183,83 L183,92 L179,92 L179,84 L164,84 L164,92 Z"
        opacity={0.26}
      />

      <Pieza d="M48,16 Q48,12 52,12 L148,12 Q152,12 152,16 L152,62 Q152,66 148,66 L52,66 Q48,66 48,62 Z" />
      <rect x="53" y="17" width="94" height="44" fill={vidrio} />

      {/* La gráfica. Sube de izquierda a derecha porque una que baja diría otra cosa. */}
      <path d="M60,57 L140,57" stroke="#F7EBC4" strokeOpacity="0.35" strokeWidth="0.7" />
      {[[68, 14], [86, 22], [104, 31], [122, 25]].map(([x, h], i) => (
        <Pieza key={i} d={`M${x},57 L${x},${57 - h} L${x + 12},${57 - h} L${x + 12},57 Z`} dx={0.6} dy={0} filo={false} />
      ))}

      <Pieza d="M94,66 L106,66 L110,80 L90,80 Z" />
      <Pieza d="M74,80 L126,80 Q130,80 130,83 L130,86 L70,86 L70,83 Q70,80 74,80 Z" />
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 6 · EVENTOS NOCTURNOS — la luna sobre la pista
// ═════════════════════════════════════════════════════════════════════════════

export function Nocturnos() {
  const vidrio = useTono('vidrio');
  const piso = useTono('piso');

  // Las facetas de la bola. Las cuerdas se calculan sobre el círculo en vez de recortar con
  // un `clipPath`: menos maquinaria y ni un trazo se sale del borde.
  const R = 22;
  const facetas = [-13, -4.5, 4.5, 13].map((d) => ({
    d,
    semi: Math.sqrt(R * R - d * d),
  }));

  return (
    <>
      <Guirnalda y={12} caida={9} luces={9} />

      {/* ══════════════════════════════════════════════════════════════════════
        * EL ORDEN IMPORTA: PRIMERO LA PISTA, LUEGO LOS HACES
        * ══════════════════════════════════════════════════════════════════════
        *
        * El primer intento los dibujaba al revés y el resultado era luz EN NEGATIVO: la pista
        * se pintaba encima de los conos y estos acababan más oscuros que el suelo que se
        * suponía que estaban iluminando. Un haz de luz solo se lee como luz si está por
        * DELANTE de lo que ilumina. */}
      {/* LA PISTA. La arista de atrás es MÁS ESTRECHA que la de delante: al revés se lee como
          un cuenco, que es lo que pasaba en el primer intento. */}
      <path d="M40,90 L160,90 L142,72 L58,72 Z" fill={vidrio} />
      <ellipse cx="100" cy="84" rx="58" ry="12" fill={piso} />
      <path d="M40,90 L160,90 L142,72 L58,72 Z" fill="none" stroke="#C9A84C" strokeOpacity="0.5" strokeWidth="0.9" />
      {[0.25, 0.5, 0.75].map((t) => (
        <path key={t} d={`M${58 + 84 * t},72 L${40 + 120 * t},90`} stroke="#C9A84C" strokeOpacity="0.2" strokeWidth="0.6" />
      ))}

      {/* Los haces, POR DELANTE de la pista y saliendo del borde de la bola. */}
      <path d="M88,58 L34,90 L76,90 Z" fill="#F4E4AE" opacity="0.11" />
      <path d="M112,58 L124,90 L166,90 Z" fill="#F4E4AE" opacity="0.11" />
      <path d="M100,64 L86,90 L114,90 Z" fill="#F4E4AE" opacity="0.08" />

      {/* ══════════════════════════════════════════════════════════════════════
        * LA BOLA DE ESPEJOS, Y POR QUÉ SUSTITUYÓ A LA LUNA
        * ══════════════════════════════════════════════════════════════════════
        *
        * La primera versión era una luna sobre una pista, y en la tarjeta se leía como una
        * escena de noche cualquiera: no había ningún motivo dorado grande y la casilla salía
        * apagada al lado de las otras catorce. Además una luna dice «de noche», no «fiesta».
        *
        * La bola dice las dos cosas a la vez y sostiene la escena ella sola. */}
      <path d="M100,6 L100,21" stroke="#C9A84C" strokeOpacity="0.6" strokeWidth="1" />
      <Pieza d={disco(100, 42, R)} />
      {facetas.map(({ d, semi }) => (
        <g key={d}>
          <path d={`M${100 - semi},${42 + d} L${100 + semi},${42 + d}`} stroke="#8A6E2E" strokeOpacity="0.65" strokeWidth="1.1" />
          <path d={`M${100 + d},${42 - semi} L${100 + d},${42 + semi}`} stroke="#8A6E2E" strokeOpacity="0.65" strokeWidth="1.1" />
        </g>
      ))}
      <Chispas puntos={[[52, 30, 1.7], [148, 30, 1.7], [40, 52, 1.2], [160, 52, 1.2], [66, 18, 1.1], [134, 18, 1.1]]} />
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 7 · BAUTIZOS Y PRIMERAS COMUNIONES — la capilla
// ═════════════════════════════════════════════════════════════════════════════

/** La capilla existe de verdad y está dentro del recinto: es el dibujo más honesto posible. */
export function Bautizos() {
  return (
    <>
      <Suelo ancho={58} />
      <Chispas puntos={[[44, 30, 1.5], [156, 30, 1.5], [58, 18, 1.1]]} />

      <Pieza d="M98.6,14 L101.4,14 L101.4,19 L106.2,19 L106.2,21.8 L101.4,21.8 L101.4,31 L98.6,31 L98.6,21.8 L93.8,21.8 L93.8,19 L98.6,19 Z" dx={0.7} dy={1} filo={false} />

      <Pieza d="M56,56 L100,30 L144,56 Z" />
      <Pieza d="M64,88 L64,54 L136,54 L136,88 Z" />

      {/* La puerta de arco: hueca. Es lo que hace que se lea «se entra ahí». */}
      <path d="M88,88 L88,70 Q100,59 112,70 L112,88 Z" fill={HUECO} />
      <path d="M88,70 Q100,59 112,70 L112,88 M88,88 L88,70" fill="none" stroke="#F7EBC4" strokeOpacity="0.32" strokeWidth="0.7" />

      {/* Los dos ventanales. */}
      <path d="M74,76 L74,66 Q78,61 82,66 L82,76 Z" fill={HUECO} />
      <path d="M118,76 L118,66 Q122,61 126,66 L126,76 Z" fill={HUECO} />
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 8 · PRESENTACIONES DE TRES AÑOS — la vela con el lazo
// ═════════════════════════════════════════════════════════════════════════════

/**
 * La vela de presentación, con su lazo. Comparte mundo con la capilla de los bautizos sin
 * repetir el dibujo, que es justo lo que hacía falta: son dos ceremonias distintas.
 */
export function Presentaciones() {
  const halo = useTono('piso');
  return (
    <>
      <Suelo ancho={44} sombra={26} />
      <Chispas puntos={[[62, 26, 1.6], [138, 26, 1.6], [72, 44, 1.2], [128, 44, 1.2]]} />

      {/* La vela, ALTA Y ESTRECHA. El primer intento medía 20 de ancho por 52 de alto y salía
          rechoncha, más pilar que vela. */}
      <Pieza d="M92,88 L92,32 L108,32 L108,88 Z" />
      <Pieza d="M92,36 Q96,43 100,36 Q104,43 108,36 L108,32 L92,32 Z" filo={false} />

      <circle cx="100" cy="20" r="14" fill={halo} />
      <path d="M100,8 C106.5,16 106,27 100,27 C94,27 93.5,16 100,8 Z" fill="#F7EBC4" opacity="0.94" />

      {/* EL LAZO. Lazadas pequeñas y cabos LARGOS.
        *
        * El primer intento tenía las lazadas casi tan anchas como alta la vela y sin cabos que
        * contaran: en la tarjeta se leía como una hélice atravesando un tubo. Un lazo se
        * reconoce por la proporción —lazadas discretas, cabos que caen— más que por su forma. */}
      <Pieza d="M100,58 C93,51 83,53 84,59 C85,66 95,63 100,58 Z" dx={0.7} dy={1} />
      <Pieza d="M100,58 C107,51 117,53 116,59 C115,66 105,63 100,58 Z" dx={0.7} dy={1} />
      <Pieza d="M97,60 L89,82 L95,79 L99,62 Z" dx={0.6} dy={0.9} filo={false} />
      <Pieza d="M103,60 L111,82 L105,79 L101,62 Z" dx={0.6} dy={0.9} filo={false} />
      <Pieza d={disco(100, 59, 3.6)} filo={false} dx={0.5} dy={0.8} />
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 9 · GRADUACIONES — el birrete
// ═════════════════════════════════════════════════════════════════════════════

export function Graduaciones() {
  return (
    <>
      <Suelo ancho={54} />
      <Chispas puntos={[[46, 26, 1.5], [154, 26, 1.5], [60, 16, 1.1], [140, 16, 1.1]]} />

      {/* El pergamino, detrás y abajo: acompaña sin robar la lectura. */}
      <Pieza d="M52,78 L96,78 L96,88 L52,88 Z" dx={0.9} dy={1.3} />
      <Pieza d={disco(52, 83, 5.2)} filo={false} dx={0.7} dy={1} />
      <Pieza d={disco(96, 83, 5.2)} filo={false} dx={0.7} dy={1} />

      <Pieza d="M78,46 L78,62 Q100,73 122,62 L122,46 Q100,56 78,46 Z" />
      <Pieza d="M100,20 L146,38 L100,56 L54,38 Z" />
      <Pieza d={disco(100, 38, 3.6)} filo={false} dx={0.5} dy={0.8} />

      {/* La borla: el detalle que nadie confunde con otra cosa. */}
      <path d="M146,38 L146,60" stroke="#D2B15C" strokeWidth="1.4" fill="none" />
      <Pieza d="M142,60 L150,60 L148,74 L144,74 Z" dx={0.7} dy={1} filo={false} />
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 10 · BABY SHOWERS Y REVELACIONES — la carriola
// ═════════════════════════════════════════════════════════════════════════════

export function BabyShowers() {
  return (
    <>
      <Suelo ancho={58} />

      {/* Los globos de la revelación. */}
      {[[142, 22, 9], [162, 34, 6]].map(([x, y, r], i) => (
        <g key={i}>
          <path d={`M${x},${y + r * 1.16} C${x - r * 0.4},${y + r * 1.16 + 4} ${x + r * 0.4},${y + r + 5} ${x},${y + r + 14}`} fill="none" stroke="#C9A84C" strokeOpacity="0.4" strokeWidth="0.7" />
          <Pieza d={globo(x, y, r)} dx={0.9} dy={1.3} />
        </g>
      ))}

      {/* El cesto es media ELIPSE, no medio círculo: con radio 32 y una cuerda de 64 el arco
          bajaba hasta y = 94, por debajo del suelo, y las ruedas quedaban dentro del cesto. */}
      <Pieza d="M48,54 L108,54 A30,21 0 0,1 48,54 Z" />
      {/* La capota, que es lo que la distingue de un cesto con ruedas. */}
      <Pieza d="M48,54 A25,25 0 0,1 73,29 L73,54 Z" />
      {/* El manillar. */}
      <Pieza d="M106,52 C120,43 126,34 120,27 L125,24 C133,34 125,47 111,57 Z" />

      <path d="M60,72 L64,76 M96,72 L100,76" stroke="#8F7330" strokeWidth="2" />
      <Pieza d={aro(64, 84, 8.5, 3.2)} fillRule="evenodd" dx={0.8} dy={1.1} />
      <Pieza d={aro(100, 84, 8.5, 3.2)} fillRule="evenodd" dx={0.8} dy={1.1} />
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 11 · DESPEDIDAS DE SOLTERA — el vestido en el gancho
// ═════════════════════════════════════════════════════════════════════════════

/**
 * No se usan copas: dirían «fiesta», que es lo que dicen ya los nocturnos. El vestido dice
 * «boda que viene» y no se confunde con nada de la lista.
 */
export function Despedidas() {
  return (
    <>
      <Suelo ancho={54} />
      <Chispas puntos={[[52, 40, 1.6], [148, 40, 1.6], [60, 60, 1.2], [140, 60, 1.2], [100, 8, 1.3]]} />

      <path d="M100,12 C100,7 108,7 108,12 C108,17 101,17 101,22" fill="none" stroke="#D2B15C" strokeWidth="1.6" strokeLinecap="round" />
      <Pieza d="M100,21 L139,39 L137,43 L100,27 L63,43 L61,39 Z" dx={0.7} dy={1} filo={false} />

      <Pieza d="M84,40 L116,40 L113,56 L87,56 Z" />
      {/* La falda va en metal como todo lo demás. Con `vidrio` el canto oscuro se transparenta
          por debajo y la pieza se ensucia en vez de verse ligera. */}
      <Pieza d="M87,54 L113,54 C122,68 130,82 135,90 Q100,97 65,90 C70,82 78,68 87,54 Z" />
      <Pieza d="M86,55 L114,55 L114,60 L86,60 Z" dx={0.6} dy={0.9} filo={false} />
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 12 · ANIVERSARIOS DE BODA — el corazón en la corona de laurel
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Aquí no se repiten los anillos de las bodas, aunque sería lo obvio: dos tarjetas con el
 * mismo dibujo son dos tarjetas que se confunden. La corona dice «años cumplidos» y el
 * corazón dice de qué.
 */
export function Aniversarios() {
  // Las hojas se reparten sobre las dos ramas por ÁNGULO, no a ojo: doce hojas colocadas a
  // mano quedan desiguales y una corona torcida se lee como un garabato.
  const centro = { x: 100, y: 54, r: 36 };
  const hojas = [];
  [-1, 1].forEach((lado) => {
    for (let i = 0; i < 6; i += 1) {
      const t = i / 5; // 0 abajo, 1 arriba
      const grados = 90 + lado * (18 + 132 * t);
      const rad = (grados * Math.PI) / 180;
      hojas.push({
        clave: `${lado}-${i}`,
        x: centro.x + Math.cos(rad) * centro.r,
        y: centro.y + Math.sin(rad) * centro.r,
        // La hoja apunta por la tangente de la rama, que es el ángulo más un cuarto de vuelta.
        giro: grados + lado * 90,
        escala: 0.72 + 0.28 * (1 - t),
      });
    }
  });

  return (
    <>
      <Suelo ancho={52} />

      {/* Las dos ramas, de abajo hacia arriba y abiertas por arriba: una corona cerrada es un
          aro, y un aro ya lo usan las bodas. */}
      <path d="M111.1,88.2 A36,36 0 0,0 118,22.8" fill="none" stroke="#D2B15C" strokeOpacity="0.75" strokeWidth="1.7" />
      <path d="M88.9,88.2 A36,36 0 0,1 82,22.8" fill="none" stroke="#D2B15C" strokeOpacity="0.75" strokeWidth="1.7" />

      {hojas.map(({ clave, x, y, giro, escala }) => (
        <g key={clave} transform={`rotate(${giro.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}) translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${escala.toFixed(2)})`}>
          <Pieza d="M0,0 C5,-6 12,-6 15,-2 C12,3 5,5 0,0 Z" dx={0.5} dy={0.7} filo={false} />
        </g>
      ))}

      <Pieza d="M100,76 C86,64 76,56 76,46 C76,37 84,32 91,35 C95,36.6 98.4,40 100,43 C101.6,40 105,36.6 109,35 C116,32 124,37 124,46 C124,56 114,64 100,76 Z" />
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 13 · POSADAS Y FIN DE AÑO — la piñata de siete picos
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Los siete picos se calculan, no se escriben a mano: siete triángulos tecleados uno a uno
 * quedan desiguales, y una piñata torcida se lee como una estrella mal dibujada.
 */
export function Posadas() {
  const cx = 100;
  const cy = 52;
  // Picos LARGOS Y ESTRECHOS. El primer intento los hizo cortos y anchos —del radio 18 al 34,
  // con casi un tercio de radián de base— y la piñata salió como un SOL de dibujo infantil.
  // Lo que separa una cosa de la otra es la proporción: un pico de piñata es más largo que el
  // radio del cuerpo, y termina en punta.
  const picos = Array.from({ length: 7 }, (_, i) => {
    const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
    const ancho = 0.19;
    const p = (ang, r) => `${(cx + Math.cos(ang) * r).toFixed(1)},${(cy + Math.sin(ang) * r).toFixed(1)}`;
    return `M${p(a - ancho, 17)} L${p(a, 36)} L${p(a + ancho, 17)} Z`;
  });
  return (
    <>
      <path d="M8,14 Q100,30 192,14" fill="none" stroke="#C9A84C" strokeOpacity="0.4" strokeWidth="0.9" />
      <path d="M100,22 L100,26" stroke="#C9A84C" strokeOpacity="0.5" strokeWidth="0.9" />
      <Suelo ancho={50} sombra={30} />

      {picos.map((d, i) => (
        <Pieza key={i} d={d} dx={0.9} dy={1.2} filo={false} />
      ))}
      <Pieza d={disco(cx, cy, 18)} />

      {/* Las tiras de papel crepé del cuerpo. Son el segundo rasgo que la aparta del sol: un
          sol es liso, una piñata está forrada a franjas. */}
      {[-7, 0, 7].map((dy) => (
        <path
          key={dy}
          d={`M${cx - 16},${cy + dy} Q${cx},${cy + dy + 5} ${cx + 16},${cy + dy}`}
          fill="none"
          stroke="#8A6E2E"
          strokeOpacity="0.75"
          strokeWidth="1.5"
        />
      ))}

      {/* El fleco, solo en el pico de abajo. Repartido por todo el borde parecían patas. */}
      {[-4, 0, 4].map((dx, i) => (
        <path
          key={i}
          d={`M${cx + dx},87 q${(i - 1) * 2},5 ${(i - 1) * 3},9`}
          fill="none"
          stroke="#D2B15C"
          strokeOpacity="0.6"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      ))}
      <Chispas puntos={[[36, 30, 1.6], [164, 30, 1.6], [26, 52, 1.2], [174, 52, 1.2]]} />
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 14 · REUNIONES Y COMIDAS FAMILIARES — la mesa larga bajo la sombrilla
// ═════════════════════════════════════════════════════════════════════════════

export function Reuniones() {
  return (
    <>
      <Suelo ancho={68} />

      <Pieza d="M40,44 Q100,8 160,44 Q130,36 100,41 Q70,36 40,44 Z" />
      <Pieza d="M97,40 L103,40 L103,70 L97,70 Z" dx={0.7} dy={0} />

      {/* Las sillas, detrás de la mesa. */}
      <Fondo d="M56,88 L56,64 L62,64 L62,88 Z M138,88 L138,64 L144,64 L144,88 Z" opacity={0.3} />

      <Pieza d="M44,70 L156,70 L162,79 L38,79 Z" />
      <Pieza d="M52,79 L58,79 L58,90 L52,90 Z" dx={0.6} dy={0} filo={false} />
      <Pieza d="M142,79 L148,79 L148,90 L142,90 Z" dx={0.6} dy={0} filo={false} />

      {/* Los platos: tres, porque son los que caben sin apelmazar. */}
      {[70, 100, 130].map((x) => (
        <ellipse key={x} cx={x} cy="72.5" rx="9" ry="2.6" fill="#F4E4AE" opacity="0.55" />
      ))}
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// 15 · RENTA DEL ESPACIO — la carpa vacía
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Esta es la única escena cuyo tema es una AUSENCIA, y por eso está deliberadamente vacía por
 * dentro: la carpa montada, las luces puestas, el suelo iluminado y nada encima. El hueco es
 * el mensaje —lo que vaya ahí lo pone quien pregunte—, y llenarlo con un motivo lo estropearía.
 */
export function RentaDeEspacio() {
  const vidrio = useTono('vidrio');
  return (
    <>
      <Suelo ancho={70} />

      <path d="M56,88 L144,88 L156,70 L44,70 Z" fill={vidrio} />
      <path d="M56,88 L144,88 L156,70 L44,70 Z" fill="none" stroke="#C9A84C" strokeOpacity="0.32" strokeWidth="0.7" />

      <Pieza d="M28,42 L100,14 L172,42 L172,49 L100,22 L28,49 Z" />
      <Pieza d="M30,46 L38,46 L38,88 L30,88 Z" />
      <Pieza d="M162,46 L170,46 L170,88 L162,88 Z" />

      <Guirnalda y={44} caida={7} desde={40} hasta={160} luces={5} />
      <Chispas puntos={[[100, 60, 1.3], [76, 64, 1], [124, 64, 1]]} />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * De slug a escena.
 *
 * Las claves son los `slug` de `jardines.tipos_evento`. Un tipo nuevo creado desde el panel no
 * tendrá escena, y eso está previsto: `ArteDeEvento` devuelve `null` y la tarjeta cae en su
 * versión de solo texto. Nunca un hueco con un interrogante dentro.
 */
export const POR_SLUG = {
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
  'renta-de-espacio': RentaDeEspacio,
};
