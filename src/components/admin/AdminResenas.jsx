import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Loader2, Trash2, Star, Eye, EyeOff, Check } from "lucide-react";
import { Field, Area } from "@/components/admin/eventos/_ui";

const VACIO = { autor: "", evento: "", estrellas: 5, texto: "" };

function Estrellas({ n = 5, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" disabled={!onChange} onClick={() => onChange?.(i)}>
          <Star size={16} className={i <= n ? "text-[#E6C870]" : "text-white/15"} fill={i <= n ? "#E6C870" : "transparent"} />
        </button>
      ))}
    </div>
  );
}

export default function AdminResenas() {
  const [resenas, setResenas] = useState([]);
  const [form, setForm] = useState(VACIO);
  const [creando, setCreando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const cargar = () => base44.entities.Resena.list("-created_date").then(setResenas);
  useEffect(() => { cargar(); }, []);

  const crear = async () => {
    if (!form.texto.trim() || !form.autor.trim()) return;
    setGuardando(true);
    const aprobadas = resenas.filter((r) => r.aprobada).length;
    await base44.entities.Resena.create({
      autor: form.autor.trim(), texto: form.texto.trim(), estrellas: Number(form.estrellas),
      evento: form.evento || null, aprobada: true, orden: aprobadas + 1,
    });
    setForm(VACIO); setCreando(false); setGuardando(false);
    cargar();
  };

  const toggleAprobada = async (r) => {
    await base44.entities.Resena.update(r.id, { aprobada: !r.aprobada });
    cargar();
  };
  const borrar = async (id) => {
    if (!confirm("¿Eliminar esta reseña?")) return;
    await base44.entities.Resena.delete(id);
    cargar();
  };

  const pendientes = resenas.filter((r) => !r.aprobada).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white text-2xl font-thin">Reseñas</h2>
          <p className="text-white/30 text-sm mt-1">
            Modera lo que aparece en el carrusel del sitio. {pendientes > 0 && <span className="text-[#C9A84C]">{pendientes} por aprobar.</span>}
          </p>
        </div>
        <button onClick={() => { setForm(VACIO); setCreando(true); }}
          className="flex items-center gap-2 bg-[#C9A84C] text-[#0a0a0a] px-5 py-2.5 text-sm font-medium hover:bg-[#d4b558] transition-all">
          <Plus size={14} /> Nueva reseña
        </button>
      </div>

      {creando && (
        <div className="bg-[#111] border border-[#C9A84C]/20 p-6 mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Autor *" value={form.autor} onChange={(v) => set("autor", v)} />
            <Field label="Evento (etiqueta)" value={form.evento} onChange={(v) => set("evento", v)} placeholder="Boda, XV…" />
          </div>
          <div>
            <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Estrellas</label>
            <Estrellas n={form.estrellas} onChange={(v) => set("estrellas", v)} />
          </div>
          <Area label="Texto *" value={form.texto} onChange={(v) => set("texto", v)} rows={3} />
          <div className="flex gap-3">
            <button onClick={crear} disabled={guardando || !form.texto.trim() || !form.autor.trim()}
              className="flex items-center gap-2 bg-[#C9A84C] text-[#0a0a0a] px-6 py-2.5 text-sm font-medium hover:bg-[#d4b558] transition-all disabled:opacity-50">
              {guardando ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Guardar
            </button>
            <button onClick={() => setCreando(false)} className="px-6 py-2.5 border border-white/10 text-white/40 hover:text-white/60 text-sm transition-all">Cancelar</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {resenas.map((r) => (
          <div key={r.id} className={`flex items-start gap-4 bg-[#111] border px-5 py-4 ${r.aprobada ? "border-white/5" : "border-[#C9A84C]/25"}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <Estrellas n={r.estrellas || 5} />
                <span className="text-white/70 text-sm">{r.autor}</span>
                {r.evento && <span className="text-[#C9A84C]/50 text-xs">· {r.evento}</span>}
              </div>
              <p className="text-white/50 text-sm">{r.texto}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`text-xs px-2 py-1 ${r.aprobada ? "text-green-400/70 bg-green-400/5" : "text-amber-400/70 bg-amber-400/5"}`}>
                {r.aprobada ? "Visible" : "Pendiente"}
              </span>
              <button onClick={() => toggleAprobada(r)} className="text-white/30 hover:text-[#C9A84C] transition-colors p-1.5" title={r.aprobada ? "Ocultar" : "Aprobar"}>
                {r.aprobada ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
              <button onClick={() => borrar(r.id)} className="text-white/30 hover:text-red-400 transition-colors p-1.5"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        {resenas.length === 0 && <p className="text-white/20 text-sm py-8 text-center">Aún no hay reseñas.</p>}
      </div>
    </div>
  );
}
