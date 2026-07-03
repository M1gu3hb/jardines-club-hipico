import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Check, X } from "lucide-react";

const emptyForm = { titulo: "", descripcion: "", imagenUrl: "", imagenesUrl: [], activo: true, orden: 0 };

export default function AdminAmenidadItems() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });

  const load = () => base44.entities.AmenidadItem.list("orden").then(setItems);
  useEffect(() => { load(); }, []);

  const startNew = () => { setForm({ ...emptyForm, orden: items.length + 1 }); setEditing("new"); };
  const startEdit = (item) => { setForm({ ...item, imagenesUrl: item.imagenesUrl || [] }); setEditing(item.id); };
  const cancel = () => { setEditing(null); setForm({ ...emptyForm }); };

  const save = async () => {
    if (!form.titulo.trim()) return;
    if (editing === "new") await base44.entities.AmenidadItem.create(form);
    else await base44.entities.AmenidadItem.update(editing, form);
    cancel(); load();
  };

  const remove = async (id) => { await base44.entities.AmenidadItem.delete(id); load(); };
  const toggle = async (item) => { await base44.entities.AmenidadItem.update(item.id, { activo: !item.activo }); load(); };

  const move = async (i, dir) => {
    const next = [...items];
    const target = i + dir;
    if (target < 0 || target >= next.length) return;
    const tmp = next[i]; next[i] = next[target]; next[target] = tmp;
    await Promise.all(next.map((it, idx) => base44.entities.AmenidadItem.update(it.id, { orden: idx + 1 })));
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white text-xl font-light">Amenidades</h2>
          <p className="text-white/30 text-xs mt-0.5">Lista visible en la sección pública</p>
        </div>
        <button onClick={startNew} className="flex items-center gap-2 bg-[#C9A84C] text-black px-4 py-2 text-xs font-medium hover:bg-[#d4b558] transition-all">
          <Plus size={13} /> Agregar
        </button>
      </div>

      {editing === "new" && <ItemForm form={form} setForm={setForm} onSave={save} onCancel={cancel} />}

      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={item.id}>
            {editing === item.id ? (
              <ItemForm form={form} setForm={setForm} onSave={save} onCancel={cancel} />
            ) : (
              <div className={`flex items-center gap-3 px-4 py-3 border transition-all ${item.activo ? "border-white/8 bg-white/2" : "border-white/4 bg-white/1 opacity-50"}`}>
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="text-white/20 hover:text-white/60 disabled:opacity-20"><ChevronUp size={12} /></button>
                  <button onClick={() => move(i, 1)} disabled={i === items.length - 1} className="text-white/20 hover:text-white/60 disabled:opacity-20"><ChevronDown size={12} /></button>
                </div>
                {item.imagenUrl && <img src={item.imagenUrl} alt="" className="w-8 h-8 object-cover flex-shrink-0 border border-white/10" onError={(e) => e.target.style.display = "none"} />}
                <span className="flex-1 text-white/70 text-sm">{item.titulo}</span>
                {(item.imagenesUrl?.length > 0) && (
                  <span className="text-white/25 text-xs">+{item.imagenesUrl.length} media</span>
                )}
                <button onClick={() => toggle(item)} title={item.activo ? "Desactivar" : "Activar"}
                  className={`w-5 h-5 rounded-sm border flex items-center justify-center transition-all ${item.activo ? "border-[#C9A84C] bg-[#C9A84C]" : "border-white/20"}`}>
                  {item.activo && <Check size={9} className="text-black" />}
                </button>
                <button onClick={() => startEdit(item)} className="text-white/25 hover:text-[#C9A84C] transition-colors"><Pencil size={13} /></button>
                <button onClick={() => remove(item.id)} className="text-white/25 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && editing !== "new" && (
          <p className="text-white/20 text-sm text-center py-8">Sin amenidades. Agrega la primera.</p>
        )}
      </div>
    </div>
  );
}

function ItemForm({ form, setForm, onSave, onCancel }) {
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const [newUrl, setNewUrl] = useState("");

  const addUrl = () => {
    if (!newUrl.trim()) return;
    set("imagenesUrl", [...(form.imagenesUrl || []), newUrl.trim()]);
    setNewUrl("");
  };

  const removeUrl = (i) => {
    set("imagenesUrl", form.imagenesUrl.filter((_, idx) => idx !== i));
  };

  return (
    <div className="border border-[#C9A84C]/20 bg-[#C9A84C]/3 p-5 mb-3 space-y-3">
      <div>
        <label className="text-white/40 text-xs uppercase tracking-wider mb-1 block">Título *</label>
        <input value={form.titulo} onChange={e => set("titulo", e.target.value)}
          className="w-full bg-white/5 border border-white/10 text-white/80 text-sm px-3 py-2 outline-none focus:border-[#C9A84C]/40" />
      </div>
      <div>
        <label className="text-white/40 text-xs uppercase tracking-wider mb-1 block">Descripción</label>
        <input value={form.descripcion} onChange={e => set("descripcion", e.target.value)}
          className="w-full bg-white/5 border border-white/10 text-white/80 text-sm px-3 py-2 outline-none focus:border-[#C9A84C]/40" />
      </div>
      <div>
        <label className="text-white/40 text-xs uppercase tracking-wider mb-1 block">URL principal (imagen o video)</label>
        <input value={form.imagenUrl} onChange={e => set("imagenUrl", e.target.value)}
          placeholder="https://..."
          className="w-full bg-white/5 border border-white/10 text-white/80 text-sm px-3 py-2 outline-none focus:border-[#C9A84C]/40" />
      </div>
      <div>
        <label className="text-white/40 text-xs uppercase tracking-wider mb-1 block">Galería adicional (imágenes o videos)</label>
        {(form.imagenesUrl || []).map((url, i) => (
          <div key={i} className="flex items-center gap-2 mb-1">
            <span className="flex-1 text-white/50 text-xs truncate bg-white/5 border border-white/10 px-2 py-1.5">{url}</span>
            <button onClick={() => removeUrl(i)} className="text-white/30 hover:text-red-400 transition-colors flex-shrink-0">
              <X size={12} />
            </button>
          </div>
        ))}
        <div className="flex gap-2 mt-1">
          <input value={newUrl} onChange={e => setNewUrl(e.target.value)}
            placeholder="https://... (imagen o video mp4)"
            className="flex-1 bg-white/5 border border-white/10 text-white/80 text-xs px-3 py-2 outline-none focus:border-[#C9A84C]/40" />
          <button onClick={addUrl} className="border border-white/20 text-white/50 px-3 py-1.5 text-xs hover:text-white hover:border-[#C9A84C]/40 transition-colors">+ Añadir</button>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={onSave} className="flex items-center gap-1.5 bg-[#C9A84C] text-black px-4 py-2 text-xs font-medium hover:bg-[#d4b558]">
          <Check size={12} /> Guardar
        </button>
        <button onClick={onCancel} className="flex items-center gap-1.5 border border-white/10 text-white/40 px-4 py-2 text-xs hover:text-white/60">
          <X size={12} /> Cancelar
        </button>
      </div>
    </div>
  );
}