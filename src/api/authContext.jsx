/**
 * authContext.jsx — Estado de sesión y rol para toda la app.
 *
 * Fuente de verdad: Supabase Auth (vía el shim `base44.auth`) + `perfiles.rol`.
 * - Admin: inicia con email + contraseña.
 * - Cliente: inicia con **usuario + contraseña** (sin correo); el email sintético se arma aquí.
 *
 * No guarda credenciales. Reacciona a cambios de sesión (login/logout/refresh de token).
 */
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { usuarioAEmail } from "@/config/portal";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [evento, setEvento] = useState(null);

  // Carga perfil (rol) y, si es cliente, su evento. Depende del usuario actual de Auth.
  const cargarContexto = useCallback(async () => {
    try {
      const sesion = await base44.auth.session();
      if (!sesion?.user) {
        setUser(null);
        setPerfil(null);
        setEvento(null);
        return;
      }
      setUser(sesion.user);
      const p = await base44.auth.perfil();
      setPerfil(p);
      if (p?.rol === "cliente") {
        const evs = await base44.entities.Evento.filter({ authUserId: sesion.user.id });
        setEvento(Array.isArray(evs) ? evs[0] || null : null);
      } else {
        setEvento(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarContexto();
    // Re-cargar el contexto cuando cambie la sesión (login/logout en otra pestaña, refresh).
    // Se difiere con setTimeout(0) para no invocar consultas de Supabase DENTRO del callback
    // de onAuthStateChange (evita la reentrancia/deadlock del lock de auth en supabase-js v2).
    const unsub = base44.auth.onChange(() => {
      setLoading(true);
      setTimeout(() => cargarContexto(), 0);
    });
    return unsub;
  }, [cargarContexto]);

  const loginAdmin = useCallback(async (email, password) => {
    await base44.auth.loginEmail(email, password);
    // onChange dispara cargarContexto; devolvemos para que el caller sepa que fue ok.
    return true;
  }, []);

  const loginCliente = useCallback(async (usuario, password) => {
    const email = usuarioAEmail(usuario);
    await base44.auth.loginEmail(email, password);
    return true;
  }, []);

  const logout = useCallback(async () => {
    await base44.auth.logout();
    setUser(null);
    setPerfil(null);
    setEvento(null);
  }, []);

  const value = {
    loading,
    user,
    perfil,
    evento,
    rol: perfil?.rol || null,
    isAdmin: perfil?.rol === "admin",
    isCliente: perfil?.rol === "cliente",
    loginAdmin,
    loginCliente,
    logout,
    refrescar: cargarContexto,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
