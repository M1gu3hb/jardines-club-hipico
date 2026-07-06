import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Calendar, MapPin, Shirt, Loader2, CheckCircle2, Users, Heart, PartyPopper } from "lucide-react";
import { fechaLarga } from "@/lib/fechas";

/**
 * InvitacionPublica — invitación digital que el cliente comparte con sus invitados.
 * Ruta pública /invitacion/<token>. Solo muestra datos SEGUROS (nombre, fecha, salón,
 * mensaje, dress code) vía RPC — NUNCA dinero ni contacto privado. Incluye RSVP.
 */
export default function InvitacionPublica() {
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  const [nombre, setNombre] = useState("");
  const [personas, setPersonas] = useState(1);
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [errRsvp, setErrRsvp] = useState("");

  useEffect(() => {
    base44.rpc("info_invitacion_publica", { p_token: token })
      .then((d) => setInfo(d))
      .catch((e) => setError(/no disponible|no encontrada|inactiva/i.test(e.message || "")
        ? "Esta invitación no está disponible por ahora."
        : (e.message || "No se pudo cargar la invitación.")))
      .finally(() => setCargando(false));
  }, [token]);

  const enviar = async () => {
    if (!nombre.trim()) { setErrRsvp("Escribe tu nombre."); return; }
    setErrRsvp("");
    setEnviando(true);
    try {
      await base44.rpc("rsvp_crear", {
        p_token: token, p_nombre: nombre.trim(), p_personas: Number(personas) || 1, p_mensaje: mensaje.trim() || null,
      });
      setEnviado(true);
    } catch (e) {
      setErrRsvp(e.message || "No se pudo enviar tu confirmación.");
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center"><Loader2 size={28} className="text-[#C9A84C] animate-spin" /></div>;
  if (error) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 text-center">
      <p className="text-white/60 max-w-xs">{error}</p>
    </div>
  );

  const fondo = info?.salonImagen || null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-8">
      <div className="max-w-md mx-auto">
        {/* Hero de la invitación */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-3xl border border-[#C9A84C]/30 mb-5"
        >
          {fondo && (
            <div className="absolute inset-0">
              <img src={fondo} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(6,6,6,0.5) 0%, rgba(6,6,6,0.85) 60%, rgba(6,6,6,0.97) 100%)" }} />
            </div>
          )}
          {!fondo && <div className="absolute inset-0 bg-gradient-to-b from-[#141009] to-[#0a0a0a]" />}
          <div className="relative px-6 py-12 text-center">
            <p className="portal-eyebrow mb-3">Tienes una invitación</p>
            <h1 className="text-white text-3xl font-thin leading-tight">{info.evento}</h1>
            {info.tipo && <p className="text-[#C9A84C]/70 text-sm mt-2">{info.tipo}</p>}
            {info.mensaje && <p className="text-white/60 text-sm mt-5 leading-relaxed max-w-xs mx-auto">"{info.mensaje}"</p>}
          </div>
        </motion.div>

        {/* Detalles */}
        <div className="skeu-card p-5 mb-5 space-y-1">
          {[
            { icon: Calendar, label: "Fecha", valor: fechaLarga(info.fecha) },
            { icon: MapPin, label: "Lugar", valor: info.salon || "Jardines Club Hípico" },
            info.dressCode && { icon: Shirt, label: "Código", valor: info.dressCode },
          ].filter(Boolean).map(({ icon: Icon, label, valor }) => (
            <div key={label} className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
              <Icon size={15} className="text-[#C9A84C]/60 flex-shrink-0" />
              <span className="text-white/30 text-[11px] uppercase tracking-wider w-20 flex-shrink-0">{label}</span>
              <span className="text-white/80 text-sm">{valor || "Por confirmar"}</span>
            </div>
          ))}
        </div>

        {/* RSVP */}
        {enviado ? (
          <div className="skeu-card border-[#C9A84C]/40 p-7 text-center">
            <CheckCircle2 size={40} className="text-[#E6C870] mx-auto mb-3" />
            <h2 className="text-white text-xl font-thin">¡Gracias por confirmar!</h2>
            <p className="text-white/50 text-sm mt-2">Tu confirmación se registró. ¡Nos vemos en la fiesta! 🎉</p>
          </div>
        ) : (
          <div className="skeu-card p-5">
            <p className="text-white/85 text-sm flex items-center gap-2 mb-4">
              <PartyPopper size={16} className="text-[#E6C870]" /> ¿Nos acompañas? Confirma tu asistencia
            </p>
            <div className="space-y-3">
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre"
                className="glass-chip w-full rounded-xl text-white/80 text-sm px-4 py-3 outline-none focus:border-[#C9A84C]/50 bg-transparent" />
              <div>
                <label className="text-white/40 text-xs mb-1.5 block flex items-center gap-1.5"><Users size={12} /> ¿Cuántos asisten?</label>
                <div className="flex items-center gap-4">
                  <button onClick={() => setPersonas((p) => Math.max(1, p - 1))} className="glass-chip w-11 h-11 rounded-full flex items-center justify-center text-white/70">−</button>
                  <span className="text-white text-2xl font-thin w-10 text-center tabular-nums">{personas}</span>
                  <button onClick={() => setPersonas((p) => Math.min(20, p + 1))} className="glass-chip w-11 h-11 rounded-full flex items-center justify-center text-white/70">+</button>
                </div>
              </div>
              <textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} rows={2} placeholder="Un mensaje para los festejados (opcional)"
                className="glass-chip w-full rounded-xl text-white/75 text-sm px-4 py-3 outline-none focus:border-[#C9A84C]/50 resize-none bg-transparent" />
              {errRsvp && <p className="text-red-400 text-xs">{errRsvp}</p>}
              <button onClick={enviar} disabled={enviando}
                className="skeu-gold-btn w-full flex items-center justify-center gap-2 py-3.5 rounded-full text-sm font-medium disabled:opacity-50">
                {enviando ? <Loader2 size={15} className="animate-spin" /> : <Heart size={15} />} Confirmar asistencia
              </button>
            </div>
          </div>
        )}

        <p className="text-white/20 text-[11px] text-center mt-6">Jardines Club Hípico · Xochimilco, CDMX</p>
      </div>
    </div>
  );
}
