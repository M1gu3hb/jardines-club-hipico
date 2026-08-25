import BarraNavegacion from '@/components/navegacion/BarraNavegacion';
import PieDeSitio from '@/components/navegacion/PieDeSitio';

/**
 * Layout — el marco común de todas las páginas públicas.
 *
 * Los estilos globales (Inter, tokens skeu, scrollbar) viven en `src/styles/theme.css`,
 * importado en `main.jsx`, porque también los necesitan pantallas que no pasan por aquí.
 *
 * ── UNA SOLA NAVEGACIÓN, TAMBIÉN EN LA PORTADA ──────────────────────────────
 *
 * Durante la FASE 2 la Home quedó fuera de este marco, porque traía su propio menú
 * (`StaggeredMenu`) y montarle encima la barra del sitio ponía dos botones de menú en la misma
 * esquina, cada uno con una idea distinta de qué es navegar.
 *
 * La FASE 3 lo resuelve por el lado correcto: **la barra del sitio también gobierna la
 * portada.** El motivo no es de gusto. El sitio pasó de tener una dirección a tener catorce, y
 * un menú de hamburguesa las esconde todas detrás de un clic. En escritorio, una navegación
 * visible es la diferencia entre que alguien descubra que existe `/espacios` o no lo descubra
 * nunca — y el encargo entero va de que haya MUCHA más información disponible.
 *
 * El hero no se toca: la barra es transparente arriba y solo se vuelve sólida al bajar, así
 * que los videos siguen entrando a pantalla completa como estaban.
 *
 * `StaggeredMenu` se queda en el repositorio, sin usar, hasta que el dueño decida. Es una
 * pieza con carácter y retirarla es una decisión suya, no mía.
 */
export default function Layout({ children }) {
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
