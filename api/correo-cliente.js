// api/correo-cliente.js — Función serverless (Vercel).
//
// Avisa al cliente por correo de que su cotización ya está en el portal.
//
// QUÉ ESTABA MAL (corregido aquí)
//   1. El NOMBRE del documento venía del navegador y entraba en el HTML sin
//      escapar: un admin (o cualquiera con su sesión) podía inyectar marcado en
//      un correo que sale hacia el cliente. Ahora se recibe `documentoId`, se
//      relee el documento y se comprueba que pertenece a ESE evento.
//   2. No había límite de tamaño del cuerpo, ni rate limit, ni idempotencia.
//   3. Usaba su propio bloque de autorización en vez del guard compartido.
import { plantillaOro, enviarCorreo, SITIO_URL } from "./_lib/correo.js";
import {
  escHtml, clienteAdmin, leerBody, autorizarJardines,
  rateLimit, idemIniciar, idemCerrar, auditar, generico,
} from "./_lib/guard.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return generico(res, 405);

  const admin = clienteAdmin();
  if (!admin) {
    console.error("[correo-cliente] Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE");
    return generico(res, 500);
  }
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error("[correo-cliente] Faltan GMAIL_USER / GMAIL_APP_PASSWORD");
    return generico(res, 500);
  }

  // Admin REAL de Jardines. Un usuario de Vero, o un cliente, reciben 403.
  const aut = await autorizarJardines(req, admin, { rol: "admin" });
  if (!aut.ok) {
    await auditar(admin, "correo_cliente", "denegado", { detalle: { motivo: `http_${aut.status}` } });
    return generico(res, aut.status);
  }

  const lectura = leerBody(req, 8 * 1024);
  if (!lectura.ok) return generico(res, lectura.status);
  const { tipo, eventoId, documentoId } = lectura.body;

  if (tipo !== "cotizacion") return generico(res, 400);
  if (!eventoId || !/^[0-9a-f-]{36}$/i.test(String(eventoId))) return generico(res, 400);
  if (documentoId && !/^[0-9a-f-]{36}$/i.test(String(documentoId))) return generico(res, 400);

  if (!(await rateLimit(admin, "correo-cliente", aut.user.id, 30, 3600))) {
    await auditar(admin, "correo_cliente", "denegado", { detalle: { motivo: "rate_limit" } });
    return generico(res, 429);
  }

  // Datos canónicos releídos del servidor.
  const { data: ev } = await admin
    .from("eventos")
    .select("id, nombre_evento, cliente_nombre, cliente_email")
    .eq("id", eventoId)
    .maybeSingle();
  if (!ev) return generico(res, 400);
  if (!ev.cliente_email) {
    return res.status(400).json({ error: "El evento no tiene correo de contacto del cliente" });
  }

  // El nombre del documento sale de la BASE, y solo si pertenece a este evento.
  let nombreDocumento = "tu cotización";
  if (documentoId) {
    const { data: doc } = await admin
      .from("documentos").select("id, nombre, evento_id").eq("id", documentoId).maybeSingle();
    if (!doc || doc.evento_id !== ev.id) {
      await auditar(admin, "correo_cliente", "denegado", {
        entidad: "documentos", entidadId: documentoId, eventoId: ev.id,
        detalle: { motivo: "documento_ajeno" },
      });
      return generico(res, 400);
    }
    if (doc.nombre) nombreDocumento = String(doc.nombre).slice(0, 80);
  }

  // Idempotencia recuperable: no se duplica el aviso, pero un fallo se reintenta.
  const clave = `${ev.id}:${documentoId || "sin-doc"}`;
  const idem = await idemIniciar(admin, "correo-cliente", clave, 60, 24);
  if (idem === "duplicado" || idem === "en_curso") {
    return res.status(200).json({ ok: true, duplicado: true });
  }
  if (idem !== "procede") return generico(res, 500);

  try {
    const nombreCliente = (ev.cliente_nombre || "").split(/\s+/)[0] || "Hola";
    const html = plantillaOro({
      pretitulo: "Tienes un documento nuevo",
      titulo: "Tu cotización está lista",
      cuerpoHtml: `
        <p style="margin:0 0 14px 0;">${escHtml(nombreCliente)}, ¡buenas noticias! ✨</p>
        <p style="margin:0 0 14px 0;">Ya puedes revisar <strong style="color:#E6C870;">${escHtml(nombreDocumento)}</strong>
        para <strong style="color:#E6C870;">${escHtml(ev.nombre_evento)}</strong> en la sección <em>Documentos</em> de tu portal.</p>
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

    const cerrado = await idemCerrar(admin, "correo-cliente", clave, true);
    await auditar(admin, "correo_cliente", cerrado ? "ok" : "error", {
      entidad: "documentos", entidadId: documentoId || null, eventoId: ev.id,
      detalle: cerrado ? {} : { incidente: "idem_no_cerrada" },
    });
    res.status(200).json({ ok: true, enviadoA: ev.cliente_email });
  } catch (e) {
    console.error("[correo-cliente] Error:", e.message);
    await idemCerrar(admin, "correo-cliente", clave, false);
    await auditar(admin, "correo_cliente", "error", { eventoId: ev.id });
    generico(res, 500);
  }
}
