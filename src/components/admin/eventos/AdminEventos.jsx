import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Loader2, Check, Search, Calendar, User, DoorOpen } from "lucide-react";
import { Field, Area, ESTATUS, estatusColor } from "./_ui";
import EventoFicha from "./EventoFicha";

const FORM_VACIO = {
  nombreEvento: "", tipoEvento: "", fechaEvento: "", salonId: "",
  clienteNombre: "", clienteEmail: "", clienteTelefono: "",
  usuario: "", password: "",
};

export default function AdminEventos() {
  const [eventos, setEventos] = useState([]);
  const [salones, setSalones] = useState([]);
  const [abierto, setAbierto] = useState(null); // evento seleccionado (ficha)
  const [creando, setCreando] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [filtro, setFiltro] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");

  const cargar = async () => {
    const [evs, sals] = await Promise.all([
      base44.entities.Evento.list("-created_date"),
      base44.entities.Salon.list("orden"),
    ]);
    setEventos(evs);
    setSalones(sals);
  };
  useEffect(() => { cargar(); }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const salonNombre = (id) => salones.find((s) => s.id === id)?.nombre || "—";

  const abrirCrear = () => { setForm(FORM_VACIO); setError(""); setAviso(""); setCreando(true); };

  const crear = async () => {
    setError(""); setAviso("");
    if (!form.nombreEvento.trim() || !form.usuario.trim() || !form.password) {
      setError("Nombre del evento, usuario y contraseña son obligatorios.");
      return;
    }
    if (form.password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres."); return; }
    setGuardando(true);
    let evento;
    try {
      // 1) Crear la fila del evento.
      evento = await base44.entities.Evento.create({
        nombreEvento: form.nombreEvento.trim(),
        tipoEvento: form.tipoEvento || null,
        fechaEvento: form.fechaEvento || null,
        salonId: form.salonId || null,
        clienteNombre: form.clienteNombre || null,
        clienteEmail: form.clienteEmail || null,
        clienteTelefono: form.clienteTelefono || null,
        estatus: "Apartado",
        portalActivo: false,
      });
      // 2) Reglas de mesas por defecto.
      await base44.entities.EventoReglasMesas.create({
        eventoId: evento.id,
        formasPermitidas: ["redonda", "cuadrada"],
        opcionesPersonas: [8, 10, 12],
        capacidadLibre: false,
        clientePuedeEditar: false,
      });
      // 3) Crear el usuario de Auth del cliente (server-side).
      await base44.functions.crearUsuarioEvento({
        usuario: form.usuario.trim(),
        password: form.password,
        eventoId: evento.id,
        nombre: form.clienteNombre || form.nombreEvento,
      });
      setCreando(false);
      await cargar();
    } catch (e) {
      // El evento pudo quedar creado sin credenciales: se avisa y se permite reintentar en la ficha.
      if (evento) {
        setAviso("El evento se creó, pero no se pudo crear el usuario del cliente: " + e.message +
          ". Puedes reintentar las credenciales desde la ficha del evento.");
        await cargar();
      } else {
        setError("No se pudo crear el evento: " + e.message);
      }
    } finally {
      setGuardando(false);
    }
  };

  if (abierto) {
    return (
      <EventoFicha
        evento={abierto}
        salones={salones}
        onVolver={() => { setAbierto(null); cargar(); }}
        onActualizado={(ev) => { setAbierto(ev); cargar(); }}
      />
    );
  }

  const lista = eventos
    .filter((e) => filtro === "Todos" || e.estatus === filtro)
    .filter((e) => {
      const q = busqueda.trim().toLowerCase();
      if (!q) return true;
      return [e.nombreEvento, e.clienteNombre, e.usuario, e.tipoEvento].some((v) => (v || "").toLowerCase().includes(q));
    });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white text-2xl font-thin">Eventos</h2>
          <p className="text-white/30 text-sm mt-1">Todos los eventos y sus portales de cliente.</p>
        </div>
        <button onClick={abrirCrear}
          className="flex items-center gap-2 bg-[#C9A84C] text-[#0a0a0a] px-5 py-2.5 text-sm font-medium hover:bg-[#d4b558] transition-all">
          <Plus size={14} /> Nuevo evento
        </button>
      </div>

      {creando && (
        <div className="bg-[#111] border border-[#C9A84C]/20 p-6 mb-6">
          <h3 className="text-white/70 text-sm mb-5 uppercase tracking-wider">Nuevo evento</h3>
          <div className="space-y-4">
            <Field label="Nombre del evento *" value={form.nombreEvento} onChange={(v) => set("nombreEvento", v)} placeholder="Boda Ana & Luis" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipo de evento" value={form.tipoEvento} onChange={(v) => set("tipoEvento", v)} placeholder="Boda, XV, corporativo…" />
              <Field label="Fecha" value={form.fechaEvento} onChange={(v) => set("fechaEvento", v)} type="date" />
            </div>
            <div>
              <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Salón</label>
              <select value={form.salonId} onChange={(e) => set("salonId", e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white/70 text-sm px-4 py-3 outline-none focus:border-[#C9A84C]/40">
                <option value="" className="bg-[#111]">— Sin asignar —</option>
                {salones.map((s) => <option key={s.id} value={s.id} className="bg-[#111]">{s.nombre}</option>)}
              </select>
            </div>

            <div className="border-t border-white/5 pt-4">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Datos de contacto del cliente (informativos)</p>
              <div className="space-y-3">
                <Field label="Nombre del cliente" value={form.clienteNombre} onChange={(v) => set("clienteNombre", v)} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Correo (contacto)" value={form.clienteEmail} onChange={(v) => set("clienteEmail", v)} type="email" />
                  <Field label="Teléfono" value={form.clienteTelefono} onChange={(v) => set("clienteTelefono", v)} />
                </div>
              </div>
            </div>

            <div className="border-t border-white/5 pt-4">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Acceso al portal (usuario + contraseña)</p>
              <p className="text-white/25 text-xs mb-3">El cliente entra SOLO con estos datos (sin correo). Anótalos: la contraseña no se puede recuperar después.</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Usuario *" value={form.usuario} onChange={(v) => set("usuario", v)} placeholder="ana-luis" />
                <Field label="Contraseña *" value={form.password} onChange={(v) => set("password", v)} />
              </div>
            </div>

            {error && <p className="text-red-400 text-xs">{error}</p>}
            {aviso && <p className="text-amber-400/80 text-xs">{aviso}</p>}
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={crear} disabled={guardando}
              className="flex items-center gap-2 bg-[#C9A84C] text-[#0a0a0a] px-6 py-2.5 text-sm font-medium hover:bg-[#d4b558] transition-all disabled:opacity-50">
              {guardando ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Crear evento
            </button>
            <button onClick={() => setCreando(false)} className="px-6 py-2.5 border border-white/10 text-white/40 hover:text-white/60 text-sm transition-all">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar evento, cliente o usuario…"
            className="w-full bg-white/5 border border-white/10 text-white/70 text-sm pl-9 pr-4 py-2.5 outline-none focus:border-[#C9A84C]/40" />
        </div>
        {["Todos", ...ESTATUS].map((s) => (
          <button key={s} onClick={() => setFiltro(s)}
            className={`px-3.5 py-2 text-xs rounded-full transition-all ${filtro === s ? "bg-[#C9A84C]/15 text-[#C9A84C] border border-[#C9A84C]/40" : "text-white/30 hover:text-white/60 border border-white/10"}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
        {lista.map((e) => (
          <button key={e.id} onClick={() => setAbierto(e)}
            className="skeu-card skeu-card-hover w-full flex items-center gap-4 px-5 py-4 text-left">
            <div className="w-10 h-10 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center flex-shrink-0">
              <Calendar size={16} className="text-[#C9A84C]/70" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/90 text-sm font-medium truncate">{e.nombreEvento}</p>
              <div className="flex items-center gap-3 mt-1 text-white/35 text-xs">
                <span>{e.fechaEvento || "sin fecha"}</span>
                <span className="flex items-center gap-1 truncate"><User size={11} />{e.clienteNombre || e.usuario || "—"}</span>
                <span className="truncate hidden sm:inline">{salonNombre(e.salonId)}</span>
              </div>
            </div>
            {e.portalActivo && <span className="flex items-center gap-1 text-green-400/70 text-xs flex-shrink-0"><DoorOpen size={12} /> Portal</span>}
            <span className={`text-xs px-2.5 py-1 rounded-full flex-shrink-0 ${estatusColor(e.estatus)}`}>{e.estatus || "Apartado"}</span>
          </button>
        ))}
        {lista.length === 0 && <p className="text-white/20 text-sm py-8 text-center">No hay eventos que coincidan.</p>}
      </div>
    </div>
  );
}
