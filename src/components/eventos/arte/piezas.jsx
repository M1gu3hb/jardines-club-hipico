import { createContext, useContext } from 'react';

/**
 * piezas.jsx — el lenguaje visual común de las escenas de evento.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * POR QUÉ SE REHIZO TODO: NO SE ENTENDÍAN
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * La versión anterior eran escenas de trazo fino y hueco. El dueño las miró y dijo lo que
 * había que oír: *«no se nota bien qué son, alguien a primera vista no lo va a entender, está
 * muy abstracto»*. Tenía razón, y el motivo es medible: **una silueta rellena se reconoce
 * antes que un contorno**. El contorno obliga a reconstruir la forma; el relleno la entrega
 * hecha. Sobre un fondo casi negro y a 300 px de ancho, un trazo de 1 px además casi
 * desaparece.
 *
 * Así que el cambio no es de dibujo, es de técnica: **de contorno a bulto**.
 *
 * ── Cómo se consigue la profundidad, y por qué así ──────────────────────────
 *
 * Pidió *«más profundidad, más 3D, algo mejor hecho»*. Sombrear a mano quince escenas daría
 * quince resultados distintos y se leerían como quince descargas sueltas. En vez de eso hay
 * UNA regla que se aplica a todo, `Pieza`, y que dibuja cada silueta tres veces:
 *
 *   1. **El canto** — una copia oscura desplazada abajo y a la derecha. Es el grosor: lo que
 *      convierte una figura plana en un objeto con canto.
 *   2. **La cara** — la misma silueta con un degradado metálico, claro arriba y oscuro abajo.
 *      Eso es luz cayendo desde arriba, que es lo que el ojo lee como volumen.
 *   3. **El filo** — un hilo claro por el borde. Es el reflejo del canto superior, y es lo que
 *      despega la pieza del fondo.
 *
 * Tres capas por figura, la misma regla para todas: salen con bulto y salen hermanas.
 *
 * ── Lo que NO cambió, a propósito ───────────────────────────────────────────
 *
 * Siguen siendo dibujos y no fotos, por lo mismo de siempre: una foto tendría que ser DE AQUÍ
 * —el proyecto prohíbe bancos de imágenes— y ninguna de las 69 piezas de la galería está
 * etiquetada por tipo de evento. El día que el dueño suba una a `tipos_evento.imagen_hero`,
 * esa tarjeta cambia sola y el dibujo se retira.
 *
 * Y siguen siendo SVG dentro del JavaScript: cero peticiones, cero espera, nítidos a cualquier
 * tamaño. En una página cuyo problema real era la carga de imágenes, eso importa.
 */

// ─────────────────────────────────────────────────────────────────────────────
// EL PREFIJO DE LOS DEGRADADOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Los `id` de un `<defs>` son GLOBALES a la página, no locales a su `<svg>`.
 *
 * Con quince tarjetas juntas, quince degradados llamados `cara` son un choque: todos los SVG
 * acaban usando el primero que se definió. Hoy darían igual porque son idénticos, pero el día
 * que una escena quiera su propio tono heredaría el de otra y el fallo sería de los que se
 * miran diez minutos sin ver nada raro en el archivo.
 *
 * Así que cada instancia trae su prefijo por contexto y las piezas lo leen sin tener que
 * pasárselo a mano por seis niveles de profundidad.
 */
const Prefijo = createContext('arte');

export const ProveedorDePaleta = Prefijo.Provider;

