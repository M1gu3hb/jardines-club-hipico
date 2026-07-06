import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Loader2, Trash2, Music2, Ban, Link2, ExternalLink } from "lucide-react";

/**
 * Música del evento: canciones que SÍ poner (`tipo='poner'`) y que NO (`tipo='no_poner'`).
 * Permite adjuntar un enlace (Spotify/YouTube). Reutilizable por admin y portal.
 */
function esUrl(v) {
  return /^https?:\/\//i.test(String(v || "").trim());
}

export default function EventoMusica({ eventoId, editable = false }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ tipo: "poner", cancion: "", artista: "", enlace: "" });
  const [guardando, setGuardando] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const cargar = () => base44.entities.Musica.filter({ eventoId }, "-created_date").then(setItems);
  useEffect(() => { cargar(); }, [eventoId]);

  const agregar = async () => {
    if (!form.cancion.trim() && !form.enlace.trim()) return;
    setGuardando(true);
    await base44.entities.Musica.create({
      eventoId, tipo: form.tipo,
      cancion: form.cancion.trim() || (esUrl(form.enlace) ? "Enlace" : ""),
      artista: form.artista || null,
      enlace: esUrl(form.enlace) ? form.enlace.trim() : null,
    });
    setForm({ tipo: form.tipo, cancion: "", artista: "", enlace: "" });
    setGuardando(false);
    cargar();
  };

  const borrar = async (id) => { await base44.entities.Musica.delete(id); cargar(); };

  const poner = items.filter((i) => i.tipo !== "no_poner");
  const noPoner = items.filter((i) => i.tipo === "no_poner");

  const Cancion = ({ m }) => (
    <div className="skeu-card flex items-center gap-3 px-4 py-3">
      <div className="w-8 h-8 rounded-full bg-[#C9A84C]/10 flex items-center justify-center flex-shrink-0">
        <Music2 size={13} className="text-[#C9A84C]/70" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white/80 text-sm truncate">{m.cancion}</p>
        {m.artista && <p className="text-white/35 text-xs truncate">{m.artista}</p>}
      </div>
      {m.enlace && (
        <a href={m.enlace} target="_blank" rel="noopener noreferrer" title="Abrir enlace"
          className="text-[#C9A84C]/60 hover:text-[#C9A84C] transition-colors flex-shrink-0"><ExternalLink size={14} /></a>
      )}
      {editable && <button onClick={() => borrar(m.id)} className="text-white/25 hover:text-red-400 transition-colors flex-shrink-0"><Trash2 size={13} /></button>}
    </div>
  );

  return (
    <div className="max-w-2xl">
      {editable && (
        <div className="skeu-card p-5 mb-6 space-y-3">
          <div className="flex gap-2">
            <button onClick={() => set("tipo", "poner")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm transition-all ${form.tipo === "poner" ? "bg-[#C9A84C]/15 text-[#C9A84C] border border-[#C9A84C]/40" : "text-white/35 border border-white/10"}`}>
              <Music2 size={14} /> Sí poner
            </button>
            <button onClick={() => set("tipo", "no_poner")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm transition-all ${form.tipo === "no_poner" ? "bg-red-400/15 text-red-400/80 border border-red-400/40" : "text-white/35 border border-white/10"}`}>
              <Ban size={14} /> No poner
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={form.cancion} onChange={(e) => set("cancion", e.target.value)} placeholder="Canción"
              className="bg-white/5 border border-white/10 rounded-lg text-white/75 text-sm px-4 py-2.5 outline-none focus:border-[#C9A84C]/40" />
            <input value={form.artista} onChange={(e) => set("artista", e.target.value)} placeholder="Artista"
              className="bg-white/5 border border-white/10 rounded-lg text-white/75 text-sm px-4 py-2.5 outline-none focus:border-[#C9A84C]/40" />
          </div>
          <div className="relative">
            <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
            <input value={form.enlace} onChange={(e) => set("enlace", e.target.value)} placeholder="Pega un link de Spotify o YouTube (opcional)"
              className="w-full bg-white/5 border border-white/10 rounded-lg text-white/75 text-sm pl-9 pr-4 py-2.5 outline-none focus:border-[#C9A84C]/40" />
          </div>
          <button onClick={agregar} disabled={guardando || (!form.cancion.trim() && !form.enlace.trim())}
            className="skeu-gold-btn flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium disabled:opacity-50">
            {guardando ? <Loader2 size={13} className="animate-spin" /> : <Plus size={14} />} Agregar
          </button>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <p className="text-[#C9A84C] text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5"><Music2 size={13} /> Sí poner ({poner.length})</p>
          <div className="space-y-2">
            {poner.map((m) => <Cancion key={m.id} m={m} />)}
            {poner.length === 0 && <p className="text-white/20 text-xs py-2">Aún no agregas canciones.</p>}
          </div>
        </div>
        <div>
          <p className="text-red-400/70 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5"><Ban size={13} /> No poner ({noPoner.length})</p>
          <div className="space-y-2">
            {noPoner.map((m) => <Cancion key={m.id} m={m} />)}
            {noPoner.length === 0 && <p className="text-white/20 text-xs py-2">Nada vetado por ahora.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
