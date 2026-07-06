import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Check, Share2, Copy, ExternalLink, Users, Shirt, MessageSquare, Sparkles } from "lucide-react";

const nuevoToken = () => (crypto.randomUUID ? crypto.randomUUID() : "inv-" + Date.now() + Math.random().toString(36).slice(2));
const invitacionUrl = (token) => `${window.location.origin}/invitacion/${token}`;

/**
 * PortalInvitacion — el cliente crea y comparte su invitación digital y ve las
 * confirmaciones (RSVP) de sus invitados. La página pública vive en /invitacion/<token>.
 */
export default function PortalInvitacion({ evento }) {
  const [form, setForm] = useState({
    invitacionActiva: !!evento.invitacionActiva,
    invitacionMensaje: evento.invitacionMensaje || "",
    invitacionDressCode: evento.invitacionDressCode || "",
    invitacionToken: evento.invitacionToken || null,
  });
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [rsvps, setRsvps] = useState([]);
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setOk(false); };

  const cargarRsvps = useCallback(() => {
    base44.entities.Rsvp.filter({ eventoId: evento.id }, "-created_date").then(setRsvps).catch(() => {});
  }, [evento.id]);
  useEffect(() => { cargarRsvps(); }, [cargarRsvps]);

  const guardar = async (activar) => {
    setGuardando(true);
    const token = form.invitacionToken || nuevoToken();
    const patch = {
      invitacionToken: token,
      invitacionActiva: activar !== undefined ? activar : !!form.invitacionActiva,
      invitacionMensaje: form.invitacionMensaje || null,
      invitacionDressCode: form.invitacionDressCode || null,
    };
    await base44.entities.Evento.update(evento.id, patch);
    setForm((f) => ({ ...f, ...patch }));
    setGuardando(false);
    setOk(true);
  };

  const copiar = () => {
    navigator.clipboard?.writeText(invitacionUrl(form.invitacionToken)).then(() => {
      setCopiado(true); setTimeout(() => setCopiado(false), 2000);
    }).catch(() => {});
  };
  const compartir = () => {
    const msg = `¡Estás invitad@ a ${evento.nombreEvento}! Confirma tu asistencia aquí: ${invitacionUrl(form.invitacionToken)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  const totalConfirmados = rsvps.reduce((a, r) => a + (Number(r.personas) || 1), 0);
  const activa = form.invitacionActiva && form.invitacionToken;

  return (
    <div className="max-w-xl mx-auto">
      {/* Configuración */}
      <div className="skeu-card p-5 mb-5 space-y-4">
        <p className="text-white/80 text-sm flex items-start gap-2.5 leading-relaxed">
          <Sparkles size={16} className="text-[#E6C870] flex-shrink-0 mt-0.5" />
          <span>Crea una <span className="text-[#E6C870]">invitación digital</span> para compartir con tus invitados por WhatsApp. Ellos confirman su asistencia y tú ves quién viene.</span>
        </p>

        <div>
          <label className="text-white/40 text-xs uppercase tracking-wider mb-1.5 block flex items-center gap-1.5"><MessageSquare size={12} /> Mensaje para tus invitados</label>
          <textarea value={form.invitacionMensaje} onChange={(e) => set("invitacionMensaje", e.target.value)} rows={2}
            placeholder="Ej. Con mucho cariño te esperamos para celebrar juntos…"
            className="w-full bg-white/5 border border-white/10 rounded-xl text-white/80 text-sm px-4 py-2.5 outline-none focus:border-[#C9A84C]/40 resize-none" />
        </div>
        <div>
          <label className="text-white/40 text-xs uppercase tracking-wider mb-1.5 block flex items-center gap-1.5"><Shirt size={12} /> Código de vestimenta (opcional)</label>
          <input value={form.invitacionDressCode} onChange={(e) => set("invitacionDressCode", e.target.value)}
            placeholder="Ej. Formal, colores pastel…"
            className="w-full bg-white/5 border border-white/10 rounded-xl text-white/80 text-sm px-4 py-2.5 outline-none focus:border-[#C9A84C]/40" />
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => guardar(true)} disabled={guardando}
            className="skeu-gold-btn flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium disabled:opacity-50">
            {guardando ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />}
            {activa ? "Guardar cambios" : "Crear y activar invitación"}
          </button>
          {ok && <span className="text-green-400/80 text-xs">Guardado ✓</span>}
        </div>
      </div>

      {/* Compartir */}
      {activa && (
        <div className="skeu-card border-[#C9A84C]/30 p-5 mb-5">
          <p className="portal-eyebrow mb-3">Comparte tu invitación</p>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-2.5 rounded-lg mb-3">
            <span className="flex-1 text-white/60 text-xs truncate">{invitacionUrl(form.invitacionToken)}</span>
            <button onClick={copiar} className="text-[#C9A84C]/70 hover:text-[#C9A84C] flex-shrink-0" title="Copiar">
              {copiado ? <span className="text-green-400/80 text-xs">¡Copiado!</span> : <Copy size={15} />}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={compartir} className="flex items-center gap-2 border border-[#25D366]/40 text-[#25D366] px-4 py-2 text-sm rounded-full hover:bg-[#25D366]/10 transition-all">
              <Share2 size={14} /> Compartir por WhatsApp
            </button>
            <a href={invitacionUrl(form.invitacionToken)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 border border-white/10 text-white/50 px-4 py-2 text-sm rounded-full hover:text-white/80 transition-all">
              <ExternalLink size={14} /> Ver invitación
            </a>
            <button onClick={() => guardar(false)} className="text-white/30 hover:text-white/60 px-3 py-2 text-xs ml-auto">Desactivar</button>
          </div>
        </div>
      )}

      {/* Confirmaciones (RSVP) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="portal-eyebrow flex items-center gap-1.5"><Users size={12} /> Confirmados</p>
          {rsvps.length > 0 && <span className="text-[#E6C870] text-sm">{totalConfirmados} personas · {rsvps.length} respuestas</span>}
        </div>
        <div className="space-y-2">
          {rsvps.map((r) => (
            <div key={r.id} className="skeu-card px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-white/85 text-sm">{r.nombre}</span>
                <span className="text-white/40 text-xs">{r.personas} {Number(r.personas) === 1 ? "persona" : "personas"}</span>
              </div>
              {r.mensaje && <p className="text-white/45 text-xs mt-1 italic">"{r.mensaje}"</p>}
            </div>
          ))}
          {rsvps.length === 0 && <p className="text-white/25 text-sm py-6 text-center">Aún no hay confirmaciones. Comparte tu invitación para empezar a recibirlas.</p>}
        </div>
      </div>
    </div>
  );
}
