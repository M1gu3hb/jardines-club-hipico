import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import useLockBodyScroll from "../hooks/useLockBodyScroll";
import useBackButtonClose from "../hooks/useBackButtonClose";

export default function ProximamenteModal({ open, onClose, imagenUrl, titulo, descripcion }) {
  useLockBodyScroll(open);
  useBackButtonClose(open, onClose);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[300] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/92 backdrop-blur-md" />
        <motion.div
          className="relative z-10 w-full max-w-3xl"
          initial={{ scale: 0.94, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Glow dorado */}
          <div className="absolute -inset-2 bg-gradient-to-r from-[#C9A84C]/30 via-transparent to-[#C9A84C]/30 blur-2xl opacity-60 pointer-events-none" />

          <div className="relative bg-[#0a0a0a] border border-[#C9A84C]/40 rounded-2xl overflow-hidden shadow-2xl shadow-black">
            {imagenUrl && (
              <img
                src={imagenUrl}
                alt={titulo || "Próximamente"}
                className="w-full h-auto object-contain max-h-[78vh] block"
              />
            )}

            {(titulo || descripcion) && (
              <div className="px-6 py-5 border-t border-[#C9A84C]/15 bg-[#080808]">
                {titulo && (
                  <h3 className="text-white font-light text-xl mb-1 tracking-wide">{titulo}</h3>
                )}
                {descripcion && (
                  <p className="text-white/55 text-sm leading-relaxed">{descripcion}</p>
                )}
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute -top-3 -right-3 md:top-3 md:right-3 w-10 h-10 rounded-full bg-black/80 border border-[#C9A84C]/40 text-white/80 hover:text-white hover:bg-[#C9A84C]/20 transition-all flex items-center justify-center shadow-xl"
          >
            <X size={18} />
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}