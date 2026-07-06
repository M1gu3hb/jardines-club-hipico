import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Calendar, MapPin, Tag, CheckCircle2, Loader2 } from "lucide-react";
import { estatusColor } from "@/components/admin/eventos/_ui";

export default function PortalInicio({ evento, salonNombre, onConfirmado }) {
  const [confirmando, setConfirmando] = useState(false);
  const confirmado = !!evento.confirmadoCliente;

  const confirmar = async () => {
    setConfirmando(true);
    try {
      await base44.rpc("confirmar_evento", { evt: evento.id });
      onConfirmado?.();
    } finally {
      setConfirmando(false);
    }
  };

  const dato = (Icon, label, valor) => (
    <div className="flex items-center gap-3 py-3 border-b border-white/5">
      <Icon size={16} className="text-[#C9A84C]/60 flex-shrink-0" />
      <span className="text-white/30 text-xs uppercase tracking-wider w-24">{label}</span>
      <span className="text-white/75 text-sm">{valor || "—"}</span>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-8">
        <p className="text-[#C9A84C]/60 text-xs uppercase tracking-[0.2em] mb-2">Tu evento</p>
        <h2 className="text-white text-3xl font-thin">{evento.nombreEvento}</h2>
        <span className={`inline-block mt-3 text-xs px-3 py-1 ${estatusColor(evento.estatus)}`}>{evento.estatus || "Apartado"}</span>
      </div>

      <div className="skeu-card p-6">
        {dato(Tag, "Tipo", evento.tipoEvento)}
        {dato(Calendar, "Fecha", evento.fechaEvento)}
        {dato(MapPin, "Salón", salonNombre)}
      </div>

      <div className="mt-6">
        {confirmado ? (
          <div className="flex items-center justify-center gap-2 text-green-400/80 text-sm py-4">
            <CheckCircle2 size={18} /> Confirmaste tu evento. ¡Nos vemos pronto!
          </div>
        ) : (
          <div className="text-center">
            <p className="text-white/40 text-sm mb-3">¿Todo listo? Confirma tu evento para dejar registrada tu intención.</p>
            <button onClick={confirmar} disabled={confirmando}
              className="inline-flex items-center gap-2 bg-[#C9A84C] text-[#0a0a0a] px-6 py-3 text-sm font-medium hover:bg-[#d4b558] transition-all disabled:opacity-50">
              {confirmando ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Confirmar mi evento
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
