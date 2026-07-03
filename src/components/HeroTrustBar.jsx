import { motion } from "framer-motion";

/**
 * Bloque pequeño de confianza/métricas del Hero (5+ espacios, 30+ años, 500+ eventos).
 * Extraído como componente para poder reubicarlo dependiendo de si el anuncio
 * "Próximamente" está activo o no, sin duplicar el JSX.
 *
 * Variantes:
 *  - "default": grilla 3 columnas, amplia, para el hero sin anuncio.
 *  - "compact": misma información pero con espaciado reducido y línea separadora
 *    superior, pensado para ir debajo del cartel "Próximamente" sin verse apretado.
 */
const STATS = [
  { num: "5+", label: "Espacios" },
  { num: "30+", label: "Años" },
  { num: "500+", label: "Eventos" },
];

export default function HeroTrustBar({ variant = "default" }) {
  const compact = variant === "compact";

  return (
    <div className={compact ? "mt-8 sm:mt-10 max-w-xl mx-auto" : "mt-16 sm:mt-20 max-w-2xl mx-auto"}>
      {compact && (
        <div className="h-px w-24 mx-auto mb-6 bg-gradient-to-r from-transparent via-[#C9A84C]/40 to-transparent" />
      )}
      <div className={compact ? "grid grid-cols-3 gap-6 sm:gap-10" : "grid grid-cols-3 gap-8 sm:gap-12"}>
        {STATS.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 + i * 0.08, duration: 0.5 }}
            className="text-center"
          >
            <div
              className={`text-[#C9A84C] font-thin leading-none drop-shadow-[0_2px_8px_rgba(201,168,76,0.25)] ${
                compact ? "text-4xl sm:text-5xl md:text-6xl" : "text-5xl sm:text-6xl md:text-7xl"
              }`}
            >
              {stat.num}
            </div>
            <div
              className={`text-white/55 tracking-[0.25em] uppercase mt-2 sm:mt-3 ${
                compact ? "text-[11px] sm:text-sm" : "text-xs sm:text-sm"
              }`}
            >
              {stat.label}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}