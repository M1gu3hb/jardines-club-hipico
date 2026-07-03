/**
 * base44Client.js — SHIM local (sin dependencia de Base44)
 *
 * Reemplaza el SDK de Base44 por un proveedor de datos ESTÁTICO que expone la
 * MISMA API que usaban los componentes (`base44.entities.X.list/filter/create/
 * update/delete`, `base44.functions.invoke`, `base44.integrations.Core.UploadFile`,
 * `base44.auth.*`). Así el resto del código sigue funcionando sin cambios.
 *
 * - Lecturas: sirven el contenido congelado desde src/data/site-data.json.
 * - Escrituras (panel admin): mutan un store EN MEMORIA (solo dura la sesión,
 *   no persiste al recargar). El sitio público es 100% estático.
 * - El envío del formulario (functions.invoke) pega a /api/solicitud, una
 *   función serverless de Vercel que manda el correo por Gmail.
 */
import siteData from "@/data/site-data.json";

// ---- store en memoria, sembrado desde el snapshot estático -----------------
const clone = (v) => JSON.parse(JSON.stringify(v));

const store = {
  ConfigSitio: clone([siteData.config]),
  Salon: clone(siteData.salones),
  Galeria: clone(siteData.galeria),
  ServicioItem: clone(siteData.servicios),
  AmenidadItem: clone(siteData.amenidades),
  ServicioExtra: clone(siteData.serviciosExtra),
  AlimentoMenu: clone(siteData.alimentos),
  SolicitudEvento: [],
};

// id pseudo-aleatorio de 24 hex (imita los ObjectId de Base44)
function genId() {
  let s = "";
  for (let i = 0; i < 24; i++) s += Math.floor(Math.random() * 16).toString(16);
  return s;
}

// Ordena imitando el sort de Base44: "campo" asc, "-campo" desc.
// Los valores null/undefined se tratan como 0 (van primero en asc), y el
// orden es estable (conserva el orden de inserción cuando hay empates).
function sortBy(arr, sort) {
  const out = arr.map((o, i) => [o, i]);
  if (!sort) return out.map((x) => x[0]);
  const desc = sort.startsWith("-");
  const key = desc ? sort.slice(1) : sort;
  const val = (o) => {
    const v = o[key];
    return v === undefined || v === null ? 0 : v;
  };
  out.sort((a, b) => {
    const va = val(a[0]);
    const vb = val(b[0]);
    let c;
    if (typeof va === "number" && typeof vb === "number") c = va - vb;
    else c = String(va).localeCompare(String(vb));
    if (c === 0) c = a[1] - b[1]; // estable
    return desc ? -c : c;
  });
  return out.map((x) => x[0]);
}

function matches(obj, query) {
  if (!query) return true;
  return Object.keys(query).every((k) => obj[k] === query[k]);
}

function makeEntity(name) {
  const rows = () => store[name] || (store[name] = []);
  return {
    async list(sort) {
      return clone(sortBy(rows(), sort));
    },
    async filter(query, sort) {
      return clone(sortBy(rows().filter((o) => matches(o, query)), sort));
    },
    async get(id) {
      const found = rows().find((o) => o.id === id);
      return found ? clone(found) : null;
    },
    async create(data) {
      const rec = { ...clone(data), id: genId(), created_date: new Date().toISOString() };
      rows().push(rec);
      return clone(rec);
    },
    async update(id, patch) {
      const rec = rows().find((o) => o.id === id);
      if (rec) Object.assign(rec, clone(patch));
      return rec ? clone(rec) : null;
    },
    async delete(id) {
      const arr = rows();
      const idx = arr.findIndex((o) => o.id === id);
      if (idx >= 0) arr.splice(idx, 1);
      return { success: true };
    },
  };
}

const entities = new Proxy(
  {},
  {
    get(target, prop) {
      if (typeof prop !== "string") return undefined;
      if (!target[prop]) target[prop] = makeEntity(prop);
      return target[prop];
    },
  }
);

// ---- functions: envío del formulario por correo ----------------------------
const functions = {
  async invoke(name, payload) {
    if (name === "gmailSolicitud" || name === "notificarNuevaSolicitud") {
      const body = (payload && payload.data) || payload || {};
      const res = await fetch("/api/solicitud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`solicitud ${res.status}`);
      return res.json().catch(() => ({ ok: true }));
    }
    return {};
  },
};

// ---- integraciones (subida de archivos en el admin, solo en memoria) -------
const integrations = {
  Core: {
    async UploadFile({ file }) {
      // URL de objeto temporal: sirve para previsualizar en el admin durante la
      // sesión. No persiste (el sitio es estático).
      return { file_url: typeof URL !== "undefined" && file ? URL.createObjectURL(file) : "" };
    },
  },
};

// ---- auth: stubs (el sitio público no requiere autenticación) --------------
const auth = {
  async me() {
    throw new Error("auth deshabilitado en el sitio estático");
  },
  logout() {},
  redirectToLogin() {},
};

export const base44 = { entities, functions, integrations, auth };
export default base44;
