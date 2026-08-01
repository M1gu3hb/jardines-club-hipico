// api/notificar.js — Función serverless (Vercel).
//
// Avisa por correo al dueño de la actividad del portal: el cliente confirmó su
// evento, dejó reseña o mostró interés en un servicio.
//
// QUÉ ESTABA MAL (corregido aquí)
//   1. Bastaba CUALQUIER sesión válida del Supabase compartido. Como el proyecto
//      se comparte con Vero Seguros, un usuario suyo pasaba el control y podía
//      mandarle correo al dueño de Jardines. Ahora se exige perfil de Jardines.
//   2. `titulo` y `detalle` venían del navegador y se incrustaban en el HTML sin
//      escapar: inyección de HTML directa en el buzón del dueño. Ahora el
//      contenido se DERIVA de una acción de una lista cerrada y de datos que el
//      servidor vuelve a leer de la base; lo que aporta el cliente se escapa.
//   3. No había rate limit ni idempotencia: se podía inundar el buzón.
import { plantillaOro, enviarCorreo, SITIO_URL } from "./_lib/correo.js";
import {
  escHtml, clienteAdmin, leerBody, autorizarJardines,
  rateLimit, idempotencia, auditar, generico,
} from "./_lib/guard.js";

const DEST_DEFAULT = "mighuer427@gmail.com";

// Lista cerrada de acciones. El navegador elige UNA de estas; no redacta el correo.
const ACCIONES = {
  confirmacion: { pretitulo: "Actividad del portal", titulo: "Un cliente confirmó su evento" },
  resena:       { pretitulo: "Actividad del portal", titulo: "Nueva reseña de un cliente" },
  interes:      { pretitulo: "Actividad del portal", titulo: "Un cliente mostró interés en un servicio" },
  documento:    { pretitulo: "Actividad del portal", titulo: "Un cliente revisó sus documentos" },
  nota:         { pretitulo: "Actividad del portal", titulo: "Un cliente dejó una nota" },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return generico(res, 405);

  const admin = clienteAdmin();
  if (!admin) {
    console.error("[notificar] Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE");
    return generico(res, 500);
  }
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error("[notificar] Faltan GMAIL_USER / GMAIL_APP_PASSWORD");
    return generico(res, 500);
  }

  // 1) Autorización real: sesión CON perfil de Jardines (un usuario de Vero → 403).
  const aut = await autorizarJardines(req, admin);
  if (!aut.ok) {
    await auditar(admin, "notificar", "denegado", { detalle: { motivo: `http_${aut.status}` } });
    return generico(res, aut.status);
  }

  const lectura = leerBody(req, 8 * 1024);
  if (!lectura.ok) return generico(res, lectura.status);
  const { accion, eventoId, nota } = lectura.body;

  // 2) La acción debe ser una de las conocidas.
  const plantilla = ACCIONES[String(accion || "")];
  if (!plantilla) return generico(res, 400);

  // 3) Rate limit por usuario: nadie inunda el buzón del dueño.
  if (!(await rateLimit(admin, "notificar", aut.user.id, 20, 3600))) {
    await auditar(admin, "notificar", "denegado", { detalle: { motivo: "rate_limit" } });
    return generico(res, 429);
  }

  // 4) Los datos del evento se RECONSULTAN en el servidor; no se confía en el body.
  //    Y el evento debe pertenecer a quien llama (salvo que sea admin).
  let evento = null;
  if (eventoId) {
    const { data } = await admin
      .from("eventos")
      .select("id, nombre_evento, fecha_evento, cliente_nombre, auth_user_id")
      .eq("id", eventoId)
      .maybeSingle();
    if (!data) return generico(res, 403);
    if (aut.perfil.rol !== "admin" && data.auth_user_id !== aut.user.id) {
      await auditar(admin, "notificar", "denegado", {
        entidad: "eventos", entidadId: eventoId, detalle: { motivo: "evento_ajeno" },
      });
      return generico(res, 403);
    }
    evento = data;
  }

  // 5) Idempotencia: un reintento del navegador no duplica el correo.
  const clave = `${accion}:${eventoId || aut.user.id}:${new Date().toISOString().slice(0, 13)}`;
  if (!(await idempotencia(admin, "notificar", clave, 6))) {
    return res.status(200).json({ ok: true, duplicado: true });
  }

  try {
    // Todo lo dinámico va escapado. `nota` es lo único que aporta el cliente y se
    // recorta y escapa antes de tocar el HTML.
    const detalleHtml = [
      evento ? `<p style="margin:0 0 8px 0;">Evento: <strong style="color:#E6C870;">${escHtml(evento.nombre_evento)}</strong></p>` : "",
      evento?.cliente_nombre ? `<p style="margin:0 0 8px 0;">Cliente: ${escHtml(evento.cliente_nombre)}</p>` : "",
      evento?.fecha_evento ? `<p style="margin:0 0 14px 0;">Fecha: ${escHtml(evento.fecha_evento)}</p>` : "",
      nota ? `<p style="margin:0 0 14px 0;">${escHtml(String(nota).slice(0, 300))}</p>` : "",
    ].join("");

    const html = plantillaOro({
      pretitulo: plantilla.pretitulo,
      titulo: plantilla.titulo,
      cuerpoHtml: `${detalleHtml}
        <p style="margin:0; color:#8a8a8a;">Revisa la sección <strong style="color:#E6C870;">Resumen</strong> de tu panel para darle seguimiento.</p>`,
      ctaTexto: "Abrir mi panel",
      ctaUrl: `${SITIO_URL}/${process.env.VITE_ADMIN_SLUG || "gestion-jch-9f27ax"}`,
      notaPie: "Notificación automática del portal de clientes.",
    });

    await enviarCorreo({
      to: process.env.MAIL_TO || DEST_DEFAULT,
      subject: `[JCH Portal] ${plantilla.titulo}`,
      html,
      texto: `${plantilla.titulo}${evento ? ` — ${evento.nombre_evento}` : ""}`,
    });

    await auditar(admin, "notificar", "ok", {
      entidad: "eventos", entidadId: evento?.id ?? null, eventoId: evento?.id ?? null,
      detalle: { accion },
    });
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error("[notificar] Error al enviar correo:", e.message);
    await auditar(admin, "notificar", "error", { detalle: { accion } });
    generico(res, 500);
  }
}
