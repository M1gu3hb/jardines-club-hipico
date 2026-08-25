/**
 * base44Client.js — SHIM de datos.
 *
 * Conserva la MISMA API pública que usaban los componentes
 * (`base44.entities.X.list/filter/get/create/update/delete`, `functions.invoke`,
 * `integrations.Core.UploadFile`, `auth`), pero por dentro habla con **Supabase**
 * (schema `jardines`). Los componentes NO cambian por esto.
 *
 * - Traduce camelCase (JS) ↔ snake_case (columnas de Postgres) automáticamente.
 * - Orden: "orden" asc, "-orden" desc, "-created_date" → created_at desc.
 * - Escrituras: RLS decide (admin para CMS; público solo puede insertar solicitudes).
 */
import { supabase } from "./supabaseClient";
import { functions } from "./funciones";

// Entidad (nombre que usan los componentes) → tabla en el schema jardines.
const TABLES = {
  ConfigSitio: "config_sitio",
  Salon: "salones",
  Galeria: "galeria",
  ServicioItem: "servicios",
  AmenidadItem: "amenidades",
  ServicioExtra: "servicios_extra",
  AlimentoMenu: "alimentos",
  SolicitudEvento: "solicitudes",
  OperativoPersonal: "operativo_personal",
  ResenasConfig: "resenas_config",
  Resena: "resenas",
  Evento: "eventos",
  Documento: "documentos",
  ItemContratado: "items_contratados",
  Perfil: "perfiles",
  SalonPlano: "salon_planos",
  // Nace con `sec_31` (rediseño, FASE 2). Sus filas llegan APAGADAS: una página de evento
  // sin contenido propio no se publica, así que el sitio filtra por `activo`.
  TipoEvento: "tipos_evento",
  // Nace con `sec_33`. Aquí el filtro de publicación NO lo pone el frontend: lo pone la
  // política de lectura, así que un borrador no es legible ni consultando la tabla a mano.
  Anuncio: "anuncios",
  EventoReglasMesas: "evento_reglas_mesas",
  Mesa: "mesas",
  Invitado: "invitados",
  Invitacion: "invitaciones",
  Acceso: "accesos",
  Cronograma: "cronograma",
  Musica: "musica",
  EventoWishlist: "evento_wishlist",
  EventoNota: "evento_notas",
  Notificacion: "notificaciones",
  Rsvp: "rsvps",
};

// Tablas con columna `orden` (para ordenar por defecto cuando no se pasa sort).
const CON_ORDEN = new Set([
  "salones", "galeria", "servicios", "amenidades", "servicios_extra", "alimentos",
  "resenas", "mesas", "cronograma", "items_contratados", "tipos_evento", "anuncios",
]);

const toSnake = (s) => s.replace(/([A-Z])/g, (m) => "_" + m.toLowerCase());
const toCamel = (s) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
const rowToObj = (r) => {
  if (!r || typeof r !== "object") return r;
  const o = {};
  for (const k in r) o[toCamel(k)] = r[k];
  return o;
};
const objToRow = (o) => {
  const r = {};
  for (const k in o) if (o[k] !== undefined) r[toSnake(k)] = o[k];
  return r;
};
const rid = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : "id-" + Date.now() + Math.random().toString(36).slice(2));

function sortColumn(sort) {
  const desc = sort.startsWith("-");
  let col = desc ? sort.slice(1) : sort;
  col = col === "created_date" ? "created_at" : toSnake(col);
  return { col, ascending: !desc };
}

async function runQuery(table, { sort, filter } = {}) {
  let q = supabase.from(table).select("*");
  if (filter) for (const k in filter) q = q.eq(toSnake(k), filter[k]);
  if (sort) { const { col, ascending } = sortColumn(sort); q = q.order(col, { ascending, nullsFirst: false }); }
  else if (CON_ORDEN.has(table)) q = q.order("orden", { ascending: true, nullsFirst: false });
  const { data, error } = await q;
  if (error) { console.error("[shim] query", table, error.message); return []; }
  return (data || []).map(rowToObj);
}

