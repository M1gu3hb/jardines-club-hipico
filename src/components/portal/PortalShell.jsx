import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/api/authContext";
import { Home, FileText, Package, Clock, Music, LayoutGrid, Star, LogOut, Sparkles, Globe } from "lucide-react";
import { eventoYaPaso } from "@/lib/fechas";
import Dock from "./Dock";
import PortalInicio from "./PortalInicio";
import PortalDocumentos from "./PortalDocumentos";
import PortalContratado from "./PortalContratado";
import EventoCronograma from "@/components/evento/EventoCronograma";
import EventoMusica from "@/components/evento/EventoMusica";
import MesaEditor from "@/components/mesas/MesaEditor";
import PortalResena from "./PortalResena";
import PortalArmalo from "./PortalArmalo";

/** Encabezado de sección con el estilo editorial del sitio. */
function TituloSeccion({ titulo, descripcion }) {
  return (
    <div className="text-center mb-8">
      <div className="flex items-center justify-center gap-3 mb-3">
        <div className="h-px w-10 bg-gradient-to-r from-transparent to-[#C9A84C]/50" />
        <h2 className="text-white text-2xl font-thin">{titulo}</h2>
        <div className="h-px w-10 bg-gradient-to-l from-transparent to-[#C9A84C]/50" />
      </div>
      {descripcion && <p className="text-white/35 text-sm max-w-md mx-auto">{descripcion}</p>}
    </div>
  );
}

export default function PortalShell({ evento, onRefresh }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [seccion, setSeccion] = useState("inicio");

  // Ir al sitio público SIN que la auto-entrada al portal lo regrese (bypass de sesión).
  const verSitio = () => {
    try { sessionStorage.setItem("jch_ver_sitio", "1"); } catch { /* sin storage */ }
    navigate("/");
  };
  const [salon, setSalon] = useState(null);
  const [reglas, setReglas] = useState(null);

  useEffect(() => {
    if (evento.salonId) base44.entities.Salon.get(evento.salonId).then((s) => setSalon(s || null));
    base44.entities.EventoReglasMesas.filter({ eventoId: evento.id }).then((r) => setReglas(r[0] || null));
  }, [evento.id, evento.salonId]);

  const yaPaso = eventoYaPaso(evento);

  const items = useMemo(() => {
    const base = [
      { id: "inicio", label: "Inicio", icon: <Home size={18} /> },
      { id: "armalo", label: "Mi lista", icon: <Sparkles size={18} /> },
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
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/90 backdrop-blur border-b border-[#C9A84C]/10 px-5 py-3 flex items-center justify-between">
        <div className="min-w-0">
          <p className="portal-eyebrow">Jardines Club Hípico</p>
          <p className="text-white/80 text-sm font-light truncate">{evento.nombreEvento}</p>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <button onClick={verSitio} className="flex items-center gap-1.5 text-white/30 hover:text-white/60 text-xs transition-colors">
            <Globe size={14} /> Ver sitio
          </button>
          <button onClick={logout} className="flex items-center gap-1.5 text-white/30 hover:text-white/60 text-xs transition-colors">
            <LogOut size={14} /> Salir
          </button>
        </div>
      </header>

      {/* Contenido con entrada suave por sección. Sin AnimatePresence/exit a propósito:
          el cambio de contenido es INSTANTÁNEO (no depende de que una animación de salida
          termine, que se congela si el navegador pausa rAF en pestañas de fondo). */}
      <main className="px-5 py-8 pb-36">
        <motion.div
          key={seccion}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
            {seccion === "inicio" && (
              <PortalInicio evento={evento} salon={salon} onConfirmado={onRefresh} onIr={setSeccion} />
            )}
            {seccion === "armalo" && (
              <div className="max-w-xl mx-auto">
                <TituloSeccion titulo="Arma tu evento" descripcion="Explora, ilusiónate y haz tu lista. Tu coordinador la verá y la hará realidad contigo." />
                <PortalArmalo evento={evento} />
              </div>
            )}
            {seccion === "documentos" && (
              <div className="max-w-xl mx-auto">
                <TituloSeccion titulo="Documentos" descripcion="Tus cotizaciones, contratos y comprobantes, siempre a la mano." />
                <PortalDocumentos eventoId={evento.id} />
              </div>
            )}
            {seccion === "contratado" && (
              <div className="max-w-xl mx-auto">
                <TituloSeccion titulo="Lo que contrataste" descripcion="Todo lo que incluye tu evento con nosotros." />
                <PortalContratado eventoId={evento.id} />
              </div>
            )}
            {seccion === "cronograma" && (
              <div className="max-w-2xl mx-auto">
                <TituloSeccion titulo="Cronograma" descripcion="Diseña los momentos de tu evento, hora por hora. Nuestro equipo lo seguirá contigo." />
                <EventoCronograma eventoId={evento.id} editable />
              </div>
            )}
            {seccion === "musica" && (
              <div className="max-w-2xl mx-auto">
                <TituloSeccion titulo="Música" descripcion="Cuéntanos qué quieres bailar… y qué canción no debe sonar jamás." />
                <EventoMusica eventoId={evento.id} editable />
              </div>
            )}
            {seccion === "mesas" && (
              <div className="max-w-3xl mx-auto">
                <TituloSeccion
                  titulo="Mesas"
                  descripcion={reglas?.clientePuedeEditar
                    ? "Acomoda tus mesas e invitados a tu gusto: toca una mesa para editarla o arrástrala por el plano."
                    : "Así va quedando la distribución de tu salón. Tu coordinador la ajusta contigo."}
                />
                <MesaEditor eventoId={evento.id} salonId={evento.salonId} reglas={reglas} editable={!!reglas?.clientePuedeEditar} />
              </div>
            )}
            {seccion === "resena" && <PortalResena evento={evento} />}
        </motion.div>
      </main>

      {/* Dock de navegación */}
      <div className="fixed inset-x-0 bottom-0 z-50" style={{ height: 96 }}>
        <Dock items={dockItems} />
      </div>
    </div>
  );
}
