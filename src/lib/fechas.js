/**
 * fechas.js — utilidades de fecha para el portal del evento.
 * Las fechas de Postgres llegan como "YYYY-MM-DD"; se parsean como fecha LOCAL
 * (nunca con new Date("YYYY-MM-DD") directo, que las interpreta como UTC y
 * puede recorrer el día).
 */

export function parseFechaLocal(fechaISO) {
  if (!fechaISO) return null;
  const [y, m, d] = String(fechaISO).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/**
 * HOY, en la zona horaria de quien mira — "YYYY-MM-DD".
 *
 * `new Date().toISOString().slice(0, 10)` da el día en **UTC**, y la CDMX va seis horas por
 * detrás. De las 18:00 en adelante, hora local, «hoy» en UTC ya es MAÑANA. El panel del dueño
 * calculaba así los eventos próximos: a partir de las seis de la tarde —justo cuando se mira el
 * panel antes de un evento de noche— el evento de HOY desaparecía de «próximos», porque su fecha
 * había quedado por detrás de un «hoy» que se había adelantado un día.
 *
 * Se compone a mano en vez de con `toISOString` porque es lo que compara contra `fecha_evento`,
 * que es una columna `date` sin zona: un día natural, no un instante.
 */
export function hoyLocal(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** "2026-09-04" → "Viernes 4 de septiembre de 2026" */
export function fechaLarga(fechaISO) {
  const f = parseFechaLocal(fechaISO);
  if (!f) return null;
  const texto = f.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Días que faltan para la fecha (0 = hoy, negativo = ya pasó, null = sin fecha). */
export function diasFaltantes(fechaISO) {
  const f = parseFechaLocal(fechaISO);
  if (!f) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((f - hoy) / 86400000);
}

/** true si el evento ya ocurrió (fecha pasada o estatus Realizado). */
export function eventoYaPaso(evento) {
  if (evento?.estatus === "Realizado") return true;
  const dias = diasFaltantes(evento?.fechaEvento);
  return dias !== null && dias < 0;
}

/** "18:00" (24h) → "6:00 p.m." legible. */
export function horaLegible(hhmm) {
  const m = String(hhmm || "").match(/^(\d{1,2}):(\d{2})/);
  if (!m) return "";
  let h = Number(m[1]);
  const min = m[2];
  const ampm = h >= 12 ? "p.m." : "a.m.";
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${min} ${ampm}`;
}

/** "hace 5 min" / "hace 3 h" / "hace 2 días" a partir de un timestamp ISO. */
export function tiempoRelativo(iso) {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "ahora mismo";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
}
