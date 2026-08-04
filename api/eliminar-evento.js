// api/eliminar-evento.js — Función serverless (Vercel).
//
// Borra un evento COMPLETO: sus filas, sus archivos del bucket privado y el usuario de Auth
// del cliente. Es la única operación irreversible del panel, así que el orden de los pasos
// está elegido a conciencia y no se puede reordenar sin releer esto.
//
// POR QUÉ HACE FALTA UN ENDPOINT
//   El admin puede borrar la fila de `eventos` desde el navegador (RLS se lo permite), pero
//   NO puede borrar un usuario de Auth: eso exige la Admin API con `service_role`. Repartir
//   el borrado entre navegador y servidor dejaría estados a medias imposibles de auditar, así
//   que todo ocurre aquí, en un solo sitio, con una sola traza.
//
// EL ORDEN, Y POR QUÉ ES ESTE
//   1. STORAGE PRIMERO. Los paths de los archivos viven en `documentos.archivo_url`, y esa
//      tabla cae por CASCADE al borrar el evento. Si se borrara la fila antes, los paths
//      desaparecerían y los archivos quedarían en el bucket **para siempre y sin asa**: nadie
//      sabría qué borrar. Por eso el bucket va primero, y si falla NO se sigue.
//   2. LAS HUÉRFANAS. `notificaciones` y `operativo_ubicaciones` tienen la FK en SET NULL, así
//      que sobrevivirían al borrado con `evento_id = NULL`. Se borran a mano ANTES, mientras
//      todavía se las puede localizar por `evento_id`.
//      `resenas` también es SET NULL y **se conserva a propósito**: es prueba social del salón,
//      no del registro administrativo. La pantalla avisa de que seguirá publicada.
//   3. LA FILA DEL EVENTO, y se confirma releyendo que se fue.
//   4. EL USUARIO DE AUTH, al final. Si fallara aquí, queda una cuenta que puede entrar pero
//      no ve ningún evento — molesto y recuperable desde la auditoría, que guarda su id. Al
//      revés (Auth primero) un fallo posterior dejaría al cliente sin acceso a un evento que
//      SÍ sigue existiendo, que es peor.
//
// CRITERIO 5A: sin confirmación negativa no se borra el siguiente eslabón. Y `storage.remove`
// responde 200 con lista vacía cuando una policy deniega, así que "no dio error" no es
// "borró": se compara lo pedido con lo devuelto.
import {
  clienteAdmin, leerBody, autorizarJardines, rateLimit,
  idemIniciar, idemCerrar, auditar, generico, borrarUsuario,
} from "./_lib/guard.js";

const BUCKET = "clientes";

/**
 * Cuenta lo que se va a llevar el borrado. Se le enseña al dueño ANTES de confirmar y se
 * guarda en la auditoría: si algo sale mal, queda constancia de qué había.
 *
 * OJO con `invitados`: **no tiene `evento_id`** (columnas: id, mesa_id, nombre, notas,
 * created_at). Contarlos con `.eq("evento_id", …)` daría `42703` — el mismo fallo que tuvo
 * `correo-cliente` durante meses — y el inventario mostraría 0 justo antes de borrar. Se
 * cuentan uniendo por `mesas`.
 */
