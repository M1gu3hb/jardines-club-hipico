import { motion } from "framer-motion";
import { Clock3, LogOut } from "lucide-react";
import { useAuth } from "@/api/authContext";

export default function PortalInactivo({ evento }) {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md text-center">
        <div className="w-16 h-16 rounded-full border border-[#C9A84C]/30 flex items-center justify-center mx-auto mb-6">
          <Clock3 size={24} className="text-[#C9A84C]/70" />
        </div>
        <h1 className="text-white text-2xl font-light">Tu portal está casi listo</h1>
        <p className="text-white/40 text-sm mt-3 leading-relaxed">
          El portal de <span className="text-[#C9A84C]/80">{evento.nombreEvento}</span> se activará en cuanto
          confirmemos tu anticipo. Te avisaremos cuando puedas entrar a organizar todos los detalles.
        </p>
        <button onClick={logout} className="mt-8 inline-flex items-center gap-2 text-white/30 hover:text-white/60 text-xs transition-colors">
          <LogOut size={14} /> Cerrar sesión
        </button>
      </motion.div>
    </div>
  );
}
