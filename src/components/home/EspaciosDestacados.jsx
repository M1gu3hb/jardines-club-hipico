import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useSalones } from '@/lib/datos';
import { rangoTexto, topeReal, ETIQUETA_TIPO } from '@/lib/capacidad';
import { construyeRuta, rutaPorClave } from '@/rutas';
import VerTodo from './VerTodo';

const SIN_FOTO = '/media/img/dGg8Xxh.jpg';

/**
 * Espacios destacados — cuatro, no ocho.
 *
 * ── Por qué cuatro ──────────────────────────────────────────────────────────
 *
 * Porque la portada tiene que INSINUAR, no agotar. Ocho fichas seguidas convierten la Home en
 * el catálogo y dejan a `/espacios` sin razón de existir; además, para cuando alguien llega a
 * la sexta ya dejó de mirarlas. Cuatro y un enlace es más información disponible en total y
 * menos por camino, que es exactamente lo que pedía el encargo.
 *
 * ── Y la capacidad va SOBRE la foto ─────────────────────────────────────────
 *
 * Quien busca recinto filtra por número de invitados antes que por nada. Si tiene que leer un
 * párrafo para saber si caben sus trescientas personas, se va. El número es lo primero que se
 * lee de cada tarjeta, no una línea perdida en el cuerpo.
 *
 * ── El cambio de fondo respecto a lo que había ──────────────────────────────
 *
 * Antes cada salón abría un overlay: sin dirección propia, imposible de compartir e invisible
 * para Google. Ahora cada uno lleva a su página. Es la mitad del sentido del rediseño.
 */
export default function EspaciosDestacados() {
  const { data: salones, isLoading, isError } = useSalones();

  // Los cuatro que enseñan mejor la variedad del recinto: el salón principal, el que gusta por
  // su temática, el jardín grande y el nocturno. No son los cuatro primeros por orden: son
  // cuatro tipos de evento distintos, para que se vea que aquí cabe más de una cosa.
  const preferidos = ['salon-de-los-espejos', 'salon-encanto', 'jardines', 'eclipse'];
  const lista = (salones || [])
    .filter((s) => preferidos.includes(s.slug))
    .sort((a, b) => preferidos.indexOf(a.slug) - preferidos.indexOf(b.slug));

  // Si alguno se desactivara desde el panel, se completa con lo que haya en vez de enseñar
  // tres tarjetas y un hueco.
  const destacados = lista.length >= 4
    ? lista
    : [...lista, ...(salones || []).filter((s) => !preferidos.includes(s.slug) && s.tipoEspacio !== 'hospedaje')].slice(0, 4);

  if (isLoading) return null;

  return (
    <section
      id="salones"
      aria-labelledby="espacios-destacados"
      className="w-full bg-[#080808] px-4 py-20 sm:px-6 md:py-28"
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
              Ocho espacios, un recinto
            </span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#C9A84C]/50 sm:w-16" />
          </div>

          <h2
            id="espacios-destacados"
            className="text-3xl font-extralight tracking-tight text-white/95 sm:text-5xl"
          >
            Dónde puede pasar
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-sm font-light leading-relaxed text-white/45 sm:text-base">
            Salones cerrados, jardines abiertos, una capilla y un área para los niños. Todo
            dentro del mismo terreno, sin que nadie tenga que trasladarse.
          </p>
        </motion.div>

        {isError ? (
          <p className="py-10 text-center text-sm font-light text-white/45">
            No pudimos cargar los espacios ahora mismo.{' '}
            <Link to="/contacto" className="text-[#C9A84C] underline underline-offset-4">
              Escríbenos y te los contamos
            </Link>
            .
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {destacados.map((s, i) => (
              <motion.li
                key={s.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: Math.min(i * 0.08, 0.3) }}
              >
                <Tarjeta salon={s} />
              </motion.li>
            ))}
          </ul>
        )}

        <VerTodo a="/espacios">Ver los ocho espacios</VerTodo>
      </div>
    </section>
  );
}

function Tarjeta({ salon }) {
  const rango = rangoTexto(salon);
  const tope = topeReal(salon);

  return (
    <Link
      to={construyeRuta(rutaPorClave('espacio').ruta, salon.slug)}
      className="group skeu-card skeu-card-hover block overflow-hidden rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/60"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-black/40">
        <img
          src={salon.imagenPrincipal || SIN_FOTO}
          alt=""
          loading="lazy"
          width="700"
          height="440"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

        <span className="absolute right-4 top-4 rounded-full border border-white/15 bg-black/60 px-3 py-1 text-[9px] font-light tracking-[0.16em] uppercase text-white/60 backdrop-blur-sm">
          {ETIQUETA_TIPO[salon.tipoEspacio] || 'Espacio'}
        </span>

        <div className="absolute inset-x-5 bottom-5">
          <h3 className="text-xl font-light text-white transition-colors group-hover:text-[#C9A84C] sm:text-2xl">
            {salon.nombre}
          </h3>
          {rango && (
            <p className="mt-1.5 text-sm font-light text-white/60">
              {rango} personas
              {tope && tope !== salon.capacidadMax && (
                <span className="text-white/35"> · hasta {tope} si hace falta</span>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 p-5">
        <p className="line-clamp-2 text-sm font-light leading-relaxed text-white/40">
          {salon.descripcion}
        </p>
        <ArrowRight
          size={16}
          aria-hidden="true"
          className="shrink-0 text-[#C9A84C]/50 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[#C9A84C]"
        />
      </div>
    </Link>
  );
}
