import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Expand, Images, Play } from 'lucide-react';
import { fotosDe } from '@/lib/servicios';
import Foto from '@/components/ui/Foto';
import { medidasDe } from '@/lib/medidas';
import { isVideo } from '@/components/MediaViewer';
import VisorDeFotos from '@/components/galeria/VisorDeFotos';

/**
 * Ficha — un servicio o una amenidad, con el tamaño que merece.
 *
 * ── El problema que resuelve ────────────────────────────────────────────────
 *
 * Antes esto era una rejilla de tarjetas iguales, todas del mismo tamaño y con una sola foto
 * cada una. Palabras del dueño: *«no tienen el protagonismo que deberían tener, ya que cada uno
 * tiene a veces hasta más de una imagen»*. Y es literal: «Montajes» tiene **catorce**
 * fotografías y se estaba enseñando con una, del mismo tamaño que el trampolín.
 *
 * ── La jerarquía sale de los datos, no de una lista ─────────────────────────
 *
 * Lo que decide si algo va grande o pequeño es **cuántas fotos tiene**. No hay una lista de
 * «destacados» que alguien tenga que mantener: quien sube seis fotos de algo está diciendo que
 * importa, y la página le hace caso sola.
 *
 *   · **3 fotos o más** → pieza ancha, con su galería al lado y el lado alternando.
 *   · **1 o 2** → tarjeta normal dentro de la rejilla.
 *   · **ninguna** → tarjeta de texto, sin fingir una imagen que no hay.
 *
 * Y como el orden también es por número de fotos, lo que abre cada sección es siempre lo que
 * tiene con qué abrirla.
 *
 * ── Las medidas se leen del archivo ─────────────────────────────────────────
 *
 * Los medios están auto-hospedados, así que el build sabe cuánto miden
 * (`scripts/medidas-medios.mjs`). Con eso el hueco se reserva antes de que la imagen llegue y
 * la página no salta.
 */
