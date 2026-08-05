import { useState } from "react";
import { motion } from "framer-motion";
import { Users } from "lucide-react";
import SalonOverlay from "./SalonOverlay";

// Auto-hospedada: `img-src` de la CSP no admite `images.unsplash.com`, así que la anterior
// la bloqueaba el navegador y el salón sin foto salía roto en vez de con un placeholder.
const placeholderImg = "/media/img/dGg8Xxh.jpg";

// AQUÍ HABÍA CINCO SALONES DE RESPALDO. No eran una aproximación al salón: eran otro salón.
// Contrastados con `jardines.salones` en producción el 2026-08-05, que tiene OCHO espacios:
//
//   respaldo inventado                    realidad
//   ──────────────────────────────────    ─────────────────────────────────────────
//   «Salón Cerrado»  50 – 150             no existe
//   «Salón Encanto»  80 – 200             Salón Encanto, 200-300
//   «Kiosco»         30 – 80              Quiosco, 30-50
//   «Jardines»       100 – 300            Jardines, 400-600   ← la mitad de lo que es
//   «Pony (Juegos)»  20 – 60 niños        Área Infantil Pony, 100-150
//   —                                     Salón de los Espejos, 300-400   ← el más grande
//   —                                     Espacio Nocturno (Eclipse), 80-120
//   —                                     Capilla, 50-150
//   —                                     Estancias (Bungalos)
//
// Es decir: el camino degradado escondía los cuatro espacios más distintivos —incluida la capilla,
// que el propio JSON-LD anuncia— y le decía a quien planeara una boda de 500 personas que el
// jardín llega a 300. Eso no es un sitio incompleto: es una reserva perdida por un dato falso.
//
// El respaldo se retira. Si la base no responde no se inventa un salón; se dice que la lista no
// cargó y se deja abierta la vía de contacto, que es lo único cierto que se puede ofrecer.

export default function SalonesSection({ salones, onSelectSalon }) {
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [selectedSalon, setSelectedSalon] = useState(null);

  const listado = salones && salones.length > 0 ? salones : [];

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

          {listado.length === 0 && (
            <div className="skeu-card px-6 py-8 text-center max-w-lg mx-auto">
              <p className="text-white/70 text-sm">
                No pudimos cargar la lista de espacios en este momento.
              </p>
              <p className="text-white/40 text-xs mt-2 leading-relaxed">
                Tenemos ocho espacios, de 30 a 600 personas. Escríbenos y te contamos cuál encaja
                con tu evento.
              </p>
              <button
                type="button"
                onClick={() => onSelectSalon?.("")}
                className="mt-5 inline-flex items-center gap-2 text-[#C9A84C]/80 hover:text-[#C9A84C] text-xs tracking-wider uppercase transition-colors"
              >
                Pedir cotización →
              </button>
            </div>
          )}

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