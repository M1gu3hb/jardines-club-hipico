import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/api/authContext";
import { base44 } from "@/api/base44Client";

export default function PortalLogin() {
  const { loginCliente } = useAuth();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);

  // Logo real del club (lectura pública del CMS).
  useEffect(() => {
    base44.entities.ConfigSitio.list()
      .then((c) => setLogoUrl(c?.[0]?.logoUrl || null))
      .catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      await loginCliente(usuario, password);
    } catch {
      setError("No reconocemos ese usuario o contraseña. Revísalos e intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-10">
          {logoUrl ? (
            <img src={logoUrl} alt="Jardines Club Hípico" className="h-16 w-auto object-contain mx-auto mb-6" />
          ) : (
            <div className="w-14 h-14 rounded-full border border-[#C9A84C]/40 flex items-center justify-center mx-auto mb-6">
              <span className="text-[#C9A84C] text-sm font-light tracking-widest">JCH</span>
            </div>
          )}
          <p className="portal-eyebrow mb-2">Jardines Club Hípico</p>
          <h1 className="text-white text-3xl font-thin tracking-wide">Tu evento te espera</h1>
          <div className="flex items-center justify-center gap-3 mt-4">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#C9A84C]/50" />
            <span className="text-white/35 text-xs">Entra con tu acceso personal</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#C9A84C]/50" />
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Usuario</label>
            <input
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 text-sm outline-none focus:border-[#C9A84C]/50 rounded-lg transition-colors"
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
                className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 text-sm outline-none focus:border-[#C9A84C]/50 pr-10 rounded-lg transition-colors"
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={cargando}
            className="skeu-gold-btn w-full py-3.5 font-medium text-sm tracking-wide mt-2 rounded-full disabled:opacity-50"
          >
            {cargando ? "Abriendo tu portal…" : "Entrar a mi evento"}
          </motion.button>
        </form>

        <p className="text-white/20 text-xs text-center mt-8 leading-relaxed">
          Tu usuario y contraseña te los entrega tu coordinador de Jardines Club Hípico.
          <br />¿No los tienes a la mano? Escríbenos y te ayudamos.
        </p>
      </motion.div>
    </div>
  );
}