async function inventario(admin, eventoId) {
  const cuenta = async (tabla) => {
    const { count, error } = await admin
      .from(tabla).select("*", { count: "exact", head: true }).eq("evento_id", eventoId);
    if (error) throw new Error(`inventario ${tabla}: ${error.message}`);
    return count || 0;
  };

  const [documentos, mesas, rsvps, invitaciones, notificaciones, resenas, ubicaciones,
         cronograma, musica, items] = await Promise.all([
    cuenta("documentos"), cuenta("mesas"), cuenta("rsvps"), cuenta("invitaciones"),
    cuenta("notificaciones"), cuenta("resenas"), cuenta("operativo_ubicaciones"),
    cuenta("cronograma"), cuenta("musica"), cuenta("items_contratados"),
  ]);

  // Invitados: vía `mesas`, porque la tabla no tiene `evento_id`.
  let invitados = 0;
  if (mesas > 0) {
    const { data: filas, error } = await admin.from("mesas").select("id").eq("evento_id", eventoId);
    if (error) throw new Error(`inventario mesas: ${error.message}`);
    const ids = (filas || []).map((m) => m.id);
    if (ids.length) {
      const { count, error: e2 } = await admin
        .from("invitados").select("*", { count: "exact", head: true }).in("mesa_id", ids);
      if (e2) throw new Error(`inventario invitados: ${e2.message}`);
      invitados = count || 0;
    }
  }

  return { documentos, mesas, invitados, rsvps, invitaciones, notificaciones, resenas,
           ubicaciones, cronograma, musica, items };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return generico(res, 405);

  const admin = clienteAdmin();
  if (!admin) {
    console.error("[eliminar-evento] Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE");
    return generico(res, 500);
  }

  const aut = await autorizarJardines(req, admin, { rol: "admin" });
  if (!aut.ok) {
    await auditar(admin, "eliminar_evento", "denegado", { detalle: { motivo: `http_${aut.status}` } });
    return generico(res, aut.status);
  }

  const lectura = leerBody(req, 4 * 1024);
  if (!lectura.ok) return generico(res, lectura.status);
  const { eventoId, confirmacion, soloInventario } = lectura.body;

  if (!eventoId || !/^[0-9a-f-]{36}$/i.test(String(eventoId))) {
    return res.status(400).json({ error: "Falta el evento o su identificador no es válido." });
  }

  // La fila canónica. El nombre para confirmar sale de AQUÍ, nunca del navegador.
  const { data: ev, error: errEv } = await admin
    .from("eventos").select("id, nombre_evento, usuario, auth_user_id, created_at")
    .eq("id", eventoId).maybeSingle();
  if (errEv) {
    console.error("[eliminar-evento] no se pudo leer el evento:", errEv.message);
    return generico(res, 500);
  }
  if (!ev) return res.status(404).json({ error: "Ese evento ya no existe." });

  // Modo consulta: devuelve el inventario para enseñárselo al dueño. No borra nada.
  let inv;
  try {
    inv = await inventario(admin, eventoId);
  } catch (e) {
    console.error("[eliminar-evento] inventario:", e.message);
    return generico(res, 500);
  }
  if (soloInventario) {
    // HOMÓNIMOS. La confirmación es "escribe el nombre exacto", y ese nombre NO identifica la
    // fila: en producción hay cuatro eventos llamados «Boda ortega» creados con 24 segundos de
    // diferencia, con el MISMO cliente, la MISMA fecha, el MISMO salón y el MISMO creador — en
    // la lista del panel se pintan idénticos. Tres son basura de un doble clic y el cuarto es
    // el bueno, el único con cuenta de portal. Sin un discriminante, escribir el nombre correcto
    // no impide borrar el evento equivocado: la confirmación pasaría igual.
    // Se devuelven la hora de alta y cuántos comparten nombre para que la pantalla pueda decir
    // CUÁL de ellos se está borrando.
    const { count: homonimos, error: errHom } = await admin
      .from("eventos").select("*", { count: "exact", head: true })
      .eq("nombre_evento", ev.nombre_evento).neq("id", eventoId);
    if (errHom) {
      console.error("[eliminar-evento] homonimos:", errHom.message);
      return generico(res, 500);
    }
    return res.status(200).json({
      ok: true, nombreEvento: ev.nombre_evento, inventario: inv,
      homonimos: homonimos || 0,
      creadoEl: ev.created_at,
      // La UI NO puede deducirlo de `evento.usuario`: una fila puede tener `usuario` y no
      // tener `auth_user_id` (es justo el estado en que quedaron los tres duplicados de
      // "Boda ortega"), y entonces prometería borrar una cuenta que no existe.
      cuentaCliente: ev.auth_user_id ? ev.usuario : null,
    });
  }

  // Confirmación por NOMBRE EXACTO. Se compara contra la fila, no contra lo que el navegador
  // diga que se llama el evento.
  if (String(confirmacion || "").trim() !== String(ev.nombre_evento || "").trim()) {
    await auditar(admin, "eliminar_evento", "denegado", {
      entidad: "eventos", entidadId: eventoId, eventoId,
      detalle: { motivo: "confirmacion_no_coincide" },
    });
    return res.status(400).json({ error: "El nombre no coincide con el del evento." });
  }

  if (!(await rateLimit(admin, "eliminar-evento", aut.user.id, 10, 3600))) {
    await auditar(admin, "eliminar_evento", "denegado", { detalle: { motivo: "rate_limit" } });
    return generico(res, 429);
  }

  const idem = await idemIniciar(admin, "eliminar-evento", eventoId, 120, 1);
  if (idem === "en_curso") return generico(res, 429);
  if (idem === "duplicado") return res.status(200).json({ ok: true, duplicado: true });
  if (idem !== "procede") return generico(res, 500);

  // Lo que se fue de verdad, para poder decir exactamente qué quedó si algo falla a mitad.
  const hecho = { archivos: 0, archivosPedidos: 0, notificaciones: 0, ubicaciones: 0, fila: false, usuarioAuth: null };

  try {
    // ---- 1) STORAGE. Antes que nada: los paths mueren con la fila.
    const TOPE_LISTADO = 1000;
    const { data: objetos, error: errList } = await admin.storage.from(BUCKET).list(eventoId, { limit: TOPE_LISTADO });
    if (errList) {
      await idemCerrar(admin, "eliminar-evento", eventoId, false);
      await auditar(admin, "eliminar_evento", "error", {
        entidad: "eventos", entidadId: eventoId, eventoId,
        detalle: { paso: "listar_archivos", motivo: errList.message, inventario: inv },
      });
      return res.status(500).json({
        error: "No se pudieron listar los archivos del evento. NO se borró nada; reinténtalo.",
        hecho,
      });
    }
    // Si el listado llega al tope, PUEDE haber más y no lo sabemos. Truncar en silencio aquí
    // dejaría archivos en el bucket sin ninguna referencia una vez borrada la fila — el mismo
    // huérfano irrecuperable que este orden de pasos existe para evitar. Se corta.
    if ((objetos || []).length >= TOPE_LISTADO) {
      await idemCerrar(admin, "eliminar-evento", eventoId, false);
      await auditar(admin, "eliminar_evento", "error", {
        entidad: "eventos", entidadId: eventoId, eventoId,
        detalle: { paso: "listar_archivos", motivo: "listado_truncado", tope: TOPE_LISTADO, inventario: inv },
      });
      return res.status(500).json({
        error: `Este evento tiene ${TOPE_LISTADO} archivos o más y no se pueden listar todos de una vez. ` +
               `NO se borró nada. Avisa a soporte para hacerlo por lotes.`,
        hecho,
      });
    }
    const rutas = (objetos || []).filter((o) => o.name).map((o) => `${eventoId}/${o.name}`);
    hecho.archivosPedidos = rutas.length;
    if (rutas.length) {
      const { data: borrados, error: errDel } = await admin.storage.from(BUCKET).remove(rutas);
      // 200 con lista vacía = la policy denegó. "Sin error" no es "borró".
      const n = Array.isArray(borrados) ? borrados.length : 0;
      hecho.archivos = n;
      if (errDel || n < rutas.length) {
        await idemCerrar(admin, "eliminar-evento", eventoId, false);
        await auditar(admin, "eliminar_evento", "error", {
          entidad: "eventos", entidadId: eventoId, eventoId,
          detalle: { paso: "borrar_archivos", pedidos: rutas.length, borrados: n, inventario: inv },
        });
        return res.status(500).json({
          error: `Se borraron ${n} de ${rutas.length} archivos. NO se borró el evento, para no perder ` +
                 `la referencia de los que quedan. Reinténtalo; si sigue fallando, avisa a soporte.`,
          hecho,
        });
      }
    }

    // ---- 2) LAS HUÉRFANAS, mientras se las puede localizar por evento_id.
    // Se cuenta lo REALMENTE borrado con `.select("id")` y se compara con el inventario: si
    // sobreviven, quedarían con `evento_id = NULL` y aparecerían en el panel como un bloque
    // sin dueño. Comprobar solo `error` no distingue "no había" de "no borró".
    const { data: notifsBorradas, error: errNotif } = await admin
      .from("notificaciones").delete().eq("evento_id", eventoId).select("id");
    if (errNotif) throw Object.assign(new Error(errNotif.message), { paso: "notificaciones" });
    hecho.notificaciones = (notifsBorradas || []).length;
    if (hecho.notificaciones !== inv.notificaciones) {
      throw Object.assign(
        new Error(`se esperaban ${inv.notificaciones} avisos y se borraron ${hecho.notificaciones}`),
        { paso: "notificaciones" });
    }

    // `operativo_ubicaciones` tiene PK compuesta (personal_id, evento_id) y NO tiene `id`:
    // se borra por `evento_id` y se confirma con `personal_id`, no con `id`.
    const { data: ubicBorradas, error: errUbic } = await admin
      .from("operativo_ubicaciones").delete().eq("evento_id", eventoId).select("personal_id");
    if (errUbic) throw Object.assign(new Error(errUbic.message), { paso: "ubicaciones" });
    hecho.ubicaciones = (ubicBorradas || []).length;

    // ---- 3) LA FILA. Arrastra 11 tablas por CASCADE (+ invitados y accesos en segundo nivel).
    const { error: errFila } = await admin.from("eventos").delete().eq("id", eventoId);
    if (errFila) throw Object.assign(new Error(errFila.message), { paso: "fila" });

    // Confirmar releyendo: un delete que no afectó filas no da error.
    const { data: sigue, error: errRe } = await admin
      .from("eventos").select("id").eq("id", eventoId).maybeSingle();
    if (errRe) throw Object.assign(new Error(errRe.message), { paso: "confirmar" });
    if (sigue) throw Object.assign(new Error("la fila sigue existiendo"), { paso: "confirmar" });
    hecho.fila = true;

    // ---- 4) EL USUARIO DE AUTH, al final y a propósito.
    if (ev.auth_user_id) {
      const ok = await borrarUsuario(admin, ev.auth_user_id);
      hecho.usuarioAuth = ok;
      if (!ok) {
        await idemCerrar(admin, "eliminar-evento", eventoId, true);
        await auditar(admin, "eliminar_evento", "error", {
          entidad: "eventos", entidadId: eventoId,
          detalle: { paso: "usuario_auth", incidente: "usuario_huerfano",
                     authUserId: ev.auth_user_id, usuario: ev.usuario, inventario: inv, hecho },
        });
        return res.status(200).json({
          ok: true, parcial: true, hecho,
          aviso: `El evento y sus datos se borraron, pero NO se pudo borrar el usuario «${ev.usuario}». ` +
                 `Esa cuenta ya no verá ningún evento, pero sigue existiendo. Avisa a soporte con este nombre.`,
        });
      }
    }

    const cerrado = await idemCerrar(admin, "eliminar-evento", eventoId, true);
    await auditar(admin, "eliminar_evento", cerrado ? "ok" : "error", {
      entidad: "eventos", entidadId: eventoId,
      detalle: { nombreEvento: ev.nombre_evento, usuario: ev.usuario, inventario: inv, hecho,
                 ...(cerrado ? {} : { incidente: "idem_no_cerrada" }) },
    });
    return res.status(200).json({ ok: true, hecho, inventario: inv });
  } catch (e) {
    const paso = e?.paso || "desconocido";
    console.error("[eliminar-evento] fallo en", paso, e?.message);
    await idemCerrar(admin, "eliminar-evento", eventoId, false);
    await auditar(admin, "eliminar_evento", "error", {
      entidad: "eventos", entidadId: eventoId, eventoId,
      detalle: { paso, motivo: e?.message, inventario: inv, hecho },
    });
    // Se dice EXACTAMENTE qué quedó hecho. Un "no se pudo" a secas, tras haber borrado los
    // archivos, dejaría al dueño sin saber si tiene que volver a intentarlo.
    return res.status(500).json({
      error: `El borrado se interrumpió en «${paso}». Archivos borrados: ${hecho.archivos}/${hecho.archivosPedidos}. ` +
             `Avisos borrados: ${hecho.notificaciones}. Evento: ${hecho.fila ? "borrado" : "NO borrado"}. ` +
             `Vuelve a intentarlo: el borrado se puede reanudar.`,
      hecho,
    });
  }
}
