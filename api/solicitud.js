// api/solicitud.js — Función serverless (Vercel).
//
// Avisa por correo al dueño de una solicitud del formulario público.
//
// QUÉ ESTABA MAL (corregido aquí)
//   La ruta aceptaba un cuerpo ARBITRARIO y mandaba correo con él. Sin sesión,
//   sin rate limit y sin comprobar que la solicitud existiera: cualquiera podía
//   inundar el buzón del dueño con contenido inventado, y encima fijar el
//   `replyTo` a la dirección que quisiera. También se podía saltar el rate limit
//   del formulario llamando aquí directamente.
//
// CÓMO QUEDA
//   El navegador solo manda el `solicitudId`. El servidor vuelve a leer esa fila
//   con service_role y arma el correo con los datos CANÓNICOS de la base. Si la
//   fila no existe, el correo no sale. Rate limit por IP e idempotencia por
//   solicitud, así que un reintento no duplica el aviso.
import nodemailer from "nodemailer";
import {
  clienteAdmin, leerBody, rateLimit, idempotencia,
  auditar, generico, ipCliente,
} from "./_lib/guard.js";

const DEST_DEFAULT = "mighuer427@gmail.com";

/** Texto del correo, construido SOLO con la fila de la base. */
function construirTexto(s) {
  return `Nueva solicitud de evento recibida

IDENTIFICACION
Folio:           ${s.folio || "-"}
Fecha de envio:  ${s.fecha_envio || "-"}
Hora de envio:   ${s.hora_envio || "-"}

DATOS DEL CLIENTE
Nombre:          ${s.nombre_completo || "-"}
Telefono:        ${s.telefono || "-"}
Correo:          ${s.email || "-"}

DATOS DEL EVENTO
Espacio/Salon:   ${s.salon_seleccionado || "-"}
Tipo de evento:  ${s.tipo_evento || "-"}
Fecha tentativa: ${s.fecha_tentativa || "-"}
Personas:        ${s.numero_personas || "-"}

COMENTARIOS
${s.comentarios || "Sin comentarios adicionales."}`.trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") return generico(res, 405);

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  const to = process.env.MAIL_TO || DEST_DEFAULT;
  if (!user || !pass) {
    console.error("[solicitud] Faltan GMAIL_USER / GMAIL_APP_PASSWORD");
    return generico(res, 500);
  }

  const admin = clienteAdmin();
  if (!admin) {
    console.error("[solicitud] Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE");
    return generico(res, 500);
  }

  const lectura = leerBody(req, 4 * 1024);
  if (!lectura.ok) return generico(res, lectura.status);

  const solicitudId = String(lectura.body?.solicitudId || "");
  if (!/^[0-9a-f-]{36}$/i.test(solicitudId)) return generico(res, 400);

  // Rate limit por IP, aparte del que ya aplica el trigger al INSERT. Impide
  // usar esta ruta para saltarse el control del formulario.
  if (!(await rateLimit(admin, "solicitud-correo", ipCliente(req), 10, 3600))) {
    await auditar(admin, "solicitud_correo", "denegado", { detalle: { motivo: "rate_limit" } });
    return generico(res, 429);
  }

  // La solicitud tiene que EXISTIR y ser reciente. El correo se arma con lo que
  // hay en la base, no con lo que dijo el navegador.
  const { data: s } = await admin
    .from("solicitudes")
    .select("id, folio, fecha_envio, hora_envio, nombre_completo, telefono, email, salon_seleccionado, tipo_evento, fecha_tentativa, numero_personas, comentarios, created_at")
    .eq("id", solicitudId)
    .maybeSingle();

  if (!s) {
    await auditar(admin, "solicitud_correo", "denegado", { detalle: { motivo: "inexistente" } });
    return generico(res, 400);
  }
  const edadMin = (Date.now() - new Date(s.created_at).getTime()) / 60000;
  if (!(edadMin >= 0 && edadMin < 15)) {
    await auditar(admin, "solicitud_correo", "denegado", {
      entidad: "solicitudes", entidadId: s.id, detalle: { motivo: "fuera_de_ventana" },
    });
    return generico(res, 400);
  }

  // Un reintento del navegador no manda el correo dos veces.
  if (!(await idempotencia(admin, "solicitud-correo", s.id, 48))) {
    return res.status(200).json({ ok: true, duplicado: true });
  }

  try {
    const transporter = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
    await transporter.sendMail({
      from: `"Jardines Club Hípico" <${user}>`,
      to,
      // replyTo sale de la base, no del cuerpo de la petición.
      replyTo: s.email || undefined,
      subject: `[JCH] Nueva solicitud ${s.folio || ""} - ${s.nombre_completo || ""}`.trim(),
      text: construirTexto(s),
    });

    await auditar(admin, "solicitud_correo", "ok", { entidad: "solicitudes", entidadId: s.id });
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error("[solicitud] Error al enviar correo:", e.message);
    await auditar(admin, "solicitud_correo", "error", { entidad: "solicitudes", entidadId: s.id });
    generico(res, 500);
  }
}
