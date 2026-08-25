import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import ParejaQueBaila from './ParejaQueBaila';

/** La imagen del anuncio, auto-hospedada como todo lo demás. */
const IMAGEN = '/media/img/anuncio-clases-de-baile.jpg';

/**
 * BandaClasesDeBaile — el anuncio de la academia.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * DÓNDE VA Y POR QUÉ AHÍ
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Entre el hero y las cifras, que es donde lo pidió el dueño: *«abajo de cotiza tu evento y
 * arriba de lo de más de treinta años de experiencia»*. Es el único punto de la portada donde
 * una novedad no interrumpe nada — el visitante acaba de leer la promesa y todavía no ha
 * empezado a comparar espacios.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * EL TEXTO ESTÁ DENTRO DE LA IMAGEN, Y ESO OBLIGA A DOS COSAS
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * El dueño entregó el anuncio ya compuesto, con «Próximamente · Clases de baile · en Jardines
 * Club Hípico» dibujado dentro. Se respeta tal cual: es su pieza y está bien hecha.
 *
 * Pero un texto dentro de un JPEG **no existe para nadie que no lo esté mirando**. Google no
 * lo lee, un lector de pantalla no lo dice y una búsqueda con Ctrl+F no lo encuentra. Por eso
 * van dos cosas más:
 *
 *   1. Un `alt` que dice exactamente lo mismo que la imagen.
 *   2. Un `<h2>` real, oculto a la vista pero presente en el documento. Así la portada sigue
 *      teniendo un encabezado que anuncia las clases, y el esquema del documento no se rompe.
 *
 * Sin eso, el anuncio existiría solo para quien ya está mirando la pantalla — justo el único
 * que no necesita que se lo anuncien.
 *
 * ── Y si la imagen no está ──────────────────────────────────────────────────
 *
 * Cae en la pareja dibujada (`ParejaQueBaila`) con su texto en HTML. No es una precaución
 * teórica: el archivo lo sube el dueño a `public/media/img/`, y un anuncio que se convierte en
 * un hueco roto el día que alguien mueve un archivo es peor que no tener anuncio.
 *
 * ── Lo que NO dice ──────────────────────────────────────────────────────────
 *
 * Ni fecha, ni horarios, ni precios. No existen todavía. Anunciar una academia con datos
 * inventados genera preguntas que nadie puede contestar.
 */
export default function BandaClasesDeBaile() {
  const [falloLaImagen, setFalloLaImagen] = useState(false);

  return (
    <section
      aria-labelledby="banda-baile"
      className="relative w-full overflow-hidden border-y border-[#C9A84C]/15 bg-[#0b0a08]"
    >
      {/* El hilo dorado de arriba, igual que en las tarjetas del sitio. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-[#C9A84C]/45 to-transparent"
      />

      {/* El encabezado real. Está oculto a la vista porque las mismas palabras ya se leen
          dentro de la imagen; pero existe en el documento para Google y para quien navega
          con lector de pantalla. */}
      <h2 id="banda-baile" className="sr-only">
        Próximamente: clases de baile en Jardines Club Hípico
      </h2>

      <Link
        to="/clases-de-baile"
        aria-label="Próximamente, clases de baile en Jardines Club Hípico. Ver más"
        className="group relative block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#C9A84C]/70"
      >
        {falloLaImagen ? (
          <Respaldo />
        ) : (
          <motion.img
            src={IMAGEN}
            alt="Próximamente: clases de baile en Jardines Club Hípico"
            /* La proporción del archivo, para que la portada no salte mientras carga. */
            width="2000"
            height="653"
            loading="lazy"
            onError={() => setFalloLaImagen(true)}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="block w-full object-cover transition-transform duration-700 group-hover:scale-[1.015]"
          />
        )}

        {/* La llamada a la acción, encima de la imagen y abajo a la derecha. Discreta: el
            anuncio ya dice lo que tiene que decir, esto solo confirma que se puede pulsar. */}
        <span className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-full border border-[#C9A84C]/40 bg-black/55 px-4 py-2 text-[10px] font-light tracking-[0.18em] uppercase text-[#C9A84C] backdrop-blur-sm transition-colors duration-300 group-hover:border-[#C9A84C]/80 group-hover:bg-black/75 sm:bottom-5 sm:right-5 sm:text-[11px]">
          Avísame
          <ArrowRight
            size={12}
            aria-hidden="true"
            className="transition-transform duration-300 group-hover:translate-x-1"
          />
        </span>
      </Link>
    </section>
  );
}

/** Lo que se enseña si la imagen no está: la pareja dibujada y el texto en HTML. */
function Respaldo() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 py-6 sm:flex-row sm:gap-6 sm:px-8">
      <ParejaQueBaila className="h-16 w-20 shrink-0 sm:h-20 sm:w-24" />
      <div className="min-w-0 flex-1 text-center sm:text-left">
        <p className="text-[9px] font-light tracking-[0.34em] uppercase text-[#C9A84C]/70 sm:text-[10px]">
          Próximamente
        </p>
        <p className="mt-1.5 text-lg font-extralight leading-tight text-white/95 sm:text-2xl">
          Clases de{' '}
          <span className="bg-gradient-to-br from-[#F0DFA6] via-[#E2C266] to-[#C9A84C] bg-clip-text font-serif italic text-transparent">
            baile
          </span>{' '}
          en Jardines Club Hípico
        </p>
      </div>
    </div>
  );
}
