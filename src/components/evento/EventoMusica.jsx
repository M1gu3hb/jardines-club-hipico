import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Loader2, Trash2, Music2, Ban } from "lucide-react";

/**
 * Música del evento: canciones que SÍ poner (`tipo='poner'`) y que NO poner (`tipo='no_poner'`).
 * Reutilizable por admin y portal. Con `editable=false` solo muestra.
 */
export default function EventoMusica({ eventoId, editable = false }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ tipo: "poner", cancion: "", artista: "" });
  const [guardando, setGuardando] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const cargar = () => base44.entities.Musica.filter({ eventoId }, "-created_date").then(setItems);
  useEffect(() => { cargar(); }, [eventoId]);

  const agregar = async () => {
    if (!form.cancion.trim()) return;
    setGuardando(true);
    await base44.entities.Musica.create({
      eventoId, tipo: form.tipo, cancion: form.cancion.trim(), artista: form.artista || null,
    });
    setForm({ tipo: form.tipo, cancion: "", artista: "" });
    setGuardando(false);
    cargar();
  };

  const borrar = async (id) => { await base44.entities.Musica.delete(id); cargar(); };

  const poner = items.filter((i) => i.tipo !== "no_poner");
  const noPoner = items.filter((i) => i.tipo === "no_poner");

  const Lista = ({ titulo, arr, icon: Icon, color }) => (
    <div>
      <p className={`text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5 ${color}`}><Icon size={13} /> {titulo}</p>
      <div className="space-y-2">
        {arr.map((m) => (
          <div key={m.id} className="flex items-center gap-3 bg-[#111] border border-white/5 px-4 py-2.5">
            <div className="flex-1 min-w-0">
              <p className="text-white/75 text-sm truncate">{m.cancion}</p>
              {m.artista && <p className="text-white/30 text-xs truncate">{m.artista}</p>}
            </div>
            {editable && <button onClick={() => borrar(m.id)} className="text-white/30 hover:text-red-400 transition-colors p-1.5"><Trash2 size={13} /></button>}
          </div>
        ))}
        {arr.length === 0 && <p className="text-white/15 text-xs py-2">—</p>}
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl">
      {editable && (
        <div className="bg-[#111] border border-white/5 p-5 mb-5 space-y-3">
          <div className="flex gap-2">
            <button onClick={() => set("tipo", "poner")}
              className={`flex-1 py-2 text-sm transition-all ${form.tipo === "poner" ? "bg-[#C9A84C]/15 text-[#C9A84C]" : "text-white/30 border border-white/10"}`}>
              Sí poner
            </button>
            <button onClick={() => set("tipo", "no_poner")}
              className={`flex-1 py-2 text-sm transition-all ${form.tipo === "no_poner" ? "bg-red-400/15 text-red-400/80" : "text-white/30 border border-white/10"}`}>
              No poner
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input value={form.cancion} onChange={(e) => set("cancion", e.target.value)} placeholder="Canción *"
              className="bg-white/5 border border-white/10 text-white/70 text-sm px-4 py-2.5 outline-none focus:border-[#C9A84C]/40" />
            <input value={form.artista} onChange={(e) => set("artista", e.target.value)} placeholder="Artista"
              className="bg-white/5 border border-white/10 text-white/70 text-sm px-4 py-2.5 outline-none focus:border-[#C9A84C]/40" />
          </div>
          <button onClick={agregar} disabled={guardando || !form.cancion.trim()}
            className="flex items-center gap-2 bg-[#C9A84C] text-[#0a0a0a] px-5 py-2.5 text-sm font-medium hover:bg-[#d4b558] transition-all disabled:opacity-50">
            {guardando ? <Loader2 size={13} className="animate-spin" /> : <Plus size={14} />} Agregar
          </button>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-5">
        <Lista titulo="Sí poner" arr={poner} icon={Music2} color="text-[#C9A84C]" />
        <Lista titulo="No poner" arr={noPoner} icon={Ban} color="text-red-400/70" />
      </div>
    </div>
  );
}
