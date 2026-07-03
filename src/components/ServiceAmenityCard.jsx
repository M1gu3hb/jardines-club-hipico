import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown, ImageIcon } from "lucide-react";
import { isVideo } from "./MediaViewer";

/**
 * Tarjeta premium para un Servicio o Amenidad.
 * - Si tiene imagen/video: clicable, expande INLINE para mostrar la media en grande.
 * - Si no tiene media: se ve igual de elegante, no clicable, sin sensación de vacío.
 * - Skeuomorphism oscuro/dorado coherente con el resto del sitio.
 */
export default function ServiceAmenityCard({ item, delay = 0 }) {
  const [open, setOpen] = useState(false);

  const extras = Array.isArray(item.imagenesUrl) ? item.imagenesUrl.filter(Boolean) : [];
  const allMedia = [];
  if (item.imagenUrl) allMedia.push(item.imagenUrl);
  extras.forEach((u) => { if (!allMedia.includes(u)) allMedia.push(u); });

  const hasMedia = allMedia.length > 0;
  const [mediaIdx, setMediaIdx] = useState(0);
  const currentUrl = hasMedia ? allMedia[mediaIdx] : null;
  const currentIsVideo = currentUrl ? isVideo(currentUrl) : false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay, duration: 0.45 }}
      className="skeu-card overflow-hidden"
    >
      <button
        type="button"
        onClick={() => hasMedia && setOpen((o) => !o)}
        disabled={!hasMedia}
        aria-expanded={hasMedia ? open : undefined}
        className={`w-full flex items-start gap-3 p-4 text-left select-none ${
          hasMedia ? "cursor-pointer active:scale-[0.99] transition-transform" : "cursor-default"
        }`}
      >
        {/* Icono check en relieve */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{
            background: "linear-gradient(180deg, #1a1408 0%, #0a0805 100%)",
            border: "1px solid rgba(201,168,76,0.4)",
            boxShadow:
              "0 1px 0 rgba(255,220,140,0.15) inset, 0 -1px 2px rgba(0,0,0,0.6) inset, 0 2px 6px rgba(0,0,0,0.5)",
          }}
        >
          <Check size={13} className="text-[#C9A84C]" strokeWidth={2.5} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white/85 text-[14px] sm:text-[15px] leading-snug font-light">
            {item.titulo}
          </p>
          {item.descripcion && (
            <p className="text-white/40 text-[12px] leading-relaxed mt-1.5">
              {item.descripcion}
            </p>
          )}
        </div>

        {hasMedia && (
          <span
            className={`flex items-center gap-1 text-[#C9A84C]/80 text-[11px] flex-shrink-0 mt-1.5 px-2 py-1 rounded-full transition-transform duration-300 ${
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
        {hasMedia && open && (
          <motion.div
            key="media"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3">
              <div
                className="relative w-full overflow-hidden rounded-xl"
                style={{
                  aspectRatio: "16 / 10",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.85) inset, 0 0 0 1px rgba(201,168,76,0.22) inset",
                  background: "#0a0805",
                }}
              >
                {currentIsVideo ? (
                  <video
                    key={currentUrl}
                    src={currentUrl}
                    controls
                    playsInline
                    className="w-full h-full object-contain bg-black"
                  />
                ) : (
                  <img
                    src={currentUrl}
                    alt={item.titulo}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              {allMedia.length > 1 && (
                <div className="flex items-center gap-1.5 mt-3 justify-center">
                  {allMedia.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => { e.stopPropagation(); setMediaIdx(i); }}
                      className={`h-1 transition-all rounded-full ${
                        i === mediaIdx ? "w-6 bg-[#C9A84C]" : "w-2.5 bg-white/25"
                      }`}
                      aria-label={`Ver media ${i + 1}`}
                    />
                  ))}
                </div>
              )}

              <div className="flex items-center justify-center gap-1.5 mt-2 text-[#C9A84C]/40 text-[10px] tracking-widest uppercase">
                <ImageIcon size={10} />
                <span>{allMedia.length > 1 ? `${mediaIdx + 1} / ${allMedia.length}` : "Imagen"}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}