// api/_lib/guard.js — Controles compartidos de las rutas serverless de Jardines.
//
// (Los archivos dentro de carpetas con "_" NO se publican como funciones en Vercel.)
//
// Aquí vive lo que TODA ruta necesita y antes no tenía: límite de tamaño del
// cuerpo, autorización real contra el perfil de Jardines, escape de HTML, rate
// limit persistente e idempotencia. Todo respaldado por PostgreSQL, para que no
// se pueda saltar llamando al endpoint directamente.
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";

/** Escapa texto antes de incrustarlo en HTML de correo. */
export const escHtml = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Cliente con service_role. Solo servidor; nunca se expone al navegador. */
export function clienteAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole, {
    db: { schema: "jardines" },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Lee y valida el cuerpo con un tope de tamaño.
 * Devuelve { ok, body } o { ok:false, status:413|400 }.
 */
export function leerBody(req, maxBytes = 16 * 1024) {
  let body = req.body;
  if (typeof body === "string") {
    if (Buffer.byteLength(body, "utf8") > maxBytes) return { ok: false, status: 413 };
    try { body = JSON.parse(body); } catch { return { ok: false, status: 400 }; }
  } else if (body && typeof body === "object") {
    if (Buffer.byteLength(JSON.stringify(body), "utf8") > maxBytes) return { ok: false, status: 413 };
  } else {
    body = {};
  }
  return { ok: true, body: body || {} };
}

/** Bearer token de la cabecera Authorization. */
export function bearer(req) {
  const h = req.headers.authorization || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

/**
 * Comparación en tiempo constante, para que un atacante no pueda deducir el
 * secreto midiendo cuánto tarda la respuesta.
 */
export function igualSeguro(a, b) {
  const A = Buffer.from(String(a ?? ""), "utf8");
  const B = Buffer.from(String(b ?? ""), "utf8");
  if (A.length !== B.length) {
    // Se compara igual contra sí mismo para no delatar la longitud por tiempo.
    try { timingSafeEqual(A, A); } catch { /* noop */ }
    return false;
  }
  return timingSafeEqual(A, B);
}

/**
 * Autoriza al llamador como usuario DE JARDINES.
 *
 * Una sesión válida del Supabase compartido NO basta: el proyecto es compartido
 * con Vero Seguros, así que un usuario suyo tiene sesión válida y aun así no
 * debe poder tocar nada de Jardines. Se exige perfil en jardines.perfiles.
 *
 * @returns {Promise<{ok:true,user,perfil}|{ok:false,status:number}>}
 */
export async function autorizarJardines(req, admin, { rol } = {}) {
  const token = bearer(req);
  if (!token) return { ok: false, status: 401 };

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return { ok: false, status: 401 };

  const { data: perfil } = await admin
    .from("perfiles").select("rol, nombre").eq("user_id", data.user.id).maybeSingle();

  // Sin perfil de Jardines → 403 (caso típico: usuario de Vero Seguros).
  if (!perfil) return { ok: false, status: 403 };
  if (rol && perfil.rol !== rol) return { ok: false, status: 403 };

  // EL ACTOR SE SELLA AQUI, no en cada ruta.
  //
  // Medido el 2026-08-31: de las 57 filas de auditoria escritas por `api_auditar` —mcp 28,
  // portal 16, api 7, crm 6— **ninguna** tenia actor. `jardines_private.auditar` saca
  // `actor_uid` de `auth.uid()`, y todas las rutas de `api/` hablan con `service_role`, que no
  // lleva sesion: la columna nacia vacia siempre. Quedaba saber QUE se hizo y no QUIEN.
  //
  // Enhebrarlo por los 45 puntos de llamada a `auditar()` se olvida a la primera. Se sella una
  // vez, en el sitio por el que pasan TODAS las rutas autorizadas, asi que una ruta nueva lo
  // hereda sin hacer nada.
  marcarActor(admin, data.user.id);
  return { ok: true, user: data.user, perfil };
}

/**
 * Deja escrito en el cliente privilegiado QUIEN esta actuando, para que `auditar()` lo mande
 * sin que cada llamada tenga que acordarse.
 *
 * Va como propiedad NO enumerable: el cliente de Supabase se serializa en algunos logs y un
 * campo mas ahi seria ruido, o peor, un dato personal viajando a un sitio que no lo pidio.
 */
export function marcarActor(admin, uid, etiqueta) {
  try {
    Object.defineProperty(admin, "__actor", {
      value: { uid: uid ?? null, etiqueta: etiqueta ?? null },
      writable: true, enumerable: false, configurable: true,
    });
  } catch { /* si no se puede marcar, la auditoria sigue: nunca tumba la operacion */ }
}

/** Rate limit persistente en PostgreSQL. true = permitido. */
export async function rateLimit(admin, bucket, clave, max, segundos) {
  const { data, error } = await admin.rpc("api_rate_limit", {
    p_bucket: bucket, p_clave: String(clave ?? "global"),
    p_max: max, p_segundos: segundos,
  });
  // Fail-closed: si el control no se puede evaluar, no se deja pasar.
  if (error) return false;
  return data === true;
}

/**
 * Idempotencia RECUPERABLE.
 *
 * Devuelve 'procede' | 'duplicado' | 'en_curso' | 'error'. La clave no queda
 * consumida hasta que se llama a `idemCerrar(..., true)`: si el envío falla, se
 * marca 'fallido' y el reintento vuelve a proceder. Un proceso interrumpido se
 * recupera solo cuando vence su lease.
 */
export async function idemIniciar(admin, endpoint, clave, leaseSeg = 60, horas = 24) {
  const { data, error } = await admin.rpc("api_idem_iniciar", {
    p_endpoint: endpoint, p_clave: String(clave ?? ""),
    p_lease_seg: leaseSeg, p_horas: horas,
  });
  if (error) return "error";
  return data;
}

/**
 * Cierra la clave: true = completado (no se repite), false = fallido (reintentable).
 *
 * Devuelve `true` solo si la base confirmó el cierre. supabase-js NO lanza: en un
 * fallo resuelve la promesa con `{ error }`, así que un try/catch por sí solo da
 * la falsa impresión de que todo salió bien.
 */
export async function idemCerrar(admin, endpoint, clave, ok) {
  try {
    const { error } = await admin.rpc("api_idem_cerrar", {
      p_endpoint: endpoint, p_clave: String(clave ?? ""), p_ok: ok,
    });
    if (error) {
      console.error("[guard] idemCerrar:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[guard] idemCerrar:", e.message);
    return false;
  }
}

/**
 * Llama una RPC y devuelve { ok, data }. Nunca da éxito si Supabase reportó
 * error, aunque la promesa se haya resuelto.
 */
export async function rpcSeguro(admin, nombre, params) {
  try {
    const { data, error } = await admin.rpc(nombre, params);
    if (error) {
      console.error(`[guard] rpc ${nombre}:`, error.message);
      return { ok: false, data: null };
    }
    return { ok: true, data };
  } catch (e) {
    console.error(`[guard] rpc ${nombre}:`, e.message);
    return { ok: false, data: null };
  }
}

/** Único dominio que acuña `api/crear-usuario-evento.js` para los clientes del portal. */
const DOMINIO_CLIENTE_PORTAL = "@portal.jardines.local";

/**
 * ¿Ese uuid es de verdad el cliente de ESE evento y de nadie más?
 *
 * POR QUÉ EXISTE
 *   `auth.users` es la tabla **compartida con Vero Seguros**. Un `deleteUser` es un hard delete
 *   sobre ella, y el uuid que se le pasaba venía de `jardines.eventos.auth_user_id` — una
 *   columna que **cualquier admin puede escribir desde el navegador**: la policy `eventos_upd`
 *   (`sec_09`) es `using is_admin() with check is_admin()`, sin restricción de columna, así que
 *   `Evento.update(id, { authUserId: "<cualquier uuid>" })` pasa RLS. No hace falta mala fe: un
 *   bug que deje ese campo mal escrito basta para que borrar un evento se lleve una cuenta
 *   ajena. Y `public.admin_users` tiene **una sola fila**: Vero tiene un único administrador.
 *
 * QUÉ SE COMPRUEBA, Y POR QUÉ CADA COSA
 *   1. El correo termina en `@portal.jardines.local`. **Es la comprobación que sostiene todo lo
 *      demás**: `auth.users.email` solo lo puede escribir la Admin API con `service_role`, nunca
 *      el navegador, y el único sitio que acuña ese dominio es `crear-usuario-evento`. El admin
 *      de Vero y los admins de Jardines tienen correos reales; el personal de operativo usa
 *      `@staff.jardines.local` (verificado en producción).
 *   2. `app_metadata.app` no dice que sea de otra aplicación.
 *   3. `jardines.perfiles` no lo tiene como `admin` ni `operativo`.
 *   4. Ningún OTRO evento lo referencia. No hay `UNIQUE` sobre `auth_user_id` — el único índice
 *      único de `eventos` es sobre `usuario` (verificado) — así que dos eventos pueden apuntar
 *      al mismo usuario y borrar uno dejaría al otro cliente sin acceso.
 *   5. No es personal de operativo (`jardines.operativo_personal.auth_user_id`; nombre de columna
 *      verificado contra `information_schema`, no supuesto).
 *
 * SOBRE `app_metadata.app === "jardines"`
 *   No se exige, se usa como **descalificador**. Dos motivos, los dos medidos en producción:
 *   `api/crear-admin.js` pone exactamente la misma marca, así que no distingue a un cliente de
 *   un administrador de Jardines — lo que separa a los dos es el dominio del correo; y de los
 *   tres clientes de portal que hay hoy **solo uno** la lleva (los otros dos son anteriores al
 *   endurecimiento). Exigirla dejaría sus cuentas imposibles de borrar para siempre. Lo que sí
 *   se rechaza es una marca que diga otra cosa.
 *
 * Falla CERRADO: si alguna lectura no se puede hacer, la respuesta es "no".
 */
export async function usuarioEsClienteDelEvento(admin, userId, eventoId) {
  if (!userId) return { ok: false, motivo: "sin_user_id" };

  let usuario;
  try {
    // `getUserById` RESUELVE con `{ error }`, no lanza — el mismo comportamiento que ya obligó a
    // arreglar `deleteUser`. Juntar `error` y `!data.user` en una sola rama dejaba un corte de
    // Auth auditado como "ese usuario no existe": rechaza igual, pero es una respuesta falsa
    // sobre por qué, y eso es lo que hace irresoluble un incidente.
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error) {
      console.error("[guard] getUserById:", error.message);
      return { ok: false, motivo: "lectura_de_auth_fallida" };
    }
    if (!data?.user) return { ok: false, motivo: "usuario_no_encontrado" };
    usuario = data.user;
  } catch (e) {
    console.error("[guard] getUserById:", e.message);
    return { ok: false, motivo: "lectura_de_auth_fallida" };
  }

  const correo = String(usuario.email || "").toLowerCase();
  if (!correo.endsWith(DOMINIO_CLIENTE_PORTAL)) {
    return { ok: false, motivo: "no_es_cuenta_de_portal" };
  }
  const app = usuario.app_metadata?.app;
  if (app != null && app !== "jardines") {
    return { ok: false, motivo: "marcado_de_otra_aplicacion" };
  }

  const { data: perfil, error: errPerfil } = await admin
    .from("perfiles").select("rol").eq("user_id", userId).maybeSingle();
  if (errPerfil) {
    console.error("[guard] perfiles:", errPerfil.message);
    return { ok: false, motivo: "lectura_de_perfiles_fallida" };
  }
  if (perfil && perfil.rol !== "cliente") return { ok: false, motivo: "no_es_un_cliente" };

  const { data: otros, error: errEv } = await admin
    .from("eventos").select("id").eq("auth_user_id", userId).neq("id", eventoId);
  if (errEv) {
    console.error("[guard] eventos:", errEv.message);
    return { ok: false, motivo: "lectura_de_eventos_fallida" };
  }
  if ((otros || []).length > 0) return { ok: false, motivo: "compartido_con_otro_evento" };

  const { count: enOperativo, error: errOp } = await admin
    .from("operativo_personal").select("*", { count: "exact", head: true }).eq("auth_user_id", userId);
  if (errOp) {
    console.error("[guard] operativo_personal:", errOp.message);
    return { ok: false, motivo: "lectura_de_operativo_fallida" };
  }
  if ((enOperativo || 0) > 0) return { ok: false, motivo: "es_personal_de_operativo" };

  return { ok: true, motivo: "cliente_del_evento" };
}

/**
 * Margen para considerar que una cuenta "acaba de crearse". Una petición serverless entera cabe
 * de sobra: el alta más larga (`crear-usuario-evento`) crea el usuario, asigna rol, actualiza el
 * evento, aprovisiona el enlace y manda el correo, y la función tiene un tope muy por debajo de
 * esto. Lo que queda fuera son las cuentas que ya existían, que es justo lo que hay que excluir.
 */
/**
 * ¿Este evento es de este usuario? Devuelve **un booleano**, y esa es media función.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * POR QUÉ NO VALE `usuarioEsClienteDelEvento` PARA ESTO
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Porque responde a OTRA pregunta. Se escribió para `borrarUsuario`, y lo que averigua es «¿es
 * seguro borrar esta cuenta de auth?»: que sea una cuenta del portal, con rol de cliente, que no
 * sea personal de operativo, y —lo importante— que **no haya OTROS eventos** colgando de ella
 * (`.eq("auth_user_id", userId).neq("id", eventoId)`).
 *
 * Nunca afirma en positivo que `eventoId` pertenezca a `userId`. Con una cuenta que tenga dos
 * eventos, diría que no a los dos, incluido el suyo. Y con una cuenta sin ningún evento diría
 * que sí a cualquier `eventoId` del mundo.
 *
 * Esta hace la pregunta directa, con una sola consulta y sin rodeos.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * Y DEVUELVE UN BOOLEANO A PROPÓSITO
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * `usuarioEsClienteDelEvento` devuelve `{ ok, motivo }` en sus TRECE salidas. Eso está bien para
 * quien lo consume con `veredicto.ok` —`borrarUsuario` lo hace—, y es una trampa para quien
 * escriba `if (!(await ...))`: un objeto es siempre truthy, así que esa guarda **no corta
 * nunca** y el `403` que hay detrás es código muerto. Pasó, y estuvo desplegado.
 *
 * Una función cuyo nombre es una pregunta de sí o no devuelve sí o no. Si algún día necesita
 * explicar el porqué, se añade otra al lado; no se le cambia el tipo a esta.
 *
 * Fail-closed: si la lectura se cae, la respuesta es **no**. En una guarda de autorización,
 * «no pude comprobarlo» y «no» son la misma respuesta.
 */
export async function eventoEsDelUsuario(admin, userId, eventoId) {
  if (!userId || !eventoId) return false;
  const { data, error } = await admin
    .schema("jardines").from("eventos")
    .select("id")
    .eq("id", eventoId)
    .eq("auth_user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("[guard] eventoEsDelUsuario:", error.message);
    return false;
  }
  return !!data;
}

const VENTANA_RECIEN_CREADO_MS = 10 * 60 * 1000;

/**
 * ¿Esa cuenta se creó hace un momento?
 *
 * Es la comprobación real que sostiene el permiso `recien_creado_aqui`. No demuestra que el uuid
 * venga de ESTA petición —eso es un contrato de llamador, verificado estáticamente—, pero sí
 * descarta lo que importa: cualquier uuid leído de la base apunta a una cuenta vieja.
 *
 * Falla CERRADO. Si la lectura no se puede hacer no se borra: `compensarAlta` lo registra como
 * `compensacion_incompleta`, que es un incidente que alguien mira, en vez de un hard delete a
 * ciegas sobre la tabla que se comparte con Vero.
 */
export async function usuarioRecienCreado(admin, userId) {
  let usuario;
  try {
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error) {
      console.error("[guard] getUserById:", error.message);
      return { ok: false, motivo: "lectura_de_auth_fallida" };
    }
    if (!data?.user) return { ok: false, motivo: "usuario_no_encontrado" };
    usuario = data.user;
  } catch (e) {
    console.error("[guard] getUserById:", e.message);
    return { ok: false, motivo: "lectura_de_auth_fallida" };
  }

  const creado = Date.parse(usuario.created_at || "");
  if (!Number.isFinite(creado)) return { ok: false, motivo: "sin_fecha_de_alta" };
  if (Date.now() - creado > VENTANA_RECIEN_CREADO_MS) {
    return { ok: false, motivo: "la_cuenta_no_es_reciente" };
  }
  return { ok: true, motivo: "recien_creada" };
}

/**
 * Borra un usuario de Auth, CONFIRMA que se borró, y **nunca sin saber de quién es**.
 *
 * `admin.auth.admin.deleteUser()` resuelve con `{ error }` en vez de rechazar, así que un
 * `.catch(() => {})` no atrapa nada: dejaba creer que la compensación había ocurrido cuando
 * podía haber fallado, y el usuario quedaba huérfano con credenciales válidas.
 *
 * `permiso` es OBLIGATORIO y no tiene valor por defecto, a propósito. Esta función es la única
 * de todo el proyecto que llama a `deleteUser`, y `auth.users` es la tabla compartida con Vero:
 * un borrado sin comprobar la pertenencia es exactamente el fallo que hubo que arreglar. Que el
 * argumento falte hace que el borrado se niegue, no que se haga "por defecto".
 *
 * Dos permisos, y solo dos:
 *
 *   - `{ tipo: "cliente_de_evento", eventoId }` — comprueba `usuarioEsClienteDelEvento`.
 *   - `{ tipo: "recien_creado_aqui" }` — la compensación de un alta que falló a mitad. Comprueba
 *     que la cuenta se haya creado **hace un momento** (`VENTANA_RECIEN_CREADO_MS`). En ese
 *     instante el usuario todavía puede no tener perfil ni correo de portal (`crear-admin` acuña
 *     correos reales), así que la comprobación de cliente lo rechazaría y dejaría vivo un admin a
 *     medio crear con su aprovisionamiento pendiente — peor que el problema.
 *
 *     LO QUE ESTE PERMISO **NO** COMPRUEBA, y hay que saberlo: que el uuid sea el que ESTA
 *     petición creó. Eso es un **contrato de llamador**, no una comprobación — los tres sitios
 *     que llaman a `compensarAlta` pasan su `nuevoId`, que sale de `createUser` y nunca de una
 *     lectura de la base. Lo vigila un contrato estático de `scripts/test-contratos-api.mjs`.
 *     Antes había aquí un `if (permiso.creadoEnEstaPeticion !== userId)` que el único llamador
 *     satisfacía pasando `userId` como las dos cosas: `userId !== userId`, siempre falso, no
 *     rechazaba nunca nada. Aparentaba comprobar sin comprobar, que es peor que no tener el
 *     candado porque invita a confiar. Se cambió por la ventana temporal, que sí mira algo real.
 *
 * Devuelve `{ ok, motivo }`: quien llama necesita el motivo para auditarlo.
 */
export async function borrarUsuario(admin, userId, permiso) {
  if (!userId) return { ok: false, motivo: "sin_user_id" };

  if (permiso?.tipo === "cliente_de_evento") {
    const veredicto = await usuarioEsClienteDelEvento(admin, userId, permiso.eventoId);
    if (!veredicto.ok) return veredicto;
  } else if (permiso?.tipo === "recien_creado_aqui") {
    const veredicto = await usuarioRecienCreado(admin, userId);
    if (!veredicto.ok) return veredicto;
  } else {
    console.error("[guard] borrarUsuario sin permiso declarado");
    return { ok: false, motivo: "permiso_no_declarado" };
  }

  try {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) {
      console.error("[guard] deleteUser:", error.message);
      return { ok: false, motivo: "deleteUser_fallo" };
    }
    return { ok: true, motivo: "borrado" };
  } catch (e) {
    console.error("[guard] deleteUser:", e.message);
    return { ok: false, motivo: "deleteUser_excepcion" };
  }
}

