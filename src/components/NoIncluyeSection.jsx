import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

export default function NoIncluyeSection({ texto }) {
  const lines = (texto || "").split("\n").filter(Boolean);

  return (
    <section id="no-incluye" className="py-24 px-6 bg-[#050505] border-t border-white/5">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-amber-500/40" />
            <span className="text-amber-500/60 text-xs tracking-[0.35em] uppercase">Avisos importantes</span>
          </div>
          <h2 className="text-4xl font-thin text-white mb-10">Información de Servicios</h2>

          <div className="bg-amber-500/5 border border-amber-500/15 p-8 rounded-2xl backdrop-blur-sm">
            <div className="flex gap-3 mb-6">
              <AlertCircle size={16} className="text-amber-500/60 flex-shrink-0 mt-0.5" />
              <span className="text-amber-500/60 text-xs uppercase tracking-wider font-medium">Por favor lee con atención</span>
            </div>
            <div className="space-y-3">
              {lines.map((line, i) => (
                <p key={i} className="text-white/50 text-sm leading-relaxed">{line}</p>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}