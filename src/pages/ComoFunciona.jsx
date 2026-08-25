import { Link } from 'react-router-dom';
import Pagina from '@/components/navegacion/Pagina';
import ComoFuncionaSection from '@/components/ComoFunciona';
import { useServicios, useAmenidades } from '@/lib/datos';
import { reparte } from '@/lib/servicios';

/**
 * /como-funciona — de la duda a la fecha apartada.
 *
 * ── Qué hace esta página que no hacía la sección ────────────────────────────
 *
 * Los tres pasos ya existían en la portada y se reutilizan tal cual. Lo que aquí se añade es
 * lo que la portada no tenía sitio para contar: las políticas de la casa.
 *
 * «Flexibilidad de horarios según tu evento» estaba guardada como si fuera un servicio
 * contratable. No lo es: es una POLÍTICA, y su sitio es la página que explica cómo se
 * contrata. En el catálogo de servicios era ruido; aquí resuelve una duda real.
 *
 * ── Lo que falta y no se inventa ────────────────────────────────────────────
 *
 * Horarios exactos, anticipo, formas de pago y qué pasa si llueve. Son cuatro de las
 * preguntas que más se hacen antes de contratar y hoy no existen en ninguna parte del
 * sistema. Están pedidas en `rediseño-sitio-web/13-ENTREVISTA.md`, bloques B y G. Poner un
 * número aproximado aquí sería inventarle una política al negocio.
 */
export default function ComoFunciona() {
  const { data: servicios } = useServicios();
  const { data: amenidades } = useAmenidades();
  const { politicas } = reparte(servicios || [], amenidades || []);

  return (
    <Pagina
      clave="como-funciona"
      eyebrow="De la duda a la fecha"
      encabezado="Cómo se aparta"
      entradilla="Tres pasos. Ninguno te compromete hasta el último, y el último lo decides tú."
    >
      <ComoFuncionaSection />

      {politicas.length > 0 && (
        <section aria-labelledby="politicas" className="border-t border-white/5">
          <div className="mx-auto max-w-4xl px-5 sm:px-8 py-16">
            <h2 id="politicas" className="text-[10px] font-light tracking-[0.3em] uppercase text-[#C9A84C]/75">
              Cómo trabajamos
            </h2>
            <dl className="mt-6 divide-y divide-white/5 border-y border-white/5">
              {politicas.map((p) => (
                <div key={p.id} className="py-6">
                  <dt className="text-base font-normal text-white/90">{p.titulo || p.nombre}</dt>
                  {p.descripcion && (
                    <dd className="mt-2.5 text-sm font-light leading-[1.8] text-white/50">
                      {p.descripcion}
                    </dd>
                  )}
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}

      <section className="border-t border-white/5">
        <div className="mx-auto max-w-3xl px-5 sm:px-8 py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-extralight text-white/90">
            El paso que más pesa es verlo
          </h2>
          <p className="mt-4 text-sm font-light leading-relaxed text-white/45">
            Las fotos enseñan el lugar, pero caminar el jardín y ver dónde caben trescientas
            sillas es otra cosa. La visita no cuesta nada y no compromete a nada.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/cotizar"
              className="skeu-gold-btn w-full sm:w-auto rounded-full px-7 py-3.5 text-xs font-medium tracking-[0.16em] uppercase text-[#1a1408]"
            >
              Empezar
            </Link>
            <Link
              to="/espacios"
              className="skeu-dark-btn w-full sm:w-auto rounded-full px-7 py-3.5 text-xs font-medium tracking-[0.16em] uppercase"
            >
              Ver los espacios
            </Link>
          </div>
        </div>
      </section>
    </Pagina>
  );
}
