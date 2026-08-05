// api/_lib/correo.js — Plantilla HTML dorada + envío de correos del portal.
// (Los archivos dentro de carpetas con "_" NO se publican como funciones en Vercel.)
import nodemailer from "nodemailer";

export const SITIO_URL = "https://jardines-club-hipico.vercel.app";
const LOGO_URL = `${SITIO_URL}/media/img/aMxWuH8.png`;

// ⚠️ HABÍA DOS ESCAPADORES Y EL DÉBIL ERA EL DE LA PLANTILLA COMPARTIDA.
//
// Este `esc` local no escapaba `'`, y es el que envuelve todo lo que va dentro de `plantillaOro`
// —el nombre del cliente, el del evento, el texto libre—. En un atributo HTML delimitado por
// comillas simples, o dentro de un `on*=`, una comilla sin escapar cierra el atributo. El de
// `guard.js` sí lo escapa, así que el proyecto tenía la versión buena a un import de distancia.
//
// Una sola fuente. `guard.js` no importa este archivo, así que no hay ciclo.
import { escHtml as esc } from "./guard.js";

/**
 * Plantilla dorada de Jardines Club Hípico (tablas + estilos inline, email-safe).
 * @param {object} p { pretitulo, titulo, cuerpoHtml, ctaTexto, ctaUrl, notaPie }
 */
export function plantillaOro({ pretitulo, titulo, cuerpoHtml, ctaTexto, ctaUrl, notaPie }) {
  const boton = ctaTexto && ctaUrl ? `
    <tr><td align="center" style="padding: 28px 0 6px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td align="center" bgcolor="#C9A84C" style="border-radius: 999px; background: linear-gradient(180deg,#E2C266,#C9A84C 55%,#A88532);">
          <a href="${ctaUrl}" target="_blank"
             style="display:inline-block; padding: 14px 34px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: bold; color: #1a1208; text-decoration: none; letter-spacing: .4px;">
            ${esc(ctaTexto)}
          </a>
        </td>
      </tr></table>
    </td></tr>` : "";

  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0; padding:0; background-color:#0a0a0a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#0a0a0a">
    <tr><td align="center" style="padding: 36px 14px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width: 560px; width: 100%;">

        <!-- Logo -->
        <tr><td align="center" style="padding-bottom: 26px;">
          <img src="${LOGO_URL}" alt="Jardines Club Hípico" width="110" style="display:block; max-width:110px; height:auto;">
        </td></tr>

        <!-- Tarjeta -->
        <tr><td bgcolor="#111111" style="border: 1px solid #3a3220; border-radius: 18px; padding: 38px 34px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${pretitulo ? `<tr><td align="center" style="font-family: Arial, Helvetica, sans-serif; font-size: 10px; letter-spacing: 3px; color: #C9A84C; text-transform: uppercase; padding-bottom: 12px;">${esc(pretitulo)}</td></tr>` : ""}
            <tr><td align="center" style="font-family: Georgia, 'Times New Roman', serif; font-size: 26px; font-weight: normal; color: #ffffff; padding-bottom: 6px;">${esc(titulo)}</td></tr>
            <tr><td align="center" style="padding: 10px 0 18px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td width="46" style="border-top: 1px solid #C9A84C;"></td>
              </tr></table>
            </td></tr>
            <tr><td style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.7; color: #c9c9c9;">
              ${cuerpoHtml}
            </td></tr>
            ${boton}
          </table>
        </td></tr>

        <!-- Pie -->
        <tr><td align="center" style="padding-top: 24px; font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.7; color: #666666;">
          ${notaPie ? esc(notaPie) + "<br>" : ""}
          Jardines Club Hípico · Xochimilco, CDMX<br>
          <a href="${SITIO_URL}" style="color: #C9A84C; text-decoration: none;">jardines-club-hipico.vercel.app</a>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// `cajaCredenciales(usuario, password)` vivía aquí: pintaba usuario y contraseña
// dentro del correo de bienvenida. Se retiró con el blindaje —las contraseñas ya
// no viajan por correo, el primer acceso es un enlace de un solo uso— y se borra
// ahora porque dejarla exportada era dejar lista la pieza para deshacer esa
// decisión sin querer. Está en el historial si hiciera falta consultarla.

/** Envía un correo (HTML + texto alternativo) con la cuenta Gmail del club. */
export async function enviarCorreo({ to, subject, html, texto, replyTo }) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) throw new Error("Correo no configurado (GMAIL_USER / GMAIL_APP_PASSWORD)");
  const transporter = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
  await transporter.sendMail({
    from: `"Jardines Club Hípico" <${user}>`,
    to,
    replyTo: replyTo || undefined,
    subject,
    text: texto || subject,
    html,
  });
}
