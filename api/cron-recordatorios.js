// api/cron-recordatorios.js — Vercel Cron (una vez al día, ver vercel.json).
//
// El asistente que no duerme:
//  - Correo DIGEST al dueño: próximos 7 días, saldos pendientes, solicitudes
//    estancadas, y eventos ya realizados sin reseña.
//  - Re-invitación de RESEÑA al cliente para eventos pasados sin reseña
//    (idempotente vía eventos.resena_recordada).
//
// SEGURIDAD (corregido)
//   Antes: `if (secret) { ...exigir... }`. Si CRON_SECRET no estaba definido, la
//   ruta quedaba ABIERTA a internet: cualquiera podía dispararla y provocar el
//   envío masivo de correos. Eso es fail-open, y por una variable ausente.
//   Ahora falla CERRADO: sin secreto configurado la ruta responde 500 y no hace
//   nada. Además solo acepta POST/GET de Vercel Cron y compara el secreto en
//   tiempo constante, con un lock de idempotencia para no duplicar el envío.
//
// IDEMPOTENCIA POR MENSAJE, y su semántica real: AT-LEAST-ONCE.
//   Cada correo tiene su propia clave —una para el digest, una por evento para la
//   reseña— y se cierra como completada solo cuando ESE correo salió. Un fallo
//   parcial deja reintentable únicamente lo que falló.
//
//   Pero Gmail y PostgreSQL son dos sistemas distintos y no existe transacción
//   que los abarque. Si el correo sale y justo después falla el cierre en
//   PostgreSQL, la clave queda en 'procesando' y al vencer su lease el mensaje
//   PUEDE reenviarse. Es decir: **at-least-once, no exactly-once**.
//
//   Se elige ese lado a propósito: es preferible que al dueño le llegue dos veces
//   su resumen a que un cliente nunca reciba la invitación a reseñar. Esos casos
//   se registran en `incidentes` y en la auditoría, así que quedan visibles en
//   lugar de silenciosos.
import { createClient } from "@supabase/supabase-js";
import { plantillaOro, enviarCorreo, SITIO_URL } from "./_lib/correo.js";
import { igualSeguro, bearer, generico, idemIniciar, idemCerrar, escHtml, escrituraOk, auditar } from "./_lib/guard.js";

