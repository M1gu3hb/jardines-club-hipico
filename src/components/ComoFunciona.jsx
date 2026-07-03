import { motion } from "framer-motion";
import { MousePointerClick, FileText, MessageCircle } from "lucide-react";

const PASOS = [
  {
    icon: MousePointerClick,
    titulo: "Elige tu espacio",
    desc: "Explora nuestros 8 espacios y su galería. ¿No sabes cuál? Nosotros te recomendamos según tu evento.",
  },
  {
    icon: FileText,
    titulo: "Cotiza sin costo",
    desc: "Llena el formulario en menos de 1 minuto: solo tus datos, el tipo de evento, la fecha y cuántos serán.",
  },
  {
    icon: MessageCircle,
    titulo: "Te atendemos por WhatsApp",
    desc: "Revisamos disponibilidad y afinamos contigo montaje, alimentos y servicios hasta confirmar tu fecha.",
  },
];

export default function ComoFunciona() {
  return (
    <section id="como-funciona" className="py-16 md:py-24 px-4 sm:px-6 bg-[#080808] border-b border-white/[0.04] w-full">
      <div className="max-w-5xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 md:mb-16"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-12 sm:w-16 bg-gradient-to-r from-transparent to-[#C9A84C]/50" />
            <span className="text-[#C9A84C]/70 text-[10px] md:text-xs tracking-[0.3em] uppercase">Fácil y rápido</span>
            <div className="h-px w-12 sm:w-16 bg-gradient-to-l from-transparent to-[#C9A84C]/50" />
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-thin text-white">Cómo funciona</h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {PASOS.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="skeu-card p-6 sm:p-7 text-center relative"
              >
                {/* Número */}
                <span
                  className="absolute top-4 right-5 text-5xl font-thin leading-none select-none"
                  style={{ color: "rgba(201,168,76,0.12)" }}
                >
                  {i + 1}
                </span>
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-5"
                  style={{
                    background: "linear-gradient(180deg, #1a1408 0%, #0a0805 100%)",
                    border: "1px solid rgba(201,168,76,0.4)",
                    boxShadow: "0 1px 0 rgba(255,220,140,0.15) inset, 0 4px 12px rgba(0,0,0,0.6)",
                  }}
                >
                  <Icon size={20} className="text-[#C9A84C]" />
                </div>
                <h3 className="text-white text-lg font-light mb-2.5">{p.titulo}</h3>
                <p className="text-white/45 text-sm leading-relaxed">{p.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
