import { Link } from 'react-router-dom';
import { CalendarCheck, Clock, CreditCard, CloudRain, MessageCircle, Check } from 'lucide-react';
import Pagina from '@/components/navegacion/Pagina';
import BloqueTexto from '@/components/navegacion/BloqueTexto';
import ComoFuncionaSection from '@/components/ComoFunciona';
import { useServicios, useAmenidades } from '@/lib/datos';
import { reparte } from '@/lib/servicios';
import {
  INTRO, HORARIO, LA_VISITA, CONDICIONES_VISITA, APARTAR, PAGOS,
  SI_LLUEVE, PLANTA_DE_LUZ, QUIEN_ATIENDE,
} from '@/data/textos-como-funciona';

/**
 * /como-funciona — la operación real del negocio, escrita.
 *
 * ── Lo que esta página evita ────────────────────────────────────────────────
 *
 * Cinco conversaciones de WhatsApp al día. Cuánto dura un evento, si se puede visitar el
 * lugar, cómo se aparta una fecha, cómo se paga y qué pasa si llueve: **nada de eso existía en
 * ninguna parte del sitio**, y todo eso lo preguntan antes de decidir.
 *
 * ── El orden no es casual ───────────────────────────────────────────────────
 *
 * Va del hecho más neutro al compromiso mayor: primero cuánto dura, después ven a verlo, luego
 * cómo se aparta, después cómo se paga. Empezar por el dinero espanta a quien todavía está
 * mirando; dejarlo escondido al final hace perder tiempo a los dos.
 *
 * ── Una regla con motivo se acepta ──────────────────────────────────────────
 *
 * Por eso el bloque de apartar fecha no dice solo «hace falta anticipo»: dice por qué. Hay
 * socios que también rentan el lugar, así que sin dinero de por medio la fecha sigue libre. Es
 * la misma información, y la diferencia entre sonar arbitrario y sonar razonable.
 */
export default function ComoFunciona() {
  const { data: servicios } = useServicios();
  const { data: amenidades } = useAmenidades();
  const { politicas } = reparte(servicios || [], amenidades || []);

  return (
    <Pagina
      clave="como-funciona"
      eyebrow="De la duda a la fecha"
      encabezado="Cómo funciona"
      entradilla="Cuánto dura, cómo se conoce el lugar, cómo se aparta una fecha y cómo se paga. Sin letra chica."
    >
      <div className="mx-auto max-w-4xl px-5 sm:px-8">
        <div className="max-w-3xl space-y-4 text-lg font-light leading-[1.8] text-white/65">
          {INTRO.split(/\n\s*\n/).map((p, i) => (
            <p key={i}>{p.trim()}</p>
          ))}
        </div>
      </div>

      <ComoFuncionaSection />

      <div className="mx-auto max-w-4xl px-5 sm:px-8 divide-y divide-white/5">
        <BloqueTexto
          id="horario"
          eyebrow={<Clock size={12} />}
          titulo="Cuánto dura y qué incluye"
          texto={HORARIO}
        />

        <BloqueTexto id="la-visita" titulo="La visita" texto={LA_VISITA}>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {CONDICIONES_VISITA.map((c) => (
              <li key={c.titulo} className="skeu-card rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <Check size={14} className="mt-1 shrink-0 text-[#C9A84C]/70" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-normal text-white/85">{c.titulo}</p>
                    <p className="mt-1.5 text-sm font-light leading-relaxed text-white/45">{c.texto}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <Link
            to="/cotizar"
            className="skeu-gold-btn mt-7 inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-xs font-medium tracking-[0.16em] uppercase text-[#1a1408]"
          >
            <CalendarCheck size={14} aria-hidden="true" />
            Agendar mi visita
          </Link>
        </BloqueTexto>

        <BloqueTexto id="apartar" titulo="Cómo se aparta la fecha" texto={APARTAR} />

        <BloqueTexto
          id="pagos"
          eyebrow={<CreditCard size={12} />}
          titulo="Cómo se paga"
          texto={PAGOS}
        />

        {/* Si llueve, la respuesta cambia según el espacio. En tabla se compara de un vistazo;
            en prosa habría que leer tres párrafos para encontrar el propio. */}
        <section id="si-llueve" aria-labelledby="si-llueve-h" className="py-12 sm:py-16">
          <div className="flex items-center gap-4">
            <span className="h-px w-10 bg-gradient-to-r from-[#C9A84C]/60 to-transparent" />
            <CloudRain size={12} className="text-[#C9A84C]/75" aria-hidden="true" />
          </div>
          <h2 id="si-llueve-h" className="mt-5 text-2xl sm:text-4xl font-extralight tracking-tight text-white/95">
            ¿Y si llueve?
          </h2>
          <p className="mt-6 max-w-3xl text-base font-light leading-[1.85] text-white/60">
            Depende del espacio que elijas.
          </p>

          <ul className="mt-6 divide-y divide-white/5 border-y border-white/5">
            {SI_LLUEVE.map((x) => (
              <li key={x.espacio} className="py-5 sm:flex sm:gap-8">
                <Link
                  to={x.a}
                  className="block shrink-0 text-sm font-normal text-white/85 transition-colors hover:text-[#C9A84C] sm:w-56"
                >
                  {x.espacio}
                </Link>
                <p className="mt-1.5 text-sm font-light leading-relaxed text-white/50 sm:mt-0">
                  {x.respuesta}
                </p>
              </li>
            ))}
          </ul>

          <p className="mt-6 max-w-3xl text-sm font-light leading-relaxed text-white/45">
            {PLANTA_DE_LUZ}
          </p>
        </section>

        {politicas.length > 0 && (
          <section aria-labelledby="politicas" className="py-12 sm:py-16">
            <h2 id="politicas" className="text-[10px] font-light tracking-[0.3em] uppercase text-[#C9A84C]/75">
              Cómo trabajamos
            </h2>
            <dl className="mt-6 divide-y divide-white/5 border-y border-white/5">
              {politicas.map((p) => (
                <div key={p.id} className="py-5">
                  <dt className="text-base font-normal text-white/90">{p.titulo || p.nombre}</dt>
                  {p.descripcion && (
                    <dd className="mt-2 text-sm font-light leading-[1.8] text-white/50">{p.descripcion}</dd>
                  )}
                </div>
              ))}
            </dl>
          </section>
        )}

        <BloqueTexto
          id="quien-atiende"
          eyebrow={<MessageCircle size={12} />}
          titulo="Quién te contesta"
          texto={QUIEN_ATIENDE}
        />
      </div>

      <section className="border-t border-white/5">
        <div className="mx-auto max-w-3xl px-5 sm:px-8 py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-extralight text-white/90">
            El paso que más pesa es verlo
          </h2>
          <p className="mt-4 text-sm font-light leading-relaxed text-white/45">
            Son más de dos hectáreas. En fotos no se dimensiona, y por eso insistimos tanto en
            la visita: no cuesta nada y no compromete a nada.
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
