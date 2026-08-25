import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Play, Expand } from 'lucide-react';
import Pagina from '@/components/navegacion/Pagina';
import MediaViewer, { isVideo } from '@/components/MediaViewer';
import { useGaleria } from '@/lib/datos';
import { medidasDe } from '@/lib/medidas';

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
        {isLoading && <p className="py-20 text-center text-sm font-light text-white/35">Cargando la galería…</p>}

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
            <p className="mb-6 text-xs font-light tracking-[0.14em] uppercase text-white/30">
              {items.length} {items.length === 1 ? 'pieza' : 'piezas'}
            </p>

            {/* Rejilla de mampostería con columnas CSS: las fotos conservan su proporción en
                vez de recortarse a cuadrados iguales. En un recinto eso importa — un jardín
                apaisado y una capilla vertical no se leen igual metidos en la misma caja. */}
            <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 [&>*]:mb-3">
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
                const med = medidasDe(m.imagenUrl);
                return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setAbierto(i)}
                  aria-label={m.alt || m.titulo || `Ampliar pieza ${i + 1} de la galería`}
                  style={med ? { aspectRatio: med.proporcion } : undefined}
                  className="group relative block w-full overflow-hidden rounded-xl bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/60"
                >
                  {isVideo(m.imagenUrl) ? (
                    <video
                      src={m.imagenUrl}
                      muted
                      playsInline
                      preload="metadata"
                      className="w-full transition-transform duration-700 group-hover:scale-[1.04]"
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

      <AnimatePresence>
        {abierto !== null && (
          <MediaViewer items={items} startIdx={abierto} onClose={() => setAbierto(null)} />
        )}
      </AnimatePresence>
    </Pagina>
  );
}
