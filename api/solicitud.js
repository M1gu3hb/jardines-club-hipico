// api/solicitud.js — Función serverless (Vercel).
//
// DOS CORREOS, INDEPENDIENTES, POR UNA SOLA SOLICITUD DEL FORMULARIO PÚBLICO:
//
//   1. El AVISO AL DUEÑO. Es el único camino por el que el negocio se entera de que existe un
//      lead. Si no sale, el lead está guardado pero nadie lo mira.
//   2. El ACUSE A QUIEN LLENÓ EL FORMULARIO (E-1). Hasta hoy no existía: un desconocido
//      entregaba su nombre y su teléfono, veía un folio en pantalla y no recibía NADA. Era el
//      único punto del recorrido comercial donde alguien da sus datos y no hay acuse: si no le
//      contestaban ese día, no tenía ni prueba de haber enviado algo.
//
// QUÉ ESTABA MAL ANTES (y sigue corregido)
//   La ruta aceptaba un cuerpo ARBITRARIO y mandaba correo con él. Sin sesión, sin rate limit
//   y sin comprobar que la solicitud existiera: cualquiera podía inundar el buzón del dueño con
//   contenido inventado, y encima fijar el `replyTo` a la dirección que quisiera.
//
// CÓMO QUEDA
//   El navegador solo manda el `solicitudId`. El servidor vuelve a leer esa fila con
//   service_role y arma LOS DOS correos con los datos CANÓNICOS de la base. Si la fila no
//   existe, no sale ninguno. Rate limit por IP —el que ya había, no uno nuevo— e idempotencia
//   POR CORREO, así que un reintento no duplica nada y un fallo de uno no da el otro por hecho.
import { plantillaOro, enviarCorreo, URL_CRM, URL_WEB } from "./_lib/correo.js";
import { enlaceWhatsApp, numeroWhatsApp } from "./_lib/telefono.js";
import {
  clienteAdmin, leerBody, rateLimit, idemIniciar, idemCerrar,
  auditar, generico, ipCliente, escHtml,
} from "./_lib/guard.js";

/**
 * DOS CLAVES DE IDEMPOTENCIA, NO UNA.
 *
 * Las dos cuelgan del mismo `solicitudes.id`, pero por endpoints distintos, y esa separación es
 * la propiedad: que el aviso al dueño salga NO puede dar el acuse por enviado, y que el acuse
 * falle NO puede impedir que el aviso se reintente. Con una sola clave, el primero de los dos
 * que la cerrara dejaría al otro sin forma de volver a intentarlo — que es exactamente el fallo
 * silencioso que la idempotencia recuperable existe para evitar.
 */
const IDEM_DUENO = "solicitud-correo";
const IDEM_ACUSE = "solicitud-acuse";

/**
 * EN CUÁNTO LE CONTESTAMOS.
 *
 * No es una cifra inventada para el correo: es la que el propio formulario ya promete en
 * pantalla («Sin costo · Te respondemos en menos de 24h», `src/components/FormularioModal.jsx`).
 * Un acuse que prometiera otra cosa convertiría una promesa en dos, y la persona se quedaría sin
 * saber cuál vale. Hay un contrato que cruza las dos cifras y falla si divergen.
 */
const PLAZO_HORAS = 24;

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
 *
 * El acuse al cliente usa este MISMO valor como `replyTo`: quien conteste al acuse tiene que
 * caer en la bandeja del negocio, no en un buzón sin etiqueta (§5.5 de `16E-CORREOS.md`).
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
 * ¿SE PUEDE ESCRIBIR A ESTA DIRECCIÓN? Devuelve la dirección o `null`.
 *
 * **El correo es OPCIONAL en el formulario.** Si la persona no lo dio, el acuse simplemente no
 * existe para esa solicitud: no se manda nada, no se marca ninguna clave y NO es un error. No se
 * le persigue por un dato que decidió no dar — y el aviso de privacidad dice, con esas palabras,
 * que el correo es opcional.
 *
 * La forma ya la valida el trigger `solicitud_saneo` en el INSERT (`sec_13`: recorta a 160,
 * pasa a minúsculas y exige `algo@algo.algo`), así que esto es el segundo cerrojo, no el
 * primero. Vale la pena igual por una razón concreta: esta cadena acaba en la cabecera `To:` de
 * un correo, y una cabecera admite salto de línea. Excluir espacios en blanco, comas, punto y
 * coma y ángulos cierra la inyección de cabeceras sin depender de lo que haga nodemailer.
 */
const correoUtilizable = (email) => {
  const v = String(email ?? "").trim();
  if (!v || v.length > 160) return null;
  if (!/^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]{2,}$/.test(v)) return null;
  return v;
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

