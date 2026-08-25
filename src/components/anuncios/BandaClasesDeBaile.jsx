import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import ParejaQueBaila from './ParejaQueBaila';

/**
 * BandaClasesDeBaile — el anuncio de la academia, en una franja fina.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * DÓNDE VA Y POR QUÉ AHÍ
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Entre el hero y las cifras, que es donde lo pidió el dueño: *«abajo de cotiza tu evento y
 * arriba de lo de más de treinta años de experiencia»*. Y funciona porque es el único punto de
 * la portada donde una novedad no interrumpe nada — el visitante acaba de leer la promesa y
 * todavía no ha empezado a comparar espacios.
 *
 * ── Por qué es una franja y no una sección ──────────────────────────────────
 *
 * Sus palabras: *«un espacio en horizontal en todo el ancho, como si fuera una sección única,
 * pero chiquitita, muy chiquita, como un anuncio»*. Tiene razón en el tamaño: **las clases de
 * baile no son el negocio**. El negocio es rentar el recinto, y un anuncio a página completa
 * de algo que ni siquiera ha abierto le robaría sitio a lo que sí vende hoy.
 *
 * Una franja fina se ve, se entiende y se pasa de largo si no interesa.
 *
 * ── Sustituye al cartel de «próximamente» ───────────────────────────────────
 *
 * El que había —heredado del sitio viejo— se retiró: *«el anuncio de próximamente quítalo, no
 * me gusta cómo se ve»*. Aquel era un recuadro genérico que servía para cualquier cosa; este
 * habla de UNA cosa concreta y la enseña.
 *
 * ── Lo que NO dice ──────────────────────────────────────────────────────────
 *
 * Ni fecha, ni horarios, ni precios. No existen todavía: *«faltan horarios y precios»*.
 * Anunciar una academia con datos inventados genera preguntas que nadie puede contestar, y la
 * primera llamada que no se sabe responder es la que se pierde.
 */
export default function BandaClasesDeBaile() {
  return (
    <section
      aria-labelledby="banda-baile"
      className="relative w-full overflow-hidden border-y border-[#C9A84C]/15 bg-gradient-to-r from-[#0b0a08] via-[#12100b] to-[#0b0a08]"
    >
      {/* El hilo dorado de arriba, igual que en las tarjetas del sitio. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C9A84C]/45 to-transparent"
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 py-5 sm:flex-row sm:gap-6 sm:px-8 sm:py-6"
      >
        <ParejaQueBaila className="h-16 w-20 shrink-0 sm:h-20 sm:w-24" />

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-[9px] font-light tracking-[0.34em] uppercase text-[#C9A84C]/70 sm:text-[10px]">
            Próximamente
          </p>
          <h2
            id="banda-baile"
            className="mt-1.5 text-lg font-extralight leading-tight text-white/95 sm:text-2xl"
          >
            Clases de{' '}
            <span className="font-serif italic bg-gradient-to-br from-[#F0DFA6] via-[#E2C266] to-[#C9A84C] bg-clip-text text-transparent">
              baile
            </span>{' '}
            en el Salón de los Espejos
          </h2>
          <p className="mt-1 text-xs font-light leading-relaxed text-white/40 sm:text-sm">
            Una academia dentro del recinto. Estamos afinando los detalles.
          </p>
        </div>

        <Link
          to="/clases-de-baile"
          className="group inline-flex shrink-0 items-center gap-2 rounded-full border border-[#C9A84C]/35 px-5 py-2.5 text-[10px] font-light tracking-[0.18em] uppercase text-[#C9A84C] transition-colors hover:border-[#C9A84C]/70 hover:bg-[#C9A84C]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/60 sm:text-[11px]"
        >
          Avísame
          <ArrowRight
            size={12}
            aria-hidden="true"
            className="transition-transform duration-300 group-hover:translate-x-1"
          />
        </Link>
      </motion.div>
    </section>
  );
}
