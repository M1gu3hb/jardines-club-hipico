import { Degradados, ProveedorDePaleta, Guirnalda, Chispas } from './arte/piezas';
import { POR_SLUG } from './arte/escenas';

/**
 * ArteDeEvento — la escena dibujada de cada tipo de evento.
 *
 * Aquí solo está el marco: el lienzo, el halo, la viñeta y el reparto de prefijos. El lenguaje
 * visual vive en `arte/piezas.jsx` y las quince escenas en `arte/escenas.jsx`.
 *
 * ── Por qué se partió en tres archivos ──────────────────────────────────────
 *
 * Porque quince escenas con bulto no caben en uno. El anterior tenía 424 líneas con escenas de
 * trazo simple; estas piden bastante más. Separar el lenguaje del contenido además deja claro
 * dónde se toca cada cosa: el acabado en `piezas`, el dibujo en `escenas`, el montaje aquí.
 */

/** El lienzo de todas las escenas. 200 × 112 es 16/9 con un poco de aire. */
const LIENZO = { ancho: 200, alto: 112 };

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

  // El prefijo va por slug porque los `id` de un `<defs>` son globales a la PÁGINA, no al
  // `<svg>`. Con quince tarjetas juntas, quince degradados con el mismo nombre chocan.
  const pref = `arte-${slug}`;

  return (
    <div aria-hidden="true" className={`relative overflow-hidden bg-[#0b0a08] ${className}`}>
      <svg
        viewBox={`0 0 ${LIENZO.ancho} ${LIENZO.alto}`}
        className="h-full w-full"
        preserveAspectRatio="xMidYMid slice"
      >
        <ProveedorDePaleta value={pref}>
          <Degradados pref={pref} />
          <rect x="0" y="0" width={LIENZO.ancho} height={LIENZO.alto} fill={`url(#${pref}-halo)`} />
          <Escena />
          <rect x="0" y="0" width={LIENZO.ancho} height={LIENZO.alto} fill={`url(#${pref}-vineta)`} />
        </ProveedorDePaleta>
      </svg>
    </div>
  );
}

/**
 * El telón ancho de «cualquier otro evento».
 *
 * ── Por qué aquí NO hay un motivo dibujado ──────────────────────────────────
 *
 * Porque el mensaje es que cabe lo que sea, y cualquier objeto que se dibuje lo contradice: si
 * pongo una piñata, el banner dice «posadas»; si pongo unas copas, dice «fiesta». Lo único que
 * se puede dibujar sin cerrar la puerta es el sitio esperando: luces colgadas, un suelo
 * iluminado y nada encima.
 *
 * Va DETRÁS del texto, no al lado, y por eso es tan tenue: aquí manda lo que está escrito.
 */
export function TelonDeCualquierEvento({ className = '' }) {
  const pref = 'telon-abierto';
  return (
    <div aria-hidden="true" className={`absolute inset-0 overflow-hidden ${className}`}>
      <svg viewBox="0 0 600 150" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
        <ProveedorDePaleta value={pref}>
          <Degradados pref={pref} />
          <rect x="0" y="0" width="600" height="150" fill={`url(#${pref}-halo)`} />

          {/* Dos guirnaldas a alturas distintas: una sola se lee como una raya.
              Se les pasan las coordenadas del lienzo ancho directamente. Antes iban envueltas
              en un `scale(3 1)` y las bombillas salían ovaladas — escalar de forma desigual
              deforma todo lo que hay dentro, también lo que debía seguir siendo redondo. */}
          <Guirnalda y={14} caida={7} desde={6} hasta={594} luces={9} />
          <Guirnalda y={40} caida={5} desde={54} hasta={546} luces={7} />

          <ellipse cx="300" cy="152" rx="230" ry="48" fill={`url(#${pref}-piso)`} />
          <Chispas puntos={[[72, 70, 1.4], [528, 70, 1.4], [120, 94, 1], [480, 94, 1], [300, 60, 1.2]]} />

          <rect x="0" y="0" width="600" height="150" fill={`url(#${pref}-vineta)`} />
        </ProveedorDePaleta>
      </svg>
    </div>
  );
}
