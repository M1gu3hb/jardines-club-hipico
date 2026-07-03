import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2, Loader2, Check, X } from "lucide-react";

export default function AdminServicios() {
  const [servicios, setServicios] = useState([]);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nombre: "", categoria: "", descripcion: "", activo: true, orden: 0, aplicaA: "todos" });

  const load = () => base44.entities.ServicioExtra.list("orden").then(setServicios);
  useEffect(() => { load(); }, []);

  const startEdit = (s) => {
    setForm(s ? { ...s } : { nombre: "", categoria: "", descripcion: "", activo: true, orden: 0, aplicaA: "todos" });
    setEditing(s || "new");
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    if (editing === "new") {
      await base44.entities.ServicioExtra.create(form);
    } else {
      await base44.entities.ServicioExtra.update(editing.id, form);
    }
    setSaving(false);
    setEditing(null);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este servicio?")) return;
    await base44.entities.ServicioExtra.delete(id);
    load();
  };

  const byCategory = servicios.reduce((acc, s) => {
    const cat = s.categoria || "Sin categoría";
    acc[cat] = acc[cat] || [];
    acc[cat].push(s);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white text-2xl font-thin">Servicios Extra</h2>
          <p className="text-white/30 text-sm mt-1">Los clientes seleccionan estos servicios en el formulario.</p>
        </div>
        <button
          onClick={() => startEdit(null)}
          className="flex items-center gap-2 bg-[#C9A84C] text-[#0a0a0a] px-5 py-2.5 text-sm font-medium hover:bg-[#d4b558] transition-all"
        >
          <Plus size={14} /> Nuevo servicio
        </button>
      </div>

      {editing && (
        <div className="bg-[#111] border border-[#C9A84C]/20 p-6 mb-6 space-y-4">
          <h3 className="text-white/70 text-sm uppercase tracking-wider">
            {editing === "new" ? "Nuevo servicio" : `Editando: ${editing.nombre}`}
          </h3>
          <Field label="Nombre *" value={form.nombre} onChange={(v) => set("nombre", v)} />
          <Field label="Categoría (ej: Entretenimiento, Decoración)" value={form.categoria} onChange={(v) => set("categoria", v)} />
          <Field label="Aplica a (nombre de salón o 'todos')" value={form.aplicaA} onChange={(v) => set("aplicaA", v)} placeholder="todos" />
          <div>
            <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Descripción (opcional)</label>
            <textarea value={form.descripcion || ""} onChange={(e) => set("descripcion", e.target.value)}
              rows={2} className="w-full bg-white/5 border border-white/10 text-white/70 text-sm px-4 py-3 outline-none focus:border-[#C9A84C]/40 resize-none" />
          </div>
          <Field label="Orden" value={String(form.orden || 0)} onChange={(v) => set("orden", Number(v))} type="number" />
          <div className="flex items-center gap-3">
            <button onClick={() => set("activo", !form.activo)}
              className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${form.activo ? "border-[#C9A84C] bg-[#C9A84C]" : "border-white/20"}`}>
              {form.activo && <Check size={10} className="text-black" />}
            </button>
            <span className="text-white/40 text-sm">Activo (visible en formulario)</span>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving || !form.nombre}
              className="flex items-center gap-2 bg-[#C9A84C] text-[#0a0a0a] px-6 py-2.5 text-sm font-medium hover:bg-[#d4b558] transition-all disabled:opacity-50">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              Guardar
            </button>
            <button onClick={() => setEditing(null)} className="px-6 py-2.5 border border-white/10 text-white/40 hover:text-white/60 text-sm transition-all">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {Object.keys(byCategory).length === 0 && (
        <p className="text-white/20 text-sm py-6 text-center">No hay servicios. Crea el primero.</p>
      )}

      {Object.entries(byCategory).map(([cat, items]) => (
        <div key={cat} className="mb-6">
          <p className="text-[#C9A84C]/50 text-xs uppercase tracking-widest mb-2">{cat}</p>
          <div className="space-y-1">
            {items.map((s) => (
              <div key={s.id} className="flex items-center gap-4 bg-[#111] border border-white/5 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-white/80 text-sm">{s.nombre}</p>
                  {s.aplicaA && s.aplicaA !== "todos" && (
                    <p className="text-white/30 text-xs mt-0.5">Solo: {s.aplicaA}</p>
                  )}
                </div>
                <div className={`text-xs px-2 py-1 ${s.activo ? "text-green-400/70 bg-green-400/5" : "text-white/20 bg-white/5"}`}>
                  {s.activo ? "Activo" : "Oculto"}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(s)} className="text-white/30 hover:text-[#C9A84C] transition-colors p-1.5">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="text-white/30 hover:text-red-400 transition-colors p-1.5">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div>
      <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">{label}</label>
      <input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 text-white/70 text-sm px-4 py-3 outline-none focus:border-[#C9A84C]/40" />
    </div>
  );
}