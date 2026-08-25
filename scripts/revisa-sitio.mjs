/**
 * revisa-sitio.mjs — QA sobre el sitio YA GENERADO.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * POR QUÉ SOBRE `dist/` Y NO SOBRE EL CÓDIGO
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Porque los contratos de `scripts/test-contratos-api.mjs` afirman sobre el CÓDIGO, que es lo
 * que saben hacer bien: son estáticos, rápidos y no necesitan red. Pero hay una familia entera
 * de fallos que un contrato estático no puede ver, porque solo existen después de construir:
 *
 *   · un enlace a `/espacios/salon-encantado` (con una letra de más) que devuelve 404
 *   · una página que se prerenderiza sin `<h1>`
 *   · dos `og:url` en el mismo documento, con la portada hablando por boca de una ficha
 *   · una ruta del `sitemap.xml` que no tiene archivo detrás
 *
 * Los cuatro se ven perfectos en el navegador, no dan ningún error, y son exactamente los que
 * este proyecto ya sufrió una vez cada uno.
 *
 * ── LO QUE ESTO NO ES ───────────────────────────────────────────────────────
 *
 * No es un rastreador ni sale a internet: solo lee archivos. No comprueba enlaces externos —a
 * WhatsApp, a Google Maps— porque eso exigiría red y volvería el build dependiente de que un
 * tercero esté de pie.
 *
 *   npm run revisa
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const DIST = join(resolve(process.cwd()), 'dist');
const fallos = [];
const avisos = [];

/** Todas las páginas generadas, con su ruta pública. */
function paginas(dir = DIST, base = '') {
  const salida = [];
  for (const f of readdirSync(dir)) {
    const ruta = join(dir, f);
    if (statSync(ruta).isDirectory()) {
      if (f === 'assets' || f === 'media') continue;
      salida.push(...paginas(ruta, base + '/' + f));
    } else if (f === 'index.html') {
      salida.push({ ruta: base || '/', archivo: ruta });
    }
  }
  return salida;
}

/** ¿Existe archivo detrás de esta dirección? Mismas reglas que el estático de Vercel. */
const existeRuta = (r) => {
  const limpio = r.split('#')[0].split('?')[0].replace(/\/+$/, '') || '/';
  if (limpio === '/') return existsSync(join(DIST, 'index.html'));
  return existsSync(join(DIST, limpio, 'index.html')) || existsSync(join(DIST, limpio));
};

const lista = paginas();
if (lista.length === 0) {
  console.error('No hay nada en dist/. Ejecuta `npm run build` antes.');
  process.exit(1);
}

console.log(`  revisando ${lista.length} paginas generadas`);

const cuenta = {};

