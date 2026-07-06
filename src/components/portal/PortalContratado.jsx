import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Package, Check, Sparkles } from "lucide-react";

export default function PortalContratado({ eventoId }) {
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    base44.entities.ItemContratado.filter({ eventoId }, "orden")
      .then(setItems)
      .finally(() => setCargando(false));
  }, [eventoId]);

  if (cargando) return <p className="text-white/25 text-sm py-10 text-center">Repasando tu paquete…</p>;

  const total = items.reduce((acc, it) => acc + (Number(it.precio) || 0) * (Number(it.cantidad) || 1), 0);

  return (
    <div className="max-w-xl mx-auto">
      <div className="space-y-2.5">
        {items.map((it) => (
          <div key={it.id} className="skeu-card flex items-center gap-3.5 px-4 py-3.5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C9A84C]/20 to-[#C9A84C]/5 border border-[#C9A84C]/25 flex items-center justify-center flex-shrink-0">
              <Check size={16} className="text-[#E6C870]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/85 text-sm">{it.descripcion}</p>
              {it.notas && <p className="text-white/35 text-xs mt-0.5">{it.notas}</p>}
            </div>
            {Number(it.cantidad) > 1 && <span className="text-white/30 text-xs flex-shrink-0">×{it.cantidad}</span>}
            {it.precio != null && (
              <span className="text-white/60 text-sm tabular-nums flex-shrink-0">
                ${(Number(it.precio) * (Number(it.cantidad) || 1)).toLocaleString("es-MX")}
              </span>
            )}
          </div>
        ))}

        {items.length === 0 && (
          <div className="text-center py-14">
            <div className="w-16 h-16 rounded-full bg-[#C9A84C]/8 border border-[#C9A84C]/15 flex items-center justify-center mx-auto mb-4">
              <Package size={26} className="text-[#C9A84C]/40" />
            </div>
            <p className="text-white/45 text-sm">Tu paquete se está armando.</p>
            <p className="text-white/25 text-xs mt-1.5 max-w-xs mx-auto">Aquí verás cada servicio contratado en cuanto quede registrado por tu coordinador.</p>
          </div>
        )}

        {total > 0 && (
          <div className="skeu-card flex items-center justify-between px-5 py-4 mt-4 border-[#C9A84C]/30">
            <span className="text-white/50 text-sm flex items-center gap-2"><Sparkles size={14} className="text-[#C9A84C]/60" /> Total de tu evento</span>
            <span className="text-[#E6C870] text-lg font-light tabular-nums">${total.toLocaleString("es-MX")}</span>
          </div>
        )}
      </div>
    </div>
  );
}
