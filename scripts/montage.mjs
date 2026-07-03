// montage.mjs — hojas de contacto de la galería, etiquetadas con el índice.
// Uso: node scripts/montage.mjs  -> genera sheets en el scratchpad.
import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC = path.join(ROOT, "public");
const OUTDIR = process.argv[2] || __dirname;

const data = JSON.parse(await readFile(path.join(ROOT, "src", "data", "site-data.json"), "utf8"));
const items = data.galeria.map((g, i) => ({ idx: i + 1, url: g.imagenUrl }));

const TW = 240, TH = 180, GAP = 8, COLS = 5, PER_SHEET = 25;

function labelSvg(idx, isVideo) {
  const tag = isVideo ? `${idx}·VID` : `${idx}`;
  const w = tag.length * 18 + 16;
  return Buffer.from(
    `<svg width="${TW}" height="${TH}" xmlns="http://www.w3.org/2000/svg">
       <rect x="0" y="0" width="${w}" height="34" fill="black" fill-opacity="0.65"/>
       <text x="8" y="25" font-family="Arial" font-size="24" font-weight="bold" fill="${isVideo ? '#ff6' : '#fff'}">${tag}</text>
     </svg>`
  );
}

async function makeThumb(item) {
  const isVideo = /\.mp4$/i.test(item.url);
  let base;
  if (isVideo) {
    base = sharp({ create: { width: TW, height: TH, channels: 3, background: { r: 30, g: 30, b: 40 } } });
  } else {
    const p = path.join(PUBLIC, item.url.replace(/^\//, ""));
    try {
      base = sharp(await readFile(p)).resize(TW, TH, { fit: "cover", position: "attention" });
    } catch (e) {
      base = sharp({ create: { width: TW, height: TH, channels: 3, background: { r: 60, g: 20, b: 20 } } });
    }
  }
  const buf = await base.jpeg().toBuffer();
  return sharp(buf).composite([{ input: labelSvg(item.idx, isVideo), top: 0, left: 0 }]).jpeg({ quality: 82 }).toBuffer();
}

const sheets = [];
for (let s = 0; s < items.length; s += PER_SHEET) sheets.push(items.slice(s, s + PER_SHEET));

let sheetNo = 0;
for (const sheet of sheets) {
  sheetNo++;
  const rows = Math.ceil(sheet.length / COLS);
  const W = COLS * TW + (COLS + 1) * GAP;
  const H = rows * TH + (rows + 1) * GAP;
  const canvas = sharp({ create: { width: W, height: H, channels: 3, background: { r: 12, g: 12, b: 12 } } });
  const composites = [];
  for (let i = 0; i < sheet.length; i++) {
    const col = i % COLS, row = Math.floor(i / COLS);
    const left = GAP + col * (TW + GAP);
    const top = GAP + row * (TH + GAP);
    composites.push({ input: await makeThumb(sheet[i]), top, left });
  }
  const out = path.join(OUTDIR, `galeria-sheet-${sheetNo}.jpg`);
  await canvas.composite(composites).jpeg({ quality: 85 }).toFile(out);
  console.log(`Hoja ${sheetNo}: ${sheet.length} imgs (idx ${sheet[0].idx}-${sheet[sheet.length-1].idx}) -> ${out}`);
}
console.log("LISTO.");