for (const { ruta, archivo } of lista) {
  const html = readFileSync(archivo, 'utf8');
  const cuerpo = html.slice(html.indexOf('<body'));
  const di = (m) => fallos.push(`${ruta}: ${m}`);

  // ── 1. Metadatos: uno de cada, y ninguno vacio ────────────────────────────
  const titulo = (html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1];
  if (!titulo || titulo.trim().length < 10) di('sin `<title>` util');

  const desc = (html.match(/name="description" content="([^"]*)"/i) || [])[1];
  if (!desc || desc.trim().length < 40) di('sin `description` util');

  // Los DUPLICADOS son el fallo silencioso: todo rastreador lee la primera etiqueta, asi que
  // una pagina con dos `og:url` publica la de la plantilla y esconde la suya.
  for (const [nombre, patron] of [
    ['title', /<title>/gi],
    ['description', /name="description"/gi],
    ['canonical', /rel="canonical"/gi],
    ['og:url', /property="og:url"/gi],
    ['og:title', /property="og:title"/gi],
  ]) {
    const n = (html.match(patron) || []).length;
    if (n > 1) di(`${n} etiquetas \`${nombre}\` — se lee la primera y se esconde la buena`);
  }

  const canonical = (html.match(/rel="canonical" href="([^"]*)"/i) || [])[1];
  if (!canonical) di('sin `canonical`');
  else if (!canonical.endsWith(ruta) && !canonical.endsWith(ruta + '/')) {
    di(`el \`canonical\` apunta a otra ruta: ${canonical}`);
  }

  // ── 2. Contenido de verdad, no un cascaron ────────────────────────────────
  const texto = cuerpo.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (texto.length < 200) di(`solo ${texto.length} caracteres de texto: la pagina salio vacia`);
  if (!/<h1[\s>]/i.test(cuerpo)) di('sin `<h1>`');
  if ((cuerpo.match(/<h1[\s>]/gi) || []).length > 1) di('mas de un `<h1>`');

  // ── 3. Ningun enlace interno a una pagina que no existe ───────────────────
  for (const m of cuerpo.matchAll(/href="(\/[^"#?]*)"/g)) {
    const destino = m[1];
    if (destino.startsWith('/assets') || destino.startsWith('/media')) continue;
    if (destino.startsWith('/portal') || destino.startsWith('/invitacion')) continue; // 301 en el borde
    if (!existeRuta(destino)) di(`enlace roto -> ${destino}`);
    cuenta[destino] = (cuenta[destino] || 0) + 1;
  }

  // ── 4. Imagenes con dimensiones, para que la pagina no salte al cargar ────
  //
  // Solo cuentan las que NO estan dentro de un contenedor con proporcion fija. Una imagen sin
  // `width`/`height` dentro de un `aspect-[16/10]` no mueve nada al cargar: el hueco ya estaba
  // reservado por CSS. Acusarlas era ruido, y el ruido hace que se dejen de leer los avisos.
  const sinMedidas = [...cuerpo.matchAll(/<img\b[^>]*>/g)].filter((i) => {
    if (/width=/.test(i[0]) && /height=/.test(i[0])) return false;
    const antes = cuerpo.slice(Math.max(0, i.index - 300), i.index);
    return !/aspect-\[|aspect-square|aspect-video/.test(antes);
  });
  if (sinMedidas.length > 4) {
    avisos.push(`${ruta}: ${sinMedidas.length} imagenes sin medidas NI contenedor con proporcion`);
  }
}

// ── 5. El sitemap y los archivos tienen que coincidir ───────────────────────
const sitemap = join(DIST, 'sitemap.xml');
if (!existsSync(sitemap)) fallos.push('no hay `sitemap.xml`');
else {
  const xml = readFileSync(sitemap, 'utf8');
  // Se saca la URL ENTERA y despues se le quita el origen. Sacarla ya recortada con una
  // expresion no codiciosa hacia que `[^<]*?` se comiera `https:` y el grupo empezara en la
  // doble barra: el guion acusaba a las 23 direcciones de no existir, todas a la vez.
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const r = m[1].replace(/^https?:\/\/[^/]+/, '') || '/';
    if (!existeRuta(r)) fallos.push(`sitemap: anuncia \`${r}\` y no existe`);
  }
  // Anunciar en el sitemap algo que ademas se prohibe en robots es contradecirse.
  const robots = existsSync(join(DIST, 'robots.txt'))
    ? readFileSync(join(DIST, 'robots.txt'), 'utf8')
    : '';
  for (const m of robots.matchAll(/^Disallow:\s*(\S+)/gm)) {
    if (xml.includes('<loc>') && xml.includes(m[1] + '</loc>')) {
      fallos.push(`\`${m[1]}\` esta en el sitemap Y prohibida en robots.txt`);
    }
  }
}

if (!existsSync(join(DIST, '404.html'))) fallos.push('no hay `404.html`');

// ── 6. Paginas a las que no apunta nadie ────────────────────────────────────
for (const { ruta } of lista) {
  if (ruta !== '/' && !cuenta[ruta]) {
    avisos.push(`${ruta}: ninguna otra pagina enlaza aqui — Google tarda semanas en descubrirla`);
  }
}

console.log('');
if (avisos.length) {
  console.log('  AVISOS (no rompen el build):');
  avisos.forEach((a) => console.log('    · ' + a));
  console.log('');
}

if (fallos.length) {
  console.error('  FALLOS:');
  fallos.forEach((f) => console.error('    x ' + f));
  console.error(`\n  ${fallos.length} fallos en ${lista.length} paginas`);
  process.exit(1);
}

console.log(`  ${lista.length} paginas revisadas, sin fallos`);
