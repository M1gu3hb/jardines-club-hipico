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
import { plantillaOro, enviarCorreo, URL_CRM } from "./_lib/correo.js";
import { enlaceWhatsApp, numeroWhatsApp } from "./_lib/telefono.js";
import {
  clienteAdmin, leerBody, rateLimit, idemIniciar, idemCerrar,
  auditar, generico, ipCliente, escHtml,
} from "./_lib/guard.js";

/**
 * A DÓNDE VA EL AVISO SI NADIE LO DICE.
 *
 * Aquí había una dirección de Gmail PERSONAL escrita a pelo, y en el repositorio de la web —que es
 * **público**, comprobado con `gh repo view`: `visibility: PUBLIC`— eso es un dato personal
 * publicado. Va contra la regla de secretos del proyecto, que nombra los «correos personales» con
 * todas las letras. Y hacía algo peor que estar ahí: **si `MAIL_TO` no estuviera puesta en Vercel,
 * cada lead del formulario se iría a una bandeja particular** sin que nada avisara.
 *
 * El respaldo pasa a ser `GMAIL_USER`, que es la cuenta **desde la que se manda** y por tanto la
 * del negocio: ya es obligatoria —sin ella esta ruta devuelve 500— así que el respaldo no puede
 * faltar, y no hay ninguna dirección escrita en el código.
 *
 * **Por qué respaldo y no un error.** Tumbar el envío cuando falta `MAIL_TO` convertiría un correo
 * que llega al buzón equivocado en un lead que no llega a ninguno. Es la trampa 4 del método: un
 * arreglo que empeora lo que arregla. Lo que sí hace es **gritar en el registro**, que es donde el
 * dueño lo ve sin que se le pierda un cliente por el camino.
 */
const destinoAviso = () => {
  const to = process.env.MAIL_TO;
  if (to) return to;
  console.warn(
    "[correo] MAIL_TO no está puesta en el entorno: el aviso se manda a GMAIL_USER. " +
    "Ponla en Vercel para dirigirlo a la bandeja que toque.",
  );
  return process.env.GMAIL_USER;
};

/**
 * Fila de la tabla del correo. Estilos EN LÍNEA porque Gmail borra el `<style>` del `<head>`,
 * y `<table>` porque es lo único que maqueta igual en Gmail, Outlook y iOS Mail.
 * En móvil las dos celdas se apilan solas: la etiqueta va en su propia fila estrecha.
 */
const fila = (etiqueta, valor) => `
  <tr>
    <td style="padding:7px 12px 7px 0;color:#8a8a8a;font-size:12px;white-space:nowrap;vertical-align:top;">${escHtml(etiqueta)}</td>
    <td style="padding:7px 0;color:#e8e8e8;font-size:13px;vertical-align:top;">${escHtml(valor || "—")}</td>
  </tr>`;

const seccion = (titulo, filas) => `
  <p style="margin:20px 0 4px 0;color:#E6C870;font-weight:bold;font-size:12px;letter-spacing:.4px;">${escHtml(titulo)}</p>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">${filas}</table>`;

/**
 * La fila del teléfono, que ademas dice si el número NO se pudo convertir en enlace.
 *
 * Sin esto, la ausencia del botón verde es ambigua: ¿está roto el correo, o es que el cliente
 * escribió algo que no es un teléfono? Se responde en el sitio donde se mira. La nota es un
 * literal fijo — no entra ni un carácter del cliente por esa vía.
 */
const filaTelefono = (tel) => {
  if (numeroWhatsApp(tel)) return fila("Teléfono", tel);
  return `
  <tr>
    <td style="padding:7px 12px 7px 0;color:#8a8a8a;font-size:12px;white-space:nowrap;vertical-align:top;">Teléfono</td>
    <td style="padding:7px 0;color:#e8e8e8;font-size:13px;vertical-align:top;">${escHtml(tel || "—")}
      <span style="color:#c98a4c;font-size:11px;"> · no tiene forma de número, por eso no hay botón de WhatsApp</span>
    </td>
  </tr>`;
};

/**
 * Cuerpo HTML del aviso, construido SOLO con la fila de la base — igual que el texto plano.
 * Todo valor pasa por `escHtml`: el nombre y los comentarios los escribe un desconocido en un
 * formulario público, así que son la entrada menos confiable de todo el proyecto.
 */
