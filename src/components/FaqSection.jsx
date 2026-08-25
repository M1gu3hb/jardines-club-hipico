import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, CornerDownRight } from "lucide-react";

// LAS PREGUNTAS YA NO VIVEN AQUÍ.
//
// Estaban escritas dentro de este componente, que es donde nacieron cuando el sitio era una
// sola página. Ahora las necesitan dos sitios —esta sección y `/preguntas-frecuentes`— y dos
// copias del mismo texto acaban SIEMPRE diciendo cosas distintas.
//
// La portada enseña solo las destacadas: una lista de nueve preguntas en medio de la Home
// interrumpe el recorrido en vez de ayudarlo. Las demás están en su página, enlazada abajo.
import { PREGUNTAS_DESTACADAS } from "@/data/preguntas";

const FAQS = PREGUNTAS_DESTACADAS;

function Item({ faq, isOpen, onToggle }) {
  return (
    <div
      className={`rounded-2xl overflow-hidden transition-colors duration-300 ${
        isOpen ? "bg-[#0e0e0e]" : "bg-[#0b0b0b] hover:bg-[#0e0e0e]"
      }`}
      style={{ border: `1px solid ${isOpen ? "rgba(201,168,76,0.4)" : "rgba(255,255,255,0.07)"}` }}
    >
      {/* Pregunta */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 sm:px-6 py-5 text-left"
        aria-expanded={isOpen}
      >
        {/* Marcador "P" de pregunta */}
        <span
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-semibold transition-all"
          style={{
            background: isOpen ? "linear-gradient(180deg, #E2C266, #A88532)" : "rgba(201,168,76,0.1)",
            color: isOpen ? "#1a1208" : "#C9A84C",
            border: "1px solid rgba(201,168,76,0.35)",
          }}
        >
          P
        </span>
        <span className={`flex-1 text-sm sm:text-[15px] font-normal ${isOpen ? "text-white" : "text-white/80"}`}>
          {faq.q}
        </span>
        <ChevronDown
          size={18}
          className={`flex-shrink-0 text-[#C9A84C] transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Respuesta */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 sm:px-6 pb-5">
              <div
                className="flex gap-3 pl-3 py-3 pr-4 rounded-xl"
                style={{ borderLeft: "2px solid #C9A84C", background: "rgba(201,168,76,0.05)" }}
              >
                <CornerDownRight size={16} className="text-[#C9A84C]/70 flex-shrink-0 mt-0.5" />
                <p className="text-white/55 text-sm leading-relaxed">{faq.a}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FaqSection() {
  const [openIdx, setOpenIdx] = useState(0);

  return (
    <section id="faq" className="py-16 md:py-24 px-4 sm:px-6 bg-[#050505] border-b border-white/[0.04] w-full">
      <div className="max-w-3xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 md:mb-14"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-12 sm:w-16 bg-gradient-to-r from-transparent to-[#C9A84C]/50" />
            <span className="text-[#C9A84C]/70 text-[10px] md:text-xs tracking-[0.3em] uppercase">Dudas frecuentes</span>
            <div className="h-px w-12 sm:w-16 bg-gradient-to-l from-transparent to-[#C9A84C]/50" />
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-thin text-white">Preguntas frecuentes</h2>
        </motion.div>

        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <Item key={i} faq={faq} isOpen={openIdx === i} onToggle={() => setOpenIdx(openIdx === i ? -1 : i)} />
          ))}
        </div>
      </div>
    </section>
  );
}
