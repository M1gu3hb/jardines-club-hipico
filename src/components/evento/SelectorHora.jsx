import { useMemo } from "react";

/**
 * SelectorHora — selector de hora PROPIO (no el <input type="time"> nativo).
 * Tres columnas: Hora (1–12), Minuto (cada 5) y AM/PM, con estética del sitio.
 * value/onChange en formato 24h "HH:MM" (o "HH:MM:SS", se ignoran los segundos).
 */
const MINUTOS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

function parse(value) {
  const m = String(value || "").match(/^(\d{1,2}):(\d{2})/);
  if (!m) return { h12: 6, min: "00", ampm: "PM" };
  let h = Number(m[1]);
  const ampm = h >= 12 ? "PM" : "AM";
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  // Redondear el minuto al múltiplo de 5 más cercano para casar con las opciones.
  const min = String(Math.round(Number(m[2]) / 5) * 5 % 60).padStart(2, "0");
  return { h12, min, ampm };
}

function componer(h12, min, ampm) {
  let h = h12 % 12;
  if (ampm === "PM") h += 12;
  return `${String(h).padStart(2, "0")}:${min}`;
}

function Columna({ valor, opciones, onSelect, ancho = "auto", etiquetas }) {
  return (
    <select
      value={valor}
      onChange={(e) => onSelect(e.target.value)}
      className="bg-[#0f0f0f] border border-white/10 text-white/80 text-sm px-2.5 py-2.5 rounded-lg outline-none focus:border-[#C9A84C]/50 text-center appearance-none cursor-pointer"
      style={{ width: ancho }}
    >
      {opciones.map((o) => (
        <option key={o} value={o} className="bg-[#0f0f0f]">{etiquetas ? etiquetas(o) : o}</option>
      ))}
    </select>
  );
}

export default function SelectorHora({ value, onChange }) {
  const { h12, min, ampm } = useMemo(() => parse(value), [value]);

  const set = (nh, nm, na) => onChange(componer(nh, nm, na));

  return (
    <div className="flex items-center gap-2">
      <Columna valor={h12} opciones={Array.from({ length: 12 }, (_, i) => i + 1)}
        onSelect={(v) => set(Number(v), min, ampm)} ancho="56px" />
      <span className="text-white/30 text-lg leading-none">:</span>
      <Columna valor={min} opciones={MINUTOS} onSelect={(v) => set(h12, v, ampm)} ancho="56px" />
      <Columna valor={ampm} opciones={["AM", "PM"]} onSelect={(v) => set(h12, min, v)} ancho="62px" />
    </div>
  );
}