/**
 * Igual que `runQuery`, pero **lanza** en vez de devolver `[]`.
 *
 * `runQuery` devuelve `[]` tanto cuando no hay filas como cuando la lectura falla, y ese `[]`
 * ambiguo es el bug J-02. Da igual en una lista que solo se pinta; es peligroso cuando la
 * lectura se usa para **decidir** (confirmar que una escritura cuajó, contar si alguien se queda
 * sin acceso) y es lo que impide distinguir "vacío" de "se cayó" en pantalla.
 *
 * Aplica el orden por defecto de `CON_ORDEN` igual que `runQuery`, para que sea un reemplazo
 * directo y cambiar `list` por `listEstricto` no reordene nada por sorpresa.
 */
async function runQueryEstricto(table, { sort, filter }) {
  let q = supabase.from(table).select("*");
  if (filter) for (const k in filter) q = q.eq(toSnake(k), filter[k]);
  if (sort) { const { col, ascending } = sortColumn(sort); q = q.order(col, { ascending, nullsFirst: false }); }
  else if (CON_ORDEN.has(table)) q = q.order("orden", { ascending: true, nullsFirst: false });
  const { data, error } = await q;
  if (error) { console.error("[shim] estricto", table, error.message); throw error; }
  return (data || []).map(rowToObj);
}

/**
 * El error de "la escritura no tocó ninguna fila".
 *
 * Lleva `code` para que una pantalla pueda distinguirlo de un fallo de red, y un `message` en
 * castellano **pensado para enseñarse tal cual**: las pantallas del portal ya pintan
 * `e?.message`, así que sin un texto legible el cliente vería un tecnicismo o nada.
 *
 * No dice "no tienes permiso" a secas: la causa real puede ser esa, o que la fila ya no exista.
 * Afirmar la que no es, es el error que este bloque persigue.
 */
function escrituraSinEfecto(op, table) {
  const e = new Error(
    "El cambio no se guardó: la base no modificó ninguna fila. Puede ser que no tengas permiso " +
    "para cambiar esto, o que ya no exista.",
  );
  /** @type {any} */ (e).code = "escritura_sin_efecto";
  /** @type {any} */ (e).op = op;
  /** @type {any} */ (e).tabla = table;
  return e;
}

