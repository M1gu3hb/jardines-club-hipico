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

  // Las ONCE que caen por CASCADE desde `eventos`, verificadas contra `pg_constraint`:
  // cronograma, documentos, evento_notas, evento_reglas_mesas, evento_wishlist, invitaciones,
  // items_contratados, mesas, musica, operativo_asignacion, rsvps.
  // Faltaban cuatro (`evento_notas`, `evento_wishlist`, `evento_reglas_mesas`,
  // `operativo_asignacion`) y el caso feo era visible en la misma pantalla: `EventoDatos` pinta
  // la wishlist y las notas del cliente dos secciones más arriba, y el bloque "se va a borrar"
  // no las mencionaba. Un evento que solo tuviera wishlist decía "no tiene datos cargados
  // todavía" y se la llevaba por delante.
  // Las tres de SET NULL (`notificaciones`, `operativo_ubicaciones`, `resenas`) también se
  // cuentan: dos se borran a mano y la reseña se conserva, pero hay que enseñarlas igual.
  const [documentos, mesas, rsvps, invitaciones, notificaciones, resenas, ubicaciones,
         cronograma, musica, items, notas, deseos, reglas, asignaciones] = await Promise.all([
    cuenta("documentos"), cuenta("mesas"), cuenta("rsvps"), cuenta("invitaciones"),
    cuenta("notificaciones"), cuenta("resenas"), cuenta("operativo_ubicaciones"),
    cuenta("cronograma"), cuenta("musica"), cuenta("items_contratados"),
    cuenta("evento_notas"), cuenta("evento_wishlist"), cuenta("evento_reglas_mesas"),
    cuenta("operativo_asignacion"),
  ]);

  // Segundo nivel. Ninguna de las dos tiene `evento_id`:
  //   `invitados.mesa_id`      → CASCADE desde `mesas`
  //   `accesos.invitacion_id`  → CASCADE desde `invitaciones`, y es NOT NULL (verificado), así
  //                              que ningún acceso sobrevive al borrado. `accesos.mesa_id` es
  //                              SET NULL, pero no puede mantener viva la fila por sí solo.
  const idsDe = async (tabla) => {
    const { data, error } = await admin.from(tabla).select("id").eq("evento_id", eventoId);
    if (error) throw new Error(`inventario ${tabla}: ${error.message}`);
    return (data || []).map((f) => f.id);
  };
  const cuentaPorLote = async (tabla, columna, ids) => {
    if (!ids.length) return 0;
    const { count, error } = await admin
      .from(tabla).select("*", { count: "exact", head: true }).in(columna, ids);
    if (error) throw new Error(`inventario ${tabla}: ${error.message}`);
    return count || 0;
  };

  const invitados = mesas > 0
    ? await cuentaPorLote("invitados", "mesa_id", await idsDe("mesas")) : 0;
  const accesos = invitaciones > 0
    ? await cuentaPorLote("accesos", "invitacion_id", await idsDe("invitaciones")) : 0;

  return { documentos, mesas, invitados, rsvps, invitaciones, notificaciones, resenas,
           ubicaciones, cronograma, musica, items, notas, deseos, reglas, asignaciones,
           accesos };
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

  // CUOTA DE CONSULTA, antes de contar nada. El inventario son 16 consultas por petición y el
  // modo `soloInventario` respondía y salía ANTES del rate limit: barra libre para pedirlas.
  // Va aquí arriba, no más abajo, porque lo que se está limitando es justamente el trabajo que
  // viene a continuación.
  if (!(await rateLimit(admin, "eliminar-evento-consulta", aut.user.id, 60, 3600))) {
    await auditar(admin, "eliminar_evento", "denegado", { detalle: { motivo: "rate_limit_consulta" } });
    return generico(res, 429);
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

  // NOMBRE VACÍO = SIN CANDADO. Con `nombre_evento = ""` la comparación de abajo es
  // `"" !== ""` → false → pasa, y en el navegador el botón se habilita con la caja vacía: la
  // confirmación entera deja de existir. Y el nombre se puede vaciar — `AdminEventos` lo exige
  // al crear, pero la ficha lo guardaba sin validar. Se corta aquí, en el servidor, que es el
  // único sitio que no se puede saltar.
  if (!String(ev.nombre_evento || "").trim()) {
    await auditar(admin, "eliminar_evento", "denegado", {
      entidad: "eventos", entidadId: eventoId, eventoId,
      detalle: { motivo: "evento_sin_nombre" },
    });
    return res.status(400).json({
      error: "Este evento no tiene nombre, y el borrado se confirma escribiendo el nombre exacto. " +
             "Ponle uno en «Datos del evento» y vuelve a intentarlo.",
    });
  }

  // La cuota del camino destructivo va ANTES de comparar el nombre: si fuera después, los
  // intentos fallidos de confirmación no contarían y se podría probar sin límite.
  if (!(await rateLimit(admin, "eliminar-evento", aut.user.id, 10, 3600))) {
    await auditar(admin, "eliminar_evento", "denegado", { detalle: { motivo: "rate_limit" } });
    return generico(res, 429);
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

  const idem = await idemIniciar(admin, "eliminar-evento", eventoId, 120, 1);
  if (idem === "en_curso") return generico(res, 429);
  if (idem === "duplicado") return res.status(200).json({ ok: true, duplicado: true });
  if (idem !== "procede") return generico(res, 500);

  // Lo que se fue de verdad, para poder decir exactamente qué quedó si algo falla a mitad.
  //
  // `fila` es de TRES estados, no booleano. Con un booleano, un fallo al releer dejaba `false` y
  // la respuesta afirmaba "Evento: NO borrado" cuando el `delete` sí había cuajado: el reintento
  // daba 404, el usuario de Auth quedaba vivo y no había forma de saber cuál era.
  const hecho = {
    archivos: 0, archivosPedidos: 0, notificaciones: 0, ubicaciones: 0,
    fila: "no_borrada", // 'no_borrada' | 'borrada' | 'sin_confirmar'
    usuarioAuth: null, motivoUsuarioAuth: null,
  };
  // Se guarda aparte para que el `catch` pueda auditarlo: sin esto, un fallo a mitad dejaba el
  // uuid de la cuenta del cliente sin ningún rastro.
  const authUserId = ev.auth_user_id || null;

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
    // CARPETAS. `list()` no es recursivo y devuelve las subcarpetas como entradas con `id: null`.
    // Mandarlas a `remove` no borra nada, así que `n < rutas.length` se cumplía siempre y el
    // evento quedaba IMPOSIBLE de borrar, con el mensaje engañoso "Se borraron 0 de 1 archivos".
    // Se sacan de la lista; y si aparece alguna se corta, porque no se puede enumerar su interior
    // y seguir dejaría dentro archivos sin ninguna referencia — justo lo que este orden evita.
    const carpetas = (objetos || []).filter((o) => o.name && o.id === null).map((o) => o.name);
    if (carpetas.length) {
      await idemCerrar(admin, "eliminar-evento", eventoId, false);
      await auditar(admin, "eliminar_evento", "error", {
        entidad: "eventos", entidadId: eventoId, eventoId,
        detalle: { paso: "listar_archivos", motivo: "subcarpetas", carpetas, inventario: inv },
      });
      return res.status(500).json({
        error: `Los archivos de este evento están en subcarpetas (${carpetas.join(", ")}) y no se ` +
               `pueden enumerar de una vez. NO se borró nada. Avisa a soporte.`,
        hecho,
      });
    }

    // DOS FUENTES, UNIDAS. La cabecera razona sobre `documentos.archivo_url` —"los paths mueren
    // con la fila"— pero enumerar por prefijo no lee esa columna: que las dos coincidan depende
    // de cómo sube el shim hoy, y eso es circunstancial, no una garantía. Se toman las rutas de
    // la tabla TAMBIÉN, que es la referencia real, y se unen con las del listado.
    const { data: docs, error: errDocs } = await admin
      .from("documentos").select("archivo_url").eq("evento_id", eventoId);
    if (errDocs) {
      await idemCerrar(admin, "eliminar-evento", eventoId, false);
      await auditar(admin, "eliminar_evento", "error", {
        entidad: "eventos", entidadId: eventoId, eventoId,
        detalle: { paso: "leer_rutas_documentos", motivo: errDocs.message, inventario: inv },
      });
      return res.status(500).json({
        error: "No se pudieron leer las rutas de los documentos. NO se borró nada; reinténtalo.",
        hecho,
      });
    }
    // ...pero ACOTADAS AL PREFIJO DEL EVENTO. `documentos.archivo_url` es una columna que
    // escribe el navegador: `documentos_ins` y `documentos_upd` son `is_admin()` sin restricción
    // de columna ni de valor, igual que `eventos_upd`. Sin este filtro, una `archivo_url` con
    // cualquier ruta haría que este borrado destruyera un objeto arbitrario del bucket
    // `clientes` — los documentos de OTRO cliente. Es el mismo fallo que el uuid de Auth, un
    // piso más abajo: el dato viene de fuera y no era mío. Lo que quede fuera del prefijo no se
    // borra y se deja anotado; no se corta, porque no borrarlo es justamente lo correcto.
    const prefijo = `${eventoId}/`;
    const rutasDeTabla = (docs || []).map((d) => String(d.archivo_url || "").trim()).filter(Boolean);
    const rutasAjenas = rutasDeTabla.filter((r) => !r.startsWith(prefijo));
    const rutas = [...new Set([
      ...(objetos || []).filter((o) => o.name && o.id !== null).map((o) => `${prefijo}${o.name}`),
      ...rutasDeTabla.filter((r) => r.startsWith(prefijo)),
    ])];
    hecho.archivosPedidos = rutas.length;
    hecho.rutasAjenasIgnoradas = rutasAjenas.length;
    if (rutasAjenas.length) {
      await auditar(admin, "eliminar_evento", "error", {
        entidad: "eventos", entidadId: eventoId, eventoId,
        detalle: { paso: "rutas_fuera_del_evento", incidente: "archivo_url_fuera_de_prefijo",
                   rutas: rutasAjenas },
      });
    }
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
    //
    // La comprobación es "no sobrevive ninguna", NO "el número coincide". Comparar contra el
    // inventario de hace unos segundos era una condición de carrera garantizada: el cron
    // (`cron-recordatorios`) y el propio cliente (`lib/notificar.js`) insertan y borran en
    // `notificaciones` mientras esto corre. Una notificación nueva entre el conteo y el borrado
    // hacía saltar el `!==` y abortaba... en el paso 2, con el bucket YA vaciado: el evento se
    // quedaba visible con documentos que no se pueden abrir. Lo que importa no es cuántas se
    // fueron, sino que no quede ninguna.
    const sobrevivientes = async (tabla) => {
      const { count, error } = await admin
        .from(tabla).select("*", { count: "exact", head: true }).eq("evento_id", eventoId);
      if (error) throw Object.assign(new Error(error.message), { paso: `confirmar_${tabla}` });
      return count || 0;
    };

    const { data: notifsBorradas, error: errNotif } = await admin
      .from("notificaciones").delete().eq("evento_id", eventoId).select("id");
    if (errNotif) throw Object.assign(new Error(errNotif.message), { paso: "notificaciones" });
    hecho.notificaciones = (notifsBorradas || []).length;
    const notifsVivas = await sobrevivientes("notificaciones");
    if (notifsVivas > 0) {
      throw Object.assign(
        new Error(`quedan ${notifsVivas} avisos sin borrar`), { paso: "notificaciones" });
    }

    // `operativo_ubicaciones` tiene PK compuesta (personal_id, evento_id) y NO tiene `id`:
    // se borra por `evento_id` y se confirma con `personal_id`, no con `id`.
    // Y se confirma releyendo, igual que las notificaciones: recoger el resultado y no mirarlo
    // era declarar el criterio 5A justo encima y no aplicarlo.
    const { data: ubicBorradas, error: errUbic } = await admin
      .from("operativo_ubicaciones").delete().eq("evento_id", eventoId).select("personal_id");
    if (errUbic) throw Object.assign(new Error(errUbic.message), { paso: "ubicaciones" });
    hecho.ubicaciones = (ubicBorradas || []).length;
    const ubicVivas = await sobrevivientes("operativo_ubicaciones");
    if (ubicVivas > 0) {
      throw Object.assign(
        new Error(`quedan ${ubicVivas} ubicaciones sin borrar`), { paso: "ubicaciones" });
    }

    // ---- 3) LA FILA. Arrastra 11 tablas por CASCADE (+ invitados y accesos en segundo nivel).
    const { error: errFila } = await admin.from("eventos").delete().eq("id", eventoId);
    if (errFila) throw Object.assign(new Error(errFila.message), { paso: "fila" });

    // Confirmar releyendo: un delete que no afectó filas no da error. Si la RELECTURA falla, no
    // se sabe si la fila se fue — y decir "NO borrado" sería inventarse una respuesta.
    const { data: sigue, error: errRe } = await admin
      .from("eventos").select("id").eq("id", eventoId).maybeSingle();
    if (errRe) {
      hecho.fila = "sin_confirmar";
      throw Object.assign(new Error(errRe.message), { paso: "confirmar" });
    }
    if (sigue) throw Object.assign(new Error("la fila sigue existiendo"), { paso: "confirmar" });
    hecho.fila = "borrada";

    // ---- 4) EL USUARIO DE AUTH, al final y a propósito.
    //
    // `authUserId` sale de `eventos.auth_user_id`, una columna que CUALQUIER admin puede escribir
    // desde el navegador (`eventos_upd` no restringe columnas), y `deleteUser` es un hard delete
    // sobre `auth.users`, la tabla compartida con Vero Seguros. Por eso el permiso es explícito:
    // `borrarUsuario` comprueba que ese uuid sea de verdad el cliente de ESTE evento antes de
    // tocar nada. Si no lo es, no se borra: mejor una cuenta huérfana que una cuenta ajena
    // destruida.
    if (authUserId) {
      const r = await borrarUsuario(admin, authUserId, { tipo: "cliente_de_evento", eventoId });
      hecho.usuarioAuth = r.ok;
      hecho.motivoUsuarioAuth = r.motivo;
      if (!r.ok) {
        await idemCerrar(admin, "eliminar-evento", eventoId, true);
        // Se distingue "no se pudo" de "no me dejo": lo segundo significa que ese uuid NO era
        // del cliente de este evento, y eso es un incidente que alguien tiene que mirar — pudo
        // ser un `auth_user_id` mal escrito apuntando a una cuenta ajena.
        const rechazado = r.motivo !== "deleteUser_fallo" && r.motivo !== "deleteUser_excepcion";
        await auditar(admin, "eliminar_evento", "error", {
          entidad: "eventos", entidadId: eventoId,
          detalle: {
            paso: "usuario_auth",
            incidente: rechazado ? "usuario_no_pertenece_al_evento" : "usuario_huerfano",
            motivo: r.motivo, authUserId, usuario: ev.usuario, inventario: inv, hecho,
          },
        });
        return res.status(200).json({
          ok: true, parcial: true, hecho,
          aviso: rechazado
            ? `El evento y sus datos se borraron, pero la cuenta que tenía enlazada NO se borró: ` +
              `no se pudo comprobar que fuera del cliente de este evento (${r.motivo}). Se dejó intacta ` +
              `a propósito. Avisa a soporte: puede ser una cuenta de otra persona enlazada por error.`
            : `El evento y sus datos se borraron, pero NO se pudo borrar el usuario «${ev.usuario}». ` +
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
    // `authUserId` va en la auditoría SIEMPRE. Si la fila cuajó y falló la relectura, el
    // reintento responde 404 y la cuenta del cliente queda viva: sin este uuid apuntado, no hay
    // forma de encontrarla después.
    await auditar(admin, "eliminar_evento", "error", {
      entidad: "eventos", entidadId: eventoId, eventoId,
      detalle: {
        paso, motivo: e?.message, inventario: inv, hecho, authUserId,
        ...(hecho.fila === "sin_confirmar" ? { incidente: "fila_sin_confirmar" } : {}),
      },
    });
    // Se dice EXACTAMENTE qué quedó hecho. Un "no se pudo" a secas, tras haber borrado los
    // archivos, dejaría al dueño sin saber si tiene que volver a intentarlo. Y "NO borrado" solo
    // se afirma cuando consta: si la relectura falló, se dice que no se pudo comprobar.
    const ESTADO_FILA = {
      borrada: "borrado",
      no_borrada: "NO borrado",
      sin_confirmar: "no se pudo comprobar si se borró (si al reintentar sale «ya no existe», sí se borró)",
    };
    return res.status(500).json({
      error: `El borrado se interrumpió en «${paso}». Archivos borrados: ${hecho.archivos}/${hecho.archivosPedidos}. ` +
             `Avisos borrados: ${hecho.notificaciones}. Evento: ${ESTADO_FILA[hecho.fila]}. ` +
             `Vuelve a intentarlo: el borrado se puede reanudar.`,
      hecho,
    });
  }
}
