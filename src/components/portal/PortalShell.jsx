import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/api/authContext";
import { Home, FileText, Package, Clock, Music, LayoutGrid, Star, LogOut } from "lucide-react";
import Dock from "./Dock";
import PortalInicio from "./PortalInicio";
import PortalDocumentos from "./PortalDocumentos";
import PortalContratado from "./PortalContratado";
import EventoCronograma from "@/components/evento/EventoCronograma";
import EventoMusica from "@/components/evento/EventoMusica";
import MesaEditor from "@/components/mesas/MesaEditor";

function eventoYaPaso(evento) {
  if (evento.estatus === "Realizado") return true;
  if (!evento.fechaEvento) return false;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  return new Date(evento.fechaEvento + "T00:00:00") < hoy;
}

export default function PortalShell({ evento, onRefresh }) {
  const { logout } = useAuth();
  const [seccion, setSeccion] = useState("inicio");
  const [salonNombre, setSalonNombre] = useState("");
  const [reglas, setReglas] = useState(null);

  useEffect(() => {
    if (evento.salonId) base44.entities.Salon.get(evento.salonId).then((s) => setSalonNombre(s?.nombre || ""));
    base44.entities.EventoReglasMesas.filter({ eventoId: evento.id }).then((r) => setReglas(r[0] || null));
  }, [evento.id, evento.salonId]);

  const yaPaso = eventoYaPaso(evento);

  const items = useMemo(() => {
    const base = [
      { id: "inicio", label: "Inicio", icon: <Home size={18} /> },
      { id: "documentos", label: "Documentos", icon: <FileText size={18} /> },
      { id: "contratado", label: "Contratado", icon: <Package size={18} /> },
      { id: "cronograma", label: "Cronograma", icon: <Clock size={18} /> },
      { id: "musica", label: "Música", icon: <Music size={18} /> },
      { id: "mesas", label: "Mesas", icon: <LayoutGrid size={18} /> },
    ];
    if (yaPaso) base.push({ id: "resena", label: "Reseña", icon: <Star size={18} /> });
    return base;
  }, [yaPaso]);

  const dockItems = items.map((it) => ({
    icon: it.icon,
    label: it.label,
    active: seccion === it.id,
    onClick: () => setSeccion(it.id),
  }));

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/90 backdrop-blur border-b border-white/5 px-5 py-3 flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[#C9A84C]/60 text-[10px] uppercase tracking-[0.2em]">Jardines Club Hípico</p>
          <p className="text-white/80 text-sm font-light truncate">{evento.nombreEvento}</p>
        </div>
        <button onClick={logout} className="flex items-center gap-1.5 text-white/30 hover:text-white/60 text-xs transition-colors">
          <LogOut size={14} /> Salir
        </button>
      </header>

      {/* Contenido */}
      <main className="px-5 py-8 pb-32">
        {seccion === "inicio" && <PortalInicio evento={evento} salonNombre={salonNombre} onConfirmado={onRefresh} />}
        {seccion === "documentos" && <PortalDocumentos eventoId={evento.id} />}
        {seccion === "contratado" && <PortalContratado eventoId={evento.id} />}
        {seccion === "cronograma" && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-white text-xl font-thin mb-1">Cronograma</h2>
            <p className="text-white/30 text-sm mb-6">Organiza los momentos de tu evento.</p>
            <EventoCronograma eventoId={evento.id} editable />
          </div>
        )}
        {seccion === "musica" && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-white text-xl font-thin mb-1">Música</h2>
            <p className="text-white/30 text-sm mb-6">Dinos qué sí y qué no quieres escuchar.</p>
            <EventoMusica eventoId={evento.id} editable />
          </div>
        )}
        {seccion === "mesas" && (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-white text-xl font-thin mb-1">Mesas</h2>
            <p className="text-white/30 text-sm mb-6">
              {reglas?.clientePuedeEditar
                ? "Organiza la distribución de tus mesas e invitados."
                : "Distribución de tus mesas (solo lectura)."}
            </p>
            <MesaEditor eventoId={evento.id} salonId={evento.salonId} reglas={reglas} editable={!!reglas?.clientePuedeEditar} />
          </div>
        )}
        {seccion === "resena" && (
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-white text-xl font-thin mb-2">Tu reseña</h2>
            <p className="text-white/30 text-sm">Cuéntanos cómo te fue (se habilita en la siguiente actualización).</p>
          </div>
        )}
      </main>

      {/* Dock de navegación */}
      <div className="fixed inset-x-0 bottom-0 z-50" style={{ height: 96 }}>
        <Dock items={dockItems} />
      </div>
    </div>
  );
}
