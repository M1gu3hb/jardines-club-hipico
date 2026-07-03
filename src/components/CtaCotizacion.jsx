import { motion } from "framer-motion";

export default function CtaCotizacion({ onOpenForm }) {
  return (
    <section className="py-20 md:py-28 px-4 sm:px-6 bg-[#050505] relative overflow-hidden w-full">
      {/* Background image subtle */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-10"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1600&q=80')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-transparent to-[#050505]" />
      <div className="max-w-3xl mx-auto relative z-10 w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="skeu-card px-6 sm:px-10 md:px-14 py-12 md:py-14 text-center"
          style={{ borderRadius: "28px" }}
        >
          {/* Línea superior dorada */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent" />

          <div className="flex items-center justify-center gap-3 sm:gap-4 mb-6 relative z-10">
            <div className="h-px w-10 sm:w-16 bg-gradient-to-r from-transparent to-[#C9A84C]/50" />
            <span className="text-[#C9A84C]/80 text-[10px] sm:text-xs tracking-[0.3em] sm:tracking-[0.35em] uppercase">Cotización Gratuita</span>
            <div className="h-px w-10 sm:w-16 bg-gradient-to-l from-transparent to-[#C9A84C]/50" />
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-thin text-white mb-5 relative z-10">
            ¿Listo para cotizar tu evento?
          </h2>
          <p className="text-white/45 text-sm leading-relaxed mb-10 md:mb-12 max-w-md mx-auto tracking-wide relative z-10">
            Cuéntanos algunos detalles y te enviamos una cotización personalizada sin costo.
          </p>
          <motion.button
            onClick={() => onOpenForm("")}
            className="skeu-gold-btn inline-flex items-center gap-3 font-medium text-sm tracking-[0.2em] uppercase px-10 sm:px-14 py-4 sm:py-5 rounded-full relative z-10"
            whileTap={{ scale: 0.97 }}
          >
            Cotizar mi evento
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}