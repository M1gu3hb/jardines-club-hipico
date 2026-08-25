import { lazy, Suspense } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Analytics } from '@vercel/analytics/react';
import { RUTAS } from '@/rutas';
import Layout from '@/Layout';
import Home from '@/pages/Home';
import NoEncontrada from '@/pages/NoEncontrada';

/**
 * SITIO PÚBLICO — aplicación independiente.
 *
 * Desde la FASE 6 de la independización este bundle NO contiene el panel de administración,
 * ni el portal del cliente, ni la vista de meseros, ni la ruta secreta del panel. Cada uno
 * vive en su repo. Antes el bundle público pesaba 1073 KB e incluía `AdminSolicitudes` y el
 * slug del panel: cualquier visitante se lo descargaba. Ese era el punto de la separación.
 *
 * `/portal` y `/invitacion/:token` NO desaparecieron: son redirects 301 en `vercel.json`,
 * servidos en el borde, para no tirar las señales que Google ya tenía en esas rutas. El
 * fragmento `#entrar=<token>` de un enlace mágico viejo sobrevive al salto, porque no viaja
 * al servidor.
 *
 * ── Qué cambió con el rediseño (FASE 2) ─────────────────────────────────────
 *
 * Antes había `pages.config.js` con un objeto de páginas y una sola entrada, `Home`. Era el
 * resto de cuando esto era una landing. Ahora **las rutas salen de `src/rutas.js`**, que es
 * el mismo archivo que leen el menú, las migas, el `sitemap.xml` y el prerender: así una
 * ruta nueva aparece en los cinco sitios a la vez o no aparece en ninguno.
 *
 * ── Por qué `Home` NO es diferida y las demás sí ────────────────────────────
 *
 * `Home` es la entrada de la mayoría de las visitas. Diferirla añadiría una ida y vuelta de
 * red justo antes de pintar lo primero que se ve, empeorando el LCP en la única página donde
 * más duele. Las demás se cargan solas al navegar, que es cuando ya hay atención de sobra.
 *
 * `NoEncontrada` tampoco se difiere: pesa poco y diferir la pantalla de error significa
 * pedirle a la red un trozo más justo cuando algo ya salió mal.
 */
const PAGINAS = {
  espacios: lazy(() => import('@/pages/Espacios')),
  espacio: lazy(() => import('@/pages/EspacioDetalle')),
  eventos: lazy(() => import('@/pages/Eventos')),
  evento: lazy(() => import('@/pages/EventoDetalle')),
  servicios: lazy(() => import('@/pages/Servicios')),
  amenidades: lazy(() => import('@/pages/Amenidades')),
  galeria: lazy(() => import('@/pages/Galeria')),
  'como-funciona': lazy(() => import('@/pages/ComoFunciona')),
  'preguntas-frecuentes': lazy(() => import('@/pages/PreguntasFrecuentes')),
  ubicacion: lazy(() => import('@/pages/Ubicacion')),
  contacto: lazy(() => import('@/pages/Contacto')),
  cotizar: lazy(() => import('@/pages/Cotizar')),
  nosotros: lazy(() => import('@/pages/Nosotros')),
};

/**
 * Lo que se ve mientras llega el trozo de una página.
 *
 * Deliberadamente sobrio y del color del fondo: un esqueleto animado o un spinner grande
 * llamarían la atención sobre la espera en vez de sobre el contenido, y en una conexión
 * decente esto dura menos de lo que tarda el ojo en enfocarlo.
 */
const Cargando = () => (
  <div className="min-h-[60vh] grid place-items-center" role="status" aria-live="polite">
    <span className="sr-only">Cargando</span>
    <span className="h-1 w-16 rounded-full bg-gradient-to-r from-transparent via-[#C9A84C]/50 to-transparent animate-pulse" />
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Layout>
            <Suspense fallback={<Cargando />}>
              <Routes>
                <Route path="/" element={<Home />} />

                {RUTAS.filter((r) => r.clave !== 'home').map((r) => {
                  const Pagina = PAGINAS[r.clave];
                  if (!Pagina) return null;
                  return <Route key={r.clave} path={r.ruta} element={<Pagina />} />;
                })}

                <Route path="*" element={<NoEncontrada />} />
              </Routes>
            </Suspense>
          </Layout>
        </Router>
        <Toaster />
        {/* MEDICION. Hasta el rediseño el sitio no medía NADA: sin línea base no hay forma de
            saber si sirvió. Va al mismo origen (`/_vercel/insights/*`), así que la CSP actual
            —`script-src 'self'`, `connect-src 'self'`— ya lo cubre y no hay que abrirla.
            Falta encenderla en el panel de Vercel para que empiece a registrar. */}
        <Analytics />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
