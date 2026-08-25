import { Plus } from 'lucide-react';

/**
 * Acordeón — una pregunta que se abre, sin sacar el texto del documento.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * POR QUÉ `<details>` Y NO UN ESTADO DE REACT
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Aquí había dos exigencias que parecían chocar:
 *
 *   · El dueño: *«tener todas abiertas se siente muy invasivo y muchísimo texto. Que se pueda
 *     abrir cada una.»* Tiene razón: veintiséis respuestas abiertas de golpe es un muro.
 *   · El buscador: si el texto no está en el HTML, Google no lo lee, y el `FAQPage` de datos
 *     estructurados estaría prometiendo unas respuestas que la página no contiene.
 *
 * Un acordeón hecho con `useState` cumple la primera y rompe la segunda: el contenido cerrado
 * **no existe en el documento**, ni para el rastreador ni para el prerender.
 *
 * `<details>` cumple las dos. El texto está SIEMPRE en el HTML —solo que colapsado por el
 * navegador— así que se indexa igual, se puede buscar con Ctrl+F, y el prerender lo escribe
 * entero. Además trae gratis el teclado, el `aria-expanded` y el foco, que en una versión a
 * mano hay que acordarse de poner y casi nunca se pone bien.
 *
 * ── Y por qué NO se cierran unas a otras ────────────────────────────────────
 *
 * Un acordeón que cierra la anterior al abrir una nueva impide comparar dos respuestas, y en
 * preguntas de contratación —horarios y pagos, por ejemplo— comparar es justo lo que se quiere
 * hacer. Se abren las que hagan falta.
 */
export default function Acordeon({ pregunta, respuesta }) {
  return (
    <details className="group border-b border-white/5">
      <summary
        className="flex cursor-pointer list-none items-start gap-4 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/60 rounded-sm"
      >
        {/* El icono gira en vez de cambiar de forma: un giro es una sola propiedad animada
            (`transform`) y no obliga al navegador a recalcular el diseño en cada fotograma. */}
        <Plus
          size={16}
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-[#C9A84C]/60 transition-transform duration-300 group-open:rotate-45"
        />
        <span className="flex-1 text-base font-normal leading-snug text-white/85 transition-colors group-hover:text-white">
          {pregunta}
        </span>
      </summary>

      {/* La animación va en un envoltorio interior: `<details>` no admite transición sobre su
          propia altura, pero sí sobre la de un hijo con `grid-template-rows`. */}
      <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-out group-open:grid-rows-[1fr] motion-reduce:transition-none">
        <div className="overflow-hidden">
          <p className="pb-6 pl-8 pr-2 text-sm font-light leading-[1.8] text-white/50">
            {respuesta}
          </p>
        </div>
      </div>
    </details>
  );
}
