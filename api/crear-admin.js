// api/crear-admin.js — Función serverless (Vercel).
//
// Crea un NUEVO ADMINISTRADOR del panel (todos los admins pueden hacerlo).
// Requiere la Admin API de Supabase (service_role — SOLO servidor). Valida que
// quien llama tenga rol admin antes de crear nada. El nuevo admin entra por la
// misma URL secreta con su correo + contraseña, y recibe un correo de bienvenida.
//
// Body: { nombre, correo, password, telefono? }
import { plantillaOro, enviarCorreo, SITIO_URL } from "./_lib/correo.js";
import {
  escHtml, clienteAdmin, leerBody, autorizarJardines, rateLimit,
  idemIniciar, idemCerrar, auditar, generico, rpcSeguro, compensarAlta,
} from "./_lib/guard.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return generico(res, 405);

  const admin = clienteAdmin();
  if (!admin) {
    console.error("[crear-admin] Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE");
    return generico(res, 500);
  }

  // Autorización real: admin de Jardines. Un usuario de Vero recibe 403.
  const aut = await autorizarJardines(req, admin, { rol: "admin" });
  if (!aut.ok) {
    await auditar(admin, "crear_admin", "denegado", { detalle: { motivo: `http_${aut.status}` } });
    return generico(res, aut.status);
  }
  const perfil = aut.perfil;

  const lectura = leerBody(req, 8 * 1024);
  if (!lectura.ok) return generico(res, lectura.status);
  const { nombre, correo, password, telefono } = lectura.body;

  if (!nombre || !correo || !password) return generico(res, 400);
  if (String(nombre).length > 120) return generico(res, 400);
  if (String(correo).length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(correo))) return generico(res, 400);
  if (String(password).length < 8 || String(password).length > 200) return generico(res, 400);
  if (telefono && String(telefono).length > 30) return generico(res, 400);

  if (!(await rateLimit(admin, "crear-admin", aut.user.id, 10, 3600))) {
    await auditar(admin, "crear_admin", "denegado", { detalle: { motivo: "rate_limit" } });
    return generico(res, 429);
  }

  const claveIdem = String(correo).trim().toLowerCase();
  const idem = await idemIniciar(admin, "crear-admin", claveIdem, 120, 1);
  if (idem === "en_curso") return generico(res, 429);
  if (idem !== "procede" && idem !== "duplicado") return generico(res, 500);

  let nuevoId = null;
  try {

    // 2) Crear el usuario de Auth (correo real, confirmado, rol admin).
    // El rol admin se registra ANTES del alta en una invitación de aprovisionamiento
    // que solo puede emitir el servidor. Así el trigger de auth.users toma el rol de
    // una fuente controlada y nunca de `user_metadata` (que el usuario puede editar).
    const rApro = await rpcSeguro(admin, "aprovisionar_usuario", {
      p_email: String(correo).trim().toLowerCase(), p_rol: "admin",
    });
    if (!rApro.ok) {
      await idemCerrar(admin, "crear-admin", claveIdem, false);
      await auditar(admin, "crear_admin", "error", { detalle: { paso: "aprovisionar" } });
      return generico(res, 500);
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
      // La revocación se COMPRUEBA: si falla, queda una concesión de admin viva.
      await compensarAlta(admin, { correo: String(correo).trim().toLowerCase(), accion: "crear_admin" });
      await idemCerrar(admin, "crear-admin", claveIdem, false);
      const duplicado = /already been registered|already exists/i.test(createErr.message || "");
      await auditar(admin, "crear_admin", "denegado",
        { detalle: { motivo: duplicado ? "correo_duplicado" : "alta_fallida" } });
      res.status(409).json({ error: duplicado ? "Ya existe una cuenta con ese correo" : "No se pudo crear la cuenta" });
      return;
    }
    nuevoId = created.user.id;

    // 3) Confirmar el rol por la vía administrativa protegida (idempotente y auditada)
    //    y completar los datos de contacto del perfil.
    const rRol = await rpcSeguro(admin, "asignar_rol", {
      p_user_id: nuevoId, p_rol: "admin", p_nombre: nombre,
    });
    if (!rRol.ok) {
      await compensarAlta(admin, {
        userId: nuevoId, correo: String(correo).trim().toLowerCase(), accion: "crear_admin",
      });
      await idemCerrar(admin, "crear-admin", claveIdem, false);
      await auditar(admin, "crear_admin", "error", { detalle: { paso: "asignar_rol" } });
      return generico(res, 500);
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

    const cerrado = await idemCerrar(admin, "crear-admin", claveIdem, true);
    await auditar(admin, "crear_admin", cerrado ? "ok" : "error", {
      entidad: "perfiles", entidadId: nuevoId,
      detalle: { correoEnviado, incidente: cerrado ? undefined : "idem_no_cerrada" },
    });
    res.status(200).json({ ok: true, userId: nuevoId, correoEnviado });
  } catch (e) {
    console.error("[crear-admin] Error:", e.message);
    await compensarAlta(admin, {
      userId: nuevoId, correo: String(correo).trim().toLowerCase(), accion: "crear_admin",
    });
    await idemCerrar(admin, "crear-admin", claveIdem, false);
    await auditar(admin, "crear_admin", "error", { detalle: { paso: "inesperado" } });
    generico(res, 500);
  }
}
