import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Plus, Check, X, Lightbulb, StickyNote, Trash2, Loader2, Heart,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { sugerirParaEvento, mensajeEleccion } from "@/lib/sugerencias";
import { notificarDueno } from "@/lib/notificar";
import Celebracion from "./Celebracion";

/**
 * PortalArmalo — "Arma tu evento a tu gusto".
 *
 * El cliente explora el catálogo real del club, agrega lo que le ilusiona a SU
 * lista (wishlist) y escribe sus notas e ideas. NADA de esto modifica su
 * contrato: es su espacio creativo. Cada interés le llega al dueño como
 * notificación (dashboard + correo) para darle seguimiento personal.
 */
export default function PortalArmalo({ evento }) {
  const [catalogo, setCatalogo] = useState(null);
  const [lista, setLista] = useState([]);
  const [notas, setNotas] = useState([]);
  const [pestana, setPestana] = useState("ideas");
  const [mensaje, setMensaje] = useState(null);
  const [celebrar, setCelebrar] = useState(false);
  const [notaTexto, setNotaTexto] = useState("");
  const [guardandoNota, setGuardandoNota] = useState(false);
  const [ocupado, setOcupado] = useState(null); // titulo del ítem que se está agregando

  const cargarLista = useCallback(() => {
    base44.entities.EventoWishlist.filter({ eventoId: evento.id }, "-created_date").then(setLista);
  }, [evento.id]);
  const cargarNotas = useCallback(() => {
    base44.entities.EventoNota.filter({ eventoId: evento.id }, "-created_date").then(setNotas);
  }, [evento.id]);

  useEffect(() => {
    let activo = true;
    (async () => {
      const [servicios, amenidades, extras] = await Promise.all([
        base44.entities.ServicioItem.filter({ activo: true }, "orden"),
        base44.entities.AmenidadItem.filter({ activo: true }, "orden"),
        base44.entities.ServicioExtra.filter({ activo: true }, "orden"),
      ]);
      if (activo) setCatalogo({ servicios, amenidades, extras });
    })();
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
      // El dueño se entera (dashboard + correo), sin frenar al cliente.
      notificarDueno({
        eventoId: evento.id,
        tipo: "interes",
        titulo: `💡 ${evento.nombreEvento} está interesado en: ${titulo}`,
        detalle: `${evento.clienteNombre || "El cliente"} lo agregó a su lista de deseos desde su portal (${origen}).`,
      });
    } catch (e) {
      console.error("[armalo] agregar:", e.message);
    } finally {
      setOcupado(null);
    }
  };

  const quitar = async (item) => {
    await base44.entities.EventoWishlist.delete(item.id);
    cargarLista();
  };

  const agregarNota = async () => {
    if (!notaTexto.trim()) return;
    setGuardandoNota(true);
    await base44.entities.EventoNota.create({ eventoId: evento.id, texto: notaTexto.trim() });
    setNotaTexto("");
    setGuardandoNota(false);
    cargarNotas();
  };
  const borrarNota = async (n) => {
    await base44.entities.EventoNota.delete(n.id);
    cargarNotas();
  };

  const sugerencias = catalogo
    ? sugerirParaEvento(evento, catalogo, 4).filter((s) => !enLista(s.titulo))
    : [];

  const itemsPestana = !catalogo ? [] : (
    pestana === "ideas" ? [] :
    pestana === "servicios" ? catalogo.servicios.map((s) => ({ ...s, origen: "servicio" })) :
    pestana === "amenidades" ? catalogo.amenidades.map((a) => ({ ...a, origen: "amenidad" })) :
    catalogo.extras.map((e) => ({ ...e, titulo: e.titulo || e.nombre, origen: "extra" }))
  );

  return (
    <div className="relative">
      {/* Chispas al agregar */}
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
        <div className="relative w-1 h-1">
          <Celebracion activo={celebrar} onFin={() => setCelebrar(false)} tam={190} />
        </div>
      </div>

      {/* Mensaje encantador al agregar */}
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
        <div className="mb-6">
          <p className="portal-eyebrow mb-2 flex items-center gap-1.5"><Heart size={12} /> Mi lista ({lista.length})</p>
          <div className="flex flex-wrap gap-2">
            {lista.map((w) => (
              <span key={w.id} className="flex items-center gap-2 bg-[#C9A84C]/10 border border-[#C9A84C]/30 text-[#E6C870] text-xs px-3 py-2 rounded-full">
                {w.titulo}
                <button onClick={() => quitar(w)} aria-label={`Quitar ${w.titulo}`} className="text-[#C9A84C]/50 hover:text-red-400 transition-colors"><X size={11} /></button>
              </span>
            ))}
          </div>
          <p className="text-white/25 text-[11px] mt-2">Tu coordinador ya puede ver tu lista y te contactará para hacerla realidad. Nada se agrega ni se cobra automáticamente.</p>
        </div>
      )}

      {/* Pestañas del catálogo */}
      <div className="flex gap-2 mb-4">
        {[
          { id: "ideas", label: "Ideas para ti", icon: Lightbulb },
          { id: "servicios", label: "Servicios" },
          { id: "amenidades", label: "Amenidades" },
          { id: "extras", label: "Extras" },
        ].map((t) => (
          <button key={t.id} onClick={() => setPestana(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-full transition-all ${
              pestana === t.id ? "bg-[#C9A84C]/15 text-[#C9A84C] border border-[#C9A84C]/40" : "text-white/35 border border-white/10 hover:text-white/60"
            }`}>
            {t.icon && <t.icon size={12} />} {t.label}
          </button>
        ))}
      </div>

      {!catalogo && <p className="text-white/25 text-sm py-8 text-center">Preparando el catálogo…</p>}

      {/* Ideas inteligentes */}
      {catalogo && pestana === "ideas" && (
        <div className="space-y-2">
          {sugerencias.map((s) => (
            <div key={s.titulo} className="skeu-card flex items-center gap-3 p-3">
              {s.imagenUrl ? (
                <img src={s.imagenUrl} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" loading="lazy" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-[#C9A84C]/10 flex items-center justify-center flex-shrink-0"><Lightbulb size={18} className="text-[#C9A84C]/50" /></div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white/85 text-sm truncate">{s.titulo}</p>
                <p className="text-[#C9A84C]/55 text-[11px]">{s.razon}</p>
              </div>
              <button onClick={() => agregar(s.titulo, s.origen)} disabled={!!ocupado}
                className="flex items-center gap-1.5 skeu-gold-btn text-xs px-3.5 py-2 rounded-full flex-shrink-0 disabled:opacity-50">
                {ocupado === s.titulo ? <Loader2 size={12} className="animate-spin" /> : <Plus size={13} />} A mi lista
              </button>
            </div>
          ))}
          {sugerencias.length === 0 && (
            <p className="text-white/25 text-sm py-6 text-center">¡Ya agregaste nuestras ideas favoritas! Explora el catálogo completo en las pestañas.</p>
          )}
        </div>
      )}

      {/* Catálogo por pestaña */}
      {catalogo && pestana !== "ideas" && (
        <div className="grid grid-cols-2 gap-2.5">
          {itemsPestana.map((it) => {
            const titulo = it.titulo || it.nombre;
            const img = it.imagenUrl || it.imagenesUrl?.[0] || null;
            const ya = enLista(titulo);
            return (
              <div key={titulo} className="skeu-card p-3 flex flex-col">
                {img && <img src={img} alt="" className="w-full h-20 rounded-xl object-cover mb-2" loading="lazy" />}
                <p className="text-white/80 text-xs leading-snug flex-1">{titulo}</p>
                <button onClick={() => agregar(titulo, it.origen)} disabled={ya || !!ocupado}
                  className={`mt-2.5 flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-full transition-all ${
                    ya ? "bg-[#C9A84C]/10 text-[#C9A84C]/70 border border-[#C9A84C]/25 cursor-default"
                       : "border border-white/15 text-white/60 hover:border-[#C9A84C]/50 hover:text-[#C9A84C]"
                  }`}>
                  {ya ? <><Check size={12} /> En tu lista</> : ocupado === titulo ? <Loader2 size={12} className="animate-spin" /> : <><Plus size={12} /> Agregar</>}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Mis notas */}
      <div className="mt-8">
        <p className="portal-eyebrow mb-2 flex items-center gap-1.5"><StickyNote size={12} /> Mis notas e ideas</p>
        <div className="flex gap-2 mb-3">
          <input value={notaTexto} onChange={(e) => setNotaTexto(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && agregarNota()}
            placeholder="Apunta lo que se te ocurra: colores, canciones, detalles…"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl text-white/75 text-sm px-4 py-2.5 outline-none focus:border-[#C9A84C]/40" />
          <button onClick={agregarNota} disabled={guardandoNota || !notaTexto.trim()}
            className="skeu-dark-btn px-4 rounded-xl text-sm disabled:opacity-40">
            {guardandoNota ? <Loader2 size={14} className="animate-spin" /> : <Plus size={15} />}
          </button>
        </div>
        <div className="space-y-2">
          {notas.map((n) => (
            <div key={n.id} className="flex items-start gap-3 bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3">
              <p className="text-white/60 text-sm flex-1 leading-relaxed">{n.texto}</p>
              <button onClick={() => borrarNota(n)} className="text-white/20 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5"><Trash2 size={13} /></button>
            </div>
          ))}
          {notas.length === 0 && <p className="text-white/20 text-xs">Este es tu espacio: nadie más que tú y tu coordinador lo ven.</p>}
        </div>
      </div>
    </div>
  );
}
