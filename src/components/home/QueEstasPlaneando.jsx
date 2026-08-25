import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import TextoQueAparece from '@/components/animacion/TextoQueAparece';
import { ArrowRight } from 'lucide-react';
import { useTodosLosTipos } from '@/lib/datos';
import { construyeRuta, rutaPorClave } from '@/rutas';
import { EsqueletoTarjetas, AvisoCargando } from '@/components/ui/Esqueleto';
import VerTodo from './VerTodo';

/**
 * «¿Qué estás planeando?» — el primer desvío de la portada.
 *
 * ── Por qué va antes que los espacios ───────────────────────────────────────
 *
 * Porque la mayoría de la gente no llega pensando «¿dónde?». Llega pensando «¿me sirve para mi
 * boda?». Preguntar por el evento antes que por el lugar es hablar en el idioma del visitante
 * en vez de en el del negocio, y además deja el resto de la portada ya clasificado en su cabeza.
 *
 * ── Los que todavía no tienen página también salen ──────────────────────────
 *
 * Y llevan al formulario con su tipo ya puesto. Esconderlos dejaría esta sección casi vacía
 * —hoy las seis filas de `tipos_evento` están apagadas— y tiraría el dato más valioso que trae
 * una visita: a qué viene. El día que una tenga contenido propio, su tarjeta empieza a llevar
 * a su página sola, sin tocar este archivo.
 *
 * ── Fotografías, no iconos ──────────────────────────────────────────────────
 *
 * Es lo que pide el encargo y tiene razón: un icono de anillos no vende una boda. Mientras las
 * filas no tengan imagen, la tarjeta se sostiene con tipografía y no finge una foto que no hay.
 */
export default function QueEstasPlaneando() {
  const { data: tipos, isLoading } = useTodosLosTipos();
  if (!isLoading && !(tipos || []).length) return null;

  return (
    <section
      id="eventos"
      aria-label="Tipos de evento"
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
              Empecemos por lo tuyo
            </span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#C9A84C]/50 sm:w-16" />
          </div>

          <TextoQueAparece
            como="h2"
            texto="¿Qué estás planeando?"
            className="block text-3xl font-extralight tracking-tight text-white/95 sm:text-5xl"
          />

          {/* La promesa, con las palabras del dueño: la primera pregunta que hace en la cita
              es «¿cómo lo imaginas?», porque así como lo imaginen, así lo construyen. */}
          <p className="mx-auto mt-5 max-w-xl text-sm font-light leading-relaxed text-white/45 sm:text-base">
            Aquí no hay paquetes cerrados. Como lo imagines, así lo armamos — y de un mismo
            tipo de evento salen mil formas distintas.
          </p>
        </motion.div>

        {isLoading && (
          <>
            <AvisoCargando que="los tipos de evento" />
            <EsqueletoTarjetas cuantas={6} columnas="sm:grid-cols-2 lg:grid-cols-3" />
          </>
        )}

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tipos.map((t, i) => (
            <motion.li
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: Math.min(i * 0.06, 0.3) }}
            >
              <Tarjeta tipo={t} />
            </motion.li>
          ))}
        </ul>

        <VerTodo a="/eventos">Ver todos los eventos</VerTodo>
      </div>
    </section>
  );
}

function Tarjeta({ tipo }) {
  const tienePagina = Boolean(tipo.activo);
  const destino = tienePagina
    ? construyeRuta(rutaPorClave('evento').ruta, tipo.slug)
    : `/cotizar?evento=${encodeURIComponent(tipo.slug)}`;

  return (
    <Link
      to={destino}
      className="group skeu-card skeu-card-hover flex h-full flex-col overflow-hidden rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/60"
    >
      {tipo.imagenHero && (
        <div className="aspect-[16/10] overflow-hidden bg-black/40">
          <img
            src={tipo.imagenHero}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </div>
      )}

      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <h3 className="text-xl font-light text-white/90 transition-colors group-hover:text-[#C9A84C] sm:text-2xl">
          {tipo.nombre}
        </h3>

        <p className="mt-2.5 flex-1 text-sm font-light leading-relaxed text-white/40">
          {tipo.descripcionCorta || 'Cuéntanos cómo lo imaginas y te decimos qué espacio le queda mejor.'}
        </p>

        <span className="mt-5 inline-flex items-center gap-2 text-[10px] font-light tracking-[0.2em] uppercase text-[#C9A84C]/70 transition-colors group-hover:text-[#C9A84C]">
          {tienePagina ? 'Ver cómo se hace aquí' : 'Cotizar este evento'}
          <ArrowRight
            size={13}
            aria-hidden="true"
            className="transition-transform duration-300 group-hover:translate-x-1"
          />
        </span>
      </div>
    </Link>
  );
}
