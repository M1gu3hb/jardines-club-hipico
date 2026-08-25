/**
 * BloqueTexto — un bloque de prosa con su encabezado.
 *
 * ── Por qué el texto se parte en párrafos aquí y no se guarda como HTML ─────
 *
 * Porque el contenido viene de la base o de una constante, y lo que llega es texto plano con
 * renglones en blanco entre párrafos. Meterlo tal cual en un `<p>` lo dejaría como un ladrillo
 * sin separaciones; meterlo con `dangerouslySetInnerHTML` abriría la puerta a inyectar HTML
 * desde el panel, que es exactamente el agujero que no se quiere en un CMS.
 *
 * Partir por línea en blanco resuelve las dos cosas: se ven párrafos y nada de lo que se
 * escriba en el panel puede ejecutarse.
 *
 * ── El ancho de lectura no es decorativo ────────────────────────────────────
 *
 * `max-w-3xl` sale de una regla vieja de tipografía: entre 60 y 75 caracteres por línea. Más
 * ancho y el ojo pierde el renglón al volver a la izquierda, que es lo que hace que un texto
 * largo se sienta pesado aunque sea bueno.
 *
 * Las props van declaradas con sus opcionales marcadas: sin esto TypeScript deduce que TODAS
 * son obligatorias por estar desestructuradas, y cada bloque sin `eyebrow` —o sea, la mayoría—
 * sale como error de tipos.
 *
 * @param {Object} props
 * @param {any}    [props.eyebrow]  Sobretítulo pequeño. Admite texto o un icono.
 * @param {string} [props.titulo]
 * @param {string} [props.texto]    Texto plano; los párrafos se separan por línea en blanco.
 * @param {any}    [props.children] Lo que va DESPUÉS del texto: listas, tarjetas, un botón.
 * @param {string} [props.id]       Ancla y `aria-labelledby` del bloque.
 */
export default function BloqueTexto({ eyebrow, titulo, texto, children, id }) {
  const parrafos = String(texto || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <section id={id} aria-labelledby={id ? `${id}-h` : undefined} className="py-12 sm:py-16">
      {eyebrow && (
        <div className="flex items-center gap-4">
          <span className="h-px w-10 bg-gradient-to-r from-[#C9A84C]/60 to-transparent" />
          <span className="text-[#C9A84C]/75 text-[10px] font-light tracking-[0.32em] uppercase">
            {eyebrow}
          </span>
        </div>
      )}

      {titulo && (
        <h2
          id={id ? `${id}-h` : undefined}
          className="mt-5 text-2xl sm:text-4xl font-extralight tracking-tight text-white/95"
        >
          {titulo}
        </h2>
      )}

      <div className="mt-6 max-w-3xl space-y-4 text-base font-light leading-[1.85] text-white/60">
        {parrafos.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {children}
    </section>
  );
}
