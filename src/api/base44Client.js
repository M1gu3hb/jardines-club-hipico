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
  ResenasConfig: "resenas_config",
  Resena: "resenas",
  Evento: "eventos",
  Documento: "documentos",
  ItemContratado: "items_contratados",
  Perfil: "perfiles",
  SalonPlano: "salon_planos",
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
};

// Tablas con columna `orden` (para ordenar por defecto cuando no se pasa sort).
const CON_ORDEN = new Set([
  "salones", "galeria", "servicios", "amenidades", "servicios_extra", "alimentos",
  "resenas", "mesas", "cronograma", "items_contratados",
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

function makeEntity(name) {
  const table = TABLES[name] || toSnake(name);
  return {
    async list(sort) { return runQuery(table, { sort }); },
    async filter(filter, sort) { return runQuery(table, { sort, filter }); },
    async get(id) { const { data } = await supabase.from(table).select("*").eq("id", id).maybeSingle(); return rowToObj(data); },
    async create(data) {
      const row = objToRow(data);
      if (!row.id) row.id = rid();
      const { error } = await supabase.from(table).insert(row);
      if (error) { console.error("[shim] create", table, error.message); throw error; }
      return rowToObj(row);
    },
    async update(id, patch) {
      const row = objToRow(patch);
      const { data, error } = await supabase.from(table).update(row).eq("id", id).select().maybeSingle();
      if (error) { console.error("[shim] update", table, error.message); throw error; }
      return rowToObj(data) || { id, ...patch };
    },
    async delete(id) {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) { console.error("[shim] delete", table, error.message); throw error; }
      return { success: true };
    },
  };
}

const entities = new Proxy({}, {
  get(target, prop) {
    if (typeof prop !== "string") return undefined;
    if (!target[prop]) target[prop] = makeEntity(prop);
    return target[prop];
  },
});

// Envío del formulario por correo (la función serverless sigue mandando el correo).
const functions = {
  async invoke(name, payload) {
    if (name === "gmailSolicitud" || name === "notificarNuevaSolicitud") {
      const body = (payload && payload.data) || payload || {};
      const res = await fetch("/api/solicitud", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`solicitud ${res.status}`);
      return res.json().catch(() => ({ ok: true }));
    }
    return {};
  },
  // Crea el usuario de Auth del cliente (server-side, con service_role) y lo liga al evento.
  async crearUsuarioEvento(payload) {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    const res = await fetch("/api/crear-usuario-evento", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token || ""}` },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
    return json;
  },
};

// Storage genérico (para el bucket privado `clientes` de documentos del evento).
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
  async remove(bucket, path) {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw error;
    return { success: true };
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

export const base44 = { entities, functions, integrations, storage, auth, rpc };
export default base44;