export default function Ficha({ item, invertida = false }) {
  const [abierto, setAbierto] = useState(null);
  const fotos = fotosDe(item);
  const titulo = item.titulo || item.nombre;

  if (fotos.length >= 3) {
    return (
      <>
        <article className="skeu-card overflow-hidden rounded-3xl">
          <div className="grid lg:grid-cols-2">
            <Portada
              url={fotos[0]}
              alt={titulo}
              onAbrir={() => setAbierto(0)}
              className={invertida ? 'lg:order-2' : ''}
              cuantas={fotos.length}
            />

            <div className="flex flex-col justify-center p-8 sm:p-12">
              <h3 className="text-2xl sm:text-4xl font-extralight leading-tight tracking-tight text-white/95">
                {titulo}
              </h3>
              {item.descripcion && (
                <p className="mt-5 text-base font-light leading-[1.8] text-white/55">
                  {item.descripcion}
                </p>
              )}

              {/* Las demás fotos, en tira. Es lo que convierte «tiene fotos» en «míralas». */}
              <ul className="mt-7 grid grid-cols-4 gap-2">
                {fotos.slice(1, 5).map((f, i) => (
                  <li key={f}>
                    <button
                      type="button"
                      onClick={() => setAbierto(i + 1)}
                      aria-label={`Ver ${titulo}, fotografía ${i + 2}`}
                      className="group relative block aspect-square w-full overflow-hidden rounded-lg bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/60"
                    >
                      <Medio
                        url={f}
                        /* Miniatura de un cuarto de tarjeta: nunca hace falta mas de 320 px. */
                        sizes="120px"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      {/* La última visible anuncia cuántas quedan: sin ese número nadie sospecha
                          que detrás hay diez más, y la galería se queda sin ver. */}
                      {i === 3 && fotos.length > 5 && (
                        <span className="absolute inset-0 grid place-items-center bg-black/70 text-sm font-light text-white backdrop-blur-[2px]">
                          +{fotos.length - 5}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </article>

        <Visor fotos={fotos} titulo={titulo} abierto={abierto} cerrar={() => setAbierto(null)} />
      </>
    );
  }

  return (
    <>
      <article className="skeu-card skeu-card-hover flex h-full flex-col overflow-hidden rounded-2xl">
        {fotos.length > 0 ? (
          <Portada url={fotos[0]} alt={titulo} onAbrir={() => setAbierto(0)} cuantas={fotos.length} compacta />
        ) : (
          // Sin foto NO se pone un marcador de posición gris: se le da aire al texto y ya. Un
          // hueco vacío en una rejilla de fotos se lee como que algo falló al cargar.
          <div className="h-1 w-full bg-gradient-to-r from-[#C9A84C]/40 via-[#C9A84C]/10 to-transparent" />
        )}

        <div className="flex flex-1 flex-col p-6">
          <h3 className="text-lg font-light text-white/90">{titulo}</h3>
          {item.descripcion && (
            <p className="mt-2.5 text-sm font-light leading-relaxed text-[color:var(--texto-3)]">
              {item.descripcion}
            </p>
          )}
        </div>
      </article>

      <Visor fotos={fotos} titulo={titulo} abierto={abierto} cerrar={() => setAbierto(null)} />
    </>
  );
}

function Portada({ url, alt, onAbrir, className = '', cuantas, compacta = false }) {
  const med = medidasDe(url);

  return (
    <button
      type="button"
      onClick={onAbrir}
      aria-label={`Ampliar ${alt}`}
      className={[
        'group relative overflow-hidden bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/60',
        compacta ? 'aspect-[3/2]' : 'aspect-[4/3] lg:aspect-auto lg:min-h-[26rem]',
        className,
      ].join(' ')}
    >
      <Medio
        url={url}
        med={med}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

      {cuantas > 1 && (
        <span className="pointer-events-none absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/60 px-3 py-1 text-[9px] font-light tracking-[0.14em] uppercase text-white/70 backdrop-blur-sm">
          <Images size={11} aria-hidden="true" />
          {cuantas} fotos
        </span>
      )}

      <span className="pointer-events-none absolute bottom-4 right-4 grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-black/50 text-white/85 opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
        <Expand size={14} aria-hidden="true" />
      </span>
    </button>
  );
}

function Visor({ fotos, titulo, abierto, cerrar }) {
  return (
    <AnimatePresence>
      {abierto !== null && fotos.length > 0 && (
        <VisorDeFotos
          piezas={fotos.map((url) => ({ url, titulo }))}
          indice={abierto}
          onCerrar={cerrar}
          onCambiar={() => {}}
        />
      )}
    </AnimatePresence>
  );
}

/**
 * Una sección del catálogo: las anchas primero, y el resto en rejilla.
 *
 * Que las anchas vayan arriba no es solo estético. Abrir con lo que tiene fotos da a entender
 * de qué va la página en el primer vistazo; abrir con una rejilla de tarjetas de texto la hace
 * parecer un listado administrativo.
 */
/**
 * @param {Object} props
 * @param {any[]}  props.items
 * @param {string} [props.id] Ancla de la sección, cuando hace falta enlazarla.
 */
export function Catalogo({ items, id }) {
  if (!items || items.length === 0) return null;

  const anchas = items.filter((i) => fotosDe(i).length >= 3);
  const resto = items.filter((i) => fotosDe(i).length < 3);

  return (
    <div id={id}>
      {anchas.length > 0 && (
        <div className="space-y-6">
          {anchas.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6 }}
            >
              <Ficha item={item} invertida={i % 2 === 1} />
            </motion.div>
          ))}
        </div>
      )}

      {resto.length > 0 && (
        <ul className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${anchas.length > 0 ? 'mt-6' : ''}`}>
          {resto.map((item, i) => (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: Math.min(i * 0.05, 0.25) }}
            >
              <Ficha item={item} />
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Medio — una foto o un video, con el mismo aspecto por fuera.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * POR QUÉ HACÍA FALTA
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Las fichas pintaban SIEMPRE un `<img>`. Y en `servicios` y `amenidades` hay videos, así que
 * el navegador recibía un `.mp4` donde esperaba una imagen y dibujaba el icono de imagen rota.
 * El dueño lo vio en su tablet: recuadros negros con el icono partido en «Variedad en Grupos
 * Musicales» y en varias fichas más.
 *
 * ── El truco del `#t=0.1` ───────────────────────────────────────────────────
 *
 * Un `<video>` sin `poster` puede quedarse en negro hasta que alguien lo reproduce. Añadir
 * `#t=0.1` a la dirección le pide al navegador que se coloque en el segundo 0,1 — y para
 * hacerlo tiene que descargar y **pintar** ese fotograma. Es la forma estándar de conseguir
 * una miniatura sin generar archivos de portada aparte.
 *
 * Se pide el segundo 0,1 y no el 0 porque muchos videos arrancan con un fotograma negro.
 *
 * Con `preload="metadata"` solo se baja la cabecera y ese fotograma, no el video entero: una
 * página con seis videos no descarga seis videos.
 *
 * ── Y el botón de reproducir ────────────────────────────────────────────────
 *
 * Un fotograma quieto es indistinguible de una foto. El distintivo dice que ahí hay algo que
 * se puede reproducir; al pulsarlo se abre el visor, que es donde el video suena y se ve
 * entero.
 */
function Medio({ url, className, med = null, alt = '', sizes = undefined }) {
  if (isVideo(url)) {
    return (
      <>
        <video
          src={`${url}#t=0.1`}
          muted
          playsInline
          preload="metadata"
          tabIndex={-1}
          aria-hidden="true"
          className={className}
        />
        <span className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-black/55 text-white/90 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
            <Play size={13} aria-hidden="true" />
          </span>
        </span>
      </>
    );
  }

  return (
    <Foto
      url={url}
      alt={alt}
      sizes={sizes || '(min-width: 1024px) 50vw, 100vw'}
      claseContenedor="h-full w-full"
      className={className}
    />
  );
}
