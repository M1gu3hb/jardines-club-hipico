// api/_lib/guard.js — Controles compartidos de las rutas serverless de Jardines.
//
// (Los archivos dentro de carpetas con "_" NO se publican como funciones en Vercel.)
//
// Aquí vive lo que TODA ruta necesita y antes no tenía: límite de tamaño del
// cuerpo, autorización real contra el perfil de Jardines, escape de HTML, rate
// limit persistente e idempotencia. Todo respaldado por PostgreSQL, para que no
// se pueda saltar llamando al endpoint directamente.
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";

/** Escapa texto antes de incrustarlo en HTML de correo. */
export const escHtml = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Cliente con service_role. Solo servidor; nunca se expone al navegador. */
export function clienteAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole, {
    db: { schema: "jardines" },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Lee y valida el cuerpo con un tope de tamaño.
 * Devuelve { ok, body } o { ok:false, status:413|400 }.
 */
export function leerBody(req, maxBytes = 16 * 1024) {
  let body = req.body;
  if (typeof body === "string") {
    if (Buffer.byteLength(body, "utf8") > maxBytes) return { ok: false, status: 413 };
    try { body = JSON.parse(body); } catch { return { ok: false, status: 400 }; }
  } else if (body && typeof body === "object") {
    if (Buffer.byteLength(JSON.stringify(body), "utf8") > maxBytes) return { ok: false, status: 413 };
  } else {
    body = {};
  }
  return { ok: true, body: body || {} };
}

/** Bearer token de la cabecera Authorization. */
export function bearer(req) {
  const h = req.headers.authorization || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

/**
 * Comparación en tiempo constante, para que un atacante no pueda deducir el
 * secreto midiendo cuánto tarda la respuesta.
 */
export function igualSeguro(a, b) {
  const A = Buffer.from(String(a ?? ""), "utf8");
  const B = Buffer.from(String(b ?? ""), "utf8");
  if (A.length !== B.length) {
    // Se compara igual contra sí mismo para no delatar la longitud por tiempo.
    try { timingSafeEqual(A, A); } catch { /* noop */ }
    return false;
  }
  return timingSafeEqual(A, B);
}

/**
 * Autoriza al llamador como usuario DE JARDINES.
 *
 * Una sesión válida del Supabase compartido NO basta: el proyecto es compartido
 * con Vero Seguros, así que un usuario suyo tiene sesión válida y aun así no
 * debe poder tocar nada de Jardines. Se exige perfil en jardines.perfiles.
 *
 * @returns {Promise<{ok:true,user,perfil}|{ok:false,status:number}>}
 */
export async function autorizarJardines(req, admin, { rol } = {}) {
  const token = bearer(req);
  if (!token) return { ok: false, status: 401 };

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return { ok: false, status: 401 };

  const { data: perfil } = await admin
    .from("perfiles").select("rol, nombre").eq("user_id", data.user.id).maybeSingle();

  // Sin perfil de Jardines → 403 (caso típico: usuario de Vero Seguros).
  if (!perfil) return { ok: false, status: 403 };
  if (rol && perfil.rol !== rol) return { ok: false, status: 403 };

  return { ok: true, user: data.user, perfil };
}

/** Rate limit persistente en PostgreSQL. true = permitido. */
export async function rateLimit(admin, bucket, clave, max, segundos) {
  const { data, error } = await admin.rpc("api_rate_limit", {
    p_bucket: bucket, p_clave: String(clave ?? "global"),
    p_max: max, p_segundos: segundos,
  });
  // Fail-closed: si el control no se puede evaluar, no se deja pasar.
  if (error) return false;
  return data === true;
}

/**
 * Idempotencia RECUPERABLE.
 *
 * Devuelve 'procede' | 'duplicado' | 'en_curso' | 'error'. La clave no queda
 * consumida hasta que se llama a `idemCerrar(..., true)`: si el envío falla, se
 * marca 'fallido' y el reintento vuelve a proceder. Un proceso interrumpido se
 * recupera solo cuando vence su lease.
 */
export async function idemIniciar(admin, endpoint, clave, leaseSeg = 60, horas = 24) {
  const { data, error } = await admin.rpc("api_idem_iniciar", {
    p_endpoint: endpoint, p_clave: String(clave ?? ""),
    p_lease_seg: leaseSeg, p_horas: horas,
  });
  if (error) return "error";
  return data;
}

/** Cierra la clave: true = completado (no se repite), false = fallido (reintentable). */
export async function idemCerrar(admin, endpoint, clave, ok) {
  try {
    await admin.rpc("api_idem_cerrar", {
      p_endpoint: endpoint, p_clave: String(clave ?? ""), p_ok: ok,
    });
  } catch { /* no debe tumbar la respuesta */ }
}

/** Registro en la bitácora de Jardines (nunca guarda secretos). */
export async function auditar(admin, accion, resultado, extra = {}) {
  try {
    await admin.rpc("api_auditar", {
      p_accion: accion, p_resultado: resultado,
      p_entidad: extra.entidad ?? null, p_entidad_id: extra.entidadId ?? null,
      p_evento_id: extra.eventoId ?? null, p_detalle: extra.detalle ?? {},
    });
  } catch { /* la auditoría nunca tumba la operación */ }
}

/** IP del cliente según el gateway de Vercel; nunca del cuerpo de la petición. */
export function ipCliente(req) {
  const xff = req.headers["x-forwarded-for"];
  if (!xff) return "sin-ip";
  return String(Array.isArray(xff) ? xff[0] : xff).split(",")[0].trim() || "sin-ip";
}

/** Respuesta genérica: no revela si el recurso existe ni por qué falló. */
export function generico(res, status) {
  const msg = {
    400: "Solicitud inválida",
    401: "No autorizado",
    403: "No autorizado",
    405: "Método no permitido",
    413: "Solicitud demasiado grande",
    429: "Demasiadas solicitudes. Intenta más tarde.",
    500: "Error del servidor",
  }[status] || "Error";
  res.status(status).json({ error: msg });
}