/** Un párrafo de prosa del acuse. La frase entra ya escrita; aquí solo se escapa y se viste. */
const parrafo = (texto) => `
  <p style="margin:0 0 14px 0;color:#cfcfcf;font-size:14px;line-height:1.7;">${escHtml(texto)}</p>`;

/**
 * EL FOLIO, EN GRANDE.
 *
 * Es lo único del acuse que la persona va a buscar dentro de tres días, y por eso no va en una
 * fila más de la tabla: si hay que rebuscarlo, el acuse no sirve de prueba de nada.
 */
const cajaFolio = (folio) => `
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin:22px 0;">
    <tr><td align="center" bgcolor="#161206" style="border:1px solid #3a3220;border-radius:12px;padding:18px 14px;">
      <div style="color:#8a8a8a;font-size:11px;letter-spacing:2px;text-transform:uppercase;padding-bottom:8px;font-family:Arial,Helvetica,sans-serif;">Tu folio</div>
      <div style="color:#E6C870;font-family:Georgia,'Times New Roman',serif;font-size:24px;letter-spacing:1px;">${escHtml(folio || "—")}</div>
    </td></tr>
  </table>`;

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
 * Cuerpo HTML del aviso AL DUEÑO, construido SOLO con la fila de la base — igual que el texto
 * plano. Todo valor pasa por `escHtml`: el nombre y los comentarios los escribe un desconocido
 * en un formulario público, así que son la entrada menos confiable de todo el proyecto.
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

/**
 * Cuerpo HTML del ACUSE AL CLIENTE. Mismo contrato que el de arriba: sale entero de la fila de
 * la base y todo lo que la persona escribió pasa por `escHtml`.
 *
 * **Por qué se le devuelve su teléfono.** Es el único canal obligatorio del formulario: si lo
 * escribió mal, no hay forma de contactarla y el lead muere sin que nadie sepa por qué.
 * Enseñárselo es lo que le permite darse cuenta y contestar corrigiéndolo. El precio —si teclea
 * mal SU correo, un desconocido recibe su nombre y su teléfono— existe, y es el precio de
 * cualquier acuse; se paga a cambio de salvar el caso mucho más frecuente. El correo NO se
 * repite dentro del cuerpo: lo está leyendo en esa misma bandeja.
 */
function construirHtmlAcuse(s) {
  const f = frasesAcuse(s);
  return (
    parrafo(f.saludo) +
    parrafo(f.recibido) +
    cajaFolio(s.folio) +
    seccion("LO QUE NOS PEDISTE",
      fila("Espacio / Salón", s.salon_seleccionado) + fila("Tipo de evento", s.tipo_evento) +
      fila("Fecha tentativa", s.fecha_tentativa) +
      fila("Personas", s.numero_personas == null ? "" : String(s.numero_personas)) +
      fila("Teléfono de contacto", s.telefono)) +
    (s.comentarios ? seccion("LO QUE NOS ESCRIBISTE", fila("Comentarios", s.comentarios)) : "") +
    parrafo(f.plazo) +
    parrafo(f.cierre)
  );
}

/** Texto del correo AL DUEÑO, construido SOLO con la fila de la base. */
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

/**
 * LAS FRASES DEL ACUSE, EN TEXTO PLANO Y EN UN SOLO SITIO.
 *
 * Las comparten el HTML y la alternativa de texto: el HTML las escapa, el texto las escribe tal
 * cual. Escribirlas dos veces es cómo dos versiones del mismo correo acaban prometiendo cosas
 * distintas — y la de texto, que casi nadie mira, es la que se queda vieja.
 *
 * Lo que promete está DENTRO de lo que dice el aviso de privacidad publicado hoy: «nos
 * comunicamos contigo para resolver tus dudas, preparar tu cotización». Ni una palabra de
 * publicidad, ni de suscripción, ni de nada que la persona no haya pedido.
 */
function frasesAcuse(s) {
  const pila = String(s.nombre_completo || "").trim().split(/\s+/)[0] || "";
  return {
    saludo: pila ? `Hola ${pila},` : "Hola,",
    recibido:
      "Recibimos tu solicitud de cotización. Este correo es tu acuse: guárdalo, porque lleva el " +
      "folio con el que la localizamos.",
    plazo:
      `Te contestamos en menos de ${PLAZO_HORAS} horas al teléfono que nos dejaste. Si algún dato ` +
      "de aquí arriba está mal, respóndenos a este mismo correo y lo corregimos.",
    cierre: "Gracias por pensar en Jardines Club Hípico para tu evento.",
  };
}

