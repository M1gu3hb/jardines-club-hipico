import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Pagina from '@/components/navegacion/Pagina';
import Acordeon from '@/components/navegacion/Acordeon';
import { porTema, PREGUNTAS } from '@/data/preguntas';
import { useSalones } from '@/lib/datos';
import Foto from '@/components/ui/Foto';

/**
 * /preguntas-frecuentes — el índice completo, agrupado por tema.
 *
 * ── Cerradas, no abiertas ───────────────────────────────────────────────────
 *
 * La primera versión las enseñaba todas abiertas, por SEO: el texto tiene que estar en el HTML
 * para que Google lo lea y para que el `FAQPage` de abajo no prometa lo que la página no dice.
 *
 * El dueño lo vio y tenía razón: *«se siente muy invasivo y muchísimo texto»*. Veintiséis
 * respuestas abiertas de golpe son un muro que nadie lee.
 *
 * **Se puede tener las dos cosas.** `<details>` colapsa la respuesta visualmente pero la deja
 * en el documento: se indexa igual, se encuentra con Ctrl+F y el prerender la escribe entera.
 * Ver `src/components/navegacion/Acordeon.jsx`.
 *
 * ── Con imágenes del recinto ────────────────────────────────────────────────
 *
 * Una página de solo texto se siente muerta, y ésta tenía siete mil caracteres seguidos. Las
 * fotos salen de los ESPACIOS, no de la galería suelta: las de los espacios se sabe qué
 * enseñan, las 69 de la galería siguen sin etiquetar y poner una al azar sería decir «esto es
 * el recinto» sin saber qué es.
 */
export default function PreguntasFrecuentes() {
  const grupos = porTema();
  const { data: salones } = useSalones();

  // Una foto por grupo, de un espacio distinto cada vez. Rompe el muro de texto y de paso
  // enseña el lugar mientras alguien lee condiciones, que es cuando está decidiendo.
  const fotos = (salones || []).filter((s) => s.imagenPrincipal).slice(0, grupos.length);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: PREGUNTAS.map((p) => ({
      '@type': 'Question',
      name: p.q,
      acceptedAnswer: { '@type': 'Answer', text: p.a },
    })),
  };

  return (
    <Pagina
      clave="preguntas-frecuentes"
      eyebrow="Sin rodeos"
      encabezado="Preguntas frecuentes"
      acento="frecuentes"
      entradilla="Lo que más nos preguntan por WhatsApp, contestado aquí para que no tengas que preguntarlo."
      jsonLd={jsonLd}
    >
      <div className="mx-auto max-w-5xl px-5 sm:px-8 pb-16">
        <div className="space-y-16">
          {grupos.map((g, i) => (
            <motion.section
              key={g.tema}
              aria-labelledby={`t-${i}`}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6 }}
              className="grid gap-8 lg:grid-cols-[1fr_1.6fr] lg:gap-12"
            >
              <div className="lg:sticky lg:top-28 lg:self-start">
                <div className="flex items-center gap-4">
                  <span className="h-px w-8 bg-gradient-to-r from-[#C9A84C]/60 to-transparent" />
                  <span className="text-[10px] font-light tabular-nums text-[#C9A84C]/50">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>

                <h2 id={`t-${i}`} className="mt-4 text-2xl font-extralight tracking-tight text-white/95 sm:text-3xl">
                  {g.tema}
                </h2>

                <p className="mt-2 text-xs font-light tracking-[0.14em] uppercase text-white/30">
                  {g.items.length} {g.items.length === 1 ? 'pregunta' : 'preguntas'}
                </p>

                {fotos[i] && (
                  <figure className="mt-6 hidden lg:block">
                    <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-black/40">
                      <Foto
                        url={fotos[i].imagenPrincipal}
                        alt={fotos[i].nombre}
                        sizes="(min-width: 1024px) 25vw, 50vw"
                        claseContenedor="h-full w-full"
                        className="h-full w-full object-cover opacity-70 transition-opacity duration-500 hover:opacity-100"
                      />
                    </div>
                    <figcaption className="mt-2 text-[10px] font-light tracking-[0.16em] uppercase text-white/25">
                      {fotos[i].nombre}
                    </figcaption>
                  </figure>
                )}
              </div>

              <div className="border-t border-white/5">
                {g.items.map((p) => (
                  <Acordeon key={p.q} pregunta={p.q} respuesta={p.a} />
                ))}
              </div>
            </motion.section>
          ))}
        </div>

        <div className="skeu-card mt-20 rounded-3xl p-8 text-center sm:p-12">
          <h2 className="text-2xl font-extralight text-white/90 sm:text-3xl">
            ¿Tu duda no está aquí?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm font-light leading-relaxed text-white/45">
            Pregúntanos directamente. Contestamos el mismo día y no hace falta que sepas todavía
            ni la fecha ni cuántos van a ser.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/cotizar"
              className="skeu-gold-btn w-full rounded-full px-7 py-3.5 text-xs font-medium tracking-[0.16em] uppercase text-[#1a1408] sm:w-auto"
            >
              Preguntar por mi evento
            </Link>
            <Link
              to="/contacto"
              className="skeu-dark-btn w-full rounded-full px-7 py-3.5 text-xs font-medium tracking-[0.16em] uppercase sm:w-auto"
            >
              Ver formas de contacto
            </Link>
          </div>
        </div>
      </div>
    </Pagina>
  );
}
