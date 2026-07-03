import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Candy, ChevronDown, Check, Maximize2 } from "lucide-react";
import MediaViewer from "./MediaViewer";

const FLYER = "/media/img/dulce-corazon.png";
const ROSA = "#E23D7A";

const FEATURES = [
  "Servicio limpio, puntual y profesional",
  "Carritos bonitos y bien equipados",
  "Variedad de snacks que encantan a niños y adultos",
];

/**
 * Servicio DESTACADO en colaboración: "Dulce Corazón" (barra de dulces / carritos
 * de snacks). Va debajo de la sección Servicios y resalta más que las tarjetas
 * normales (acento rosa). Al pulsarlo se despliega el flyer completo + descripción;
 * la imagen se puede abrir a pantalla completa.
 */
export default function BarraDulces() {
  const [open, setOpen] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  return (
    <section className="px-4 sm:px-6 bg-[#050505] w-full pb-14 md:pb-20">
      <div className="max-w-5xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.55 }}
          className="relative rounded-[26px] overflow-hidden"
          style={{
            background: "linear-gradient(155deg, #1c0f16 0%, #140a10 55%, #0a0608 100%)",
            border: `1px solid ${ROSA}66`,
            boxShadow: `0 1px 0 rgba(255,200,220,0.06) inset, 0 24px 50px -20px rgba(0,0,0,0.9), 0 0 40px -12px ${ROSA}55`,
          }}
        >
          {/* Highlight superior rosa */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${ROSA}, transparent)` }} />

          {/* Encabezado clicable */}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="w-full flex items-center gap-4 sm:gap-5 p-5 sm:p-6 text-left"
          >
            <div
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: `linear-gradient(180deg, ${ROSA}, #a51f52)`, boxShadow: `0 8px 20px -6px ${ROSA}88` }}
            >
              <Candy size={26} className="text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span
                  className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full"
                  style={{ background: ROSA, color: "#fff" }}
                >
                  Nuevo
                </span>
                <span className="text-[10px] tracking-[0.25em] uppercase" style={{ color: `${ROSA}` }}>
                  En colaboración
                </span>
              </div>
              <h3 className="text-white font-light leading-tight text-xl sm:text-2xl md:text-[28px]">
                Ahora contamos con{" "}
                <span style={{ color: "#F5A9C6" }} className="font-normal">Barra de Dulces</span>
              </h3>
              <p className="text-white/45 text-xs sm:text-sm mt-1">
                Dulce Corazón · Carritos de snacks para tu evento
              </p>
            </div>

            <span
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs"
              style={{ background: `${ROSA}1a`, border: `1px solid ${ROSA}55`, color: "#F5A9C6" }}
            >
              <span className="hidden sm:inline">{open ? "Ocultar" : "Ver más"}</span>
              <ChevronDown size={15} className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
            </span>
          </button>

          {/* Contenido desplegable */}
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="px-5 sm:px-6 pb-6 grid md:grid-cols-2 gap-6 items-start">
                  {/* Flyer */}
                  <button
                    type="button"
                    onClick={() => setLightbox(true)}
                    className="relative group rounded-2xl overflow-hidden block w-full"
                    style={{ border: `1px solid ${ROSA}44` }}
                    aria-label="Ver imagen completa"
                  >
                    <img src={FLYER} alt="Dulce Corazón — Carritos de snacks para eventos" loading="lazy" className="w-full h-auto block" />
                    <span className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] text-white bg-black/55 backdrop-blur-sm opacity-80 group-hover:opacity-100 transition-opacity">
                      <Maximize2 size={12} /> Ampliar
                    </span>
                  </button>

                  {/* Descripción */}
                  <div>
                    <p className="text-white/60 text-sm leading-relaxed">
                      Sorprende a tus invitados con los carritos de snacks de <span className="text-white/85">Dulce Corazón</span>:
                      barra de dulces, palomitas, fruta preparada, raspados y más. Un toque especial que encanta a niños y adultos,
                      disponible en colaboración con Jardines Club Hípico.
                    </p>

                    <ul className="mt-5 space-y-2.5">
                      {FEATURES.map((f, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-white/70 text-sm">
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{ background: `${ROSA}22`, border: `1px solid ${ROSA}66` }}
                          >
                            <Check size={11} style={{ color: "#F5A9C6" }} strokeWidth={2.5} />
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>

                    <p className="mt-5 text-[13px]" style={{ color: "#F5A9C6" }}>
                      Ideal para cumpleaños, bodas, baby showers, graduaciones, eventos empresariales y reuniones familiares.
                    </p>
                    <p className="mt-4 text-white/35 text-xs">
                      Pregúntanos por este servicio al cotizar tu evento.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <AnimatePresence>
        {lightbox && (
          <MediaViewer items={[{ url: FLYER, titulo: "Dulce Corazón" }]} startIdx={0} onClose={() => setLightbox(false)} />
        )}
      </AnimatePresence>
    </section>
  );
}
