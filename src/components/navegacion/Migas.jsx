import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { migasDe } from '@/rutas';
import { urlAbsoluta } from '@/config/sitio';

/**
 * Migas — el rastro de dónde estás, y de dónde cuelga.
 *
 * ── Para qué sirve de verdad ────────────────────────────────────────────────
 *
 * No es decoración. Cumple dos funciones que no se solapan:
 *
 * 1. **Para quien llega desde Google a una página interior.** Alguien que busca «salón para
 *    300 personas Xochimilco» puede aterrizar directamente en `/espacios/salon-encanto` sin
 *    haber visto nunca la portada. Sin migas no tiene forma de saber que hay otros siete
 *    espacios, y la única salida es el botón de atrás — o sea, irse.
 *
 * 2. **Para Google.** El `BreadcrumbList` en JSON-LD hace que en los resultados aparezca
 *    `jardines… › Espacios › Salón Encanto` en vez de la URL cruda. Es más ancho, más claro
 *    y se hace clic más.
 *
 * ── Detalle que importa ─────────────────────────────────────────────────────
 *
 * El último eslabón NO es un enlace: enlazar a la página en la que ya estás es ruido para
 * quien navega con teclado o lector de pantalla. Va como `<span aria-current="page">`.
 */
export default function Migas({ clave, nombreFinal }) {
  const cadena = migasDe(clave);
  if (cadena.length < 2) return null;

  // El nombre de una ficha sale de la base (el salón, el tipo de evento), no de `rutas.js`,
  // que solo conoce la plantilla `/espacios/:slug` y su nombre genérico.
  const eslabones = cadena.map((r, i) =>
    i === cadena.length - 1 && nombreFinal ? { ...r, nombre: nombreFinal } : r,
  );

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: eslabones.map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: r.nombre,
      item: urlAbsoluta(r.ruta.includes(':slug') ? r.ruta.replace(':slug', '') : r.ruta),
    })),
  };

  return (
    <nav aria-label="Ruta de navegación" className="mx-auto max-w-7xl px-5 sm:px-8 pt-24 sm:pt-28">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ol className="flex flex-wrap items-center gap-1 text-[10px] font-light tracking-[0.18em] uppercase">
        {eslabones.map((r, i) => {
          const ultimo = i === eslabones.length - 1;
          return (
            <li key={r.clave} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={11} className="text-[#C9A84C]/35" aria-hidden="true" />}
              {ultimo ? (
                <span className="text-[#C9A84C]" aria-current="page">{r.nombre}</span>
              ) : (
                <Link
                  to={r.ruta}
                  className="text-white/40 transition-colors hover:text-white/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/60 rounded-sm"
                >
                  {r.nombre}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
