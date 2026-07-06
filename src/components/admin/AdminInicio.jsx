import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  CalendarDays, Inbox, Star, DoorOpen, ChevronRight, Clock, Users, PartyPopper, Bell, Check,
} from "lucide-react";
import { estatusColor } from "@/components/admin/eventos/_ui";
import { fechaLarga, diasFaltantes, tiempoRelativo } from "@/lib/fechas";

/** Saludo según la hora (el dueño abre esto a cualquier hora del día del evento). */
function saludo() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

function Metrica({ icon: Icon, valor, label, alerta, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`skeu-card skeu-card-hover p-4 text-left w-full ${alerta ? "border-[#C9A84C]/45" : ""}`}
    >
      <div className="flex items-center justify-between">
        <Icon size={16} className="text-[#C9A84C]/70" />
        <ChevronRight size={13} className="text-white/15" />
      </div>
      <p
        className="font-thin leading-none mt-3"
        style={{
          fontSize: "2.1rem",
          background: "linear-gradient(180deg, #F0D98A 0%, #C9A84C 55%, #A88532 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        {valor ?? "—"}
      </p>
      <p className="text-white/40 text-[11px] uppercase tracking-wider mt-1.5 leading-tight">{label}</p>
    </button>
  );
}

function enCuantosDias(fechaISO) {
  const d = diasFaltantes(fechaISO);
  if (d === null) return "sin fecha";
  if (d === 0) return "¡HOY!";
  if (d === 1) return "mañana";
  if (d < 0) return "ya pasó";
  return `en ${d} días`;
}

export default function AdminInicio({ onIr }) {
  const [datos, setDatos] = useState(null);
  const [notifs, setNotifs] = useState([]);
  const [marcando, setMarcando] = useState(false);

  const cargarNotifs = () =>
    base44.entities.Notificacion.list("-created_date").then((n) => setNotifs(n.slice(0, 20)));

  useEffect(() => {
    let activo = true;
    (async () => {
      const [eventos, solicitudes, resenas] = await Promise.all([
        base44.entities.Evento.list("-created_date"),
        base44.entities.SolicitudEvento.list("-created_date"),
        base44.entities.Resena.list("-created_date"),
      ]);
      if (!activo) return;

      const hoyStr = new Date().toISOString().slice(0, 10);
      const proximos = eventos
        .filter((e) => e.fechaEvento && e.fechaEvento >= hoyStr && e.estatus !== "Cancelado")
        .sort((a, b) => a.fechaEvento.localeCompare(b.fechaEvento));

      setDatos({
        proximos,
        proximos30: proximos.filter((e) => (diasFaltantes(e.fechaEvento) ?? 99) <= 30).length,
        solicitudesNuevas: solicitudes.filter((s) => (s.estatus || "Nueva") === "Nueva"),
        resenasPendientes: resenas.filter((r) => !r.aprobada),
        portalesActivos: eventos.filter((e) => e.portalActivo).length,
      });
    })();
    cargarNotifs();
    return () => { activo = false; };
  }, []);

  const noLeidas = notifs.filter((n) => !n.leida);
  const marcarLeidas = async () => {
    if (!noLeidas.length) return;
    setMarcando(true);
    await Promise.all(noLeidas.map((n) => base44.entities.Notificacion.update(n.id, { leida: true })));
    setMarcando(false);
    cargarNotifs();
  };

  const hoy = fechaLarga(new Date().toISOString().slice(0, 10));

  return (
    <div>
      {/* Saludo */}
      <div className="mb-7">
        <p className="text-white/30 text-xs tracking-wide">{hoy}</p>
        <h2 className="text-white text-2xl font-thin mt-1">{saludo()} 👋</h2>
        <p className="text-white/35 text-sm mt-1">Así va Jardines Club Hípico hoy.</p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <Metrica icon={CalendarDays} valor={datos?.proximos30} label="Eventos en 30 días" onClick={() => onIr("eventos")} />
        <Metrica icon={Inbox} valor={datos?.solicitudesNuevas.length} label="Solicitudes nuevas"
          alerta={datos?.solicitudesNuevas.length > 0} onClick={() => onIr("solicitudes")} />
        <Metrica icon={Star} valor={datos?.resenasPendientes.length} label="Reseñas por aprobar"
          alerta={datos?.resenasPendientes.length > 0} onClick={() => onIr("resenas")} />
        <Metrica icon={DoorOpen} valor={datos?.portalesActivos} label="Portales activos" onClick={() => onIr("eventos")} />
      </div>

      {/* Actividad del portal (confirmaciones, reseñas, intereses de clientes) */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <p className="text-white/50 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <Bell size={13} /> Actividad del portal
            {noLeidas.length > 0 && (
              <span className="bg-[#C9A84C] text-[#0a0a0a] text-[10px] font-semibold px-1.5 py-0.5 rounded-full">{noLeidas.length}</span>
            )}
          </p>
          {noLeidas.length > 0 && (
            <button onClick={marcarLeidas} disabled={marcando}
              className="flex items-center gap-1 text-[#C9A84C]/60 hover:text-[#C9A84C] text-xs transition-colors disabled:opacity-50">
              <Check size={12} /> Marcar leídas
            </button>
          )}
        </div>
        <div className="space-y-1.5">
          {notifs.slice(0, 6).map((n) => (
            <div key={n.id} className={`flex items-start gap-3 px-4 py-3 border transition-all ${
              n.leida ? "bg-[#0f0f0f] border-white/5" : "bg-[#141109] border-[#C9A84C]/30"
            }`}>
              {!n.leida && <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] mt-1.5 flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className={`text-sm truncate ${n.leida ? "text-white/50" : "text-white/85"}`}>{n.titulo}</p>
                {n.detalle && <p className="text-white/30 text-xs mt-0.5 line-clamp-2">{n.detalle}</p>}
              </div>
              <span className="text-white/25 text-[11px] flex-shrink-0 mt-0.5">{tiempoRelativo(n.createdAt)}</span>
            </div>
          ))}
          {notifs.length === 0 && (
            <p className="text-white/20 text-sm py-4 text-center">Sin actividad del portal todavía. Aquí verás cuando un cliente confirme, deje reseña o se interese en algo.</p>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Próximos eventos */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-white/50 text-xs uppercase tracking-wider flex items-center gap-1.5"><Clock size={13} /> Próximos eventos</p>
            <button onClick={() => onIr("eventos")} className="text-[#C9A84C]/60 hover:text-[#C9A84C] text-xs transition-colors">Ver todos →</button>
          </div>
          <div className="space-y-2">
            {datos === null && <p className="text-white/20 text-sm py-4">Cargando…</p>}
            {datos?.proximos.slice(0, 5).map((e) => {
              const dias = diasFaltantes(e.fechaEvento);
              const esHoy = dias === 0;
              return (
                <button key={e.id} onClick={() => onIr("eventos")}
                  className={`w-full flex items-center gap-3 bg-[#111] border px-4 py-3 text-left hover:border-[#C9A84C]/30 transition-all ${esHoy ? "border-[#C9A84C]/50" : "border-white/5"}`}>
                  {esHoy && <PartyPopper size={15} className="text-[#E6C870] flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 text-sm truncate">{e.nombreEvento}</p>
                    <p className="text-white/30 text-xs truncate">{fechaLarga(e.fechaEvento)}</p>
                  </div>
                  <span className={`text-xs flex-shrink-0 ${esHoy ? "text-[#E6C870] font-medium" : "text-[#C9A84C]/70"}`}>{enCuantosDias(e.fechaEvento)}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 flex-shrink-0 ${estatusColor(e.estatus)}`}>{e.estatus}</span>
                </button>
              );
            })}
            {datos?.proximos.length === 0 && (
              <p className="text-white/20 text-sm py-4 text-center">No hay eventos próximos agendados.</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Solicitudes nuevas */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-white/50 text-xs uppercase tracking-wider flex items-center gap-1.5"><Inbox size={13} /> Solicitudes nuevas</p>
              <button onClick={() => onIr("solicitudes")} className="text-[#C9A84C]/60 hover:text-[#C9A84C] text-xs transition-colors">Ver todas →</button>
            </div>
            <div className="space-y-2">
              {datos?.solicitudesNuevas.slice(0, 3).map((s) => (
                <button key={s.id} onClick={() => onIr("solicitudes")}
                  className="w-full flex items-center gap-3 bg-[#111] border border-white/5 px-4 py-3 text-left hover:border-[#C9A84C]/30 transition-all">
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 text-sm truncate">{s.nombreCompleto || "Sin nombre"}</p>
                    <p className="text-white/30 text-xs truncate">
                      {[s.tipoEvento, s.fechaTentativa, s.numeroPersonas && `${s.numeroPersonas} pers.`].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className="text-blue-400/70 bg-blue-400/10 text-[10px] px-1.5 py-0.5 flex-shrink-0">Nueva</span>
                </button>
              ))}
              {datos && datos.solicitudesNuevas.length === 0 && (
                <p className="text-white/20 text-sm py-3 text-center">Todo atendido. 🎉</p>
              )}
            </div>
          </div>

          {/* Reseñas por aprobar */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-white/50 text-xs uppercase tracking-wider flex items-center gap-1.5"><Star size={13} /> Reseñas por aprobar</p>
              <button onClick={() => onIr("resenas")} className="text-[#C9A84C]/60 hover:text-[#C9A84C] text-xs transition-colors">Moderar →</button>
            </div>
            <div className="space-y-2">
              {datos?.resenasPendientes.slice(0, 2).map((r) => (
                <button key={r.id} onClick={() => onIr("resenas")}
                  className="w-full bg-[#111] border border-[#C9A84C]/20 px-4 py-3 text-left hover:border-[#C9A84C]/40 transition-all">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[#E6C870] text-xs">{"★".repeat(r.estrellas || 5)}</span>
                    <span className="text-white/60 text-xs">{r.autor}</span>
                  </div>
                  <p className="text-white/40 text-xs truncate">{r.texto}</p>
                </button>
              ))}
              {datos && datos.resenasPendientes.length === 0 && (
                <p className="text-white/20 text-sm py-3 text-center">Sin reseñas pendientes.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