/** Texto del ACUSE, con las mismas frases y los mismos datos que el HTML. */
function construirTextoAcuse(s) {
  const f = frasesAcuse(s);
  return `${f.saludo}

${f.recibido}

TU FOLIO: ${s.folio || "-"}

LO QUE NOS PEDISTE
Espacio/Salon:   ${s.salon_seleccionado || "-"}
Tipo de evento:  ${s.tipo_evento || "-"}
Fecha tentativa: ${s.fecha_tentativa || "-"}
Personas:        ${s.numero_personas || "-"}
Telefono:        ${s.telefono || "-"}
${s.comentarios ? `
LO QUE NOS ESCRIBISTE
${s.comentarios}
` : ""}
${f.plazo}

${f.cierre}`.trim();
}

/**
 * EL ACUSE ARMADO: asunto, HTML y texto plano. **Función pura** — no toca la red, ni la base, ni
 * el entorno, así que la suite de contratos puede ejecutarla con una solicitud de mentira y
 * mirar lo que sale.
 *
 * Se exporta por eso. Ninguna de las cuatro puertas manda un correo, así que sin esto la única
 * comprobación posible del contenido sería leer el código y creérselo. En Vercel solo cuenta el
 * `export default`; los demás exports no publican nada.
 */
export function acuseParaCliente(s) {
  return {
    asunto: s.folio ? `Recibimos tu solicitud · Folio ${s.folio}` : "Recibimos tu solicitud",
    html: plantillaOro({
      pretitulo: "Jardines Club Hípico",
      titulo: "Recibimos tu solicitud",
      cuerpoHtml: construirHtmlAcuse(s),
      ctaTexto: "Conocer el salón",
      ctaUrl: URL_WEB,
      notaPie:
        "Recibes este correo porque enviaste una solicitud de cotización en nuestro sitio. " +
        "No es publicidad y no te suscribimos a nada.",
    }),
    texto: construirTextoAcuse(s),
  };
}

/**
 * EL AVISO AL DUEÑO. Devuelve `'enviado' | 'duplicado' | 'fallido'`.
 *
 * Es la mitad que sostiene el negocio: sin ella el lead está en la base y nadie lo mira. Por eso
 * es la única que decide el código de respuesta (ver el `handler`).
 */
