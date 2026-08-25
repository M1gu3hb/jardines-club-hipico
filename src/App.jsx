import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Analytics } from '@vercel/analytics/react';

/**
 * SITIO PÚBLICO — aplicación independiente.
 *
 * Desde la FASE 6 este bundle NO contiene el panel de administración, ni el portal del
 * cliente, ni la vista de meseros, ni la ruta secreta del panel. Cada uno vive en su repo.
 *
 * Lo que había antes aquí y por qué importaba: el bundle público pesaba 1073 KB e incluía
 * `AdminSolicitudes`, la referencia a `eliminar-evento` y el slug de la ruta del panel.
 * Cualquier visitante del sitio se lo descargaba. Ese era el punto entero de la separación.
 *
 * `/portal` y `/invitacion/:token` NO desaparecieron: desde la FASE 4 son redirects 301 en
 * `vercel.json`, servidos en el borde, para no tirar las señales que Google ya tenía. El
 * fragmento `#entrar=<token>` de un enlace mágico viejo sobrevive al salto, porque no viaja
 * al servidor.
 *
 * Y ya no hay AuthProvider: el sitio público dejó de arrastrar código de autenticación
 * cuando la FASE 1 retiró el auto-redirect al portal (acoplamiento A7).
 */
const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

function App() {
  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <Routes>
          <Route path="/" element={
            <LayoutWrapper currentPageName={mainPageKey}>
              <MainPage />
            </LayoutWrapper>
          } />

          {Object.entries(Pages).map(([path, Page]) => (
            <Route
              key={path}
              path={`/${path}`}
              element={
                <LayoutWrapper currentPageName={path}>
                  <Page />
                </LayoutWrapper>
              }
            />
          ))}
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Router>
      <Toaster />
      {/* MEDICION. Hasta hoy el sitio no medía NADA: sin línea base no hay forma de saber
          si el rediseño sirvió. Va al mismo origen (`/_vercel/insights/*`), así que la CSP
          actual —`script-src 'self'`, `connect-src 'self'`— ya lo cubre y no hay que
          abrirla. Falta encenderla en el panel de Vercel para que empiece a registrar. */}
      <Analytics />
    </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
