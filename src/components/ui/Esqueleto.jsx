/**
 * Esqueleto — el hueco con la forma de lo que va a llegar.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * POR QUÉ ESTO NO ES ADORNO
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * El sitio hacía `if (isLoading) return null`, o sea: **mientras Supabase responde, la sección
 * NO EXISTE**. Y cuando responde, aparece de golpe y empuja todo lo de abajo.
 *
 * Para el visitante eso no se lee como «está cargando». Se lee como «está roto». Palabras del
 * dueño, sobre la página de servicios: *«cambié a servicios y se me trabó, no me cargó nada»*.
 * No estaba trabada: estaba pidiendo datos, en silencio y sin ocupar sitio.
 *
 * Un esqueleto arregla las dos cosas a la vez:
 *
 *   1. **Dice que hay algo en camino**, en vez de dejar un vacío que parece un fallo.
 *   2. **Reserva el espacio exacto**, así que cuando llega el contenido nada salta. Ese salto
 *      —el contenido que se mueve bajo el dedo justo cuando ibas a tocar— es de las cosas que
 *      más ensucian la experiencia y, además, Google lo mide y lo penaliza.
 *
 * ── La regla ────────────────────────────────────────────────────────────────
 *
 * Un esqueleto tiene que **parecerse a lo que sustituye**. Cuatro rectángulos genéricos no
 * sirven: si van a llegar tarjetas con foto arriba y dos líneas de texto, el hueco tiene que
 * tener foto arriba y dos líneas. Si no, el salto sigue existiendo, solo que ahora con adorno.
 *
 * ── El pulso ────────────────────────────────────────────────────────────────
 *
 * `animate-pulse` de Tailwind: solo opacidad, que el navegador anima sin recalcular el diseño.
 * Y `prefers-reduced-motion` lo desactiva solo, sin que haya que hacer nada aquí.
 */

/** Una pieza suelta: la unidad con la que se construye todo lo demás. */
export function Bloque({ className = '' }) {
  return <div aria-hidden="true" className={`animate-pulse rounded bg-white/[0.06] ${className}`} />;
}

/**
 * Rejilla de tarjetas con foto. Es la forma de los espacios, los tipos de evento y las fichas
 * de servicios y amenidades.
 */
export function EsqueletoTarjetas({ cuantas = 4, columnas = 'sm:grid-cols-2', conFoto = true }) {
  return (
    <ul className={`grid gap-4 ${columnas}`} aria-hidden="true">
      {Array.from({ length: cuantas }).map((_, i) => (
        <li key={i} className="skeu-card overflow-hidden rounded-2xl">
          {conFoto && <Bloque className="aspect-[16/10] w-full rounded-none" />}
          <div className="space-y-3 p-6">
            <Bloque className="h-5 w-2/3" />
            <Bloque className="h-3 w-full" />
            <Bloque className="h-3 w-4/5" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Mosaico de fotos, para la galería y sus asomos. */
export function EsqueletoMosaico({ cuantas = 8 }) {
  // Alturas distintas a propósito: un mosaico real no es una cuadrícula perfecta, y un hueco
  // demasiado ordenado avisa de que es falso.
  const altos = ['h-40', 'h-56', 'h-44', 'h-64', 'h-48', 'h-40', 'h-60', 'h-44'];
  return (
    <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 [&>*]:mb-3" aria-hidden="true">
      {Array.from({ length: cuantas }).map((_, i) => (
        <Bloque key={i} className={`w-full rounded-xl ${altos[i % altos.length]}`} />
      ))}
    </div>
  );
}

/** Párrafos: preguntas frecuentes, avisos, bloques de texto. */
export function EsqueletoTexto({ lineas = 3, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`} aria-hidden="true">
      {Array.from({ length: lineas }).map((_, i) => (
        <Bloque key={i} className={`h-3 ${i === lineas - 1 ? 'w-3/5' : 'w-full'}`} />
      ))}
    </div>
  );
}

/**
 * El aviso de que algo está cargando, para quien no ve la pantalla.
 *
 * Los esqueletos van con `aria-hidden` porque son ruido para un lector: describirlos sería
 * leer «cuadro gris, cuadro gris, cuadro gris». Esta línea dice lo único que importa —que hay
 * algo en camino— y la dice una sola vez.
 */
export function AvisoCargando({ que = 'contenido' }) {
  return (
    <p role="status" aria-live="polite" className="sr-only">
      Cargando {que}…
    </p>
  );
}
