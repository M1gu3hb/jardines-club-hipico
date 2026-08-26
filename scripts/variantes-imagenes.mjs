/**
 * variantes-imagenes.mjs — genera las versiones redimensionadas como ARCHIVOS ESTÁTICOS.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * POR QUÉ SE DEJÓ DE OPTIMIZAR EN EL BORDE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * La primera versión servía las imágenes con `/_vercel/image`, el optimizador del propio
 * borde. Sobre el papel era mejor: sin archivos nuevos, sin tiempo de build y con negociación
 * de formato. **Y en la práctica salió peor que antes.**
 *
 * La medición, tomada con la Resource Timing API sobre la galería en producción y con la caché
 * del borde YA CALIENTE (se pre-calentaron las 552 variantes, 0 fallos):
 *
 *   · tamaño por imagen ....... 8-19 kB
 *   · tiempo de DESCARGA ...... 0 ms
 *   · TTFB .................... 110-920 ms
 *   · BLOQUEADO EN COLA ....... media 1 780 ms, máximo 4 725 ms
 *   · total por imagen ........ 2 087 ms de media
 *
 * O sea: **el peso ya no era el problema.**
 *
 * La razón, corregida después de medirla de verdad: NO es que el estático tenga mejor TTFB. Se
 * comprobó petición a petición y hay paridad (81 · 90 · 130 ms el estático contra 74 · 95 ·
 * 100 ms el optimizador). Lo que cambia es **quién manda en la caché**: el optimizador servía
 * `Cache-Control: max-age=0, must-revalidate`, y un `304` vacío cuesta de 350 a 530 ms — por 69
 * fotos, en cada visita. Un archivo propio lleva `max-age=31536000, immutable` y la segunda
 * visita no pide nada.
 *
 * Medido antes y después, misma galería en producción: en cola 1 780 → 734 ms de mediana en la
 * primera visita; y en la segunda, 69 de 69 desde caché con 21 ms de mediana.
 *
 * Es lo que hacen los sitios donde la fotografía es el producto: no transforman bajo demanda,
 * pre-generan — y así son dueños de su caché.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * LA TRAMPA AL REEMPLAZAR UNA FOTO — leer antes de sustituir nada en `public/media/`
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Este script **salta lo que ya existe**, y las variantes se sirven con caché de un año marcada
 * `immutable`. Las dos cosas juntas significan que **cambiar un archivo de `public/media/` sin
 * cambiarle el nombre no surte efecto**: no se regeneran sus variantes, y las que ya estén en el
 * navegador de alguien seguirán ahí durante un año.
 *
 * Para reemplazar una foto: dale un nombre distinto, o borra a mano sus variantes de dentro de
 * `public/v/` —hay una por cada ancho— antes de volver a lanzar el script. Añadir fotos nuevas
 * no tiene este problema.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * POR QUÉ WEBP Y NO AVIF
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Medido en esta máquina sobre una foto de 4608 px, a 512 px de ancho:
 *
 *   · WebP calidad 85 → 25 kB en 132 ms
 *   · AVIF calidad 60 → 17 kB en 443 ms
 *
 * AVIF pesa 8 kB menos y cuesta más del triple de tiempo de codificación. Con 449 imágenes por
 * seis anchos son unos cinco minutos en WebP frente a más de veinte en AVIF — y ocho kilobytes
 * no cambian nada cuando el cuello era el número de peticiones, no su tamaño.
 *
 * WebP además lo entiende cualquier navegador vivo, así que no hace falta doble juego.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * CÓMO SE USA
 * ══════════════════════════════════════════════════════════════════════════════
 *
 *   node scripts/variantes-imagenes.mjs
 *
 * NO corre en cada build a propósito: las variantes se generan una vez y se versionan. Un
 * build que reprocesa 449 imágenes añade minutos a cada despliegue para producir exactamente
 * lo mismo. El script salta lo que ya existe, así que volver a lanzarlo tras añadir fotos solo
 * procesa las nuevas.
 *
 * Escribe además `src/data/variantes.json`, el manifiesto que dice qué anchos existen de cada
 * imagen. El navegador no puede mirar el disco: sin ese manifiesto, `srcset` ofrecería
 * direcciones que quizá no existen.
 */

