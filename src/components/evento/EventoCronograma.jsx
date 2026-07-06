import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Plus, Loader2, Trash2, Clock, Sunrise, Sparkles } from "lucide-react";
import { horaLegible } from "@/lib/fechas";
import { sugerirMomentos, horaSugerida } from "@/lib/cronogramaSugerencias";
import SelectorHora from "./SelectorHora";

/**
 * Cronograma del evento como línea de tiempo. Reutilizable por admin (editable)
 * y portal del cliente. Selector de hora propio (no el nativo). Con editable=false
 * solo muestra.
 */
export default function EventoCronograma({ eventoId, editable = false, tipoEvento = "" }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ hora: "18:00", titulo: "", descripcion: "" });
  const [guardando, setGuardando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const ordenar = (arr) => [...arr].sort((a, b) => (a.hora || "").localeCompare(b.hora || "") || (a.orden || 0) - (b.orden || 0));
  const cargar = () => base44.entities.Cronograma.filter({ eventoId }, "orden").then((r) => setItems(ordenar(r)));
  useEffect(() => { cargar(); }, [eventoId]);

  const agregar = async () => {
    if (!form.titulo.trim()) return;
    setGuardando(true);
    await base44.entities.Cronograma.create({
      eventoId, hora: form.hora || null, titulo: form.titulo.trim(),
      descripcion: form.descripcion || null, orden: items.length + 1,
    });
    setForm({ hora: "18:00", titulo: "", descripcion: "" });
    setGuardando(false);
    setAbierto(false);
    cargar();
  };

  const borrar = async (id) => { await base44.entities.Cronograma.delete(id); cargar(); };

  return (
    <div className="max-w-2xl">
      {editable && (
        abierto ? (
          <div className="skeu-card p-5 mb-5 space-y-4">
            <div>
              <label className="text-white/40 text-xs uppercase tracking-wider mb-2 block">¿A qué hora?</label>
              <SelectorHora value={form.hora} onChange={(v) => set("hora", v)} />
            </div>

            {/* Sugerencias inteligentes: el siguiente momento lógico de tu fiesta */}
            {(() => {
              const sugeridos = sugerirMomentos(items, tipoEvento, 4);
              if (!sugeridos.length) return null;
              return (
                <div>
                  <p className="text-[#C9A84C]/60 text-[11px] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Sparkles size={11} /> ¿Qué sigue en tu fiesta?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {sugeridos.map((s) => (
                      <button key={s.titulo} type="button" onClick={() => set("titulo", s.titulo)}
                        title={s.desc || undefined}
                        className={`glass-chip text-xs px-3 py-2 rounded-full ${form.titulo === s.titulo ? "glass-chip--activo" : "text-white/55 hover:text-[#E6C870]"}`}>
                        {s.titulo}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div>
              <label className="text-white/40 text-xs uppercase tracking-wider mb-1.5 block">¿Qué momento? *</label>
              <input value={form.titulo} onChange={(e) => set("titulo", e.target.value)} autoFocus
                placeholder="Ceremonia, brindis, primer baile, pastel…"
                className="w-full bg-white/5 border border-white/10 rounded-lg text-white/80 text-sm px-4 py-2.5 outline-none focus:border-[#C9A84C]/40" />
            </div>
            <input value={form.descripcion} onChange={(e) => set("descripcion", e.target.value)}
              placeholder="Detalle (opcional)"
              className="w-full bg-white/5 border border-white/10 rounded-lg text-white/70 text-sm px-4 py-2.5 outline-none focus:border-[#C9A84C]/40" />
            <div className="flex gap-2">
              <button onClick={agregar} disabled={guardando || !form.titulo.trim()}
                className="skeu-gold-btn flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium disabled:opacity-50">
                {guardando ? <Loader2 size={13} className="animate-spin" /> : <Plus size={14} />} Agregar momento
              </button>
              <button onClick={() => setAbierto(false)} className="text-white/40 hover:text-white/70 text-sm px-3">Cancelar</button>
            </div>
          </div>
        ) : (
          <button onClick={() => { set("hora", horaSugerida(items)); setAbierto(true); }}
            className="skeu-card skeu-card-hover w-full flex items-center gap-3 p-4 mb-5 text-left group">
            <span className="w-9 h-9 rounded-full bg-[#C9A84C]/12 border border-[#C9A84C]/30 flex items-center justify-center flex-shrink-0">
              <Plus size={16} className="text-[#E6C870]" />
            </span>
            <span className="text-white/70 text-sm group-hover:text-white/90 transition-colors">Agregar un momento a tu cronograma</span>
          </button>
        )
      )}

      {/* Línea de tiempo */}
      <div className="relative">
        {items.length > 0 && <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-[#C9A84C]/50 via-[#C9A84C]/25 to-transparent" />}
        <div className="space-y-3">
          {items.map((it, i) => (
            <motion.div
              key={it.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.35 }}
              className="relative flex gap-4 pl-0"
            >
              <span className="relative z-10 mt-1.5 w-[15px] h-[15px] rounded-full bg-[#0a0a0a] border-2 border-[#C9A84C] flex-shrink-0" />
              <div className="skeu-card flex-1 px-4 py-3 -mt-0.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    {it.hora && <p className="text-[#E6C870] text-xs font-medium mb-0.5 flex items-center gap-1.5"><Clock size={11} /> {horaLegible(it.hora)}</p>}
                    <p className="text-white/85 text-sm">{it.titulo}</p>
                    {it.descripcion && <p className="text-white/40 text-xs mt-0.5">{it.descripcion}</p>}
                  </div>
                  {editable && (
                    <button onClick={() => borrar(it.id)} className="text-white/25 hover:text-red-400 transition-colors flex-shrink-0"><Trash2 size={14} /></button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        {items.length === 0 && (
          <div className="text-center py-10">
            <Sunrise size={26} className="text-[#C9A84C]/30 mx-auto mb-3" />
            <p className="text-white/40 text-sm">Tu cronograma está en blanco.</p>
            {editable && <p className="text-white/25 text-xs mt-1">Empieza por la llegada de invitados, la ceremonia o el brindis.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
