// api/crear-usuario-evento.js — Función serverless (Vercel).
//
// Crea el usuario de Auth de un CLIENTE (login usuario + contraseña, sin correo real)
// y lo liga a su evento. Requiere la Admin API de Supabase, por eso corre SOLO en el
// servidor con la `service_role` (NUNCA en el front).
//
// Seguridad: solo un admin autenticado puede llamar. Se valida el Bearer token del
// llamador contra `perfiles.rol = 'admin'` antes de crear nada.
//
// Variables de entorno requeridas en Vercel:
//   SUPABASE_URL           -> https://<proyecto>.supabase.co
//   SUPABASE_SERVICE_ROLE  -> service_role key (SECRETA; solo en el servidor)
import { plantillaOro, enviarCorreo, SITIO_URL } from "./_lib/correo.js";
import {
  escHtml, clienteAdmin, leerBody, autorizarJardines, rateLimit,
  idemIniciar, idemCerrar, auditar, generico, rpcSeguro,
} from "./_lib/guard.js";

const DOMINIO_CLIENTE = "portal.jardines.local";

function usuarioAEmail(usuario) {
  const limpio = String(usuario || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9._-]/g, "");
  return { limpio, email: `${limpio}@${DOMINIO_CLIENTE}` };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return generico(res, 405);

  const admin = clienteAdmin();
  if (!admin) {
    console.error("[crear-usuario-evento] Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE");
    return generico(res, 500);
  }

  // Autorización real: admin de Jardines. Un usuario de Vero recibe 403.
  const aut = await autorizarJardines(req, admin, { rol: "admin" });
  if (!aut.ok) {
    await auditar(admin, "crear_usuario_evento", "denegado", { detalle: { motivo: `http_${aut.status}` } });
    return generico(res, aut.status);
  }

  const lectura = leerBody(req, 8 * 1024);
  if (!lectura.ok) return generico(res, lectura.status);
  const { usuario, password, eventoId, nombre } = lectura.body;

  // Validación estricta de formato y longitud.
  if (!usuario || !password || !eventoId) return generico(res, 400);
  if (String(usuario).length > 60 || !/^[a-zA-Z0-9._-]{3,60}$/.test(String(usuario))) return generico(res, 400);
  if (String(password).length < 8 || String(password).length > 200) return generico(res, 400);
  if (nombre && String(nombre).length > 120) return generico(res, 400);
  if (!/^[0-9a-f-]{36}$/i.test(String(eventoId))) return generico(res, 400);

  if (!(await rateLimit(admin, "crear-usuario-evento", aut.user.id, 20, 3600))) {
    await auditar(admin, "crear_usuario_evento", "denegado", { detalle: { motivo: "rate_limit" } });
    return generico(res, 429);
  }

  const claveIdem = `${eventoId}:${String(usuario).toLowerCase()}`;
  const idem = await idemIniciar(admin, "crear-usuario-evento", claveIdem, 120, 1);
  if (idem === "en_curso") return generico(res, 429);
  if (idem !== "procede" && idem !== "duplicado") return generico(res, 500);

  let nuevoId = null;
  try {

    // 2) Crear el usuario de Auth del cliente (email sintético, ya confirmado).
    const { limpio, email } = usuarioAEmail(usuario);
    if (!limpio) return generico(res, 400);
    // `app_metadata` solo lo puede escribir la Admin API (service_role): es la señal
    // server-side que marca al usuario como de Jardines. El rol NO viaja en
    // `user_metadata`, que el propio usuario puede modificar después.
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { app: "jardines" },
      user_metadata: { nombre: nombre || usuario, usuario: limpio },
    });
    if (createErr) {
      await idemCerrar(admin, "crear-usuario-evento", claveIdem, false);
      const duplicado = /already been registered|already exists/i.test(createErr.message || "");
      await auditar(admin, "crear_usuario_evento", "denegado",
        { detalle: { motivo: duplicado ? "usuario_duplicado" : "alta_fallida" } });
      // Genérico salvo el caso de duplicado, que el admin necesita distinguir.
      res.status(409).json({ error: duplicado ? "Ese usuario ya existe" : "No se pudo crear el usuario" });
      return;
    }

    nuevoId = created.user.id;

    // 3) Fijar el rol por la vía administrativa protegida (queda auditado).
    //    `asignar_rol` solo la puede ejecutar service_role, nunca el navegador.
    const rRol = await rpcSeguro(admin, "asignar_rol", {
      p_user_id: nuevoId, p_rol: "cliente", p_nombre: nombre || usuario,
    });
    if (!rRol.ok) {
      await admin.auth.admin.deleteUser(nuevoId).catch(() => {});
      await idemCerrar(admin, "crear-usuario-evento", claveIdem, false);
      await auditar(admin, "crear_usuario_evento", "error", { detalle: { paso: "asignar_rol" } });
      return generico(res, 500);
    }

    // 4) Ligar el evento. Se comprueba que afectó EXACTAMENTE al evento esperado:
    //    con .update().eq() sin select, cero filas (evento inexistente) pasaba
    //    como éxito y dejaba un usuario huérfano con credenciales válidas.
    const { data: ligado, error: linkErr } = await admin
      .from("eventos")
      .update({ auth_user_id: nuevoId, usuario: limpio })
      .eq("id", eventoId)
      .select("id")
      .maybeSingle();
    if (linkErr || !ligado || ligado.id !== eventoId) {
      await admin.auth.admin.deleteUser(nuevoId).catch(() => {});
      await idemCerrar(admin, "crear-usuario-evento", claveIdem, false);
      await auditar(admin, "crear_usuario_evento", "error", {
        entidad: "eventos", entidadId: eventoId,
        detalle: { paso: "ligar_evento", motivo: linkErr ? "error" : "cero_filas" },
      });
      return generico(res, 400);
    }

    // 5) Correo de bienvenida al cliente con sus credenciales + link de auto-entrada.
    //    El link lleva usuario:contraseña en el FRAGMENTO (#) en base64: el fragmento
    //    nunca viaja al servidor ni queda en logs; el portal lo lee, entra solo y lo borra.
    let correoEnviado = false;
    try {
      const { data: ev } = await admin
        .from("eventos")
        .select("nombre_evento, cliente_nombre, cliente_email, tipo_evento")
        .eq("id", eventoId)
        .maybeSingle();
      if (ev?.cliente_email) {
        // Enlace de un solo uso, con caducidad, guardado solo como hash. Antes
        // aquí viajaba base64(usuario:contraseña), que es reversible: quien viera
        // el correo o el historial se quedaba con la credencial permanente.
        const { data: tokenAcceso, error: taErr } = await admin.rpc("crear_acceso_unico", {
          p_user_id: nuevoId, p_proposito: "primer_acceso_cliente", p_horas: 72,
        });
        if (taErr || !tokenAcceso) throw new Error("no se pudo emitir el acceso");
        const linkMagico = `${SITIO_URL}/portal#entrar=${encodeURIComponent(tokenAcceso)}`;
        const nombreCliente = (ev.cliente_nombre || nombre || "").split(/\s+/)[0] || "Hola";
        const html = plantillaOro({
          pretitulo: "Tu portal está listo",
          titulo: ev.nombre_evento || "Tu evento",
          cuerpoHtml: `
            <p style="margin:0 0 14px 0;">${escHtml(nombreCliente)}, ¡bienvenido a la familia de Jardines Club Hípico! 🎉</p>
            <p style="margin:0 0 6px 0;">Creamos tu <strong style="color:#E6C870;">portal exclusivo</strong> para que armes cada detalle de tu evento:
            cronograma, música, mesas, tus documentos y una lista de deseos con ideas para inspirarte.</p>
            <p style="margin:0 0 6px 0;">Tu usuario es <strong style="color:#E6C870;">${escHtml(limpio)}</strong>. Con el botón de abajo entras directo, sin escribir nada.</p>
            <p style="margin:0;">El enlace sirve una sola vez y caduca en 3 días. Si se te vence, pídenos otro.</p>`,
          ctaTexto: "Entrar a mi portal",
          ctaUrl: linkMagico,
          notaPie: "Si no esperabas este correo, ignóralo con confianza.",
        });
        await enviarCorreo({
          to: ev.cliente_email,
          subject: `✨ Tu portal de "${ev.nombre_evento}" está listo — Jardines Club Hípico`,
          html,
          // Sin contraseña en el cuerpo: el correo no es un lugar seguro para una credencial.
          texto: `Tu portal está listo. Usuario: ${limpio}. Entra con este enlace de un solo uso: ${linkMagico}`,
        });
        correoEnviado = true;
      }
    } catch (e) {
      // El correo es cortesía: si falla, las credenciales YA existen y se muestran en el panel.
      console.error("[crear-usuario-evento] correo bienvenida:", e.message);
    }

    await idemCerrar(admin, "crear-usuario-evento", claveIdem, true);
    await auditar(admin, "crear_usuario_evento", "ok", {
      entidad: "eventos", entidadId: eventoId, eventoId, detalle: { correoEnviado },
    });
    res.status(200).json({ ok: true, userId: nuevoId, usuario: limpio, correoEnviado });
  } catch (e) {
    console.error("[crear-usuario-evento] Error:", e.message);
    if (nuevoId) await admin.auth.admin.deleteUser(nuevoId).catch(() => {});
    await idemCerrar(admin, "crear-usuario-evento", claveIdem, false);
    await auditar(admin, "crear_usuario_evento", "error", { detalle: { paso: "inesperado" } });
    generico(res, 500);
  }
}