function construirHtml(s) {
  return (
    seccion("IDENTIFICACIÓN",
      fila("Folio", s.folio) + fila("Fecha de envío", s.fecha_envio) + fila("Hora", s.hora_envio)) +
    seccion("CLIENTE",
      fila("Nombre", s.nombre_completo) + filaTelefono(s.telefono) + fila("Correo", s.email)) +
    seccion("EVENTO",
      fila("Espacio / Salón", s.salon_seleccionado) + fila("Tipo", s.tipo_evento) +
      fila("Fecha tentativa", s.fecha_tentativa) +
      fila("Personas", s.numero_personas == null ? "" : String(s.numero_personas))) +
    `<p style="margin:20px 0 4px 0;color:#E6C870;font-weight:bold;font-size:12px;letter-spacing:.4px;">COMENTARIOS</p>` +
    `<p style="margin:0;color:#cfcfcf;font-size:13px;line-height:1.55;">` +
    `${escHtml(s.comentarios || "Sin comentarios adicionales.")}</p>`
  );
}

/** Texto del correo, construido SOLO con la fila de la base. */
function construirTexto(s) {
  const wa = enlaceWhatsApp(s.telefono, { nombre: s.nombre_completo, folio: s.folio });
  return `Nueva solicitud de evento recibida${wa ? `

ESCRIBIRLE POR WHATSAPP
${wa}` : ""}

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
  const to = destinoAviso();
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

  // Un reintento no manda el correo dos veces, pero un fallo real sí se puede
  // reintentar: la clave solo se consume cuando el envío sale bien.
  const idem = await idemIniciar(admin, "solicitud-correo", s.id, 60, 48);
  if (idem === "duplicado" || idem === "en_curso") {
    return res.status(200).json({ ok: true, duplicado: true });
  }
  if (idem !== "procede") return generico(res, 500);

  const waUrl = enlaceWhatsApp(s.telefono, { nombre: s.nombre_completo, folio: s.folio });

  try {
    // Era la única ruta con su propio transporter y texto plano. Ahora usa la misma plantilla
    // dorada que los demás correos del proyecto (`_lib/correo.js`), así que el remitente, el
    // fondo, el acento y el botón salen de un único sitio. El texto plano se conserva como
    // alternativa: hay clientes que no pintan HTML, y sin él el correo llegaría vacío ahí.
    await enviarCorreo({
      to,
      // replyTo sale de la base, no del cuerpo de la petición: así el dueño responde al
      // cliente de verdad y no a una dirección que puso quien llamó a la ruta.
      replyTo: s.email || undefined,
      subject: `[JCH] Nueva solicitud ${s.folio || ""} - ${s.nombre_completo || ""}`.trim(),
      html: plantillaOro({
        pretitulo: "Formulario del sitio",
        titulo: "Nueva solicitud de evento",
        cuerpoHtml: construirHtml(s),
        ctaTexto: "Ver en mi panel",
        ctaUrl: `${URL_CRM}/${process.env.VITE_ADMIN_SLUG || "gestion-jch-9f27ax"}`,
        // Segundo botón: abre el chat de WhatsApp con el número que escribió el cliente. Si ese
        // número no se puede convertir con certeza, `enlaceWhatsApp` devuelve `null` y el botón
        // NO se pinta — abrir el chat equivocado sería peor que no tener botón.
        cta2Texto: waUrl ? "Escribir por WhatsApp" : undefined,
        cta2Url: waUrl || undefined,
        notaPie: "Aviso automático del formulario de Jardines Club Hípico.",
      }),
      texto: construirTexto(s),
    });

    const cerrado = await idemCerrar(admin, "solicitud-correo", s.id, true);
    await auditar(admin, "solicitud_correo", cerrado ? "ok" : "error", {
      entidad: "solicitudes", entidadId: s.id,
      detalle: cerrado ? {} : { incidente: "idem_no_cerrada" },
    });
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error("[solicitud] Error al enviar correo:", e.message);
    await idemCerrar(admin, "solicitud-correo", s.id, false);
    await auditar(admin, "solicitud_correo", "error", { entidad: "solicitudes", entidadId: s.id });
    generico(res, 500);
  }
}
