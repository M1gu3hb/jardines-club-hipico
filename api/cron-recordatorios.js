// api/cron-recordatorios.js — Vercel Cron (una vez al día, ver vercel.json).
//
// El asistente que no duerme:
//  - LIMPIEZA: borra la actividad del portal con más de 7 días (se borra, no se
//    archiva) y reporta cuántas se fueron en el digest.
//  - Correo DIGEST al dueño: solicitudes de las últimas 24 h, solicitudes que se
//    enfrían, próximos 7 días, saldos pendientes, y eventos ya realizados sin
//    reseña. Cada bloque dice QUÉ HACER, no solo el número.
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
import { plantillaOro, enviarCorreo, URL_PORTAL, URL_CRM } from "./_lib/correo.js";
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
  // EL DÍA, EN LA ZONA DEL SALÓN — no en la del servidor.
  //
  // Esto corre en Vercel, que va en UTC, y compara contra `eventos.fecha_evento`, que es una
  // columna `date`: un día natural del calendario de Xochimilco, no un instante. Con
  // `toISOString()` el corte del día caía a las 18:00 hora local (CDMX es UTC-6), así que el aviso
  // de «tu evento es en 7 días» se mandaba con la ventana corrida: una ejecución de la tarde ya
  // contaba desde mañana. El recordatorio de reseña, igual, un día antes de tiempo.
  //
  // `America/Mexico_City` ya no cambia de horario de verano (desde 2022), pero se resuelve con
  // `Intl` de todas formas: si algún día vuelve, esto sigue dando el día correcto sin tocar nada.
  const ZONA_SALON = "America/Mexico_City";
  const fmtDia = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_SALON, year: "numeric", month: "2-digit", day: "2-digit",
  }); // "en-CA" produce exactamente "YYYY-MM-DD"
  const iso = (d) => fmtDia.format(d);
  const claveDia = iso(hoy);
  const hoyStr = claveDia;
  const en7 = iso(new Date(hoy.getTime() + 7 * 86400000));
  const hace2 = iso(new Date(hoy.getTime() - 2 * 86400000));
  const hace10 = iso(new Date(hoy.getTime() - 10 * 86400000));
  const hace3dias = new Date(hoy.getTime() - 3 * 86400000).toISOString();
  const hace24h = new Date(hoy.getTime() - 86400000).toISOString();

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
    // Solicitudes NUEVAS de las últimas 24 h: trabajo que ENTRÓ.
    // Es distinto de "estancadas" y por eso va en su propio bloque: una pide atención hoy,
    // la otra lleva días enfriándose. Mezclarlas hacía que el dueño solo viera la segunda.
    const recientes = (solicitudes || []).filter((s) => s.created_at >= hace24h);
    // Solicitudes estancadas (Nueva > 3 días): trabajo que se está ENFRIANDO.
    const estancadas = (solicitudes || []).filter((s) => (s.estatus || "Nueva") === "Nueva" && s.created_at < hace3dias);
    // Eventos pasados (2–10 días) sin reseña y sin recordar
    const paraResena = evs.filter((e) => e.fecha_evento && e.fecha_evento >= hace10 && e.fecha_evento <= hace2
      && !conResena.has(e.id) && !e.resena_recordada);

    const incidentes = [];

    // 0) LIMPIEZA: la actividad del portal se BORRA a los 7 días, no se archiva (decisión
    //    del dueño). Va antes del digest para poder reportar cuántas se fueron: si la
    //    limpieza deja de correr, el dueño lo ve en su correo en vez de enterarse cuando la
    //    tabla ya está saturada.
    //
    //    `service_role` salta RLS, así que aquí no hay riesgo de un borrado mudo por policy;
    //    aun así se cuenta lo realmente borrado con `select("id")`, no se supone.
    let notifsBorradas = 0;
    {
      const corte = new Date(hoy.getTime() - 7 * 86400000).toISOString();
      const { data: borradas, error: errLimpieza } = await admin
        .from("notificaciones").delete().lt("created_at", corte).select("id");
      if (errLimpieza) {
        console.error("[cron] limpieza notificaciones:", errLimpieza.message);
        incidentes.push("limpieza_notificaciones_fallo");
        await auditar(admin, "cron_limpieza_notificaciones", "error", {
          entidad: "notificaciones", detalle: { motivo: errLimpieza.message },
        });
      } else {
        notifsBorradas = (borradas || []).length;
        await auditar(admin, "cron_limpieza_notificaciones", "ok", {
          entidad: "notificaciones", detalle: { borradas: notifsBorradas, anterioresA: corte },
        });
      }
    }

    // 1) Digest al dueño (solo si hay algo que reportar)
    let digestEnviado = false;
    let digestOmitido = null;
    if (recientes.length || proximos.length || saldos.length || estancadas.length || paraResena.length) {
      /**
       * Un bloque = título + QUÉ HACER + lista. La instrucción no es adorno: un número suelto
       * ("3 solicitudes sin atender") no dice si hay que llamar, cobrar o esperar, y el dueño
       * abre esto entre eventos.
       */
      const bloque = (titulo, quehacer, items) => items.length
        ? `<p style="margin:18px 0 2px 0;color:#E6C870;font-weight:bold;font-size:13px;">${titulo}</p>` +
          `<p style="margin:0 0 7px 0;color:#8a8a8a;font-size:11px;">${escHtml(quehacer)}</p>` +
          items.map((t) => `<p style="margin:0 0 4px 0;">• ${escHtml(t)}</p>`).join("")
        : "";
      const cuerpo =
        bloque("🆕 Solicitudes de las últimas 24 h",
          "Contéstalas hoy por WhatsApp y muévelas a «En proceso» en el panel.",
          recientes.map((s) => `${s.nombre_completo || "Sin nombre"} — ${s.estatus || "Nueva"}`)) +
        bloque("🥶 Solicitudes que se están enfriando",
          "Llevan más de 3 días en «Nueva». Atiéndelas o márcalas «Descartada» para sacarlas de aquí.",
          estancadas.map((s) => `${s.nombre_completo || "Sin nombre"} (lleva días en "Nueva")`)) +
        bloque("📅 Próximos 7 días",
          "Confirma montaje, personal y horarios con cada cliente.",
          proximos.map((e) => `${e.nombre_evento} — ${fecha(e.fecha_evento)}`)) +
        bloque("💰 Saldos pendientes",
          "Cobra antes del evento: después es mucho más difícil.",
          saldos.map((e) => `${e.nombre_evento}: resta ${fmt(Number(e.monto_total) - Number(e.anticipo_monto || 0))} (${fecha(e.fecha_evento)})`)) +
        bloque("⭐ Eventos sin reseña",
          "Ya les escribimos nosotros. Si conoces bien al cliente, un mensaje tuyo ayuda.",
          paraResena.map((e) => `${e.nombre_evento} — les enviamos recordatorio de reseña`)) ||
        "<p>Todo en orden por hoy. 🎉</p>";
      // Pie de mantenimiento: que la limpieza automática sea VISIBLE. Si algún día deja de
      // correr, el dueño lo nota aquí en vez de descubrirlo con la tabla saturada.
      const pieLimpieza = `<p style="margin:22px 0 0 0;padding-top:12px;border-top:1px solid #26262690;color:#6f6f6f;font-size:11px;">` +
        `🧹 Limpieza automática: se borraron ${notifsBorradas} avisos de actividad con más de 7 días.</p>`;
      const html = plantillaOro({
        pretitulo: "Resumen del día",
        titulo: "Tu agenda de hoy",
        cuerpoHtml: cuerpo + pieLimpieza,
        ctaTexto: "Abrir mi panel",
        ctaUrl: `${URL_CRM}/${process.env.VITE_ADMIN_SLUG || "gestion-jch-9f27ax"}`,
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
            ctaUrl: `${URL_PORTAL}`,
            notaPie: "Si ya la dejaste, ¡gracias! Ignora este correo.",
          });
          await enviarCorreo({ to: e.cliente_email, subject: `⭐ ¿Cómo estuvo ${e.nombre_evento}? — Jardines Club Hípico`, html, texto: `Cuéntanos cómo estuvo tu evento en ${URL_PORTAL}` });
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
      ok: true, digestEnviado, digestOmitido, resenasInvitadas, notifsBorradas,
      proximos: proximos.length, saldos: saldos.length, estancadas: estancadas.length, recientes: recientes.length,
      incidentes,
    });
  } catch (e) {
    console.error("[cron] Error:", e.message);
    res.status(500).json({ error: "Error del cron" });
  }
}
