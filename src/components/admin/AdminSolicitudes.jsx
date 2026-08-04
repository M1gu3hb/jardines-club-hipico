import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { SOLICITUD_ESTATUS } from "@/lib/catalogos";
import { Eye, X, User, Calendar, Building2, AlertTriangle, Loader2, CalendarPlus, CheckCircle2 } from "lucide-react";
import { EsqueletoFilas } from "@/components/ui/Estado";

/**
 * ESTATUS — la lista viene de la BASE, no al revés.
 *
 * `sec_07` puso un CHECK en `jardines.solicitudes`:
 *
 *     estatus is null or estatus in ('Nueva','En proceso','Cotizada','Cerrada','Descartada')
 *
 * y este panel seguía ofreciendo "En revisión", "Confirmada" y "Cancelada", que no están.
 * Como el único valor que coincidía era "Nueva", **cualquier** cambio que hiciera el dueño
 * violaba el CHECK: Postgres devolvía 23514, el shim lanzaba, y `updateStatus` no capturaba
 * nada — promesa rechazada sin `catch`, `load()` nunca corría y el desplegable volvía solo a
 * su sitio. Desde fuera parecía "no me deja", sin ninguna explicación.
 *
 * Si alguna vez hay que añadir un estatus, se añade PRIMERO al CHECK (migración) y después
 * aquí. Al revés vuelve a romperse en silencio.
 */
const ESTATUS = SOLICITUD_ESTATUS;

const STATUS_COLORS = {
  "Nueva": "bg-blue-400/10 text-blue-400/80 border-blue-400/20",
  "En proceso": "bg-yellow-400/10 text-yellow-400/80 border-yellow-400/20",
  "Cotizada": "bg-[#C9A84C]/10 text-[#C9A84C]/80 border-[#C9A84C]/20",
  "Cerrada": "bg-green-400/10 text-green-400/80 border-green-400/20",
  "Descartada": "bg-red-400/10 text-red-400/80 border-red-400/20",
};

/** Marca un error como ya redactado para una persona, para no traducirlo dos veces. */
const amigable = (texto) => Object.assign(new Error(texto), { amigable: true });

/**
 * Traduce el fallo a algo accionable. **Nunca** se enseña un volcado de Postgres: el dueño no
 * puede hacer nada con "new row for relation ... violates check constraint".
 */
function mensajeDeError(e, estatus) {
  if (e?.amigable) return e.message;
  const m = String(e?.message || "");
  if (/estatus_valido|check constraint/i.test(m)) {
    return `El panel intentó guardar «${estatus}», que la base no admite. Es un fallo del panel, ` +
      `no tuyo: avisa a soporte y menciona el estatus que elegiste.`;
  }
  if (/permission denied|42501/i.test(m)) {
    return "Tu cuenta no tiene permiso para cambiar el estatus. Comprueba que entraste como administrador.";
  }
  if (/jwt|expired|not authenticated/i.test(m)) {
    return "Tu sesión caducó. Vuelve a entrar al panel y reinténtalo.";
  }
  if (/failed to fetch|networkerror|load failed/i.test(m)) {
    return "No hay conexión con la base. Reinténtalo en un momento; no se guardó nada.";
  }
  return "No se pudo guardar el estatus. Reinténtalo, y si sigue fallando avisa a soporte.";
}