async function avisarAlDueno(admin, s, to) {
  // Un reintento no manda el correo dos veces, pero un fallo real sí se puede
  // reintentar: la clave solo se consume cuando el envío sale bien.
  const idem = await idemIniciar(admin, IDEM_DUENO, s.id, 60, 48);
  if (idem === "duplicado" || idem === "en_curso") return "duplicado";
  if (idem !== "procede") return "fallido";

  const waUrl = enlaceWhatsApp(s.telefono, { nombre: s.nombre_completo, folio: s.folio });

  try {
    // Era la única ruta con su propio transporter y texto plano. Ahora usa la misma plantilla
    // dorada que los demás correos del proyecto (`_lib/correo.js`), así que el remitente, el
    // fondo, el acento y el botón salen de un único sitio. El texto plano se conserva como
    // alternativa: hay clientes que no pintan HTML, y sin él el correo llegaría vacío ahí.
    await enviarCorreo({
      to,
      // replyTo sale de la base, no del cuerpo de la petición: así el dueño responde al
      // cliente de verdad y no a una dirección que puso quien llamó a la ruta. Y pasa por el
      // MISMO saneador que el destinatario del acuse: `Reply-To` es una cabecera igual que
      // `To`, así que si la columna trajera un salto de línea sería el mismo agujero. Con la
      // forma mal, se manda sin `replyTo` — el aviso sale igual, que es lo que importa.
      replyTo: correoUtilizable(s.email) || undefined,
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

    const cerrado = await idemCerrar(admin, IDEM_DUENO, s.id, true);
    await auditar(admin, "solicitud_correo", cerrado ? "ok" : "error", {
      entidad: "solicitudes", entidadId: s.id,
      detalle: cerrado ? {} : { incidente: "idem_no_cerrada" },
    });
    return "enviado";
  } catch (e) {
    console.error("[solicitud] Error al enviar el aviso al dueño:", e.message);
    await idemCerrar(admin, IDEM_DUENO, s.id, false);
    await auditar(admin, "solicitud_correo", "error", { entidad: "solicitudes", entidadId: s.id });
    return "fallido";
  }
}

/**
 * EL ACUSE A QUIEN LLENÓ EL FORMULARIO (E-1).
 * Devuelve `'enviado' | 'sin_correo' | 'duplicado' | 'fallido'`.
 *
 * `'sin_correo'` NO es un fallo: el campo es opcional y quien no lo dio no recibe acuse, punto.
 * En ese camino no se manda nada y **no se marca ninguna clave** — dejar la clave cerrada por
 * una solicitud sin correo enterraría el acuse si mañana se completara el dato.
 *
 * No lleva rate limit propio. Ya hay dos: 10 por IP y hora en esta ruta, y 5 por IP y hora sobre
 * el INSERT en el trigger `solicitud_saneo`. Un tercero encima de los mismos disparos no mide
 * nada nuevo y sí puede cortar envíos legítimos.
 */
async function acusarAlCliente(admin, s, replyTo) {
  const para = correoUtilizable(s.email);
  if (!para) return "sin_correo";

  const idem = await idemIniciar(admin, IDEM_ACUSE, s.id, 60, 48);
  if (idem === "duplicado" || idem === "en_curso") return "duplicado";
  if (idem !== "procede") return "fallido";

  const acuse = acuseParaCliente(s);

  try {
    await enviarCorreo({
      to: para,
      // Quien conteste al acuse tiene que caer en la bandeja del negocio. Sin esto responde a la
      // cuenta desde la que se manda, que es un buzón operativo sin etiqueta (§5.5).
      replyTo,
      subject: acuse.asunto,
      html: acuse.html,
      // El texto plano se conserva, igual que en el aviso al dueño: hay clientes de correo que
      // no pintan HTML y sin él este acuse llegaría vacío.
      texto: acuse.texto,
    });

    const cerradoAcuse = await idemCerrar(admin, IDEM_ACUSE, s.id, true);
    await auditar(admin, "solicitud_acuse", cerradoAcuse ? "ok" : "error", {
      entidad: "solicitudes", entidadId: s.id,
      detalle: cerradoAcuse ? {} : { incidente: "idem_no_cerrada" },
    });
    return "enviado";
  } catch (e) {
    console.error("[solicitud] Error al enviar el acuse al cliente:", e.message);
    await idemCerrar(admin, IDEM_ACUSE, s.id, false);
    await auditar(admin, "solicitud_acuse", "error", { entidad: "solicitudes", entidadId: s.id });
    return "fallido";
  }
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

  // La solicitud tiene que EXISTIR y ser reciente. Los dos correos se arman con lo
  // que hay en la base, no con lo que dijo el navegador.
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

  /* ══════════════════════════════════════════════════════════════════════════
   * LOS DOS CORREOS, UNO DETRÁS DE OTRO Y SIN QUE NINGUNO PUEDA TUMBAR AL OTRO
   * ══════════════════════════════════════════════════════════════════════════
   *
   * Cada mitad tiene su `try/catch`, su clave de idempotencia y su fila de auditoría, así que un
   * fallo de una no interrumpe a la otra ni la da por hecha. El aviso al dueño va PRIMERO: es el
   * que sostiene el negocio y no tiene por qué esperar detrás de una cortesía.
   *
   * **Por qué en serie y no con `Promise.all`.** En paralelo la petición terminaría antes, pero
   * si la función se agotara por tiempo las DOS quedarían a medias, con sus claves atrapadas en
   * el lease. En serie, un agotamiento durante el acuse deja el aviso al dueño **enviado y con la
   * clave cerrada**, que es el estado que hay que preservar. `vercel.json` no fija `maxDuration`,
   * así que rige el de la plataforma; dos envíos SMTP caben, pero el margen ya no es el de uno.
   * **No medido contra Gmail:** si algún día el registro enseña agotamientos aquí, lo que toca es
   * fijar `maxDuration`, no paralelizar.
   */
  const avisoDueno = await avisarAlDueno(admin, s, to);
  const acuse = await acusarAlCliente(admin, s, to);

  /* ── QUÉ SE DEVUELVE, Y POR QUÉ LO DECIDE SOLO EL AVISO AL DUEÑO ────────────
   *
   * El front traduce un no-2xx a un mensaje concreto y visible: «No pudimos mandar el aviso
   * automático al equipo, escríbenos por WhatsApp con tu folio» (`FormularioModal.jsx`). Ese
   * mensaje es CIERTO solo cuando falló el aviso al dueño.
   *
   *   · Falló el aviso al dueño  → 500. El lead está guardado pero nadie lo mira, así que hay que
   *     empujar a la persona al canal que sí llega. Perder el lead es lo único inaceptable.
   *   · Falló solo el acuse      → 200. Devolver 500 aquí (a) le mentiría, porque el equipo SÍ se
   *     enteró; (b) la mandaría a WhatsApp sin motivo; y (c) sería un error permanente, porque el
   *     reintento encuentra la clave del dueño ya cerrada y solo reintentaría el acuse — el mismo
   *     500 para siempre. El acuse queda reintentable con su clave en 'fallido' y el fallo consta
   *     en la auditoría con la acción `solicitud_acuse`. Perder el acuse NO puede hacer perder
   *     el lead.
   *
   * `duplicado` se conserva con el mismo significado que tenía: se refiere al aviso al dueño.
   */
  if (avisoDueno === "fallido") return generico(res, 500);
  res.status(200).json({ ok: true, duplicado: avisoDueno === "duplicado", acuse });
}
