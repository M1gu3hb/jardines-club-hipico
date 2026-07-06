/**
 * cronogramaSugerencias.js — sugerencias inteligentes para armar el cronograma.
 *
 * Conocimiento del club: el salón es por 6 horas (media hora de entrada y media de
 * salida), la comida suele durar 1 hora, la batucada acompaña toda la fiesta con
 * shows y regalos, y hay momentos clásicos según el tipo de evento (vals en XV,
 * primer baile en bodas…). NO impone un cronograma: sugiere el siguiente momento
 * lógico según lo que el cliente ya puso.
 */

const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

// Flujo típico de un evento en Jardines (en orden). `solo` acota por tipo de evento.
const FLUJO = [
  { titulo: "Llegada y recepción de invitados", claves: ["recepcion", "llegada", "bienvenida"], desc: "La media hora de entrada" },
  { titulo: "Entrada del festejado", claves: ["entrada"], solo: ["xv", "infantil", "cumple"] },
  { titulo: "Entrada de los novios", claves: ["entrada"], solo: ["boda"] },
  { titulo: "Comida", claves: ["comida", "banquete", "cena"], desc: "Normalmente 1 hora" },
  { titulo: "Brindis", claves: ["brindis"] },
  { titulo: "Vals", claves: ["vals"], solo: ["xv"] },
  { titulo: "Primer baile", claves: ["primer baile", "vals"], solo: ["boda"] },
  { titulo: "Batucada y fiesta", claves: ["batucada", "fiesta", "hora loca"], desc: "Shows, regalos y ambiente toda la noche" },
  { titulo: "Show sorpresa", claves: ["show"] },
  { titulo: "Pastel", claves: ["pastel"] },
  { titulo: "Regalos y sorpresas", claves: ["regalo", "sorpresa"] },
  { titulo: "Baile libre", claves: ["baile libre", "baile"] },
  { titulo: "Despedida de invitados", claves: ["despedida", "salida"], desc: "La media hora de salida" },
];

function perfilTipo(tipoEvento) {
  const t = norm(tipoEvento);
  if (/xv|quince|15/.test(t)) return "xv";
  if (/boda|matrimonio/.test(t)) return "boda";
  if (/infantil|cumple|bautizo|comunion/.test(t)) return "infantil";
  return "general";
}

/**
 * Sugiere los siguientes momentos del cronograma.
 * @param {Array}  existentes  items actuales del cronograma [{titulo}]
 * @param {string} tipoEvento  tipo del evento ("XV años", "Boda"…)
 * @param {number} n           cuántas sugerencias (default 4)
 * @returns {Array<{titulo, desc}>}
 */
export function sugerirMomentos(existentes = [], tipoEvento = "", n = 4) {
  const tipo = perfilTipo(tipoEvento);
  const textos = existentes.map((e) => norm(e.titulo));
  const yaEsta = (paso) =>
    textos.some((t) => paso.claves.some((k) => t.includes(k)) || t.includes(norm(paso.titulo)));

  return FLUJO
    .filter((p) => !p.solo || p.solo.includes(tipo))
    .filter((p) => !yaEsta(p))
    .slice(0, n)
    .map(({ titulo, desc }) => ({ titulo, desc: desc || null }));
}

/** Hora sugerida para el siguiente momento: la última del cronograma + 1 hora. */
export function horaSugerida(existentes = [], base = "14:00") {
  const horas = existentes.map((e) => e.hora).filter(Boolean).sort();
  if (!horas.length) return base;
  const m = String(horas[horas.length - 1]).match(/^(\d{1,2}):(\d{2})/);
  if (!m) return base;
  const h = (Number(m[1]) + 1) % 24;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}
