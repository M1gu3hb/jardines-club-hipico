import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Users, Sparkles } from 'lucide-react';
import { useServicios, useAmenidades } from '@/lib/datos';
import { rangoTexto, ETIQUETA_TIPO } from '@/lib/capacidad';
import { fotosDe } from '@/lib/servicios';
import { construyeRuta, rutaPorClave } from '@/rutas';
import TextoQueAparece from '@/components/animacion/TextoQueAparece';
import { EsqueletoTarjetas, AvisoCargando } from '@/components/ui/Esqueleto';

const SIN_FOTO = '/media/img/dGg8Xxh.jpg';

/**
 * RecomendadosDelEvento — «dónde se hace» y «qué le va bien», a lo ancho.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * POR QUÉ ESTO ES LA PARTE QUE CONVIERTE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Quien llega hasta el final de la página de su tipo de evento ya está convencido de que su
 * fiesta cabe aquí. Lo que le falta es **verlo**: en qué espacio concreto, y con qué.
 *
 * Antes esto vivía en la barra lateral, en miniaturas de 56 píxeles, y solo con los espacios.
 * El dueño lo pidió al revés: *«esa parte de los salones hazla más grande… y añade otro
 * recuadro de servicios y amenidades recomendadas para ese evento»*.
 *
 * ── Por qué las dos recomendaciones y no solo los espacios ──────────────────
 *
 * Porque son las dos mitades de la misma decisión, y el propio dueño lo explicó cuando pidió
 * las sugerencias del formulario: *«me ahorraría mucho tiempo en la negociación»*. Un cliente
 * que llega sabiendo que quiere el Salón Encanto **con** cámara 360 y mesa de dulces es una
 * conversación de diez minutos; uno que llega en blanco son tres llamadas.
 *
 * ── De dónde salen ──────────────────────────────────────────────────────────
 *
 * De `tipos_evento.espacios_recomendados` (slugs de `salones`) y de
 * `tipos_evento.servicios_relacionados` (títulos de `servicios` y `amenidades`). Las dos
 * listas las controla el dueño desde el panel.
 *
 * Se cruzan contra el catálogo real y **lo que no existe se descarta en silencio**: si alguien
 * renombra una amenidad, la recomendación desaparece en vez de enseñar una tarjeta vacía o
 * llevar a una página que no está. Prometer algo que no hay es peor que no recomendarlo.
 *
 * ── Y por qué la comparación normaliza acentos ──────────────────────────────
 *
 * Los títulos del catálogo llevan tildes y mayúsculas —«Cámara 360», «Área de bar»— y se
 * escriben a mano en dos sitios distintos. Comparar literalmente haría que un acento perdido
 * al teclear rompiera la recomendación sin que nadie se enterara.
 */

