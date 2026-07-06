import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Check, KeyRound } from "lucide-react";
import { Field, Area, Toggle, ESTATUS } from "./_ui";

export default function EventoDatos({ evento, salones, onActualizado }) {
  const [form, setForm] = useState({ ...evento });
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setOk(false); };

  // Credenciales (solo si el evento aún no tiene usuario ligado).
  const [cred, setCred] = useState({ usuario: "", password: "" });
  const [credMsg, setCredMsg] = useState("");
  const [credBusy, setCredBusy] = useState(false);

  const guardar = async () => {
    setGuardando(true);
    const patch = {
      nombreEvento: form.nombreEvento,
      tipoEvento: form.tipoEvento || null,
      fechaEvento: form.fechaEvento || null,
      salonId: form.salonId || null,
      estatus: form.estatus || "Apartado",
      clienteNombre: form.clienteNombre || null,
      clienteEmail: form.clienteEmail || null,
      clienteTelefono: form.clienteTelefono || null,
      notas: form.notas || null,
      portalActivo: !!form.portalActivo,
      anticipoPagado: !!form.anticipoPagado,
    };
    const actualizado = await base44.entities.Evento.update(evento.id, patch);
    setGuardando(false);
    setOk(true);
    onActualizado?.({ ...evento, ...patch, ...actualizado });
  };

  const crearCredenciales = async () => {
    setCredMsg("");
    if (!cred.usuario.trim() || cred.password.length < 6) {
      setCredMsg("Usuario y contraseña (mín. 6) requeridos.");
      return;
    }
    setCredBusy(true);
    try {
      const r = await base44.functions.crearUsuarioEvento({
        usuario: cred.usuario.trim(), password: cred.password,
        eventoId: evento.id, nombre: form.clienteNombre || form.nombreEvento,
      });
      setCredMsg("Credenciales creadas. Usuario: " + r.usuario);
      onActualizado?.({ ...evento, usuario: r.usuario, authUserId: r.userId });
    } catch (e) {
      setCredMsg("Error: " + e.message);
    } finally {
      setCredBusy(false);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <Field label="Nombre del evento" value={form.nombreEvento} onChange={(v) => set("nombreEvento", v)} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo" value={form.tipoEvento} onChange={(v) => set("tipoEvento", v)} />
        <Field label="Fecha" value={form.fechaEvento} onChange={(v) => set("fechaEvento", v)} type="date" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Salón</label>
          <select value={form.salonId || ""} onChange={(e) => set("salonId", e.target.value)}
            className="w-full bg-white/5 border border-white/10 text-white/70 text-sm px-4 py-3 outline-none focus:border-[#C9A84C]/40">
            <option value="" className="bg-[#111]">— Sin asignar —</option>
            {salones.map((s) => <option key={s.id} value={s.id} className="bg-[#111]">{s.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Estatus</label>
          <select value={form.estatus || "Apartado"} onChange={(e) => set("estatus", e.target.value)}
            className="w-full bg-white/5 border border-white/10 text-white/70 text-sm px-4 py-3 outline-none focus:border-[#C9A84C]/40">
            {ESTATUS.map((s) => <option key={s} value={s} className="bg-[#111]">{s}</option>)}
          </select>
        </div>
      </div>

      <div className="border-t border-white/5 pt-4 space-y-3">
        <p className="text-white/40 text-xs uppercase tracking-wider">Contacto del cliente</p>
        <Field label="Nombre" value={form.clienteNombre} onChange={(v) => set("clienteNombre", v)} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Correo" value={form.clienteEmail} onChange={(v) => set("clienteEmail", v)} type="email" />
          <Field label="Teléfono" value={form.clienteTelefono} onChange={(v) => set("clienteTelefono", v)} />
        </div>
      </div>

      <Area label="Notas internas" value={form.notas} onChange={(v) => set("notas", v)} />

      <div className="border-t border-white/5 pt-4 space-y-3">
        <Toggle label="Anticipo pagado" checked={!!form.anticipoPagado} onChange={(v) => set("anticipoPagado", v)} />
        <Toggle label="Portal activo" hint="Prende el acceso del cliente a su portal (tras el anticipo)."
          checked={!!form.portalActivo} onChange={(v) => set("portalActivo", v)} />
      </div>

      <div className="flex items-center gap-3">
        <button onClick={guardar} disabled={guardando}
          className="flex items-center gap-2 bg-[#C9A84C] text-[#0a0a0a] px-6 py-2.5 text-sm font-medium hover:bg-[#d4b558] transition-all disabled:opacity-50">
          {guardando ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Guardar cambios
        </button>
        {ok && <span className="text-green-400/80 text-xs">Guardado.</span>}
      </div>

      {/* Credenciales de acceso */}
      <div className="border-t border-white/5 pt-4">
        <p className="text-white/40 text-xs uppercase tracking-wider mb-2 flex items-center gap-2"><KeyRound size={13} /> Acceso al portal</p>
        {evento.usuario ? (
          <p className="text-white/50 text-sm">Usuario asignado: <span className="text-[#C9A84C]">{evento.usuario}</span></p>
        ) : (
          <div className="space-y-3">
            <p className="text-white/25 text-xs">Este evento aún no tiene credenciales. Créalas para habilitar el portal del cliente.</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Usuario" value={cred.usuario} onChange={(v) => setCred((c) => ({ ...c, usuario: v }))} />
              <Field label="Contraseña" value={cred.password} onChange={(v) => setCred((c) => ({ ...c, password: v }))} />
            </div>
            <button onClick={crearCredenciales} disabled={credBusy}
              className="flex items-center gap-2 border border-[#C9A84C]/40 text-[#C9A84C] px-4 py-2 text-sm hover:bg-[#C9A84C]/10 transition-all disabled:opacity-50">
              {credBusy ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />} Crear credenciales
            </button>
            {credMsg && <p className="text-white/50 text-xs">{credMsg}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
