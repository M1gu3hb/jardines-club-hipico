import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Plus, Check, X, Lightbulb, StickyNote, Trash2, Loader2, Heart, Wand2,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { sugerirParaEvento, mensajeEleccion } from "@/lib/sugerencias";
import { poolSugerible } from "@/lib/catalogo";
import { imagenDe } from "@/lib/media";
import { notificarDueno } from "@/lib/notificar";
import Celebracion from "./Celebracion";

/** Miniatura: imagen real o ícono dorado (nunca imagen rota). */
function Miniatura({ src, size = 56 }) {
  if (src) {
    return <img src={src} alt="" style={{ width: size, height: size }} className="rounded-xl object-cover flex-shrink-0" loading="lazy" />;
  }
  return (
    <div style={{ width: size, height: size }} className="rounded-xl bg-gradient-to-br from-[#C9A84C]/15 to-[#C9A84C]/5 border border-[#C9A84C]/15 flex items-center justify-center flex-shrink-0">
      <Wand2 size={size * 0.34} className="text-[#C9A84C]/60" />
    </div>
  );
}

/**
 * PortalArmalo — "Arma tu evento a tu gusto".
 * El cliente explora add-ons reales del club y arma su lista de deseos + notas.
 * Nada modifica su contrato; cada interés le llega al dueño (dashboard + correo).
 */
