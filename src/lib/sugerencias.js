/**
 * sugerencias.js — Motor de sugerencias inteligentes para el portal del evento.
 *
 * Recomienda servicios/amenidades/extras del catálogo REAL del club según el
 * tipo de evento del cliente. Reglas:
 *  - Puntaje por perfil (boda, XV, infantil, corporativo…) usando palabras clave
 *    sobre el título/descripcion de cada ítem del catálogo.
 *  - `servicios_extra.aplica_a` (si no es "todos") filtra/impulsa por tipo.
 *  - Rotación diaria estable: mismo día = mismas sugerencias (no "brincan" al
 *    recargar), otro día = combinación distinta. Semilla = día + id del evento.
 *  - Siempre es una SUGERENCIA discreta: quien la muestra decide cuántas (3).
 */

const PERFILES = [
  {
    id: "boda",
    match: ["boda", "matrimonio", "casamiento", "aniversario", "compromiso"],
    razon: "Un favorito en bodas",
    boost: [
      "auto clásico", "set fotográfico", "cámara 360", "mesa de dulces",
      "pista pixel", "mariachi", "maestro de ceremonias", "mesa de honor",
      "fotógrafo", "barra tipo bar", "montajes", "jardines",
    ],
  },
  {
    id: "xv",
    match: ["xv", "quince", "15 años", "quinceañera"],
    razon: "Éxito en XV años",
    boost: [
      "pista pixel", "cámara 360", "mega pantalla", "mesa de dulces",
      "banda", "set fotográfico", "auto clásico", "pista de baile",
      "grupos musicales", "chinelo",
    ],
  },
  {
    id: "infantil",
    match: ["infantil", "cumple", "niñ", "bautizo", "comunión", "baby", "kids"],
    razon: "A los peques les encanta",
    boost: [
      "inflables", "trampolín", "futbolito", "mago", "piñata", "gladiador",
      "aereobonji", "alberca", "mesa de dulces", "actividades recreativas",
    ],
  },
  {
    id: "corporativo",
    match: ["corporativo", "empresa", "conferencia", "graduación", "posada", "congreso", "capacitación"],
    razon: "Ideal para eventos de empresa",
    boost: [
      "sala para conferencias", "mega pantalla", "maestro de ceremonias",
      "barra tipo bar", "set fotográfico", "estacionamiento", "coordinación",
    ],
  },
];

// Sugerencias seguras para cualquier celebración (fallback).
const BOOST_GENERAL = [
  "mesa de dulces", "set fotográfico", "cámara 360", "pista pixel",
  "fotógrafo", "barra tipo bar", "mariachi", "jardines",
];

const norm = (s) => String(s || "").toLowerCase();

function perfilDe(tipoEvento) {
  const t = norm(tipoEvento);
  return PERFILES.find((p) => p.match.some((k) => t.includes(k))) || null;
}

/** Semilla estable por día + evento (rotación diaria, no por recarga). */
function semillaDiaria(eventoId) {
  const hoy = new Date();
  const dia = hoy.getFullYear() * 1000 + Math.floor((hoy - new Date(hoy.getFullYear(), 0, 0)) / 86400000);
  let h = dia;
  for (const c of String(eventoId || "")) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

/**
 * @param {object} evento     evento del cliente (tipoEvento, id)
 * @param {object} catalogo   { servicios: [], amenidades: [], extras: [] } (camelCase del shim)
 * @param {number} cuantas    cuántas sugerencias devolver (default 3)
 * @returns {Array<{titulo, descripcion, imagenUrl, razon, origen}>}
 */
export function sugerirParaEvento(evento, catalogo, cuantas = 3) {
  const perfil = perfilDe(evento?.tipoEvento);
  const boost = perfil ? perfil.boost : BOOST_GENERAL;
  const razonBase = perfil ? perfil.razon : "Ideal para tu celebración";

  const candidatos = [];
  const agregar = (item, origen) => {
    const texto = norm(item.titulo || item.nombre) + " " + norm(item.descripcion);
    let score = 0;
    boost.forEach((k, i) => {
      if (texto.includes(k)) score += (boost.length - i) * 10; // antes en la lista = más peso
    });
    // extras con aplica_a específico: fuerte señal si coincide con el tipo, fuera si no.
    if (origen === "extra" && item.aplicaA && norm(item.aplicaA) !== "todos") {
      if (perfil && norm(item.aplicaA).includes(perfil.id)) score += 100;
      else if (!norm(evento?.tipoEvento).includes(norm(item.aplicaA))) score = -1;
    }
    if (score > 0) {
      candidatos.push({
        titulo: item.titulo || item.nombre,
        descripcion: item.descripcion || "",
        imagenUrl: item.imagenUrl || item.imagenesUrl?.[0] || null,
        razon: razonBase,
        origen,
        score,
      });
    }
  };

  (catalogo.servicios || []).forEach((s) => agregar(s, "servicio"));
  (catalogo.amenidades || []).forEach((a) => agregar(a, "amenidad"));
  (catalogo.extras || []).forEach((e) => agregar(e, "extra"));

  // Ordenar por puntaje; los que tienen imagen se ven mejor → pequeño empujón.
  candidatos.sort((a, b) => (b.score + (b.imagenUrl ? 5 : 0)) - (a.score + (a.imagenUrl ? 5 : 0)));

  // Dos ítems "parecidos" (uno contiene al otro, p. ej. "Mesa de dulces" y
  // "Mesa de dulces personalizada") no deben salir juntos: se ve descuidado.
  const parecidos = (a, b) => {
    const x = norm(a.titulo);
    const y = norm(b.titulo);
    return x.includes(y) || y.includes(x);
  };

  // Rotación diaria: tomar el top ampliado y elegir `cuantas` a partir de un offset estable.
  const top = candidatos.slice(0, Math.max(cuantas * 3, 9));
  const offset = top.length ? semillaDiaria(evento?.id) % top.length : 0;
  const elegidos = [];
  for (let i = 0; i < top.length && elegidos.length < cuantas; i++) {
    const cand = top[(offset + i) % top.length];
    if (!elegidos.some((e) => parecidos(e, cand))) elegidos.push(cand);
  }
  return elegidos;
}
