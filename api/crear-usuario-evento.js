// api/crear-usuario-evento.js — Función serverless (Vercel).
//
// Crea el usuario de Auth de un CLIENTE (login usuario + contraseña, sin correo real)
// y lo liga a su evento. Requiere la Admin API de Supabase, por eso corre SOLO en el
// servidor con la `service_role` (NUNCA en el front).
//
// Seguridad: solo un admin autenticado puede llamar. Se valida el Bearer token del
// llamador contra `perfiles.rol = 'admin'` antes de crear nada.
//
// Variables de entorno requeridas en Vercel:
//   SUPABASE_URL           -> https://<proyecto>.supabase.co
//   SUPABASE_SERVICE_ROLE  -> service_role key (SECRETA; solo en el servidor)
import { createClient } from "@supabase/supabase-js";

const DOMINIO_CLIENTE = "portal.jardines.local";

function usuarioAEmail(usuario) {
  const limpio = String(usuario || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9._-]/g, "");
  return { limpio, email: `${limpio}@${DOMINIO_CLIENTE}` };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const url = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !serviceRole) {
    console.error("[crear-usuario-evento] Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE");
    res.status(500).json({ error: "Servidor sin configuración de Supabase" });
    return;
  }

  // Token del llamador (el admin logueado en el panel).
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Falta token de autorización" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};
  const { usuario, password, eventoId, nombre } = body;

  if (!usuario || !password || !eventoId) {
    res.status(400).json({ error: "Faltan datos: usuario, password, eventoId" });
    return;
  }
  if (String(password).length < 6) {
    res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
    return;
  }

  const admin = createClient(url, serviceRole, {
    db: { schema: "jardines" },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // 1) Verificar que el llamador es admin.
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) {
      res.status(401).json({ error: "Sesión inválida" });
      return;
    }
    const { data: perfil } = await admin
      .from("perfiles")
      .select("rol")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (perfil?.rol !== "admin") {
      res.status(403).json({ error: "No autorizado" });
      return;
    }

    // 2) Crear el usuario de Auth del cliente (email sintético, ya confirmado).
    const { limpio, email } = usuarioAEmail(usuario);
    if (!limpio) {
      res.status(400).json({ error: "Usuario inválido" });
      return;
    }
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { rol: "cliente", nombre: nombre || usuario, usuario: limpio },
    });
    if (createErr) {
      const msg = /already been registered|already exists/i.test(createErr.message || "")
        ? "Ese usuario ya existe"
        : createErr.message;
      res.status(409).json({ error: msg });
      return;
    }

    const nuevoId = created.user.id;

    // 3) Asegurar el perfil como cliente (el trigger ya lo crea; forzamos por si acaso).
    await admin
      .from("perfiles")
      .update({ rol: "cliente", nombre: nombre || usuario })
      .eq("user_id", nuevoId);

    // 4) Ligar el evento a este usuario/credencial.
    const { error: linkErr } = await admin
      .from("eventos")
      .update({ auth_user_id: nuevoId, usuario: limpio })
      .eq("id", eventoId);
    if (linkErr) {
      // Rollback del usuario para no dejar credenciales huérfanas.
      await admin.auth.admin.deleteUser(nuevoId).catch(() => {});
      res.status(500).json({ error: "No se pudo ligar el evento: " + linkErr.message });
      return;
    }

    res.status(200).json({ ok: true, userId: nuevoId, usuario: limpio });
  } catch (e) {
    console.error("[crear-usuario-evento] Error:", e.message);
    res.status(500).json({ error: "Error del servidor" });
  }
}
