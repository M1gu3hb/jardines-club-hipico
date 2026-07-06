// api/cron-recordatorios.js — Vercel Cron (una vez al día, ver vercel.json).
//
// El asistente que no duerme:
//  - Correo DIGEST al dueño: próximos 7 días, saldos pendientes, solicitudes
//    estancadas, y eventos ya realizados sin reseña.
//  - Re-invitación de RESEÑA al cliente para eventos pasados sin reseña
//    (idempotente vía eventos.resena_recordada).
//
// Seguridad: Vercel Cron manda `Authorization: Bearer <CRON_SECRET>` si defines
// CRON_SECRET. Si está definido, se exige; si no, se registra y se permite.
import { createClient } from "@supabase/supabase-js";
import { plantillaOro, enviarCorreo, SITIO_URL } from "./_lib/correo.js";

const DEST_DEFAULT = "mighuer427@gmail.com";
const fmt = (n) => "$" + Number(n || 0).toLocaleString("es-MX");
const fecha = (iso) => (iso ? new Date(iso + "T00:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "long" }) : "");

export default async function handler(req, res) {
  // Verificación del secreto del cron (si está configurado).
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.authorization || "";
    if (auth !== `Bearer ${secret}`) {
      res.status(401).json({ error: "No autorizado" });
      return;
    }
  }

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !serviceRole) {
    res.status(500).json({ error: "Servidor sin configuración de Supabase" });
    return;
  }
  const admin = createClient(url, serviceRole, { db: { schema: "jardines" }, auth: { persistSession: false } });

  const hoy = new Date();
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
    if (proximos.length || saldos.length || estancadas.length || paraResena.length) {
      const bloque = (titulo, items) => items.length
        ? `<p style="margin:16px 0 6px 0;color:#E6C870;font-weight:bold;font-size:13px;">${titulo}</p>` +
          items.map((t) => `<p style="margin:0 0 4px 0;">• ${t}</p>`).join("")
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
      try {
        await enviarCorreo({ to: process.env.MAIL_TO || DEST_DEFAULT, subject: "☀️ Tu resumen del día — Jardines Club Hípico", html, texto: "Revisa tu panel para el resumen del día." });
        digestEnviado = true;
      } catch (e) { console.error("[cron] digest:", e.message); }
    }

    // 2) Re-invitación de reseña al cliente + notificación al dashboard
    let resenasInvitadas = 0;
    for (const e of paraResena) {
      if (e.cliente_email) {
        try {
          const html = plantillaOro({
            pretitulo: "¿Cómo estuvo tu evento?",
            titulo: "Nos encantaría saber de ti",
            cuerpoHtml: `<p style="margin:0 0 14px 0;">${(e.cliente_nombre || "Hola").split(/\s+/)[0]}, esperamos que <strong style="color:#E6C870;">${e.nombre_evento}</strong> haya sido inolvidable.</p>
              <p style="margin:0;">Tu opinión significa el mundo para nosotros. ¿Nos regalas un minuto para contarnos cómo te fue?</p>`,
            ctaTexto: "Dejar mi reseña",
            ctaUrl: `${SITIO_URL}/portal`,
            notaPie: "Si ya la dejaste, ¡gracias! Ignora este correo.",
          });
          await enviarCorreo({ to: e.cliente_email, subject: `⭐ ¿Cómo estuvo ${e.nombre_evento}? — Jardines Club Hípico`, html, texto: `Cuéntanos cómo estuvo tu evento en ${SITIO_URL}/portal` });
          resenasInvitadas++;
        } catch (err) { console.error("[cron] resena mail:", err.message); }
      }
      // Marcar como recordado (idempotencia) + notificar al dashboard
      await admin.from("eventos").update({ resena_recordada: true }).eq("id", e.id);
      await admin.from("notificaciones").insert({ evento_id: e.id, tipo: "recordatorio", titulo: `⭐ Le pedimos su reseña a ${e.nombre_evento}` }).then(() => {}, () => {});
    }

    res.status(200).json({ ok: true, digestEnviado, resenasInvitadas, proximos: proximos.length, saldos: saldos.length, estancadas: estancadas.length });
  } catch (e) {
    console.error("[cron] Error:", e.message);
    res.status(500).json({ error: "Error del cron" });
  }
}
