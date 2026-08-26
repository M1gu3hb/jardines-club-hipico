import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Play, Expand } from 'lucide-react';
import { EsqueletoMosaico, AvisoCargando } from '@/components/ui/Esqueleto';
import Pagina from '@/components/navegacion/Pagina';
import { isVideo } from '@/components/MediaViewer';
import MosaicoJustificado from '@/components/galeria/MosaicoJustificado';
import Foto from '@/components/ui/Foto';
import { useGaleria } from '@/lib/datos';
import VisorDeFotos from '@/components/galeria/VisorDeFotos';


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
              * FILAS JUSTIFICADAS, NO REJILLA
              * ══════════════════════════════════════════════════════════════════════
              *
              * Aquí hubo primero mampostería por columnas y después un collage de celdas
              * fijas. Los dos fallaban por el mismo sitio: una rejilla de celdas **siempre**
              * deja huecos, porque cuando la pieza que toca no cabe en el espacio que queda,
              * la celda se queda negra. El dueño lo vio: *«tiene muchísimos espacios negros
              * vacíos»*.
              *
              * Y había un daño peor: las celdas fijas RECORTAN. Una foto vertical metida en
              * una celda apaisada se enseñaba a medias — *«cuando abres la foto, en realidad
              * no es toda la foto»*.
              *
              * `MosaicoJustificado` calcula cada fila para que mida exactamente el ancho
              * disponible, usando las proporciones reales de los archivos. Cero huecos por
              * construcción, ningún recorte, y la variedad de tamaños la pone el contenido en
              * vez de un patrón inventado. La explicación completa está en ese archivo.
              */}
            <MosaicoJustificado
              piezas={medios || []}
              pinta={(m, i, tam) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setAbierto(i)}
                  aria-label={m.alt || m.titulo || `Ampliar pieza ${i + 1} de la galería`}
                  style={{ width: tam.ancho, height: tam.alto, flex: '0 0 auto' }}
                  className="group relative block overflow-hidden rounded-xl bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/60"
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
                    /* LAS OCHO PRIMERAS SON PRIORITARIAS Y EL RESTO PEREZOSAS.
                     *
                     * Esa división es lo que arregla el «unas cargan y otras no»: sin ella, las
                     * sesenta y nueve salen a pedirse a la vez y se pelean por el mismo ancho
                     * de banda, así que ninguna termina pronto y algunas mueren por el camino.
                     *
                     * `sizes` describe el hueco REAL que ocupa cada foto en este mosaico
                     * justificado: en pantalla ancha cada fila lleva cuatro o cinco, así que
                     * ronda el 25 % del ancho; en un teléfono, una sola por fila. Sin este dato
                     * el navegador supondría el ancho completo de la ventana y elegiría la
                     * variante más grande, tirando por tierra media optimización. */
                    <Foto
                      url={m.imagenUrl}
                      alt={m.alt || ''}
                      prioridad={i < 8}
                      /* EL ANCHO EXACTO, EN PIXELES. NO UNA SUPOSICION.
                       *
                       * Aquí ponía `25vw` y fue el fallo que arruinó la calidad: en una ventana
                       * de 1280 px eso son 320, así que el navegador servía 320 A TODAS —
                       * midieran 252 o 455—. Las grandes salían AMPLIADAS, o sea borrosas. Y en
                       * un teléfono, que necesita el doble o el triple de píxeles por su
                       * densidad de pantalla, el resultado era directamente pixelado.
                       *
                       * `sizes` en `vw` solo sirve cuando todas las piezas de una rejilla miden
                       * lo mismo. Este mosaico es justificado: CADA foto tiene su ancho, y el
                       * componente que lo reparte ya lo ha calculado. Pasarlo en píxeles le
                       * quita al navegador toda necesidad de adivinar — y con la densidad de
                       * pantalla ya se apaña él, que para eso multiplica por su cuenta. */
                      sizes={`${Math.round(tam.ancho)}px`}
                      claseContenedor="h-full w-full"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                  )}

                  <span className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/25" />
                  <span className="pointer-events-none absolute bottom-2.5 right-2.5 grid h-7 w-7 place-items-center rounded-full border border-white/20 bg-black/50 text-white/80 opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
                    {isVideo(m.imagenUrl) ? <Play size={12} aria-hidden="true" /> : <Expand size={12} aria-hidden="true" />}
                  </span>
                </button>
              )}
            />
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
        {/* Las piezas se le pasan YA OPTIMIZADAS: el visor recibía la dirección del original
            y abría un JPEG de varios megas. Ver `piezasParaVisor` en `lib/imagen.js`. */}
        {abierto !== null && (
          <VisorDeFotos
            piezas={items}
            indice={abierto}
            onCerrar={() => setAbierto(null)}
            onCambiar={setAbierto}
          />
        )}
      </AnimatePresence>
    </Pagina>
  );
}
