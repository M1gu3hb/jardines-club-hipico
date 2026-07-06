/**
 * authContext.jsx — Estado de sesión y rol para toda la app.
 *
 * Fuente de verdad: Supabase Auth (vía el shim `base44.auth`) + `perfiles.rol`.
 * - Admin: inicia con email + contraseña.
 * - Cliente: inicia con **usuario + contraseña** (sin correo); el email sintético se arma aquí.
 *
 * No guarda credenciales. Reacciona a cambios de sesión (login/logout/refresh de token).
 */
import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { usuarioAEmail } from "@/config/portal";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [evento, setEvento] = useState(null);
  // Id del usuario ya cargado: evita recargar (y desmontar la UI) cuando Supabase
  // re-emite SIGNED_IN / TOKEN_REFRESHED del MISMO usuario (p. ej. al volver a la pestaña).
  const userIdRef = useRef(null);

  // Carga perfil (rol) y, si es cliente, su evento. Depende del usuario actual de Auth.
  const cargarContexto = useCallback(async () => {
    try {
      const sesion = await base44.auth.session();
      userIdRef.current = sesion?.user?.id || null;
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
    // Re-cargar el contexto SOLO cuando el usuario realmente cambia (login/logout).
    // Supabase re-emite SIGNED_IN/TOKEN_REFRESHED del mismo usuario al volver a la
    // pestaña; recargar ahí desmontaba el portal y regresaba al cliente al inicio.
    // Se difiere con setTimeout(0) para no invocar consultas de Supabase DENTRO del
    // callback de onAuthStateChange (evita la reentrancia/deadlock de supabase-js v2).
    const unsub = base44.auth.onChange((session) => {
      const nuevoId = session?.user?.id || null;
      if (nuevoId === userIdRef.current) return;
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
