import { useState, useEffect, useCallback } from "react";
import QRCode from "qrcode";
import { base44 } from "@/api/base44Client";
import { Plus, Loader2, Trash2, Printer, QrCode, ExternalLink, Users } from "lucide-react";
import QrImg from "./QrImg";

const accesoUrl = (token) => `${window.location.origin}/acceso/${token}`;
const nuevoToken = () => (crypto.randomUUID ? crypto.randomUUID() : "t-" + Date.now() + Math.random().toString(36).slice(2));

export default function EventoMeseros({ eventoId }) {
  const [mesas, setMesas] = useState([]);
  const [invitaciones, setInvitaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mesaId, setMesaId] = useState("");
  const [nombre, setNombre] = useState("");
  const [maxPersonas, setMaxPersonas] = useState("");
  const [generando, setGenerando] = useState(false);

  const cargar = useCallback(async () => {
    const [ms, invs] = await Promise.all([
      base44.entities.Mesa.filter({ eventoId }, "orden"),
      base44.entities.Invitacion.filter({ eventoId }, "-created_date"),
    ]);
    setMesas(ms);
    setInvitaciones(invs);
    setCargando(false);
  }, [eventoId]);
  useEffect(() => { cargar(); }, [cargar]);

  const mesaNombre = (id) => mesas.find((m) => m.id === id)?.nombre || "Sin mesa";
  const mesaCap = (id) => mesas.find((m) => m.id === id)?.capacidad || 1;

  const generar = async () => {
    if (!mesaId) return;
    setGenerando(true);
    await base44.entities.Invitacion.create({
      eventoId, mesaId,
      nombreInvitado: nombre.trim() || null,
      token: nuevoToken(),
      maxPersonas: maxPersonas ? Number(maxPersonas) : mesaCap(mesaId),
      personasRegistradas: 0,
      estatus: "pendiente",
    });
    setNombre(""); setMaxPersonas("");
    setGenerando(false);
    cargar();
  };

  const generarPorMesa = async () => {
    setGenerando(true);
    // Una invitación por mesa que aún no tenga ninguna, con cupo = capacidad.
    const conInvitacion = new Set(invitaciones.map((i) => i.mesaId));
    for (const m of mesas) {
      if (conInvitacion.has(m.id)) continue;
      await base44.entities.Invitacion.create({
        eventoId, mesaId: m.id, nombreInvitado: null, token: nuevoToken(),
        maxPersonas: m.capacidad || 1, personasRegistradas: 0, estatus: "pendiente",
      });
    }
    setGenerando(false);
    cargar();
  };

  const borrar = async (id) => {
    if (!confirm("¿Eliminar esta invitación?")) return;
    await base44.entities.Invitacion.delete(id);
    cargar();
  };

  const imprimir = async () => {
    const cards = await Promise.all(invitaciones.map(async (inv) => {
      const url = await QRCode.toDataURL(accesoUrl(inv.token), { width: 220, margin: 1 });
      return `<div style="display:inline-block;width:230px;margin:10px;padding:14px;border:1px solid #ccc;text-align:center;font-family:sans-serif;page-break-inside:avoid;">
        <img src="${url}" width="200" height="200"/>
        <div style="font-size:15px;font-weight:600;margin-top:6px;">${inv.nombreInvitado || "Invitado"}</div>
        <div style="font-size:13px;color:#555;">${mesaNombre(inv.mesaId)} · ${inv.maxPersonas} pers.</div>
      </div>`;
    }));
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>Invitaciones — QR</title></head><body style="text-align:center;">${cards.join("")}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  // Progreso por mesa (personas registradas vs capacidad)
  const progresoMesa = (id) => {
    const invs = invitaciones.filter((i) => i.mesaId === id);
    const reg = invs.reduce((a, i) => a + Number(i.personasRegistradas || 0), 0);
    return { reg, cap: mesaCap(id) };
  };

  if (cargando) return <p className="text-white/25 text-sm py-10 text-center">Cargando…</p>;

  return (
    <div>
      {mesas.length === 0 && (
        <p className="text-amber-400/70 text-sm mb-4">Primero crea mesas (pestaña Mesas) para poder generar invitaciones.</p>
      )}

      {/* Generar */}
      <div className="bg-[#111] border border-white/5 p-5 mb-5 space-y-3">
        <p className="text-white/60 text-sm uppercase tracking-wider flex items-center gap-2"><QrCode size={14} /> Generar invitación</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <select value={mesaId} onChange={(e) => setMesaId(e.target.value)}
            className="bg-white/5 border border-white/10 text-white/70 text-sm px-3 py-2.5 outline-none focus:border-[#C9A84C]/40">
            <option value="" className="bg-[#111]">— Mesa —</option>
            {mesas.map((m) => <option key={m.id} value={m.id} className="bg-[#111]">{m.nombre} ({m.capacidad}p)</option>)}
          </select>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del invitado (opcional)"
            className="bg-white/5 border border-white/10 text-white/70 text-sm px-3 py-2.5 outline-none focus:border-[#C9A84C]/40" />
          <input type="number" min="1" value={maxPersonas} onChange={(e) => setMaxPersonas(e.target.value)} placeholder="Cupo (def. capacidad)"
            className="bg-white/5 border border-white/10 text-white/70 text-sm px-3 py-2.5 outline-none focus:border-[#C9A84C]/40" />
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={generar} disabled={generando || !mesaId}
            className="flex items-center gap-2 bg-[#C9A84C] text-[#0a0a0a] px-5 py-2.5 text-sm font-medium hover:bg-[#d4b558] transition-all disabled:opacity-50">
            {generando ? <Loader2 size={13} className="animate-spin" /> : <Plus size={14} />} Generar
          </button>
          <button onClick={generarPorMesa} disabled={generando || mesas.length === 0}
            className="flex items-center gap-2 border border-white/10 text-white/50 px-4 py-2.5 text-sm hover:text-white/80 transition-all disabled:opacity-50">
            1 por mesa
          </button>
          {invitaciones.length > 0 && (
            <button onClick={imprimir} className="flex items-center gap-2 border border-[#C9A84C]/30 text-[#C9A84C] px-4 py-2.5 text-sm hover:bg-[#C9A84C]/10 transition-all ml-auto">
              <Printer size={14} /> Imprimir todas
            </button>
          )}
        </div>
      </div>

      {/* Progreso por mesa */}
      {mesas.length > 0 && (
        <div className="mb-5">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5"><Users size={12} /> Avance por mesa</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {mesas.map((m) => {
              const { reg, cap } = progresoMesa(m.id);
              const pct = cap ? Math.min(100, (reg / cap) * 100) : 0;
              return (
                <div key={m.id} className="bg-[#111] border border-white/5 px-4 py-3">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-white/70">{m.nombre}</span>
                    <span className="text-[#C9A84C]">{reg}/{cap}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded overflow-hidden">
                    <div className="h-full bg-[#C9A84C]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Invitaciones (QR) */}
      <div className="grid sm:grid-cols-2 gap-3">
        {invitaciones.map((inv) => (
          <div key={inv.id} className="bg-[#111] border border-white/5 p-4 flex gap-4">
            <QrImg text={accesoUrl(inv.token)} size={96} />
            <div className="flex-1 min-w-0">
              <p className="text-white/80 text-sm truncate">{inv.nombreInvitado || "Invitado"}</p>
              <p className="text-white/30 text-xs">{mesaNombre(inv.mesaId)}</p>
              <p className="text-[#C9A84C]/80 text-xs mt-1">{inv.personasRegistradas || 0}/{inv.maxPersonas} personas · {inv.estatus}</p>
              <div className="flex gap-3 mt-2">
                <a href={accesoUrl(inv.token)} target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-[#C9A84C] transition-colors" title="Abrir acceso"><ExternalLink size={14} /></a>
                <button onClick={() => borrar(inv.id)} className="text-white/30 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
        {invitaciones.length === 0 && <p className="text-white/20 text-sm py-6 text-center sm:col-span-2">Aún no hay invitaciones.</p>}
      </div>
    </div>
  );
}