import { readdir, stat, mkdir, writeFile, access } from 'node:fs/promises';
import { join, relative, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGEN = join(RAIZ, 'public', 'media');
const DESTINO = join(RAIZ, 'public', 'v');
const MANIFIESTO = join(RAIZ, 'src', 'data', 'variantes.json');

/**
 * Los anchos que se generan.
 *
 * Seis escalones, con saltos de un tercio como mucho: un hueco de 455 px encuentra 512 sin
 * tener que conformarse con 384 —que lo ampliaría y se vería borroso— ni cargar 768.
 *
 * 1600 es el techo porque es lo que ocupa el visor a pantalla completa con sus márgenes.
 */
const ANCHOS = [256, 384, 512, 768, 1024, 1600];

/** 85 en WebP es visualmente indistinguible del original a tamaño de pantalla. */
const CALIDAD = 85;

const EXTENSIONES = new Set(['.jpg', '.jpeg', '.png', '.webp']);

async function existe(ruta) {
  try {
    await access(ruta);
    return true;
  } catch {
    return false;
  }
}

async function* recorrer(dir) {
  for (const entrada of await readdir(dir, { withFileTypes: true })) {
    const ruta = join(dir, entrada.name);
    if (entrada.isDirectory()) yield* recorrer(ruta);
    else yield ruta;
  }
}

async function main() {
  const manifiesto = {};
  let generadas = 0;
  let saltadas = 0;
  let fallos = 0;
  const inicio = Date.now();

  const archivos = [];
  for await (const ruta of recorrer(ORIGEN)) {
    if (EXTENSIONES.has(extname(ruta).toLowerCase())) archivos.push(ruta);
  }

  console.log(`  ${archivos.length} imagenes que procesar`);

  for (const ruta of archivos) {
    const rel = relative(ORIGEN, ruta).split('\\').join('/');
    const clave = `/media/${rel}`;
    const sinExt = rel.replace(/\.[^.]+$/, '');

    let meta;
    try {
      meta = await sharp(ruta).metadata();
    } catch {
      fallos += 1;
      continue;
    }

    // Solo se generan anchos que no AMPLÍEN. Ampliar produce un archivo más pesado que el
    // original y una imagen peor: es trabajo para empeorar el resultado.
    const utiles = ANCHOS.filter((a) => a <= (meta.width || 0));
    if (utiles.length === 0) {
      // Imagen más pequeña que el escalón mínimo: se sirve tal cual, sin variantes.
      saltadas += 1;
      continue;
    }

    const hechos = [];
    for (const ancho of utiles) {
      const salida = join(DESTINO, String(ancho), `${sinExt}.webp`);
      if (await existe(salida)) {
        hechos.push(ancho);
        saltadas += 1;
        continue;
      }
      try {
        await mkdir(dirname(salida), { recursive: true });
        await sharp(ruta)
          // `fit: inside` conserva la proporción y no recorta: el recorte lo decide el CSS
          // de cada sitio con `object-cover`, no este script.
          .resize({ width: ancho, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: CALIDAD })
          .toFile(salida);
        hechos.push(ancho);
        generadas += 1;
      } catch {
        fallos += 1;
      }
    }

    if (hechos.length > 0) manifiesto[clave] = hechos;
  }

  await mkdir(dirname(MANIFIESTO), { recursive: true });
  await writeFile(MANIFIESTO, `${JSON.stringify(manifiesto)}\n`, 'utf8');

  const segundos = Math.round((Date.now() - inicio) / 1000);
  console.log(`  generadas: ${generadas}   ya estaban: ${saltadas}   fallos: ${fallos}`);
  console.log(`  imagenes con variantes: ${Object.keys(manifiesto).length}`);
  console.log(`  en ${segundos}s`);
}

main().catch((e) => {
  console.error('FALLO:', e.message);
  process.exit(1);
});
