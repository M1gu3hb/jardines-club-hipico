import { Check, Sparkles } from 'lucide-react';
import { sugerenciasPara } from '@/lib/sugerencias';

/**
 * Sugerencias — «esto también existe, ¿te interesa?».
 *
 * ── Qué problema resuelve, dicho por el dueño ───────────────────────────────
 *
 * *«Sugiérele servicios o amenidades. Me ahorraría mucho tiempo, la verdad, estárselos
 * vendiendo. Si lo eligen y lo mandan en el formulario, ya sé que eso quieren, o al menos lo
 * pensaron.»*
 *
 * Y sirve igual para el otro lado: casi nadie que llega a este formulario sabe que aquí hay
 * cámara 360, chinelos, un auto clásico o una alberca. Enseñárselo justo cuando acaba de
 * escribir «XV años» no es vender: es informar en el único momento en que le interesa.
 *
 * ── Tres decisiones ─────────────────────────────────────────────────────────
 *
 * 1. **No aparece hasta que hay tipo de evento.** Una lista de quince cosas antes de saber qué
 *    celebra es ruido, y ruido justo delante del botón de enviar.
 *
 * 2. **Nada es obligatorio y se dice.** Marcar cero casillas tiene que sentirse tan correcto
 *    como marcar cinco. Si esto pareciera un paso más del formulario, subiría el abandono
 *    justo antes de convertir.
 *
 * 3. **Ni un precio.** No es un carrito ni un configurador con total. Lo que se marca viaja
 *    como interés, y el precio sale en la cotización, que es como trabaja el negocio.
 */
export default function Sugerencias({ tipoEvento, personas, disponibles, elegidos, onToggle }) {
  const { items, porTamano } = sugerenciasPara(tipoEvento, personas, disponibles);
  if (items.length === 0) return null;

  return (
    <fieldset className="rounded-2xl border border-[#C9A84C]/15 bg-[#C9A84C]/[0.03] p-4">
      <legend className="flex items-center gap-2 px-2 text-[10px] font-light tracking-[0.16em] uppercase text-[#C9A84C]/80">
        <Sparkles size={12} aria-hidden="true" />
        Para un evento así solemos ofrecer
      </legend>

      <p className="mt-1 mb-3 text-[11px] font-light leading-relaxed text-white/35">
        Marca lo que te llame la atención y lo incluimos en tu cotización. Nada de esto te
        compromete, y no marcar nada también está bien.
      </p>

      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const titulo = item.titulo || item.nombre;
          const marcado = elegidos.includes(titulo);
          return (
            <button
              key={item.id || titulo}
              type="button"
              onClick={() => onToggle(titulo)}
              aria-pressed={marcado}
              className={[
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-light transition-colors',
                marcado
                  ? 'border-[#C9A84C] bg-[#C9A84C]/15 text-[#C9A84C]'
                  : 'border-white/10 text-white/45 hover:border-white/30 hover:text-white/70',
              ].join(' ')}
            >
              {/* El icono ocupa su sitio siempre, marcado o no. Si apareciera solo al marcar,
                  la fila entera se recolocaria a cada clic y las casillas saltarian bajo el
                  dedo — en movil eso hace que se marque otra cosa sin querer. */}
              <Check
                size={11}
                aria-hidden="true"
                className={marcado ? 'opacity-100' : 'opacity-0'}
              />
              {titulo}
            </button>
          );
        })}
      </div>

      {porTamano.map((motivo) => (
        <p key={motivo} className="mt-3 text-[11px] font-light leading-relaxed text-white/40">
          {motivo}
        </p>
      ))}
    </fieldset>
  );
}
