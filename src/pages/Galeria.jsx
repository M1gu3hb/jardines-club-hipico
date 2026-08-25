import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Play, Expand } from 'lucide-react';
import { EsqueletoMosaico, AvisoCargando } from '@/components/ui/Esqueleto';
import Pagina from '@/components/navegacion/Pagina';
import MediaViewer, { isVideo } from '@/components/MediaViewer';
import { useGaleria } from '@/lib/datos';
import { medidasDe } from '@/lib/medidas';

/**
 * Las formas del collage, en un patrón de ocho.
 *
 * En el teléfono (2 columnas) `col-span-2` es el ancho completo, así que la GRANDE y la ANCHA
 * se ven enteras — una de cada cuatro fotos. De 640 px en adelante hay 4 y 6 columnas y las
 * proporciones se reparten como en un mosaico impreso.
 *
 * No es aleatorio a propósito: un patrón fijo se ve compuesto y además **no cambia entre el
 * servidor y el navegador**, que es lo que pasaría con `Math.random()` — el prerender pintaría
 * una disposición y la hidratación otra, y las fotos saltarían de sitio al cargar.
 */
const FORMAS = [
  'col-span-2 row-span-2',                    // grande
  'col-span-1 row-span-1',
  'col-span-1 row-span-2',                    // alta
  'col-span-1 row-span-1',
  'col-span-2 row-span-1',                    // ancha
  'col-span-1 row-span-1',
  'col-span-1 row-span-1',
  'col-span-2 row-span-2 sm:col-span-2 sm:row-span-1',  // grande en móvil, ancha en pantalla
];

/**
 * /galeria — los 69 medios del recinto.
 *
 * ── Por qué NO hay filtros, todavía ─────────────────────────────────────────
 *
 * Porque el dato no existe. Las 69 piezas no tienen ninguna forma de saber a qué espacio ni a
 * qué tipo de evento pertenecen: la tabla solo guardaba dirección, título y orden. La
 * migración `sec_32` abrió las columnas (`salon_id`, `tipo_evento_slug`, `alt`, `destacada`),
 * pero abrir el hueco no lo llena.
 *
 * Etiquetarlas es trabajo humano y no se puede automatizar sin inventar: nadie salvo quien
 * conoce el recinto sabe si esa foto es del Encanto o del de los Espejos. Son ~30 segundos
 * por pieza, media hora larga, y es la tarea de mayor retorno de todo el rediseño porque
 * desbloquea a la vez los filtros de aquí, las galerías de cada espacio, las fotos de las
 * páginas de evento, los `alt` para accesibilidad y las imágenes de Open Graph.
 *
 * En cuanto haya etiquetas, los filtros se añaden aquí y aparecen solos.
 *
 * ── Sobre los `alt` vacíos ──────────────────────────────────────────────────
 *
 * Están vacíos A PROPÓSITO mientras no exista la columna llena. Un `alt` genérico repetido 69
 * veces («foto del salón») es PEOR que uno vacío para quien usa lector de pantalla: le hace
 * escuchar la misma frase inútil setenta veces en vez de saltar la galería entera. Un `alt`
 * vacío marca la imagen como decorativa y el lector la omite.
 */
