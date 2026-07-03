// reorder-galeria.mjs — reordena scripts/raw/galeria.json según un análisis visual.
// El nuevo orden se expresa como índices 1-based del orden ACTUAL.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.join(__dirname, "raw", "galeria.json");

// Orden nuevo (índices del orden actual, 1-based):
const newOrder = [
  56, 26, 4, 33, 64, 18, 3, 66,        // impacto (banquete de gala, novia a caballo, boda, jardín)
  22, 25, 2, 20, 1, 11, 46,            // banquetes y mesas elegantes
  15, 32, 31, 21, 10,                  // montajes al aire libre / detalle jardín
  36, 67, 45, 65, 47, 42, 43, 57,      // jardines exuberantes (incluye topiario de caballo)
  58, 28, 60, 55, 19, 37,              // terrenos y accesos escénicos
  51,                                  // video
  23, 7, 16, 6, 8, 5, 24,              // celebración / energía
  34, 12, 13, 14, 17, 29, 27,          // infantil / familiar
  53, 52, 62, 39, 38, 40,              // Eclipse nocturno / lounge
  9,                                   // jinete (de marca)
  48, 68, 44, 61, 30, 41, 59, 50,      // rústico / hospedaje / terrenos
  54, 63, 49, 35, 69,                  // outliers al final (muro, letrero, collage, mapa, banner)
];

const arr = JSON.parse(await readFile(RAW, "utf8"));

// Validaciones
if (newOrder.length !== arr.length) {
  throw new Error(`newOrder tiene ${newOrder.length} pero galeria tiene ${arr.length}`);
}
const seen = new Set(newOrder);
if (seen.size !== newOrder.length) throw new Error("hay índices repetidos en newOrder");
for (let i = 1; i <= arr.length; i++) if (!seen.has(i)) throw new Error(`falta el índice ${i}`);

const reordered = newOrder.map((idx) => arr[idx - 1]);
await writeFile(RAW, JSON.stringify(reordered, null, 2) + "\n", "utf8");
console.log(`galeria.json reordenado: ${reordered.length} items.`);
console.log("Primeros 8:", reordered.slice(0, 8).map((g) => g.imagenUrl.replace(/.*\//, "")).join(", "));
console.log("Últimos 5:", reordered.slice(-5).map((g) => g.imagenUrl.replace(/.*\//, "")).join(", "));
