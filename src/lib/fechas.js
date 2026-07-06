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
