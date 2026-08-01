// api/crear-admin.js — Función serverless (Vercel).
//
// Crea un NUEVO ADMINISTRADOR del panel (todos los admins pueden hacerlo).
// Requiere la Admin API de Supabase (service_role — SOLO servidor). Valida que
// quien llama tenga rol admin antes de crear nada. El nuevo admin entra por la
// misma URL secreta con su correo + contraseña, y recibe un correo de bienvenida.
//
// Body: { nombre, correo, password, telefono? }
import { createClient } from "@supabase/supabase-js";
import { plantillaOro, enviarCorreo, SITIO_URL } from "./_lib/correo.js";
import { escHtml } from "./_lib/guard.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !serviceRole) {
    res.status(500).json({ error: "Servidor sin configuración de Supabase" });
    return;
  }

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
  const { nombre, correo, password, telefono } = body || {};
  if (!nombre || !correo || !password) {
    res.status(400).json({ error: "Faltan datos: nombre, correo, contraseña" });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(correo))) {
    res.status(400).json({ error: "Correo inválido" });
    return;
  }
  if (String(password).length < 8) {
    res.status(400).json({ error: "La contraseña de un admin debe tener al menos 8 caracteres" });
    return;
  }

  const admin = createClient(url, serviceRole, {
    db: { schema: "jardines" },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // 1) Verificar que quien llama es admin.
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) {
      res.status(401).json({ error: "Sesión inválida" });
      return;
    }
    const { data: perfil } = await admin
      .from("perfiles").select("rol, nombre").eq("user_id", userData.user.id).maybeSingle();
    if (perfil?.rol !== "admin") {
      res.status(403).json({ error: "Solo un administrador puede crear administradores" });
      return;
    }

    // 2) Crear el usuario de Auth (correo real, confirmado, rol admin).
    // El rol admin se registra ANTES del alta en una invitación de aprovisionamiento
    // que solo puede emitir el servidor. Así el trigger de auth.users toma el rol de
    // una fuente controlada y nunca de `user_metadata` (que el usuario puede editar).
    const { error: aproErr } = await admin.rpc("aprovisionar_usuario", {
      p_email: String(correo).trim().toLowerCase(),
      p_rol: "admin",
    });
    if (aproErr) {
      res.status(500).json({ error: "No se pudo aprovisionar el acceso: " + aproErr.message });
      return;
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: String(correo).trim().toLowerCase(),
      password,
      email_confirm: true,
      app_metadata: { app: "jardines" },
      user_metadata: { nombre },
    });
    if (createErr) {
      // El aprovisionamiento ya estaba emitido: si el alta falla hay que consumirlo
      // ahora mismo. Si no, quedaría una concesión de ADMIN reutilizable durante
      // 7 días para quien lograra registrarse con ese correo.
      await admin.rpc("revocar_aprovisionamiento", {
        p_email: String(correo).trim().toLowerCase(),
      }).catch(() => {});
      const msg = /already been registered|already exists/i.test(createErr.message || "")
        ? "Ya existe una cuenta con ese correo"
        : createErr.message;
      res.status(409).json({ error: msg });
      return;
    }
    const nuevoId = created.user.id;

    // 3) Confirmar el rol por la vía administrativa protegida (idempotente y auditada)
    //    y completar los datos de contacto del perfil.
    const { error: rolErr } = await admin.rpc("asignar_rol", {
      p_user_id: nuevoId,
      p_rol: "admin",
      p_nombre: nombre,
    });
    if (rolErr) {
      await admin.auth.admin.deleteUser(nuevoId).catch(() => {});
      await admin.rpc("revocar_aprovisionamiento", {
        p_email: String(correo).trim().toLowerCase(),
      }).catch(() => {});
      res.status(500).json({ error: "No se pudo asignar el rol: " + rolErr.message });
      return;
    }
    await admin.from("perfiles")
      .update({ telefono: telefono || null, correo: String(correo).trim().toLowerCase() })
      .eq("user_id", nuevoId);

    // 4) Correo de bienvenida con sus accesos y el link del panel.
    let correoEnviado = false;
    try {
      const panelUrl = `${SITIO_URL}/${process.env.VITE_ADMIN_SLUG || "gestion-jch-9f27ax"}`;
      // Enlace de un solo uso en lugar de la contraseña en el cuerpo del correo.
      const { data: tokenAcceso } = await admin.rpc("crear_acceso_unico", {
        p_user_id: nuevoId, p_proposito: "primer_acceso_admin", p_horas: 72,
      });
      const entrarUrl = tokenAcceso
        ? `${SITIO_URL}/portal#entrar=${encodeURIComponent(tokenAcceso)}`
        : panelUrl;
      const html = plantillaOro({
        pretitulo: "Acceso al panel",
        titulo: "Bienvenido al equipo",
        cuerpoHtml: `
          <p style="margin:0 0 14px 0;">${escHtml(String(nombre).split(/\s+/)[0])}, ${escHtml(perfil.nombre || "un administrador")} te dio acceso al
          <strong style="color:#E6C870;">panel de administración</strong> de Jardines Club Hípico.</p>
          <p style="margin:0 0 6px 0;">Desde ahí puedes gestionar eventos, clientes, el sitio web y ver toda la actividad del portal.</p>
          <p style="margin:0 0 6px 0;">Tu correo de acceso es <strong style="color:#E6C870;">${escHtml(String(correo).trim().toLowerCase())}</strong>. Entra con el botón: el enlace sirve una sola vez y caduca en 3 días.</p>
          <p style="margin:0;">Tu contraseña te la comparte por separado quien te dio de alta. El panel vive en una dirección privada: <span style="color:#E6C870;">${panelUrl}</span></p>`,
        ctaTexto: "Entrar al panel",
        ctaUrl: entrarUrl,
        notaPie: "Si no esperabas este acceso, avisa al administrador principal.",
      });
      await enviarCorreo({
        to: String(correo).trim().toLowerCase(),
        subject: "🔑 Tu acceso al panel — Jardines Club Hípico",
        html,
        // Sin contraseña en el cuerpo.
        texto: `Tienes acceso al panel. Correo: ${correo}. Entra con este enlace de un solo uso: ${entrarUrl}`,
      });
      correoEnviado = true;
    } catch (e) {
      console.error("[crear-admin] correo bienvenida:", e.message);
    }

    res.status(200).json({ ok: true, userId: nuevoId, correoEnviado });
  } catch (e) {
    console.error("[crear-admin] Error:", e.message);
    res.status(500).json({ error: "Error del servidor" });
  }
}
