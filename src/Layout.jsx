import MenuDelSitio from '@/components/navegacion/MenuDelSitio';
import PieDeSitio from '@/components/navegacion/PieDeSitio';

/**
 * Layout — el marco común de todas las páginas públicas.
 *
 * Los estilos globales (Inter, tokens skeu, scrollbar) viven en `src/styles/theme.css`,
 * importado en `main.jsx`, porque también los necesitan pantallas que no pasan por aquí.
 *
 * ── Una sola navegación, y es la de siempre ─────────────────────────────────
 *
 * `MenuDelSitio` envuelve al `StaggeredMenu` de toda la vida —el que entra deslizándose por el
 * lateral— y lo alimenta desde `rutas.js`. Antes llevaba a anclas de la portada; ahora lleva a
 * las rutas del sitio, así que una ruta nueva aparece en el menú sola.
 *
 * Durante la FASE 3 lo sustituí por una barra horizontal y fue un error: el argumento de
 * usabilidad era cierto, pero esa animación es parte del carácter del sitio, y un recinto de
 * eventos se vende por cómo se siente. El dueño lo pidió de vuelta y tenía razón.
 *
 * Lo que sí se conservó del intento anterior es lo que resolvía problemas de verdad: el botón
 * de cotizar y el interruptor de sonido viven FUERA del menú, en la cabecera, visibles sin
 * abrir nada.
 *
 * ── El hero no se toca ──────────────────────────────────────────────────────
 *
 * El menú es un overlay fijo, así que los videos siguen entrando a pantalla completa como
 * estaban (N1).
 */
export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Salto directo al contenido. Quien navega con teclado no debería tener que pasar por
          los quince enlaces del menú en CADA página para llegar a lo que vino a leer. */}
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-full focus:bg-[#C9A84C] focus:px-5 focus:py-2 focus:text-xs focus:font-medium focus:text-[#1a1408]"
      >
        Saltar al contenido
      </a>

      <MenuDelSitio />
      <main id="contenido" className="flex-1 w-full min-w-0">{children}</main>
      <PieDeSitio />
    </div>
  );
}
