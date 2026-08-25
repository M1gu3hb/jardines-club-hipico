import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import TextoQueAparece from '@/components/animacion/TextoQueAparece';
import { Church, BedDouble, Baby, Moon } from 'lucide-react';

/**
 * Diferenciadores — las cuatro cosas que un salón normal no tiene.
 *
 * ── Por qué esta sección gana más que cualquier adjetivo ────────────────────
 *
 * Porque son HECHOS comprobables y son la respuesta a cuatro preguntas que la gente ya trae
 * en la cabeza: ¿tengo que mover a los invitados para la ceremonia? ¿dónde duerme la familia
 * que viene de fuera? ¿qué hago con los niños? ¿está seguro esto?
 *
 * Los cuatro salen de la entrevista con el dueño y del contenido real del recinto. Ninguno es
 * una frase de agencia: la capilla existe y se puede rentar sola, los bungalos existen y se
 * cobran por noche, el área infantil trae sus juegos incluidos, y el recinto está cerrado con
 * dos accesos y seguridad privada durante todo el evento.
 *
 * ── «Todo dentro» es EL argumento ───────────────────────────────────────────
 *
 * Palabras del dueño: *«todo aquí adentro, no tienen que salir, no tienen que hacer nada»*.
 * Para quien planea una boda con familia de fuera y niños, eso resuelve tres problemas de una
 * vez — y es lo que ningún salón de ciudad puede ofrecer.
 */
const COSAS = [
  {
    icono: Church,
    titulo: 'Capilla propia',
    texto:
      'La ceremonia y la fiesta en el mismo terreno. Nadie tiene que subirse al coche entre una cosa y la otra. También se renta sola.',
    a: '/espacios/capilla',
  },
  {
    icono: BedDouble,
    titulo: 'Hospedaje dentro',
    texto:
      'Bungalos y dormitorios para quien viene de lejos o para quien no quiere manejar de regreso a las tres de la mañana.',
    a: '/espacios/estancias',
  },
  {
    icono: Baby,
    titulo: 'Área para los niños',
    texto:
      'Con sus juegos incluidos en la renta. Corren, se cansan y los papás cenan tranquilos, que es de lo que se trata.',
    a: '/espacios/area-infantil-pony',
  },
  {
    // Este era «Recinto cerrado» y llevaba a `/amenidades`. Lo cambió el dueño: *«mejor cambia
    // el recinto cerrado por el área nocturna, porque ese te manda a las amenidades»*.
    //
    // Y el motivo es bueno: los otros tres llevan cada uno a SU espacio, y ese rompía el patrón
    // mandando a una lista. Cuatro promesas que se comportan igual se leen como un sistema;
    // una que se comporta distinta se lee como un despiste. Lo del recinto cerrado no se
    // pierde — sigue contado en `/amenidades` y en las preguntas frecuentes.
    icono: Moon,
    titulo: 'Área nocturna',
    texto:
      'Eclipse: el espacio para cuando la fiesta cambia de tono. Otra iluminación, otro ambiente, sin mover a nadie del recinto.',
    a: '/espacios/eclipse',
  },
];

export default function Diferenciadores() {
  return (
    <section
      aria-label="Lo que no tiene un salón normal"
      className="w-full border-y border-white/5 bg-[#0a0a0a] px-4 py-20 sm:px-6 md:py-24"
    >
      <div className="mx-auto w-full max-w-6xl">
        <TextoQueAparece
          como="h2"
          texto="Lo que no tiene un salón normal"
          className="mb-14 block text-center text-3xl font-extralight tracking-tight text-white/95 sm:text-4xl"
        />

        <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {COSAS.map((c, i) => (
            <motion.li
              key={c.titulo}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: Math.min(i * 0.08, 0.3) }}
            >
              <Link
                to={c.a}
                className="group block rounded-2xl p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/60"
              >
                <c.icono size={22} className="text-[#C9A84C]/70 transition-colors group-hover:text-[#C9A84C]" aria-hidden="true" />
                <h3 className="mt-4 text-base font-light text-white/90 transition-colors group-hover:text-[#C9A84C] sm:text-lg">
                  {c.titulo}
                </h3>
                <p className="mt-2.5 text-sm font-light leading-relaxed text-white/40">{c.texto}</p>
              </Link>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
