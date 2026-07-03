// build-media.mjs
// Descarga TODOS los medios (imgur, base44, frames de la animación) a /public/media,
// limpia artefactos de URL y genera src/data/site-data.json con rutas locales.
//
// Uso:  node scripts/build-media.mjs
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const RAW = path.join(__dirname, "raw");
const PUBLIC = path.join(ROOT, "public");
const DATA_OUT = path.join(ROOT, "src", "data");

const B44_BASE = "https://media.base44.com/images/public/69a46e04d7fbcd832a04a895/";

// ---- helpers ---------------------------------------------------------------
const readJson = async (p) => JSON.parse(await readFile(p, "utf8"));

// Limpia una URL: quita espacios y el artefacto " ×" al final. Devuelve "" si vacío.
function clean(url) {
  if (!url || typeof url !== "string") return "";
  let u = url.trim();
  // corta en el primer espacio (elimina " ×" y basura al final)
  u = u.split(/\s+/)[0];
  return u.trim();
}

// Deriva la ruta local (web) para una URL remota. Devuelve null si no se toca.
function localFor(url) {
  const u = clean(url);
  if (!u) return null;
  let m;
  if ((m = u.match(/^https?:\/\/i\.imgur\.com\/([A-Za-z0-9]+)\.([A-Za-z0-9]+)/))) {
    return `/media/img/${m[1]}.${m[2].toLowerCase()}`;
  }
  if ((m = u.match(/^https?:\/\/media\.base44\.com\/.*\/([^/?#]+)$/))) {
    return `/media/b44/${m[1]}`;
  }
  return null; // deja intacto (p.ej. Google Drive PDF)
}

// Reescribe una URL a su ruta local si aplica; si no, la deja limpia.
function rewrite(url) {
  const local = localFor(url);
  if (local) return local;
  return clean(url);
}

// Colección remote->local para descargar
const downloads = new Map(); // local -> remote

function register(url) {
  const u = clean(url);
  if (!u) return;
  const local = localFor(u);
  if (local && !downloads.has(local)) downloads.set(local, u);
}

// ---- 1. cargar datos crudos ------------------------------------------------
const [config0, salones, galeria, servicios, amenidades, serviciosExtra, alimentos] =
  await Promise.all([
    readJson(path.join(RAW, "config.json")),
    readJson(path.join(RAW, "salones.json")),
    readJson(path.join(RAW, "galeria.json")),
    readJson(path.join(RAW, "servicios.json")),
    readJson(path.join(RAW, "amenidades.json")),
    readJson(path.join(RAW, "serviciosExtra.json")),
    readJson(path.join(RAW, "alimentos.json")),
  ]);

const config = config0[0] || {};

// ---- 2. videos del hero (hardcodeados en HeroSection) ----------------------
const HERO_VIDEOS = [
  "https://i.imgur.com/NBa3E9g.mp4",
  "https://i.imgur.com/uykWsK9.mp4",
];
HERO_VIDEOS.forEach(register);

// ---- 3. frames de la animación de scroll -----------------------------------
// Se leen del componente original exportado por Base44 (carpeta ../extracted).
// Si esa carpeta ya no existe (los frames ya están en public/media/frames),
// se omite la descarga y se cuentan los que hay en disco.
const extractedScroll = path.join(ROOT, "..", "extracted", "src", "components", "ScrollAnimationSection.jsx");
const frames = [];
if (existsSync(extractedScroll)) {
  const scrollSrc = await readFile(extractedScroll, "utf8");
  const frameRe = /"([A-Za-z0-9]+_ezgif-frame-(\d+)\.jpg)"/g;
  let fm;
  while ((fm = frameRe.exec(scrollSrc)) !== null) {
    const filename = fm[1];
    const n = fm[2].padStart(3, "0");
    frames.push({ remote: B44_BASE + filename, local: `/media/frames/frame-${n}.jpg` });
  }
  for (const f of frames) if (!downloads.has(f.local)) downloads.set(f.local, f.remote);
}
const framesTotal = frames.length || 241;

// ---- 4. registrar todos los medios de los datos ----------------------------
register(config.logoUrl);
register(config.proximamenteImagenUrl);

for (const s of salones) {
  register(s.imagenPrincipal);
  (s.imagenes || []).forEach(register);
}
for (const g of galeria) register(g.imagenUrl);
for (const it of [...servicios, ...amenidades]) {
  register(it.imagenUrl);
  (it.imagenesUrl || []).forEach(register);
}

// ---- 5. descargar ----------------------------------------------------------
async function ensureDir(p) { await mkdir(p, { recursive: true }); }

async function download(local, remote, attempt = 1) {
  const dest = path.join(PUBLIC, local.replace(/^\//, ""));
  if (existsSync(dest)) {
    const st = await stat(dest);
    if (st.size > 0) return { local, ok: true, skipped: true };
  }
  await ensureDir(path.dirname(dest));
  try {
    const res = await fetch(remote, { redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0) throw new Error("empty body");
    await writeFile(dest, buf);
    return { local, ok: true, bytes: buf.length };
  } catch (e) {
    if (attempt < 4) {
      await new Promise((r) => setTimeout(r, 500 * attempt));
      return download(local, remote, attempt + 1);
    }
    return { local, ok: false, error: e.message, remote };
  }
}

const entries = [...downloads.entries()]; // [local, remote]
console.log(`Total medios a descargar: ${entries.length} (frames: ${frames.length})`);

const CONCURRENCY = 8;
const results = [];
let idx = 0;
async function worker() {
  while (idx < entries.length) {
    const i = idx++;
    const [local, remote] = entries[i];
    const r = await download(local, remote);
    results.push(r);
    if (results.length % 25 === 0) console.log(`  ${results.length}/${entries.length}...`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const failed = results.filter((r) => !r.ok);
const skipped = results.filter((r) => r.skipped).length;
console.log(`Descargados: ${results.length - failed.length}/${entries.length} (saltados ya existentes: ${skipped})`);
if (failed.length) {
  console.log("FALLIDOS:");
  for (const f of failed) console.log(`  ${f.local}  <-  ${f.remote}  (${f.error})`);
}

// ---- 6. generar site-data.json con rutas locales ---------------------------
const outConfig = { ...config };
for (const k of Object.keys(outConfig)) {
  if (typeof outConfig[k] === "string" && /^https?:\/\/(i\.imgur\.com|media\.base44\.com)/.test(outConfig[k].trim())) {
    outConfig[k] = rewrite(outConfig[k]);
  }
}

const outSalones = salones.map((s) => ({
  ...s,
  imagenPrincipal: rewrite(s.imagenPrincipal),
  imagenes: (s.imagenes || []).map(rewrite).filter(Boolean),
}));

const outGaleria = galeria.map((g) => ({ ...g, imagenUrl: rewrite(g.imagenUrl) })).filter((g) => g.imagenUrl);

const mapItems = (arr) =>
  arr.map((it) => ({
    ...it,
    imagenUrl: it.imagenUrl ? rewrite(it.imagenUrl) : it.imagenUrl,
    imagenesUrl: (it.imagenesUrl || []).map(rewrite).filter(Boolean),
  }));

const siteData = {
  config: outConfig,
  salones: outSalones,
  galeria: outGaleria,
  servicios: mapItems(servicios),
  amenidades: mapItems(amenidades),
  serviciosExtra,
  alimentos,
  framesTotal,
};

await ensureDir(DATA_OUT);
await writeFile(path.join(DATA_OUT, "site-data.json"), JSON.stringify(siteData, null, 2), "utf8");
console.log(`\nsite-data.json generado en src/data/ (framesTotal=${framesTotal})`);
console.log("LISTO.");