export default function Galeria() {
  const { data: medios, isLoading, isError } = useGaleria();
  const [abierto, setAbierto] = useState(null);

  const items = (medios || []).map((m) => ({ url: m.imagenUrl, titulo: m.titulo || '' }));

  return (
    <Pagina
      clave="galeria"
      eyebrow="El lugar, sin retoques"
      encabezado="Galería"
      entradilla="Fotografías y video reales del recinto. Ninguna es de banco de imágenes ni de otro lugar."
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 pb-16">
        {isLoading && (
          <>
            <AvisoCargando que="la galería" />
            <EsqueletoMosaico cuantas={12} />
          </>
        )}

        {isError && (
          <p className="py-20 text-center text-sm font-light text-white/50">
            No pudimos cargar la galería ahora mismo.{' '}
            <Link to="/espacios" className="text-[#C9A84C] underline underline-offset-4">
              Mira los espacios
            </Link>{' '}
            mientras tanto.
          </p>
        )}

        {!isLoading && !isError && (
          <>
            {/* LA GALERÍA NECESITA DECIR QUÉ ES.
              *
              * Llegar a una rejilla de sesenta y nueve fotos sin una línea de contexto deja al
              * visitante mirando imágenes sueltas sin saber qué está viendo ni qué hacer
              * después. Dos párrafos y un camino de salida convierten «mirar fotos» en «esto es
              * el sitio donde puede ser mi boda». */}
            <div className="mb-12 max-w-3xl space-y-4 text-base font-light leading-[1.85] text-white/55">
              <p>
                Todo lo que ves aquí es de Jardines Club Hípico: los jardines abiertos, los
                salones techados, la capilla, el área de los niños y las áreas comunes por las
                que pasan tus invitados. Ninguna es de banco de imágenes ni de otro lugar.
              </p>
              <p>
                Son más de dos hectáreas y en fotos cuesta dimensionarlas. Por eso insistimos en
                la visita: este lugar se explica caminándolo. Pero para hacerte una idea de si
                es lo que buscas, empieza por aquí.
              </p>
            </div>

            <p className="mb-6 text-xs font-light tracking-[0.14em] uppercase text-white/30">
              {items.length} {items.length === 1 ? 'pieza' : 'piezas'}
            </p>

            {/* ══════════════════════════════════════════════════════════════════════
              * UN COLLAGE DE VERDAD: PIEZAS DE TAMAÑOS DISTINTOS
              * ══════════════════════════════════════════════════════════════════════
              *
              * Palabras del dueño: *«distribúyela y hazla como un collage, unas más grandes
              * que otras, que se vean bien, que se vean chingonas»*.
              *
              * Antes eran todas del mismo tamaño y eso hace dos cosas malas a la vez: aplana
              * —sin piezas grandes no hay dónde descansar la vista ni qué mirar primero— y
              * empequeñece, porque el tamaño de la celda lo fija la más pequeña.
              *
              * Ahora hay cuatro tamaños que se repiten en un patrón de ocho: una GRANDE (dos
              * por dos), una ANCHA, una ALTA y varias normales. El patrón se repite pero no
              * cae siempre en el mismo sitio de la fila, así que no se ve la rejilla por
              * debajo — que es justo lo que diferencia un collage de una tabla.
              *
              * `grid-auto-flow: dense` es lo que lo hace posible: cuando una pieza grande no
              * cabe en el hueco que toca, el navegador mete ahí una pequeña en vez de dejar el
              * agujero. Sin eso, un collage con tamaños mezclados sale lleno de vacíos.
              *
              * En el teléfono son dos columnas, así que «grande» y «ancha» ocupan el ancho
              * completo: una de cada cuatro fotos se ve a pantalla completa. Ese era el
              * problema original —*«se ve muy chiquita, la gente mayor no ve nada»*— y así
              * queda resuelto sin dejar de ser un collage.
              */}
            <div
              className="grid grid-cols-2 auto-rows-[110px] gap-2 sm:grid-cols-4 sm:auto-rows-[130px] sm:gap-3 lg:grid-cols-6 lg:auto-rows-[140px]"
              style={{ gridAutoFlow: 'dense' }}
            >
              {(medios || []).map((m, i) => {
                // EL HUECO SE RESERVA ANTES DE QUE LLEGUE LA IMAGEN.
                //
                // Sin esto, cada foto ocupa cero alto hasta que carga y al cargar empuja todo lo
                // que tiene debajo: la página entera moviéndose durante segundos, justo mientras
                // alguien intenta tocar una foto — y acabando en otra.
                //
                // Las medidas salen de leer el archivo en el build (`scripts/medidas-medios.mjs`),
                // no de que nadie las teclee. Si una pieza no está en la lista se deja sin
                // proporción a propósito: inventar un 4:3 sobre una foto vertical reserva un
                // hueco equivocado y produce el mismo salto, solo que al revés.
                // El patrón del collage. Ocho posiciones que se repiten: una grande, una
                // ancha, una alta y cinco normales. Ver la nota de arriba.
                const forma = FORMAS[i % FORMAS.length];

                // Las medidas reales siguen viajando al `<img>`. Ya no reservan el hueco —de eso
                // se encarga el alto fijo de la fila— pero le dicen al navegador la proporción
                // de origen, que es lo que necesita para recortar con `object-cover` sin
                // deformar y para decidir la calidad al escalar.
                const med = medidasDe(m.imagenUrl);
                return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setAbierto(i)}
                  aria-label={m.alt || m.titulo || `Ampliar pieza ${i + 1} de la galería`}
                  className={`group relative block h-full w-full overflow-hidden rounded-xl bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/60 ${forma}`}
                >
                  {isVideo(m.imagenUrl) ? (
                    <video
                      src={m.imagenUrl}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <img
                      src={m.imagenUrl}
                      alt={m.alt || ''}
                      loading={i < 8 ? 'eager' : 'lazy'}
                      width={med ? med.ancho : undefined}
                      height={med ? med.alto : undefined}
                      className="w-full transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                  )}

                  <span className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/25" />
                  <span className="pointer-events-none absolute bottom-2.5 right-2.5 grid h-7 w-7 place-items-center rounded-full border border-white/20 bg-black/50 text-white/80 opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
                    {isVideo(m.imagenUrl) ? <Play size={12} aria-hidden="true" /> : <Expand size={12} aria-hidden="true" />}
                  </span>
                </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* La salida. Una galería sin camino de salida deja a la gente mirando fotos hasta que
          se aburre; con él, el que le gustó lo que vio sabe qué hacer. */}
      <section className="border-t border-white/5">
        <div className="mx-auto max-w-3xl px-5 sm:px-8 py-16 text-center">
          <h2 className="text-2xl font-extralight text-white/90 sm:text-3xl">
            ¿Te late el lugar?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm font-light leading-relaxed text-white/45">
            Cuéntanos cómo imaginas tu evento y te decimos qué espacio le queda mejor y si tu
            fecha está libre. O ven a verlo: la visita no cuesta nada.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/cotizar"
              className="skeu-gold-btn w-full rounded-full px-7 py-3.5 text-xs font-medium tracking-[0.16em] uppercase text-[#1a1408] sm:w-auto"
            >
              Cotizar mi evento
            </Link>
            <Link
              to="/espacios"
              className="skeu-dark-btn w-full rounded-full px-7 py-3.5 text-xs font-medium tracking-[0.16em] uppercase sm:w-auto"
            >
              Ver los ocho espacios
            </Link>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {abierto !== null && (
          <MediaViewer items={items} startIdx={abierto} onClose={() => setAbierto(null)} />
        )}
      </AnimatePresence>
    </Pagina>
  );
}
