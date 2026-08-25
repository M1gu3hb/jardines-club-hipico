import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Expand, Play } from 'lucide-react';
import MediaViewer, { isVideo } from '@/components/MediaViewer';

/**
 * GaleriaEspacio — las fotos de una ficha de espacio.
 *
 * ── Por qué no reutiliza `SalonGallery` ─────────────────────────────────────
 *
 * `SalonGallery` está atada al overlay de la portada: recibe `heroIdx` y `onThumbClick`
 * porque quien manda sobre la imagen grande es el overlay, no ella. En una página propia no
 * hay overlay que mande, y forzar esa forma obligaría a inventar un estado padre que no
 * existe. El visor sí se reutiliza —`MediaViewer`— que es donde está la complejidad de verdad.
 *
 * ── Composición: una grande y el resto en rejilla ───────────────────────────
 *
 * No es una decisión estética. Una rejilla uniforme de doce fotos iguales hace que el ojo no
 * sepa por dónde empezar y que ninguna se lea; con una pieza dominante hay un punto de
 * entrada y las demás se leen como apoyo. Además la primera suele ser la mejor foto del
 * espacio, y merece el tamaño.
 */
export default function GaleriaEspacio({ principal, imagenes = [], nombre }) {
  const [abierto, setAbierto] = useState(null);

  // La principal encabeza, y se quita de la lista si además viene repetida dentro: enseñar
  // dos veces la misma foto en la misma pantalla parece un fallo, y lo es.
  const medios = [principal, ...imagenes].filter(Boolean).filter((u, i, a) => a.indexOf(u) === i);
  if (medios.length === 0) return null;

  const [portada, ...resto] = medios;
  const items = medios.map((url) => ({ url, titulo: nombre || '' }));

  return (
    <section aria-label={`Fotografías de ${nombre}`} className="mx-auto max-w-7xl px-5 sm:px-8">
      <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">

        <Pieza
          url={portada}
          alt={`${nombre}, vista principal`}
          onAbrir={() => setAbierto(0)}
          className="aspect-[16/10] lg:aspect-[4/3]"
          prioridad
        />

        {resto.length > 0 && (
          <div className="grid grid-cols-3 gap-3 lg:grid-cols-2 lg:content-start">
            {resto.slice(0, 4).map((url, i) => (
              <Pieza
                key={url}
                url={url}
                alt={`${nombre}, fotografía ${i + 2}`}
                onAbrir={() => setAbierto(i + 1)}
                className="aspect-square"
                // La última visible anuncia cuántas quedan: sin ese número nadie sospecha
                // que hay veinte fotos más detrás y la galería se queda sin ver.
                restantes={i === 3 && resto.length > 4 ? resto.length - 4 : 0}
              />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {abierto !== null && (
          <MediaViewer items={items} startIdx={abierto} onClose={() => setAbierto(null)} />
        )}
      </AnimatePresence>
    </section>
  );
}

function Pieza({ url, alt, onAbrir, className = '', restantes = 0, prioridad = false }) {
  const video = isVideo(url);

  return (
    <button
      type="button"
      onClick={onAbrir}
      aria-label={video ? `Reproducir ${alt}` : `Ampliar ${alt}`}
      className={`group relative overflow-hidden rounded-xl bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/60 ${className}`}
    >
      {video ? (
        <video
          src={url}
          muted
          playsInline
          preload="metadata"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />
      ) : (
        <img
          src={url}
          alt={alt}
          loading={prioridad ? 'eager' : 'lazy'}
          fetchPriority={prioridad ? 'high' : undefined}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />
      )}

      <span className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/25" />

      {restantes > 0 && (
        <span className="absolute inset-0 grid place-items-center bg-black/65 text-lg font-extralight text-white backdrop-blur-[2px]">
          +{restantes}
        </span>
      )}

      {restantes === 0 && (
        <span className="pointer-events-none absolute bottom-3 right-3 grid h-8 w-8 place-items-center rounded-full border border-white/20 bg-black/50 text-white/80 opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
          {video ? <Play size={13} aria-hidden="true" /> : <Expand size={13} aria-hidden="true" />}
        </span>
      )}
    </button>
  );
}
