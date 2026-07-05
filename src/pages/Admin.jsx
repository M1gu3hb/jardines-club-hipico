/**
 * Admin — Panel de administración.
 *
 * La autenticación y el rol se resuelven en el guard <RequireAdmin> (ver App.jsx),
 * montado en la ruta SECRETA (config `ADMIN_SLUG`). Aquí ya solo se renderiza el panel:
 * si este componente se muestra, es porque hay sesión con rol admin.
 */
import { useAuth } from "@/api/authContext";
import AdminDashboard from "@/components/admin/AdminDashboard";

export default function Admin() {
  const { logout } = useAuth();
  return <AdminDashboard onLogout={logout} />;
}