/**
 * Compensación tras un alta fallida: borra el usuario y, si se indica, revoca el
 * aprovisionamiento pendiente. Devuelve qué se logró para poder auditarlo.
 *
 * Si algo NO se pudo limpiar se registra como incidente crítico, porque queda
 * estado colgando que una persona tiene que revisar.
 */
export async function compensarAlta(admin, { userId, correo, accion }) {
  // La excepción estrecha. `userId` tiene que ser el que ESTA petición acaba de crear: los tres
  // llamadores pasan su `nuevoId`, que sale de `createUser` y nunca de una lectura de la base.
  // Eso es un contrato de llamador —lo vigila un contrato estático—; lo que `borrarUsuario`
  // comprueba de verdad es que la cuenta sea reciente. Ver su cabecera.
  const usuarioBorrado = userId
    ? (await borrarUsuario(admin, userId, { tipo: "recien_creado_aqui" })).ok
    : true;
  let aproRevocado = true;
  if (correo) {
    const r = await rpcSeguro(admin, "revocar_aprovisionamiento", { p_email: correo });
    aproRevocado = r.ok;
  }

  if (!usuarioBorrado || !aproRevocado) {
    // Estado colgando: usuario Auth huérfano y/o concesión de admin viva.
    await auditar(admin, accion, "error", {
      entidad: "perfiles", entidadId: userId ?? null,
      detalle: { incidente: "compensacion_incompleta", usuarioBorrado, aproRevocado },
    });
  }
  return { usuarioBorrado, aproRevocado, ok: usuarioBorrado && aproRevocado };
}

