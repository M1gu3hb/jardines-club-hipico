import { motion } from "framer-motion";
import { Star } from "lucide-react";
import data from "@/data/resenas.json";

// Estrellas doradas (rellenas según la calificación)
function Estrellas({ n = 5, size = 13 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[0, 1, 2, 3, 4].map((i) => (
        <Star
          key={i}
          size={size}
          className={i < Math.round(n) ? "text-[#E6C870]" : "text-white/15"}
          fill={i < Math.round(n) ? "#E6C870" : "transparent"}
        />
      ))}
    </div>
  );
}

function ReseñaCard({ r }) {
  return (
    <div
      className="skeu-card shrink-0 w-[300px] sm:w-[340px] p-6 mx-3 flex flex-col"
      style={{ whiteSpace: "normal" }}
    >
      <Estrellas n={r.estrellas || 5} />
      <p className="text-white/70 text-sm leading-relaxed mt-3 mb-4 flex-1">“{r.texto}”</p>
      <div className="flex items-center gap-3 pt-3 border-t border-white/5">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-[#1a1208] text-sm font-semibold flex-shrink-0"
          style={{ background: "linear-gradient(180deg, #E2C266, #A88532)" }}
        >
          {(r.autor || "?").trim().charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-white/80 text-xs font-medium truncate">{r.autor}</p>
          {r.evento && <p className="text-[#C9A84C]/60 text-[11px] truncate">{r.evento}</p>}
        </div>
      </div>
    </div>
  );
}

export default function Confianza() {
  const { stats = [], rating, googleUrl, resenas = [] } = data;
  const hayResenas = resenas.length > 0;
  // Duplicamos la lista para el marquee continuo
  const loop = hayResenas ? [...resenas, ...resenas] : [];

  return (
    <section className="py-16 md:py-20 px-4 sm:px-6 bg-[#080808] border-b border-white/[0.04] w-full overflow-hidden">
      <div className="max-w-6xl mx-auto w-full">
        {/* Números de confianza */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-3 gap-3 sm:gap-6 max-w-3xl mx-auto text-center"
        >
          {stats.map((s, i) => (
            <div key={i} className="flex flex-col items-center">
              <span
                className="font-thin leading-none"
                style={{
                  fontSize: "clamp(2.2rem, 6vw, 3.75rem)",
                  background: "linear-gradient(180deg, #F0D98A 0%, #C9A84C 55%, #A88532 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {s.valor}
              </span>
              <span className="text-white/45 text-[10px] sm:text-xs tracking-[0.15em] uppercase mt-2 leading-tight">
                {s.label}
              </span>
            </div>
          ))}
        </motion.div>

        {/* Calificación de Google */}
        {rating && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="flex justify-center mt-10"
          >
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="skeu-dark-btn inline-flex items-center gap-3 px-5 py-2.5 rounded-full text-sm"
            >
              <span className="text-[#E6C870] font-medium">{rating.toFixed(1)}</span>
              <Estrellas n={rating} size={14} />
              <span className="text-white/50 text-xs tracking-wide">Reseñas en Google →</span>
            </a>
          </motion.div>
        )}

        {/* Carrusel de reseñas (marquee automático) */}
        {hayResenas && (
          <div className="relative mt-12 group">
            <style>{`
              @keyframes reseñasMarquee {
                0%   { transform: translateX(0); }
                100% { transform: translateX(-50%); }
              }
              .reseñas-track {
                display: flex;
                width: max-content;
                animation: reseñasMarquee 45s linear infinite;
              }
              .reseñas-track:hover { animation-play-state: paused; }
              @media (prefers-reduced-motion: reduce) {
                .reseñas-track { animation: none; }
              }
            `}</style>
            {/* Difuminado en los bordes */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-16 z-10" style={{ background: "linear-gradient(to right, #080808, transparent)" }} />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-16 z-10" style={{ background: "linear-gradient(to left, #080808, transparent)" }} />
            <div className="reseñas-track">
              {loop.map((r, i) => (
                <ReseñaCard key={i} r={r} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