function makeEntity(name) {
  const table = TABLES[name] || toSnake(name);
  return {
    async list(sort) { return runQuery(table, { sort }); },
    async filter(filter, sort) { return runQuery(table, { sort, filter }); },
    /**
     * Como `filter`, pero **propaga el error** en vez de devolver `[]`.
     *
     * `runQuery` devuelve `[]` tanto cuando no hay filas como cuando la lectura
     * falla, y ese `[]` ambiguo es el bug J-02. Da igual en una lista que se
     * pinta; es peligroso cuando la lectura se usa para **decidir**: confirmar
     * que una escritura cuajó, o contar si alguien se queda sin acceso. Ahí un
     * fallo de red disfrazado de "no hay nada" lleva a destruir datos.
     *
     * No sustituye a `filter`: es aditivo, para las lecturas que deciden.
     */
    async filterEstricto(filter, sort) { return runQueryEstricto(table, { sort, filter }); },
    /**
     * Como `list`, pero **propaga el error**. Mismo motivo que `filterEstricto`, y hace falta
     * para poder pintar tres estados distintos en pantalla: *cargando*, *vacío* y *falló*.
     * Con `list` los dos últimos son indistinguibles —ambos llegan como `[]`— y la pantalla
     * acaba diciendo "no hay nada todavía" cuando lo cierto es que la lectura se cayó.
     */
    async listEstricto(sort) { return runQueryEstricto(table, { sort, filter: null }); },
    async get(id) { const { data } = await supabase.from(table).select("*").eq("id", id).maybeSingle(); return rowToObj(data); },
    async create(data) {
      // Las solicitudes del formulario público ya no se insertan directo: pasan por
      // la RPC `solicitud_crear`, que valida campos, aplica rate limit y fija los
      // valores internos (estatus, folio, fechas) del lado del servidor.
      if (table === "solicitudes") {
        const { data: res, error } = await supabase.rpc("solicitud_crear", {
          p_nombre_completo: data.nombreCompleto ?? "",
          p_telefono: data.telefono ?? "",
          p_email: data.email || null,
          p_salon: data.salonSeleccionado || null,
          p_tipo_evento: data.tipoEvento || null,
          p_fecha_tentativa: data.fechaTentativa || null,
          p_numero_personas: Number(data.numeroPersonas) || null,
          p_comentarios: data.comentarios || null,
          p_acepto: data.aceptoAvisoPrivacidad === true,
        });
        if (error) { console.error("[shim] create solicitudes", error.message); throw error; }
        return rowToObj(res);
      }
      const row = objToRow(data);
      if (!row.id) row.id = rid();
      const { error } = await supabase.from(table).insert(row);
      if (error) { console.error("[shim] create", table, error.message); throw error; }
      return rowToObj(row);
    },
    /**
     * ⚠️ FABRICA EL ÉXITO. Un UPDATE que RLS deja en **cero filas no da error**: `data` llega
     * `null` y esta función devuelve `{ id, ...patch }` — el parche que le pasaron— como si
     * fuera la fila guardada. El llamador no tiene forma de enterarse.
     *
     * Es el gemelo de J-02 del lado de la escritura: J-02 era "la lectura falló y parece que no
     * hay nada"; esto es "la escritura no ocurrió y parece que sí". De aquí salió el P0 del
     * portal: el cliente pulsaba «Crear y activar invitación», leía «Guardado ✓» y compartía un
     * enlace muerto, durante meses, porque `eventos_upd` exige `is_admin()`.
     *
     * NO se ha cambiado su comportamiento (ver `updateEstricto` justo debajo y
     * `docs/DECISIONS.md`): hacerlo lanzar convertiría el engaño silencioso en una pantalla
     * muerta en los diez componentes que hoy escriben **sin un solo `catch`**.
     */
    async update(id, patch) {
      const row = objToRow(patch);
      const { data, error } = await supabase.from(table).update(row).eq("id", id).select().maybeSingle();
      if (error) { console.error("[shim] update", table, error.message); throw error; }
      return rowToObj(data) || { id, ...patch };
    },
    /**
     * Como `update`, pero **lanza si no se modificó ninguna fila**.
     *
     * Aditivo, igual que `filterEstricto`/`listEstricto` en 8E: no sustituye a `update`, se usa
     * en las escrituras que **deciden** algo o cuya pantalla le afirma al usuario que se guardó.
     *
     * LÍMITE, y hay que conocerlo: la comprobación es `.select()` sobre las filas afectadas, así
     * que exige que la política de **SELECT** también deje ver la fila. Si alguna vez hubiera
     * una tabla con UPDATE permitido y SELECT denegado, esto reportaría un fallo que no ocurrió.
     * Es la dirección segura del error —decir "no se guardó" cuando sí— y hoy no se da en
     * `jardines`: todas las policies de escritura conceden también lectura sobre la misma fila.
     */
    async updateEstricto(id, patch) {
      const row = objToRow(patch);
      const { data, error } = await supabase.from(table).update(row).eq("id", id).select().maybeSingle();
      if (error) { console.error("[shim] updateEstricto", table, error.message); throw error; }
      if (!data) throw escrituraSinEfecto("update", table);
      return rowToObj(data);
    },
    /**
     * ⚠️ Misma forma que `update`: un DELETE bloqueado por RLS **no da error**, borra cero filas
     * y esta función devuelve `{ success: true }`. Ver `deleteEstricto`.
     */
    async delete(id) {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) { console.error("[shim] delete", table, error.message); throw error; }
      return { success: true };
    },
    /** Como `delete`, pero **lanza si no se borró ninguna fila**. Ver `updateEstricto`. */
    async deleteEstricto(id) {
      const { data, error } = await supabase.from(table).delete().eq("id", id).select();
      if (error) { console.error("[shim] deleteEstricto", table, error.message); throw error; }
      if (!data || data.length === 0) throw escrituraSinEfecto("delete", table);
      return { success: true };
    },
  };
}

