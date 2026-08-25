import { lazy, useMemo } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router } from 'react-router-dom';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Analytics } from '@vercel/analytics/react';
import { CARGADORES } from '@/paginas';
import ArbolDeRutas from '@/ArbolDeRutas';

/**
 * SITIO PÚBLICO — la entrada del navegador.
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
 * ── Qué queda aquí y qué se fue ─────────────────────────────────────────────
 *
 * Aquí solo vive lo que es EXCLUSIVO del navegador: el enrutador que lee la barra de
 * direcciones, los avisos flotantes y la medición. El árbol de páginas está en `Rutas.jsx`,
 * compartido con el prerender, para que el HTML del build y lo que ve el visitante no puedan
 * separarse en silencio.
 */

/**
 * Los componentes diferidos se construyen UNA vez.
 *
 * `lazy()` devuelve un componente nuevo en cada llamada, y React trata un componente nuevo
 * como otro componente distinto: desmontaría y volvería a montar la página entera en cada
 * render de `App`, perdiendo su estado. Fuera del componente no valdría —`CARGADORES` se lee
 * en el módulo— así que se memoiza sin dependencias, que es exactamente «una sola vez».
 */
function App() {
  const paginas = useMemo(
    () => Object.fromEntries(Object.entries(CARGADORES).map(([clave, carga]) => [clave, lazy(carga)])),
    [],
  );

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ArbolDeRutas paginas={paginas} />
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