export default function PortalArmalo({ evento }) {
  const [pool, setPool] = useState(null);
  const [lista, setLista] = useState([]);
  const [notas, setNotas] = useState([]);
  const [pestana, setPestana] = useState("ideas");
  const [mensaje, setMensaje] = useState(null);
  const [celebrar, setCelebrar] = useState(false);
  const [notaTexto, setNotaTexto] = useState("");
  const [guardandoNota, setGuardandoNota] = useState(false);
  const [ocupado, setOcupado] = useState(null);

  const cargarLista = useCallback(() => {
    base44.entities.EventoWishlist.filter({ eventoId: evento.id }, "-created_date").then(setLista);
  }, [evento.id]);
  const cargarNotas = useCallback(() => {
    base44.entities.EventoNota.filter({ eventoId: evento.id }, "-created_date").then(setNotas);
  }, [evento.id]);

  useEffect(() => {
    let activo = true;
    poolSugerible().then((p) => { if (activo) setPool(p); }).catch(() => { if (activo) setPool([]); });
    cargarLista();
    cargarNotas();
    return () => { activo = false; };
  }, [evento.id, cargarLista, cargarNotas]);

  const enLista = (titulo) => lista.some((w) => w.titulo === titulo);

  const agregar = async (titulo, origen) => {
    if (enLista(titulo) || ocupado) return;
    setOcupado(titulo);
    try {
      await base44.entities.EventoWishlist.create({ eventoId: evento.id, titulo, origen });
      setMensaje(mensajeEleccion(titulo, evento.tipoEvento));
      setCelebrar(true);
      cargarLista();
      notificarDueno({
        eventoId: evento.id,
        tipo: "interes",
        titulo: `💡 ${evento.nombreEvento} está interesado en: ${titulo}`,
        detalle: `${evento.clienteNombre || "El cliente"} lo agregó a su lista de deseos desde su portal.`,
      });
    } catch (e) {
      console.error("[armalo] agregar:", e.message);
    } finally {
      setOcupado(null);
    }
  };

  const quitar = async (item) => { await base44.entities.EventoWishlist.delete(item.id); cargarLista(); };

  const agregarNota = async () => {
    if (!notaTexto.trim()) return;
    setGuardandoNota(true);
    await base44.entities.EventoNota.create({ eventoId: evento.id, texto: notaTexto.trim() });
    setNotaTexto("");
    setGuardandoNota(false);
    cargarNotas();
  };
  const borrarNota = async (n) => { await base44.entities.EventoNota.delete(n.id); cargarNotas(); };

  const sugerencias = pool ? sugerirParaEvento(evento, pool, 5).filter((s) => !enLista(s.titulo)) : [];
  const explorar = pool || [];

  return (
    <div className="relative">
      {/* Chispas al agregar */}
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
        <div className="relative w-1 h-1"><Celebracion activo={celebrar} onFin={() => setCelebrar(false)} tam={190} /></div>
      </div>

      {/* Mensaje encantador */}
      <AnimatePresence>
        {mensaje && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="skeu-card border-[#C9A84C]/40 px-5 py-4 mb-5 flex items-start gap-3"
          >
            <Sparkles size={17} className="text-[#E6C870] flex-shrink-0 mt-0.5" />
            <p className="text-white/85 text-sm leading-relaxed flex-1">{mensaje}</p>
            <button onClick={() => setMensaje(null)} className="text-white/25 hover:text-white/60 flex-shrink-0"><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mi lista */}
      {lista.length > 0 && (
        <div className="skeu-card p-5 mb-6">
          <p className="portal-eyebrow mb-3 flex items-center gap-1.5"><Heart size={12} className="text-[#E6C870]" /> Mi lista de deseos · {lista.length}</p>
          <div className="flex flex-wrap gap-2">
            {lista.map((w) => (
              <span key={w.id} className="flex items-center gap-2 bg-[#C9A84C]/12 border border-[#C9A84C]/35 text-[#E6C870] text-xs px-3 py-2 rounded-full">
                {w.titulo}
                <button onClick={() => quitar(w)} aria-label={`Quitar ${w.titulo}`} className="text-[#C9A84C]/50 hover:text-red-400 transition-colors"><X size={11} /></button>
              </span>
            ))}
          </div>
          <p className="text-white/30 text-[11px] mt-3">Tu coordinador ya ve tu lista y te contactará para hacerla realidad. Nada se agrega ni se cobra automáticamente.</p>
        </div>
      )}

      {/* Pestañas */}
      <div className="flex gap-2 mb-4">
        {[
          { id: "ideas", label: "Ideas para ti", icon: Lightbulb },
          { id: "explorar", label: "Explorar todo", icon: Sparkles },
        ].map((t) => (
          <button key={t.id} onClick={() => setPestana(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs rounded-full transition-all ${
              pestana === t.id ? "bg-[#C9A84C]/15 text-[#C9A84C] border border-[#C9A84C]/40" : "text-white/35 border border-white/10 hover:text-white/60"
            }`}>
            <t.icon size={12} /> {t.label}
          </button>
        ))}
      </div>

      {!pool && <p className="text-white/25 text-sm py-8 text-center">Preparando ideas para tu evento…</p>}

      {/* Ideas inteligentes */}
      {pool && pestana === "ideas" && (
        <div className="space-y-2.5">
          {sugerencias.map((s) => (
            <motion.div key={s.titulo} layout className="skeu-card skeu-card-hover flex items-center gap-3.5 p-3">
              <Miniatura src={s.imagenUrl} />
              <div className="flex-1 min-w-0">
                <p className="text-white/85 text-sm font-medium truncate">{s.titulo}</p>
                <p className="text-[#C9A84C]/60 text-[11px] flex items-center gap-1"><Sparkles size={9} /> {s.razon}</p>
              </div>
              <button onClick={() => agregar(s.titulo, s.origen)} disabled={!!ocupado}
                className="flex items-center gap-1.5 skeu-gold-btn text-xs px-4 py-2 rounded-full flex-shrink-0 disabled:opacity-50">
                {ocupado === s.titulo ? <Loader2 size={12} className="animate-spin" /> : <Plus size={13} />} A mi lista
              </button>
            </motion.div>
          ))}
          {sugerencias.length === 0 && (
            <p className="text-white/25 text-sm py-6 text-center">¡Ya agregaste nuestras ideas favoritas! Mira todo el catálogo en "Explorar todo".</p>
          )}
        </div>
      )}

      {/* Explorar catálogo sugerible */}
      {pool && pestana === "explorar" && (
        <div className="grid grid-cols-2 gap-3">
          {explorar.map((it) => {
            const titulo = it.titulo || it.nombre;
            const img = imagenDe(it);
            const ya = enLista(titulo);
            return (
              <div key={titulo} className="skeu-card overflow-hidden flex flex-col">
                {img ? (
                  <img src={img} alt="" className="w-full h-24 object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-24 bg-gradient-to-br from-[#C9A84C]/12 to-transparent flex items-center justify-center">
                    <Wand2 size={22} className="text-[#C9A84C]/40" />
                  </div>
                )}
                <div className="p-3 flex flex-col flex-1">
                  <p className="text-white/80 text-xs leading-snug flex-1">{titulo}</p>
                  <button onClick={() => agregar(titulo, it.origen)} disabled={ya || !!ocupado}
                    className={`mt-2.5 flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-full transition-all ${
                      ya ? "bg-[#C9A84C]/12 text-[#E6C870] border border-[#C9A84C]/30 cursor-default"
                         : "border border-white/15 text-white/60 hover:border-[#C9A84C]/50 hover:text-[#C9A84C]"
                    }`}>
                    {ya ? <><Check size={12} /> En tu lista</> : ocupado === titulo ? <Loader2 size={12} className="animate-spin" /> : <><Plus size={12} /> Agregar</>}
                  </button>
                </div>
              </div>
            );
          })}
          {explorar.length === 0 && <p className="text-white/25 text-sm py-6 text-center col-span-2">Pronto habrá más ideas por aquí.</p>}
        </div>
      )}

      {/* Mis notas */}
      <div className="mt-8">
        <p className="portal-eyebrow mb-2 flex items-center gap-1.5"><StickyNote size={12} /> Mis notas e ideas</p>
        <div className="flex gap-2 mb-3">
          <input value={notaTexto} onChange={(e) => setNotaTexto(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && agregarNota()}
            placeholder="Colores, canciones, detalles especiales…"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl text-white/75 text-sm px-4 py-2.5 outline-none focus:border-[#C9A84C]/40" />
          <button onClick={agregarNota} disabled={guardandoNota || !notaTexto.trim()}
            className="skeu-dark-btn px-4 rounded-xl text-sm disabled:opacity-40">
            {guardandoNota ? <Loader2 size={14} className="animate-spin" /> : <Plus size={15} />}
          </button>
        </div>
        <div className="space-y-2">
          {notas.map((n) => (
            <div key={n.id} className="flex items-start gap-3 skeu-card px-4 py-3">
              <StickyNote size={13} className="text-[#C9A84C]/50 flex-shrink-0 mt-0.5" />
              <p className="text-white/65 text-sm flex-1 leading-relaxed">{n.texto}</p>
              <button onClick={() => borrarNota(n)} className="text-white/20 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5"><Trash2 size={13} /></button>
            </div>
          ))}
          {notas.length === 0 && <p className="text-white/20 text-xs">Este es tu espacio: solo tú y tu coordinador lo ven.</p>}
        </div>
      </div>
    </div>
  );
}
