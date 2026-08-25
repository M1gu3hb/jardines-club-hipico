import { useLocation } from 'react-router-dom';
import BarraNavegacion from '@/components/navegacion/BarraNavegacion';
import PieDeSitio from '@/components/navegacion/PieDeSitio';

/**
 * Layout — el marco común de todas las páginas públicas.
 *
 * Los estilos globales (Inter, tokens skeu, scrollbar) viven en `src/styles/theme.css`,
 * importado en `main.jsx`, porque también los necesitan pantallas que no pasan por aquí.
 *
 * ── Por qué la Home queda fuera del marco, DE MOMENTO ───────────────────────
 *
 * La Home todavía es la landing de una sola página: trae su propio `StaggeredMenu`, que va a
 * anclas internas, y un hero a pantalla completa. Montarle encima la barra del sitio pondría
 * DOS botones de menú en la misma esquina, cada uno con una idea distinta de qué es navegar.
 *
 * Se resuelve en la FASE 3, cuando la Home se convierta en distribuidor y sus secciones dejen
 * de ser el sitio entero para pasar a ser resúmenes que enlazan a las páginas de verdad.
 * Hasta entonces esto es una excepción **declarada y con fecha**, no un olvido.
 */
export default function Layout({ children }) {
  const { pathname } = useLocation();
  const esHome = pathname === '/';

  if (esHome) {
    return <div className="min-h-screen bg-[#0a0a0a]">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Salto directo al contenido. Quien navega con teclado no debería tener que pasar por
          los catorce enlaces del menú en CADA página para llegar a lo que vino a leer. */}
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-full focus:bg-[#C9A84C] focus:px-5 focus:py-2 focus:text-xs focus:font-medium focus:text-[#1a1408]"
      >
        Saltar al contenido
      </a>

      <BarraNavegacion />
      <main id="contenido" className="flex-1">{children}</main>
      <PieDeSitio />
    </div>
  );
}
