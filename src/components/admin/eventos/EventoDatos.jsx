import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Check, KeyRound, Heart, StickyNote, Inbox, AlertTriangle } from "lucide-react";
import { Field, Area, Toggle, ESTATUS } from "./_ui";
import EventoEliminar from "./EventoEliminar";
import { validarCredenciales, AYUDA_USUARIO, AYUDA_PASSWORD } from "../../../../api/_lib/reglas-credenciales.js";

export default function EventoDatos({ evento, salones, salonesFallaron = false, onActualizado, onBorrado }) {
  const [form, setForm] = useState({ ...evento });
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);
  const [errorNombre, setErrorNombre] = useState("");
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setOk(false); if (k === "nombreEvento") setErrorNombre(""); };

  // Credenciales (solo si el evento aún no tiene usuario ligado).
  const [cred, setCred] = useState({ usuario: "", password: "" });
  const [credMsg, setCredMsg] = useState("");
  const [credBusy, setCredBusy] = useState(false);

  // De qué solicitud salió este evento (`sec_25`). Se lee aparte porque el evento solo guarda
  // el id: enseñar un uuid no le dice nada a nadie, y el folio sí.
  //
  // TRES estados, no uno. Antes era un solo `null` para "todavía no ha llegado" y para "la
  // lectura se cayó", y con `filter` —que devuelve [] sin lanzar— la ficha se quedaba diciendo
  // «salió de la solicitud (cargando…)» **para siempre**. J-02 en pequeño.
  const [solicitudOrigen, setSolicitudOrigen] = useState(null);
  const [origenEstado, setOrigenEstado] = useState("cargando"); // cargando | ok | fallo

  // Lo que el cliente armó en su portal (lectura: wishlist + notas).
  const [deseos, setDeseos] = useState([]);
  const [notasCliente, setNotasCliente] = useState([]);
  useEffect(() => {
    if (!evento.solicitudId) { setSolicitudOrigen(null); setOrigenEstado("ok"); return; }
    setOrigenEstado("cargando");
    // `filterEstricto`: con `filter`, un fallo devuelve [] sin lanzar y el `.catch` no se
    // dispara nunca, así que el fallo era indistinguible de "todavía no ha llegado".
    base44.entities.SolicitudEvento.filterEstricto({ id: evento.solicitudId })
      .then((r) => { setSolicitudOrigen(r[0] || null); setOrigenEstado("ok"); })
      .catch(() => { setSolicitudOrigen(null); setOrigenEstado("fallo"); });
  }, [evento.solicitudId]);

  useEffect(() => {
    base44.entities.EventoWishlist.filter({ eventoId: evento.id }, "-created_date").then(setDeseos);
    base44.entities.EventoNota.filter({ eventoId: evento.id }, "-created_date").then(setNotasCliente);
  }, [evento.id]);

  const guardar = async () => {
    // El nombre en blanco no es solo feo: el borrado se confirma escribiendo el nombre exacto,
    // y con "" esa confirmación se cumple sola. `AdminEventos` ya lo exige al crear; aquí se
    // guardaba sin mirar, así que el candado se podía quitar desde esta pantalla.
    if (!String(form.nombreEvento || "").trim()) {
      setErrorNombre("El evento necesita un nombre. Es lo que se pide escribir para confirmar un borrado.");
      return;
    }
    setErrorNombre("");
    setGuardando(true);
    const patch = {
      nombreEvento: form.nombreEvento.trim(),
      tipoEvento: form.tipoEvento || null,
      fechaEvento: form.fechaEvento || null,
      salonId: form.salonId || null,
      estatus: form.estatus || "Apartado",
      clienteNombre: form.clienteNombre || null,
      clienteEmail: form.clienteEmail || null,
      clienteTelefono: form.clienteTelefono || null,
      notas: form.notas || null,
      portalActivo: !!form.portalActivo,
      montoTotal: form.montoTotal !== "" && form.montoTotal != null ? Number(form.montoTotal) : null,
      anticipoMonto: form.anticipoMonto !== "" && form.anticipoMonto != null ? Number(form.anticipoMonto) : null,
      // Se deriva del monto, que es el único dato de anticipo que el panel captura.
      // Antes era `... ? true : !!form.anticipoPagado`, un latch de un solo sentido:
      // subía a true al guardar un monto y nada volvía a bajarlo, porque el `else`
      // reponía el valor que ya venía de la base. Un anticipo capturado por error
      // quedaba marcado para siempre. Ahora borrar el monto lo revierte.
      anticipoPagado: Number(form.anticipoMonto) > 0,
    };
    const actualizado = await base44.entities.Evento.update(evento.id, patch);
    setGuardando(false);
    setOk(true);
    onActualizado?.({ ...evento, ...patch, ...actualizado });
  };

  const crearCredenciales = async () => {
    setCredMsg("");
    // MISMA validación que el servidor, del mismo archivo. Esta pantalla es la que se usa
    // para terminar un evento que quedó sin credenciales, así que un rechazo tardío aquí
    // es todavía más confuso que en el alta.
    const v = validarCredenciales({
      usuario: cred.usuario.trim(), password: cred.password,
      nombre: form.clienteNombre || form.nombreEvento,
    });
    if (!v.ok) { setCredMsg(v.mensaje); return; }
    setCredBusy(true);
    try {
      const r = await base44.functions.crearUsuarioEvento({
        usuario: cred.usuario.trim(), password: cred.password,
        eventoId: evento.id, nombre: form.clienteNombre || form.nombreEvento,
      });
      // `duplicado` = el alta ya había ocurrido (reintento tras un 200 perdido).
      // El servidor devuelve la identidad releída de la fila, así que el estado
      // se actualiza igual; lo que cambia es que no se anuncia como recién creada
      // ni se afirma nada del correo, que salió en la ejecución original.
      setCredMsg(
        r.duplicado
          ? `Ese usuario ya existía: las credenciales de "${r.usuario}" ya estaban creadas.`
          : "Credenciales creadas. Usuario: " + r.usuario +
            (r.correoEnviado
              ? " · Se envió el correo de bienvenida con sus accesos al cliente. ✉️"
              : " · No se envió correo (el evento no tiene correo de contacto).")
      );
      onActualizado?.({ ...evento, usuario: r.usuario, authUserId: r.userId });
    } catch (e) {
      setCredMsg("Error: " + e.message);
    } finally {
      setCredBusy(false);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <Field label="Nombre del evento" value={form.nombreEvento} onChange={(v) => set("nombreEvento", v)} />
        {errorNombre && <p className="text-red-400 text-xs mt-1.5">{errorNombre}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo" value={form.tipoEvento} onChange={(v) => set("tipoEvento", v)} />
        <Field label="Fecha" value={form.fechaEvento} onChange={(v) => set("fechaEvento", v)} type="date" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Salón</label>
          {/* Sin esto, una lectura caída deja el desplegable con una sola opción —«Sin asignar»—
              y ninguna pista de por qué. El dueño concluiría que se borraron los salones. */}
          {salonesFallaron && (
            <p className="text-amber-300/85 text-xs mb-1.5 flex items-start gap-1.5">
              <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
              No se pudo leer la lista de salones: aquí no sale ninguno. No es que se hayan
              borrado. Vuelve a Eventos y recarga.
            </p>
          )}
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

      {evento.solicitudId && (
        <div className="border border-[#C9A84C]/20 bg-[#C9A84C]/5 px-4 py-2.5 rounded">
          <p className="text-[#E6C870]/90 text-xs flex items-center gap-2">
            <Inbox size={13} /> Este evento salió de una solicitud{" "}
            {origenEstado === "ok" && solicitudOrigen && <strong>{solicitudOrigen.folio || "(sin folio)"}</strong>}
            {origenEstado === "cargando" && <span className="text-white/35">(buscando cuál…)</span>}
            {origenEstado === "ok" && solicitudOrigen?.nombreCompleto ? ` · ${solicitudOrigen.nombreCompleto}` : ""}
          </p>
          {origenEstado === "ok" && solicitudOrigen && (
            <p className="text-white/35 text-xs mt-1">
              Recibida el {solicitudOrigen.fechaEnvio || "—"}
              {solicitudOrigen.estatus ? ` · la solicitud está en «${solicitudOrigen.estatus}»` : ""}
            </p>
          )}
          {origenEstado === "ok" && !solicitudOrigen && (
            <p className="text-white/35 text-xs mt-1">
              La solicitud ya no existe: se borró después de crear el evento.
            </p>
          )}
          {origenEstado === "fallo" && (
            <p className="text-amber-300/85 text-xs mt-1 flex items-start gap-1.5">
              <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
              No se pudo leer cuál. No es que no exista: la lectura falló. Recarga la página.
            </p>
          )}
        </div>
      )}

      <Area label="Notas internas" value={form.notas} onChange={(v) => set("notas", v)} />

      {/* Pagos / anticipo */}
      <div className="border-t border-white/5 pt-4 space-y-3">
        <p className="text-white/40 text-xs uppercase tracking-wider">Pagos del evento</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Monto total (MXN)" value={form.montoTotal ?? ""} onChange={(v) => set("montoTotal", v)} type="number" />
          <Field label="Anticipo pagado (MXN)" value={form.anticipoMonto ?? ""} onChange={(v) => set("anticipoMonto", v)} type="number" />
        </div>
        {Number(form.montoTotal) > 0 && (
          <p className="text-white/40 text-xs">
            Pagado <span className="text-[#C9A84C]">${(Number(form.anticipoMonto) || 0).toLocaleString("es-MX")}</span> de
            ${Number(form.montoTotal).toLocaleString("es-MX")} · resta
            <span className="text-[#C9A84C]"> ${Math.max(0, Number(form.montoTotal) - (Number(form.anticipoMonto) || 0)).toLocaleString("es-MX")}</span>
          </p>
        )}
      </div>

      <div className="border-t border-white/5 pt-4 space-y-3">
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

      {/* Lo que el cliente sueña (wishlist + notas de su portal) */}
      {(deseos.length > 0 || notasCliente.length > 0) && (
        <div className="border-t border-white/5 pt-4 space-y-3">
          <p className="text-white/40 text-xs uppercase tracking-wider flex items-center gap-2">
            <Heart size={13} className="text-[#C9A84C]/70" /> Lo que el cliente quiere (desde su portal)
          </p>
          {deseos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {deseos.map((d) => (
                <span key={d.id} className="bg-[#C9A84C]/10 border border-[#C9A84C]/25 text-[#E6C870] text-xs px-2.5 py-1.5 rounded-full">
                  {d.titulo}
                </span>
              ))}
            </div>
          )}
          {notasCliente.length > 0 && (
            <div className="space-y-1.5">
              {notasCliente.map((n) => (
                <p key={n.id} className="flex items-start gap-2 text-white/45 text-xs leading-relaxed">
                  <StickyNote size={11} className="text-[#C9A84C]/50 flex-shrink-0 mt-0.5" /> {n.texto}
                </p>
              ))}
            </div>
          )}
          <p className="text-white/20 text-[11px]">Es su lista de deseos: no modifica lo contratado. Úsala para darle seguimiento.</p>
        </div>
      )}

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
            <p className="text-white/25 text-[11px]">
              <span className="text-white/35">Usuario:</span> {AYUDA_USUARIO}{" "}
              <span className="text-white/35">· Contraseña:</span> {AYUDA_PASSWORD}
            </p>
            <button onClick={crearCredenciales} disabled={credBusy}
              className="flex items-center gap-2 border border-[#C9A84C]/40 text-[#C9A84C] px-4 py-2 text-sm hover:bg-[#C9A84C]/10 transition-all disabled:opacity-50">
              {credBusy ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />} Crear credenciales
            </button>
            {credMsg && <p className="text-white/50 text-xs">{credMsg}</p>}
          </div>
        )}
      </div>

      {/* Zona de peligro, al final y separada: el borrado es lo único irreversible del panel. */}
      <div className="border-t border-red-400/15 pt-5 mt-2">
        <p className="text-red-400/50 text-xs uppercase tracking-wider mb-3">Zona de peligro</p>
        <EventoEliminar evento={evento} onBorrado={onBorrado} />
      </div>

    </div>
  );
}
