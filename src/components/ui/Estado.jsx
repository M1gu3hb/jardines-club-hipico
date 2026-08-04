import { AlertTriangle, RotateCw } from "lucide-react";

/**
 * Estado.jsx — cómo se ve una lectura que aún no ha llegado, que no trajo nada, o que se cayó.
 *
 * Las tres situaciones se pintaban igual ("No hay nada todavía") porque el shim devuelve `[]`
 * en las tres. Aquí se separan a propósito:
 *
 *   - CARGANDO → un esqueleto con la FORMA de lo que va a aparecer. No un spinner centrado:
 *     el esqueleto dice cuánto va a haber y evita el salto de layout al llegar.
 *   - VACÍO    → un texto que explica que de verdad no hay nada, y qué hacer para que lo haya.
 *   - FALLÓ    → se dice que falló, y se ofrece reintentar. Nunca se disfraza de "vacío".
 *
 * La regla que gobierna todo esto: **una pantalla no puede afirmar que algo no existe cuando
 * lo que pasó es que no pudo mirarlo.**
 */

/** Bloque gris con pulso. `className` fija el tamaño; por eso no trae alto por defecto. */
export function Esqueleto({ className = "" }) {
  return <div className={`bg-white/[0.06] rounded animate-pulse ${className}`} aria-hidden="true" />;
}

/** Varias filas del alto de una tarjeta de lista. */
export function EsqueletoFilas({ filas = 3, alto = "h-16" }) {
  return (
    <div className="space-y-2.5" aria-hidden="true">
      {Array.from({ length: filas }, (_, i) => (
        <Esqueleto key={i} className={`w-full ${alto}`} />
      ))}
    </div>
  );
}

/** Rejilla de tarjetas (galería, salones, servicios con imagen). */
export function EsqueletoTarjetas({ n = 3, alto = "h-40", columnas = "sm:grid-cols-2 lg:grid-cols-3" }) {
  return (
    <div className={`grid grid-cols-1 ${columnas} gap-4`} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <Esqueleto key={i} className={`w-full ${alto}`} />
      ))}
    </div>
  );
}

/** Párrafo: líneas de anchos distintos para que no parezca una tabla. */
export function EsqueletoTexto({ lineas = 3 }) {
  const anchos = ["w-full", "w-11/12", "w-9/12", "w-10/12", "w-8/12"];
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: lineas }, (_, i) => (
        <Esqueleto key={i} className={`h-3.5 ${anchos[i % anchos.length]}`} />
      ))}
    </div>
  );
}

/**
 * Envoltorio de los tres estados.
 *
 *   <Estado cargando={cargando} error={error} onReintentar={recargar}
 *           vacio={lista.length === 0} mensajeVacio="Aún no hay reseñas."
 *           esqueleto={<EsqueletoFilas filas={4} />}>
 *     …la lista…
 *   </Estado>
 *
 * `vacio` lo decide quien llama: solo esa pantalla sabe si "vacío" es la lista entera o la lista
 * después de aplicar sus filtros, y son mensajes distintos.
 */
export function Estado({
  // Con valores por defecto: hay pantallas que solo necesitan dos de los tres estados (el
  // cronograma tiene su propia ilustración de vacío) y exigirles las cinco props no aporta nada.
  cargando = false, error = null, vacio = false, onReintentar = null,
  esqueleto = <EsqueletoFilas />,
  mensajeVacio = "No hay nada todavía.",
  mensajeError = "No se pudo cargar esta sección.",
  children = null,
}) {
  if (cargando) return esqueleto;
  if (error) {
    return (
      <div className="border border-red-400/25 bg-red-400/5 rounded px-4 py-3.5">
        <p className="text-red-300/90 text-sm flex items-center gap-2">
          <AlertTriangle size={14} className="flex-shrink-0" /> {mensajeError}
        </p>
        <p className="text-white/40 text-xs mt-1.5 leading-relaxed">
          No es que esté vacío: la información no se pudo leer. Si vuelve a pasar, avisa a soporte.
        </p>
        {onReintentar && (
          <button
            onClick={onReintentar}
            className="flex items-center gap-2 text-red-300/80 hover:text-red-300 text-xs mt-3 border border-red-400/25 hover:border-red-400/50 px-3 py-1.5 rounded transition-all"
          >
            <RotateCw size={12} /> Reintentar
          </button>
        )}
      </div>
    );
  }
  if (vacio) return <p className="text-white/25 text-sm py-8 text-center">{mensajeVacio}</p>;
  return children;
}
