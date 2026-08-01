// api/canjear-acceso.js — Función serverless (Vercel).
//
// Canjea el enlace de primer acceso por una sesión real, sin que la contraseña
// haya viajado nunca por correo ni por la URL.
//
// Flujo: el correo lleva /portal#entrar=<token>. El navegador manda ese token
// aquí; el servidor lo valida contra su hash (un solo uso, con caducidad) y
// devuelve un `token_hash` de Supabase que el navegador convierte en sesión con
// `verifyOtp`. Un clic, sin pasos extra para el cliente.
import {
  clienteAdmin, leerBody, rateLimit, auditar, generico, ipCliente,
} from "./_lib/guard.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return generico(res, 405);

  const admin = clienteAdmin();
  if (!admin) {
    console.error("[canjear-acceso] Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE");
    return generico(res, 500);
  }

  const lectura = leerBody(req, 4 * 1024);
  if (!lectura.ok) return generico(res, lectura.status);

  const token = String(lectura.body?.token || "");
  if (token.length < 20 || token.length > 200) return generico(res, 400);

  // Rate limit por IP: impide probar tokens a ciegas.
  if (!(await rateLimit(admin, "canjear-acceso", ipCliente(req), 10, 600))) {
    await auditar(admin, "acceso_unico_canjeado", "denegado", { detalle: { motivo: "rate_limit" } });
    return generico(res, 429);
  }

  // Canje atómico: la primera llamada gana, las siguientes reciben null.
  const { data: userId, error } = await admin.rpc("canjear_acceso_unico", { p_token: token });
  if (error || !userId) return generico(res, 401);

  // Se necesita el correo real del usuario para emitir el OTP de Supabase.
  const { data: u, error: uErr } = await admin.auth.admin.getUserById(userId);
  if (uErr || !u?.user?.email) return generico(res, 401);

  // Supabase emite un magic link de un solo uso; nosotros solo pasamos su
  // token_hash al navegador, que lo canjea con verifyOtp. Nunca viaja una
  // contraseña.
  const { data: link, error: lErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: u.user.email,
  });
  if (lErr || !link?.properties?.hashed_token) return generico(res, 500);

  res.status(200).json({ ok: true, tokenHash: link.properties.hashed_token });
}
