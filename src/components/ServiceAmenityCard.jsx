import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, Play, Sparkles } from "lucide-react";
import { isVideo } from "./MediaViewer";
import MediaCarrusel from "./MediaCarrusel";

/**
 * Tarjeta premium para un Servicio o Amenidad.
 * - Miniatura visual al inicio (imagen o primer frame de video); placeholder dorado si aún no hay imagen.
 * - Al expandir muestra la imagen/video en grande y la DESCRIPCIÓN debajo.
 * - Se puede expandir si tiene media o si tiene descripción.
 */
export default function ServiceAmenityCard({ item, delay = 0 }) {
  const [open, setOpen] = useState(false);

  const extras = Array.isArray(item.imagenesUrl) ? item.imagenesUrl.filter(Boolean) : [];
  const allMedia = [];
  if (item.imagenUrl) allMedia.push(item.imagenUrl);
  extras.forEach((u) => { if (!allMedia.includes(u)) allMedia.push(u); });

  const hasMedia = allMedia.length > 0;
  const canExpand = hasMedia || !!item.descripcion;
  const thumbUrl = hasMedia ? allMedia[0] : null;
  const thumbIsVideo = thumbUrl ? isVideo(thumbUrl) : false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay, duration: 0.45 }}
      className="skeu-card skeu-card-hover overflow-hidden"
    >
      <button
        type="button"
        onClick={() => canExpand && setOpen((o) => !o)}
        disabled={!canExpand}
        aria-expanded={canExpand ? open : undefined}
        className={`w-full flex items-center gap-3.5 p-3 text-left select-none ${
          canExpand ? "cursor-pointer active:scale-[0.99] transition-transform" : "cursor-default"
        }`}
      >
        {/* Miniatura */}
        <div
          className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden flex-shrink-0"
          style={{
            boxShadow: "0 2px 6px rgba(0,0,0,0.7) inset, 0 0 0 1px rgba(201,168,76,0.28) inset",
            background: "linear-gradient(160deg, #1a1408 0%, #0a0805 100%)",
          }}
        >
          {hasMedia ? (
            <>
              {thumbIsVideo ? (
                <video src={thumbUrl} muted playsInline preload="metadata" className="w-full h-full object-cover" />
              ) : (
                <img src={thumbUrl} alt={item.titulo} loading="lazy" className="w-full h-full object-cover" />
              )}
              {thumbIsVideo && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                  <Play size={14} className="text-white/90" fill="currentColor" />
                </div>
              )}
            </>
          ) : (
            // Placeholder dorado elegante (para ítems sin imagen aún)
            <div className="w-full h-full flex items-center justify-center">
              <Sparkles size={18} className="text-[#C9A84C]/70" />
            </div>
          )}
        </div>

        {/* Texto */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Check size={12} className="text-[#C9A84C] flex-shrink-0" strokeWidth={2.5} />
            <p className="text-white/85 text-[14px] sm:text-[15px] leading-snug font-light truncate">
              {item.titulo}
            </p>
          </div>
        </div>

        {canExpand && (
          <span
            className={`flex items-center gap-1 text-[#C9A84C]/80 text-[11px] flex-shrink-0 px-2 py-1 rounded-full transition-transform duration-300 ${
              open ? "rotate-180" : ""
            }`}
            style={{
              background: "rgba(201,168,76,0.08)",
              border: "1px solid rgba(201,168,76,0.25)",
            }}
          >
            <ChevronDown size={12} />
          </span>
        )}
      </button>

      <AnimatePresence initial={false}>
        {canExpand && open && (
          <motion.div
            key="detalle"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3">
              {/* Carrusel con flechas + swipe (antes solo puntitos) */}
              {hasMedia && <MediaCarrusel media={allMedia} alt={item.titulo} />}

              {/* Descripción — debajo de la imagen */}
              {item.descripcion && (
                <p className={`text-white/60 text-[13px] leading-relaxed ${hasMedia ? "mt-3" : "mt-0.5"}`}>
                  {item.descripcion}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
