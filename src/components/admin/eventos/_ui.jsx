/** Helpers de UI compartidos por las pantallas de eventos del panel admin. */
import { Check } from "lucide-react";

export function Field({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div>
      <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">{label}</label>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 text-white/70 text-sm px-4 py-3 outline-none focus:border-[#C9A84C]/40"
      />
    </div>
  );
}

export function Area({ label, value, onChange, rows = 3, placeholder }) {
  return (
    <div>
      <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">{label}</label>
      <textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 text-white/70 text-sm px-4 py-3 outline-none focus:border-[#C9A84C]/40 resize-none"
      />
    </div>
  );
}

export function Toggle({ label, checked, onChange, hint }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-3 text-left">
      <span
        className={`w-5 h-5 rounded border flex items-center justify-center transition-all flex-shrink-0 ${
          checked ? "border-[#C9A84C] bg-[#C9A84C]" : "border-white/20"
        }`}
      >
        {checked && <Check size={10} className="text-black" />}
      </span>
      <span>
        <span className="text-white/60 text-sm">{label}</span>
        {hint && <span className="block text-white/25 text-xs">{hint}</span>}
      </span>
    </button>
  );
}

export const ESTATUS = ["Apartado", "Confirmado", "Realizado", "Cancelado"];

export function estatusColor(estatus) {
  switch (estatus) {
    case "Confirmado": return "text-green-400/80 bg-green-400/10";
    case "Realizado": return "text-[#C9A84C] bg-[#C9A84C]/10";
    case "Cancelado": return "text-red-400/70 bg-red-400/10";
    default: return "text-white/40 bg-white/5";
  }
}
