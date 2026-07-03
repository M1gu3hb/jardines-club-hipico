import { motion } from "framer-motion";

/**
 * Cartel/anuncio premium pegado dentro del Hero.
 * Reemplaza al antiguo botón "Próximamente". Al hacer click abre el modal
 * con la imagen completa (lightbox). Mantiene activación/desactivación
 * y la imagen editables desde panel.
 */
export default function ProximamenteCartel({ imagenUrl, titulo, descripcion, textoEtiqueta, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.985, y: 1 }}
      aria-label="Ver anuncio próximamente"
      className="group relative block w-full max-w-[420px] sm:max-w-[460px] md:max-w-[500px] mx-auto text-left overflow-hidden rounded-2xl"
      style={{
        background: "linear-gradient(160deg, #1a1610 0%, #0d0a06 55%, #050402 100%)",
        border: "1px solid rgba(201,168,76,0.55)",
        boxShadow:
          "0 1px 0 rgba(255,220,140,0.18) inset, 0 -2px 4px rgba(0,0,0,0.7) inset, 0 24px 50px -18px rgba(0,0,0,0.95), 0 12px 28px -12px rgba(0,0,0,0.7), 0 0 36px -8px rgba(201,168,76,0.35)",
        transition: "transform .35s ease, box-shadow .35s ease, border-color .35s ease",
      }}
    >
      {/* Highlight superior dorado */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-3 top-0 h-px z-20"
        style={{ background: "linear-gradient(90deg, transparent, rgba(255,220,140,0.7), transparent)" }}
      />

      {/* Cinta diagonal "Próximamente" en la esquina */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-3 left-3 z-20 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md"
        style={{
          background: "linear-gradient(180deg, rgba(30,22,10,0.9), rgba(10,7,3,0.9))",
          border: "1px solid rgba(201,168,76,0.6)",
          boxShadow: "0 1px 0 rgba(255,220,140,0.18) inset, 0 4px 10px rgba(0,0,0,0.6)",
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full bg-[#E2C266] animate-pulse"
          style={{ boxShadow: "0 0 8px #C9A84C" }}
        />
        <span className="text-[9px] sm:text-[10px] tracking-[0.25em] uppercase text-[#E6C870] font-medium">
          {textoEtiqueta || "Próximamente"}
        </span>
      </div>

      {/* Marco interno tipo placa alrededor de la imagen */}
      <div className="p-2.5">
        <div
          className="relative overflow-hidden rounded-xl w-full"
          style={{
            aspectRatio: "16 / 9",
            boxShadow: "0 2px 6px rgba(0,0,0,0.85) inset, 0 0 0 1px rgba(201,168,76,0.25) inset",
            background: "#0a0805",
          }}
        >
          {imagenUrl ? (
            <img
              src={imagenUrl}
              alt={titulo || "Anuncio próximamente"}
              className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-[#C9A84C]/40 text-xs tracking-[0.3em] uppercase">Anuncio</span>
            </div>
          )}
          {/* Sutil gradiente para dar profundidad */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent pointer-events-none" />
          {/* Brillo animado en hover */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-[1100ms] bg-gradient-to-r from-transparent via-[#C9A84C]/25 to-transparent"
          />
        </div>
      </div>

      {/* Texto inferior (sólo si hay título o descripción) */}
      {(titulo || descripcion) && (
        <div className="px-4 sm:px-5 pb-4 pt-1 relative z-10">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-[#C9A84C]/25 to-transparent mb-3" />
          {titulo && (
            <p className="text-[#E6C870] text-sm sm:text-base font-light tracking-wide leading-snug mb-1">
              {titulo}
            </p>
          )}
          {descripcion && (
            <p className="text-white/55 text-xs sm:text-[13px] leading-relaxed line-clamp-2">
              {descripcion}
            </p>
          )}
          <div className="mt-3 flex items-center gap-1.5 text-[#C9A84C]/80 text-[10px] sm:text-[11px] tracking-[0.25em] uppercase font-medium">
            <span>Ver más</span>
            <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </div>
        </div>
      )}

      {/* Glow dorado en hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ boxShadow: "0 0 40px -6px rgba(201,168,76,0.4), 0 0 0 1px rgba(201,168,76,0.6) inset" }}
      />
    </motion.button>
  );
}