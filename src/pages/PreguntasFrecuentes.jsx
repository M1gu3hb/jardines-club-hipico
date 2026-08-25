import { Link } from 'react-router-dom';
import Pagina from '@/components/navegacion/Pagina';
import { porTema, PREGUNTAS } from '@/data/preguntas';

/**
 * /preguntas-frecuentes — el índice completo, agrupado por tema.
 *
 * ── Por qué está abierta y no en acordeón ───────────────────────────────────
 *
 * En la portada el acordeón tiene sentido: la sección compite con todo lo demás y hay que
 * ocupar poco. Aquí el visitante VINO a leer preguntas. Esconderle las respuestas detrás de
 * nueve clics le hace trabajar para obtener lo que ya pidió.
 *
 * Y hay una razón de buscador: el `FAQPage` de abajo le dice a Google de qué va la página, y
 * Google puede enseñar estas preguntas directamente en resultados. Para eso el texto tiene
 * que estar en el HTML, no detrás de una interacción.
 */
export default function PreguntasFrecuentes() {
  const grupos = porTema();

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
      entradilla="Lo que más nos preguntan por WhatsApp, contestado aquí para que no tengas que preguntarlo."
      jsonLd={jsonLd}
    >
      <div className="mx-auto max-w-4xl px-5 sm:px-8 pb-16">
        <div className="space-y-16">
          {grupos.map((g) => (
            <section key={g.tema} aria-labelledby={`t-${g.tema}`}>
              <div className="flex items-center gap-4">
                <span className="h-px w-10 bg-gradient-to-r from-[#C9A84C]/60 to-transparent" />
                <h2
                  id={`t-${g.tema}`}
                  className="text-[10px] font-light tracking-[0.3em] uppercase text-[#C9A84C]/75"
                >
                  {g.tema}
                </h2>
              </div>

              <dl className="mt-6 divide-y divide-white/5 border-y border-white/5">
                {g.items.map((p) => (
                  <div key={p.q} className="py-6">
                    <dt className="text-base font-normal leading-snug text-white/90">{p.q}</dt>
                    <dd className="mt-3 text-sm font-light leading-[1.8] text-white/50">{p.a}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>

        <div className="skeu-card mt-16 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-light text-white/90">¿Tu duda no está aquí?</h2>
          <p className="mt-3 mx-auto max-w-md text-sm font-light leading-relaxed text-white/45">
            Pregúntanos directamente. Contestamos el mismo día y no hace falta que sepas
            todavía ni la fecha ni cuántos van a ser.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/cotizar"
              className="skeu-gold-btn w-full sm:w-auto rounded-full px-7 py-3.5 text-xs font-medium tracking-[0.16em] uppercase text-[#1a1408]"
            >
              Preguntar por mi evento
            </Link>
            <Link
              to="/contacto"
              className="skeu-dark-btn w-full sm:w-auto rounded-full px-7 py-3.5 text-xs font-medium tracking-[0.16em] uppercase"
            >
              Ver formas de contacto
            </Link>
          </div>
        </div>
      </div>
    </Pagina>
  );
}
