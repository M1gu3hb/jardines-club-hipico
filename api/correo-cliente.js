// api/correo-cliente.js — Función serverless (Vercel).
//
// El ADMIN dispara correos al cliente desde el panel (p. ej. "tu cotización está
// lista"). Valida que quien llama tenga sesión con rol admin (leyendo su propio
// perfil vía RLS con su token — no requiere service_role) y envía el correo con
// la plantilla dorada al `cliente_email` del evento.
//
// Body: { tipo: "cotizacion", eventoId, documento? }
import { createClient } from "@supabase/supabase-js";
import { plantillaOro, enviarCorreo, SITIO_URL } from "./_lib/correo.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const supaUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || !supaUrl || !anonKey) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const { tipo, eventoId, documento } = body || {};
  if (tipo !== "cotizacion" || !eventoId) {
    res.status(400).json({ error: "Datos inválidos (tipo, eventoId)" });
    return;
  }

  try {
    // Cliente Supabase CON el token del llamador: RLS aplica con su identidad.
    const supa = createClient(supaUrl, anonKey, {
      db: { schema: "jardines" },
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userErr } = await supa.auth.getUser(token);
    if (userErr || !userData?.user) {
      res.status(401).json({ error: "Sesión inválida" });
      return;
    }
    const { data: perfil } = await supa
      .from("perfiles").select("rol").eq("user_id", userData.user.id).maybeSingle();
    if (perfil?.rol !== "admin") {
      res.status(403).json({ error: "Solo el administrador puede enviar estos correos" });
      return;
    }

    const { data: ev } = await supa
      .from("eventos")
      .select("nombre_evento, cliente_nombre, cliente_email")
      .eq("id", eventoId)
      .maybeSingle();
    if (!ev) {
      res.status(404).json({ error: "Evento no encontrado" });
      return;
    }
    if (!ev.cliente_email) {
      res.status(400).json({ error: "El evento no tiene correo de contacto del cliente" });
      return;
    }

    const nombreCliente = (ev.cliente_nombre || "").split(/\s+/)[0] || "Hola";
    const html = plantillaOro({
      pretitulo: "Tienes un documento nuevo",
      titulo: "Tu cotización está lista",
      cuerpoHtml: `
        <p style="margin:0 0 14px 0;">${nombreCliente}, ¡buenas noticias! ✨</p>
        <p style="margin:0 0 14px 0;">Ya puedes revisar <strong style="color:#E6C870;">${documento ? String(documento).slice(0, 80) : "tu cotización"}</strong>
        para <strong style="color:#E6C870;">${ev.nombre_evento}</strong> en la sección <em>Documentos</em> de tu portal.</p>
        <p style="margin:0;">Entra con tu usuario y contraseña de siempre. Cualquier duda, respóndenos este correo y con gusto te acompañamos.</p>`,
      ctaTexto: "Ver mi cotización",
      ctaUrl: `${SITIO_URL}/portal`,
      notaPie: "Este documento es exclusivo para ti y tu evento.",
    });

    await enviarCorreo({
      to: ev.cliente_email,
      subject: `📄 Tu cotización de "${ev.nombre_evento}" está lista — Jardines Club Hípico`,
      html,
      texto: `Tu cotización está lista. Revísala en la sección Documentos de tu portal: ${SITIO_URL}/portal`,
      replyTo: process.env.MAIL_TO || process.env.GMAIL_USER,
    });

    res.status(200).json({ ok: true, enviadoA: ev.cliente_email });
  } catch (e) {
    console.error("[correo-cliente] Error:", e.message);
    res.status(500).json({ error: "No se pudo enviar el correo" });
  }
}
