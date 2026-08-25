import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RUTAS_MENU } from '@/rutas';

/**
 * BarraSuperior — la navegación horizontal de escritorio y tablet.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * POR QUÉ VUELVE UNA BARRA, Y POR QUÉ ESTA VEZ SIN QUITAR EL MENÚ
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Hubo una barra en el rediseño y el dueño la mandó retirar porque **sustituía** al menú
 * desplegable, que es parte del carácter del sitio. Ahora pidió lo contrario: *«ponle un
 * header de navegación para PC y tablet, pero no quites el menú que se despliega, déjalo»*.
 *
 * Las dos cosas juntas no se estorban, se reparten el trabajo:
 *
 *   · **La barra** enseña los seis destinos que mueven el negocio. En una pantalla ancha hay
 *     sitio de sobra y esconderlos detrás de un clic es cobrar un peaje por nada.
 *   · **El menú** sigue guardando el mapa completo —catorce entradas, el portal, los avisos— y
 *     es lo único que hay en un teléfono, donde una barra no cabe sin apretujarse.
 *
 * ── Seis y no catorce ───────────────────────────────────────────────────────
 *
 * Una barra con catorce enlaces no es navegación, es un índice: obliga a leerlo entero para
 * elegir. Seis se abarcan de una mirada. Los seis salen de lo que decide una contratación:
 * dónde cabe (Espacios), para qué evento (Eventos), qué se contrata (Servicios, Amenidades),
 * cómo se ve (Galería) y cómo hablar con alguien (Contacto).
 *
 * El resto no desaparece: está a un clic en el menú, y también en el pie.
 *
 * ── El indicador que se desliza ─────────────────────────────────────────────
 *
 * Es un solo elemento compartido con `layoutId`: cuando cambia de sitio, no desaparece de uno
 * y aparece en otro, sino que **viaja**. Eso hace dos cosas — se ve caro, y comunica que las
 * dos pestañas son parte de lo mismo en vez de dos cosas sueltas.
 *
 * Con `prefers-reduced-motion` el navegador no anima el desplazamiento y el indicador
 * simplemente aparece donde toca: sigue diciendo dónde estás.
 *
 * ── Por qué se compara por prefijo ──────────────────────────────────────────
 *
 * Estando en `/espacios/capilla` la pestaña que tiene que marcarse es «Espacios». Comparar por
 * igualdad dejaría toda la barra apagada en las páginas de detalle, que son justo donde más
 * falta hace saber en qué rama del sitio estás.
 */

/** Los seis destinos de la barra, por clave de `rutas.js`. El orden es el del recorrido. */
const EN_LA_BARRA = ['espacios', 'eventos', 'servicios', 'amenidades', 'galeria', 'contacto'];

export default function BarraSuperior() {
  const { pathname } = useLocation();

  // Se leen de `RUTAS_MENU` y no se escriben a mano: si una ruta cambia de dirección o de
  // nombre, la barra se entera sola. Es la misma fuente que el menú, el pie y el sitemap.
  const items = EN_LA_BARRA.map((clave) => RUTAS_MENU.find((r) => r.clave === clave)).filter(
    Boolean,
  );

  const activa = items.find((r) => pathname === r.ruta || pathname.startsWith(`${r.ruta}/`));

  return (
    <nav aria-label="Secciones principales" className="barra-superior">
      <ul className="flex items-center gap-1">
        {items.map((r) => {
          const esActiva = activa && activa.clave === r.clave;
          return (
            <li key={r.clave} className="relative">
              <Link
                to={r.ruta}
                aria-current={esActiva ? 'page' : undefined}
                className={`relative block rounded-full px-3.5 py-2 text-[11px] font-light tracking-[0.14em] uppercase transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/60 ${
                  esActiva ? 'text-[#C9A84C]' : 'text-white/55 hover:text-white/90'
                }`}
              >
                {esActiva && (
                  <motion.span
                    layoutId="barra-superior-activa"
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full border border-[#C9A84C]/30 bg-[#C9A84C]/[0.08]"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative">{r.nombre}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
