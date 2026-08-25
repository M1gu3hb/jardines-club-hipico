import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

/**
 * VerTodo — el enlace que convierte una sección de la portada en la puerta de una página.
 *
 * ── Por qué existe como pieza propia ────────────────────────────────────────
 *
 * Porque es lo que hace que la Home sea un DISTRIBUIDOR y no un catálogo. Cada sección de la
 * portada enseña una muestra y manda a la página que tiene el asunto entero. Sin este enlace,
 * la muestra se lee como «esto es todo lo que hay», que es justo lo contrario de lo que se
 * quiere: el sitio tiene ahora mucha más información, y la portada tiene que insinuarlo.
 *
 * Repetido a mano en ocho secciones acabaría con ocho redacciones distintas y tres olvidado.
 */
export default function VerTodo({ a, children, alineado = 'center' }) {
  return (
    <div className={alineado === 'center' ? 'mt-12 text-center' : 'mt-10'}>
      <Link
        to={a}
        className="group inline-flex items-center gap-2.5 rounded-full border border-[#C9A84C]/25 px-7 py-3 text-[11px] font-light tracking-[0.18em] uppercase text-[#C9A84C] transition-colors hover:border-[#C9A84C]/60 hover:bg-[#C9A84C]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/60"
      >
        {children}
        <ArrowRight
          size={13}
          aria-hidden="true"
          className="transition-transform duration-300 group-hover:translate-x-1"
        />
      </Link>
    </div>
  );
}
