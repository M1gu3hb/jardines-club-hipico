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
import { plantillaOro, enviarCorreo, URL_PORTAL } from "./_lib/correo.js";
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
  //
  // ESTA RUTA NUNCA HABÍA FUNCIONADO. Pedía `select("id, nombre, evento_id")` y la tabla
  // `documentos` no tiene columna `nombre` — tiene `titulo`. PostgREST responde
  // `42703 column documentos.nombre does not exist`, y como el `error` se descartaba, `doc`
  // quedaba en `null`, la guarda de abajo lo tomaba por documento ajeno y devolvía 400.
  // Resultado: el botón "Avisar" del panel fallaba siempre, y encima dejaba en la auditoría
  // un `documento_ajeno` que acusaba al admin de algo que no había hecho.
  //
  // Se lee `titulo` y `tipo`, y se comprueba el `error` en vez de tirarlo: un fallo de lectura
  // no puede volver a disfrazarse de "no es tuyo".
  let nombreDocumento = "tu documento";
  let tipoDocumento = null;
  if (documentoId) {
    const { data: doc, error: errDoc } = await admin
      .from("documentos").select("id, titulo, tipo, evento_id").eq("id", documentoId).maybeSingle();
    if (errDoc) {
      console.error("[correo-cliente] no se pudo leer el documento:", errDoc.message);
      await auditar(admin, "correo_cliente", "error", {
        entidad: "documentos", entidadId: documentoId, eventoId: ev.id,
        detalle: { motivo: "lectura_fallida" },
      });
      return generico(res, 500);
    }
    if (!doc || doc.evento_id !== ev.id) {
      await auditar(admin, "correo_cliente", "denegado", {
        entidad: "documentos", entidadId: documentoId, eventoId: ev.id,
        detalle: { motivo: "documento_ajeno" },
      });
      return generico(res, 400);
    }
    if (doc.titulo) nombreDocumento = String(doc.titulo).slice(0, 80);
    tipoDocumento = doc.tipo || null;
  }

  // El titular se adapta al tipo REAL del documento. El botón "Avisar" está en todos, así que
  // avisar de un contrato mandaba un correo titulado "Tu cotización está lista".
  const ENCABEZADOS = {
    cotizacion: { titulo: "Tu cotización está lista", asunto: "Tu cotización" },
    contrato: { titulo: "Tu contrato está listo", asunto: "Tu contrato" },
  };
  const enc = ENCABEZADOS[tipoDocumento] || { titulo: "Tienes un documento nuevo", asunto: "Un documento nuevo" };

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
      titulo: enc.titulo,
      cuerpoHtml: `
        <p style="margin:0 0 14px 0;">${escHtml(nombreCliente)}, ¡buenas noticias! ✨</p>
        <p style="margin:0 0 14px 0;">Ya puedes revisar <strong style="color:#E6C870;">${escHtml(nombreDocumento)}</strong>
        para <strong style="color:#E6C870;">${escHtml(ev.nombre_evento)}</strong> en la sección <em>Documentos</em> de tu portal.</p>
        <p style="margin:0;">Entra con tu usuario y contraseña de siempre. Cualquier duda, respóndenos este correo y con gusto te acompañamos.</p>`,
      ctaTexto: "Ver mi documento",
      ctaUrl: `${URL_PORTAL}/portal`,
      notaPie: "Este documento es exclusivo para ti y tu evento.",
    });

    await enviarCorreo({
      to: ev.cliente_email,
      subject: `📄 ${enc.asunto} de "${ev.nombre_evento}" — Jardines Club Hípico`,
      html,
      texto: `${enc.titulo}. Revísalo en la sección Documentos de tu portal: ${URL_PORTAL}/portal`,
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
