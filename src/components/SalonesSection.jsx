import { useState } from "react";
import { motion } from "framer-motion";
import { Users } from "lucide-react";
import SalonOverlay from "./SalonOverlay";

const placeholderImg = "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=80";

const defaultSalones = [
  { id: "cerrado", nombre: "Salón Cerrado", descripcion: "Elegante salón cubierto con iluminación regulable, climatización y acabados de lujo.", capacidad: "50 – 150 personas", imagenPrincipal: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80" },
  { id: "encanto", nombre: "Salón Encanto", descripcion: "Espacio amplio con decoración cálida y romántica, perfecto para bodas y XV años.", capacidad: "80 – 200 personas", imagenPrincipal: "https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=800&q=80" },
  { id: "kiosco", nombre: "Kiosco", descripcion: "Espacio semiabierto con vista al jardín, ideal para cocktails y eventos al aire libre.", capacidad: "30 – 80 personas", imagenPrincipal: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=80" },
  { id: "jardines", nombre: "Jardines", descripcion: "Hermosos jardines naturales. El escenario perfecto para ceremonias al aire libre.", capacidad: "100 – 300 personas", imagenPrincipal: "https://images.unsplash.com/photo-1470509037663-253d2d33012c?w=800&q=80" },
  { id: "pony", nombre: "Pony (Juegos)", descripcion: "Área recreativa con juegos infantiles. El favorito de los más pequeños.", capacidad: "20 – 60 niños", imagenPrincipal: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80" },
];

export default function SalonesSection({ salones, onSelectSalon }) {
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [selectedSalon, setSelectedSalon] = useState(null);

  const listado = (salones && salones.length > 0) ? salones : defaultSalones;

  const openOverlay = (salon) => {
    setSelectedSalon(salon);
    setOverlayOpen(true);
  };

  const closeOverlay = () => {
    setOverlayOpen(false);
  };

  return (
    <>
      <section id="salones" className="py-20 md:py-28 px-4 sm:px-6 bg-[#080808] w-full">
        <div className="max-w-6xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-center mb-16 md:mb-20"
          >
            <div className="flex items-center justify-center gap-3 sm:gap-4 mb-5">
              <div className="h-px w-12 sm:w-16 bg-gradient-to-r from-transparent to-[#C9A84C]/50" />
              <span className="text-[#C9A84C]/70 text-[10px] sm:text-xs tracking-[0.3em] sm:tracking-[0.35em] uppercase">Nuestros Espacios</span>
              <div className="h-px w-12 sm:w-16 bg-gradient-to-l from-transparent to-[#C9A84C]/50" />
            </div>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-thin text-white mb-4">Salones</h2>
            <p className="text-white/40 text-sm tracking-wider max-w-md mx-auto px-4">
              Cada espacio diseñado para crear momentos únicos e inolvidables
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-7">
            {listado.map((salon, i) => {
              const img = salon.imagenPrincipal || (salon.imagenes && salon.imagenes[0]) || placeholderImg;
              return (
                <motion.div
                  key={salon.id || salon._id || i}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: i * 0.12 }}
                  whileHover={{ y: -4 }}
                  onClick={() => openOverlay(salon)}
                  className="group relative cursor-pointer rounded-[22px] overflow-hidden"
                  style={{
                    background: "linear-gradient(160deg, #161310 0%, #0c0a08 50%, #060504 100%)",
                    border: "1px solid rgba(201,168,76,0.28)",
                    boxShadow:
                      "0 1px 0 rgba(255,220,140,0.08) inset, 0 -1px 0 rgba(0,0,0,0.6) inset, 0 24px 50px -20px rgba(0,0,0,0.95), 0 10px 24px -12px rgba(0,0,0,0.7), 0 0 28px -10px rgba(201,168,76,0.25)",
                    transition: "transform .4s ease, box-shadow .4s ease, border-color .4s ease",
                  }}
                >
                  {/* Highlight superior dorado */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-[2px] z-20"
                    style={{ background: "linear-gradient(90deg, transparent, rgba(226,194,102,0.7), transparent)" }}
                  />

                  {/* Marco interno tipo placa alrededor de la imagen */}
                  <div className="p-2.5">
                    <div
                      className="relative overflow-hidden rounded-[16px] h-52 sm:h-56"
                      style={{ boxShadow: "0 2px 6px rgba(0,0,0,0.8) inset, 0 0 0 1px rgba(201,168,76,0.2) inset" }}
                    >
                      <img
                        src={img}
                        alt={salon.nombre}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A84C]/50 to-transparent" />

                      {/* Badge capacidad sobre imagen */}
                      <div
                        className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md"
                        style={{
                          background: "linear-gradient(180deg, rgba(20,16,8,0.85), rgba(8,6,4,0.85))",
                          border: "1px solid rgba(201,168,76,0.4)",
                          boxShadow: "0 1px 0 rgba(255,220,140,0.1) inset, 0 4px 10px rgba(0,0,0,0.6)",
                        }}
                      >
                        <Users size={11} className="text-[#C9A84C]" />
                        <span className="text-[10px] tracking-wider text-[#C9A84C]/90">{salon.capacidad}</span>
                      </div>
                    </div>
                  </div>

                  {/* Contenido */}
                  <div className="px-6 pb-6 pt-3 relative z-10">
                    <h3 className="text-white text-xl font-light tracking-wide mb-2">{salon.nombre}</h3>
                    <p className="text-white/50 text-sm leading-relaxed mb-5">{salon.descripcion}</p>

                    <div className="h-px w-full bg-gradient-to-r from-transparent via-[#C9A84C]/25 to-transparent mb-4" />

                    {/* CTA con relieve + brillo pulsante para llamar la atención */}
                    <span
                      className="ver-detalles-cta inline-flex items-center gap-2 px-4 py-2 rounded-full text-[#C9A84C] text-xs tracking-[0.2em] uppercase font-medium group-hover:gap-3 transition-all duration-300 relative overflow-hidden"
                      style={{
                        background: "linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)",
                        border: "1px solid rgba(201,168,76,0.45)",
                      }}
                    >
                      {/* Sheen animado que cruza el botón */}
                      <span aria-hidden className="ver-detalles-sheen" />
                      <span className="relative z-10">Ver detalles</span>
                      <svg className="w-3.5 h-3.5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                    </span>
                  </div>

                  {/* Glow dorado en hover */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[22px]"
                    style={{ boxShadow: "0 0 36px -6px rgba(201,168,76,0.35), 0 0 0 1px rgba(201,168,76,0.5) inset" }}
                  />
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {overlayOpen && (
        <SalonOverlay
          salon={selectedSalon}
          onClose={closeOverlay}
          onCotizar={onSelectSalon}
        />
      )}
    </>
  );
}