/**
 * Acceso por nombre de entidad. Es un Proxy: cualquier `base44.entities.X` crea
 * su entidad al vuelo con `makeEntity(X)`.
 *
 * El `@type` no cambia nada en runtime — existe para que `npm run typecheck`
 * entienda el Proxy. Sin él, `tsc` tipa el objeto base como `{}` y marca un
 * TS2339 ("Property 'Salon' does not exist") por **cada** uso del shim en todo
 * el proyecto: ese patrón era la mayor parte de la línea base de 155 errores, y
 * cada componente nuevo que hablara con la base sumaba más.
 *
 * Se tipa con `keyof typeof TABLES`, **no** con `Record<string, …>`. Con `string`
 * cualquier nombre valía, así que un typo — `base44.entities.Salones` — pasaba el
 * `typecheck` y en runtime tampoco fallaba: `makeEntity` cae a `toSnake(nombre)`,
 * consulta una tabla inexistente y `runQuery` devuelve `[]` ante el error. Es decir,
 * un typo de entidad daba **una lista vacía en silencio**. Con `keyof` da TS2339.
 *
 * El `{}` inicial no satisface el `Record`, de ahí el cast en el argumento del
 * Proxy: se relaja el objeto vacío de arranque, no el tipo del resultado.
 *
 * @type {Record<keyof typeof TABLES, ReturnType<typeof makeEntity>>}
 */
const entities = new Proxy(/** @type {any} */ ({}), {
  get(target, prop) {
    if (typeof prop !== "string") return undefined;
    if (!target[prop]) target[prop] = makeEntity(prop);
    return target[prop];
  },
});

// LAS FUNCIONES SERVERLESS SON DE CADA APLICACIÓN, no del núcleo común.
//
// Aquí vivía un objeto `functions` que nombraba con `fetch` las CINCO rutas de `api/` del
// monolito. Al partir el proyecto, cada aplicación solo tiene desplegadas las suyas: en las
// otras dos esos nombres viajaban en el bundle apuntando a rutas que allí dan 404.
//
// Se movió a `./funciones.js`, que es la ÚNICA pieza de este archivo que difiere entre los
// tres repos. Todo lo demás —entidades, RPC, storage, auth— sigue siendo byte a byte igual,
// porque bifurcar el shim es el riesgo número uno del plan: tres verdades sobre la misma base.

// Storage genérico (para el bucket privado `clientes` de documentos del evento).
/**
 * Asignaciones persona ↔ evento del módulo operativo.
 *
 * Va aparte de `entities` porque `jardines.operativo_asignacion` tiene **clave
 * primaria compuesta** `(personal_id, evento_id)` y **no tiene columna `id`**,
 * mientras que `makeEntity` asume `id` en `create`, `update` y `delete`. Es
 * aditivo: no cambia ninguna firma existente del shim.
 *
 * Revocar es poner `revocada_at`, **nunca** `DELETE`: la tabla conserva historial
 * y `operativo_eventos_permitidos()` filtra por `revocada_at is null`.
 */
const asignaciones = {
  /** Asignaciones vigentes (o todas, con `incluirRevocadas`). */
  async listar({ incluirRevocadas = false } = {}) {
    let q = supabase.from("operativo_asignacion").select("*");
    if (!incluirRevocadas) q = q.is("revocada_at", null);
    const { data, error } = await q;
    if (error) { console.error("[shim] asignaciones.listar", error.message); throw error; }
    return (data || []).map(rowToObj);
  },

  /**
   * Asigna a una persona a un evento. Idempotente: si la fila ya existe —
   * porque se asignó y luego se revocó— se reactiva poniendo `revocada_at` a
   * null, en vez de chocar con la PK compuesta.
   */
  async asignar(personalId, eventoId) {
    const { error } = await supabase
      .from("operativo_asignacion")
      .insert({ personal_id: personalId, evento_id: eventoId });
    if (error) {
      const yaExiste = /duplicate key|operativo_asignacion_pkey|23505/i.test(error.message || "");
      if (!yaExiste) { console.error("[shim] asignar", error.message); throw error; }
      const { error: errUpd } = await supabase
        .from("operativo_asignacion")
        .update({ revocada_at: null })
        .eq("personal_id", personalId).eq("evento_id", eventoId);
      if (errUpd) { console.error("[shim] reactivar asignacion", errUpd.message); throw errUpd; }
    }
    return { success: true };
  },

  /** Revoca (marca `revocada_at`). No borra la fila. */
  async revocar(personalId, eventoId) {
    const { error } = await supabase
      .from("operativo_asignacion")
      .update({ revocada_at: new Date().toISOString() })
      .eq("personal_id", personalId).eq("evento_id", eventoId);
    if (error) { console.error("[shim] revocar asignacion", error.message); throw error; }
    return { success: true };
  },
};

