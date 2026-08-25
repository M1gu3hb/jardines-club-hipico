import { Link } from 'react-router-dom';
import { MessageCircle, Music4 } from 'lucide-react';
import Pagina from '@/components/navegacion/Pagina';
import { WHATSAPP } from '@/config/negocio';

/**
 * /clases-de-baile — anunciada, y honesta sobre lo que todavía no se sabe.
 *
 * ── Qué es cierto y qué no ──────────────────────────────────────────────────
 *
 * Cierto: va a abrir una academia de baile en el Salón de los Espejos, hay profesores y hay
 * logística. Lo dijo el dueño el 2026-08-24.
 *
 * **Todavía no se sabe:** horarios, precios, fechas de arranque, ni cómo se apunta uno. Nada de
 * eso se inventa aquí, y por eso esta página es corta: dice lo que hay, dice lo que falta y
 * ofrece la única vía que sí existe, que es preguntar.
 *
 * ── Por qué existe ya, si está a medias ─────────────────────────────────────
 *
 * Porque el dueño pidió el item en el menú desde ahora. Y tiene sentido: quien lo vea y le
 * interese va a escribir, y esos mensajes son exactamente lo que hace falta para decidir
 * horarios. Una lista de interesados antes de abrir vale más que un anuncio perfecto después.
 *
 * ── `indexable: false` mientras no haya horarios ────────────────────────────
 *
 * Está en `rutas.js`. Una página que anuncia clases sin decir cuándo ni cómo apuntarse genera
 * preguntas que nadie puede contestar, y en resultados de búsqueda competiría con el resto del
 * sitio sin aportar nada. El día que haya horarios se quita esa línea y entra sola.
 */
export default function ClasesDeBaile() {
  const waHref = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
    'Hola, me interesan las clases de baile. ¿Me avisan cuando abran?',
  )}`;

  return (
    <Pagina
      clave="clases-de-baile"
      eyebrow="Próximamente"
      encabezado="Clases de baile"
      acento="de baile"
      entradilla="Vamos a abrir una academia de baile en el Salón de los Espejos."
    >
      <div className="mx-auto max-w-3xl px-5 sm:px-8 pb-20">
        <div className="skeu-card rounded-3xl p-8 sm:p-12">
          <Music4 size={26} className="text-[#C9A84C]/70" aria-hidden="true" />

          <div className="mt-6 space-y-4 text-base font-light leading-[1.85] text-white/60">
            <p>
              Ya hay profesores y ya está armada la logística. El salón es el de los Espejos,
              que es el principal del recinto: cerrado, con pista de baile amplia, escenario e
              iluminación ambiental.
            </p>
            <p>
              Lo que todavía no tenemos cerrado son los <strong className="font-normal text-white/85">horarios</strong>,
              los <strong className="font-normal text-white/85">precios</strong> y la fecha de
              arranque. Y preferimos no publicarlos hasta tenerlos, porque un horario que
              después cambia es peor que no haberlo dicho.
            </p>
            <p>
              Si te interesa, escríbenos y te avisamos en cuanto abramos. Saber cuánta gente
              está esperando es justo lo que nos ayuda a decidir los horarios.
            </p>
          </div>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="skeu-gold-btn inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-xs font-medium tracking-[0.16em] uppercase text-[#1a1408]"
            >
              <MessageCircle size={14} aria-hidden="true" />
              Avísenme cuando abran
            </a>
            <Link
              to="/espacios/salon-de-los-espejos"
              className="skeu-dark-btn inline-flex items-center justify-center rounded-full px-7 py-3.5 text-xs font-medium tracking-[0.16em] uppercase"
            >
              Ver el salón
            </Link>
          </div>
        </div>

        <p className="mt-8 text-center text-sm font-light text-white/35">
          Mientras tanto, el salón se renta para{' '}
          <Link to="/eventos" className="text-[#C9A84C] underline underline-offset-4">
            todo tipo de eventos
          </Link>
          .
        </p>
      </div>
    </Pagina>
  );
}
