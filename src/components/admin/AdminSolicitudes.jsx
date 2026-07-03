import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Eye, X, User, Calendar, Building2 } from "lucide-react";

const STATUS_COLORS = {
  "Nueva": "bg-blue-400/10 text-blue-400/80 border-blue-400/20",
  "En revisión": "bg-yellow-400/10 text-yellow-400/80 border-yellow-400/20",
  "Confirmada": "bg-green-400/10 text-green-400/80 border-green-400/20",
  "Cancelada": "bg-red-400/10 text-red-400/80 border-red-400/20",
};

export default function AdminSolicitudes() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [selected, setSelected] = useState(null);

  const load = () => base44.entities.SolicitudEvento.list("-created_date").then(setSolicitudes);
  useEffect(() => { load(); }, []);

  const updateStatus = async (id, estatus) => {
    await base44.entities.SolicitudEvento.update(id, { estatus });
    load();
    if (selected?.id === id) setSelected({ ...selected, estatus });
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-white text-2xl font-thin">Solicitudes</h2>
        <p className="text-white/30 text-sm mt-1">{solicitudes.length} solicitudes recibidas.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              {["Folio", "Cliente", "Salón", "Tipo", "Fecha evento", "Recibida", "Estatus", ""].map((h) => (
                <th key={h} className="text-left text-white/25 text-xs uppercase tracking-wider py-3 px-3 font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {solicitudes.map((s) => {
              const fechaRecibida = s.fechaEnvio || (s.created_date
                ? new Date(s.created_date).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" })
                : "—");
              const horaRecibida = s.horaEnvio || (s.created_date
                ? new Date(s.created_date).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false })
                : "—");
              return (
              <tr key={s.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                <td className="py-3.5 px-3">
                  <span className="text-[#C9A84C]/70 text-xs font-mono">{s.folio || s.id?.slice(-6).toUpperCase()}</span>
                </td>
                <td className="py-3.5 px-3">
                  <p className="text-white/70">{s.nombreCompleto}</p>
                  <p className="text-white/25 text-xs">{s.telefono}</p>
                </td>
                <td className="py-3.5 px-3 text-white/50">{s.salonSeleccionado}</td>
                <td className="py-3.5 px-3 text-white/50">{s.tipoEvento}</td>
                <td className="py-3.5 px-3 text-white/50">{s.fechaTentativa}</td>
                <td className="py-3.5 px-3">
                  <p className="text-white/50 text-xs">{fechaRecibida}</p>
                  <p className="text-white/25 text-xs">{horaRecibida}</p>
                </td>
                <td className="py-3.5 px-3">
                  <select
                    value={s.estatus || "Nueva"}
                    onChange={(e) => updateStatus(s.id, e.target.value)}
                    className={`text-xs border px-2 py-1 bg-transparent outline-none cursor-pointer ${STATUS_COLORS[s.estatus || "Nueva"]}`}
                  >
                    {["Nueva", "En revisión", "Confirmada", "Cancelada"].map((opt) => (
                      <option key={opt} value={opt} className="bg-[#111] text-white">{opt}</option>
                    ))}
                  </select>
                </td>
                <td className="py-3.5 px-3">
                 <button onClick={() => setSelected(s)} className="text-white/25 hover:text-[#C9A84C] transition-colors">
                   <Eye size={15} />
                 </button>
                </td>
                </tr>
                );
                })}
                </tbody>
        </table>
        {solicitudes.length === 0 && (
          <p className="text-white/20 text-sm py-10 text-center">Aún no hay solicitudes.</p>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-[#0f0f0f] border border-[#C9A84C]/20 w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#0f0f0f] border-b border-white/5 px-6 py-4 flex items-center justify-between">
              <h3 className="text-white font-light">Detalle de solicitud</h3>
              <button onClick={() => setSelected(null)} className="text-white/30 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-6">
              <Group title="Identificación">
                <Row label="Folio" value={selected.folio || selected.id?.slice(-6).toUpperCase()} />
                <Row label="Fecha de envío" value={selected.fechaEnvio || (selected.created_date ? new Date(selected.created_date).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—")} />
                <Row label="Hora de envío" value={selected.horaEnvio || (selected.created_date ? new Date(selected.created_date).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false }) : "—")} />
              </Group>
              <Group title="Salón" icon={Building2}>
                <Row label="Salón" value={selected.salonSeleccionado} />
              </Group>
              <Group title="Cliente" icon={User}>
                <Row label="Nombre" value={selected.nombreCompleto} />
                <Row label="Teléfono" value={selected.telefono} />
                <Row label="Email" value={selected.email} />
                <Row label="Dirección" value={selected.direccion} />
                {selected.rfc && <Row label="RFC" value={selected.rfc} />}
              </Group>
              <Group title="Evento" icon={Calendar}>
                <Row label="Tipo" value={selected.tipoEvento} />
                <Row label="Fecha" value={selected.fechaTentativa} />
                <Row label="Horario" value={`${selected.horarioInicio || "-"} – ${selected.horarioFin || "-"}`} />
                <Row label="Personas" value={selected.numeroPersonas} />
              </Group>
              <Group title="Preferencias">
                <Row label="Mantelería" value={selected.manteleriaPreferida || "No especificada"} />
                <Row label="DJ" value={selected.dj ? "Sí" : "No"} />
                <Row label="Actividades" value={(selected.actividadesExtras || []).join(", ") || "Ninguna"} />
                <Row label="Comentarios" value={selected.comentarios || "Ninguno"} />
              </Group>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Group({ title, icon: Icon, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon size={13} className="text-[#C9A84C]/50" />}
        <h4 className="text-white/30 text-xs uppercase tracking-widest">{title}</h4>
      </div>
      <div className="space-y-2 pl-1">{children}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-sm gap-4">
      <span className="text-white/30 flex-shrink-0">{label}</span>
      <span className="text-white/70 text-right">{value || "—"}</span>
    </div>
  );
}