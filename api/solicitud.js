// api/solicitud.js — Función serverless (Vercel) que envía por correo las
// solicitudes del formulario, replicando el comportamiento original de Base44.
//
// Envía desde tu Gmail usando una "contraseña de aplicación" (App Password).
// Variables de entorno requeridas en Vercel:
//   GMAIL_USER          -> tu correo Gmail (ej. tucuenta@gmail.com)
//   GMAIL_APP_PASSWORD  -> la contraseña de aplicación de 16 caracteres
//   MAIL_TO (opcional)  -> destino de las solicitudes (por defecto mighuer427@gmail.com)
import nodemailer from "nodemailer";

const DEST_DEFAULT = "mighuer427@gmail.com";

function construirTexto(s) {
  const serviciosList =
    s.actividadesExtras && s.actividadesExtras.length > 0
      ? s.actividadesExtras.map((a) => `- ${a}`).join("\n")
      : "- Ninguno seleccionado";

  return `Nueva solicitud de evento recibida

IDENTIFICACION
Folio:           ${s.folio || "-"}
Fecha de envio:  ${s.fechaEnvio || "-"}
Hora de envio:   ${s.horaEnvio || "-"}

DATOS DEL CLIENTE
Nombre:          ${s.nombreCompleto || "-"}
Telefono:        ${s.telefono || "-"}
Correo:          ${s.email || "-"}
Direccion:       ${s.direccion || "-"}
RFC:             ${s.rfc || "No requiere factura"}

DATOS DEL EVENTO
Espacio/Salon:   ${s.salonSeleccionado || "-"}
Tipo de evento:  ${s.tipoEvento || "-"}
Fecha tentativa: ${s.fechaTentativa || "-"}
Horario:         ${s.horarioInicio || "-"} - ${s.horarioFin || "-"}
Personas:        ${s.numeroPersonas || "-"}
Montaje:         ${s.manteleriaPreferida || "-"}

SERVICIOS Y EXTRAS
${serviciosList}

COMENTARIOS
${s.comentarios || "Sin comentarios adicionales."}`.trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido" });
    return;
  }

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  const to = process.env.MAIL_TO || DEST_DEFAULT;

  if (!user || !pass) {
    console.error("[solicitud] Faltan GMAIL_USER / GMAIL_APP_PASSWORD");
    res.status(500).json({ error: "Correo no configurado en el servidor" });
    return;
  }

  // Body: puede venir parseado por Vercel o como string
  let s = req.body;
  if (typeof s === "string") {
    try { s = JSON.parse(s); } catch { s = {}; }
  }
  s = s || {};

  const texto = construirTexto(s);
  const subject = `[JCH] Nueva solicitud ${s.folio || ""} - ${s.nombreCompleto || ""}`.trim();

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: `"Jardines Club Hípico" <${user}>`,
      to,
      replyTo: s.email || undefined,
      subject,
      text: texto,
    });

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error("[solicitud] Error al enviar correo:", e.message);
    res.status(500).json({ error: "No se pudo enviar el correo" });
  }
}
