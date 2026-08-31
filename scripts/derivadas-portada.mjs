#!/usr/bin/env node
/**
 * derivadas-portada.mjs — versiones ligeras de las fotos que acaban siendo la portada
 * de una invitación.  (D-P-12)
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * QUÉ PROBLEMA RESUELVE, Y POR QUÉ NO ES «MENOR»
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Cuando una clienta no sube su propia foto, la invitación usa **la imagen del salón** como
 * portada. Esas imágenes se auto-hospedan sin reducir. Medido el 2026-08-31 pidiéndolas a
 * producción:
 *
 *     GqNFCgG.jpeg    563 kB      cQFcFEC.jpeg    900 kB
 *     9NiMw7K.png     591 kB      F6GeNNq.png   1 011 kB
 *     bjVFkHI.jpeg    570 kB      GsY3zXF.png   1 969 kB
 *     kgI3kqI.jpg   2 747 kB      WvvLXxr.jpg   3 024 kB
 *
 * Eso son hasta **3 MB por abrir una invitación**, casi siempre desde datos móviles y casi
 * siempre en una boda donde el enlace se reparte a decenas de personas a la vez.
 *
 * Y hay una consecuencia peor que la lentitud, que es la que convierte esto en un fallo y no en
 * una molestia: **esa misma URL es el `og:image`** que `api/invitacion-og.js` le da a WhatsApp.
 * Los previsualizadores de mensajería descartan las imágenes grandes, así que la tarjeta se
 * queda sin foto — que es exactamente lo que esa función existe para arreglar.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * QUÉ HACE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Por cada imagen que puede ser portada escribe `public/media/img/min/<base>.webp`, de 1400 px
 * de ancho como mucho. No toca el original: la galería del sitio público sigue sirviendo la
 * foto grande, que es donde tiene sentido.
 *
 * ── La lista sale de `site-data.json`, no de aquí ───────────────────────────
 *
 * De `salones[].imagenPrincipal`. Escribir ocho nombres a mano estaría mal en cuanto el dueño
 * añadiera un salón, y el síntoma sería una invitación pesada — que nadie mira.
 *
 * ── Y se puede comprobar que no está vieja ──────────────────────────────────
 *
 * Se escribe `min/derivadas.json` con el **sha256 del original** en el momento de generar. Si
 * alguien reemplaza la foto de un salón y no vuelve a correr esto, la derivada se queda vieja y
 * **la invitación enseñaría otra foto distinta a la del sitio** — un fallo silencioso de los
 * caros. Un contrato recalcula esos hashes y falla.
 *
 *   node scripts/derivadas-portada.mjs
 *
 * NO va dentro de `npm run build`: son ocho archivos que cambian de higos a brevas y que se
 * commitean. Meterlo en el build gastaría sharp en cada despliegue de Vercel para no cambiar
 * nada. Lo que sí va en el build es el CONTRATO que comprueba que están al día.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve, basename, extname } from "node:path";
import sharp from "sharp";

const RAIZ = resolve(process.cwd());
const IMG = join(RAIZ, "public", "media", "img");
const MIN = join(IMG, "min");
const ANCHO = 1400;
const CALIDAD = 78;

const datos = JSON.parse(readFileSync(join(RAIZ, "src", "data", "site-data.json"), "utf8"));
const rutas = [...new Set(
  (datos.salones || [])
    .map((s) => s.imagenPrincipal)
    .filter((u) => typeof u === "string" && u.startsWith("/media/img/")),
)].sort();

if (rutas.length === 0) {
  console.error("[derivadas] ningún salón tiene `imagenPrincipal`: revisa site-data.json");
  process.exit(1);
}

mkdirSync(MIN, { recursive: true });

const manifiesto = {};
let antes = 0;
let despues = 0;

for (const ruta of rutas) {
  const nombre = basename(ruta);
  const origen = join(IMG, nombre);
  if (!existsSync(origen)) {
    console.error(`[derivadas] FALTA el original ${ruta} — no se puede derivar`);
    process.exit(1);
  }
  const bytes = readFileSync(origen);
  const destino = join(MIN, basename(nombre, extname(nombre)) + ".webp");

  await sharp(bytes)
    .rotate()                       // respeta la orientación EXIF antes de redimensionar
    .resize({ width: ANCHO, withoutEnlargement: true })
    .webp({ quality: CALIDAD })
    .toFile(destino);

  antes += bytes.length;
  despues += statSync(destino).size;
  manifiesto[ruta] = createHash("sha256").update(bytes).digest("hex");

  console.log(
    `  ${nombre.padEnd(16)} ${String(Math.round(bytes.length / 1024)).padStart(5)} kB` +
    `  ->  ${basename(destino).padEnd(16)} ${String(Math.round(statSync(destino).size / 1024)).padStart(4)} kB`,
  );
}

writeFileSync(join(MIN, "derivadas.json"), JSON.stringify(manifiesto, null, 2) + "\n", "utf8");
console.log(
  `\n[derivadas] ${rutas.length} portadas · ${Math.round(antes / 1024)} kB -> ${Math.round(despues / 1024)} kB` +
  ` (${Math.round((1 - despues / antes) * 100)}% menos)`,
);
