import { useParams, Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Pagina from '@/components/navegacion/Pagina';
import NoEncontrada from '@/pages/NoEncontrada';
import { useTipoEvento, useSalones } from '@/lib/datos';
import { construyeRuta, rutaPorClave } from '@/rutas';
import { rangoTexto } from '@/lib/capacidad';
import { urlAbsoluta } from '@/config/sitio';
import GaleriaEspacio from '@/components/espacios/GaleriaEspacio';

/**
 * /eventos/{slug} — la página de un tipo de evento.
 *
 * ── Es la plantilla más valiosa y hoy no la usa nadie ───────────────────────
 *
 * Estas son las páginas que capturan «salón para boda en Xochimilco», que es como busca la
 * gente de verdad. Nadie busca «Salón de los Espejos» sin conocerlo ya.
 *
 * Y hoy **ninguna se publica**, porque las seis filas de `tipos_evento` nacieron apagadas:
 * su contenido propio es de cero palabras. `useTipoEvento` solo devuelve las activas, así que
 * mientras tanto cualquier slug cae en el 404, que es lo correcto — mejor un 404 honesto que
 * una página con el texto de otra y las palabras cambiadas.
 *
 * La plantilla se construye ahora igualmente, porque el día que el dueño entregue el texto de
 * bodas y sus fotos, encender la fila en el panel publica la página entera. Sin tocar código
 * y sin esperar a nadie.
 */
export default function EventoDetalle() {
  const { slug } = useParams();
  const { data: tipo, isLoading, isError } = useTipoEvento(slug);
  const { data: salones } = useSalones();

  if (isLoading) {
    return <div className="min-h-[60vh] grid place-items-center text-sm font-light text-white/30">Cargando…</div>;
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-2xl px-5 pt-40 pb-24 text-center">
        <p className="text-sm font-light text-white/50">
          No pudimos cargar esta página ahora mismo.{' '}
          <Link to="/eventos" className="text-[#C9A84C] underline underline-offset-4">Ver los tipos de evento</Link>.
        </p>
      </div>
    );
  }

  if (!tipo) return <NoEncontrada />;

  const preguntas = Array.isArray(tipo.preguntas) ? tipo.preguntas : [];
  const galeria = Array.isArray(tipo.galeria) ? tipo.galeria : [];
  const slugsRecomendados = Array.isArray(tipo.espaciosRecomendados) ? tipo.espaciosRecomendados : [];

  // Se respeta el ORDEN de la lista guardada, no el de la tabla de salones: ese orden es un
  // criterio comercial —cuál se ofrece primero para este evento— y reordenarlo lo perdería.
  const recomendados = slugsRecomendados
    .map((s) => (salones || []).find((x) => x.slug === s))
    .filter(Boolean);

  /**
   * La imagen para compartir, cuando el tipo de evento no tiene la suya.
   *
   * Todavía no hay fotografías etiquetadas por tipo de evento —las 69 de la galería están sin
   * etiquetar— así que estas páginas no tienen foto propia. Sin ninguna, el enlace compartido
   * por WhatsApp sale como una línea de texto gris, que en la práctica es no compartirlo.
   *
   * Se usa la del PRIMER espacio recomendado. No es una foto de una boda: es una foto del
   * lugar donde se hacen, y la página la presenta como lo que es, un espacio. Enseñar el
   * recinto de verdad es honesto; buscar una foto de boda de banco de imágenes no lo sería.
   */
  const imagenCompartir = tipo.ogImage || tipo.imagenHero || recomendados[0]?.imagenPrincipal;

  const jsonLd = preguntas.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: preguntas.map((p) => ({
          '@type': 'Question',
          name: p.pregunta,
          acceptedAnswer: { '@type': 'Answer', text: p.respuesta },
        })),
      }
    : {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: tipo.nombre,
        url: urlAbsoluta(construyeRuta(rutaPorClave('evento').ruta, tipo.slug)),
      };

  return (
    <Pagina
      clave="evento"
      slug={tipo.slug}
      nombreFinal={tipo.nombre}
      titulo={tipo.seoTitle || `${tipo.nombre} en Xochimilco · Jardines Club Hípico`}
      descripcion={tipo.seoDescription || tipo.descripcionCorta}
      imagen={imagenCompartir}
      jsonLd={jsonLd}
      eyebrow="Tu evento, aquí"
      encabezado={tipo.nombre}
      entradilla={tipo.descripcionCorta}
    >
      {(tipo.imagenHero || galeria.length > 0) && (
        <GaleriaEspacio principal={tipo.imagenHero} imagenes={galeria} nombre={tipo.nombre} />
      )}

      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-14">
        <div className="grid gap-14 lg:grid-cols-[1.6fr_1fr]">
          <div className="min-w-0">
            {tipo.descripcionLarga && (
              <div className="space-y-4 text-base font-light leading-[1.85] text-white/60">
                {tipo.descripcionLarga.split(/\n\s*\n/).map((p, i) => (
                  <p key={i}>{p.trim()}</p>
                ))}
              </div>
            )}

            {preguntas.length > 0 && (
              <section aria-labelledby="dudas" className="mt-14">
                <h2 id="dudas" className="text-[10px] font-light tracking-[0.3em] uppercase text-[#C9A84C]/70">
                  Lo que más nos preguntan
                </h2>
                <dl className="mt-5 divide-y divide-white/5 border-y border-white/5">
                  {preguntas.map((p, i) => (
                    <div key={i} className="py-5">
                      <dt className="text-sm font-normal text-white/85">{p.pregunta}</dt>
                      <dd className="mt-2 text-sm font-light leading-relaxed text-white/45">{p.respuesta}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            {recomendados.length > 0 && (
              <section aria-labelledby="donde" className="skeu-card rounded-2xl p-6">
                <h2 id="donde" className="text-[10px] font-light tracking-[0.3em] uppercase text-[#C9A84C]/70">
                  Dónde se hace
                </h2>
                <ul className="mt-4 space-y-3">
                  {recomendados.map((s) => (
                    <li key={s.id}>
                      <Link
                        to={construyeRuta(rutaPorClave('espacio').ruta, s.slug)}
                        className="group flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/60 rounded-lg"
                      >
                        <img
                          src={s.imagenPrincipal || '/media/img/dGg8Xxh.jpg'}
                          alt=""
                          loading="lazy"
                          width="56"
                          height="56"
                          className="h-14 w-14 shrink-0 rounded-lg object-cover"
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-light text-white/85 transition-colors group-hover:text-[#C9A84C]">
                            {s.nombre}
                          </span>
                          {rangoTexto(s) && (
                            <span className="block text-xs font-light text-white/35">
                              {rangoTexto(s)} personas
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="skeu-card mt-5 rounded-2xl p-6">
              <p className="text-sm font-light leading-relaxed text-white/55">
                Dinos la fecha y cuántos son, y te decimos si está libre y cuánto sale.
              </p>
              <Link
                to={`/cotizar?evento=${encodeURIComponent(tipo.slug)}`}
                className="skeu-gold-btn mt-5 flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-xs font-medium tracking-[0.16em] uppercase text-[#1a1408]"
              >
                Cotizar {tipo.nombre.toLowerCase()}
                <ArrowRight size={13} aria-hidden="true" />
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </Pagina>
  );
}
