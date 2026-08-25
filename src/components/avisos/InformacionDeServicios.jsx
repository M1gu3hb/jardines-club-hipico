import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { EsqueletoTexto } from '@/components/ui/Esqueleto';

/**
 * InformacionDeServicios — los avisos que el sitio SIEMPRE tuvo.
 *
 * ═════════════════════════════════════════════════════════════════════════════
 * ESTO NO ES NUEVO: SE HABIA PERDIDO
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * El dueño insistió dos veces: *«ojo, sí había avisos, ¿eh? O sea, era información, avisos
 * importantes, información de servicios, ahí sí estaban»*. Tenía razón y yo no los había
 * encontrado: vivían en `NoIncluyeSection`, un nombre que no dice nada de lo que contiene, y
 * al rehacer la portada se quedaron fuera sin que nadie lo notara.
 *
 * El texto sale de `config_sitio.informacion_servicios` y hoy trae tres párrafos que el dueño
 * escribió desde el panel. Se comprobó leyendo la base **con el rol `anon`**, que es el que
 * usa un visitante: 465 caracteres, ahí están.
 *
 * ── Por qué en ámbar y no en dorado ─────────────────────────────────────
 *
 * El dorado es el color de la marca y está en todo el sitio; si esto fuera dorado sería una
 * sección más. El ámbar dice «esto es distinto, léelo» sin llegar al rojo, que sería una
 * alarma y aquí no hay ninguna: son condiciones de trabajo, no advertencias.
 *
 * Es del sitio original y se conserva tal cual.
 */
export default function InformacionDeServicios({ texto, cargando = false }) {
  const lineas = (texto || '').split('\n').map((l) => l.trim()).filter(Boolean);

  // Si no hay texto y no se está cargando, no se pinta un cartel vacío con su título dentro:
  // una caja de avisos sin avisos es peor que no tener caja.
  if (!cargando && lineas.length === 0) return null;

  return (
    <section
      id="informacion-servicios"
      aria-labelledby="informacion-servicios-h"
      className="w-full border-t border-white/5 bg-[#050505] px-5 py-20 sm:px-8 md:py-24"
    >
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <div className="mb-6 flex items-center gap-4">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-amber-500/40" />
            <span className="text-xs tracking-[0.35em] uppercase text-amber-500/60">
              Avisos importantes
            </span>
          </div>

          <h2
            id="informacion-servicios-h"
            className="mb-10 text-3xl font-thin text-white sm:text-4xl"
          >
            Información de servicios
          </h2>

          <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-6 backdrop-blur-sm sm:p-8">
            <div className="mb-6 flex gap-3">
              <AlertCircle
                size={16}
                aria-hidden="true"
                className="mt-0.5 flex-shrink-0 text-amber-500/60"
              />
              <span className="text-xs font-medium tracking-wider uppercase text-amber-500/60">
                Por favor lee con atención
              </span>
            </div>

            {cargando ? (
              <EsqueletoTexto lineas={5} />
            ) : (
              <div className="space-y-3">
                {lineas.map((linea, i) => (
                  <p key={i} className="text-sm leading-relaxed text-white/50">
                    {linea}
                  </p>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