const DEST_DEFAULT = "mighuer427@gmail.com";
const fmt = (n) => "$" + Number(n || 0).toLocaleString("es-MX");
const fecha = (iso) => (iso ? new Date(iso + "T00:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "long" }) : "");

export default async function handler(req, res) {
  // Vercel Cron invoca con GET; se acepta POST para disparo manual controlado.
  if (req.method !== "GET" && req.method !== "POST") return generico(res, 405);

  // FAIL-CLOSED: sin secreto configurado no se ejecuta nada.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron] CRON_SECRET no está configurado: la ruta queda deshabilitada");
    return generico(res, 500);
  }
  if (!igualSeguro(bearer(req), secret)) return generico(res, 401);

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !serviceRole) {
    res.status(500).json({ error: "Servidor sin configuración de Supabase" });
    return;
  }
  const admin = createClient(url, serviceRole, { db: { schema: "jardines" }, auth: { persistSession: false } });

  const hoy = new Date();

  // Lock de idempotencia: si el cron se reintenta (o alguien lo dispara dos
  // veces el mismo día), el segundo intento no vuelve a mandar los correos.
  // IDEMPOTENCIA POR MENSAJE, no por ejecución completa.
  //
  // Antes había un solo lock diario que además nunca se cerraba: al vencer el
  // lease, una segunda ejecución reenviaba TODO lo del día. Ahora cada correo
  // tiene su propia clave —una para el digest, una por evento para la reseña— y
  // se cierra como completada solo cuando ese correo concreto salió. Un fallo
  // parcial deja reintentable únicamente lo que falló.
  const claveDia = hoy.toISOString().slice(0, 10);
  const iso = (d) => d.toISOString().slice(0, 10);
  const hoyStr = iso(hoy);
  const en7 = iso(new Date(hoy.getTime() + 7 * 86400000));
  const hace2 = iso(new Date(hoy.getTime() - 2 * 86400000));
  const hace10 = iso(new Date(hoy.getTime() - 10 * 86400000));
  const hace3dias = new Date(hoy.getTime() - 3 * 86400000).toISOString();

  try {
    const [{ data: eventos }, { data: solicitudes }, { data: resenas }] = await Promise.all([
      admin.from("eventos").select("id,nombre_evento,fecha_evento,estatus,monto_total,anticipo_monto,cliente_email,cliente_nombre,resena_recordada"),
      admin.from("solicitudes").select("id,nombre_completo,estatus,created_at"),
      admin.from("resenas").select("evento_id"),
    ]);

    const evs = eventos || [];
    const conResena = new Set((resenas || []).map((r) => r.evento_id));

    // Próximos 7 días
    const proximos = evs.filter((e) => e.fecha_evento && e.fecha_evento >= hoyStr && e.fecha_evento <= en7 && e.estatus !== "Cancelado")
      .sort((a, b) => a.fecha_evento.localeCompare(b.fecha_evento));
    // Saldos pendientes (con fecha futura)
    const saldos = evs.filter((e) => Number(e.monto_total) > 0 && (Number(e.monto_total) - Number(e.anticipo_monto || 0)) > 0
      && e.fecha_evento && e.fecha_evento >= hoyStr && e.estatus !== "Cancelado");
    // Solicitudes estancadas (Nueva > 3 días)
    const estancadas = (solicitudes || []).filter((s) => (s.estatus || "Nueva") === "Nueva" && s.created_at < hace3dias);
    // Eventos pasados (2–10 días) sin reseña y sin recordar
    const paraResena = evs.filter((e) => e.fecha_evento && e.fecha_evento >= hace10 && e.fecha_evento <= hace2
      && !conResena.has(e.id) && !e.resena_recordada);

    // 1) Digest al dueño (solo si hay algo que reportar)
    let digestEnviado = false;
    let digestOmitido = null;
    const incidentes = [];
    if (proximos.length || saldos.length || estancadas.length || paraResena.length) {
      const bloque = (titulo, items) => items.length
        ? `<p style="margin:16px 0 6px 0;color:#E6C870;font-weight:bold;font-size:13px;">${titulo}</p>` +
          items.map((t) => `<p style="margin:0 0 4px 0;">• ${escHtml(t)}</p>`).join("")
        : "";
      const cuerpo =
        bloque("📅 Próximos 7 días", proximos.map((e) => `${e.nombre_evento} — ${fecha(e.fecha_evento)}`)) +
        bloque("💰 Saldos pendientes", saldos.map((e) => `${e.nombre_evento}: resta ${fmt(Number(e.monto_total) - Number(e.anticipo_monto || 0))} (${fecha(e.fecha_evento)})`)) +
        bloque("🥶 Solicitudes sin atender", estancadas.map((s) => `${s.nombre_completo || "Sin nombre"} (lleva días en "Nueva")`)) +
        bloque("⭐ Eventos sin reseña", paraResena.map((e) => `${e.nombre_evento} — les enviamos recordatorio de reseña`)) ||
        "<p>Todo en orden por hoy. 🎉</p>";
      const html = plantillaOro({
        pretitulo: "Resumen del día",
        titulo: "Tu agenda de hoy",
        cuerpoHtml: cuerpo,
        ctaTexto: "Abrir mi panel",
        ctaUrl: `${SITIO_URL}/${process.env.VITE_ADMIN_SLUG || "gestion-jch-9f27ax"}`,
        notaPie: "Resumen automático diario de Jardines Club Hípico.",
      });
      const claveDigest = `digest:${claveDia}`;
      const idemDigest = await idemIniciar(admin, "cron-recordatorios", claveDigest, 300, 30);
      if (idemDigest === "procede") {
        try {
          await enviarCorreo({ to: process.env.MAIL_TO || DEST_DEFAULT, subject: "☀️ Tu resumen del día — Jardines Club Hípico", html, texto: "Revisa tu panel para el resumen del día." });
          digestEnviado = true;
          // El correo YA salió. Si el cierre en PostgreSQL falla, mañana puede
          // reenviarse: ver la nota de semántica at-least-once arriba.
          if (!(await idemCerrar(admin, "cron-recordatorios", claveDigest, true))) {
            incidentes.push("digest_idem_no_cerrada");
            await auditar(admin, "cron_digest", "error", { detalle: { incidente: "idem_no_cerrada" } });
          }
        } catch (e) {
          console.error("[cron] digest:", e.message);
          // Fallido, no completado: mañana o al reintentar vuelve a salir.
          await idemCerrar(admin, "cron-recordatorios", claveDigest, false);
        }
      } else {
        digestOmitido = idemDigest;   // 'duplicado' o 'en_curso'
      }
    }

    // 2) Re-invitación de reseña al cliente + notificación al dashboard
    let resenasInvitadas = 0;
    for (const e of paraResena) {
      // Una clave por EVENTO: si a un cliente le falla el correo, no bloquea a
      // los demás ni se reenvía a quien ya lo recibió.
      const claveResena = `resena:${e.id}`;
      const idemResena = await idemIniciar(admin, "cron-recordatorios", claveResena, 300, 24 * 30);
      if (idemResena !== "procede") continue;

      let enviadoOk = false;
      if (e.cliente_email) {
        try {
          const html = plantillaOro({
            pretitulo: "¿Cómo estuvo tu evento?",
            titulo: "Nos encantaría saber de ti",
            cuerpoHtml: `<p style="margin:0 0 14px 0;">${escHtml((e.cliente_nombre || "Hola").split(/\s+/)[0])}, esperamos que <strong style="color:#E6C870;">${escHtml(e.nombre_evento)}</strong> haya sido inolvidable.</p>
              <p style="margin:0;">Tu opinión significa el mundo para nosotros. ¿Nos regalas un minuto para contarnos cómo te fue?</p>`,
            ctaTexto: "Dejar mi reseña",
            ctaUrl: `${SITIO_URL}/portal`,
            notaPie: "Si ya la dejaste, ¡gracias! Ignora este correo.",
          });
          await enviarCorreo({ to: e.cliente_email, subject: `⭐ ¿Cómo estuvo ${e.nombre_evento}? — Jardines Club Hípico`, html, texto: `Cuéntanos cómo estuvo tu evento en ${SITIO_URL}/portal` });
          enviadoOk = true;
          resenasInvitadas++;
        } catch (err) { console.error("[cron] resena mail:", err.message); }
      }

      if (!enviadoOk) {
        // El correo NO salió: la clave queda reintentable y el evento NO se marca
        // como recordado, para que el próximo día se vuelva a intentar.
        await idemCerrar(admin, "cron-recordatorios", claveResena, false);
        continue;
      }

      // El correo ya salió. Se comprueban las TRES escrituras siguientes.
      const cerrada = await idemCerrar(admin, "cron-recordatorios", claveResena, true);
      const marcado = await escrituraOk(
        admin.from("eventos").update({ resena_recordada: true }).eq("id", e.id),
        "cron resena_recordada");
      await escrituraOk(
        admin.from("notificaciones").insert({
          evento_id: e.id, tipo: "recordatorio",
          titulo: `⭐ Le pedimos su reseña a ${e.nombre_evento}`,
        }), "cron notificacion");

      // `resena_recordada` solo cuenta como confirmado si AMBAS salieron bien.
      // Si no, este evento vuelve a entrar mañana (puede repetir el correo).
      if (!cerrada || !marcado) {
        incidentes.push(`resena_no_confirmada:${e.id}`);
        await auditar(admin, "cron_resena", "error", {
          entidad: "eventos", entidadId: e.id, eventoId: e.id,
          detalle: { incidente: "cierre_incompleto", cerrada, marcado },
        });
      }
    }

    res.status(200).json({
      ok: true, digestEnviado, digestOmitido, resenasInvitadas,
      proximos: proximos.length, saldos: saldos.length, estancadas: estancadas.length,
      incidentes,
    });
  } catch (e) {
    console.error("[cron] Error:", e.message);
    res.status(500).json({ error: "Error del cron" });
  }
}
