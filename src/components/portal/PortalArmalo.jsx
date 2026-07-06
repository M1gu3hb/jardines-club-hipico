import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Plus, Check, X, Lightbulb, StickyNote, Trash2, Loader2, Heart, Wand2, MessageCircle,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { sugerirParaEvento, mensajeEleccion } from "@/lib/sugerencias";
import { poolSugerible } from "@/lib/catalogo";
import { imagenDe } from "@/lib/media";
import { notificarDueno, registrarActividad } from "@/lib/notificar";
import Celebracion from "./Celebracion";
import MediaCarrusel from "@/components/MediaCarrusel";

const WHATSAPP_DEFAULT = "525548663656";

/** Todos los medios (imágenes Y videos) de un ítem del catálogo. */
function mediosDe(item) {
  const arr = [];
  if (item?.imagenUrl) arr.push(item.imagenUrl);
  (item?.imagenesUrl || []).forEach((u) => { if (u && !arr.includes(u)) arr.push(u); });
  return arr;
}

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
 * Tocar un ítem abre su DETALLE (hoja glass mobile-first) con descripción y
 * carrusel deslizable de fotos/video; desde ahí (o desde la tarjeta) se agrega
 * a la lista o se pregunta por WhatsApp sobre ESE servicio en específico.
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
  const [detalle, setDetalle] = useState(null); // ítem abierto en la hoja
  const [whatsapp, setWhatsapp] = useState(WHATSAPP_DEFAULT);

  const cargarLista = useCallback(() => {
    base44.entities.EventoWishlist.filter({ eventoId: evento.id }, "-created_date").then(setLista);
  }, [evento.id]);
  const cargarNotas = useCallback(() => {
    base44.entities.EventoNota.filter({ eventoId: evento.id }, "-created_date").then(setNotas);
  }, [evento.id]);

  useEffect(() => {
    let activo = true;
    poolSugerible().then((p) => { if (activo) setPool(p); }).catch(() => { if (activo) setPool([]); });
    base44.entities.ConfigSitio.list()
      .then((c) => { if (activo && c?.[0]?.whatsappNumero) setWhatsapp(c[0].whatsappNumero); })
      .catch(() => {});
    cargarLista();
    cargarNotas();
    return () => { activo = false; };
  }, [evento.id, cargarLista, cargarNotas]);

  const enLista = (titulo) => lista.some((w) => w.titulo === titulo);

  const linkWhatsApp = (titulo) => {
    const msg = `Hola, estoy preparando "${evento.nombreEvento}" y me interesa: ${titulo}. ¿Me pueden dar más información?`;
    return `https://wa.me/${whatsapp}?text=${encodeURIComponent(msg)}`;
  };

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

  const quitar = async (item) => {
    await base44.entities.EventoWishlist.delete(item.id);
    cargarLista();
    // Al dueño le sirve saber qué se enfrió (solo dashboard, sin correo).
    registrarActividad({
      eventoId: evento.id,
      clave: `quito_${item.titulo}_${Date.now()}`,
      tipo: "interes_quitado",
      titulo: `💔 ${evento.nombreEvento} quitó de su lista: ${item.titulo}`,
    });
  };

  const agregarNota = async () => {
    if (!notaTexto.trim()) return;
    setGuardandoNota(true);
    await base44.entities.EventoNota.create({ eventoId: evento.id, texto: notaTexto.trim() });
    setNotaTexto("");
    setGuardandoNota(false);
    cargarNotas();
    registrarActividad({
      eventoId: evento.id,
      clave: `nota_${Date.now()}`,
      tipo: "nota",
      titulo: `📝 ${evento.nombreEvento} dejó una nota nueva`,
    });
  };
  const borrarNota = async (n) => { await base44.entities.EventoNota.delete(n.id); cargarNotas(); };

  const sugerencias = pool ? sugerirParaEvento(evento, pool, 5).filter((s) => !enLista(s.titulo)) : [];
  const explorar = pool || [];
  const itemDe = (titulo) => (pool || []).find((p) => (p.titulo || p.nombre) === titulo);

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
              <span key={w.id} className="glass-chip glass-chip--activo flex items-center gap-2 text-xs px-3 py-2 rounded-full">
                {w.titulo}
                <button onClick={() => quitar(w)} aria-label={`Quitar ${w.titulo}`} className="text-[#C9A84C]/50 hover:text-red-400 transition-colors"><X size={11} /></button>
              </span>
            ))}
          </div>
          <p className="text-white/30 text-[11px] mt-3">Tu coordinador ya ve tu lista y te contactará para hacerla realidad. Nada se agrega ni se cobra automáticamente.</p>
        </div>
      )}

      {/* Pestañas (glass) */}
      <div className="flex gap-2 mb-4">
        {[
          { id: "ideas", label: "Ideas para ti", icon: Lightbulb },
          { id: "explorar", label: "Explorar todo", icon: Sparkles },
        ].map((t) => (
          <button key={t.id} onClick={() => setPestana(t.id)}
            className={`glass-chip flex items-center gap-1.5 px-4 py-2 text-xs rounded-full ${pestana === t.id ? "glass-chip--activo" : "text-white/40"}`}>
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
              <button type="button" onClick={() => setDetalle(itemDe(s.titulo) || s)} className="flex items-center gap-3.5 flex-1 min-w-0 text-left">
                <Miniatura src={s.imagenUrl} />
                <div className="flex-1 min-w-0">
                  <p className="text-white/85 text-sm font-medium truncate">{s.titulo}</p>
                  <p className="text-[#C9A84C]/60 text-[11px] flex items-center gap-1"><Sparkles size={9} /> {s.razon} · toca para ver más</p>
                </div>
              </button>
              <a href={linkWhatsApp(s.titulo)} target="_blank" rel="noopener noreferrer" aria-label={`Preguntar por ${s.titulo} en WhatsApp`}
                className="glass-chip w-9 h-9 rounded-full flex items-center justify-center text-[#25D366] flex-shrink-0 active:scale-95">
                <MessageCircle size={16} />
              </a>
              <button onClick={() => agregar(s.titulo, s.origen)} disabled={!!ocupado}
                className="flex items-center gap-1.5 skeu-gold-btn text-xs px-3.5 py-2 rounded-full flex-shrink-0 disabled:opacity-50">
                {ocupado === s.titulo ? <Loader2 size={12} className="animate-spin" /> : <Plus size={13} />} Agregar
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
                <button type="button" onClick={() => setDetalle(it)} className="text-left">
                  {img ? (
                    <img src={img} alt="" className="w-full h-24 object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-24 bg-gradient-to-br from-[#C9A84C]/12 to-transparent flex items-center justify-center">
                      <Wand2 size={22} className="text-[#C9A84C]/40" />
                    </div>
                  )}
                  <p className="text-white/80 text-xs leading-snug px-3 pt-3">{titulo}</p>
                  <p className="text-[#C9A84C]/45 text-[10px] px-3 pt-0.5">Toca para ver más</p>
                </button>
                <div className="p-3 mt-auto flex items-center gap-2">
                  <button onClick={() => agregar(titulo, it.origen)} disabled={ya || !!ocupado}
                    className={`flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-full transition-all ${
                      ya ? "bg-[#C9A84C]/12 text-[#E6C870] border border-[#C9A84C]/30 cursor-default"
                         : "glass-chip text-white/60 hover:text-[#C9A84C]"
                    }`}>
                    {ya ? <><Check size={12} /> En tu lista</> : ocupado === titulo ? <Loader2 size={12} className="animate-spin" /> : <><Plus size={12} /> Agregar</>}
                  </button>
                  <a href={linkWhatsApp(titulo)} target="_blank" rel="noopener noreferrer" aria-label={`Preguntar por ${titulo} en WhatsApp`}
                    className="glass-chip w-8 h-8 rounded-full flex items-center justify-center text-[#25D366] flex-shrink-0 active:scale-95">
                    <MessageCircle size={14} />
                  </a>
                </div>
              </div>
            );
          })}
          {explorar.length === 0 && <p className="text-white/25 text-sm py-6 text-center col-span-2">Pronto habrá más ideas por aquí.</p>}
        </div>
      )}

      {/* Mis notas — un mensaje directo a quien atiende tu evento */}
      <div className="mt-8">
        <div className="skeu-card border-[#C9A84C]/30 p-4 mb-3">
          <p className="text-white/80 text-sm flex items-start gap-2.5 leading-relaxed">
            <StickyNote size={16} className="text-[#E6C870] flex-shrink-0 mt-0.5" />
            <span>
              <span className="text-[#E6C870] font-medium">Quien está atendiendo tu evento leerá cada nota.</span>{" "}
              <span className="text-white/55">Cuéntale qué SÍ quieres y qué NO: colores, detalles, cosas que no deben faltar (o que no quieres ver).</span>
            </span>
          </p>
        </div>
        <div className="flex gap-2 mb-3">
          <input value={notaTexto} onChange={(e) => setNotaTexto(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && agregarNota()}
            placeholder='Ej. "Quiero centros de mesa con girasoles" o "No quiero reggaetón en la comida"'
            className="glass-chip flex-1 rounded-xl text-white/75 text-sm px-4 py-2.5 outline-none focus:border-[#C9A84C]/50 bg-transparent" />
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
          {notas.length === 0 && <p className="text-white/20 text-xs">Cada nota que dejes aquí llega directo a tu coordinador.</p>}
        </div>
      </div>

      {/* ===== Hoja de detalle del ítem (glass, mobile-first) ===== */}
      <AnimatePresence>
        {detalle && (
          <>
            <motion.div
              className="fixed inset-0 z-[60] bg-black/60"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDetalle(null)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="glass-sheet fixed inset-x-0 bottom-0 z-[70] rounded-t-3xl max-h-[88vh] overflow-y-auto"
            >
              <div className="max-w-lg mx-auto px-5 pt-3 pb-8">
                <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-4" />
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="text-white text-lg font-light leading-snug">{detalle.titulo || detalle.nombre}</h3>
                  <button onClick={() => setDetalle(null)} aria-label="Cerrar"
                    className="glass-chip w-8 h-8 rounded-full flex items-center justify-center text-white/60 flex-shrink-0">
                    <X size={15} />
                  </button>
                </div>

                {mediosDe(detalle).length > 0 && (
                  <MediaCarrusel media={mediosDe(detalle)} alt={detalle.titulo || detalle.nombre} className="mb-4" />
                )}

                {detalle.descripcion && (
                  <p className="text-white/60 text-sm leading-relaxed mb-5">{detalle.descripcion}</p>
                )}

                <div className="flex items-center gap-2.5">
                  {enLista(detalle.titulo || detalle.nombre) ? (
                    <span className="flex-1 flex items-center justify-center gap-2 bg-[#C9A84C]/12 text-[#E6C870] border border-[#C9A84C]/30 text-sm py-3 rounded-full">
                      <Check size={15} /> En tu lista
                    </span>
                  ) : (
                    <button
                      onClick={() => { agregar(detalle.titulo || detalle.nombre, detalle.origen); setDetalle(null); }}
                      disabled={!!ocupado}
                      className="skeu-gold-btn flex-1 flex items-center justify-center gap-2 text-sm py-3 rounded-full disabled:opacity-50"
                    >
                      <Plus size={15} /> Agregar a mi lista
                    </button>
                  )}
                  <a href={linkWhatsApp(detalle.titulo || detalle.nombre)} target="_blank" rel="noopener noreferrer"
                    className="glass-chip flex items-center justify-center gap-2 text-[#25D366] text-sm px-4 py-3 rounded-full active:scale-95">
                    <MessageCircle size={16} /> Preguntar
                  </a>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
