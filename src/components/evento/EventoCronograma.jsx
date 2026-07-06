import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Loader2, Trash2, Clock } from "lucide-react";

/**
 * Cronograma del evento. Reutilizable por el panel admin (editable) y el portal del
 * cliente (editable según `evento_reglas`/permiso). Con `editable=false` solo muestra.
 */
export default function EventoCronograma({ eventoId, editable = false }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ hora: "", titulo: "", descripcion: "" });
  const [guardando, setGuardando] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const ordenar = (arr) => [...arr].sort((a, b) => (a.hora || "").localeCompare(b.hora || "") || (a.orden || 0) - (b.orden || 0));
  const cargar = () => base44.entities.Cronograma.filter({ eventoId }, "orden").then((r) => setItems(ordenar(r)));
  useEffect(() => { cargar(); }, [eventoId]);

  const agregar = async () => {
    if (!form.titulo.trim()) return;
    setGuardando(true);
    await base44.entities.Cronograma.create({
      eventoId,
      hora: form.hora || null,
      titulo: form.titulo.trim(),
      descripcion: form.descripcion || null,
      orden: items.length + 1,
    });
    setForm({ hora: "", titulo: "", descripcion: "" });
    setGuardando(false);
    cargar();
  };

  const borrar = async (id) => { await base44.entities.Cronograma.delete(id); cargar(); };

  return (
    <div className="max-w-2xl">
      {editable && (
        <div className="bg-[#111] border border-white/5 p-5 mb-5 space-y-3">
          <div className="grid grid-cols-[110px_1fr] gap-3">
            <div>
              <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Hora</label>
              <input type="time" value={form.hora} onChange={(e) => set("hora", e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white/70 text-sm px-3 py-2.5 outline-none focus:border-[#C9A84C]/40" />
            </div>
            <div>
              <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Momento *</label>
              <input value={form.titulo} onChange={(e) => set("titulo", e.target.value)} placeholder="Ceremonia, brindis, primer baile…"
                className="w-full bg-white/5 border border-white/10 text-white/70 text-sm px-4 py-2.5 outline-none focus:border-[#C9A84C]/40" />
            </div>
          </div>
          <input value={form.descripcion} onChange={(e) => set("descripcion", e.target.value)} placeholder="Detalle (opcional)"
            className="w-full bg-white/5 border border-white/10 text-white/70 text-sm px-4 py-2.5 outline-none focus:border-[#C9A84C]/40" />
          <button onClick={agregar} disabled={guardando || !form.titulo.trim()}
            className="flex items-center gap-2 bg-[#C9A84C] text-[#0a0a0a] px-5 py-2.5 text-sm font-medium hover:bg-[#d4b558] transition-all disabled:opacity-50">
            {guardando ? <Loader2 size={13} className="animate-spin" /> : <Plus size={14} />} Agregar
          </button>
        </div>
      )}

      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-4 bg-[#111] border border-white/5 px-4 py-3">
            <div className="flex items-center gap-2 text-[#C9A84C]/70 w-20 flex-shrink-0">
              <Clock size={13} />
              <span className="text-sm tabular-nums">{(it.hora || "").slice(0, 5) || "—"}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/80 text-sm truncate">{it.titulo}</p>
              {it.descripcion && <p className="text-white/30 text-xs truncate">{it.descripcion}</p>}
            </div>
            {editable && (
              <button onClick={() => borrar(it.id)} className="text-white/30 hover:text-red-400 transition-colors p-1.5"><Trash2 size={14} /></button>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-center py-8">
            <Clock size={24} className="text-[#C9A84C]/30 mx-auto mb-3" />
            <p className="text-white/40 text-sm">Aún no hay momentos en el cronograma.</p>
            {editable && <p className="text-white/25 text-xs mt-1">Empieza por la llegada de los invitados, la ceremonia o el brindis.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