export default function AdminSolicitudes({ onConvertir = null }) {
  const [solicitudes, setSolicitudes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [guardando, setGuardando] = useState("");
  // Tercer estado: mientras la primera lectura está en vuelo no se puede afirmar ni que hay
  // solicitudes ni que no las hay.
  const [cargando, setCargando] = useState(true);
  // Qué solicitudes YA generaron un evento. Se lee de `eventos.solicitud_id` (`sec_25`), que
  // es el único sitio donde consta: sin esto, el dueño podría convertir la misma solicitud
  // tres veces sin enterarse — que es exactamente cómo salieron cuatro «Boda ortega».
  const [eventosPorSolicitud, setEventosPorSolicitud] = useState({});

  // `filterEstricto`, no `list`: con `list` un fallo de lectura devuelve `[]` y la pantalla
  // dice "0 solicitudes recibidas" — indistinguible de que no haya ninguna.
  const load = useCallback(
    () =>
      base44.entities.SolicitudEvento.filterEstricto(null, "-created_date")
        .then((r) => { setSolicitudes(r); return r; })
        .catch(() => { setError("No se pudieron cargar las solicitudes. Recarga la página."); return null; })
        .finally(() => setCargando(false)),
    [],
  );
  useEffect(() => { load(); }, [load]);

  // `filterEstricto` y no `filter`: si esta lectura falla y devuelve [], el panel diría que
  // ninguna solicitud se ha convertido y ofrecería convertirlas otra vez. Ante la duda, no se
  // afirma nada — se deja el mapa vacío y el aviso de abajo no aparece, pero tampoco miente:
  // el error se ve, y la conversión sigue siendo idempotente por `solicitud_id`.
  const cargarConvertidas = useCallback(
    () =>
      base44.entities.Evento.filterEstricto(null, "-created_date")
        .then((evs) => {
          const mapa = {};
          for (const ev of evs) if (ev.solicitudId) mapa[ev.solicitudId] = ev;
          setEventosPorSolicitud(mapa);
        })
        .catch(() => setEventosPorSolicitud({})),
    [],
  );
  useEffect(() => { cargarConvertidas(); }, [cargarConvertidas]);

  const updateStatus = async (id, estatus) => {
    const previo = solicitudes.find((s) => s.id === id)?.estatus || "Nueva";
    if (guardando || estatus === previo) return;
    setGuardando(id); setError(""); setOk("");
    try {
      await base44.entities.SolicitudEvento.update(id, { estatus });

      // El shim da por buena una escritura que RLS haya dejado en 0 filas (J-02), así que se
      // confirma releyendo. `filterEstricto` lanza si la lectura falla, en vez de devolver [].
      const fila = (await base44.entities.SolicitudEvento.filterEstricto({ id }))[0];
      if (!fila) {
        throw amigable("No se pudo confirmar el cambio: la solicitud ya no está. Recarga la página.");
      }
      if (fila.estatus !== estatus) {
        throw amigable(
          `La base no aceptó el cambio. La solicitud sigue en «${fila.estatus || "Nueva"}».`,
        );
      }
      setSolicitudes((prev) => prev.map((s) => (s.id === id ? fila : s)));
      if (selected?.id === id) setSelected(fila);
      setOk(`Estatus guardado: «${estatus}».`);
    } catch (e) {
      console.error("[AdminSolicitudes] updateStatus", e?.message);
      setError(mensajeDeError(e, estatus));
      // El desplegable es controlado, así que se repone al valor REAL de la base: nunca se
      // queda enseñando un estatus que no está guardado.
      await load();
    } finally {
      setGuardando("");
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-white text-2xl font-thin">Solicitudes</h2>
        <p className="text-white/30 text-sm mt-1">{solicitudes.length} solicitudes recibidas.</p>
      </div>

      {error && (
        <p className="text-red-400/90 text-xs border border-red-400/20 bg-red-400/5 px-3 py-2 rounded flex items-start gap-2 mb-4">
          <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />{error}
        </p>
      )}
      {ok && <p className="text-green-400/80 text-xs mb-4">{ok}</p>}

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
              const fechaRecibida = s.fechaEnvio || (s.createdAt
                ? new Date(s.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" })
                : "—");
              const horaRecibida = s.horaEnvio || (s.createdAt
                ? new Date(s.createdAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false })
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
                  <div className="flex items-center gap-1.5">
                    <select
                      value={s.estatus || "Nueva"}
                      onChange={(e) => updateStatus(s.id, e.target.value)}
                      disabled={!!guardando}
                      className={`text-xs border px-2 py-1 bg-transparent outline-none cursor-pointer disabled:opacity-40 ${STATUS_COLORS[s.estatus || "Nueva"] || STATUS_COLORS.Nueva}`}
                    >
                      {ESTATUS.map((opt) => (
                        <option key={opt} value={opt} className="bg-[#111] text-white">{opt}</option>
                      ))}
                    </select>
                    {guardando === s.id && <Loader2 size={11} className="animate-spin text-white/30" />}
                  </div>
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
        {cargando && <div className="p-4"><EsqueletoFilas filas={5} alto="h-12" /></div>}
        {!cargando && solicitudes.length === 0 && (
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
                <Row label="Fecha de envío" value={selected.fechaEnvio || (selected.createdAt ? new Date(selected.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—")} />
                <Row label="Hora de envío" value={selected.horaEnvio || (selected.createdAt ? new Date(selected.createdAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false }) : "—")} />
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

              {/* CONVERTIR EN EVENTO.
                  Si esta solicitud YA generó uno, no se ofrece convertirla otra vez: se dice
                  cuál es. Desactivar el botón a secas sería opaco —el dueño no sabría si es un
                  fallo—, así que se nombra el evento y se explica. Es el mismo criterio que el
                  distintivo de homónimos: enseñar el dato que distingue, no esconder el botón. */}
              <div className="border-t border-white/5 pt-5">
                {eventosPorSolicitud[selected.id] ? (
                  <div className="border border-green-400/25 bg-green-400/5 px-4 py-3 rounded space-y-1">
                    <p className="text-green-300/90 text-sm flex items-center gap-2">
                      <CheckCircle2 size={14} /> Esta solicitud ya se convirtió en evento
                    </p>
                    <p className="text-white/50 text-xs">
                      El evento es «{eventosPorSolicitud[selected.id].nombreEvento}»
                      {eventosPorSolicitud[selected.id].fechaEvento
                        ? ` · ${eventosPorSolicitud[selected.id].fechaEvento}` : ""}.
                      Búscalo en <strong className="text-white/70">Eventos</strong>. Si de verdad
                      hacen falta dos eventos de esta solicitud, créalo desde ahí a mano.
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => { onConvertir?.(selected); setSelected(null); }}
                    disabled={!onConvertir}
                    title={onConvertir ? "Abre el alta de evento con estos datos ya puestos"
                                       : "No disponible desde aquí"}
                    className="flex items-center gap-2 bg-[#C9A84C] text-[#0a0a0a] px-5 py-2.5 text-sm font-medium hover:bg-[#d4b558] transition-all disabled:opacity-40"
                  >
                    <CalendarPlus size={14} /> Crear evento con estos datos
                  </button>
                )}
              </div>
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