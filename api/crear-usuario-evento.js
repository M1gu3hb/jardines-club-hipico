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
import { validarCredenciales } from "./_lib/reglas-credenciales.js";
import { plantillaOro, enviarCorreo, SITIO_URL } from "./_lib/correo.js";
import {
  escHtml, clienteAdmin, leerBody, autorizarJardines, rateLimit,
  idemIniciar, idemCerrar, auditar, generico, rpcSeguro, compensarAlta,
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

  // Validación estricta de formato y longitud. Las reglas viven en `_lib/reglas-credenciales.js`
  // y las importa TAMBIÉN el formulario del panel: duplicarlas aquí es exactamente lo que hizo
  // que divergieran (cliente ≥6, servidor ≥8) y que el dueño creara cuatro eventos creyendo
  // que fallaba.
  //
  // El 400 dice QUÉ campo está mal. Antes los dos casos eran el mismo `generico(res, 400)`
  // opaco. No se filtra nada sensible: quien llega aquí es un admin autenticado escribiendo
  // su propio formulario.
  if (!eventoId || !/^[0-9a-f-]{36}$/i.test(String(eventoId))) {
    return res.status(400).json({ error: "Falta el evento o su identificador no es válido.", campo: "eventoId" });
  }
  const v = validarCredenciales({ usuario, password, nombre });
  if (!v.ok) return res.status(400).json({ error: v.mensaje, campo: v.campo });

  if (!(await rateLimit(admin, "crear-usuario-evento", aut.user.id, 20, 3600))) {
    await auditar(admin, "crear_usuario_evento", "denegado", { detalle: { motivo: "rate_limit" } });
    return generico(res, 429);
  }

  const claveIdem = `${eventoId}:${String(usuario).toLowerCase()}`;
  const idem = await idemIniciar(admin, "crear-usuario-evento", claveIdem, 120, 1);
  // `en_curso` responde 429 (y NO 200 como en las rutas de correo): un alta en
  // vuelo todavía puede fallar y compensarse, así que el cliente debe reintentar,
  // no dar por hecho que ya existe. Ver docs/DECISIONS.md D-COD-7.
  if (idem === "en_curso") return generico(res, 429);
  // Corta en "duplicado": el alta ya ocurrió (`api_idem_iniciar` solo devuelve
  // `duplicado` con estado='completado'), y repetirla abre una ventana de
  // aprovisionamiento innecesaria.
  //
  // Devuelve la MISMA FORMA que el camino de éxito. Si aquí solo se respondiera
  // `{ok, duplicado}`, el panel escribiría `usuario: undefined` en el estado del
  // evento y volvería a mostrar "este evento aún no tiene credenciales" para uno
  // que sí las tiene. La identidad se relee de la fila, que es la fuente canónica.
  if (idem === "duplicado") {
    const { data: ev, error: errEv } = await admin
      .from("eventos").select("usuario, auth_user_id").eq("id", eventoId).maybeSingle();
    if (errEv || !ev) {
      console.error("[crear-usuario-evento] duplicado sin fila legible:", errEv?.message);
      return generico(res, 500);
    }
    return res.status(200).json({
      ok: true, duplicado: true, userId: ev.auth_user_id, usuario: ev.usuario,
    });
  }
  if (idem !== "procede") return generico(res, 500);

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
      const msg = createErr.message || "";
      // Token corto de máquina (`weak_password`, `email_exists`, `unexpected_failure`…). No
      // lleva datos de nadie, así que se puede auditar tal cual.
      const codigo = String(createErr.code || "");
      const duplicado = /already been registered|already exists/i.test(msg);
      // EL TERCER VALIDADOR. `validarCredenciales` la comparten cliente y servidor, pero GoTrue
      // tiene su PROPIA política de contraseñas —longitud mínima, caracteres exigidos, rechazo
      // de contraseñas filtradas—, y es configuración GLOBAL del proyecto de Supabase: la
      // comparte Vero y puede cambiar sin que este código se entere. Si rechaza, decirlo con
      // un "No se pudo crear el usuario" opaco es exactamente la forma del bug original, un
      // piso más abajo: el formulario acepta y el alta muere sin explicar por qué.
      //
      // PERO LA CAUSA NO SE AFIRMA DESDE UNA PALABRA SUELTA (G4). La versión anterior era
      // `/password|weak|pwned|leaked|caracteres/i`: cualquier error de Auth que mencionara
      // "password" por el motivo que fuera —una configuración rota, un fallo interno del
      // servicio, un mensaje nuevo de una versión futura de GoTrue— salía clasificado como
      // "tu contraseña es débil", y al dueño se le mandaba a probar con una más larga mientras
      // la causa real seguía intacta. Es el mismo error que este bloque persigue: afirmarle
      // algo al dueño sin haberlo comprobado. Y `caracteres` no casaba nunca: GoTrue responde
      // en inglés.
      //
      // Ahora se clasifica por el CÓDIGO de error, que es lo que GoTrue emite para esto, y si
      // no hay código, por frases completas de su política — nunca por una palabra suelta.
      const FRASES_POLITICA = [
        /password should be at least/i,
        /password should contain/i,
        /password is known to be weak/i,
        /password .*(pwned|leaked|data breach)/i,
      ];
      const debil = codigo === "weak_password" || FRASES_POLITICA.some((re) => re.test(msg));
      await auditar(admin, "crear_usuario_evento", "denegado", {
        // El código va SIEMPRE, clasifique o no. Es lo que queda para averiguar por qué falló
        // un alta que aquí solo se puede responder como "no se pudo": sin él, al estrechar la
        // clasificación la causa se perdería del todo.
        detalle: {
          motivo: duplicado ? "usuario_duplicado" : debil ? "password_rechazada_por_auth" : "alta_fallida",
          codigo: codigo || "(sin código)",
        },
      });
      if (duplicado) {
        res.status(409).json({ error: "Ese usuario ya existe", campo: "usuario" });
      } else if (debil) {
        res.status(400).json({
          error: "La política de contraseñas del proyecto rechazó esta contraseña. " +
                 "Prueba con una más larga y que mezcle letras, números y símbolos.",
          campo: "password",
        });
      } else {
        res.status(409).json({ error: "No se pudo crear el usuario" });
      }
      return;
    }

    nuevoId = created.user.id;

    // 3) Fijar el rol por la vía administrativa protegida (queda auditado).
    //    `asignar_rol` solo la puede ejecutar service_role, nunca el navegador.
    const rRol = await rpcSeguro(admin, "asignar_rol", {
      p_user_id: nuevoId, p_rol: "cliente", p_nombre: nombre || usuario,
    });
    if (!rRol.ok) {
      // Compensación COMPROBADA: si el borrado falla, queda un usuario Auth
      // huérfano con credenciales válidas y eso se audita como incidente.
      await compensarAlta(admin, { userId: nuevoId, accion: "crear_usuario_evento" });
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
      await compensarAlta(admin, { userId: nuevoId, accion: "crear_usuario_evento" });
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

    const cerrado = await idemCerrar(admin, "crear-usuario-evento", claveIdem, true);
    await auditar(admin, "crear_usuario_evento", cerrado ? "ok" : "error", {
      entidad: "eventos", entidadId: eventoId, eventoId,
      detalle: { correoEnviado, incidente: cerrado ? undefined : "idem_no_cerrada" },
    });
    res.status(200).json({ ok: true, userId: nuevoId, usuario: limpio, correoEnviado });
  } catch (e) {
    console.error("[crear-usuario-evento] Error:", e.message);
    await compensarAlta(admin, { userId: nuevoId, accion: "crear_usuario_evento" });
    await idemCerrar(admin, "crear-usuario-evento", claveIdem, false);
    await auditar(admin, "crear_usuario_evento", "error", { detalle: { paso: "inesperado" } });
    generico(res, 500);
  }
}
