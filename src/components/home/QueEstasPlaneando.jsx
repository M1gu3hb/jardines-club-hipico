import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import TextoQueAparece from '@/components/animacion/TextoQueAparece';
import { ArrowRight } from 'lucide-react';
import { useTodosLosTipos } from '@/lib/datos';
import { construyeRuta, rutaPorClave } from '@/rutas';
import { EsqueletoTarjetas, AvisoCargando } from '@/components/ui/Esqueleto';
import { REJILLA_CENTRADA, CELDA_CENTRADA, arranqueCentrado } from '@/lib/rejilla';
import VerTodo from './VerTodo';
import ArteDeEvento from '@/components/eventos/ArteDeEvento';
import Foto from '@/components/ui/Foto';

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

  // UNA SOLA LISTA, YA DEFENDIDA, PARA TODO EL COMPONENTE.
  //
  // Aquí hubo un fallo que tiró la portada entera. Al meter el esqueleto de carga cambié la
  // salida temprana para que el componente siguiera vivo mientras llegan los datos —correcto—
  // pero más abajo seguía un `tipos.map(...)`, y durante la carga `tipos` es `undefined`.
  // Guardé la puerta y dejé el agujero.
  //
  // Y NO LO VIO NINGUNA DE LAS CUATRO PUERTAS, que es lo que más importa: el prerender
  // construye las páginas con la caché de datos YA LLENA, así que el estado de carga no se
  // ejecuta nunca en el build. Un fallo que solo existe mientras se espera a la red es
  // invisible para un render que nunca espera.
  //
  // La lección: no basta con proteger el `return` temprano. La lista se normaliza UNA vez,
  // arriba, y a partir de ahí nadie vuelve a tocar el dato crudo.
  const lista = tipos || [];

  // ══════════════════════════════════════════════════════════════════════════
  // LA PORTADA ENSEÑA CINCO. LOS CATORCE ESTÁN EN SU PÁGINA.
  // ══════════════════════════════════════════════════════════════════════════
  //
  // Con catorce tarjetas, esta sección se comía la portada entera y dejaba a `/eventos` sin
  // razón de existir. El dueño lo dijo al verlo: *«en el inicio no muestres todas, para eso
  // está el botón de ver todos los tipos de evento»*.
  //
  // Cinco es el número correcto por dos motivos. Uno, que en la rejilla de tres columnas
  // llenan una fila y dejan la segunda a medias — y una fila incompleta se lee como «hay
  // más», no como «se acabó». Y dos, que son los cinco que el dueño puso primero: `orden` lo
  // controla él desde el panel, así que elegirlos yo por «cuál vende mejor» sería sustituir
  // su criterio por el mío.
  const asomo = lista.slice(0, 5);
  const quedanMas = lista.length > asomo.length;

  if (!isLoading && lista.length === 0) return null;

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
            resalta="planeando?"
            className="block text-3xl font-extralight tracking-tight text-white/95 sm:text-5xl"
          />

          {/* La promesa, con las palabras del dueño: la primera pregunta que hace en la cita
            * es «¿cómo lo imaginas?», porque así como lo imaginen, así lo construyen.
            *
            * Y desde esta ronda dice además que la lista es abierta. Es corrección suya y va
            * al fondo del asunto: una lista de tipos se lee como un catálogo cerrado, y aquí
            * se han hecho cosas que no caben en ninguna de las categorías. Decirlo aquí
            * cuesta una línea; no decirlo cuesta las visitas que no se ven reflejadas. */}
          <p className="mx-auto mt-5 max-w-xl text-sm font-light leading-relaxed text-[color:var(--texto-3)] sm:text-base">
            Aquí no hay paquetes cerrados. Como lo imagines, así lo armamos — y lo de abajo son
            ejemplos, no una lista de lo único que se puede hacer.
          </p>
        </motion.div>

        {isLoading && (
          <>
            <AvisoCargando que="los tipos de evento" />
            <EsqueletoTarjetas cuantas={6} columnas="sm:grid-cols-2 lg:grid-cols-3" />
          </>
        )}

        {/* EL CORTE DIFUMINADO, EL MISMO DE LA GALERÍA.
          *
          * El dueño lo pidió así de explícito: *«en el quinto que pase lo que tiene la
          * galería, que se corte como con blur, para dar indicio de darle al botón»*.
          *
          * Y es el mismo recurso, que funciona por el mismo motivo: **un corte limpio dice
          * "esto es todo"; un corte deshecho dice "hay más"**. Cinco tarjetas terminadas en
          * una línea recta parecen el catálogo completo; cinco disolviéndose en el fondo
          * empujan al botón sin tener que escribir «hay nueve más».
          *
          * El degradado va POR ENCIMA y sin recibir clics, para no bloquear las tarjetas que
          * todavía se ven enteras arriba. Y solo aparece si de verdad quedan más: con catorce
          * tipos siempre habrá, pero si algún día el dueño deja cinco o menos, la sección se
          * cierra limpia en vez de insinuar un contenido que no existe. */}
        <div className={quedanMas ? 'relative' : undefined}>
          {/* LA ÚLTIMA FILA VA CENTRADA.
            *
            * Cinco tarjetas en tres columnas dejaban dos pegadas a la izquierda y un hueco a
            * la derecha. El dueño: *«que no se vean así como que falta uno»*. Y es exactamente
            * lo que parecía. El porqué del truco de las seis columnas está en `lib/rejilla.js`. */}
          <ul className={REJILLA_CENTRADA}>
            {asomo.map((t, i) => (
              <motion.li
                key={t.id}
                className={`${CELDA_CENTRADA} ${arranqueCentrado(i, asomo.length)}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: Math.min(i * 0.06, 0.3) }}
              >
                <Tarjeta tipo={t} />
              </motion.li>
            ))}
          </ul>

          {quedanMas && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent sm:h-48"
            />
          )}
        </div>

        {/* El botón se mete DENTRO del degradado con margen negativo, como en la galería: así
          * queda claro que es la salida de ese corte y no un enlace suelto debajo.
          *
          * ── EL BOTÓN YA NO DICE CUÁNTOS SON ──────────────────────────────────
          *
          * Decía «Ver los 14 tipos de evento». El dueño lo hizo quitar y el motivo es de
          * negocio, no de estilo: *«estás limitando a que nada más podemos manejar catorce
          * eventos, y no — podemos manejar lo que se imagine la gente»*.
          *
          * Un número es una promesa cerrada. Quien busca algo que no está entre esos catorce
          * lee el número y concluye que aquí no se hace. Sin él, la lista se lee por lo que
          * es: ejemplos. */}
        <div className={quedanMas ? '-mt-10 sm:-mt-12' : undefined}>
          <VerTodo a="/eventos">
            {quedanMas ? 'Ver los tipos de evento que hacemos' : 'Ver todos los eventos'}
          </VerTodo>
        </div>
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
      {/* LA FOTO MANDA; EL DIBUJO ES EL SUPLENTE.
        *
        * Hoy ninguna de las seis filas tiene `imagen_hero`, así que se ven los dibujos. El día
        * que el dueño suba una fotografía desde el panel, esa tarjeta cambia sola y sin tocar
        * este archivo — una foto real del recinto siempre gana a una ilustración. */}
      {tipo.imagenHero ? (
        <div className="aspect-[16/10] overflow-hidden bg-black/40">
          <Foto
            url={tipo.imagenHero}
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            claseContenedor="h-full w-full"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </div>
      ) : (
        <ArteDeEvento
          slug={tipo.slug}
          className="aspect-[16/10] w-full border-b border-white/5 bg-black/20"
        />
      )}

      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <h3 className="text-xl font-light text-white/90 transition-colors group-hover:text-[#C9A84C] sm:text-2xl">
          {tipo.nombre}
        </h3>

        <p className="mt-2.5 flex-1 text-sm font-light leading-relaxed text-[color:var(--texto-3)]">
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