/**
 * Insert/update de apoyo (no crítico para la respuesta) que aun así hay que
 * comprobar: devuelve true solo si Supabase no reportó error.
 */
export async function escrituraOk(promesa, etiqueta) {
  try {
    const { error } = await promesa;
    if (error) {
      console.error(`[guard] ${etiqueta}:`, error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[guard] ${etiqueta}:`, e.message);
    return false;
  }
}

/** Registro en la bitácora de Jardines (nunca guarda secretos). */
export async function auditar(admin, accion, resultado, extra = {}) {
  try {
    await admin.rpc("api_auditar", {
      p_accion: accion, p_resultado: resultado,
      p_entidad: extra.entidad ?? null, p_entidad_id: extra.entidadId ?? null,
      p_evento_id: extra.eventoId ?? null,
      // `origen` viaja DENTRO del detalle y no como parámetro propio.
      //
      // `jardines.api_auditar` tiene seis parámetros y es la RPC que ya llaman las cinco
      // funciones serverless; añadirle uno séptimo es exactamente lo que rompió la auditoría en
      // `sec_41` — `CREATE OR REPLACE` con otra aridad crea una SOBRECARGA, no un reemplazo, y
      // todas las llamadas cortas se vuelven ambiguas. Como el dato cabe en el `jsonb` que ya
      // se manda, no hace falta pagar ese riesgo por una etiqueta.
      // El ACTOR viaja por el mismo camino que `origen`, y por el mismo motivo: `api_auditar`
      // tiene seis parametros y darle un septimo crearia una SOBRECARGA, que es lo que rompio
      // la auditoria entera en `sec_41`. La funcion los saca del `jsonb` y los pone en su
      // columna (`sec_69`), asi que se pueden filtrar sin cambiar ninguna firma.
      p_detalle: {
        ...(extra.detalle ?? {}),
        ...(extra.origen ? { origen: extra.origen } : {}),
        ...(admin?.__actor?.uid ? { actor_uid: admin.__actor.uid } : {}),
        ...(admin?.__actor?.etiqueta ? { actor: admin.__actor.etiqueta } : {}),
      },
    });
  } catch { /* la auditoría nunca tumba la operación */ }
}

/**
 * Como `auditar`, pero DICE si escribio.
 *
 * `auditar()` se traga sus excepciones a proposito: la auditoria nunca puede tumbar la operacion
 * del negocio. Eso esta bien para el 99% de los casos y mal para uno: cuando la fila de auditoria
 * es la CONDICION para poder hacer algo destructivo.
 *
 * El caso real es `api/eliminar-evento.js`: borrar un evento destruye su libro de pagos, asi que
 * el libro se copia a la auditoria ANTES. Si esa copia no cuaja y no nos enteramos, se borra el
 * registro del dinero sin dejar nada. Ahi «no dio error» no basta.
 *
 * Sigue sin lanzar —devuelve `false`— para que no pueda tumbar nada por descuido: quien la llama
 * decide que hacer con el `false`. Es la misma distincion que `updateEstricto` / `update` del
 * shim, y por eso lleva el mismo sufijo.
 */
export async function auditarEstricto(admin, accion, resultado, extra = {}) {
  try {
    const { error } = await admin.rpc("api_auditar", {
      p_accion: accion, p_resultado: resultado,
      p_entidad: extra.entidad ?? null, p_entidad_id: extra.entidadId ?? null,
      p_evento_id: extra.eventoId ?? null,
      p_detalle: {
        ...(extra.detalle ?? {}),
        ...(extra.origen ? { origen: extra.origen } : {}),
        ...(admin?.__actor?.uid ? { actor_uid: admin.__actor.uid } : {}),
        ...(admin?.__actor?.etiqueta ? { actor: admin.__actor.etiqueta } : {}),
      },
    });
    if (error) console.error(`[guard] auditarEstricto ${accion}:`, error.message);
    return !error;
  } catch (e) {
    console.error(`[guard] auditarEstricto ${accion}:`, e.message);
    return false;
  }
}

/** IP del cliente según el gateway de Vercel; nunca del cuerpo de la petición. */
export function ipCliente(req) {
  const xff = req.headers["x-forwarded-for"];
  if (!xff) return "sin-ip";
  return String(Array.isArray(xff) ? xff[0] : xff).split(",")[0].trim() || "sin-ip";
}

/** Respuesta genérica: no revela si el recurso existe ni por qué falló. */
export function generico(res, status) {
  const msg = {
    400: "Solicitud inválida",
    401: "No autorizado",
    403: "No autorizado",
    405: "Método no permitido",
    413: "Solicitud demasiado grande",
    429: "Demasiadas solicitudes. Intenta más tarde.",
    500: "Error del servidor",
    // 503 es transitorio: el mensaje tiene que invitar a reintentar. Sin esta
    // entrada, el cliente que estrena su enlace de primer acceso veía "Error"
    // a secas y no sabía que volver a intentarlo servía de algo.
    503: "Servicio no disponible. Intenta de nuevo en un momento.",
  }[status] || "Error";
  res.status(status).json({ error: msg });
}
