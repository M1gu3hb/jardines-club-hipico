import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { useAuth } from "@/api/authContext";

export default function PortalLogin() {
  const { loginCliente } = useAuth();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      await loginCliente(usuario, password);
    } catch {
      setError("Usuario o contraseña incorrectos.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-full border border-[#C9A84C]/30 flex items-center justify-center mx-auto mb-5">
            <KeyRound size={20} className="text-[#C9A84C]/70" />
          </div>
          <h1 className="text-white text-2xl font-light tracking-wide">Portal de tu evento</h1>
          <p className="text-white/30 text-sm mt-1">Jardines Club Hípico</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Usuario</label>
            <input
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              autoComplete="username"
              className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 text-sm outline-none focus:border-[#C9A84C]/40"
              placeholder="tu-usuario"
            />
          </div>
          <div>
            <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Contraseña</label>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 text-sm outline-none focus:border-[#C9A84C]/40 pr-10"
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button type="submit" disabled={cargando}
            className="w-full bg-[#C9A84C] text-[#0a0a0a] py-3 font-medium text-sm tracking-wide hover:bg-[#d4b558] transition-colors mt-2 disabled:opacity-50">
            {cargando ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="text-white/20 text-xs text-center mt-8">
          El acceso lo entrega Jardines Club Hípico. ¿Problemas para entrar? Contáctanos.
        </p>
      </motion.div>
    </div>
  );
}
