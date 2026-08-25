import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useServicios, useAmenidades } from '@/lib/datos';
import { reparte, fotosDe } from '@/lib/servicios';

/**
 * Servicios y amenidades en la portada — dos invitaciones, no dos listas.
 *
 * ── Qué había antes y por qué se cambió ─────────────────────────────────────
 *
 * Había cuatro tarjetas de cada cosa y un «ver todos» que desplegaba el resto **ahí mismo**.
 * Palabras del dueño: *«no tienen el protagonismo que deberían tener, ya que cada uno tiene a
 * veces hasta más de una imagen»*. Y es literal: «Montajes» tiene catorce fotografías, y se
 * enseñaba con una, del mismo tamaño que el trampolín.
 *
 * Desplegar treinta elementos dentro de la portada es lo peor de las dos opciones: ni caben
 * bien ahí, ni llegan a su página, donde sí tendrían sitio para lucirse.
 *
 * ── Lo que hay ahora ────────────────────────────────────────────────────────
 *
 * Dos bloques que dicen **cuántos hay** y de qué van, con un asomo de fotos reales detrás, y
 * mandan a su página. La portada insinúa; la página enseña.
 *
 * ── El número sale de los datos ─────────────────────────────────────────────
 *
 * «Diecisiete amenidades» convence porque es verificable en la página siguiente. Un «muchas
 * amenidades» no dice nada, y un número inventado se cae en cuanto alguien las cuenta.
 *
 * Y el mosaico de fondo usa las fotos de los que MÁS fotos tienen, que ya vienen ordenados así
 * desde `reparte()`. Es lo que hace que el asomo se vea bien sin elegir nada a mano.
 */
export default function ServiciosYAmenidades() {
  const { data: srv, isLoading: cargaS } = useServicios();
  const { data: amn, isLoading: cargaA } = useAmenidades();

  if (cargaS || cargaA) return null;

  const { servicios, amenidades } = reparte(srv || [], amn || []);
  if (servicios.length === 0 && amenidades.length === 0) return null;

  return (
    <section
      id="servicios"
      aria-labelledby="servicios-amenidades"
      className="w-full bg-[#0a0a0a] px-4 py-20 sm:px-6 md:py-28"
    >
      <div className="mx-auto w-full max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-14 text-center"
        >
          <div className="mb-5 flex items-center justify-center gap-3 sm:gap-4">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#C9A84C]/50 sm:w-16" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-[#C9A84C]/70 sm:text-xs sm:tracking-[0.35em]">
              Todo dentro del recinto
            </span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#C9A84C]/50 sm:w-16" />
          </div>

          <h2
            id="servicios-amenidades"
            className="text-3xl font-extralight tracking-tight text-white/95 sm:text-5xl"
          >
            No hace falta traer nada de fuera
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-sm font-light leading-relaxed text-white/45 sm:text-base">
            Y si ya tienes tus proveedores, también se puede hablar. Aquí nada es obligatorio.
          </p>
        </motion.div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Invitacion
            items={servicios}
            eyebrow="Para que el evento salga"
            titulo={`${servicios.length} servicios`}
            texto="Montaje a tu medida, mesa de honor, asesoría en decoración y logística, coordinación de montaje y desmontaje, seguridad privada y sala de conferencias. Y los alimentos, con menú de tres tiempos, taquiza, barbacoa o buffet."
            enlace="/servicios"
            cta="Ver todos los servicios"
            retraso={0}
          />
          <Invitacion
            items={amenidades}
            eyebrow="Para que se recuerde"
            titulo={`${amenidades.length} amenidades`}
            texto="Inflables, futbolito, gladiador, trampolines, alberca, un mago. Cámara 360, set fotográfico, mega pantalla led, pista pixel led. Grupos musicales en vivo, chinelos y un auto clásico para las fotos."
            enlace="/amenidades"
            cta="Ver todas las amenidades"
            retraso={0.12}
          />
        </div>
      </div>
    </section>
  );
}

function Invitacion({ items, eyebrow, titulo, texto, enlace, cta, retraso }) {
  // Cuatro fotos de los que más tienen. Al venir ya ordenados por número de fotos, esto es
  // siempre lo mejor que hay que enseñar, sin ninguna lista de destacados que mantener.
  const asomo = items.flatMap(fotosDe).slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay: retraso }}
    >
      <Link
        to={enlace}
        className="group skeu-card skeu-card-hover flex h-full flex-col overflow-hidden rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/60"
      >
        {asomo.length > 0 && (
          <div className="relative h-44 sm:h-52" aria-hidden="true">
            <div className="grid h-full grid-cols-4 gap-px">
              {asomo.map((f) => (
                <div key={f} className="overflow-hidden bg-black/40">
                  <img
                    src={f}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover opacity-70 transition-all duration-700 group-hover:scale-105 group-hover:opacity-90"
                  />
                </div>
              ))}
            </div>
            {/* El degradado hacia el fondo hace que el mosaico se lea como un asomo y no como
                una galería recortada a la mitad. */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-[#141414]" />
          </div>
        )}

        <div className="flex flex-1 flex-col p-8 sm:p-10">
          <span className="text-[10px] font-light tracking-[0.3em] uppercase text-[#C9A84C]/75">
            {eyebrow}
          </span>

          <h3 className="mt-3 text-3xl font-extralight tracking-tight text-white/95 transition-colors group-hover:text-[#C9A84C] sm:text-4xl">
            {titulo}
          </h3>

          <p className="mt-4 flex-1 text-sm font-light leading-relaxed text-white/45 sm:text-base">
            {texto}
          </p>

          <span className="mt-7 inline-flex items-center gap-2.5 self-start rounded-full border border-[#C9A84C]/25 px-6 py-3 text-[11px] font-light tracking-[0.18em] uppercase text-[#C9A84C] transition-colors group-hover:border-[#C9A84C]/60 group-hover:bg-[#C9A84C]/5">
            {cta}
            <ArrowRight
              size={13}
              aria-hidden="true"
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
