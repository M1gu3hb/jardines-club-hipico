import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lightbulb, X, MessageCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { sugerirParaEvento } from "@/lib/sugerencias";
import { poolSugerible } from "@/lib/catalogo";

/**
 * PortalSugerencias — ideas inteligentes para el evento del cliente.
 *
 * Filosofía: es un susurro, no un anuncio. Sección pequeña al final del inicio,
 * con 3 ideas del catálogo REAL del club según el tipo de evento. Se puede
 * descartar con una X (se recuerda por evento en localStorage) y cada idea
 * solo ofrece "Preguntar" por WhatsApp — sin precios, sin presión.
 */
export default function PortalSugerencias({ evento }) {
  const [sugerencias, setSugerencias] = useState(null);
  const [whatsapp, setWhatsapp] = useState(null);
  const storageKey = `jch_sug_off_${evento.id}`;
  const [oculto, setOculto] = useState(() => {
    try { return localStorage.getItem(storageKey) === "1"; } catch { return false; }
  });

  useEffect(() => {
    if (oculto) return;
    let activo = true;
    (async () => {
      try {
        const [pool, cfg] = await Promise.all([
          poolSugerible(),
          base44.entities.ConfigSitio.list(),
        ]);
        if (!activo) return;
        setWhatsapp(cfg?.[0]?.whatsappNumero || null);
        setSugerencias(sugerirParaEvento(evento, pool, 3));
      } catch {
        if (activo) setSugerencias([]);
      }
    })();
    return () => { activo = false; };
  }, [evento.id, evento.tipoEvento, oculto]);

  const descartar = () => {
    setOculto(true);
    try { localStorage.setItem(storageKey, "1"); } catch { /* sin storage, solo esta sesión */ }
  };

  if (oculto || !sugerencias || sugerencias.length === 0) return null;

  const linkWhatsApp = (titulo) => {
    const num = whatsapp || "525548663656";
    const msg = `Hola, estoy preparando "${evento.nombreEvento}" y me gustaría saber más sobre: ${titulo}`;
    return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45, duration: 0.6 }}
      className="mb-6"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="portal-eyebrow flex items-center gap-1.5">
          <Lightbulb size={12} /> Ideas para tu {evento.tipoEvento || "evento"}
        </p>
        <button
          onClick={descartar}
          aria-label="Ocultar sugerencias"
          title="Ocultar sugerencias"
          className="text-white/20 hover:text-white/50 transition-colors p-1"
        >
          <X size={13} />
        </button>
      </div>

      <div className="space-y-2">
        {sugerencias.map((s) => (
          <div key={s.titulo} className="skeu-card flex items-center gap-3 p-3">
            {s.imagenUrl ? (
              <img src={s.imagenUrl} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" loading="lazy" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-[#C9A84C]/10 flex items-center justify-center flex-shrink-0">
                <Lightbulb size={18} className="text-[#C9A84C]/50" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white/85 text-sm truncate">{s.titulo}</p>
              <p className="text-[#C9A84C]/55 text-[11px]">{s.razon}</p>
            </div>
            <a
              href={linkWhatsApp(s.titulo)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[#C9A84C]/80 hover:text-[#C9A84C] text-xs border border-[#C9A84C]/25 hover:border-[#C9A84C]/50 px-3 py-1.5 rounded-full transition-all flex-shrink-0"
            >
              <MessageCircle size={12} /> Preguntar
            </a>
          </div>
        ))}
      </div>
      <p className="text-white/20 text-[11px] text-center mt-2">
        Ideas según tu tipo de evento · sin ningún compromiso
      </p>
    </motion.div>
  );
}
