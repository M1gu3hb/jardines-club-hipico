// api/notificar.js — Función serverless (Vercel).
//
// Envía por correo al dueño las notificaciones de actividad del portal:
// cliente confirmó su evento, dejó reseña, o mostró interés en un servicio.
// (La notificación del DASHBOARD se guarda aparte, directo en Supabase con RLS.)
//
// Seguridad: exige un Bearer token de una sesión válida de Supabase (cliente o
// admin). Se valida con la anon key + getUser; sin sesión no se envía nada.
//
// Variables de entorno: GMAIL_USER, GMAIL_APP_PASSWORD, MAIL_TO (opcional),
// SUPABASE_URL, VITE_SUPABASE_ANON_KEY (disponible también en runtime de Vercel).
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

const DEST_DEFAULT = "mighuer427@gmail.com";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  const to = process.env.MAIL_TO || DEST_DEFAULT;
  const supaUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!user || !pass) {
    console.error("[notificar] Faltan GMAIL_USER / GMAIL_APP_PASSWORD");
    res.status(500).json({ error: "Correo no configurado" });
    return;
  }

  // Validar que quien llama tiene sesión (cliente del portal o admin).
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || !supaUrl || !anonKey) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }
  try {
    const supa = createClient(supaUrl, anonKey, { auth: { persistSession: false } });
    const { data, error } = await supa.auth.getUser(token);
    if (error || !data?.user) {
      res.status(401).json({ error: "Sesión inválida" });
      return;
    }
  } catch {
    res.status(401).json({ error: "Sesión inválida" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const { titulo, detalle } = body || {};
  if (!titulo) {
    res.status(400).json({ error: "Falta titulo" });
    return;
  }

  const texto = `${titulo}

${detalle || ""}

—
Panel de administración: revisa la sección "Resumen" para ver toda la actividad.
Jardines Club Hípico · notificación automática del portal`.trim();

  try {
    const transporter = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
    await transporter.sendMail({
      from: `"Jardines Club Hípico — Portal" <${user}>`,
      to,
      subject: `[JCH Portal] ${String(titulo).slice(0, 120)}`,
      text: texto,
    });
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error("[notificar] Error al enviar correo:", e.message);
    res.status(500).json({ error: "No se pudo enviar el correo" });
  }
}