const storage = {
  async upload(bucket, file, folder = "") {
    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    const path = `${folder ? folder + "/" : ""}${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type || undefined });
    if (error) throw error;
    return { path };
  },
  async signedUrl(bucket, path, expiresIn = 3600) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
    if (error) throw error;
    return data.signedUrl;
  },
  /**
   * Borra un objeto. Distingue "borró" de "no borró nada".
   *
   * La Storage API devuelve **200 con lista vacía y sin `error`** cuando una
   * policy deniega el borrado, así que mirar solo `error` hacía que un borrado
   * denegado pasara por éxito y el fallo fuera mudo. Se devuelve `borrado` para
   * que el llamador pueda decidir.
   */
  async remove(bucket, path) {
    const { data, error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw error;
    return { success: true, borrado: Array.isArray(data) && data.length > 0 };
  },
  /**
   * URL pública de un objeto en un bucket PÚBLICO (`planos`, `sitio`).
   *
   * Aditivo: no cambia ninguna firma existente del shim. Hacía falta porque
   * `integrations.Core.UploadFile` está cableado al bucket `sitio` y los planos
   * van a `planos`, que tiene sus propios límites (10 MB, imágenes sin SVG).
   *
   * En un bucket público la descarga por `/object/public/...` no necesita policy
   * de `SELECT`, así que esto no requiere sesión ni firma.
   */
  publicUrl(bucket, path) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },
};

// Subida de archivos del CMS → bucket público `sitio`.
const integrations = {
  Core: {
    async UploadFile({ file }) {
      const ext = (file.name.split(".").pop() || "bin").toLowerCase();
      const path = `cms/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("sitio").upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (error) throw error;
      const { data } = supabase.storage.from("sitio").getPublicUrl(path);
      return { file_url: data.publicUrl };
    },
  },
};

// Auth → Supabase Auth. Login por rol (admin) y por usuario/contraseña (cliente).
const auth = {
  async me() { const { data } = await supabase.auth.getUser(); if (!data?.user) throw new Error("no session"); return data.user; },
  async session() { const { data } = await supabase.auth.getSession(); return data?.session || null; },
  // Perfil (rol) del usuario logueado. RLS permite leer el perfil propio.
  async perfil() {
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return null;
    const { data } = await supabase.from("perfiles").select("*").eq("user_id", u.user.id).maybeSingle();
    return rowToObj(data);
  },
  // Login admin: email + contraseña directos.
  async loginEmail(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },
  async logout() { await supabase.auth.signOut(); },
  // Reacciona a cambios de sesión (login/logout/refresh). Devuelve un unsubscribe.
  onChange(cb) {
    const { data } = supabase.auth.onAuthStateChange((_e, session) => cb(session));
    return () => data?.subscription?.unsubscribe();
  },
  redirectToLogin() {},
};

// RPCs del schema jardines (SECURITY DEFINER: confirmar_evento, info_invitacion, registrar_acceso).
async function rpc(name, params = {}) {
  const { data, error } = await supabase.rpc(name, params);
  if (error) { console.error("[shim] rpc", name, error.message); throw error; }
  return data;
}

export const base44 = { entities, functions, integrations, storage, asignaciones, auth, rpc };
export default base44;
