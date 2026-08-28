import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { CONDICIONES } from '@/data/condiciones';

/**
 * Condiciones — las reglas de contratación, escritas antes de que nadie pague.
 *
 * ── Por qué van en `/avisos` y no escondidas ────────────────────────────────
 *
 * Porque son literalmente avisos: lo que conviene saber antes de apartar una fecha. Y porque
 * el sitio ya manda aquí desde el pie y desde el menú, así que existe un sitio al que
 * apuntar cuando alguien pregunte «¿y esto dónde lo dice?».
 *
 * ── Las dos que van marcadas ────────────────────────────────────────────────
 *
 * «El anticipo no se devuelve» y «todo liquidado una semana antes» llevan un realce. No es
 * decoración: son las dos únicas condiciones que **cuestan dinero al cliente si las ignora**,
 * y esconderlas entre las demás sería comunicarlas de forma técnicamente correcta y
 * prácticamente inútil.
 *
 * El resto se lee igual de bien sin realce, y así el realce significa algo.
 */
export default function Condiciones() {
  return (
    <section
      id="condiciones"
      aria-labelledby="condiciones-h"
      className="w-full border-t border-white/5 bg-[#0a0a0a] px-5 py-20 sm:px-8 md:py-24"
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-4">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#C9A84C]/50" />
          <span className="text-[10px] tracking-[0.32em] uppercase text-[#C9A84C]/75 sm:text-xs">
            Antes de apartar
          </span>
        </div>

        <h2
          id="condiciones-h"
          className="mb-4 text-3xl font-extralight tracking-tight text-white/95 sm:text-4xl"
        >
          Condiciones de{' '}
          <span className="font-serif italic bg-gradient-to-br from-[#F0DFA6] via-[#E2C266] to-[#C9A84C] bg-clip-text text-transparent">
            contratación
          </span>
        </h2>

        <p className="mb-10 max-w-2xl text-base font-light leading-relaxed text-white/50">
          Preferimos que las leas ahora y no el día de firmar. Si algo no te cuadra, dínoslo
          antes de apartar: casi todo se puede hablar.
        </p>

        <ul className="grid gap-4 sm:grid-cols-2">
          {CONDICIONES.map((c, i) => (
            <motion.li
              key={c.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: Math.min(i * 0.06, 0.3) }}
              className={
                c.subrayado
                  ? 'rounded-2xl border border-amber-500/25 bg-amber-500/[0.05] p-6'
                  : 'skeu-card rounded-2xl p-6'
              }
            >
              <div className="flex items-start gap-3">
                {c.subrayado && (
                  <ShieldCheck
                    size={15}
                    aria-hidden="true"
                    className="mt-1 shrink-0 text-amber-400/70"
                  />
                )}
                <div>
                  <h3
                    className={`text-base font-normal ${
                      c.subrayado ? 'text-amber-200/90' : 'text-white/90'
                    }`}
                  >
                    {c.titulo}
                  </h3>
                  <p className="mt-2 text-sm font-light leading-relaxed text-white/45">
                    {c.texto}
                  </p>
                </div>
              </div>
            </motion.li>
          ))}
        </ul>

        <p className="mt-8 text-xs font-light leading-relaxed text-[color:var(--texto-3)]">
          Estas condiciones son las que aplicamos siempre. Lo particular de tu evento —montaje,
          proveedores, horarios especiales— se acuerda contigo y queda por escrito en el
          contrato.
        </p>
      </div>
    </section>
  );
}
