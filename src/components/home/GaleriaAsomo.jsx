import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import TextoQueAparece from '@/components/animacion/TextoQueAparece';
import { ArrowRight } from 'lucide-react';
import { useGaleria } from '@/lib/datos';
import { medidasDe } from '@/lib/medidas';
import { EsqueletoMosaico, AvisoCargando } from '@/components/ui/Esqueleto';
import Foto from '@/components/ui/Foto';
import { isVideo } from '@/components/MediaViewer';
import MosaicoJustificado from '@/components/galeria/MosaicoJustificado';

/**
 * GaleriaAsomo — un cacho de la galería, cortado con degradado.
 *
 * ── Lo que pidió el dueño, y por qué funciona ───────────────────────────────
 *
 * *«Recórtala a la mitad, y la mitad de abajo que se vea con blur, como que invita a
 * continuar. Agarra las principales, unas diez.»*
 *
 * Es un recurso viejo y bueno: **un corte limpio dice "esto es todo"; un corte difuminado dice
 * "hay más"**. Sesenta y nueve fotos en la portada aplastan el resto de la página; diez con el
 * borde deshecho hacen que se quiera ver el resto — y el resto está en su página, donde caben.
 *
 * ── Cuáles son «las principales» ────────────────────────────────────────────
 *
 * Las que el dueño puso primero. `galeria` tiene columna `orden` y él la controla desde el
 * panel, así que las diez primeras son literalmente las diez que él eligió enseñar primero.
 * Elegirlas yo por «cuál se ve mejor» sería sustituir su criterio por el mío sobre un recinto
 * que no conozco.
 *
 * Cuando las 69 piezas estén etiquetadas, `destacada` mandará sobre esto — está previsto en
 * `sec_32` y ya se lee aquí en cuanto exista.
 *
 * ── Los videos no entran en el asomo ────────────────────────────────────────
 *
 * Un video mudo y quieto dentro de un mosaico parece una foto que no cargó. En la galería
 * completa sí, con su botón de reproducir.
 */
export default function GaleriaAsomo() {
  const { data: medios, isLoading } = useGaleria();

  const fotos = (medios || []).filter((m) => m.imagenUrl && !isVideo(m.imagenUrl));
  if (!isLoading && fotos.length === 0) return null;

  // `destacada` manda en cuanto alguien la use; mientras tanto, el orden del panel.
  const destacadas = fotos.filter((m) => m.destacada);
  const asomo = (destacadas.length >= 6 ? destacadas : fotos).slice(0, 10);

  return (
    <section
      id="galeria"
      aria-label="Galería"
      className="w-full bg-[#080808] px-4 pt-20 sm:px-6 md:pt-28"
    >
      <div className="mx-auto w-full max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-12 text-center"
        >
          <div className="mb-5 flex items-center justify-center gap-3 sm:gap-4">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#C9A84C]/50 sm:w-16" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-[#C9A84C]/70 sm:text-xs sm:tracking-[0.35em]">
              El lugar, sin retoques
            </span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#C9A84C]/50 sm:w-16" />
          </div>

          <TextoQueAparece
            como="h2"
            texto="Míralo tú"
            resalta="tú"
            className="block text-3xl font-extralight tracking-tight text-white/95 sm:text-5xl"
          />
          <p className="mx-auto mt-5 max-w-xl text-sm font-light leading-relaxed text-white/45 sm:text-base">
            Ninguna de estas fotos es de banco de imágenes ni de otro lugar. Son de aquí.
          </p>
        </motion.div>
      </div>

      {/* EL CORTE. El contenedor recorta y el degradado deshace el borde de abajo, así que la
          última fila se disuelve en el fondo en vez de terminar en una línea recta. Es lo que
          convierte «se acabó» en «hay más». */}
      <div className="relative mx-auto w-full max-w-6xl">
        <div className="max-h-[26rem] overflow-hidden sm:max-h-[34rem]">
          {isLoading && (
            <>
              <AvisoCargando que="la galería" />
              <EsqueletoMosaico cuantas={8} />
            </>
          )}

          {/* Las mismas filas justificadas de `/galeria`, con el alto un poco menor porque
              esto es un asomo y no la galería entera. Ver `MosaicoJustificado`. */}
          {isLoading && (
            <>
              <AvisoCargando que="la galería" />
              <EsqueletoMosaico cuantas={8} />
            </>
          )}

          <MosaicoJustificado
            piezas={asomo}
            hueco={8}
            pinta={(m, i, tam) => {
              const med = medidasDe(m.imagenUrl);
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: Math.min(i * 0.05, 0.4) }}
                  style={{ width: tam.ancho, height: tam.alto, flex: '0 0 auto' }}
                  className="overflow-hidden rounded-xl bg-black/40"
                >
                  <Foto
                    url={m.imagenUrl}
                    alt={m.alt || ''}
                    prioridad={i < 3}
                    /* Ancho exacto, igual que en `/galeria`. Ver la nota de allí. */
                    sizes={`${Math.round(tam.ancho)}px`}
                    claseContenedor="h-full w-full"
                    className="h-full w-full object-cover"
                  />
                </motion.div>
              );
            }}
          />
        </div>

        {/* El degradado va POR ENCIMA y sin recibir clics, para no bloquear las fotos que
            todavía se ven enteras arriba. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#080808] via-[#080808]/85 to-transparent"
        />

        <div className="relative -mt-16 flex justify-center pb-20 sm:-mt-20">
          <Link
            to="/galeria"
            className="group inline-flex items-center gap-2.5 rounded-full border border-[#C9A84C]/30 bg-[#080808]/80 px-8 py-4 text-[11px] font-light tracking-[0.18em] uppercase text-[#C9A84C] backdrop-blur-sm transition-colors hover:border-[#C9A84C]/70 hover:bg-[#C9A84C]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/60"
          >
            Ver las {fotos.length} fotos
            <ArrowRight
              size={13}
              aria-hidden="true"
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
