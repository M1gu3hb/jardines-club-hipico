// gen-images.mjs — Genera imágenes faltantes con Gemini (Nano Banana).
// Usa imagen-a-imagen cuando hay una foto de referencia (para copiar el estilo
// y la luz de los espacios reales). Requiere GEMINI_API_KEY en el entorno.
//
// Uso:
//   GEMINI_API_KEY=... node scripts/gen-images.mjs            -> genera todas
//   GEMINI_API_KEY=... node scripts/gen-images.mjs trampolin  -> solo una (prueba)
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC = path.join(ROOT, "public");
const OUT = path.join(PUBLIC, "media", "gen");
const KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash-image";

if (!KEY) { console.error("Falta GEMINI_API_KEY"); process.exit(1); }

const NEGATIVE = "No incluyas texto, letras, marcas de agua ni logotipos. Fotorrealista, alta calidad, sin distorsiones.";

const jobs = [
  {
    name: "trampolin",
    out: "trampolin.png",
    ref: "/media/img/bjVFkHI.jpeg",
    prompt:
      "Usa esta foto real del área infantil ajardinada como referencia del entorno, la luz y el estilo. " +
      "En el pasto, coloca un gran trampolín (brincolín) circular para niños con malla de seguridad, realista, " +
      "integrado naturalmente en el jardín, luz de día suave, sin personas. " + NEGATIVE,
  },
  {
    name: "montaje",
    out: "montaje.png",
    ref: "/media/img/GqNFCgG.jpeg",
    prompt:
      "Usa este salón de eventos como referencia del estilo y la iluminación. " +
      "Muestra a personal de banquetes montando el salón: mesas redondas a medio vestir con manteles, " +
      "sillas tiffany doradas acomodándose, algún carrito de servicio, ambiente de trabajo de montaje, " +
      "cálido y elegante, realista. " + NEGATIVE,
  },
  {
    name: "sanitarios",
    out: "sanitarios.png",
    ref: null,
    prompt:
      "Interior fotorrealista de baños amplios, limpios y elegantes de un salón de eventos de lujo: " +
      "lavabos modernos, espejos grandes con marco dorado, acabados en madera y mármol, iluminación cálida ambiental, " +
      "impecables, sin personas, estética sobria negra y dorada. Encuadre horizontal. " + NEGATIVE,
  },
  {
    name: "seguridad",
    out: "seguridad.png",
    ref: null,
    prompt:
      "Un guardia de seguridad privada profesional, de uniforme oscuro, de pie y de espaldas o de perfil " +
      "cuidando la entrada de un elegante salón de eventos por la noche, con luces cálidas de series al fondo, " +
      "ambiente sereno y seguro, fotorrealista, sin mostrar rostros con detalle. Encuadre horizontal. " + NEGATIVE,
  },
  {
    name: "horarios",
    out: "horarios.png",
    ref: null,
    prompt:
      "Un jardín de eventos elegante al atardecer, en hora dorada pasando a la noche, con luces cálidas de series " +
      "encendiéndose, mesas vestidas listas y vegetación cuidada, transmitiendo eventos a cualquier horario, " +
      "fotorrealista, sin personas, sobrio y aspiracional. Encuadre horizontal. " + NEGATIVE,
  },
];

async function toInline(relPath) {
  const p = path.join(PUBLIC, relPath.replace(/^\//, ""));
  const buf = await readFile(p);
  const ext = path.extname(p).toLowerCase();
  const mime = ext === ".png" ? "image/png" : "image/jpeg";
  return { inlineData: { mimeType: mime, data: buf.toString("base64") } };
}

async function generate(job, attempt = 1) {
  const parts = [{ text: job.prompt }];
  if (job.ref) parts.push(await toInline(job.ref));
  const body = { contents: [{ role: "user", parts }] };
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": KEY, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      console.log(`ERROR ${job.name} HTTP ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
      return false;
    }
    const partsOut = json.candidates?.[0]?.content?.parts || [];
    const imgPart = partsOut.find((p) => p.inlineData || p.inline_data);
    const inline = imgPart?.inlineData || imgPart?.inline_data;
    if (!inline) {
      const finish = json.candidates?.[0]?.finishReason;
      console.log(`SIN IMAGEN ${job.name} (finishReason=${finish}): ${JSON.stringify(json).slice(0, 300)}`);
      return false;
    }
    const buf = Buffer.from(inline.data, "base64");
    await mkdir(OUT, { recursive: true });
    await writeFile(path.join(OUT, job.out), buf);
    console.log(`OK ${job.name} -> media/gen/${job.out} (${(buf.length / 1024).toFixed(0)} KB)`);
    return true;
  } catch (e) {
    if (attempt < 3) { await new Promise((r) => setTimeout(r, 1500 * attempt)); return generate(job, attempt + 1); }
    console.log(`FALLO ${job.name}: ${e.message}`);
    return false;
  }
}

const only = process.argv[2];
const run = only ? jobs.filter((j) => j.name === only) : jobs;
for (const j of run) {
  await generate(j);
  await new Promise((r) => setTimeout(r, 800));
}
console.log("LISTO.");
