import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, ChevronLeft, ChevronRight, Check, Play } from "lucide-react";
import MediaViewer, { isVideo } from "./MediaViewer";
import SalonGallery from "./SalonGallery";
import useBackButtonClose from "../hooks/useBackButtonClose";
import useLockBodyScroll from "../hooks/useLockBodyScroll";

function CarouselSlide({ url, active }) {
  const ref = useRef(null);
  const video = isVideo(url);

  useEffect(() => {
    if (!ref.current) return;
    if (!active) {
      ref.current.pause();
      ref.current.currentTime = 0;
    }
  }, [active]);

  if (video) {
    return (
      <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
        <video
          ref={ref}
          src={url}
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-black/60 border border-white/20 flex items-center justify-center">
            <Play size={22} className="text-white ml-1" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <img
      src={url}
      alt=""
      className="w-full h-full object-cover"
    />
  );
}

function SalonLightbox({ items, startIdx, onClose }) {
  return (
    <MediaViewer
      items={items.map(u => ({ url: u, titulo: "" }))}
      startIdx={startIdx}
      onClose={onClose}
      autoPlayVideos={true}
    />
  );
}

export default function SalonOverlay({ salon, onClose, onCotizar }) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const [lightboxIdx, setLightboxIdx] = useState(null);

  // Bloquear scroll del body mientras esté abierto (mantiene posición al cerrar)
  useLockBodyScroll(true);

  // Botón "atrás" del teléfono cierra este overlay en vez de salir del sitio.
  // Si hay un lightbox abierto, dejamos que ese hijo maneje el back primero.
  useBackButtonClose(lightboxIdx === null, onClose);

  // Reset photoIdx cuando cambia el salón
  useEffect(() => { setPhotoIdx(0); setLightboxIdx(null); }, [salon?.id]);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape" && lightboxIdx === null) onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, lightboxIdx]);

  if (!salon) return null;

  const imagenPrincipal = salon.imagenPrincipal || (salon.imagenes && salon.imagenes[0]) || "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200&q=80";
  const galeria = salon.imagenes && salon.imagenes.length > 0 ? salon.imagenes : [imagenPrincipal];

  const capacidad = salon.capacidad ||
    (salon.capacidadMin && salon.capacidadMax ? `${salon.capacidadMin} – ${salon.capacidadMax} personas` : null);

  const prev = () => setPhotoIdx(i => (i - 1 + galeria.length) % galeria.length);
  const next = () => setPhotoIdx(i => (i + 1) % galeria.length);

  return (
    <>
      <AnimatePresence>
        <motion.div
          className="fixed inset-0 z-[200] flex flex-col bg-[#0a0a0a]"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-px w-8 bg-[#C9A84C]/40" />
              <span className="text-[#C9A84C]/60 text-xs tracking-[0.3em] uppercase">Jardines Club Hípico</span>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center border border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-all"
            >
              <X size={16} />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            {/* Hero carousel */}
            <div
              className="relative h-[45vh] md:h-[55vh] overflow-hidden bg-[#111] cursor-pointer group"
              onClick={() => setLightboxIdx(photoIdx)}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={photoIdx}
                  className="absolute inset-0"
                  initial={{ opacity: 0, scale: 1.04 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <CarouselSlide url={galeria[photoIdx]} active={false} />
                </motion.div>
              </AnimatePresence>

              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center pointer-events-none">
                <span className="text-white/0 group-hover:text-white/80 text-xs tracking-widest uppercase transition-all border border-white/0 group-hover:border-white/30 px-4 py-1.5">Ampliar</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent pointer-events-none" />

              {galeria.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); prev(); }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-all z-10"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); next(); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/50 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-all z-10"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10" onClick={e => e.stopPropagation()}>
                    {galeria.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setPhotoIdx(i)}
                        className={`h-0.5 transition-all ${i === photoIdx ? "w-6 bg-[#C9A84C]" : "w-3 bg-white/30"}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Content */}
            <div className="max-w-3xl mx-auto px-6 py-10 space-y-10">
              <div>
                <h1 className="text-3xl md:text-4xl font-thin text-white mb-3">{salon.nombre}</h1>
                {capacidad && (
                  <div className="flex items-center gap-2 text-[#C9A84C]/60 text-sm">
                    <Users size={14} />
                    <span>{capacidad}</span>
                  </div>
                )}
              </div>

              {(salon.descripcionLarga || salon.descripcion) && (
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-px w-8 bg-[#C9A84C]/30" />
                    <span className="text-[#C9A84C]/50 text-xs tracking-[0.25em] uppercase">Descripción</span>
                  </div>
                  <p className="text-white/50 leading-relaxed text-sm">
                    {salon.descripcionLarga || salon.descripcion}
                  </p>
                </div>
              )}

              {salon.caracteristicas && salon.caracteristicas.length > 0 && (
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-px w-8 bg-[#C9A84C]/30" />
                    <span className="text-[#C9A84C]/50 text-xs tracking-[0.25em] uppercase">Características</span>
                  </div>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {salon.caracteristicas.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-white/50 text-sm">
                        <Check size={13} className="text-[#C9A84C]/60 flex-shrink-0 mt-0.5" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Galería premium con lazy loading */}
              <SalonGallery
                galeria={galeria}
                heroIdx={photoIdx}
                onThumbClick={(i) => setPhotoIdx(i)}
              />

              <div className="pt-4 pb-8">
                <button
                  onClick={() => { onClose(); onCotizar(salon.nombre); }}
                  className="w-full md:w-auto bg-[#C9A84C] text-[#0a0a0a] px-10 py-4 text-sm font-medium tracking-widest uppercase hover:bg-[#d4b558] transition-all"
                >
                  Cotizar este salón
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* lightboxIdx kept for hero click */}
      <AnimatePresence>
        {lightboxIdx !== null && (
          <SalonLightbox
            items={galeria}
            startIdx={lightboxIdx}
            onClose={() => setLightboxIdx(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}