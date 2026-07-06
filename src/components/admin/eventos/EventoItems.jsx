import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Loader2, Trash2, Check } from "lucide-react";
import { Field, Area } from "./_ui";

const VACIO = { descripcion: "", cantidad: "1", precio: "", notas: "" };

export default function EventoItems({ eventoId }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const cargar = () => base44.entities.ItemContratado.filter({ eventoId }, "orden").then(setItems);
  useEffect(() => { cargar(); }, [eventoId]);

  const agregar = async () => {
    if (!form.descripcion.trim()) return;
    setGuardando(true);
    await base44.entities.ItemContratado.create({
      eventoId,
      descripcion: form.descripcion.trim(),
      cantidad: form.cantidad ? Number(form.cantidad) : 1,
      precio: form.precio ? Number(form.precio) : null,
      notas: form.notas || null,
      orden: items.length + 1,
    });
    setForm(VACIO);
    setGuardando(false);
    cargar();
  };

  const borrar = async (id) => {
    await base44.entities.ItemContratado.delete(id);
    cargar();
  };

  const total = items.reduce((acc, it) => acc + (Number(it.precio) || 0) * (Number(it.cantidad) || 1), 0);

  return (
    <div className="max-w-2xl">
      <div className="bg-[#111] border border-white/5 p-5 mb-5 space-y-3">
        <Field label="Descripción *" value={form.descripcion} onChange={(v) => set("descripcion", v)} placeholder="Ej. Paquete de iluminación" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cantidad" value={form.cantidad} onChange={(v) => set("cantidad", v)} type="number" />
          <Field label="Precio unitario (MXN)" value={form.precio} onChange={(v) => set("precio", v)} type="number" />
        </div>
        <Area label="Notas" value={form.notas} onChange={(v) => set("notas", v)} rows={2} />
        <button onClick={agregar} disabled={guardando || !form.descripcion.trim()}
          className="flex items-center gap-2 bg-[#C9A84C] text-[#0a0a0a] px-5 py-2.5 text-sm font-medium hover:bg-[#d4b558] transition-all disabled:opacity-50">
          {guardando ? <Loader2 size={13} className="animate-spin" /> : <Plus size={14} />} Agregar ítem
        </button>
      </div>

      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-3 bg-[#111] border border-white/5 px-4 py-3">
            <span className="text-white/20 text-xs w-8 text-center">{it.cantidad || 1}×</span>
            <div className="flex-1 min-w-0">
              <p className="text-white/75 text-sm truncate">{it.descripcion}</p>
              {it.notas && <p className="text-white/25 text-xs truncate">{it.notas}</p>}
            </div>
            {it.precio != null && (
              <span className="text-white/50 text-sm tabular-nums">
                ${(Number(it.precio) * (Number(it.cantidad) || 1)).toLocaleString("es-MX")}
              </span>
            )}
            <button onClick={() => borrar(it.id)} className="text-white/30 hover:text-red-400 transition-colors p-1.5"><Trash2 size={14} /></button>
          </div>
        ))}
        {items.length === 0 && <p className="text-white/20 text-sm py-6 text-center">Sin ítems contratados.</p>}
        {total > 0 && (
          <div className="flex justify-end pt-2">
            <span className="text-white/40 text-sm">Total estimado: <span className="text-[#C9A84C]">${total.toLocaleString("es-MX")}</span></span>
          </div>
        )}
      </div>
    </div>
  );
}
