/* ════════════════════════════════════════════════════════════════════════════
 * medir-contraste-pantallas.mjs — qué literales de color son ilegibles
 *
 * Recorre un directorio de componentes y lista cada literal de color de TEXTO con su
 * contraste sobre `--fondo` (#0a0a0a), ordenado por el peor.
 *
 * Fórmula: WCAG 2.1 — luminancia relativa, y el alfa COMPUESTO sobre el fondo antes de medir
 * (un color translúcido no contrasta por su color puro, sino por lo que se ve al mezclarlo).
 *
 *     node scripts/medir-contraste-pantallas.mjs                  → src/components
 *     node scripts/medir-contraste-pantallas.mjs src              → todo src/
 *     node scripts/medir-contraste-pantallas.mjs --archivos       → y el reparto por pantalla
 *
 * ── DEJÓ DE SER DE UN SOLO USO ─────────────────────────────────────────────
 *
 * La cabecera decía «script de UN SOLO USO (D-1.9)… se borra cuando D-1.9 esté cerrado». No se
 * borra: `07-DISENO.md` §8 lo convierte en instrumento permanente del portal, y una deuda que
 * solo se puede medir con una herramienta que se iba a borrar no se puede cerrar dos veces.
 *
 * Y **es copia byte a byte en los tres repos** desde el 2026-08-28, por un motivo medido: el
 * portal tiene 103 ocurrencias por debajo de 4.5:1 frente a las 43 del CRM, y no tenía forma de
 * verlo. Un medidor que solo vive donde el problema es menor no sirve de nada.
 *
 * ── LO QUE MIDE, Y LO QUE **NO** · leer antes de citar un número ────────────
 *
 * Mide un **límite inferior**, no el contraste real. Asume que todo texto va sobre el fondo más
 * oscuro del tema, porque no lee ninguna clase `bg-*` ni resuelve variables CSS. Consecuencias
 * que hay que conocer para no perseguir fantasmas:
 *
 *   · `text-black` sale a 1.06:1 y `text-[#0a0a0a]` a 1.00:1. **Son falsos positivos
 *     estructurales**: van sobre el botón dorado, donde el contraste real supera 8:1. Antes de
 *     «arreglar» uno, leer la clase `bg-*` del mismo elemento.
 *   · No distingue texto grande, cuyo mínimo AA es 3.0 y no 4.5. Algún literal marcado podría
 *     ser conforme a 18.66 px en negrita.
 *   · Solo mira el directorio que se le pasa. Los tokens de `src/styles/` y de `src/index.css`
 *     quedan fuera: para la ESCALA está `medir-contraste-tokens.mjs`, que sí mide pares
 *     declarados y compone los translúcidos contra su fondo real. Son complementarios.
 *
 * Sirve para **priorizar**, no para certificar. Una certificación mide el par realmente
 * renderizado sobre la página viva.
 * ════════════════════════════════════════════════════════════════════════════ */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(fileURLToPath(new URL(".", import.meta.url)), "..");
/* El primer argumento que no sea una bandera es el directorio a recorrer, relativo al repo.
   Sin él, `src/components`, que es lo que se medía cuando esto era de un solo uso. */
const SUBDIR = process.argv.slice(2).find((a) => !a.startsWith("--")) || "src/components";
const FONDO = [10, 10, 10]; // #0a0a0a — el token `--fondo`
const MINIMO = 4.5;

/* ── la paleta de Tailwind, leída de la propia dependencia ─────────────────── */
const { default: paletaTW } = await import("tailwindcss/colors.js");

/* ── color → rgb ──────────────────────────────────────────────────────────── */
const hexARgb = (h) => {
  const n = h.replace("#", "");
  const full = n.length === 3 ? n.split("").map((c) => c + c).join("") : n.slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};

const luminancia = ([r, g, b]) =>
  [r, g, b]
    .map((x) => x / 255)
    .map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4))
    .reduce((acc, c, i) => acc + [0.2126, 0.7152, 0.0722][i] * c, 0);

