import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Plus, Minus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ServiceAmenityCard from "./ServiceAmenityCard";
import BarraDulces from "./BarraDulces";

const defaultServicios = [
  { titulo: "Atención personalizada desde la cotización hasta el día del evento" },
  { titulo: "Coordinación de montaje y desmontaje" },
  { titulo: "Estacionamiento amplio para invitados" },
  { titulo: "Señalización y acceso accesible" },
  { titulo: "Asesoría en decoración y logística" },
  { titulo: "Flexibilidad de horarios según el evento" },
  { titulo: "Seguridad privada durante el evento" },
];

const defaultAmenidades = [
  { titulo: "Múltiples espacios: interior, exterior y semiabierto" },
  { titulo: "Área de cocina equipada para catering externo" },
  { titulo: "Sanitarios amplios y limpios" },
  { titulo: "Área de bar y montaje de mesa de dulces" },
  { titulo: "Jardines naturales y vegetación ornamental" },
  { titulo: "Iluminación decorativa y regulable" },
  { titulo: "Acceso peatonal y vehicular independiente" },
  { titulo: "WiFi disponible en instalaciones" },
];

const PREVIEW_COUNT = 4;

/**
 * Sección de Servicios/Amenidades con resumen visual + "Ver más".
 * - Muestra los primeros PREVIEW_COUNT items.
 * - El resto se despliega inline con transición elegante.
 * - Header con eyebrow + título grande (no listota plana).
 */
function ItemsSection({ id, eyebrow, titulo, descripcion, items }) {
  const [expanded, setExpanded] = useState(false);

  const visible = expanded ? items : items.slice(0, PREVIEW_COUNT);
  const rest = items.length - PREVIEW_COUNT;
  const hasMore = items.length > PREVIEW_COUNT;

  return (
    <section
      id={id}
      className="py-16 md:py-24 px-4 sm:px-6 md:px-8 bg-[#050505] border-b border-white/[0.04] w-full"
    >
      <div className="max-w-5xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-8 md:mb-12 text-center"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-12 sm:w-16 bg-gradient-to-r from-transparent to-[#C9A84C]/50" />
            <span className="text-[#C9A84C]/70 text-[10px] md:text-xs tracking-[0.3em] uppercase">
              {eyebrow}
            </span>
            <div className="h-px w-12 sm:w-16 bg-gradient-to-l from-transparent to-[#C9A84C]/50" />
          </div>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-thin text-white mb-3">{titulo}</h2>
          {descripcion && (
            <p className="text-white/45 text-sm md:text-[15px] max-w-xl mx-auto leading-relaxed">
              {descripcion}
            </p>
          )}
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <AnimatePresence initial={false}>
            {visible.map((item, i) => (
              <motion.div
                key={item.id || `${item.titulo}-${i}`}
                layout
                initial={i >= PREVIEW_COUNT ? { opacity: 0, y: 10 } : false}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, delay: i >= PREVIEW_COUNT ? (i - PREVIEW_COUNT) * 0.04 : 0 }}
              >
                <ServiceAmenityCard
                  item={item}
                  delay={Math.min(i * 0.04, 0.25)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {hasMore && (
          <div className="flex justify-center mt-8 md:mt-10">
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="group inline-flex items-center gap-2.5 px-6 sm:px-7 py-3 sm:py-3.5 rounded-full text-xs sm:text-[13px] tracking-[0.25em] uppercase font-medium transition-all duration-300"
              style={{
                background: "linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)",
                color: "#E6C870",
                border: "1px solid rgba(201,168,76,0.4)",
                boxShadow:
                  "0 1px 0 rgba(255,220,140,0.1) inset, 0 -1px 2px rgba(0,0,0,0.6) inset, 0 8px 22px -8px rgba(0,0,0,0.8), 0 0 22px -6px rgba(201,168,76,0.25)",
              }}
            >
              {expanded ? (
                <>
                  <Minus size={14} />
                  <span>Ver menos</span>
                </>
              ) : (
                <>
                  <Plus size={14} />
                  <span>Ver {rest} más</span>
                </>
              )}
              <ChevronDown
                size={14}
                className={`transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
              />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default function ServiciosAmenidades() {
  const [servicios, setServicios] = useState(null);
  const [amenidades, setAmenidades] = useState(null);

  useEffect(() => {
    base44.entities.ServicioItem.filter({ activo: true }, "orden")
      .then(setServicios).catch(() => setServicios([]));
    base44.entities.AmenidadItem.filter({ activo: true }, "orden")
      .then(setAmenidades).catch(() => setAmenidades([]));
  }, []);

  const serviciosList = servicios && servicios.length > 0 ? servicios : defaultServicios;
  const amenidadesList = amenidades && amenidades.length > 0 ? amenidades : defaultAmenidades;

  return (
    <>
      <ItemsSection
        id="servicios"
        eyebrow="Lo que ofrecemos"
        titulo="Servicios"
        descripcion="Acompañamiento completo para que tu evento se sienta impecable de principio a fin."
        items={serviciosList}
      />
      <BarraDulces />
      <ItemsSection
        id="amenidades"
        eyebrow="Instalaciones"
        titulo="Amenidades"
        descripcion="Espacios y detalles pensados para la comodidad de tus invitados."
        items={amenidadesList}
      />
    </>
  );
}