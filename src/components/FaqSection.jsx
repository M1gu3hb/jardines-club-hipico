import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";

const FAQS = [
  {
    q: "¿Para cuántas personas son los espacios?",
    a: "Tenemos espacios desde 30 hasta 600 personas. Según el tamaño y tipo de tu evento te recomendamos el ideal — hemos realizado todo tipo de eventos en todos nuestros espacios.",
  },
  {
    q: "¿Cuentan con estacionamiento?",
    a: "Sí, contamos con estacionamiento amplio y acceso cómodo para tus invitados.",
  },
  {
    q: "¿Tienen hospedaje?",
    a: "Sí. Dentro del complejo tenemos bungalos (estancias) para que tú y tus invitados puedan descansar después del evento, sin necesidad de trasladarse.",
  },
  {
    q: "¿Tienen capilla para la ceremonia?",
    a: "Sí, contamos con una capilla propia. Puedes realizar la ceremonia y la recepción en el mismo lugar, o rentarla de forma independiente.",
  },
  {
    q: "¿El alquiler incluye alimentos y servicios?",
    a: "El alquiler corresponde al espacio. Alimentos, bebidas, DJ, decoración, mobiliario especial y demás servicios se cotizan por separado con nuestros proveedores autorizados. Con gusto te orientamos con todo por WhatsApp.",
  },
  {
    q: "¿Qué tipo de eventos realizan?",
    a: "Bodas, XV años, cumpleaños, eventos infantiles, corporativos y celebraciones nocturnas. Cada espacio se adapta a lo que necesites.",
  },
  {
    q: "¿Dónde están ubicados?",
    a: "En Sta Inés, Xochimilco, al sur de la Ciudad de México. Al enviar tu solicitud te compartimos la ubicación exacta en Google Maps.",
  },
  {
    q: "¿Cómo aparto mi fecha?",
    a: "Llena el formulario de cotización (te toma menos de 1 minuto) y nos ponemos en contacto contigo por WhatsApp para revisar disponibilidad y afinar todos los detalles de tu evento.",
  },
];

function Item({ faq, isOpen, onToggle }) {
  return (
    <div className="skeu-card overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-5 text-left"
        aria-expanded={isOpen}
      >
        <span className="text-white/85 text-sm sm:text-[15px] font-light">{faq.q}</span>
        <span
          className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`}
          style={{ border: "1px solid rgba(201,168,76,0.35)", color: "#C9A84C" }}
        >
          <Plus size={14} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <p className="px-5 sm:px-6 pb-5 text-white/45 text-sm leading-relaxed">{faq.a}</p>
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
