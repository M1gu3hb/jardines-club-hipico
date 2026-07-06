/**
 * PortalPage — orquesta el área del portal del evento (ruta `/portal`).
 * Decide qué mostrar según la sesión y el estado del evento:
 *  cargando → spinner · sin sesión cliente → login · sin evento → aviso ·
 *  portal inactivo → pantalla amable · si activo → portal completo.
 */
import { useAuth } from "@/api/authContext";
import PortalLogin from "./PortalLogin";
import PortalInactivo from "./PortalInactivo";
import PortalShell from "./PortalShell";

function Cargando() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4">
      <div className="w-8 h-8 rounded-full border-2 border-[#C9A84C]/30 border-t-[#C9A84C] animate-spin" />
      <p className="text-white/30 text-xs tracking-[0.25em] uppercase">Preparando tu evento…</p>
    </div>
  );
}

export default function PortalPage() {
  const { loading, user, isCliente, evento, logout, refrescar } = useAuth();

  if (loading) return <Cargando />;
  if (!user || !isCliente) return <PortalLogin />;

  if (!evento) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 text-center">
        <div className="max-w-sm">
          <p className="text-white/75 text-lg font-light">Tu cuenta aún no tiene un evento asignado.</p>
          <p className="text-white/35 text-sm mt-2">Escríbele a tu coordinador de Jardines Club Hípico y lo resolvemos enseguida.</p>
          <button onClick={logout} className="mt-6 text-[#C9A84C] text-sm border border-[#C9A84C]/30 px-4 py-2 rounded-full hover:bg-[#C9A84C]/10 transition-colors">
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  if (!evento.portalActivo) return <PortalInactivo evento={evento} />;

  return <PortalShell evento={evento} onRefresh={refrescar} />;
}
