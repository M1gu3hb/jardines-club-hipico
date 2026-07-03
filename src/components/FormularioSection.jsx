import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const SALONES = [
  { id: "cerrado", nombre: "Salón Cerrado", icon: "🏛️" },
  { id: "encanto", nombre: "Salón Encanto", icon: "✨" },
  { id: "kiosco", nombre: "Kiosco", icon: "🌿" },
  { id: "jardines", nombre: "Jardines", icon: "🌺" },
  { id: "pony", nombre: "Pony (Juegos)", icon: "🎠" },
];

export default function FormularioSection({ onOpenForm }) {
  return (
    <section id="formulario" className="py-24 px-6 bg-[#0d0d0d]">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-14"
        >
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="h-px w-12 bg-[#C9A84C]/40" />
            <span className="text-[#C9A84C]/60 text-xs tracking-[0.3em] uppercase">Cotización</span>
            <div className="h-px w-12 bg-[#C9A84C]/40" />
          </div>
          <h2 className="text-4xl md:text-5xl font-thin text-white mb-4">Formulario Rápido</h2>
          <p className="text-white/40 text-sm max-w-md mx-auto leading-relaxed">
            Sin compromisos. Cuéntanos sobre tu evento y te enviamos una cotización personalizada.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="bg-[#111] border border-[#C9A84C]/15 p-10 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center mx-auto mb-6">
            <Sparkles size={24} className="text-[#C9A84C]" />
          </div>
          <h3 className="text-white text-2xl font-thin mb-3">Elige tu espacio</h3>
          <p className="text-white/40 text-sm mb-8 leading-relaxed max-w-sm mx-auto">
            Selecciona el salón y completa el formulario. Te responderemos en menos de 24 horas.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
            {SALONES.map((s) => (
              <motion.button
                key={s.id}
                onClick={() => onOpenForm(s.nombre)}
                className="flex flex-col items-center gap-2 p-4 border border-white/8 hover:border-[#C9A84C]/50 hover:bg-[#C9A84C]/5 transition-all group"
                whileHover={{ y: -2 }}
              >
                <span className="text-2xl">{s.icon}</span>
                <span className="text-white/50 group-hover:text-white/80 text-xs font-light text-center leading-tight transition-colors">
                  {s.nombre}
                </span>
              </motion.button>
            ))}
          </div>

          <button
            onClick={() => onOpenForm("")}
            className="inline-flex items-center gap-3 bg-[#C9A84C] hover:bg-[#d4b558] text-[#0a0a0a] font-medium text-sm tracking-[0.15em] uppercase px-10 py-4 transition-all"
          >
            <Sparkles size={16} />
            Empezar
          </button>
        </motion.div>
      </div>
    </section>
  );
}