const contraste = (a, b) => {
  const [hi, lo] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/**
 * Compone el alfa sobre el fondo y mide.
 *
 * ── EL `Math.round` NO ES COSMÉTICO ─────────────────────────────────────────
 *
 * Sin él, `text-white/45` daba **4.50:1** y pasaba. El canal compuesto sale 255·0.45 + 10·0.55 =
 * **120.25**, y la pantalla no puede pintar 120.25: pinta **120**. Con el valor entero el ratio
 * real es **4.48:1**, o sea que ese literal NO cumple AA — y estaba en seis archivos dándose por
 * bueno.
 *
 * Es un cuarto de centésima de diferencia, y justo por eso importa: solo cambia el veredicto de
 * los valores que están en el filo, que son exactamente los que alguien eligió pensando «con
 * esto llego». Un medidor que redondea a su favor es peor que no tenerlo, porque da permiso.
 */
const medir = (rgb, alfa) =>
  contraste(rgb.map((c, i) => Math.round(c * alfa + FONDO[i] * (1 - alfa))), FONDO);

/* ── resolver el color de una clase de Tailwind ───────────────────────────── */
function resolver(base) {
  if (base === "white") return [255, 255, 255];
  if (base === "black") return [0, 0, 0];
  const arb = base.match(/^\[#([0-9a-f]{3,8})\]$/i);
  if (arb) return hexARgb(arb[1]);
  const nom = base.match(/^([a-z]+)-(\d{2,3})$/);
  if (nom && paletaTW[nom[1]] && paletaTW[nom[1]][nom[2]]) {
    const v = paletaTW[nom[1]][nom[2]];
    if (typeof v === "string" && v.startsWith("#")) return hexARgb(v);
  }
  return null;
}

/* ── recorrido ────────────────────────────────────────────────────────────── */
function archivos(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...archivos(p));
    else if (/\.(jsx?|tsx?)$/.test(e)) out.push(p);
  }
  return out;
}

// `text-white/30`, `hover:text-[#C9A84C]/70`, `group-hover:text-red-400`…
const RE_TW = /(?:^|[\s"'`{])((?:[a-z-]+(?:\[[^\]]*\])?:)*)text-(\[#[0-9A-Fa-f]{3,8}\]|white|black|[a-z]+-\d{2,3})(?:\/(\d{1,3}))?(?=[\s"'`}]|$)/g;
// `color: "#C9A84C"` · `color: "rgba(255,255,255,.4)"`
const RE_INLINE = /\bcolor:\s*["'`](#[0-9A-Fa-f]{3,8}|rgba?\([^)]*\))["'`]/g;

const hallazgos = new Map(); // literal → { rgb, alfa, veces, archivos:Set }

const anota = (literal, rgb, alfa, arch) => {
  if (!hallazgos.has(literal)) hallazgos.set(literal, { rgb, alfa, veces: 0, archivos: new Set() });
  const h = hallazgos.get(literal);
  h.veces += 1;
  h.archivos.add(arch);
};

for (const ruta of archivos(join(RAIZ, SUBDIR))) {
  const src = readFileSync(ruta, "utf8");
  const corto = relative(RAIZ, ruta).replace(/\\/g, "/");

  for (const m of src.matchAll(RE_TW)) {
    const [, variantes, base, op] = m;
    const rgb = resolver(base);
    if (!rgb) continue;
    const alfa = op === undefined ? 1 : Number(op) / 100;
    anota(`${variantes}text-${base}${op === undefined ? "" : `/${op}`}`, rgb, alfa, corto);
  }

  for (const m of src.matchAll(RE_INLINE)) {
    const v = m[1];
    if (v.startsWith("#")) anota(`color:${v}`, hexARgb(v), 1, corto);
    else {
      const n = v.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?/);
      if (n) anota(`color:${v}`, [1, 2, 3].map((i) => Number(n[i])), n[4] === undefined ? 1 : Number(n[4]), corto);
    }
  }
}

/* ── informe ──────────────────────────────────────────────────────────────── */
const filas = [...hallazgos.entries()]
  .map(([literal, h]) => ({ literal, ratio: medir(h.rgb, h.alfa), veces: h.veces, archivos: h.archivos }))
  .sort((a, b) => a.ratio - b.ratio || b.veces - a.veces);

let bajos = 0, ocurrenciasBajas = 0;
const anchoL = Math.max(...filas.map((f) => f.literal.length));

console.log(`\nLiterales de color de TEXTO en src/components/, sobre #0a0a0a (WCAG 2.1)`);
console.log(`${"literal".padEnd(anchoL)}  contraste   veces  archivos  ok\n${"─".repeat(anchoL + 32)}`);
for (const f of filas) {
  const ok = f.ratio >= MINIMO;
  if (!ok) { bajos += 1; ocurrenciasBajas += f.veces; }
  console.log(
    `${f.literal.padEnd(anchoL)}  ${f.ratio.toFixed(2).padStart(6)}:1  ${String(f.veces).padStart(5)}  ${String(f.archivos.size).padStart(8)}  ${ok ? "OK" : "NO"}`,
  );
}
console.log(
  `\n${filas.length} literales distintos · ${bajos} por debajo de ${MINIMO}:1 ` +
  `(${ocurrenciasBajas} ocurrencias)\n`,
);

if (process.argv.includes("--archivos")) {
  console.log("Pantallas con al menos un literal por debajo de 4.5:1:\n");
  const porArchivo = new Map();
  for (const f of filas.filter((x) => x.ratio < MINIMO))
    for (const a of f.archivos) porArchivo.set(a, (porArchivo.get(a) || 0) + 1);
  for (const [a, n] of [...porArchivo].sort((x, y) => y[1] - x[1])) console.log(`  ${String(n).padStart(3)}  ${a}`);
  console.log();
}
