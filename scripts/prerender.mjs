/**
 * prerender.mjs — convierte la aplicación en HTML, ruta por ruta, en el build.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * QUÉ HACE Y POR QUÉ IMPORTA
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Escribe un archivo por ruta: `dist/espacios/index.html`,
 * `dist/espacios/salon-encanto/index.html`, y así con todas. Cada uno con su contenido
 * pintado y su `<head>` propio.
 *
 * Eso desbloquea tres cosas que una aplicación de una sola página no puede tener:
 *
 * 1. **Las vistas previas al compartir.** WhatsApp, Facebook y X NO ejecutan JavaScript. Sin
 *    esto, cada enlace compartido de este sitio sale sin título, sin descripción y sin foto.
 *    Un recinto de eventos se recomienda por WhatsApp: es el peor sitio donde fallar.
 *
 * 2. **El 404 de verdad.** Con un archivo por ruta real, `vercel.json` puede dejar de
 *    reescribirlo TODO a `index.html`. Lo que no existe cae en `404.html` y Vercel responde
 *    404 de verdad, en vez de un 200 con una pantalla que dice «no encontrado» — el llamado
 *    «soft 404», que Google indexa como si fuera una página buena.
 *
 * 3. **Que se vea antes.** El HTML llega pintado; el JavaScript solo lo toma después.
 *
 * ── EL LÍMITE, dicho en vez de aparentado ───────────────────────────────────
 *
 * **El HTML se congela en el build.** Si el dueño cambia un texto en el panel, el sitio NO
 * cambia hasta el siguiente despliegue. Los visitantes con JavaScript sí ven lo nuevo en
 * cuanto la aplicación arranca y vuelve a consultar; los rastreadores ven lo congelado.
 *
 * Lo resuelve un Deploy Hook: que guardar en el panel dispare un rebuild. Está preguntado al
 * dueño en `rediseño-sitio-web/13-ENTREVISTA.md`. Mientras no exista, esto se sabe y se dice.
 *
 * Lo mismo con un salón nuevo: su página no existe hasta que se vuelva a construir.
 *
 * ── SI FALLA, FALLA EL BUILD ────────────────────────────────────────────────
 *
 * A propósito. Un prerender que se rinde en silencio deja un sitio que parece correcto y es
 * invisible para todo lo que no ejecuta JavaScript. Es justo el tipo de avería que nadie
 * descubre hasta que alguien pregunta por qué no llegan solicitudes.
 */
import { mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const RAIZ = resolve(process.cwd());
const DIST = join(RAIZ, 'dist');
const SSR = join(RAIZ, '.prerender');

const log = (msg) => console.log('  ' + msg);

/**
 * El `robots.txt`.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * POR QUÉ AQUÍ NO SE PROHÍBE NADA
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Antes había tres `Disallow`: `/cotizar`, `/portal` y `/invitacion/`. Los tres se quitaron, y
 * no por descuido — **prohibir el rastreo hacía justo lo contrario de lo que se buscaba.**
 *
 * ── `/cotizar` ──────────────────────────────────────────────────────────────
 *
 * Lleva `noindex`, que es la etiqueta correcta y **se queda**. Pero `Disallow` y `noindex`
 * juntos se estorban: `Disallow` impide DESCARGAR la página, y el `noindex` va DENTRO de la
 * página. Un buscador al que se le prohíbe entrar nunca llega a leer la orden de no indexar.
 *
 * El resultado real de ponerlos juntos es el peor de los dos mundos: si alguien enlaza
 * `/cotizar` desde fuera, Google puede indexar la URL igualmente —conoce su existencia por el
 * enlace— y como no ha podido abrirla, la lista sin título ni descripción. Sin `Disallow`,
 * entra, lee el `noindex` y la deja fuera de verdad.
 *
 * ── `/portal` y `/invitacion/` ──────────────────────────────────────────────
 *
 * Son redirecciones **301** a las otras dos aplicaciones (ver `vercel.json`). Un 301 existe
 * para que el buscador lo siga y traslade las señales a su destino, y para eso tiene que poder
 * pedir la URL. Prohibirle el paso deja el 301 sin procesar: las señales que esas rutas tenían
 * ganadas se quedan colgando en una dirección que ya no lleva a ningún sitio.
 *
 * ── La regla, para no repetirlo ─────────────────────────────────────────────
 *
 * `Disallow` sirve para AHORRAR RASTREO en zonas enormes y sin valor. Para «que esto no
 * aparezca» la herramienta es `noindex`, y para «esto se mudó» es el 301 — y las dos necesitan
 * que el buscador pueda entrar.
 */
const escribeRobots = (urlSitio) => {
  const cuerpo = [
    '# Jardines Club Hipico',
    '# Generado por scripts/prerender.mjs. No editar a mano: se sobrescribe en cada build.',
    '',
    '# Sin Disallow a proposito. /cotizar se excluye con noindex, y /portal e /invitacion/',
    '# son 301: las tres necesitan que el buscador pueda entrar para obedecerlas.',
    'User-agent: *',
    'Allow: /',
    '',
    'Sitemap: ' + urlSitio + '/sitemap.xml',
    '',
  ].join('\n');
  writeFileSync(join(DIST, 'robots.txt'), cuerpo, 'utf8');
  log('robots.txt escrito');
};

const escapaXml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function escribeSitemap(entradas, urlSitio, hoy) {
  const cuerpo = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entradas.map((e) =>
      [
        '  <url>',
        `    <loc>${escapaXml(urlSitio + (e.ruta === '/' ? '/' : e.ruta))}</loc>`,
        `    <lastmod>${hoy}</lastmod>`,
        `    <priority>${(e.prioridad ?? 0.5).toFixed(1)}</priority>`,
        '  </url>',
      ].join('\n'),
    ),
    '</urlset>',
    '',
  ].join('\n');
  writeFileSync(join(DIST, 'sitemap.xml'), cuerpo, 'utf8');
  log(`sitemap.xml con ${entradas.length} direcciones`);
}