/** La referencia a un degradado de ESTA instancia. */
export function useTono(nombre) {
  return `url(#${useContext(Prefijo)}-${nombre})`;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOS DEGRADADOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Todo el color del sistema, en un sitio.
 *
 * El dorado de marca es `#C9A84C`. La cara va de un dorado claro arriba a uno apagado abajo
 * pasando por el de marca: es el mismo color, con luz.
 */
export function Degradados({ pref }) {
  return (
    <defs>
      {/* LA CARA. El eje va inclinado (x2 = 0.35) y no recto: una luz perfectamente cenital
          aplana, una ligeramente lateral da la vuelta a la forma. */}
      <linearGradient id={`${pref}-cara`} x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0%" stopColor="#F4E4AE" />
        <stop offset="45%" stopColor="#D2B15C" />
        <stop offset="100%" stopColor="#9A7A33" />
      </linearGradient>

      {/* EL CANTO. No es negro: es el mismo dorado sin luz. Un canto gris rompería la
          sensación de que la pieza es de una sola materia. */}
      <linearGradient id={`${pref}-canto`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#5C471B" />
        <stop offset="100%" stopColor="#2B2110" />
      </linearGradient>

      {/* Para superficies que no son metal: telas, cristal, pantallas. */}
      <linearGradient id={`${pref}-vidrio`} x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.32" />
        <stop offset="100%" stopColor="#C9A84C" stopOpacity="0.06" />
      </linearGradient>

      {/* El halo detrás del motivo: separa la escena del fondo de la tarjeta. */}
      <radialGradient id={`${pref}-halo`} cx="50%" cy="46%" r="60%">
        <stop offset="0%" stopColor="#C9A84C" stopOpacity="0.22" />
        <stop offset="50%" stopColor="#C9A84C" stopOpacity="0.06" />
        <stop offset="100%" stopColor="#C9A84C" stopOpacity="0" />
      </radialGradient>

      {/* El charco de luz del suelo. Sin él las piezas flotan. */}
      <radialGradient id={`${pref}-piso`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#C9A84C" stopOpacity="0.30" />
        <stop offset="100%" stopColor="#C9A84C" stopOpacity="0" />
      </radialGradient>

      {/* La sombra de contacto SÍ es oscura: es ausencia de luz, no dorado. Es la que ata el
          objeto al suelo — sin ella el bulto se nota, pero flotando. */}
      <radialGradient id={`${pref}-sombra`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#000000" stopOpacity="0.62" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0" />
      </radialGradient>

      {/* La viñeta cierra los bordes para que la escena no se corte en seco contra la tarjeta. */}
      <radialGradient id={`${pref}-vineta`} cx="50%" cy="50%" r="74%">
        <stop offset="52%" stopColor="#0b0a08" stopOpacity="0" />
        <stop offset="100%" stopColor="#0b0a08" stopOpacity="0.9" />
      </radialGradient>

      <linearGradient id={`${pref}-haz`} x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%" stopColor="#C9A84C" stopOpacity="0.26" />
        <stop offset="100%" stopColor="#C9A84C" stopOpacity="0" />
      </linearGradient>
    </defs>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LA REGLA QUE LO SOSTIENE TODO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Una silueta con cuerpo: canto, cara y filo.
 *
 * Es la pieza que hace que quince escenas dibujadas en tardes distintas parezcan la misma
 * mano. Si algo hay que cambiar del acabado, se cambia aquí y cambia en las quince.
 *
 * @param {Object}  props
 * @param {string}  props.d              El contorno, en sintaxis de `path`.
 * @param {number}  [props.dx]           Desplazamiento del canto. Más = pieza más gruesa.
 * @param {number}  [props.dy]
 * @param {string}  [props.tono]         `cara` (metal) o `vidrio` (telas, pantallas).
 * @param {boolean} [props.filo]         El hilo de luz del borde. Se apaga en piezas diminutas,
 *                                       donde no cabe y solo ensucia.
 * @param {'evenodd'|'nonzero'} [props.fillRule]  `evenodd` para las formas con agujero: aros y
 *                                       anillos. Va tipado y no como `string` suelto porque SVG
 *                                       solo admite esos valores, y el typecheck lo exige.
 * @param {number}  [props.opacity]
 */
export function Pieza({ d, dx = 1.3, dy = 1.9, tono = 'cara', filo = true, fillRule, opacity }) {
  const cara = useTono(tono);
  const canto = useTono('canto');
  return (
    <g opacity={opacity}>
      <path d={d} transform={`translate(${dx} ${dy})`} fill={canto} fillRule={fillRule} />
      <path d={d} fill={cara} fillRule={fillRule} />
      {filo && (
        <path
          d={d}
          fill="none"
          fillRule={fillRule}
          stroke="#F7EBC4"
          strokeOpacity="0.45"
          strokeWidth="0.6"
        />
      )}
    </g>
  );
}

/**
 * Un aro: círculo con agujero, para dibujarlo relleno en vez de con un trazo grueso.
 *
 * Con `stroke` no hay canto ni filo posibles —un trazo no tiene borde propio— así que el aro
 * quedaría plano entre piezas con bulto. Como contorno con agujero entra en la misma regla que
 * todo lo demás.
 */
export function aro(cx, cy, r, grosor) {
  const ri = r - grosor;
  return `${disco(cx, cy, r)} M${cx - ri},${cy} a${ri},${ri} 0 1,1 ${2 * ri},0 a${ri},${ri} 0 1,1 ${-2 * ri},0 Z`;
}

/**
 * Un disco macizo, como contorno.
 *
 * Existe para no tener que pedirle a `aro()` un grosor igual al radio: eso deja el agujero en
 * radio cero y produce un arco degenerado que cada navegador dibuja a su manera. Una piedra o
 * un botón son discos, no aros con el agujero cerrado.
 */
export function disco(cx, cy, r) {
  return `M${cx - r},${cy} a${r},${r} 0 1,0 ${2 * r},0 a${r},${r} 0 1,0 ${-2 * r},0 Z`;
}

/**
 * Un globo: redondo arriba y acabado en punta abajo, donde se ata el hilo.
 *
 * No es un círculo. Un círculo con un hilo colgando se lee como una pelota atada.
 */
export function globo(x, y, r) {
  return (
    `M${x},${y - r} C${x + r * 1.06},${y - r} ${x + r * 1.06},${y + r * 0.72} ${x},${y + r * 1.16} ` +
    `C${x - r * 1.06},${y + r * 0.72} ${x - r * 1.06},${y - r} ${x},${y - r} Z`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EL ESCENARIO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * El suelo: charco de luz y sombra de contacto.
 *
 * Va SIEMPRE, y antes que el motivo. Es lo que convierte «una figura sobre un rectángulo» en
 * «algo puesto en un sitio».
 */
export function Suelo({ y = 92, ancho = 62, sombra = 46 }) {
  const piso = useTono('piso');
  const sombraTono = useTono('sombra');
  return (
    <>
      <ellipse cx="100" cy={y + 2} rx={ancho} ry="7" fill={piso} />
      <ellipse cx="100" cy={y} rx={sombra} ry="4.5" fill={sombraTono} />
    </>
  );
}

/** Chispas de luz. Dan aire arriba sin dibujar nada concreto. */
export function Chispas({ puntos }) {
  return (
    <>
      {puntos.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#F4E4AE" opacity={0.22 + (i % 3) * 0.16} />
      ))}
    </>
  );
}

/**
 * Una guirnalda de luces colgada, que aparece en las escenas de fiesta.
 *
 * El punto medio de la curva se CALCULA a partir de los extremos. Estaba fijo en x = 100 —el
 * centro del lienzo de las escenas— y para estirarla al telón ancho hubo que envolverla en un
 * `scale(3 1)`, que deformó las bombillas: salieron ovaladas. Un componente que solo sirve a
 * un ancho obliga a deformarlo para los demás.
 */
export function Guirnalda({ y = 16, caida = 12, desde = 10, hasta = 190, luces = 7 }) {
  const puntos = [];
  for (let i = 1; i <= luces; i += 1) {
    const t = i / (luces + 1);
    puntos.push([desde + (hasta - desde) * t, y + caida * 4 * t * (1 - t)]);
  }
  return (
    <>
      <path
        d={`M${desde} ${y} Q${(desde + hasta) / 2} ${y + caida * 2} ${hasta} ${y}`}
        fill="none"
        stroke="#C9A84C"
        strokeOpacity="0.35"
        strokeWidth="0.8"
      />
      {puntos.map(([x, cy], i) => (
        <g key={i}>
          <circle cx={x} cy={cy + 3.4} r="3.4" fill="#F4E4AE" opacity="0.13" />
          <circle cx={x} cy={cy + 3.4} r="1.5" fill="#F4E4AE" opacity="0.8" />
        </g>
      ))}
    </>
  );
}

/**
 * Siluetas de fondo, muy apagadas.
 *
 * Son el tercer plano. Nadie las mira y esa es la idea: dan lejanía para que el motivo se lea
 * como si estuviera DELANTE de algo, no pegado sobre un color.
 */
export function Fondo({ d, opacity = 0.14 }) {
  return <path d={d} fill="#C9A84C" opacity={opacity} />;
}
