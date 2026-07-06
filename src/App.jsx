import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/api/authContext';
import RequireAdmin from '@/components/auth/RequireAdmin';
import Admin from '@/pages/Admin';
import PortalPage from '@/components/portal/PortalPage';
import AccesoPage from '@/components/meseros/AccesoPage';
import StaffPage from '@/components/meseros/StaffPage';
import InvitacionPublica from '@/components/invitacion/InvitacionPublica';
import { ADMIN_SLUG } from '@/config/portal';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

// El panel Admin NO se expone en su ruta por defecto (/Admin queda como 404).
// Solo vive tras el guard, en la ruta secreta ADMIN_SLUG.
const publicPages = Object.entries(Pages).filter(([path]) => path !== 'Admin');

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={
              <LayoutWrapper currentPageName={mainPageKey}>
                <MainPage />
              </LayoutWrapper>
            } />

            {/* Ruta secreta del admin (no adivinable, sin enlaces públicos). */}
            <Route path={`/${ADMIN_SLUG}`} element={
              <RequireAdmin>
                <Admin />
              </RequireAdmin>
            } />

            {/* Portal del cliente (login usuario/contraseña + secciones del evento). */}
            <Route path="/portal" element={<PortalPage />} />

            {/* Acceso por QR: pública en la RUTA, pero las RPCs exigen admin o
                staff con token válido. Sin token válido no se puede leer ni registrar. */}
            <Route path="/acceso/:token" element={<AccesoPage />} />

            {/* Vista de meseros por evento (link de staff, sin panel). */}
            <Route path="/staff/:token" element={<StaffPage />} />

            {/* Invitación digital pública para invitados (con RSVP). */}
            <Route path="/invitacion/:token" element={<InvitacionPublica />} />

            {publicPages.map(([path, Page]) => (
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
      </AuthProvider>
      <Toaster />
    </QueryClientProvider>
  )
}

export default App