const MARCADOR = '<div id="root"></div>';

/**
 * El 404, que es el ÚNICO documento del sitio sin dirección propia.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * POR QUÉ HAY QUE QUITARLE EL `og:url`
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * `componeDocumento` retira de la plantilla solo las etiquetas que la ruta SUSTITUYE. Y el
 * 404 no declara `og:url` —no puede: se sirve desde cualquier dirección equivocada—, así que
 * el de la plantilla, que es el de la PORTADA, sobrevivía intacto.
 *
 * El efecto era concreto y feo: al pegar en WhatsApp o Facebook un enlace roto del sitio, la
 * tarjeta que se genera **decía ser la portada**. La red social no lee la dirección que
 * pediste, lee la que el documento declara ser.
 *
 * Y para un buscador es peor: `og:url` es una señal de dirección canónica. Una pantalla de
 * error que afirma ser la portada invita a confundir las dos.
 *
 * `canonical` se quita por lo mismo, aunque hoy la plantilla no traiga ninguno: el día que
 * alguien le ponga uno a la portada, este archivo lo heredaría en silencio.
 *
 * **Lo que SÍ se queda es `noindex, follow`**, que es la etiqueta correcta: no la indexes,
 * pero sigue los enlaces que tiene para volver al sitio.
 */
function componeDocumentoDe404(plantilla, pintado) {
  const documento = componeDocumento(plantilla, pintado.html, pintado.cabecera);
  return documento
    .replace(/[ \t]*<meta[^>]*property=["']og:url["'][^>]*>\r?\n?/gi, '')
    .replace(/[ \t]*<link[^>]*rel=["']canonical["'][^>]*>\r?\n?/gi, '');
}

/** Mete el HTML pintado y el `<head>` de la ruta dentro de la plantilla del build. */
function componeDocumento(plantilla, html, cabecera) {
  // SE COMPRUEBA QUE EL MARCADOR ESTA, y esto no es paranoia: ya fallo.
  //
  // `String.replace` sin coincidencia devuelve el original TAL CUAL, sin error. Y como este
  // guion escribe `dist/index.html`, la segunda vez que se ejecutaba sin reconstruir antes se
  // encontraba su propia salida como plantilla: el `<div id="root">` ya venia lleno, no
  // coincidia, y las veinte paginas se escribian con el `<head>` correcto y el cuerpo VACIO.
  //
  // Se veian perfectas en el navegador —el JavaScript las rellena— y estaban en blanco para
  // todo lo que no ejecuta JavaScript, que es justo para lo que existe este guion.
  if (!plantilla.includes(MARCADOR)) {
    throw new Error(
      'La plantilla no tiene un `<div id="root"></div>` vacio. Seguramente `dist/index.html` ' +
      'ya es la salida de un prerender anterior: ejecuta `npm run build:solo` antes.',
    );
  }

  let salida = plantilla.replace(MARCADOR, `<div id="root">${html}</div>`);

  if (!cabecera) return salida;

  // Se RETIRA lo que la plantilla ya traía con el mismo nombre antes de poner lo de la ruta.
  // `index.html` lleva el `og:title`, el `og:url` y la `description` de la PORTADA; si se
  // dejaran, cada página quedaría con dos etiquetas iguales y todo rastreador lee la primera.
  // O sea: la portada hablando por boca de cada página interior. Es el mismo fallo que
  // `src/lib/Cabecera.jsx` corrige en el navegador, y aquí hay que corregirlo otra vez porque
  // este HTML se genera sin pasar por el DOM.
  const quita = (attr, valor) => {
    const re = new RegExp('[ \\t]*<meta[^>]*' + attr + '=["\']' + valor + '["\'][^>]*>\\r?\\n?', 'gi');
    salida = salida.replace(re, '');
  };

  cabecera.metas.forEach((m) => {
    if (m.name) quita('name', m.name);
    else if (m.property) quita('property', m.property);
  });

  cabecera.enlaces.forEach((l) => {
    const re = new RegExp('[ \\t]*<link[^>]*rel=["\']' + l.rel + '["\'][^>]*>\\r?\\n?', 'gi');
    salida = salida.replace(re, '');
  });

  salida = salida.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapaXml(cabecera.titulo)}</title>`);

  const etiquetas = [
    ...cabecera.metas.map((m) =>
      m.name
        ? `    <meta name="${m.name}" content="${escapaXml(m.content)}" />`
        : `    <meta property="${m.property}" content="${escapaXml(m.content)}" />`,
    ),
    ...cabecera.enlaces.map((l) => `    <link rel="${l.rel}" href="${escapaXml(l.href)}" />`),
    ...(cabecera.jsonLd
      // `<` ESCAPADO. `JSON.stringify` escapa comillas pero no `<`, y aqui dentro viajan
      // nombres que salen de la base y se editan desde el CRM: el de un salon, el de un
      // tipo de evento. Un nombre con `</script>` cierra la etiqueta antes de tiempo y lo
      // de detras se ejecuta.
      //
      // Este camino es PEOR que el del cliente: lo que sale de aqui es el HTML servido a
      // todo el que entre, incluidos los buscadores. El mismo agujero se arreglo en
      // `Migas.jsx` y se habia quedado abierto aqui porque el contrato solo barria `src/`.
      ? [`    <script type="application/ld+json">${JSON.stringify(cabecera.jsonLd).replace(/</g, '\\u003c')}</script>`]
      : []),
  ].join('\n');

  return salida.replace('</head>', etiquetas + '\n  </head>');
}

function escribe(ruta, documento) {
  // `/espacios` va a `dist/espacios/index.html` y no a `dist/espacios.html`: asi la direccion
  // funciona con y sin barra final, sin depender de la configuracion del alojamiento.
  const destino = ruta === '/'
    ? join(DIST, 'index.html')
    : join(DIST, ruta.replace(/^\//, ''), 'index.html');
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, documento, 'utf8');
}

async function principal() {
  if (!existsSync(join(DIST, 'index.html'))) {
    throw new Error('No hay dist/index.html. Ejecuta `npm run build` antes que el prerender.');
  }

  log('construyendo el paquete de servidor…');
  // Se llama a Vite por su API, no lanzando `npx` como proceso. Lanzarlo fallaba en Windows
  // (`spawnSync npx.cmd EINVAL`, por como Node trata los `.cmd` desde Node 20), y ademas
  // depender de un ejecutable del PATH hace que el build sea distinto segun la maquina.
  // Por la API se usa exactamente el Vite que este repo tiene instalado.
  const { build } = await import('vite');
  await build({
    logLevel: 'warn',
    build: {
      ssr: 'src/entrada-servidor.jsx',
      outDir: '.prerender',
      emptyOutDir: true,
    },
  });

  const modulo = await import(pathToFileURL(join(SSR, 'entrada-servidor.js')).href);
  const { RUTAS_FIJAS, RUTAS_DINAMICAS, construyeRuta } = await import(
    pathToFileURL(join(RAIZ, 'src', 'rutas.js')).href
  );
  const { URL_SITIO } = await import(pathToFileURL(join(RAIZ, 'src', 'config', 'sitio.js')).href);

  log('trayendo el contenido de la base…');
  const { salones, tipos, anuncios, siembra } = await modulo.traeDatos();

  if (!salones?.length) {
    throw new Error(
      'La base no devolvio ningun salon. Prerenderizar ahora congelaria un sitio VACIO en ' +
      'el HTML, que es peor que no prerenderizar. Revisa VITE_SUPABASE_URL / ANON_KEY.',
    );
  }
  log(`${salones.length} espacios · ${tipos.filter((t) => t.activo).length} tipos de evento activos`);

  // Las rutas dinamicas se expanden desde la base. Las filas de `tipos_evento` apagadas NO
  // entran: sin contenido propio serian paginas casi identicas entre si.
  const porColeccion = {
    salones: salones.filter((s) => s.slug).map((s) => ({ slug: s.slug, prioridad: 0.8 })),
    tipos_evento: tipos.filter((t) => t.activo && t.slug).map((t) => ({ slug: t.slug, prioridad: 0.8 })),
  };

  // `soloSiHay` decide si una ruta se ANUNCIA, no si existe.
  //
  // `/avisos` se prerenderiza siempre —la direccion tiene que responder— pero mientras no haya
  // ningun anuncio publicado NO entra en el sitemap. Anunciarle a Google una pagina vacia es
  // contenido delgado, y ademas le dice que el sitio promete cosas que no tiene.
  const CUANTOS = { anuncios: (anuncios || []).length };

  const aPintar = [
    ...RUTAS_FIJAS.map((r) => ({
      ruta: r.ruta,
      clave: r.clave,
      prioridad: r.prioridad,
      indexable: r.indexable !== false && (!r.soloSiHay || (CUANTOS[r.soloSiHay] || 0) > 0),
    })),
    ...RUTAS_DINAMICAS.flatMap((r) =>
      (porColeccion[r.coleccion] || []).map((x) => ({
        ruta: construyeRuta(r.ruta, x.slug),
        clave: r.clave,
        prioridad: x.prioridad,
        indexable: r.indexable !== false,
      })),
    ),
  ];

  const plantilla = readFileSync(join(DIST, 'index.html'), 'utf8');
  const flojas = [];

  for (const entrada of aPintar) {
    const { html, cabecera } = await modulo.pinta(entrada.ruta, siembra);
    const documento = componeDocumento(plantilla, html, cabecera);

    // SE MIDE EL DOCUMENTO QUE SE VA A ESCRIBIR, no lo que devolvio el render.
    //
    // Medir el render dejaba pasar el fallo mas caro que ha tenido este guion: el render
    // salia lleno, la insercion en la plantilla no coincidia, y al disco iba una pagina
    // vacia. La comprobacion daba verde sobre algo que no era el archivo publicado.
    //
    // La regla general: comprobar el artefacto, no el paso intermedio.
    const cuerpo = documento.slice(documento.indexOf('<body'));
    if (cuerpo.replace(/<[^>]*>/g, '').trim().length < 200) flojas.push(entrada.ruta);

    escribe(entrada.ruta, documento);
  }
  log(`${aPintar.length} rutas pintadas`);

  if (flojas.length) {
    throw new Error(
      'Estas rutas se pintaron practicamente vacias: ' + flojas.join(', ') +
      '. El archivo existiria pero sin contenido para quien no ejecuta JavaScript.',
    );
  }

  // El 404 se pinta desde una direccion que con seguridad no existe, para que caiga en el
  // comodin y salga la pantalla de verdad.
  const noEncontrada = await modulo.pinta('/__no-existe__', siembra);
  writeFileSync(join(DIST, '404.html'), componeDocumentoDe404(plantilla, noEncontrada), 'utf8');
  log('404.html escrito');

  const hoy = new Date().toISOString().slice(0, 10);
  const fueraDelSitemap = aPintar.filter((e) => !e.indexable).map((e) => e.ruta);
  if (fueraDelSitemap.length) {
    log('fuera del sitemap a proposito: ' + fueraDelSitemap.join(', '));
  }
  escribeSitemap(aPintar.filter((e) => e.indexable), URL_SITIO, hoy);
  escribeRobots(URL_SITIO);

  rmSync(SSR, { recursive: true, force: true });
  log('listo');
}

principal().catch((e) => {
  console.error('\nPRERENDER FALLIDO:', e.message);
  process.exit(1);
});
