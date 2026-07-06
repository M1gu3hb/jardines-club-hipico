import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Package } from "lucide-react";

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
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-3 skeu-card px-4 py-3.5">
            <div className="w-8 h-8 rounded-full bg-[#C9A84C]/10 flex items-center justify-center flex-shrink-0">
              <Package size={14} className="text-[#C9A84C]/70" />
            </div>
            <span className="text-white/20 text-xs">{it.cantidad || 1}×</span>
            <div className="flex-1 min-w-0">
              <p className="text-white/80 text-sm truncate">{it.descripcion}</p>
              {it.notas && <p className="text-white/25 text-xs truncate">{it.notas}</p>}
            </div>
            {it.precio != null && (
              <span className="text-white/55 text-sm tabular-nums">
                ${(Number(it.precio) * (Number(it.cantidad) || 1)).toLocaleString("es-MX")}
              </span>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-center py-10">
            <Package size={26} className="text-[#C9A84C]/30 mx-auto mb-3" />
            <p className="text-white/40 text-sm">Tu paquete aún se está armando.</p>
            <p className="text-white/25 text-xs mt-1">Aquí verás cada servicio contratado en cuanto quede registrado.</p>
          </div>
        )}
        {total > 0 && (
          <div className="flex justify-end pt-3">
            <span className="text-white/40 text-sm">Total: <span className="text-[#C9A84C]">${total.toLocaleString("es-MX")}</span></span>
          </div>
        )}
      </div>
    </div>
  );
}
