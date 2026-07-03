import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2, Loader2, Upload, X, Check, ChevronUp, ChevronDown } from "lucide-react";

export default function AdminSalones() {
  const [salones, setSalones] = useState([]);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [uploadingPrincipal, setUploadingPrincipal] = useState(false);
  const [form, setForm] = useState({
    nombre: "", descripcion: "", descripcionLarga: "",
    capacidad: "", capacidadMin: "", capacidadMax: "",
    imagenPrincipal: "", imagenes: [], caracteristicas: [], activo: true, orden: 0,
  });
  const [caracInput, setCaracInput] = useState("");

  const load = () => base44.entities.Salon.list("orden").then(setSalones);
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const startEdit = (salon) => {
    setForm(salon ? { ...salon, caracteristicas: salon.caracteristicas || [], imagenes: salon.imagenes || [] }
      : { nombre: "", descripcion: "", descripcionLarga: "", capacidad: "", capacidadMin: "", capacidadMax: "", imagenPrincipal: "", imagenes: [], caracteristicas: [], activo: true, orden: 0 });
    setCaracInput("");
    setEditing(salon || "new");
  };

  const handleImgPrincipal = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPrincipal(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set("imagenPrincipal", file_url);
    setUploadingPrincipal(false);
  };

  const handleImgUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImg(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((f) => ({ ...f, imagenes: [...(f.imagenes || []), file_url] }));
    setUploadingImg(false);
  };

  const removeImg = (idx) => setForm((f) => ({ ...f, imagenes: f.imagenes.filter((_, i) => i !== idx) }));

  const addCarac = () => {
    if (!caracInput.trim()) return;
    setForm((f) => ({ ...f, caracteristicas: [...(f.caracteristicas || []), caracInput.trim()] }));
    setCaracInput("");
  };

  const removeCarac = (idx) => setForm((f) => ({ ...f, caracteristicas: f.caracteristicas.filter((_, i) => i !== idx) }));

  const handleSave = async () => {
    setSaving(true);
    const data = {
      ...form,
      capacidadMin: form.capacidadMin ? Number(form.capacidadMin) : undefined,
      capacidadMax: form.capacidadMax ? Number(form.capacidadMax) : undefined,
      orden: form.orden ? Number(form.orden) : 0,
    };
    if (editing === "new") {
      await base44.entities.Salon.create(data);
    } else {
      await base44.entities.Salon.update(editing.id, data);
    }
    setSaving(false);
    setEditing(null);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este salón?")) return;
    await base44.entities.Salon.delete(id);
    load();
  };

  const moveUp = async (salon, index) => {
    if (index === 0) return;
    const prev = salones[index - 1];
    await Promise.all([
      base44.entities.Salon.update(salon.id, { orden: prev.orden }),
      base44.entities.Salon.update(prev.id, { orden: salon.orden })
    ]);
    load();
  };

  const moveDown = async (salon, index) => {
    if (index === salones.length - 1) return;
    const next = salones[index + 1];
    await Promise.all([
      base44.entities.Salon.update(salon.id, { orden: next.orden }),
      base44.entities.Salon.update(next.id, { orden: salon.orden })
    ]);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white text-2xl font-thin">Salones</h2>
          <p className="text-white/30 text-sm mt-1">Administra los espacios del sitio.</p>
        </div>
        <button onClick={() => startEdit(null)}
          className="flex items-center gap-2 bg-[#C9A84C] text-[#0a0a0a] px-5 py-2.5 text-sm font-medium hover:bg-[#d4b558] transition-all">
          <Plus size={14} /> Nuevo salón
        </button>
      </div>

      {editing && (
        <div className="bg-[#111] border border-[#C9A84C]/20 p-6 mb-6">
          <h3 className="text-white/70 text-sm mb-5 uppercase tracking-wider">
            {editing === "new" ? "Nuevo salón" : `Editando: ${editing.nombre}`}
          </h3>
          <div className="space-y-4">
            <Field label="Nombre *" value={form.nombre} onChange={(v) => set("nombre", v)} />
            <Field label="Orden" value={String(form.orden || 0)} onChange={(v) => set("orden", v)} type="number" />

            <div>
              <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Descripción corta (card)</label>
              <textarea value={form.descripcion || ""} onChange={(e) => set("descripcion", e.target.value)}
                rows={2} className="w-full bg-white/5 border border-white/10 text-white/70 text-sm px-4 py-3 outline-none focus:border-[#C9A84C]/40 resize-none" />
            </div>

            <div>
              <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Descripción larga (overlay)</label>
              <textarea value={form.descripcionLarga || ""} onChange={(e) => set("descripcionLarga", e.target.value)}
                rows={4} className="w-full bg-white/5 border border-white/10 text-white/70 text-sm px-4 py-3 outline-none focus:border-[#C9A84C]/40 resize-none" />
            </div>

            <Field label="Capacidad (texto libre, ej: 50–150 personas)" value={form.capacidad} onChange={(v) => set("capacidad", v)} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Capacidad mínima" value={String(form.capacidadMin || "")} onChange={(v) => set("capacidadMin", v)} type="number" />
              <Field label="Capacidad máxima" value={String(form.capacidadMax || "")} onChange={(v) => set("capacidadMax", v)} type="number" />
            </div>

            {/* Imagen principal */}
            <div>
              <label className="text-white/30 text-xs uppercase tracking-wider mb-2 block">Imagen principal (card)</label>
              <div className="flex items-center gap-3">
                {form.imagenPrincipal && <img src={form.imagenPrincipal} className="w-20 h-20 object-cover" alt="" />}
                <label className="cursor-pointer border border-dashed border-white/20 hover:border-[#C9A84C]/40 w-20 h-20 flex items-center justify-center transition-all">
                  {uploadingPrincipal ? <Loader2 size={16} className="text-white/30 animate-spin" /> : <Upload size={16} className="text-white/30" />}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImgPrincipal} />
                </label>
              </div>
            </div>

            {/* Galería */}
            <div>
              <label className="text-white/30 text-xs uppercase tracking-wider mb-2 block">Galería de imágenes (overlay)</label>
              <div className="flex flex-wrap gap-2">
                {(form.imagenes || []).map((url, i) => (
                  <div key={i} className="relative group w-20 h-20">
                    <img src={url} className="w-full h-full object-cover" alt="" />
                    <button onClick={() => removeImg(i)} className="absolute top-1 right-1 bg-black/70 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X size={10} className="text-white" />
                    </button>
                  </div>
                ))}
                <label className="w-20 h-20 border border-dashed border-white/20 hover:border-[#C9A84C]/40 flex items-center justify-center cursor-pointer transition-all">
                  {uploadingImg ? <Loader2 size={16} className="text-white/30 animate-spin" /> : <Upload size={16} className="text-white/30" />}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImgUpload} />
                </label>
              </div>
            </div>

            {/* Características */}
            <div>
              <label className="text-white/30 text-xs uppercase tracking-wider mb-2 block">Características</label>
              <div className="flex gap-2 mb-2">
                <input value={caracInput} onChange={(e) => setCaracInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCarac()}
                  placeholder="Escribe y presiona Enter"
                  className="flex-1 bg-white/5 border border-white/10 text-white/70 text-sm px-4 py-2.5 outline-none focus:border-[#C9A84C]/40" />
                <button onClick={addCarac} className="px-4 py-2.5 border border-white/10 text-white/40 hover:text-white/60 text-sm">+</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(form.caracteristicas || []).map((c, i) => (
                  <span key={i} className="flex items-center gap-1.5 bg-white/5 border border-white/10 text-white/50 text-xs px-3 py-1.5">
                    {c}
                    <button onClick={() => removeCarac(i)} className="text-white/30 hover:text-red-400 transition-colors"><X size={10} /></button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => set("activo", !form.activo)}
                className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${form.activo ? "border-[#C9A84C] bg-[#C9A84C]" : "border-white/20"}`}>
                {form.activo && <Check size={10} className="text-black" />}
              </button>
              <span className="text-white/40 text-sm">Visible en el sitio</span>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
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

      <div className="space-y-2">
        {salones.map((s, idx) => (
          <div key={s.id} className="flex items-center gap-4 bg-[#111] border border-white/5 px-5 py-4">
            <div className="flex flex-col gap-1">
              <button 
                onClick={() => moveUp(s, idx)} 
                disabled={idx === 0}
                className="text-white/30 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors p-0.5"
              >
                <ChevronUp size={14} />
              </button>
              <button 
                onClick={() => moveDown(s, idx)} 
                disabled={idx === salones.length - 1}
                className="text-white/30 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors p-0.5"
              >
                <ChevronDown size={14} />
              </button>
            </div>
            <span className="text-white/20 text-xs w-6 text-center">{s.orden || 0}</span>
            {(s.imagenPrincipal || s.imagenes?.[0]) ? (
              <img src={s.imagenPrincipal || s.imagenes[0]} className="w-12 h-12 object-cover flex-shrink-0" alt="" />
            ) : (
              <div className="w-12 h-12 bg-white/5 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white/80 text-sm">{s.nombre}</p>
              <p className="text-white/30 text-xs mt-0.5 truncate">{s.descripcion}</p>
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
        {salones.length === 0 && (
          <p className="text-white/20 text-sm py-6 text-center">No hay salones. Crea el primero.</p>
        )}
      </div>
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