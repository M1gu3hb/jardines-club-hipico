import { useState } from "react";
import { ArrowLeft, FileText, Package, Clock, Music, LayoutGrid, QrCode, Settings2 } from "lucide-react";
import { estatusColor } from "./_ui";
import EventoDatos from "./EventoDatos";
import EventoDocumentos from "./EventoDocumentos";
import EventoItems from "./EventoItems";
import EventoCronograma from "@/components/evento/EventoCronograma";
import EventoMusica from "@/components/evento/EventoMusica";

const SUBTABS = [
  { id: "datos", label: "Datos", icon: Settings2 },
  { id: "documentos", label: "Documentos", icon: FileText },
  { id: "items", label: "Contratado", icon: Package },
  { id: "cronograma", label: "Cronograma", icon: Clock },
  { id: "musica", label: "Música", icon: Music },
  { id: "mesas", label: "Mesas", icon: LayoutGrid },
  { id: "qr", label: "QR / Meseros", icon: QrCode },
];

function Placeholder({ texto }) {
  return <p className="text-white/25 text-sm py-10 text-center">{texto}</p>;
}

export default function EventoFicha({ evento, salones, onVolver, onActualizado }) {
  const [tab, setTab] = useState("datos");

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onVolver} className="text-white/40 hover:text-white transition-colors p-1">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-white text-xl font-thin truncate">{evento.nombreEvento}</h2>
          <p className="text-white/30 text-xs mt-0.5">
            {evento.usuario ? `Acceso: ${evento.usuario}` : "Sin credenciales de acceso"}
          </p>
        </div>
        <span className={`text-xs px-2 py-1 ${estatusColor(evento.estatus)}`}>{evento.estatus || "Apartado"}</span>
      </div>

      <div className="flex flex-wrap gap-1 mb-6 border-b border-white/5 pb-2">
        {SUBTABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs transition-all ${
              tab === t.id ? "text-[#C9A84C] border-b-2 border-[#C9A84C] -mb-[9px]" : "text-white/35 hover:text-white/60"
            }`}>
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "datos" && <EventoDatos evento={evento} salones={salones} onActualizado={onActualizado} />}
      {tab === "documentos" && <EventoDocumentos eventoId={evento.id} />}
      {tab === "items" && <EventoItems eventoId={evento.id} />}
      {tab === "cronograma" && <EventoCronograma eventoId={evento.id} editable />}
      {tab === "musica" && <EventoMusica eventoId={evento.id} editable />}
      {tab === "mesas" && <Placeholder texto="El editor de mesas se habilita en la FASE-06." />}
      {tab === "qr" && <Placeholder texto="Invitaciones QR y control de meseros se habilitan en la FASE-07." />}
    </div>
  );
}
