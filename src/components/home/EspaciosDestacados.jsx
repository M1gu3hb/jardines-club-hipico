import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import TextoQueAparece from '@/components/animacion/TextoQueAparece';
import { useSalones } from '@/lib/datos';
import { EsqueletoTarjetas, AvisoCargando } from '@/components/ui/Esqueleto';
import VerTodo from './VerTodo';
import TarjetaSalon from '@/components/espacios/TarjetaSalon';

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
  // su temática, el jardín grande y el área de los niños. No son los cuatro primeros por orden:
  // son cuatro cosas distintas, para que se vea que aquí cabe más de una.
  //
  // El cuarto era Eclipse y lo cambió el dueño: *«en vez del Eclipse, que se vea el pony, el
  // infantil»*. Es la elección correcta —el área infantil es de lo poco que NINGÚN salón de
  // ciudad puede ofrecer, y resuelve la objeción de quien viene con niños—, mientras que
  // Eclipse se parece a lo que ya enseñan los otros tres. Eclipse no desaparece: sigue en
  // `/espacios` y ahora entra en el bloque de diferenciadores como «área nocturna».
  const preferidos = ['salon-de-los-espejos', 'salon-encanto', 'jardines', 'area-infantil-pony'];
  const lista = (salones || [])
    .filter((s) => preferidos.includes(s.slug))
    .sort((a, b) => preferidos.indexOf(a.slug) - preferidos.indexOf(b.slug));

  // Si alguno se desactivara desde el panel, se completa con lo que haya en vez de enseñar
  // tres tarjetas y un hueco.
  const destacados = lista.length >= 4
    ? lista
    : [...lista, ...(salones || []).filter((s) => !preferidos.includes(s.slug) && s.tipoEspacio !== 'hospedaje')].slice(0, 4);


  return (
    <section
      id="salones"
      aria-label="Espacios destacados"
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

          <TextoQueAparece
            como="h2"
            texto="Dónde puede pasar"
            className="block text-3xl font-extralight tracking-tight text-white/95 sm:text-5xl"
          />

          <p className="mx-auto mt-5 max-w-xl text-sm font-light leading-relaxed text-white/45 sm:text-base">
            Salones cerrados, jardines abiertos, una capilla y un área para los niños. Todo
            dentro del mismo terreno, sin que nadie tenga que trasladarse.
          </p>
        </motion.div>

        {isLoading ? (
          <>
            <AvisoCargando que="los espacios" />
            <EsqueletoTarjetas cuantas={4} columnas="sm:grid-cols-2" />
          </>
        ) : isError ? (
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
              <li key={s.id}>
                <TarjetaSalon salon={s} indice={i} />
              </li>
            ))}
          </ul>
        )}

        <VerTodo a="/espacios">Ver los ocho espacios</VerTodo>
      </div>
    </section>
  );
}