/** Quita acentos, espacios de sobra y mayúsculas para comparar títulos sin sorpresas. */
function normaliza(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export default function RecomendadosDelEvento({ tipo, espacios = [] }) {
  const { data: servicios, isLoading: cargaS } = useServicios();
  const { data: amenidades, isLoading: cargaA } = useAmenidades();

  const titulos = Array.isArray(tipo?.serviciosRelacionados) ? tipo.serviciosRelacionados : [];
  const cargando = cargaS || cargaA;

  // Se busca en las DOS tablas porque la separación entre «servicio» y «amenidad» es interna:
  // para quien contrata, la cámara 360 y la asesoría en decoración son la misma clase de cosa
  // —algo que se suma al evento— y separarlas aquí solo obligaría a mirar en dos sitios.
  const catalogo = [...(servicios || []), ...(amenidades || [])];
  const sugeridos = titulos
    .map((t) => catalogo.find((c) => normaliza(c.titulo) === normaliza(t)))
    .filter(Boolean);

  if (espacios.length === 0 && titulos.length === 0) return null;

  return (
    <div className="border-t border-white/5 bg-[#080808]">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-16 md:py-20">
        {/* ── DÓNDE SE HACE ─────────────────────────────────────────────── */}
        {espacios.length > 0 && (
          <section aria-labelledby="donde-se-hace">
            <div className="flex items-center gap-4">
              <span className="h-px w-10 bg-gradient-to-r from-[#C9A84C]/60 to-transparent" />
              <span className="text-[10px] font-light tracking-[0.32em] uppercase text-[#C9A84C]/75">
                Los espacios que le van
              </span>
            </div>

            <TextoQueAparece
              como="h2"
              texto="Dónde se hace"
              resalta="se hace"
              className="mt-4 block text-2xl font-extralight tracking-tight text-white/95 sm:text-4xl"
            />

            <p className="mt-4 max-w-2xl text-base font-light leading-relaxed text-white/50">
              No son todos los espacios del recinto: son los que mejor le quedan a un evento
              como el tuyo. Entra en cualquiera para verlo con fotos.
            </p>

            <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {espacios.map((s, i) => (
                <motion.li
                  key={s.id}
                  initial={{ opacity: 0, y: 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: Math.min(i * 0.07, 0.35) }}
                >
                  <Link
                    to={construyeRuta(rutaPorClave('espacio').ruta, s.slug)}
                    className="group skeu-card skeu-card-hover block h-full overflow-hidden rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/60"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-black/40">
                      <img
                        src={s.imagenPrincipal || SIN_FOTO}
                        alt=""
                        loading="lazy"
                        width="600"
                        height="375"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent"
                      />
                      <span className="absolute right-3 top-3 rounded-full border border-white/15 bg-black/60 px-2.5 py-1 text-[9px] font-light tracking-[0.14em] uppercase text-white/60 backdrop-blur-sm">
                        {ETIQUETA_TIPO[s.tipoEspacio] || 'Espacio'}
                      </span>
                      <div className="absolute inset-x-4 bottom-3">
                        <p className="text-lg font-light text-white transition-colors group-hover:text-[#C9A84C]">
                          {s.nombre}
                        </p>
                        {rangoTexto(s) && (
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs font-light text-white/55">
                            <Users size={11} aria-hidden="true" className="text-[#C9A84C]/70" />
                            {rangoTexto(s)} personas
                          </p>
                        )}
                      </div>
                    </div>

                    {s.descripcion && (
                      <p className="line-clamp-2 px-5 py-4 text-sm font-light leading-relaxed text-white/40">
                        {s.descripcion}
                      </p>
                    )}
                  </Link>
                </motion.li>
              ))}
            </ul>
          </section>
        )}

        {/* ── SERVICIOS Y AMENIDADES RECOMENDADOS ───────────────────────── */}
        {(sugeridos.length > 0 || cargando) && (
          <section aria-labelledby="que-sumar" className="mt-20">
            <div className="flex items-center gap-4">
              <span className="h-px w-10 bg-gradient-to-r from-[#C9A84C]/60 to-transparent" />
              <span className="text-[10px] font-light tracking-[0.32em] uppercase text-[#C9A84C]/75">
                Lo que suele acompañarlo
              </span>
            </div>

            <TextoQueAparece
              como="h2"
              texto="Servicios y amenidades recomendados"
              resalta="recomendados"
              className="mt-4 block text-2xl font-extralight tracking-tight text-white/95 sm:text-4xl"
            />

            <p className="mt-4 max-w-2xl text-base font-light leading-relaxed text-white/50">
              Van aparte de la renta y tienen precio fijo, así que contratas solo lo que
              quieras. Estos son los que más se piden para un evento como el tuyo.
            </p>

            {cargando ? (
              <div className="mt-10">
                <AvisoCargando que="las recomendaciones" />
                <EsqueletoTarjetas cuantas={6} columnas="sm:grid-cols-2 lg:grid-cols-3" />
              </div>
            ) : (
              <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sugeridos.map((item, i) => {
                  const foto = fotosDe(item)[0];
                  return (
                    <motion.li
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.45, delay: Math.min(i * 0.05, 0.3) }}
                      className="skeu-card flex items-center gap-4 overflow-hidden rounded-2xl p-3"
                    >
                      {foto ? (
                        <img
                          src={foto}
                          alt=""
                          loading="lazy"
                          width="88"
                          height="88"
                          className="h-20 w-20 shrink-0 rounded-xl object-cover"
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="grid h-20 w-20 shrink-0 place-items-center rounded-xl border border-[#C9A84C]/20 bg-[#C9A84C]/[0.06]"
                        >
                          <Sparkles size={18} className="text-[#C9A84C]/70" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-normal leading-snug text-white/85">
                          {item.titulo}
                        </p>
                        {item.descripcion && (
                          <p className="mt-1 line-clamp-2 text-xs font-light leading-relaxed text-white/40">
                            {item.descripcion}
                          </p>
                        )}
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            )}

            <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <Link
                to={`/cotizar?evento=${encodeURIComponent(tipo.slug)}`}
                className="skeu-gold-btn inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-xs font-medium tracking-[0.16em] uppercase text-[#1a1408]"
              >
                Cotizar con esto incluido
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
              <Link
                to="/amenidades"
                className="text-[11px] font-light tracking-[0.16em] uppercase text-[#C9A84C]/80 underline underline-offset-4 hover:text-[#C9A84C]"
              >
                Ver todas las amenidades
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
