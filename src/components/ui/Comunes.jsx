/**
 * Controles de UI comunes a las TRES aplicaciones (web / portal / CRM).
 *
 * Vivían en `src/components/admin/eventos/_ui.jsx`, y eso hacía que el portal y el editor de
 * mesas dependieran del panel de administración: los acoplamientos A1 y A2 de
 * `docs/PLAN-INDEPENDIZACION.md` §3. Al separar los repos, ese import cruzado obligaría a
 * llevarse medio panel dentro del portal.
 *
 * Este módulo es NEUTRAL a propósito: su única dependencia es `lucide-react`.
 *
 * En concreto NO importa `@/lib/catalogos`. La lista `EVENTO_ESTATUS` es del dominio de eventos
 * —que viaja al CRM— y solo la consumen dos pantallas del panel, así que su re-export se queda
 * en `_ui.jsx`. Si se subiera aquí, el portal tendría que arrastrar `catalogos.js` para
 * satisfacer un re-export que no usa. Es la dependencia que avisa el plan (§3, nota de `_ui`).
 */
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

export function estatusColor(estatus) {
  switch (estatus) {
    case "Confirmado": return "text-green-400/80 bg-green-400/10";
    case "Realizado": return "text-[#C9A84C] bg-[#C9A84C]/10";
    case "Cancelado": return "text-red-400/70 bg-red-400/10";
    default: return "text-white/40 bg-white/5";
  }
}
