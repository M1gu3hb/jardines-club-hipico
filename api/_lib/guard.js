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

/**
 * Cierra la clave: true = completado (no se repite), false = fallido (reintentable).
 *
 * Devuelve `true` solo si la base confirmó el cierre. supabase-js NO lanza: en un
 * fallo resuelve la promesa con `{ error }`, así que un try/catch por sí solo da
 * la falsa impresión de que todo salió bien.
 */
export async function idemCerrar(admin, endpoint, clave, ok) {
  try {
    const { error } = await admin.rpc("api_idem_cerrar", {
      p_endpoint: endpoint, p_clave: String(clave ?? ""), p_ok: ok,
    });
    if (error) {
      console.error("[guard] idemCerrar:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[guard] idemCerrar:", e.message);
    return false;
  }
}

/**
 * Llama una RPC y devuelve { ok, data }. Nunca da éxito si Supabase reportó
 * error, aunque la promesa se haya resuelto.
 */
export async function rpcSeguro(admin, nombre, params) {
  try {
    const { data, error } = await admin.rpc(nombre, params);
    if (error) {
      console.error(`[guard] rpc ${nombre}:`, error.message);
      return { ok: false, data: null };
    }
    return { ok: true, data };
  } catch (e) {
    console.error(`[guard] rpc ${nombre}:`, e.message);
    return { ok: false, data: null };
  }
}

/**
 * Borra un usuario de Auth y CONFIRMA que se borró.
 *
 * `admin.auth.admin.deleteUser()` resuelve con `{ error }` en vez de rechazar,
 * así que `.catch(() => {})` no atrapa nada: dejaba creer que la compensación
 * había ocurrido cuando podía haber fallado, y el usuario quedaba huérfano con
 * credenciales válidas.
 */
export async function borrarUsuario(admin, userId) {
  if (!userId) return false;
  try {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) {
      console.error("[guard] deleteUser:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[guard] deleteUser:", e.message);
    return false;
  }
}

/**
 * Compensación tras un alta fallida: borra el usuario y, si se indica, revoca el
 * aprovisionamiento pendiente. Devuelve qué se logró para poder auditarlo.
 *
 * Si algo NO se pudo limpiar se registra como incidente crítico, porque queda
 * estado colgando que una persona tiene que revisar.
 */
export async function compensarAlta(admin, { userId, correo, accion }) {
  const usuarioBorrado = userId ? await borrarUsuario(admin, userId) : true;
  let aproRevocado = true;
  if (correo) {
    const r = await rpcSeguro(admin, "revocar_aprovisionamiento", { p_email: correo });
    aproRevocado = r.ok;
  }

  if (!usuarioBorrado || !aproRevocado) {
    // Estado colgando: usuario Auth huérfano y/o concesión de admin viva.
    await auditar(admin, accion, "error", {
      entidad: "perfiles", entidadId: userId ?? null,
      detalle: { incidente: "compensacion_incompleta", usuarioBorrado, aproRevocado },
    });
  }
  return { usuarioBorrado, aproRevocado, ok: usuarioBorrado && aproRevocado };
}

/**
 * Insert/update de apoyo (no crítico para la respuesta) que aun así hay que
 * comprobar: devuelve true solo si Supabase no reportó error.
 */
export async function escrituraOk(promesa, etiqueta) {
  try {
    const { error } = await promesa;
    if (error) {
      console.error(`[guard] ${etiqueta}:`, error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[guard] ${etiqueta}:`, e.message);
    return false;
  }
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
    // 503 es transitorio: el mensaje tiene que invitar a reintentar. Sin esta
    // entrada, el cliente que estrena su enlace de primer acceso veía "Error"
    // a secas y no sabía que volver a intentarlo servía de algo.
    503: "Servicio no disponible. Intenta de nuevo en un momento.",
  }[status] || "Error";
  res.status(status).json({ error: msg });
}
