import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock } from "lucide-react";

export default function AdminLogin({ onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const ok = onLogin(user, pass);
    if (!ok) setError("Usuario o contraseña incorrectos.");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-full border border-[#C9A84C]/30 flex items-center justify-center mx-auto mb-5">
            <Lock size={20} className="text-[#C9A84C]/70" />
          </div>
          <h1 className="text-white text-2xl font-light tracking-wide">Panel Admin</h1>
          <p className="text-white/30 text-sm mt-1">Jardines Club Hípico</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Usuario</label>
            <input
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 text-sm outline-none focus:border-[#C9A84C]/40"
              placeholder="admin"
            />
          </div>
          <div>
            <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Contraseña</label>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 text-sm outline-none focus:border-[#C9A84C]/40 pr-10"
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button type="submit" className="w-full bg-[#C9A84C] text-[#0a0a0a] py-3 font-medium text-sm tracking-wide hover:bg-[#d4b558] transition-colors mt-2">
            Ingresar
          </button>
        </form>

        <p className="text-white/15 text-xs text-center mt-8">
          Credenciales por defecto: admin / hipico2024
        </p>
      </motion.div>
    </div>
  );
}