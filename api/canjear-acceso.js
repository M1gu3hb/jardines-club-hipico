// api/canjear-acceso.js — Función serverless (Vercel).
//
// Canjea el enlace de primer acceso por una sesión real, sin que la contraseña
// haya viajado nunca por correo ni por la URL.
//
// DOS CORRECCIONES DE LA AUDITORÍA
//   1. El canje quemaba el token ANTES de que `generateLink` confirmara. Si
//      Supabase fallaba en medio, la persona se quedaba sin enlace y sin entrar.
//      Ahora es en dos fases: se toma un lease, y solo se consume cuando el
//      token_hash ya está en la mano. Si algo falla, se libera y sigue sirviendo.
//   2. El enlace del administrador acababa en el portal del cliente. Ahora el
//      servidor devuelve el destino según el ROL leído de la base, y el
//      navegador redirige ahí después de crear la sesión.
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

  // FASE 1 — tomar el enlace sin consumirlo todavía.
  const { data: filas, error } = await admin.rpc("canjear_acceso_iniciar", { p_token: token });
  const fila = Array.isArray(filas) ? filas[0] : filas;
  if (error || !fila?.user_id) return generico(res, 401);

  try {
    const { data: u, error: uErr } = await admin.auth.admin.getUserById(fila.user_id);
    if (uErr || !u?.user?.email) throw new Error("usuario sin correo");

    // Supabase emite un magic link de un solo uso; al navegador solo le pasamos
    // su token_hash, que canjea con verifyOtp. Nunca viaja una contraseña.
    const { data: link, error: lErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: u.user.email,
    });
    if (lErr || !link?.properties?.hashed_token) throw new Error("generateLink");

    // FASE 2 — ahora sí se consume: ya tenemos con qué entrar.
    await admin.rpc("canjear_acceso_confirmar", { p_token: token });

    // El destino lo decide el servidor a partir del rol, no el correo ni el cliente.
    const destino = fila.rol === "admin"
      ? `/${process.env.VITE_ADMIN_SLUG || "gestion-jch-9f27ax"}`
      : "/portal";

    res.status(200).json({ ok: true, tokenHash: link.properties.hashed_token, destino });
  } catch (e) {
    // Fallo intermedio: se libera el lease para que el enlace siga sirviendo.
    await admin.rpc("canjear_acceso_liberar", { p_token: token }).catch(() => {});
    console.error("[canjear-acceso] fallo intermedio:", e.message);
    await auditar(admin, "acceso_unico_canjeado", "error", { detalle: { motivo: "intermedio" } });
    generico(res, 503);
  }
}
