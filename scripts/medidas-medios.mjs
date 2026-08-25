/**
 * medidas-medios.mjs — mide los medios auto-hospedados y escribe sus dimensiones.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * QUÉ PROBLEMA RESUELVE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * El salto de la página al cargar. Un `<img>` sin dimensiones ocupa cero alto hasta que la
 * imagen llega; cuando llega, empuja todo lo que tiene debajo. En una galería de 68 piezas eso
 * es la página entera moviéndose durante varios segundos, justo mientras alguien intenta tocar
 * una foto — y acaba tocando otra.
 *
 * Google lo mide como CLS y es una de las tres métricas que decide si un sitio se considera
 * rápido. Pero antes que eso: es molesto de verdad.
 *
 * ── Por qué se puede resolver aquí y no en el navegador ─────────────────────
 *
 * Porque **los medios de este sitio están auto-hospedados** en `public/media/`. No son URLs de
 * un tercero: son archivos en disco durante el build, así que se pueden abrir y leer su
 * cabecera. La base guarda la dirección de la imagen, no su tamaño, y añadir dos columnas
 * obligaría al dueño a teclear números que el archivo ya sabe.
 *
 * ── Cómo lee las medidas sin ninguna dependencia ────────────────────────────
 *
 * Los cuatro formatos que hay aquí llevan el ancho y el alto en los primeros bytes, y cada uno
 * en su sitio. Son unas pocas líneas por formato y evitan meter una librería de imágenes en un
 * proyecto que no procesa imágenes.
 *
 * Lo que NO se lee: video. Un `<video>` no provoca el mismo salto porque su contenedor ya
 * suele tener proporción fija, y leer las cabeceras de MP4 sí necesitaría una dependencia.
 *
 *   node scripts/medidas-medios.mjs
 */
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';

const RAIZ = resolve(process.cwd());
const MEDIOS = join(RAIZ, 'public', 'media');
const DESTINO = join(RAIZ, 'src', 'data', 'medidas-medios.json');

/** PNG: firma de 8 bytes y luego el bloque IHDR, con ancho y alto en 32 bits big-endian. */
function png(b) {
  if (b.length < 24) return null;
  if (b.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

/**
 * JPEG: hay que recorrer los marcadores hasta dar con un SOF, que es el que lleva las medidas.
 * No están a un desplazamiento fijo porque antes puede haber miniaturas, perfiles de color y
 * metadatos de la cámara, cada uno de un largo distinto.
 */
function jpeg(b) {
  if (b.length < 4 || b.readUInt16BE(0) !== 0xffd8) return null;
  let i = 2;
  while (i < b.length - 9) {
    if (b[i] !== 0xff) { i += 1; continue; }
    const marcador = b[i + 1];
    // SOF0-SOF3, SOF5-SOF7, SOF9-SOF11, SOF13-SOF15. Se saltan DHT (c4), JPG (c8) y DAC (cc),
    // que caen en el mismo rango y NO llevan medidas.
    const esSOF = marcador >= 0xc0 && marcador <= 0xcf
      && marcador !== 0xc4 && marcador !== 0xc8 && marcador !== 0xcc;
    if (esSOF) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    const largo = b.readUInt16BE(i + 2);
    if (largo < 2) return null;
    i += 2 + largo;
  }
  return null;
}

/** GIF: ancho y alto en 16 bits little-endian, justo después de la firma. */
function gif(b) {
  if (b.length < 10 || b.toString('ascii', 0, 3) !== 'GIF') return null;
  return { w: b.readUInt16LE(6), h: b.readUInt16LE(8) };
}

/** WebP: contenedor RIFF con tres variantes, y cada una guarda las medidas distinto. */
function webp(b) {
  if (b.length < 30) return null;
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null;
  const tipo = b.toString('ascii', 12, 16);
  if (tipo === 'VP8X') return { w: (b.readUIntLE(24, 3) & 0xffffff) + 1, h: (b.readUIntLE(27, 3) & 0xffffff) + 1 };
  if (tipo === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  if (tipo === 'VP8L') {
    const n = b.readUInt32LE(21);
    return { w: (n & 0x3fff) + 1, h: ((n >> 14) & 0x3fff) + 1 };
  }
  return null;
}

const LECTORES = { '.png': png, '.jpg': jpeg, '.jpeg': jpeg, '.gif': gif, '.webp': webp };

function recorre(dir, base) {
  const salida = {};
  if (!existsSync(dir)) return salida;
  for (const f of readdirSync(dir)) {
    const ruta = join(dir, f);
    if (statSync(ruta).isDirectory()) {
      Object.assign(salida, recorre(ruta, base + '/' + f));
      continue;
    }
    const lector = LECTORES[extname(f).toLowerCase()];
    if (!lector) continue;
    try {
      // Basta la cabecera: leer 65 kB de un JPEG de 4 MB es una milésima del trabajo, y con eso
      // se pasan de sobra los metadatos de cualquier cámara.
      const fd = readFileSync(ruta).subarray(0, 65536);
      const m = lector(fd);
      if (m && m.w > 0 && m.h > 0) salida[base + '/' + f] = [m.w, m.h];
    } catch { /* un archivo ilegible no rompe el build: simplemente no tiene medidas */ }
  }
  return salida;
}

const medidas = recorre(MEDIOS, '/media');
const ordenadas = Object.fromEntries(Object.keys(medidas).sort().map((k) => [k, medidas[k]]));

writeFileSync(DESTINO, JSON.stringify(ordenadas) + '\n', 'utf8');
console.log(`  medidas de ${Object.keys(ordenadas).length} imagenes -> src/data/medidas-medios.json`);
