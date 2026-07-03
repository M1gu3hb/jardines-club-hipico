import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, FileText, Loader2 } from "lucide-react";

const empty = { nombre: "", descripcion: "", pdfUrl: "", orden: 0, activo: true };

export default function AdminAlimentos() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ ...empty });
  const [editing, setEditing] = useState(null);
  const [uploading, setUploading] = useState(false);

  const load = () => base44.entities.AlimentoMenu.list("orden").then(setItems);
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handlePdf = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set("pdfUrl", file_url);
    setUploading(false);
  };

  const save = async () => {
    if (!form.nombre.trim()) return;
    if (editing) {
      await base44.entities.AlimentoMenu.update(editing, form);
    } else {
      await base44.entities.AlimentoMenu.create(form);
    }
    setForm({ ...empty });
    setEditing(null);
    load();
  };

  const del = async (id) => {
    await base44.entities.AlimentoMenu.delete(id);
    load();
  };

  const startEdit = (item) => {
    setForm({ nombre: item.nombre, descripcion: item.descripcion || "", pdfUrl: item.pdfUrl || "", orden: item.orden || 0, activo: item.activo !== false });
    setEditing(item.id);
  };

  return (
    <div>
      <h2 className="text-white/80 text-xl font-light mb-6">Alimentos / Menús</h2>

      {/* Form */}
      <div className="bg-[#111] border border-white/5 p-6 mb-6 space-y-4">
        <h3 className="text-white/50 text-xs uppercase tracking-widest mb-4">{editing ? "Editar menú" : "Agregar menú"}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-white/30 text-xs uppercase tracking-wider mb-1 block">Nombre *</label>
            <input value={form.nombre} onChange={e => set("nombre", e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-white/80 text-sm px-4 py-2.5 outline-none focus:border-[#C9A84C]/40"
              placeholder="Ej: Taquiza, Buffet, Menú 3 tiempos" />
          </div>
          <div>
            <label className="text-white/30 text-xs uppercase tracking-wider mb-1 block">Orden</label>
            <input type="number" value={form.orden} onChange={e => set("orden", Number(e.target.value))}
              className="w-full bg-white/5 border border-white/10 text-white/80 text-sm px-4 py-2.5 outline-none focus:border-[#C9A84C]/40" />
          </div>
        </div>
        <div>
          <label className="text-white/30 text-xs uppercase tracking-wider mb-1 block">Descripción</label>
          <input value={form.descripcion} onChange={e => set("descripcion", e.target.value)}
            className="w-full bg-white/5 border border-white/10 text-white/80 text-sm px-4 py-2.5 outline-none focus:border-[#C9A84C]/40"
            placeholder="Descripción opcional" />
        </div>
        <div>
          <label className="text-white/30 text-xs uppercase tracking-wider mb-1 block">PDF del menú</label>
          {form.pdfUrl && (
            <a href={form.pdfUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[#C9A84C]/70 text-xs mb-2 hover:text-[#C9A84C]">
              <FileText size={12} /> Ver PDF actual
            </a>
          )}
          <div className="flex items-center gap-3">
            <label className="cursor-pointer bg-white/5 border border-white/10 hover:border-white/20 text-white/50 text-sm px-4 py-2.5 transition-all flex items-center gap-2">
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {uploading ? "Subiendo..." : "Subir PDF"}
              <input type="file" accept=".pdf" className="hidden" onChange={handlePdf} disabled={uploading} />
            </label>
            {form.pdfUrl && <span className="text-green-400/60 text-xs">✓ PDF cargado</span>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => set("activo", !form.activo)}
            className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-all ${form.activo ? "border-[#C9A84C] bg-[#C9A84C]" : "border-white/20"}`}>
            {form.activo && <span className="text-black text-xs">✓</span>}
          </button>
          <span className="text-white/40 text-xs">Activo (visible en formulario)</span>
        </div>
        <div className="flex gap-3">
          <button onClick={save}
            className="bg-[#C9A84C] hover:bg-[#d4b558] text-[#0a0a0a] text-sm px-6 py-2.5 font-medium transition-all">
            {editing ? "Guardar cambios" : "Agregar"}
          </button>
          {editing && (
            <button onClick={() => { setForm({ ...empty }); setEditing(null); }}
              className="border border-white/10 text-white/40 text-sm px-6 py-2.5 hover:border-white/20 transition-all">
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-4 bg-[#111] border border-white/5 px-5 py-3">
            <div className="flex-1">
              <p className="text-white/70 text-sm">{item.nombre}</p>
              {item.descripcion && <p className="text-white/30 text-xs mt-0.5">{item.descripcion}</p>}
              {item.pdfUrl && (
                <a href={item.pdfUrl} target="_blank" rel="noopener noreferrer"
                  className="text-[#C9A84C]/50 text-xs mt-1 inline-flex items-center gap-1 hover:text-[#C9A84C]">
                  <FileText size={10} /> PDF del menú
                </a>
              )}
            </div>
            <span className={`text-xs px-2 py-0.5 border ${item.activo !== false ? "border-green-500/20 text-green-400/60" : "border-white/10 text-white/20"}`}>
              {item.activo !== false ? "Activo" : "Inactivo"}
            </span>
            <button onClick={() => startEdit(item)} className="text-white/30 hover:text-[#C9A84C] text-xs transition-colors">Editar</button>
            <button onClick={() => del(item.id)} className="text-white/20 hover:text-red-400/60 transition-colors"><Trash2 size={14} /></button>
          </div>
        ))}
        {items.length === 0 && <p className="text-white/20 text-sm italic py-4">Sin menús registrados aún.</p>}
      </div>
    </div>
  );
}