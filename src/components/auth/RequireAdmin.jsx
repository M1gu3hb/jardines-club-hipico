/**
 * RequireAdmin — Guard de la ruta secreta del admin.
 *
 * Estados:
 *  - cargando  → spinner
 *  - sin sesión → formulario de login (email admin + contraseña)
 *  - con sesión pero rol != admin → acceso denegado (con opción de salir)
 *  - admin      → renderiza el panel
 *
 * La seguridad real la impone RLS en Supabase; esto solo controla la UI.
 */
import { useAuth } from "@/api/authContext";
import AdminLogin from "@/components/admin/AdminLogin";

function Cargando() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[#C9A84C]/30 border-t-[#C9A84C] animate-spin" />
    </div>
  );
}

export default function RequireAdmin({ children }) {
  const { loading, user, isAdmin, loginAdmin, logout } = useAuth();

  if (loading) return <Cargando />;

  if (user && !isAdmin) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 text-center">
        <div>
          <p className="text-white text-lg font-light">Esta cuenta no tiene acceso al panel.</p>
          <button
            onClick={logout}
            className="mt-5 text-[#C9A84C] text-sm border border-[#C9A84C]/30 px-4 py-2 hover:bg-[#C9A84C]/10 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <AdminLogin
        onLogin={loginAdmin}
        userLabel="Correo"
        userPlaceholder="tu-correo@dominio.com"
        userType="email"
      />
    );
  }

  return children;
}
