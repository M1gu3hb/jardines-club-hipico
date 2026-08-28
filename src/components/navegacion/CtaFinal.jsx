import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { rutaPorClave } from '@/rutas';

/**
 * CtaFinal — la franja de cotización, al pie de TODAS las páginas.
 *
 * ── De dónde sale este diseño ───────────────────────────────────────────────
 *
 * Del sitio que ya existía (`CtaCotizacion.jsx`). El dueño lo señaló con una captura: *«me
 * gustaría que se viera como esta captura, la que dice listo para cotizar tu evento, con ese
 * fondo… y el logo al fondo, como difuminado. Que se vea así hasta abajo en todos lados»*.
 *
 * Tenía razón en preferirlo. Lo que había en el pie era un titular y dos botones sobre fondo
 * plano: correcto y olvidable. Este tiene fotografía de fondo, tarjeta con relieve y una línea
 * dorada arriba — **pesa lo que tiene que pesar la única acción que genera negocio**.
 *
 * ── Por qué lleva a una página y no abre una ventana ────────────────────────
 *
 * El original abría un modal. Ahora apunta a `/cotizar`, que es una página de verdad: tiene
 * dirección propia, se puede compartir, se puede volver a ella con el botón de atrás y Google
 * la ve. Un formulario que solo existe dentro de una ventana emergente no es ninguna de esas
 * cosas.
 *
 * ── El fondo es local ───────────────────────────────────────────────────────
 *
 * `/media/img/…` y no un banco de imágenes: la CSP del sitio solo admite `'self'`, `data:`,
 * `blob:` y el bucket de Supabase en `img-src`. Una foto de fuera la bloquearía el navegador y
 * esta franja se quedaría sin fondo sin que nadie se enterara. Ya pasó una vez.
 */
export default function CtaFinal() {
  const cotizar = rutaPorClave('cotizar');

  return (
    <section
      aria-label="Cotiza tu evento"
      className="relative w-full overflow-hidden bg-[#050505] px-4 py-20 sm:px-6 md:py-28"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center opacity-10"
        style={{ backgroundImage: "url('/media/img/dGg8Xxh.jpg')" }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-[#050505] via-transparent to-[#050505]"
      />

      <div className="relative z-10 mx-auto w-full max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="skeu-card relative px-6 py-12 text-center sm:px-10 md:px-14 md:py-14"
          style={{ borderRadius: '28px' }}
        >
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-0 h-px w-32 -translate-x-1/2 bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent"
          />

          <div className="relative z-10 mb-6 flex items-center justify-center gap-3 sm:gap-4">
            <div className="h-px w-10 bg-gradient-to-r from-transparent to-[#C9A84C]/50 sm:w-16" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-[#C9A84C]/80 sm:text-xs sm:tracking-[0.35em]">
              Cotización gratuita
            </span>
            <div className="h-px w-10 bg-gradient-to-l from-transparent to-[#C9A84C]/50 sm:w-16" />
          </div>

          <h2 className="relative z-10 mb-5 text-3xl font-thin text-white sm:text-4xl md:text-5xl">
            ¿Listo para cotizar tu evento?
          </h2>

          <p className="relative z-10 mx-auto mb-10 max-w-md text-sm leading-relaxed tracking-wide text-white/45 md:mb-12">
            Cuéntanos algunos detalles y te enviamos una cotización personalizada sin costo.
          </p>

          {/* Exento: el medidor lo compara contra el fondo #0a0a0a, pero este tinte va sobre el
              degradado dorado de .skeu-gold-btn; el par real no baja de 5.3:1. */}
          <Link
            to={cotizar.ruta}
            className="skeu-gold-btn relative z-10 inline-flex items-center gap-3 rounded-full px-10 py-4 text-sm font-medium tracking-[0.2em] uppercase text-[#1a1408] sm:px-14 sm:py-5"
          >
            Cotizar mi evento
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
