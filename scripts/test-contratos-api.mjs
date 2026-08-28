#!/usr/bin/env node
/**
 * scripts/test-contratos-api.mjs — Pruebas de contrato frontend ↔ API.
 *
 *   node scripts/test-contratos-api.mjs
 *
 * Existe por un fallo real: `src/lib/notificar.js` seguía mandando
 * `{ titulo, detalle }` cuando `api/notificar.js` ya exigía
 * `{ accion, eventoId, nota }`. Compilaba, pasaba el lint y el correo se caía
 * en silencio con un 400. Ninguna prueba de base de datos podía verlo, porque
 * el desajuste está entre dos archivos de JavaScript.
 *
 * Son comprobaciones estáticas sobre el código, sin red y sin credenciales, así
 * que corren en CI sin tocar Supabase ni enviar correos.
 */
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";

/* ════════════════════════════════════════════════════════════════════════════
 * ESTA SUITE FALLA CERRADA
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Si un `await` de nivel superior no se resuelve —un contrato que ejecuta una función y esa
 * función se olvida de resolver su promesa— Node imprime «Detected unsettled top-level await»,
 * **no ejecuta la última línea** y sale con **código 0**. Es decir: la puerta da VERDE sobre una
 * suite que ni siquiera terminó de correr.
 *
 * No es teórico. Ocurrió el 2026-08-28 en el portal, validando mutando un contrato que ejecuta
 * el lector del cuerpo de una subida: se repuso la versión rota, la suite se quedó colgada en
 * ese `await`, imprimió el aviso y salió con 0. Ni una línea de «FALLA», ni recuento, ni código
 * de error. El CI lo habría dado por bueno.
 *
 * El arreglo es de una línea y no depende de que nadie se acuerde: se sale con 1 desde el primer
 * instante, y solo la última línea del archivo —la que ya cuenta los fallos— tiene permiso para
 * bajarlo a 0. Cualquier camino que no llegue hasta ahí deja el 1 puesto.
 *
 * Va en los tres repos aunque las tres suites sean archivos PROPIOS y no copias: el modo de
 * fallo es del intérprete, no del contenido.
 */
process.exitCode = 1;

const leer = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const leerDir = (p) => readdirSync(new URL(`../${p}`, import.meta.url));
/**
 * Ruta de una migración por su `sec_NN`, **no por su prefijo de fecha**.
 *
 * Los prefijos cambian: en la fase 1 hubo que renombrar dieciséis archivos para alinearlos con
 * el ledger de la base, y cuatro contratos que citaban la ruta a pelo se rompieron de golpe. El
 * número de migración sí es estable, así que se busca por él.
 */
const migracion = (sec) => {
  const f = leerDir("supabase/migrations").find((x) => x.includes(`_${sec}_`) && x.endsWith(".sql"));
  if (!f) throw new Error(`no se encontró la migración ${sec}`);
  return `supabase/migrations/${f}`;
};
/** Lista recursiva de archivos bajo `p`, con rutas relativas a la raíz del repo. */
const leerDirRec = (p) =>
  readdirSync(new URL(`../${p}`, import.meta.url), { withFileTypes: true })
    .flatMap((d) => (d.isDirectory() ? leerDirRec(`${p}/${d.name}`) : [`${p}/${d.name}`]));

/**
 * Igual que `leer`, pero sin comentarios. Necesario porque las cabeceras
 * describen el código ANTERIOR ("antes decía `if (secret) {`…") y eso dispara
 * falsos positivos al buscar patrones prohibidos.
 */
/**
 * OJO — esto NO puede hacerse con `.replace(/\/\*[\s\S]*?\*\//g, "")`.
 *
 * Así estaba, y tenía un agujero que ciega contratos en silencio: la cadena `"image/*"` —la que
 * escriben los `accept` de los `input type="file"`— CONTIENE `/*`. El regex la tomaba por el
 * comienzo de un comentario de bloque y se comía todo hasta el siguiente `*​/` del archivo, o
 * hasta el final si no había ninguno. Descubierto al escribir el contrato 2.3: el propio archivo
 * que declara `BUCKET_MIME` quedaba truncado justo antes de la entrada que el contrato buscaba, y
 * el contrato reportaba que faltaba algo que sí estaba. Un contrato que mira un archivo mutilado
 * afirma sobre otro archivo.
 *
 * Se recorre el texto de una pasada distinguiendo CUATRO cosas, porque con menos de cuatro se
 * rompe — medido, no supuesto:
 *
 *   1. cadenas `'` `"` `` ` ``  — dentro de una cadena, `/*` y `//` son texto;
 *   2. comentarios de bloque y de línea, que es lo que hay que quitar;
 *   3. **expresiones regulares literales**, que es la trampa de vuelta: `api/_lib/guard.js`
 *      contiene `.replace(/"/g, "&quot;")` y `.replace(/'/g, "&#39;")` en `escHtml`. Una versión
 *      que solo mirara comillas tomaba ese `"` por el principio de una cadena y a partir de ahí
 *      dejaba de quitar comentarios en TODO el resto del archivo — 9 700 caracteres de `guard.js`
 *      con sus comentarios dentro. Un contrato que busca un símbolo «sin contar comentarios»
 *      volvería a contarlos, que es exactamente el fallo que ya se corrigió una vez;
 *   4. escapes `\`, dentro de cadenas y dentro de regex.
 *
 * Para saber si un `/` abre un regex o es una división se mira el último carácter significativo:
 * tras un valor (`)`, `]`, identificador, número) un `/` divide; tras `( , = : [ ! & | ? { } ; ~ +
 * - * % < > ^` o al principio, abre un regex. Es la heurística estándar y basta para este repo.
 */
const leerCodigo = (p) => {
  const s = leer(p);
  let out = "";
  let i = 0;
  let ultimoSignificativo = ""; // último carácter no-blanco que SÍ se emitió
  const abreRegex = () => ultimoSignificativo === "" || "(,=:[!&|?{};~+-*%<>^".includes(ultimoSignificativo);
  const emitir = (t) => { out += t; const s2 = t.trimEnd(); if (s2) ultimoSignificativo = s2.slice(-1); };
  while (i < s.length) {
    const c = s[i];
    const d = s[i + 1];

    if (c === '"' || c === "'" || c === "`") {          // 1) cadena
      let j = i + 1;
      while (j < s.length && s[j] !== c) j += s[j] === "\\" ? 2 : 1;
      emitir(s.slice(i, Math.min(j + 1, s.length)));
      i = j + 1; continue;
    }
    if (c === "/" && d === "*") {                        // 2a) comentario de bloque
      const fin = s.indexOf("*/", i + 2);
      i = fin < 0 ? s.length : fin + 2; continue;
    }
    if (c === "/" && d === "/") {                        // 2b) comentario de línea
      const fin = s.indexOf("\n", i + 2);
      i = fin < 0 ? s.length : fin; continue;            // se conserva el salto de línea
    }
    if (c === "/" && abreRegex()) {                      // 3) expresión regular literal
      let j = i + 1, clase = false;
      while (j < s.length) {
        const e = s[j];
        if (e === "\\") { j += 2; continue; }
        if (e === "[") clase = true;
        else if (e === "]") clase = false;
        else if (e === "/" && !clase) break;
        else if (e === "\n") break;                      // no era un regex; se corta y ya
        j += 1;
      }
      emitir(s.slice(i, Math.min(j + 1, s.length)));
      i = j + 1; continue;
    }
    emitir(c); i += 1;                                   // 4) código normal
  }
  return out;
};
const casos = [];

/**
 * ZONA — a qué aplicación viaja cada contrato cuando el repo se parta en tres
 * (`docs/PLAN-INDEPENDIZACION.md` §2). Se marca en la FASE 1, se usa en la FASE 6.
 *
 * Se etiqueta por SECCIÓN, no por contrato, y la razón está medida: de los contratos que
 * corren, solo 262 son llamadas literales a `check()` — el resto nacen dentro de bucles.
 * Etiquetar en el call-site dejaría sesenta y tantos sin etiqueta y nadie lo notaría.
 *
 *   web    · sitio público                portal · portal del cliente (PWA)
 *   crm    · panel / punto de venta       comun  · shim, ui/, api/_lib, migraciones
 *
 * `comun` NO quiere decir «no lo sé»: quiere decir que el contrato cruza la frontera de más
 * de una aplicación, y por tanto o viaja a las tres o se queda en el juego común del backend.
 * Un contrato mal etiquetado hace que la FASE 6 reparta con un mapa equivocado; por eso el
 * meta-contrato del final exige que ninguno se quede sin zona.
 */
const ZONAS = ["web", "portal", "crm", "comun"];
let zonaActual = null;
const zona = (z) => {
  if (!ZONAS.includes(z)) throw new Error(`zona desconocida: ${z}`);
  zonaActual = z;
};
const check = (nombre, ok, detalle = "") => casos.push({ nombre, ok, detalle, zona: zonaActual });

/**
 * Recorta el trozo de código que va de `desde` a `hasta` (excluido).
 *
 * MÉTODO — leer antes de escribir un contrato nuevo. Buscar un identificador
 * suelto sobre TODO el archivo no comprueba nada si ese identificador aparece en
 * más de un sitio: borrar el uso que importa deja vivos los demás y el contrato
 * pasa igual. Ya ocurrió cuatro veces en esta suite (`idsActivos`, `inertesDe`,
 * `ocupadaPersona`, `imagenPlanoPath`). Hay que atar la afirmación al uso concreto
 * —la definición, la escritura, el render, el `disabled`— y validarla reintroduciendo
 * la regresión real en el archivo real. Ver `docs/PROMPTS.md` §9.
 */
const entre = (s, desde, hasta) => {
  const i = s.indexOf(desde);
  if (i < 0) return "";
  const j = s.indexOf(hasta, i + desde.length);
  return j < 0 ? s.slice(i) : s.slice(i, j);
};

/**
 * ¿La rama que abre `cond` corta con un `throw` **antes** de llegar a `limite`?
 * Se afirma sobre el ORDEN, no sobre la distancia en caracteres: "el texto X está
 * a menos de 400 caracteres de Y" no dice nada sobre si uno gobierna al otro.
 */
/**
 * ¿La confirmación de éxito está atada a que la escritura haya CUAJADO?
 *
 * Nace de una vacuidad medida: el contrato anterior comparaba el orden de tres `indexOf`
 * —escritura, `setOk(true)`, `} catch`—, y
 *
 *     await base44.entities.Evento.updateEstricto(id, patch).catch(() => {});
 *
 * lo dejaba en verde: el `.catch` no contiene la cadena `"} catch"`, así que los tres índices
 * seguían en orden mientras el «Guardado ✓» volvía a mentir. Lo mismo con `if (activar) await …`.
 *
 * Aquí se afirman propiedades, y los identificadores se **derivan del propio código** en vez de
 * fijarse: qué setter marca el éxito y qué setter marca el error salen de lo que hay escrito, no
 * de exigir `setOk` y `error` literales.
 *
 * @param {string} codigo   el archivo entero, sin comentarios
 * @param {string} desde    ancla de la función que guarda
 * @param {string} hasta    fin de esa función
 * @param {RegExp} escritura  cómo se reconoce la escritura (`await base44.rpc(`, `.updateEstricto(`…)
 */
const confirmacionAtadaALaEscritura = (codigo, desde, hasta, escritura) => {
  const cuerpo = entre(codigo, desde, hasta);
  if (!cuerpo) return { ok: false, detalle: "no se encontró la función que guarda" };
  const m = new RegExp(escritura.source, escritura.flags.replace("g", "")).exec(cuerpo);
  if (!m) return { ok: false, detalle: "no se encontró la escritura" };
  const i = m.index;
  const fallos = [];

  // 1) La escritura NO está silenciada. Un `.catch(` pegado al `await` se traga el fallo y deja
  //    todo lo de abajo corriendo como si hubiera ido bien.
  const finSentencia = cuerpo.indexOf(";", i);
  const sentencia = cuerpo.slice(i, finSentencia < 0 ? cuerpo.length : finSentencia);
  if (/\.catch\s*\(/.test(sentencia)) fallos.push("la escritura lleva un `.catch(` pegado: se traga el fallo");

  // 2) Y NO se puede SALTAR. `if (activar) await …` deja el «Guardado ✓» pintándose también
  //    cuando la escritura ni se intentó.
  //
  //    Pero "está bajo un `if`" no es la propiedad: `if (reglas.id) …update… else …create…` es
  //    un despacho, no un salto — las dos ramas escriben, y exigir lo contrario obligaría a
  //    reescribir código correcto. Lo que se exige es que **ninguna rama se salte la
  //    escritura**: si hay un condicional, todas sus ramas tienen que escribir.
  //
  //    ⚠️ LA PRIMERA VERSIÓN MIRABA SOLO LA MISMA LÍNEA. Así que
  //        if (activar) {
  //          r = await base44.rpc(…);
  //        }
  //      —el P0 reinstaurado— pasaba en verde: el `if` no cabía en la línea de la escritura.
  //      Es la tercera vez que un contrato mide la forma del texto creyendo medir la propiedad,
  //      y por eso ahora se sigue el ANIDAMIENTO REAL de llaves, que es lo que decide si la
  //      escritura se ejecuta o no.
  {
    const escribe = (t) => /await\s+base44\./.test(t);
    /** Casa la llave abierta en `k`; devuelve el índice de su cierre. */
    const cierre = (t, k) => {
      let d = 0;
      for (let x = k; x < t.length; x++) {
        if (t[x] === "{") d++;
        else if (t[x] === "}" && --d === 0) return x;
      }
      return t.length;
    };
    // Pila de bloques abiertos entre el `try {` y la escritura. Se arranca en el `try` para no
    // contar la llave del propio cuerpo de la función.
    const iTry = cuerpo.indexOf("try {");
    const desdeAqui = iTry >= 0 ? iTry + 4 : 0;
    const pila = [];
    for (let k = desdeAqui; k < i; k++) {
      if (cuerpo[k] === "{") pila.push(k);
      else if (cuerpo[k] === "}") pila.pop();
    }
    // La cabecera del bloque más interno: desde el corte de sentencia anterior hasta su `{`.
    for (const abre of pila) {
      const corte = Math.max(cuerpo.lastIndexOf(";", abre), cuerpo.lastIndexOf("}", abre - 1), desdeAqui);
      const cabecera = cuerpo.slice(corte + 1, abre).trim();
      if (!/^(else\s+)?if\s*\(|^else\b|^(for|while|switch)\s*\(/.test(cabecera)) continue;   // try/catch/función: no condiciona
      // Se reconstruye la cadena `if … else if … else` entera y se exige (a) que **termine en
      // un `else`** —sin él hay un camino que no pasa por ninguna rama— y (b) que TODAS las
      // ramas escriban. Un `for`/`while` nunca termina en `else`, así que cae por (a): su
      // cuerpo puede ejecutarse cero veces.
      let x = abre, ramas = 0, conEscritura = 0, terminaEnElse = false;
      for (;;) {
        const fin = cierre(cuerpo, x);
        ramas++;
        if (escribe(cuerpo.slice(x, fin))) conEscritura++;
        const sig = /^\s*else\s*(\{|if\s*\([^)]*\)\s*\{)/.exec(cuerpo.slice(fin + 1, fin + 300));
        if (!sig) break;
        terminaEnElse = sig[1].startsWith("{");        // `else {` cierra la cadena; `else if` la sigue
        x = fin + 1 + sig.index + sig[0].length - 1;   // el `{` es siempre el último carácter del match
      }
      if (!terminaEnElse || conEscritura !== ramas) {
        fallos.push(
          `la escritura se puede saltar: está bajo «${cabecera.slice(0, 60)}» y `
          + (!terminaEnElse ? "la cadena no termina en `else`" : `solo ${conEscritura} de ${ramas} ramas escriben`),
        );
      }
    }
    // Y el caso sin llaves, en la misma línea: `if (activar) await …;`
    const iniLinea = cuerpo.lastIndexOf("\n", i) + 1;
    const antesEnLinea = cuerpo.slice(iniLinea, i).trim();
    if (/\bif\s*\(|\?$|&&$/.test(antesEnLinea)) {
      const tras = finSentencia < 0 ? cuerpo.length : finSentencia + 1;   // +1: después del `;`, no en él
      const rama = /^\s*else\b([^;]*;)/.exec(cuerpo.slice(tras, tras + 400));
      if (!rama || !escribe(rama[1])) {
        fallos.push(`la escritura se puede saltar: está bajo «${antesEnLinea}» y la otra rama no escribe`);
      }
    }
  }

  // 3) Hay un `catch` que LA CUBRE. Estricto sin `catch` no es un arreglo: es un botón girando.
  //
  //    Y tiene que ser el `catch` que la envuelve, no el primero que aparezca detrás. Con un
  //    `try/catch` interno entre la escritura y la confirmación —el de `revocar_staff_token` en
  //    `EventoDatos`, por ejemplo— `indexOf("} catch")` cae en el interno y todo lo que viene
  //    después queda "fuera del try" para el contrato, aunque no lo esté. Es el mismo defecto
  //    que C.1: mirar posiciones de texto en vez de estructura. Se busca por balance de llaves.
  const cierraBloque = (t, k) => {
    let d = 0;
    for (let x = k; x < t.length; x++) {
      if (t[x] === "{") d++;
      else if (t[x] === "}" && --d === 0) return x;
    }
    return -1;
  };
  let iCatch = -1;
  for (let k = 0; k < i; k++) {
    if (!cuerpo.startsWith("try {", k)) continue;
    const fin = cierraBloque(cuerpo, k + 4);            // la llave de `try {`
    if (fin > i && /^\s*catch\b/.test(cuerpo.slice(fin + 1, fin + 20))) iCatch = fin;   // el `try` más externo que la envuelve vale
  }
  if (iCatch < 0) return { ok: false, detalle: [...fallos, "la escritura no está dentro de un `try/catch`"].join(" · ") };

  // 4) El éxito se marca DESPUÉS de la escritura y ANTES del catch — y el nombre del estado se
  //    lee de ahí, no se exige.
  const entreMedias = cuerpo.slice(i, iCatch);
  const setter = /set([A-Z]\w*)\(\s*true\s*\)/.exec(entreMedias);
  if (!setter) return { ok: false, detalle: [...fallos, "nada marca el éxito entre la escritura y el catch"].join(" · ") };
  const estadoOk = setter[1][0].toLowerCase() + setter[1].slice(1);

  // 5) Ese mismo estado no puede marcarse en ningún otro sitio de la función: un `setOk(true)`
  //    antes de escribir haría cierto lo de arriba y falso lo que ve el usuario.
  const veces = [...cuerpo.matchAll(new RegExp(`set${setter[1]}\\(\\s*true\\s*\\)`, "g"))].length;
  if (veces !== 1) fallos.push(`el éxito se marca ${veces} veces en la misma función`);

  // 6) Y el cartel del render cuelga de ESE estado, excluyendo el estado de error que llena el
  //    catch. Los dos nombres salen del código.
  const cuerpoCatch = cuerpo.slice(iCatch, (cuerpo.indexOf("} finally", iCatch) + 1) || cuerpo.length);
  const setterError = /set([A-Z]\w*)\(/.exec(cuerpoCatch);
  const estadoError = setterError ? setterError[1][0].toLowerCase() + setterError[1].slice(1) : null;
  const render = codigo.slice(codigo.indexOf("return (", codigo.indexOf(desde)));
  const cartel = new RegExp(`\\{\\s*${estadoOk}\\s*&&([^}]*)`).exec(render);
  if (!cartel) fallos.push(`el render no pinta nada colgado de \`${estadoOk}\``);
  else if (estadoError && !new RegExp(`!\\s*${estadoError}\\b`).test(cartel[1])) {
    fallos.push(`el cartel de éxito no excluye \`${estadoError}\`: se pueden pintar los dos a la vez`);
  }

  return { ok: fallos.length === 0, detalle: fallos.join(" · ") };
};

const cortaAntesDe = (cuerpo, cond, limite) => {
  const i = cuerpo.indexOf(cond);
  if (i < 0) return false;
  const t = cuerpo.indexOf("throw", i);
  return t > i && limite > t;
};


// ---------------------------------------------------------------- solicitud
zona("web");
{
  const front = leer("src/components/FormularioModal.jsx");
  const api = leer("api/solicitud.js");
  check("solicitud: el front envía solo `solicitudId`", /solicitudId: creada\.id/.test(front));
  check("solicitud: el front no fabrica folios", !/JCH-\$\{Math\.random/.test(front));
  check("solicitud: la API relee la fila de la base", /from\("solicitudes"\)/.test(api));

  // Era la única ruta con transporter propio y texto plano. Ahora usa la plantilla común.
  const codigo = leerCodigo("api/solicitud.js");
  check(
    "solicitud: usa la plantilla dorada común, no un transporter propio",
    /plantillaOro\(/.test(codigo) && /enviarCorreo\(/.test(codigo) &&
      !/nodemailer/.test(codigo) && !/createTransport/.test(codigo),
  );
  // El bucle de escapado de arriba solo mira los `cuerpoHtml:` que son plantillas literales,
  // y aquí el cuerpo lo arma `construirHtml`. Sin esto, añadir la ruta a esa lista daba un
  // contrato que pasaba sin comprobar una sola interpolación.
  {
    // Se corta en `construirTexto`: ese es el cuerpo text/plain y ahí escapar HTML sería un
    // error, no una protección. El contrato solo debe hablar de los constructores de HTML.
    const constructores =
      entre(codigo, "const fila = (etiqueta, valor)", "function construirTexto") || "";
    const crudas = [...constructores.matchAll(/\$\{([^}]+)\}/g)]
      .map((m) => m[1].trim())
      .filter((e) => !/^escHtml\(/.test(e))
      .filter((e) => !/^(filas)$/.test(e));      // fragmento ya escapado por `fila()`
    check(
      "solicitud: todo dato de la fila va escapado en el HTML",
      constructores.length > 0 && crudas.length === 0,
      constructores ? crudas.join(" | ") : "no se encontraron los constructores del HTML",
    );
  }
  check(
    "solicitud: se conserva el texto plano como alternativa",
    /texto: construirTexto\(s\)/.test(codigo),
  );
  check(
    "solicitud: el replyTo sale de la fila, no del cuerpo de la petición",
    /replyTo: s\.email/.test(codigo) && !/replyTo:\s*(lectura|req|body)/.test(codigo),
  );
  check(
    "solicitud: el asunto conserva folio y nombre",
    /subject: `\[JCH\] Nueva solicitud \$\{s\.folio[\s\S]{0,60}s\.nombre_completo/.test(codigo),
  );
}


// ---------------------------------------------------------------- sec_25 (9B)
zona("comun");
// La migración que añade `eventos.solicitud_id`. Se afirma que sigue siendo ADITIVA y
// autoprotegida: es la única de este bloque y toca la base compartida con Vero.
{
  const sql = leer(migracion("sec_25"));
  check(
    "sec_25: es aditiva — no borra, no reescribe y no toca policies ni grants",
    /add column solicitud_id uuid/.test(sql) &&
      !/\bdrop\b/i.test(sql) && !/\bdelete from\b/i.test(sql) &&
      !/\bcreate policy\b/i.test(sql) && !/\bgrant\b/i.test(sql) && !/\brevoke\b/i.test(sql),
  );
  // El candado de Vero, como contrato y no solo como comentario.
  check(
    "sec_25: no toca nada del schema `public` (Vero)",
    !/\bpublic\.[a-z_]+/i.test(sql.replace(/--.*$/gm, "")),
  );
  check(
    "sec_25: `on delete set null` — borrar la solicitud no se lleva el evento",
    /references jardines\.solicitudes\(id\) on delete set null/.test(sql) &&
      !/on delete cascade/i.test(sql),
  );
  // Las tres precondiciones y la poscondición: sin ellas, reaplicarla o correrla contra una
  // base distinta haría daño en vez de negarse.
  for (const [nombre, re] of [
    ["la columna no existe ya", /column_name = 'solicitud_id'[\s\S]{0,300}raise notice/],
    ["la PK de solicitudes es la esperada", /v_pk is distinct from 'id'[\s\S]{0,160}raise exception/],
    ["el tipo de esa PK es uuid", /v_tipo is distinct from 'uuid'[\s\S]{0,160}raise exception/],
    ["RLS está activo antes", /Precondicion fallida: RLS NO esta activo/],
    ["RLS sigue activo después", /Poscondicion fallida: RLS quedo desactivado/],
  ]) {
    check(`sec_25: comprueba que ${nombre}`, re.test(sql));
  }
}


// ---------------------------------------------------------------- CSP e imágenes (9D)
zona("web");
// J-12: `CtaCotizacion` pintaba SIEMPRE un fondo de `images.unsplash.com`, y la CSP desplegada
// solo admite `'self'`, `data:`, `blob:` y el bucket en `img-src`. La franja que pide cotización
// —la que genera el negocio— llevaba un fondo que el navegador bloquea. Otros cuatro
// componentes tenían placeholders del mismo origen en el camino degradado.
//
// El arreglo NO es ensanchar la CSP: el proyecto ya sacó imgur por esto mismo (D3,
// "independencia total"). Se auto-hospedan.
{
  // `leerCodigo` y no `leer`: las cabeceras explican de dónde venía el fallo y citan el
  // dominio. Buscarlo con comentarios haría fallar el contrato por su propia documentación.
  const publicos = [
    "src/components/CtaCotizacion.jsx",
    "src/components/GaleriaSection.jsx",
    "src/components/SalonesSection.jsx",
    "src/components/SalonOverlay.jsx",
    "src/components/ServiciosAmenidades.jsx",
    "src/components/Confianza.jsx",
    "src/pages/Home.jsx",
  ];
  const HOSTS_DE_IMAGEN = /https:\/\/(images\.unsplash\.com|i\.imgur\.com|media\.base44\.com|[a-z0-9-]+\.cloudfront\.net|cdn\.[a-z0-9-]+\.[a-z]{2,})/;
  const sucios = publicos.filter((f) => HOSTS_DE_IMAGEN.test(leerCodigo(f)));
  check(
    "9D: ningún componente público carga imágenes de un origen que la CSP bloquea",
    sucios.length === 0,
    sucios.join(", "),
  );

  // Y las que se usan en su lugar existen de verdad en `public/`. Un placeholder que apunta a
  // un archivo que no está es el mismo hueco roto, solo que sin culpa de la CSP.
  {
    const faltan = [];
    for (const f of publicos) {
      // Comillas dobles Y simples: `CtaCotizacion` escribe `url('/media/...')` dentro de una
      // cadena, así que mirar solo `"..."` dejaba fuera justo el archivo del hallazgo.
      for (const m of leerCodigo(f).matchAll(/["'](\/media\/[A-Za-z0-9_./-]+)["']/g)) {
        try { leer(`public${m[1]}`); } catch { faltan.push(`${f} -> ${m[1]}`); }
      }
    }
    check("9D: los medios auto-hospedados que se citan existen en `public/`", faltan.length === 0, faltan.join(" · "));
  }

  // La CSP NO se ensancha para arreglarlo. Este es el contrato que impide "resolverlo" por el
  // camino fácil dentro de seis meses.
  {
    const csp = leer("vercel.json");
    const imgSrc = (csp.match(/img-src[^;\\"]*/) || [""])[0];
    check(
      "9D: `img-src` sigue sin admitir orígenes de terceros",
      /img-src 'self' data: blob: https:\/\/[a-z0-9]+\.supabase\.co/.test(imgSrc) &&
        !/unsplash|imgur|base44|cloudfront/.test(imgSrc),
      imgSrc,
    );
  }
}


// ------------------------------------------- sec_26, escrita y NO aplicada
zona("comun");
// La RPC que permitiría que el cliente active su invitación. Es una decisión de producto del
// dueño, así que aquí solo se contrata que el archivo, si existe, cumpla las reglas del
// proyecto para una `security definer` — no que esté aplicada.
{
  const ruta = migracion("sec_26");
  let sql = "";
  // Sin comentarios SQL: las cabeceras de esta migración explican qué NO hace y nombran
  // `drop policy` para decir que no lo usa. Con comentarios, el contrato fallaría por su propia
  // documentación — el mismo tropiezo que ya obligó a `leerCodigo` en el resto de la suite.
  try { sql = leer(ruta).replace(/^\s*--.*$/gm, ""); } catch { sql = ""; }
  const fallos = [];
  if (!sql) fallos.push("no existe el archivo de sec_26");
  else {
    if (!/set search_path = ''/.test(sql)) fallos.push("la función no fija `search_path`");
    if (!/revoke all on function jardines\.invitacion_guardar/.test(sql)) fallos.push("no revoca EXECUTE a PUBLIC");
    if (!/grant execute on function jardines\.invitacion_guardar[^;]*to authenticated/.test(sql)) fallos.push("no concede EXECUTE a `authenticated`");
    if (!/jardines\.is_my_event\(p_evento_id\)/.test(sql)) fallos.push("no comprueba que el evento sea del llamador");
    // No puede tocar policies ni el schema de Vero, ni siquiera de paso.
    if (/create policy|alter policy|drop policy/i.test(sql)) fallos.push("toca policies");
    if (/\bpublic\.[a-z_]+/i.test(sql.replace(/--.*$/gm, "").replace(/from public|to public/gi, ""))) fallos.push("referencia el schema `public` (candado de Vero)");
    // Y las cuatro columnas de la invitación, NI UNA MÁS.
    //
    // La primera versión de esto contaba solo columnas `invitacion_*`, así que una quinta
    // asignación a **otra** columna era invisible. Lo cazó la mutación: colar
    // `auth_user_id = auth.uid()` en el SET dejaba la suite en verde — y `auth_user_id` es
    // exactamente la columna que provocó el P0 del bloque 8. El contrato tiene que mirar
    // TODAS las asignaciones y exigir que todas sean de la invitación, no contar las que ya
    // sabe que le gustan.
    // TODAS las sentencias de escritura, no la primera. `entre()` recortaba el primer `update` y
    // miraba solo ese, así que un SEGUNDO `update … set auth_user_id = …` detrás del bueno
    // pasaba en verde. "Recorta el primero" es la misma puerta que `indexOf`.
    const escrituras = [...sql.matchAll(/\b(update|insert\s+into|delete\s+from)\s+([a-z_]+\.[a-z_]+)/gi)];
    const fuera = escrituras.filter((m) => m[2].toLowerCase() !== "jardines.eventos");
    if (fuera.length) fallos.push(`escribe en tablas que no son jardines.eventos: ${[...new Set(fuera.map((m) => m[2]))].join(", ")}`);
    if (escrituras.length !== 1) fallos.push(`hay ${escrituras.length} sentencias de escritura, se esperaba 1`);
    for (const m of escrituras) {
      const upd = sql.slice(m.index, sql.indexOf(";", m.index));
      const columnas = [...upd.matchAll(/(?:^|,)\s*(?:set\s+)?([a-z_]+)\s*=/gm)].map((c) => c[1]);
      const ajenas = columnas.filter((c) => !c.startsWith("invitacion_"));
      if (ajenas.length) fallos.push(`una escritura toca columnas que no son de la invitación: ${ajenas.join(", ")}`);
      else if (columnas.length !== 4) fallos.push(`una escritura toca ${columnas.length} columnas, no 4: ${columnas.join(", ")}`);
    }
    // La guarda de propiedad es una DISYUNCIÓN: `p_evento_id is null OR not is_my_event(...)`.
    // Cambiar ese `or` por `and` la vuelve inofensiva —solo cortaría con el id nulo— y la
    // versión anterior, que buscaba `is_my_event(p_evento_id)` suelto, lo dejaba pasar.
    if (!/if\s+p_evento_id\s+is\s+null\s+or\s+not\s+jardines\.is_my_event\(p_evento_id\)\s+then/.test(sql)) {
      fallos.push("la guarda de propiedad no corta con «id nulo O no es tuyo»");
    }
    // Y NINGÚN grant puede alcanzar a `anon`: esta RPC escribe.
    if (/grant\s+execute[^;]*\banon\b/i.test(sql)) fallos.push("concede EXECUTE a `anon`");
    // EL TOKEN NO VIENE DE FUERA (B.5). Antes esto exigía que se validara su forma; ahora la
    // propiedad es más fuerte y hace innecesaria aquella: si la función no recibe ningún token,
    // no hay forma que validar mal —que fue exactamente el fallo de T.1— ni token que el cliente
    // pueda elegir sin entropía.
    {
      const firma = entre(sql, "create or replace function jardines.invitacion_guardar(", ") returns");
      if (/\bp_token\b/.test(firma)) fallos.push("la función sigue recibiendo el token de fuera");
      if (!/jardines_private\.token_seguro\(\)/.test(sql)) fallos.push("el token no lo genera el servidor");
    }
  }
  check("A.2: `sec_26` acota la escritura del cliente a sus cuatro columnas y no toca nada más", fallos.length === 0, fallos.join(" · "));
}


// ------------------------------------------- 1.2 · EL ESCAPADOR, EJECUTADO
zona("comun");
//
// Doce contratos comprobaban «esta ruta importa `escHtml`» y **ninguno comprobaba qué hace**.
// Medido: sustituyendo el cuerpo por `String(s ?? "")` —es decir, dejando todo el correo
// inyectable— la batería seguía dando **285/285**. Doce contratos verdes sobre una función
// neutralizada.
//
// Se ejecuta, como en T.1 con `tokenSeguro`. Es la única forma de que un contrato sobre una
// transformación signifique algo: comparar su texto solo comprueba que alguien escribió algo.
{
  const { escHtml } = await import("../api/_lib/guard.js");
  const casos = [
    ["&", "&amp;"],
    ["<", "&lt;"],
    [">", "&gt;"],
    ['"', "&quot;"],
    ["'", "&#39;"],
    ["<script>alert(1)</script>", "&lt;script&gt;alert(1)&lt;/script&gt;"],
    ["a & b", "a &amp; b"],
    // El `&` primero, o `&lt;` se convertiría en `&amp;lt;`.
    ["<&>", "&lt;&amp;&gt;"],
    [null, ""],
    [undefined, ""],
  ];
  const malos = casos.filter(([entrada, esperado]) => escHtml(entrada) !== esperado)
    .map(([entrada, esperado]) => `«${String(entrada)}» -> «${escHtml(entrada)}», se esperaba «${esperado}»`);
  check("1.2: `escHtml` escapa de verdad los cinco caracteres (ejecutado)", malos.length === 0, malos.join(" · "));

  // Y NO hay un segundo escapador más débil. Había uno: el de `correo.js`, que no escapaba `'`
  // y era justo el que envolvía todo lo que entra en la plantilla compartida.
  {
    const correo = leerCodigo("api/_lib/correo.js");
    const propio = /const\s+esc\s*=\s*\(/.test(correo);
    check(
      "1.2: la plantilla de correo usa el escapador bueno, no uno propio",
      !propio && /import\s*\{[^}]*escHtml[^}]*\}\s*from\s*"\.\/guard\.js"/.test(correo),
      propio ? "`correo.js` vuelve a definir su propio `esc`" : "",
    );
  }
}


// ------------------------------------------- 1.1 · EL LEDGER DE MIGRACIONES
zona("comun");
//
// `supabase db push` compara el prefijo del archivo con la versión registrada. Dieciséis de los
// veinticinco archivos tenían prefijos inventados, así que el comando de despliegue estándar
// habría reejecutado desde `sec_11`: `sec_13` reabre `grant insert … to anon` sobre la tabla de
// leads, y `sec_20` aborta al leer una columna que él mismo borró — dejando el INSERT abierto y
// `sec_21`, que es la que lo retira, sin ejecutar.
//
// El contrato compara los nombres de archivo contra la copia del ledger que vive en el repo.
{
  const ledger = leer("supabase/migrations/APLICADAS.txt");
  const aplicadas = new Set(
    ledger.split("\n").filter((l) => /^\d{14}\s/.test(l)).map((l) => l.slice(0, 14)),
  );
  const pendientes = new Set(
    [...ledger.matchAll(/^#\s*PENDIENTE\s+(\d{14})/gm)].map((m) => m[1]),
  );
  const archivos = leerDir("supabase/migrations").filter((f) => f.endsWith(".sql"));
  const huerfanos = archivos
    .map((f) => ({ f, pre: f.slice(0, 14) }))
    .filter(({ pre }) => !aplicadas.has(pre) && !pendientes.has(pre));
  check(
    "1.1: ningún archivo de migración tiene un prefijo que la base no conozca",
    huerfanos.length === 0,
    huerfanos.length
      ? `\`db push\` los reejecutaría: ${huerfanos.map((h) => h.f).join(", ")}`
      : "",
  );
  // Y una migración no puede estar en las dos listas a la vez. Antes esto afirmaba que `sec_26`
  // y `sec_27` seguían pendientes; se aplicaron el 2026-08-05 con el visto bueno del dueño, así
  // que aquel contrato dejó de ser cierto — y una afirmación que deja de ser cierta hay que
  // cambiarla, no tolerarla. El invariante que sí vale siempre es que las dos listas sean
  // disjuntas: si alguien mueve una a «aplicadas» sin aplicarla, o la deja en las dos, el
  // contrato de arriba dejaría de proteger nada.
  const enAmbas = [...pendientes].filter((p) => aplicadas.has(p));
  check(
    "1.1: ninguna migración figura a la vez como aplicada y como pendiente",
    enAmbas.length === 0,
    enAmbas.length ? `en las dos listas: ${enAmbas.join(", ")}` : `pendientes: ${[...pendientes].join(", ") || "ninguna"}`,
  );
}


// ------------------------------------------- 1.3 · CADA FUNCIÓN NUEVA, REVOCADA A MANO
zona("comun");
//
// El DEFAULT ACL de `jardines` concede `anon=X` a toda función nueva, y —comprobado ensayando—
// PostgreSQL concede además EXECUTE a PUBLIC por defecto del motor, que `ALTER DEFAULT
// PRIVILEGES` **no quita** en esta base. Así que la única mitigación que de verdad funciona es
// la convención: cada migración revoca explícitamente lo que crea. Esto la hace cumplir.
{
  // SOLO LAS QUE TODAVÍA SE PUEDEN ARREGLAR. Las 24 migraciones ya aplicadas crean 22 funciones
  // sin revocar a mano, y no se pueden tocar: la regla del proyecto es forward-only y reescribir
  // una migración aplicada es exactamente lo que no se hace. Además están cubiertas: `sec_11` y
  // `sec_17` hicieron barridos posteriores, y el estado vivo está comprobado —solo 8 funciones de
  // `jardines` son ejecutables por `anon` hoy, y las 8 son las rutas por token que deben serlo.
  //
  // La convención se hace cumplir de aquí en adelante, que es donde puede evitar el agujero.
  const ledger = leer("supabase/migrations/APLICADAS.txt");
  const yaAplicadas = new Set(
    ledger.split("\n").filter((l) => /^\d{14}\s/.test(l)).map((l) => l.slice(0, 14)),
  );
  const archivos = leerDir("supabase/migrations")
    .filter((f) => f.endsWith(".sql") && !yaAplicadas.has(f.slice(0, 14)));
  const fallos = [];
  for (const f of archivos) {
    const sql = leer(`supabase/migrations/${f}`).replace(/^\s*--.*$/gm, "");
    for (const m of sql.matchAll(/create\s+(or\s+replace\s+)?function\s+jardines\.(\w+)\s*\(/gi)) {
      const fn = m[2];
      const revocaPublic = new RegExp(`revoke[^;]*on function jardines\\.${fn}\\b[^;]*from[^;]*\\bpublic\\b`, "i").test(sql);
      const revocaAnon = new RegExp(`revoke[^;]*on function jardines\\.${fn}\\b[^;]*from[^;]*\\banon\\b`, "i").test(sql);
      // Las que SÍ deben ser públicas (rutas por token) se conceden a `anon` a propósito.
      const concedeAnon = new RegExp(`grant execute on function jardines\\.${fn}\\b[^;]*to[^;]*\\banon\\b`, "i").test(sql)
        || new RegExp(`'jardines\\.${fn}\\s*\\(`).test(sql);
      if (concedeAnon) continue;
      // Las funciones de usar y tirar de una poscondición se crean y se borran en el acto.
      if (new RegExp(`drop function jardines\\.${fn}\\b`, "i").test(sql)) continue;
      if (!revocaPublic || !revocaAnon) fallos.push(`${f}: ${fn} (public:${revocaPublic ? "ok" : "NO"} anon:${revocaAnon ? "ok" : "NO"})`);
    }
  }
  check(
    "1.3: toda función de una migración NO aplicada se revoca de `public` y de `anon`",
    fallos.length === 0,
    fallos.join(" · "),
  );
}


// ------------------------------------------- 1.4 · UN SOLO NÚMERO, Y QUE SEA EL SUYO
zona("web");
//
// El JSON-LD de `index.html` publicaba `+525548663656`, que NO es el teléfono del negocio
// (`config_sitio.telefono_contacto` = `+52 55 2311 8153`). Es HTML estático: no pasa por Supabase,
// no lo corrige el panel Admin, y es lo que Google lee para la ficha del negocio. El mismo número
// equivocado estaba a mano en cinco componentes como respaldo de WhatsApp.
//
// Se afirma la propiedad, no el texto: **ningún archivo de runtime escribe un número de teléfono
// a mano**, y el que publica el JSON-LD es exactamente el del módulo. Un contrato que solo
// prohibiera la cadena vieja no vería el siguiente número inventado.
{
  const negocio = leerCodigo("src/config/negocio.js");
  const soloDigitos = (s) => (s || "").replace(/\D/g, "");
  const wa = (negocio.match(/export const WHATSAPP\s*=\s*"(\d+)"/) || [])[1] || "";
  const tel = (negocio.match(/export const TELEFONO\s*=\s*"([^"]+)"/) || [])[1] || "";

  check("1.4: `src/config/negocio.js` declara WHATSAPP y TELEFONO", !!wa && !!tel, `wa=«${wa}» tel=«${tel}»`);
  check(
    "1.4: WHATSAPP y TELEFONO son el mismo número",
    !!wa && soloDigitos(tel) === wa,
    `wa=${wa} · tel=${soloDigitos(tel)}`,
  );

  // El JSON-LD estático tiene que publicar ese número y no otro.
  {
    const html = leer("index.html");
    const publicado = (html.match(/"telephone"\s*:\s*"([^"]+)"/) || [])[1] || "";
    check(
      "1.4: el JSON-LD de `index.html` publica el teléfono del negocio",
      !!publicado && soloDigitos(publicado) === wa,
      `el JSON-LD dice «${publicado}» y el negocio es «${wa}»`,
    );
  }

  // Y nadie más escribe un teléfono mexicano a mano. Se busca la FORMA (52 + 10 dígitos, o el
  // `wa.me/` con dígitos pegados), no la cadena concreta que ya se corrigió.
  {
    const sospechosos = [];
    for (const f of leerDirRec("src").concat(leerDirRec("api"))) {
      if (!/\.(jsx?|mjs)$/.test(f) || f.endsWith("src/config/negocio.js")) continue;
      // Sin comentarios: mencionar el número al explicarlo no cuenta. Y sin los `placeholder` de
      // los formularios del panel: `placeholder="+52 55 0000 0000"` es una PISTA DE FORMATO dentro
      // de un input vacío del Admin, no un dato que se le enseñe a nadie. Se recorta el atributo
      // entero —no la cadena— para que un `href` o un `value` con el número siga cazándose.
      const codigo = leerCodigo(f).replace(/placeholder=(\{?"[^"]*"\}?)/g, "placeholder={}");
      for (const m of codigo.matchAll(/"(\+?52\s?\d[\d\s-]{8,})"|wa\.me\/(\d{10,})/g)) {
        sospechosos.push(`${f}: ${m[1] || m[2]}`);
      }
    }
    check(
      "1.4: ningún componente escribe un teléfono a mano — todos salen de `negocio.js`",
      sospechosos.length === 0,
      sospechosos.join(" · "),
    );
  }
}


// ------------------------------------------- 1.5 · UN RESPALDO NO PUEDE INVENTAR EL SALÓN
zona("web");
//
// `SalonesSection` traía cinco salones de respaldo para cuando Supabase no devuelve nada. No eran
// una aproximación: «Salón Cerrado» no existe, y a «Jardines» le ponían 100–300 personas cuando el
// real va de 400 a 600. Escondía además los cuatro espacios más distintivos, capilla incluida.
// Quien planeara una boda de 500 se iba creyendo que el sitio le queda chico.
{
  const salones = leerCodigo("src/components/SalonesSection.jsx");
  const contacto = leerCodigo("src/components/ContactoSection.jsx");
  const fallos = [];

  // No hay una lista de salones escrita a mano en el componente. La forma que se prohíbe es el
  // objeto con `nombre` Y `capacidad` literales, que es lo que hace que se vea como un dato bueno.
  if (/nombre:\s*"[^"]+"[\s\S]{0,240}?capacidad:\s*"[^"]+"/.test(salones)) {
    fallos.push("`SalonesSection` vuelve a traer salones inventados");
  }
  // Y con la lista vacía se dice que no cargó, en vez de no pintar nada en silencio.
  if (!/listado\.length === 0/.test(salones)) fallos.push("con la lista vacía no se avisa de nada");

  // Los respaldos de contacto salen del módulo verificado, no de literales.
  for (const mentira of ["55 0000 0000", "contacto@jardinesclubhipico.mx", "https://maps.google.com", '"Ciudad de México"']) {
    if (contacto.includes(mentira)) fallos.push(`\`ContactoSection\` sigue inventando «${mentira}»`);
  }
  if (!/from "@\/config\/negocio"/.test(contacto)) fallos.push("`ContactoSection` no usa `negocio.js`");

  check("1.5: ningún respaldo inventa datos del negocio", fallos.length === 0, fallos.join(" · "));
}


// ------------------------------------------- 3.1 · EL SITIO ARRANCA AUNQUE LA BASE NO CONTESTE
zona("web");
//
// El splash solo se monta con `configLoaded`, y `splashDone` —que gobierna TODO el render— solo lo
// pone el splash al terminar. Si la lectura de `ConfigSitio` no se resolvía nunca (y `fetch` no
// tiene tiempo límite propio), el visitante se quedaba mirando un rectángulo negro sin fin.
//
// Se afirma la CADENA, no la constante: que existe un temporizador que levanta la misma señal que
// bloquea el render. Fijar «2500» no diría nada sobre si ese número desbloquea algo.
{
  const home = leerCodigo("src/pages/Home.jsx");
  const fallos = [];

  // ── LO PRIMERO, Y LO MAS FUERTE: el contenido NO depende del splash ──────
  //
  // El rediseño saco el cuerpo de la portada de dentro de `{splashDone && (...)}`. Mientras
  // estuvo ahi, el documento no contenia NADA hasta que la animacion terminaba — y eso solo
  // ocurre ejecutando JavaScript. Para la vista previa de WhatsApp, para la de Facebook y para
  // el prerender del build, la pagina mas compartida del sitio estaba en blanco.
  //
  // Se afirma sobre el RETORNO, no sobre todo el archivo: `splashDone` aparece tambien en su
  // `useState` y en el `onFinish`, y buscarlo suelto acusaria a codigo correcto.
  const iRetorno = home.indexOf("  return (");
  const retorno = iRetorno === -1 ? "" : home.slice(iRetorno);
  if (!retorno) fallos.push("no se encuentra el bloque `return` de la portada");
  else if (/\{\s*splashDone\s*&&\s*\(/.test(retorno)) {
    fallos.push("el cuerpo de la portada vuelve a estar detras de `splashDone`: sin JavaScript la pagina queda en blanco");
  }

  // ── EL SPLASH NO ESPERA A NADIE PARA APARECER ───────────────────────────
  //
  // Este trozo vigilaba otra cosa hasta el 2026-08-25: que una señal derivada de la carga de
  // `ConfigSitio` levantara el splash. Esa señal ERA EL FALLO. Al hidratar en el navegador la
  // peticion aun no ha resuelto, asi que React quitaba del DOM el splash que el prerender ya
  // habia pintado, se veia el hero, y un instante despues el splash volvia a montarse encima.
  // El dueño lo describio como «parece rota»: hero, splash, hero.
  //
  // La propiedad que de verdad importa no cambio —nada puede dejar la portada en blanco ni
  // colgar el splash para siempre— pero se cumple de otra forma, y ahora se afirma sobre eso:
  //
  //   1. El splash se monta SOLO con `splashDone`. Cualquier otra condicion lo retrasa.
  //   2. Su salida vive dentro de `SplashScreen`, con temporizador propio y su limpieza.
  //
  // Lo de arriba —que el cuerpo de la portada no dependa del splash— sigue intacto y es lo
  // que garantiza que, pase lo que pase con la animacion, debajo ya hay una pagina.
  const montaje = retorno.match(/\{\s*!splashDone\s*&&\s*(.)/);
  if (!montaje) {
    fallos.push("no se encuentra el montaje del splash en la portada");
  } else if (montaje[1] !== "(") {
    fallos.push("el splash espera a otra señal antes de montarse: al hidratar desaparece y vuelve, y se ve el hero por debajo");
  }

  // La salida del splash, en su propio archivo. Sin espacios, para tolerar cualquier formato.
  const splashSinEspacios = leerCodigo("src/components/SplashScreen.jsx").replace(/\s/g, "");
  // Se exige el temporizador QUE LO APAGA, no un `setTimeout` cualquiera: el archivo tiene un
  // segundo anidado —el que llama a `onFinish` tras el fundido— y buscar la palabra suelta daba
  // por bueno un splash al que le hubieran quitado la salida. Comprobado mutando: con el
  // `includes` flojo, borrar el temporizador de verdad pasaba el contrato igual.
  if (!splashSinEspacios.includes("setTimeout(()=>{setVisible(false)")) {
    fallos.push("`SplashScreen` ya no tiene el temporizador que lo apaga: el splash se queda para siempre");
  }
  if (!splashSinEspacios.includes("clearTimeout(")) {
    fallos.push("el temporizador del splash no se limpia al desmontar");
  }

  check("3.1: ni el splash ni una lectura colgada pueden dejar la portada en blanco", fallos.length === 0, fallos.join(" · "));
}


// ------------------------------------------- 3.2 · HAY UN ERROR BOUNDARY, Y ENVUELVE LA APP
zona("web");
//
// No había ninguno en los 189 archivos. En React una excepción durante el render desmonta el árbol
// entero: un `undefined.map` en cualquier componente dejaba `<div id="root">` vacío — rectángulo
// negro, sin mensaje ni forma de recuperarse. El día del evento eso pasa en la puerta, en un móvil.
{
  const fallos = [];
  const eb = leerCodigo("src/components/ErrorBoundary.jsx");
  if (!/static getDerivedStateFromError/.test(eb)) fallos.push("`ErrorBoundary` no implementa `getDerivedStateFromError`");
  if (!/componentDidCatch/.test(eb)) fallos.push("`ErrorBoundary` no implementa `componentDidCatch`");
  // Recuperable: tiene que ofrecer salir del estado roto.
  if (!/location\.reload\(\)/.test(eb)) fallos.push("`ErrorBoundary` no ofrece recargar");
  // Y no le enseña al visitante el mensaje crudo, que puede llevar nombres de tablas o columnas.
  const render = entre(eb, "render() {", "\n  }\n}");
  if (/\{\s*(this\.)?state\.fallo(\?\.|\.)?(message|toString)/.test(render) || /\{\s*String\(this\.state\.fallo\)/.test(render)) {
    fallos.push("`ErrorBoundary` pinta el mensaje crudo del error");
  }

  // Y envuelve la aplicación de verdad — que exista sin usarse es no tenerlo.
  const app = leerCodigo("src/App.jsx");
  if (!/import\s+ErrorBoundary\s+from/.test(app)) fallos.push("`App.jsx` no importa `ErrorBoundary`");
  const cuerpo = entre(app, "function App()", "export default");
  if (!/<ErrorBoundary>[\s\S]*<\/ErrorBoundary>/.test(cuerpo)) fallos.push("`App` no está envuelta en `ErrorBoundary`");
  // Envuelve el Router, no un trozo suelto: si el boundary quedara DENTRO del árbol de rutas, un
  // fallo del layout se lo saltaría.
  if (!/<ErrorBoundary>[\s\S]*<Router>/.test(cuerpo)) fallos.push("el boundary no queda por fuera del Router");

  check("3.2: hay un error boundary y envuelve la aplicación entera", fallos.length === 0, fallos.join(" · "));
}


// ------------------------------------------- 3.3 · UNA VARIABLE QUE FALTA SE VE
zona("comun");
//
// `createClient(undefined, undefined)` LANZA en la carga del módulo, antes de que React monte.
// El archivo solo hacía `console.error` bajo el comentario «avisar en runtime» — y no avisaba de
// nada: el visitante veía un rectángulo negro y el aviso quedaba en una consola que nadie abre.
{
  const cli = leerCodigo("src/api/supabaseClient.js");
  const guardia = entre(cli, "if (!url || !anonKey)", "\n}");
  const fallos = [];
  if (!guardia) fallos.push("ya no se comprueba que las variables existan");
  // Se pinta algo en el DOM, no solo en la consola.
  if (!/getElementById\("root"\)/.test(guardia)) fallos.push("el fallo de configuración no se pinta en la página");
  if (!/textContent\s*=/.test(guardia)) fallos.push("no se escribe ningún texto visible");
  // Sin `innerHTML` con interpolación: es DOM a mano justamente para no abrir esa puerta.
  if (/innerHTML\s*=\s*[`"'][^`"']*\$\{/.test(guardia)) fallos.push("se construye HTML por interpolación");
  check("3.3: una variable de entorno que falta se ve en la página, no solo en la consola", fallos.length === 0, fallos.join(" · "));
}


// ------------------------------------------- 4.3 · `sec_29` — EL LIBRO DE ENTRADAS (NO APLICADA)
zona("comun");
//
// `accesos.invitacion_id` cae en CASCADE: borrar una invitación se lleva el registro de quién
// entró de verdad por ella. `MesaEditor.borrar()` borra invitaciones, y reorganizar el salón se
// hace A MITAD DEL EVENTO. Ensayado contra la base: con el estado de hoy, 1 acceso → 0 tras borrar
// la invitación; con `sec_29`, 1 → 1 con el nombre del invitado intacto.
//
// La migración está escrita y ensayada, y **NO aplicada**: necesita el visto bueno del dueño.
{
  const sql = leer(migracion("sec_29"));
  const fallos = [];
  // Se recorta el `add constraint` que importa — «on delete set null» aparece también en el texto.
  const fk = entre(sql, "add constraint accesos_invitacion_id_fkey", ";");
  if (!fk) fallos.push("`sec_29` no rehace la FK de `accesos.invitacion_id`");
  if (!/on delete set null/i.test(fk)) fallos.push("la FK de la invitación no queda en `set null`");
  // Y el evento sí cae en cascada, que es lo que deja a `eliminar-evento` seguir borrando todo.
  const fkEv = entre(sql, "add constraint accesos_evento_id_fkey", ";");
  if (!/on delete cascade/i.test(fkEv)) fallos.push("`accesos.evento_id` no cae en cascada con el evento");
  // La instantánea: un id que apunta a una fila borrada no dice nada.
  for (const col of ["invitado_nombre", "mesa_nombre", "evento_id"]) {
    if (!new RegExp(`add column if not exists ${col}\\b`).test(sql)) fallos.push(`\`sec_29\` no añade \`${col}\``);
  }
  // Los DOS escritores la llenan.
  for (const fn of ["registrar_acceso", "registrar_acceso_staff"]) {
    const cuerpo = entre(sql, `create or replace function jardines.${fn}(`, "end $$;");
    if (!/insert into jardines\.accesos[\s\S]*invitado_nombre/.test(cuerpo)) fallos.push(`\`${fn}\` no guarda la instantánea`);
  }
  check("4.3: `sec_29` hace que el libro de entradas sobreviva al borrado de la invitación", fallos.length === 0, fallos.join(" · "));

  // Y sigue declarada como PENDIENTE mientras no se aplique.
  const ledger = leer("supabase/migrations/APLICADAS.txt");
  check(
    "4.3: `sec_29` figura como pendiente, no como aplicada",
    /^#\s*PENDIENTE\s+\d{14}\s+jardines_sec_29/m.test(ledger),
    "`sec_29` no está declarada como pendiente en el ledger",
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Los contratos del video temporal son de la WEB pública, aunque vivan dentro
// de la sección de `sec_29`. Zona propia para que no hereden la de arriba.
zona("web");
// TEMP · EL VIDEO TEMPORAL DEL HERO («Style Contest 2026»)
// ═══════════════════════════════════════════════════════════════════════════
//
// Esto es TEMPORAL por petición del dueño. Todo el bloque se borra el día que se quite el video.
// Mientras esté, lo que hay que proteger es que se pueda DESHACER: el valor del apaño no está solo
// en que se vea, sino en que apagarlo devuelva exactamente lo de antes. Un cambio «temporal» que
// no se puede revertir es un cambio permanente que nadie decidió.
{
  const cfg = leerCodigo("src/config/heroTemporal.js");
  const hero = leerCodigo("src/components/HeroSection.jsx");
  const fallos = [];

  // 1) EL INTERRUPTOR EXISTE y es lo único que decide.
  if (!/\bactivo:\s*(true|false)\b/.test(cfg)) fallos.push("`HERO_TEMPORAL.activo` no es un booleano literal");
  if (!/HERO_TEMPORAL\.activo\s*\?\s*<HeroVideoTemporal\s*\/>\s*:\s*<HeroVideoBg\s*\/>/.test(hero)) {
    fallos.push("el hero no elige entre el video temporal y el carrusel según `activo`");
  }

  // 2) EL CARRUSEL DE SIEMPRE SIGUE ENTERO. Es lo que vuelve al apagar el interruptor: si alguien
  //    lo borrase «porque ya no se usa», apagar el video temporal dejaría el hero sin fondo. Se
  //    afirma sobre el cuerpo de `HeroVideoBg`, no sobre el archivo, y sobre las dos fuentes
  //    concretas — que son irrecuperables si desaparecen del código.
  const carrusel = entre(hero, "function HeroVideoBg()", "\n}");
  if (!carrusel) fallos.push("`HeroVideoBg` —el carrusel de siempre— ya no existe");
  for (const v of ["/media/img/hero-salon-720.mp4", "/media/img/hero-jardin-720.mp4"]) {
    if (!hero.includes(v)) fallos.push(`el hero ya no conoce \`${v}\`: apagar el video temporal no lo devolvería`);
    try { leer(`public${v}`); } catch { fallos.push(`falta el archivo \`public${v}\``); }
  }
  if (!/switchTo\(/.test(carrusel) || !/maxTime/.test(carrusel)) {
    fallos.push("el carrusel perdió su lógica de cambio entre los dos videos");
  }

  check("TEMP: el video temporal se apaga con un booleano, y lo de antes vuelve entero", fallos.length === 0, fallos.join(" · "));
}

{
  const cfg = leerCodigo("src/config/heroTemporal.js");
  const hero = leerCodigo("src/components/HeroSection.jsx");
  const fallos = [];

  // 3) EL ARCHIVO EXISTE Y ESTÁ AUTO-HOSPEDADO. La CSP dice `media-src 'self'`: un video servido
  //    desde fuera lo bloquearía el navegador, así que la ruta tiene que ser local y estar.
  const src = (cfg.match(/src:\s*"(\/media\/[^"]+)"/) || [])[1];
  if (!src) fallos.push("`HERO_TEMPORAL.src` no es una ruta local de `/media/`");
  else { try { leer(`public${src}`); } catch { fallos.push(`falta el archivo \`public${src}\``); } }

  // 4) EL VIDEO NO SE ESTIRA — ESA ES LA PROPIEDAD, Y ES ARITMETICA.
  //
  //    El archivo tiene 576x1024. Con `cover` en un monitor de 1080p hay que estirarlo 3.33x, y a
  //    ese aumento se ven los pixeles: se probo en produccion y se veia pixelado. Con `contain`
  //    el aumento es 1.05x — resolucion real. No es una preferencia estetica: el archivo no tiene
  //    los pixeles para llenar un PC, y eso no se arregla desde el codigo.
  //
  //    Este contrato existe porque el camino equivocado es tentador: `cover` compone mejor y la
  //    pixelacion solo se ve en pantalla grande, asi que se cambia «para que llene» y se rompe.
  const temporal = entre(hero, "function HeroVideoTemporal()", "\nexport default function HeroSection");
  if (!temporal) fallos.push("no se encuentra `HeroVideoTemporal`");
  if (!/objectFit:\s*ajuste/.test(temporal)) fallos.push("el ajuste del video no sale de la configuración");
  if (!/ajuste:\s*"contain"/.test(cfg)) fallos.push("`ajuste` no es `contain`: en un PC habría que estirar el archivo 3× y se verían los píxeles");
  if (!/objectPosition:\s*posicion/.test(temporal)) fallos.push("la posición del video no sale de la configuración");
  if (!/\bloop\b/.test(temporal)) fallos.push("el video no está en bucle");
  if (!/\bplaysInline\b/.test(temporal)) fallos.push("sin `playsInline`, iOS lo abre a pantalla completa");

  //    Y NADA de `scale` sobre el video de delante: escalarlo es exactamente lo que se acaba de
  //    quitar. El fondo SI lleva `scale` a proposito, asi que buscarlo en todo el componente
  //    daria verde por el elemento equivocado.
  const elementos = temporal.split("<video").slice(1)
    .map((t) => (t.indexOf("/>") < 0 ? t : t.slice(0, t.indexOf("/>"))));
  const delante = elementos.find((e) => /objectFit:\s*ajuste/.test(e)) || "";
  if (!delante) fallos.push("no hay ningún <video> que use el ajuste de la configuración");
  else if (/transform:\s*["\'`]?\s*scale/.test(delante)) {
    fallos.push("el video de delante lleva `scale`: eso vuelve a estirarlo y a pixelarlo");
  }

  // 5) LOS LADOS SE RELLENAN, Y EL FONDO NUNCA SUENA.
  //
  //    Con `contain` el video no llega a los bordes en un PC. Detras va una copia desenfocada del
  //    mismo archivo. Y esa copia TIENE que estar muda: dos pistas del mismo audio con unos
  //    milisegundos de desfase dan un eco metalico que se oye enseguida.
  const nVideos = (temporal.match(/<video\b/g) || []).length;
  if (nVideos !== 2) fallos.push(`\`HeroVideoTemporal\` monta ${nVideos} elementos <video>; deben ser 2 (el nítido y el fondo)`);
  if (!/filter:\s*`blur\(\$\{desenfoque\}px\)/.test(temporal)) fallos.push("el fondo no está desenfocado, o el desenfoque no sale de la configuración");

  //    LOS DOS VIDEOS SE IDENTIFICAN POR LO QUE HACEN, no por como se llaman sus refs. Medido
  //    mutando: la primera version recortaba por `ref={fondoRef}` y renombrar esa ref rompia el
  //    contrato sin que hubiera regresion — el mismo ruido que §9 prohibe, y van tres en este
  //    bloque. El de fondo es «el que lleva desenfoque»; el de delante, «el que usa `ajuste`».
  const elFondo = elementos.find((e) => /filter:\s*`?blur/.test(e)) || "";
  if (!elFondo) fallos.push("no hay ningún <video> con desenfoque: los lados quedarían en negro");
  else if (!/\bmuted\b/.test(elFondo)) fallos.push("el video de fondo no nace mudo: sonaría en eco con el de delante");
  //    Y el efecto que le da volumen al de delante NO puede tocar el de fondo.
  //
  //    OJO CON EL RECORTE: el efecto EMPIEZA en `useEffect(() => {`, no en `const debeSonar`.
  //    Recortando desde `debeSonar` —que fue el primer intento— quedaban fuera las dos primeras
  //    líneas del cuerpo, que es justo donde se cogen las refs; la mutación que hacía
  //    `videoRef.current || fondoRef.current` pasaba en VERDE. Se corta hacia atrás desde el
  //    array de dependencias, que sí identifica el efecto sin ambigüedad.
  const finAudio = temporal.indexOf("}, [conAudio");
  const iniAudio = finAudio < 0 ? -1 : temporal.lastIndexOf("useEffect(", finAudio);
  const efectoAudio = iniAudio < 0 ? "" : temporal.slice(iniAudio, finAudio);
  //    Y la ref del fondo también se DERIVA: sale del propio elemento desenfocado.
  const refFondo = (elFondo.match(/ref=\{(\w+)\}/) || [])[1];
  if (!efectoAudio) fallos.push("no se encuentra el efecto que gobierna el audio");
  else if (!refFondo) fallos.push("el video de fondo no tiene ref: nadie puede garantizar que no suene");
  else if (new RegExp(`\\b${refFondo}\\b`).test(efectoAudio)) {
    fallos.push("el efecto del audio toca el video de fondo: sonarían los dos");
  }

  check("TEMP: el video va a resolución real (no se estira), y el fondo nunca suena", fallos.length === 0, fallos.join(" · "));
}

{
  // 6) EL AUDIO. Ningún navegador deja arrancar un video con sonido: al bloquearlo lo deja
  //    PAUSADO, o sea un fotograma congelado de fondo. Por eso el arranque es siempre silenciado
  //    y el audio entra después. Lo que se contrata es esa cadena entera, porque cada eslabón que
  //    falte tiene una consecuencia visible y distinta.
  const cfg = leerCodigo("src/config/heroTemporal.js");
  const hero = leerCodigo("src/components/HeroSection.jsx");
  const temporal = entre(hero, "function HeroVideoTemporal()", "\nexport default function HeroSection");
  const fallos = [];

  // (a) El elemento sigue naciendo con `muted`, y el primer efecto lo fuerza por propiedad.
  //     Sin esto el video no arranca en absoluto.
  // El de DELANTE, que es el que lleva audio — identificado por lo que HACE (usa `ajuste` de la
  // configuración), no por el nombre de su ref. Recortar por `<video` a secas encuentra el
  // primero, que desde que hay fondo es el fondo, y este contrato hablaría del elemento
  // equivocado; recortar por `ref={videoRef}` ata el contrato a un nombre local y renombrarlo lo
  // rompe sin que haya regresión. Las dos versiones se probaron y las dos fallaron.
  const etiqueta = temporal.split("<video").slice(1)
    .map((t) => (t.indexOf("/>") < 0 ? t : t.slice(0, t.indexOf("/>"))))
    .find((e) => /objectFit:\s*ajuste/.test(e)) || "";
  if (!/\bmuted\b/.test(etiqueta)) fallos.push("el `<video>` ya no nace silenciado: no arrancaría");

  // (b) La decisión de sonar depende de las TRES señales. Se recorta el efecto que la calcula
  //     —de `const debeSonar` hasta su array de dependencias— y TODO lo demás se afirma dentro de
  //     ese trozo. Al escribir esto salió la lección de siempre: buscar `p.catch(` sobre el
  //     componente entero encontraba el del PRIMER efecto (`p.catch(() => {})`, el del arranque),
  //     no el del rescate, así que el contrato fallaba señalando algo que sí estaba. Mismo error
  //     de método que la vacuidad, con el signo cambiado.
  const efectoRegla = entre(temporal, "const debeSonar", "}, [conAudio");
  const regla = entre(efectoRegla, "const debeSonar", ";");
  if (!efectoRegla) fallos.push("no se encuentra el efecto que decide si suena");

  // Los nombres de las dos señales locales se DERIVAN del código, no se fijan. Medido mutando:
  // la primera versión los escribía a mano y renombrar `sonidoDelSitio` la hacía fallar sin que
  // hubiera regresión alguna. Un contrato que castiga un renombrado es ruido, y el ruido acaba
  // borrado — con él, la propiedad. (`conAudio` sí va fijo: es una clave de la configuración,
  // no un nombre local, y el punto (h) la pin­cha por su lado.)
  const señalSonido = (temporal.match(/const \[(\w+),\s*\w+\]\s*=\s*useState\(\s*isSoundEnabled\s*\)/) || [])[1];
  const setterVisible = (entre(temporal, "new IntersectionObserver(", "observe(").match(/\bset([A-Z]\w*)\(/) || [])[1];
  const señalVisible = setterVisible ? setterVisible[0].toLowerCase() + setterVisible.slice(1) : "";

  if (!new RegExp(`\\bconAudio\\b`).test(regla)) fallos.push("no se puede apagar el audio desde la configuración");

  if (!señalSonido) fallos.push("ningún estado se inicializa con `isSoundEnabled`");
  else if (!new RegExp(`\\b${señalSonido}\\b`).test(regla)) fallos.push("el botón de sonido del sitio no lo gobierna");

  if (!señalVisible) fallos.push("el observador de visibilidad no actualiza ningún estado");
  else if (!new RegExp(`\\b${señalVisible}\\b`).test(regla)) fallos.push("no se callaría al salir del hero");

  // (c) Y esa decisión llega al elemento. Que se calcule y no se aplique es no tenerla.
  if (!/v\.muted\s*=\s*!debeSonar/.test(efectoRegla)) fallos.push("`debeSonar` no llega a `muted`");

  // (d) LA RED DE SEGURIDAD. Si el navegador rechaza reproducir con sonido, hay que volver a
  //     silenciar y reproducir igual. Sin esta rama, insistir en el audio deja el hero congelado
  //     — que es peor que no tener audio.
  const rescate = entre(efectoRegla, "p.catch(", "});");
  if (!/v\.muted\s*=\s*true/.test(rescate) || !/v\.play\(\)/.test(rescate)) {
    fallos.push("si el navegador rechaza el sonido, no se vuelve a silenciar ni a reproducir: el hero quedaría congelado");
  }

  // (e) El observador de visibilidad existe de verdad y usa el umbral de la configuración.
  if (!/new IntersectionObserver\(/.test(temporal)) fallos.push("no hay observador de visibilidad");
  if (!/threshold:\s*umbralVisible/.test(temporal)) fallos.push("el umbral de visibilidad no sale de la configuración");
  // Derivado, no fijado: `setterVisible` sale del propio callback del observador. Escribirlo a
  // mano hacía fallar el contrato al renombrar el estado — el mismo defecto que (b), un punto más
  // allá, y lo encontró la mutación INOCUA otra vez.
  if (!setterVisible) fallos.push("el observador no actualiza ninguna señal de visibilidad");

  // (f) El botón de sonido del sitio se escucha en vivo, no solo al montar: apagarlo tiene que
  //     callar el video que ya está sonando.
  if (!/subscribeSoundEnabled\(/.test(temporal)) fallos.push("no se reacciona a que el visitante apague el sonido");

  // (g) Y hay un gesto que desbloquea. Sin esto el audio no llegaría nunca.
  if (!/setHuboGesto\(true\)/.test(temporal)) fallos.push("ningún gesto del visitante desbloquea el audio");
  if (!/huboGesto/.test(entre(temporal, "}, [conAudio", "]);"))) {
    fallos.push("el gesto no vuelve a evaluar la regla: el audio no entraría hasta el siguiente cambio");
  }

  // (h) La configuración declara los tres valores.
  for (const k of ["conAudio", "volumen", "umbralVisible"]) {
    if (!new RegExp(`\\b${k}:\\s*[^,]`).test(cfg)) fallos.push(`\`${k}\` no está en la configuración`);
  }

  check("TEMP: el audio entra tras un gesto, se calla al salir del hero, y nunca congela el video", fallos.length === 0, fallos.join(" · "));
}

{
  // 6) LA PRECARGA. El hero no monta hasta que el splash termina, así que su `preload="auto"` no
  //    empezaba a descargar hasta el momento justo en que el video ya tenía que verse. La descarga
  //    se adelanta al splash — y se apaga sola con el interruptor, para no dejar 5.7 MB
  //    descargándose el día que el video ya no esté.
  const pre = leerCodigo("src/lib/precargaHero.js");
  const splash = leerCodigo("src/components/SplashScreen.jsx");
  const fallos = [];

  const cuerpo = entre(pre, "export function precargarVideoHero()", "\n}");
  if (!cuerpo) fallos.push("no existe `precargarVideoHero`");
  if (!/HERO_TEMPORAL\.activo/.test(cuerpo)) fallos.push("la precarga no se apaga con el interruptor");
  if (!/if\s*\(enCurso\)\s*return enCurso;/.test(cuerpo)) fallos.push("la precarga no es idempotente: descargaría 5.7 MB por cada llamada");
  if (!/\.catch\(/.test(cuerpo)) fallos.push("un fallo de la precarga podría tumbar algo: tiene que ser inocua");
  if (!/\.blob\(\)/.test(cuerpo)) fallos.push("sin leer el cuerpo, el navegador puede dejar la descarga a medias");

  if (!/precargarVideoHero\(\)/.test(splash)) fallos.push("el splash no arranca la precarga");

  check("TEMP: el video se descarga durante el splash, una sola vez y sin poder romper nada", fallos.length === 0, fallos.join(" · "));
}


// ------------------------------------------- W · EL BOTON DE WHATSAPP DE LAS SOLICITUDES
zona("web");
//
// El correo de una solicitud lleva un boton que abre el chat de WhatsApp con el numero que el
// cliente escribio en el formulario publico. Ese campo es TEXTO LIBRE —el formulario solo
// comprueba que no este vacio— y `wa.me/<n>` abre el chat de QUIEN SEA que tenga ese numero.
//
// Si la conversion se equivoca no hay error visible: el dueño le escribe a un desconocido
// creyendo que es su cliente, con el nombre y los datos del evento delante. Por eso lo que se
// contrata no es «hay un boton», sino **que el numero sea de quien dice ser, o que no haya boton**.
{
  const { numeroWhatsApp, enlaceWhatsApp } = await import("../api/_lib/telefono.js");

  // (a) EJECUTADO, no leido. Un contrato estatico aqui solo diria que existe un `replace`.
  //     Las ocho primeras son formas legitimas; las seis ultimas, cosas que la gente y los
  //     curiosos escriben de verdad en un campo de telefono.
  const casos = [
    // lo que escribe la gente          lo que debe salir
    ["5564395810",                      "525564395810"],   // las 11 solicitudes reales son asi
    ["55 2311 8153",                    "525523118153"],
    ["+52 55 2311 8153",                "525523118153"],
    ["(55) 2311-8153",                  "525523118153"],
    ["+52 1 55 2311 8153",              "525523118153"],   // viejo formato de WhatsApp Mexico
    ["525523118153",                    "525523118153"],
    ["0052 5523118153",                 "525523118153"],   // prefijo internacional a mano
    ["+1 415 555 2671",                 "14155552671"],    // EE. UU.
    ["0155 2311 8153",                  null],             // larga distancia vieja: ambiguo
    ["5523118153 ext 4",                null],             // con extension no es un movil
    ["55231181",                        null],             // incompleto
    ["llamame al 5564395810",           null],             // texto con digitos dentro
    ["<img src=x onerror=alert(1)>5564395810", null],      // basura: el `1` se pegaba delante
    ["",                                null],
  ];
  const malos = casos
    .filter(([entrada, esperado]) => numeroWhatsApp(entrada) !== esperado)
    .map(([entrada, esperado]) => `«${entrada}» -> ${numeroWhatsApp(entrada)}, se esperaba ${esperado}`);
  check("W: el numero de WhatsApp se deriva bien, o no se deriva (ejecutado)", malos.length === 0, malos.join(" · "));

  // (b) LA INVARIANTE DE SALIDA, sobre entradas hostiles: o `null`, o SOLO digitos. De esto
  //     depende que el valor sea seguro dentro de una URL y dentro de un atributo HTML.
  const hostiles = [
    `5564395810" onmouseover="alert(1)`, `javascript:alert(1)`, `5564395810 https://otro.mx`,
    `../../etc/passwd`, `<script>5564395810</script>`, `5564395810?text=x&foo=y`,
  ];
  const sucios = hostiles.filter((h) => {
    const n = numeroWhatsApp(h);
    return n !== null && !/^[0-9]{10,15}$/.test(n);
  });
  check("W: ninguna entrada hostil produce algo que no sean digitos (ejecutado)", sucios.length === 0, sucios.join(" · "));

  // (c) Y la URL entera es la de WhatsApp, sin nada colado detras.
  //     El saludo prellenado es una decision de negocio, no una propiedad: `telefono.js` explica
  //     como quitarlo, y un contrato que castigara quitarlo seria ruido. Lo que SI se afirma es la
  //     forma de la URL — `wa.me` + digitos, y si hay texto, codificado.
  const url = enlaceWhatsApp("55 2311 8153", { nombre: "Ana Ortega", folio: "JCH-0012" });
  check(
    "W: el enlace es `wa.me` con el numero, y lo que lleve detras va codificado (ejecutado)",
    typeof url === "string" && /^https:\/\/wa\.me\/525523118153(\?text=[A-Za-z0-9%.()_~*!'-]+)?$/.test(url),
    String(url),
  );
  check(
    "W: sin numero utilizable no hay enlace, y por tanto no hay boton (ejecutado)",
    enlaceWhatsApp("no tengo telefono", { nombre: "x" }) === null,
    "un telefono ilegible sigue produciendo enlace",
  );
}

{
  // (d) EL CORREO USA ESA FUNCION, y el boton cuelga de que haya enlace. Una pieza correcta que
  //     nadie invoca es indistinguible de una que no existe (D-COD-21).
  const sol = leerCodigo("api/solicitud.js");
  const fallos = [];
  if (!/from "\.\/_lib\/telefono\.js"/.test(sol)) fallos.push("`api/solicitud.js` no importa el normalizador");
  if (!/enlaceWhatsApp\(s\.telefono/.test(sol)) fallos.push("el enlace no se deriva del telefono de la fila de la base");
  // El boton NO puede construirse pegando el telefono crudo.
  if (/wa\.me\/\$\{/.test(sol)) fallos.push("se construye una URL de `wa.me` a mano en vez de con el normalizador");
  // Y cuelga del enlace: sin enlace, sin boton.
  const envio = entre(sol, "cta2Texto:", "notaPie:");
  if (!/waUrl\s*\?/.test(envio) || !/waUrl\s*\|\|\s*undefined/.test(envio)) {
    fallos.push("el segundo boton no cuelga de que exista el enlace: se pintaria roto");
  }
  // El texto plano tambien lo lleva: hay clientes de correo que no pintan HTML.
  if (!/ESCRIBIRLE POR WHATSAPP/.test(sol)) fallos.push("el texto plano no lleva el enlace");
  check("W: el correo de solicitudes usa el normalizador, y sin numero no pinta boton", fallos.length === 0, fallos.join(" · "));

  // (e) LA PLANTILLA ESCAPA LAS DOS URL. Hasta ahora `ctaUrl` no se escapaba, y daba igual porque
  //     todas se construian con constantes; desde que una sale de un campo publico, no da igual.
  const correo = leerCodigo("api/_lib/correo.js");
  const fallos2 = [];

  // NO se recorta por delimitador: `entre(correo, "const botonHtml =", "};")` cortaba en el `};`
  // de `background: ${degradado};`, o sea ANTES del `href`, y el contrato fallaba señalando algo
  // que si estaba. Cuarta vez en esta sesion que un recorte cae en el sitio equivocado.
  //
  // Y la afirmacion que sale es MEJOR que la que se intentaba: en vez de mirar un boton concreto,
  // se exige que **ningun** `href` interpolado de la plantilla se quede sin escapar. Si mañana se
  // añade un tercer enlace, tambien queda cubierto.
  const hrefs = [...correo.matchAll(/href="\$\{([^}]*)\}"/g)].map((m) => m[1].trim());
  if (hrefs.length === 0) fallos2.push("la plantilla ya no interpola ninguna URL: ¿siguen existiendo los botones?");
  const sinEscapar = hrefs.filter((h) => !/^esc\(/.test(h));
  if (sinEscapar.length) fallos2.push(`hay URL sin escapar en la plantilla: ${sinEscapar.join(", ")}`);
  if (!/\$\{esc\(texto\)\}/.test(correo)) fallos2.push("el texto del boton no va escapado");
  // Y el segundo boton es OPCIONAL: los seis correos que ya existian no lo pasan.
  if (!/cta2Texto && cta2Url/.test(correo)) fallos2.push("el segundo boton no es opcional");
  check("W: la plantilla escapa las dos URL, y el segundo boton es opcional", fallos2.length === 0, fallos2.join(" · "));
}


// ------------------------------------------- W.2 · LOS CAMPOS OBLIGATORIOS SE MIRAN RECORTADOS
zona("web");
//
// El servidor ya exige un telefono de verdad: el trigger `solicitud_saneo` hace `trim()` y luego
// `new.telefono !~ '^[0-9+()\-\s]{7,30}$'` -> `raise exception 'Telefono invalido'`. El formulario
// tambien lo marcaba obligatorio... pero con `!!form.telefono`, que es CIERTO con la barra
// espaciadora: el boton se habilitaba, la solicitud viajaba, y el cliente recibia un error crudo
// del servidor en vez del aviso normal de campo faltante.
//
// Esto importa mas desde que existe el boton de WhatsApp: el telefono dejo de ser un dato de
// adorno y paso a ser el que abre el chat.
{
  const modal = leerCodigo("src/components/FormularioModal.jsx");
  const guarda = entre(modal, "const puedeEnviar", ";");
  const fallos = [];
  if (!guarda) fallos.push("no se encuentra la guarda `puedeEnviar`");

  // Ningun campo de TEXTO obligatorio puede comprobarse con `!!form.X` desnudo.
  for (const campo of ["nombreCompleto", "telefono", "tipoEvento", "fechaTentativa"]) {
    if (new RegExp(`!!\\s*form\\.${campo}\\b`).test(guarda)) {
      fallos.push(`\`${campo}\` se comprueba con \`!!\`: la barra espaciadora lo daria por lleno`);
    }
  }

  // Y el que envuelve al telefono recorta de verdad. El NOMBRE del helper se deriva del propio
  // codigo — fijarlo haria que un renombrado inocuo rompiera el contrato (§9).
  const helper = (guarda.match(/(\w+)\(\s*form\.telefono\s*\)/) || [])[1];
  if (!helper) fallos.push("`form.telefono` no pasa por ninguna comprobacion");
  else {
    const def = entre(modal, `const ${helper} =`, ";");
    if (!/\.trim\(\)/.test(def)) fallos.push(`\`${helper}\` no recorta: los espacios seguirian pasando`);
  }

  check("W.2: los campos de texto obligatorios se comprueban recortados, no con `!!`", fallos.length === 0, fallos.join(" · "));
}


// ---------------------------------------------------------------- FASE 4 · las tres conectadas
zona("web");
{
  // `/portal` Y `/invitacion/:token` REDIRIGEN, NO SE BORRAN (todavía).
  //
  // Las dos rutas existen desde hace meses y `/portal` está enlazada desde el menú, así que es
  // razonable suponer que Google la conoce. Mudarlas sin 301 tira esas señales a la basura.
  // El redirect vive en `vercel.json` y NO en el router de React a propósito: un salto de
  // cliente no es un 301 y no transfiere nada.
  //
  // Y hay un segundo motivo, menos obvio: el fragmento `#entrar=<token>` de un enlace mágico
  // ya enviado NO viaja al servidor, así que el navegador lo arrastra al destino. Los correos
  // que ya están en las bandejas siguen funcionando.
  const cfg = JSON.parse(leer("vercel.json"));
  const fallos = [];
  const redirs = cfg.redirects || [];
  const buscar = (origen) => redirs.find((r) => r.source === origen);
  for (const origen of ["/portal", "/invitacion/:token"]) {
    const r = buscar(origen);
    if (!r) { fallos.push(`no hay redirect para ${origen}`); continue; }
    if (r.statusCode !== 301) fallos.push(`${origen} redirige con ${r.statusCode}, no 301`);
    if (!/^https:\/\//.test(r.destination)) fallos.push(`${origen} no apunta a una URL absoluta`);
  }
  const inv = buscar("/invitacion/:token");
  if (inv && !inv.destination.includes(":token")) fallos.push("la invitación pierde el token por el camino");
  check("web: `/portal` y la invitación redirigen 301 a otra aplicación", fallos.length === 0, fallos.join(" · "));
}

zona("web");
{
  // EL ENLACE AL PORTAL SALE DE UNA VARIABLE, no escrito a mano (R8), y sabe que el portal es
  // OTRA APLICACION: una URL absoluta hay que abrirla saliendo del enrutador, no navegando
  // dentro de el. Con `<Link to="https://...">` el enrutador intenta tratarla como ruta interna
  // y el cliente acaba en un 404 de este sitio en vez de en su portal.
  //
  // ── DONDE VIVE, Y POR QUE CAMBIO ──────────────────────────────────────────
  //
  // Estaba en el menu de anclas de la portada. La FASE 3 unifico la navegacion y ese menu se
  // retiro, asi que el enlace se mudo al PIE — donde ademas esta mejor: no es una seccion del
  // sitio, es una puerta de servicio para quien ya contrato.
  //
  // Este contrato existe justamente para que esa mudanza no perdiera el enlace por el camino.
  // Sin el, el portal se habria quedado sin ninguna puerta desde el sitio publico y nadie se
  // habria enterado hasta que un cliente preguntara por donde entra.
  const pie = leerCodigo("src/components/navegacion/PieDeSitio.jsx");
  const fn = entre(pie, "function EnlacePortal", "export default function PieDeSitio");
  const fallos = [];

  if (!fn) fallos.push("no se encuentra el enlace al portal en el pie");
  else {
    if (!/import\.meta\.env\.VITE_URL_PORTAL/.test(fn)) fallos.push("el enlace no sale de `VITE_URL_PORTAL`");
    // El respaldo `/portal` no es decorativo: si faltara la variable, cae en la ruta vieja de
    // este sitio, que la FASE 4 convirtio en un 301 hacia el portal. El peor caso es un salto
    // de mas, no un enlace roto.
    if (!/\|\|\s*'\/portal'/.test(fn)) fallos.push("no queda respaldo a la ruta vieja si falta la variable");
    // Y la parte que de verdad importa: distinguir absoluta de interna, y salir del enrutador.
    if (!/https\?:/.test(fn)) fallos.push("no distingue una URL absoluta de una ruta interna");
    if (!/<a\s+href=\{destino\}/.test(fn)) fallos.push("no sale del enrutador para una URL absoluta: un `Link` la trataria como ruta interna");
  }

  // Y que alguien lo pinte de verdad. Una funcion perfecta que nadie renderiza es un enlace
  // que no existe, y este contrato afirmaria una propiedad sobre codigo muerto.
  if (!/<EnlacePortal\s*\/>/.test(pie)) fallos.push("`EnlacePortal` esta definido pero no se pinta");

  check("web: el portal se alcanza desde el sitio, sale de una variable y abre fuera del router", fallos.length === 0, fallos.join(" · "));
}

zona("comun");
{
  // LA RAÍZ DEL PORTAL *ES* EL PORTAL. En el monolito vivía en `/portal`, así que todos los
  // correos construían `${URL_PORTAL}/portal`. Con el portal en su propio origen ese sufijo
  // apunta a una ruta que no existe, y el enlace mágico es de UN SOLO USO: si falla, el correo
  // se quema y el cliente se queda fuera sin que nadie se entere. Es el peligro P1.
  const fallos = [];
  for (const f of leerDir("api").filter((x) => x.endsWith(".js"))) {
    const s = leerCodigo("api/" + f);
    if (s.includes("URL_PORTAL}/portal")) fallos.push(`api/${f} sigue añadiendo el sufijo /portal`);
  }
  check("comun: ningún correo añade ya el sufijo `/portal` a `URL_PORTAL` (P1)", fallos.length === 0, fallos.join(" · "));
}

zona("comun");
{
  // LAS TRES URL, EN UN SOLO SITIO. `canjear-acceso` también las necesita desde la FASE 4, y
  // hacerle importar `correo.js` le metía nodemailer en el paquete para leer una cadena.
  // `correo.js` las re-exporta, así que los imports que ya existían siguen valiendo.
  const urls = leerCodigo("api/_lib/urls.js");
  const correo = leerCodigo("api/_lib/correo.js");
  const fallos = [];
  for (const n of ["URL_WEB", "URL_PORTAL", "URL_CRM"]) {
    if (!new RegExp(`export const ${n} = process\.env\.${n} \|\|`).test(urls)) {
      fallos.push(`${n} no sale de su variable de entorno`);
    }
  }
  if (/const URL_HOY|export const URL_WEB =/.test(correo)) fallos.push("`correo.js` vuelve a declarar las URL en vez de re-exportarlas");
  if (!/export \{[^}]*URL_WEB[^}]*\} from "\.\/urls\.js"/.test(correo)) fallos.push("`correo.js` no re-exporta desde `urls.js`");
  check("comun: las tres URL se declaran UNA vez, en `api/_lib/urls.js`", fallos.length === 0, fallos.join(" · "));
}



// ---------------------------------------------------------------- escapado de correos
zona("comun");
{
  // RECUPERADO EN LA FASE 6. Antes recorria una lista de rutas escrita a mano, y al repartir
  // el proyecto esa lista dejo de existir en ningun repo: se perdia la cobertura entera.
  // Ahora recorre el `api/` REAL de este repo, asi que vive en los tres y se adapta solo.
  for (const nombre of leerDir("api").filter((f) => f.endsWith(".js"))) {
    const ruta = "api/" + nombre;
    const s = leer(ruta);
    if (!/plantillaOro/.test(s)) continue;
    check(`${ruta}: importa escHtml`, /escHtml/.test(s));
    const cuerpos = [...s.matchAll(/cuerpoHtml:\s*`([\s\S]*?)`,/g)].map((m) => m[1]);
    const crudas = cuerpos
      .flatMap((c) => [...c.matchAll(/\$\{([^}]+)\}/g)].map((m) => m[1].trim()))
      .filter((e) => !/^escHtml\(/.test(e))
      .filter((e) => !/^(detalleHtml|cuerpo|bloque|panelUrl)$/.test(e));
    check(`${ruta}: sin variables sin escapar en cuerpoHtml`, crudas.length === 0, crudas.join(" | "));
  }
}

// ---------------------------------------------------------------- errores de supabase-js
zona("comun");
{
  // RECUPERADO EN LA FASE 6, por el mismo motivo y con el mismo metodo.
  //
  // `supabase-js` resuelve con `{ error }` en vez de rechazar, asi que un `.catch()` no atrapa
  // NADA: la escritura falla, el catch no corre, y el codigo sigue como si hubiera ido bien.
  const rutas = leerDir("api").filter((f) => f.endsWith(".js"));
  const hay = (n) => rutas.includes(n);
  const codigo = (n) => leerCodigo("api/" + n);

  for (const nombre of rutas) {
    const s = codigo(nombre);
    check(`api/${nombre}: sin .catch(() => {}) sobre llamadas a Supabase`, !/\.catch\(\(\) => \{\}\)/.test(s));
    check(`api/${nombre}: sin .then(() => {}, () => {})`, !/\.then\(\(\) => \{\},\s*\(\) => \{\}\)/.test(s));
  }

  // Compensaciones: solo donde existe la ruta que da de alta usuarios.
  for (const nombre of ["crear-admin.js", "crear-usuario-evento.js"].filter(hay)) {
    const s = codigo(nombre);
    check(`api/${nombre}: la compensacion usa compensarAlta (comprobada)`, /compensarAlta/.test(s));
    check(`api/${nombre}: no borra usuarios sin comprobar`, !/deleteUser\([^)]*\)\.catch/.test(s));
  }

  if (hay("canjear-acceso.js")) {
    const s = codigo("canjear-acceso.js");
    check("canjear-acceso: libera el lease con rpcSeguro", /rpcSeguro\(admin, "canjear_acceso_liberar"/.test(s));
    check("canjear-acceso: deja evidencia si no pudo liberar", /lease_no_liberado/.test(s));
  }

  for (const nombre of ["notificar.js", "correo-cliente.js", "solicitud.js", "crear-admin.js", "crear-usuario-evento.js"].filter(hay)) {
    const s = codigo(nombre);
    check(`api/${nombre}: comprueba el booleano de idemCerrar`, /(const cerrad\w+ = await idemCerrar)/.test(s));
    check(`api/${nombre}: audita el incidente si no cerro`, /idem_no_cerrada/.test(s));
  }

  if (hay("cron-recordatorios.js")) {
    const s = codigo("cron-recordatorios.js");
    check("cron: comprueba idemCerrar y las escrituras", /escrituraOk/.test(s) && /incidentes/.test(s));
    check("cron: no marca resena_recordada sin confirmar", /cierre_incompleto/.test(s));
    check("cron: documenta semantica at-least-once", /AT-LEAST-ONCE/.test(leer("api/cron-recordatorios.js")));
  }
}

// ---------------------------------------------------------------- shim: nucleo comun + funciones por app
zona("comun");
{
  // FASE 6, §5 DEL PLAN. El shim se partio en dos:
  //   · `base44Client.js`  nucleo comun, BYTE A BYTE igual en los tres repos;
  //   · `funciones.js`     las rutas de `api/` que ESTA aplicacion tiene desplegadas.
  //
  // Antes, el shim nombraba con `fetch` las cinco rutas del monolito en los TRES bundles,
  // apuntando a rutas que en dos de ellos dan 404. Congelar esa lista fue lo correcto
  // mientras no se decidia; ahora se comprueba la propiedad de verdad.
  const fun = leerCodigo("src/api/funciones.js");
  const declarada = entre(fun, "export const RUTAS", ";") || "";
  const declaradas = [...declarada.matchAll(/"\/api\/([a-z-]+)"/g)].map((m) => m[1]).sort();
  const desplegadas = leerDir("api").filter((f) => f.endsWith(".js")).map((f) => f.replace(/\.js$/, "")).sort();
  const fantasma = declaradas.filter((d) => !desplegadas.includes(d));
  const shim = leerCodigo("src/api/base44Client.js");
  const enNucleo = [...new Set([...shim.matchAll(/fetch\("\/api\/([a-z-]+)"/g)].map((m) => m[1]))];
  const fallos = [];
  if (!declaradas.length) fallos.push("`funciones.js` no declara `RUTAS`");
  if (fantasma.length) fallos.push(`declara rutas que esta app NO tiene desplegadas: ${fantasma.join(", ")}`);
  if (enNucleo.length) fallos.push(`el nucleo del shim vuelve a nombrar rutas: ${enNucleo.join(", ")}`);
  check("comun: el shim no nombra ninguna ruta que esta aplicacion no tenga desplegada", fallos.length === 0, fallos.join(" · "));
}


// ---------------------------------------------------------------- compartidos: copia vigilada
zona("comun");
{
  // §2.4 DEL PLAN. El codigo comun se comparte HOY por COPIA, y una copia sin contrato es
  // deuda pura: el mismo bug se arregla en un repo y sigue vivo en los otros dos.
  //
  // LO QUE SI HACE: detecta que un archivo comun se edito EN ESTE REPO sin pasar por el
  // manifiesto. Obliga a que tocar codigo comun sea un acto consciente.
  //
  // LO QUE NO HACE, y conviene decirlo en vez de aparentarlo: no ve los otros dos repos en
  // CI, asi que no detecta que hayan cambiado SU copia. Lo resuelve de verdad extraer el
  // paquete compartido. Ver `scripts/compartidos.json`.
  const manifiesto = JSON.parse(leer("scripts/compartidos.json"));
  const fallos = [];
  for (const item of manifiesto.archivos) {
    const actual = createHash("sha256").update(leer(item.ruta), "utf8").digest("hex");
    if (actual !== item.sha256) fallos.push(`${item.ruta} cambio aqui sin actualizar el manifiesto`);
  }
  check(
    `compartidos: los ${manifiesto.archivos.length} archivos comunes siguen siendo la copia registrada`,
    fallos.length === 0,
    fallos.slice(0, 4).join(" · "),
  );
}


// ---------------------------------------------------------------- finales de linea
zona("comun");
{
  // NINGUN ARCHIVO DE TEXTO PUEDE TENER CRLF, y esto no es cosmetica.
  //
  // `.gitattributes` fija `eol=lf`, asi que git normaliza al commitear. Pero el manifiesto de
  // `scripts/compartidos.json` hashea los bytes del ARBOL DE TRABAJO: si un archivo se escribe
  // con CRLF en Windows, su sha se registra con CRLF, y en un clon limpio —donde llega en LF—
  // el contrato de compartidos falla sin que nada haya divergido de verdad.
  //
  // Ya paso una vez y costo caro: al clonar el repo de la web en una maquina Windows limpia,
  // 269 de 281 archivos llegaron en CRLF y cinco contratos fallaron en falso, acusando a
  // simbolos que si estaban. Un contrato que acusa a codigo correcto es peor que no tenerlo.
  const EXT = /\.(js|jsx|mjs|ts|tsx|json|md|css|html|sql|txt|yml|yaml)$/i;
  const sospechosos = [];
  const recorrer = (dir) => {
    for (const f of leerDir(dir)) {
      if (f === "node_modules" || f === ".git" || f === "dist" || f === "media") continue;
      const ruta = dir === "." ? f : dir + "/" + f;
      let esDir = false;
      try { leerDir(ruta); esDir = true; } catch { esDir = false; }
      if (esDir) { recorrer(ruta); continue; }
      if (!EXT.test(f)) continue;
      if (leer(ruta).includes("\r\n")) sospechosos.push(ruta);
    }
  };
  recorrer(".");
  check(
    "finales de linea: ningun archivo de texto lleva CRLF (rompiria el manifiesto en un clon limpio)",
    sospechosos.length === 0,
    sospechosos.slice(0, 5).join(" · "),
  );
}


// ---------------------------------------------------------------- la URL del sitio, en un solo sitio
zona("web");
{
  // NINGUNA URL DEL SITIO ESCRITA A MANO EN `index.html`.
  //
  // Tenia `https://jardinesclubhipico.com` en el `og:url` y en los dos bloques de JSON-LD.
  // Ese dominio NO ES NUESTRO: el `.com` y el `.com.mx` estan en manos de terceros y el propio
  // no se ha comprado todavia.
  //
  // No es cosmetica. `og:url` y el `url` de un JSON-LD le dicen a Google cual es la casa
  // oficial del negocio, asi que estabamos declarando que la nuestra es la de otro. Y cada vez
  // que alguien compartia el sitio por WhatsApp, la tarjeta apuntaba ahi.
  //
  // El respaldo del plugin es el dominio de Vercel, que SI es nuestro: si la variable falta, el
  // peor caso es apuntar a una URL propia, nunca a la ajena.
  const html = leer("index.html");
  const vite = leerCodigo("vite.config.js");
  const fallos = [];

  const ajenos = [...new Set([...html.matchAll(/https:\/\/(jardinesclubhipico\.[a-z.]+)/g)].map((m) => m[1]))];
  if (ajenos.length) fallos.push(`\`index.html\` escribe a mano un dominio que no controlamos: ${ajenos.join(", ")}`);

  // Cada `og:url`, `canonical` y `url`/`image` de JSON-LD tiene que salir del marcador.
  const absolutas = [...html.matchAll(/(?:og:url" content=|"url":\s*|"image":\s*|rel="canonical" href=)"([^"]+)"/g)].map((m) => m[1]);
  const sinMarcador = absolutas.filter((u) => /^https?:\/\//.test(u) && !u.startsWith("%VITE_SITE_URL%"));
  if (sinMarcador.length) fallos.push(`URLs absolutas sin pasar por la variable: ${sinMarcador.slice(0, 2).join(" · ")}`);

  if (!/transformIndexHtml/.test(vite)) fallos.push("`vite.config.js` no sustituye el marcador en el build");

  // El plugin tiene que sustituir ANTES que Vite. Vite trae su propia sustitucion de
  // `%VARIABLE%` en el HTML y corre primero: como `VITE_SITE_URL` no vive en un `.env`, no la
  // encontraba, avisaba y dejaba el marcador literal. En desarrollo el `og:url` era la cadena
  // `%VITE_SITE_URL%`. El build pasaba igual, asi que ninguna puerta lo veia.
  const plugin = entre(vite, "const urlDelSitio", "})");
  if (!/order:[^,]*'pre'/.test(plugin)) {
    fallos.push("el plugin no declara `order: 'pre'`: Vite sustituiria antes y dejaria el marcador literal");
  }

  // El respaldo vive en `src/config/sitio.js`, que es el MISMO modulo que lee el JavaScript del
  // sitio. Antes estaba escrito en `vite.config.js`, o sea que el HTML y la aplicacion tenian
  // cada uno su idea de cual es su propia direccion y podian discrepar sin que nada avisara.
  const sitio = leerCodigo("src/config/sitio.js");
  const respaldo = (sitio.match(/\|\|\s*'(https?:\/\/[^']+)'/) || [])[1];
  if (!respaldo) fallos.push("`src/config/sitio.js` no declara un respaldo para cuando falte la variable");
  else if (/jardinesclubhipico\./.test(respaldo)) fallos.push("el respaldo apunta al dominio ajeno");
  if (!/URL_SITIO/.test(vite)) fallos.push("`vite.config.js` no usa `URL_SITIO`: el HTML y la aplicacion pueden discrepar");

  check("web: ninguna URL del sitio esta escrita a mano — sale de `VITE_SITE_URL`", fallos.length === 0, fallos.join(" · "));
}


// ------------------------------------- web: CADA PAGINA HABLA POR SI MISMA EN EL <head>
zona("web");
//
// EL FALLO QUE ESTO IMPIDE, y se vio de verdad en el navegador antes de existir:
//
// `index.html` trae su propio `og:title`, su `og:url` y su `description` — los de la PORTADA.
// Cuando una pagina interior añade los suyos SIN retirar aquellos, el `<head>` acaba con dos
// etiquetas del mismo nombre. Y TODO rastreador lee LA PRIMERA.
//
// O sea: cada ficha de espacio le decia a WhatsApp y a Google el titulo y la direccion de la
// portada, con los suyos escritos justo debajo sin que nadie los mirara. La pagina se ve
// perfecta, no hay ningun error en consola, y ninguna de las cuatro puertas puede verlo.
//
// Hay que afirmarlo en LOS DOS SITIOS donde se compone un `<head>`: el navegador y el
// prerender. Arreglar uno y olvidar el otro deja el fallo vivo justo donde mas duele —el HTML
// del build es el que leen las vistas previas al compartir.
{
  const fallos = [];

  // ── 1. En el navegador ────────────────────────────────────────────────
  //
  // Se recorta el cuerpo del bucle que crea las etiquetas y se afirma SOBRE EL: buscar
  // "remove()" suelto en el archivo lo encontraria en la limpieza de los enlaces y pasaria
  // igual aunque las metas se duplicaran.
  const cabecera = leerCodigo("src/lib/Cabecera.jsx");
  const bucle = entre(cabecera, "datos.metas.forEach", "datos.enlaces.forEach");
  if (!bucle) fallos.push("no se encuentra el bucle que crea las etiquetas meta");
  else {
    const limpia = /querySelectorAll\([^)]*\)[\s\S]{0,80}?\.remove\(\)/.test(bucle);
    if (!limpia) fallos.push("el bucle de metas no retira la etiqueta previa: quedarian dos y se lee la primera");
    // El ORDEN, no la distancia. Retirar la vieja DESPUES de haber puesto la nueva se
    // llevaria por delante justo la que acaba de crearse, y el `<head>` quedaria sin la
    // etiqueta — que es una forma distinta del mismo desastre.
    const iLimpia = bucle.indexOf("remove()");
    const iCrea = bucle.indexOf("createElement");
    if (iLimpia < 0 || iCrea < 0 || iLimpia > iCrea) {
      fallos.push("la limpieza no ocurre ANTES de crear la nueva: el orden es lo que importa");
    }
  }

  // ── 2. En el prerender ────────────────────────────────────────────────
  const pre = leerCodigo("scripts/prerender.mjs");
  const compone = entre(pre, "function componeDocumento", "function escribe");
  if (!compone) fallos.push("no se encuentra `componeDocumento` en el prerender");
  else {
    if (!/cabecera\.metas\.forEach/.test(compone)) fallos.push("`componeDocumento` no recorre las metas de la ruta");
    if (!/salida\s*=\s*salida\.replace/.test(compone)) fallos.push("`componeDocumento` no retira de la plantilla lo que va a sustituir");
  }

  // ── 3. Y el marcador se comprueba antes de sustituir ──────────────────
  //
  // `String.replace` sin coincidencia devuelve el original SIN ERROR. El guion llego a
  // escribir veinte paginas con el `<head>` correcto y el cuerpo vacio porque uso su propia
  // salida como plantilla y el marcador ya no estaba.
  if (!/includes\(MARCADOR\)/.test(pre) || !/throw new Error/.test(compone || "")) {
    fallos.push("el prerender no comprueba que el marcador exista: una sustitucion fallida pasaria en silencio");
  }

  check("web: cada pagina habla por si misma en el <head>, sin heredar el de la portada", fallos.length === 0, fallos.join(" · "));
}


zona("web");
{
  // UNA FOTO DESCARGADA NO PUEDE QUEDARSE INVISIBLE.
  //
  // `onLoad` no se dispara si la imagen ya estaba completa cuando React enganchó el manejador,
  // y eso pasa con casi todas las que vienen de la caché del navegador. Medido en producción:
  // 7 de 69 fotos de la galería se quedaban en `opacity: 0` para siempre, descargadas y
  // decodificadas, con su marcador de «cargando» encima. Ninguna petición falló.
  //
  // El contrato mira el RENDER y el EFECTO a la vez, que es lo que exige la regla: saca del
  // render quién es el manejador que enseña la foto, y exige que el efecto de rescate llame a
  // ESE. Buscar `naturalWidth` suelto por el archivo no serviría — aparecería igual en un
  // comentario.
  // Se afirma sobre el CÓDIGO, sin comentarios. Este mismo contrato falló al escribirlo porque
  // la prosa que explica el arreglo también dice «naturalWidth», y el recorte la encontraba a
  // ella en vez de al efecto. Un contrato que se conforma con ver la palabra escrita en algún
  // sitio no comprueba nada: sobreviviría a borrar el código y dejar el comentario.
  const foto = leerCodigo("src/components/ui/Foto.jsx")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  const fallos = [];

  // Se recorta la ETIQUETA `<img>`, no el archivo: es donde vive el manejador de verdad.
  // (Un primer intento recortó `entre(foto, "export default function Foto(", "\n}")` y se quedó
  //  con la lista de props, porque el `\n}` que la cierra llega antes que el del final.)
  const etiqueta = entre(foto, "<img", "/>");
  if (!etiqueta) fallos.push("no se encuentra la etiqueta `<img>` de `Foto`");

  const manejador = (etiqueta.match(/onLoad=\{(\w+)\}/) || [])[1];
  if (!manejador) fallos.push("el `<img>` ya no tiene `onLoad`: nada marca la foto como lista");

  // Se recorta el efecto concreto: desde su `useEffect(` hasta el cierre de su lista de
  // dependencias. Así lo que se afirma es el efecto, no «algún sitio del archivo».
  const trozo = foto.split("useEffect(").find((b) => /naturalWidth/.test(b));
  const rescate = trozo ? trozo.split("]);")[0] : "";

  if (!rescate) {
    fallos.push(
      "ningún `useEffect` mira `naturalWidth`: si `onLoad` no llega —imagen ya en caché— la foto queda invisible para siempre",
    );
  } else {
    if (!/\.complete\s*&&\s*\w+\.naturalWidth\s*>\s*0/.test(rescate)) {
      fallos.push("el efecto de rescate no comprueba `complete` Y `naturalWidth > 0` juntos");
    }
    if (manejador && !new RegExp(`\\b${manejador}\\s*\\(`).test(rescate)) {
      fallos.push(`el efecto de rescate no llama a \`${manejador}\`, que es lo que el render usa para enseñar la foto`);
    }
    if (!/\[\s*src\b/.test(rescate)) {
      fallos.push("el efecto de rescate no depende de `src`: al cambiar de foto no volvería a comprobarlo");
    }
  }

  check(
    "web: una foto ya descargada se enseña aunque `onLoad` no llegue nunca",
    fallos.length === 0,
    fallos.join(" · "),
  );
}


zona("web");
{
  // EL BOTÓN DE LOS TIPOS DE EVENTO NO PROMETE UN NÚMERO.
  //
  // Decía «Ver los 14 tipos de evento». El dueño lo hizo quitar por un motivo de negocio, no
  // de estilo: *«estás limitando a que nada más podemos manejar catorce eventos, y no —
  // podemos manejar lo que se imagine la gente»*. Un número es una promesa cerrada, y quien
  // busca algo que no está entre esos catorce lee el número y se va.
  //
  // Es exactamente la clase de regresión que vuelve sola: `lista.length` sigue a mano ahí al
  // lado, y «poner cuántos hay» parece una mejora hasta que se recuerda por qué se quitó.
  const home = leerCodigo("src/components/home/QueEstasPlaneando.jsx")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  const fallos = [];

  // Se recorta el BOTÓN, no el archivo: `lista.length` es legítimo en otros sitios del
  // componente —de hecho decide si el degradado se pinta— y buscarlo suelto daría un falso
  // positivo eterno.
  const boton = entre(home, "<VerTodo", "</VerTodo>");
  if (!boton) fallos.push("no se encuentra el botón `<VerTodo>` de la sección de eventos");
  else {
    if (/\.length/.test(boton)) fallos.push("el botón vuelve a interpolar un recuento (`.length`)");
    if (/\d/.test(boton)) fallos.push("el botón vuelve a llevar un número escrito");
    if (!/tipos de evento/.test(boton)) fallos.push("el botón ya no dice a dónde lleva");
  }

  check(
    "web: el botón de los tipos de evento no promete un número cerrado",
    fallos.length === 0,
    fallos.join(" · "),
  );
}

zona("web");
{
  // CADA TIPO DE EVENTO QUE ENTRA POR MIGRACIÓN TRAE SU DIBUJO.
  //
  // Las tarjetas caen a «solo texto» cuando no hay escena, y esa red está puesta a propósito
  // para los tipos que el dueño cree desde el panel. Pero un tipo que llega en una migración
  // lo añadimos nosotros, y ahí olvidarse del dibujo no es un caso previsto: es una tarjeta
  // desnuda en medio de catorce ilustradas, y nadie la ve hasta que está en producción.
  //
  // Se cruzan dos artefactos reales —el SQL aplicado y el mapa de escenas— en vez de afirmar
  // sobre una lista escrita a mano, que se quedaría vieja sola.
  const sqls = leerDir("supabase/migrations")
    .filter((f) => f.endsWith(".sql") && /tipo/.test(f))
    .map((f) => leer(`supabase/migrations/${f}`))
    .join("\n");
  // TRES FORMAS DE NOMBRAR UN SLUG, porque las migraciones usan las tres. Al escribir esto
  // solo se leía la primera y el contrato cubría 9 de 15 diciendo que los cubría todos —que
  // es peor que no tenerlo—. Los seis originales no se INSERTAN en ninguna migración: nacieron
  // en el seed y las migraciones solo los ACTUALIZAN, así que hay que leerlos del `WHERE`.
  const enInsert = [...sqls.matchAll(/INSERT INTO jardines\.tipos_evento[\s\S]*?VALUES\s*\(\s*'([a-z0-9-]+)'/g)]
    .map((m) => m[1]);
  const enTupla = [...sqls.matchAll(/\(\s*'([a-z0-9-]+)',\s*'[^']*',\s*\$\$/g)].map((m) => m[1]);
  const enUpdate = [...sqls.matchAll(/WHERE\s+slug\s*=\s*'([a-z0-9-]+)'/gi)].map((m) => m[1]);
  const slugs = [...new Set([...enInsert, ...enTupla, ...enUpdate])];

  const escenas = leerCodigo("src/components/eventos/arte/escenas.jsx");
  const mapa = entre(escenas, "export const POR_SLUG = {", "};");
  const fallos = [];

  if (!mapa) fallos.push("no se encuentra `POR_SLUG` en `arte/escenas.jsx`");
  if (slugs.length === 0) fallos.push("no se pudo leer ningún slug de las migraciones de tipos_evento");

  for (const slug of slugs) {
    // La clave puede ir con o sin comillas según lleve guion. Se acepta cualquiera de las dos.
    const suelta = new RegExp(`(^|[{,\\s])${slug.replace(/-/g, "\\-")}\\s*:`, "m");
    const entrecomillada = new RegExp(`['"]${slug}['"]\\s*:`);
    if (!suelta.test(mapa) && !entrecomillada.test(mapa)) {
      fallos.push(`el tipo \`${slug}\` no tiene escena en \`POR_SLUG\`: su tarjeta saldría sin dibujo`);
    }
  }

  check(
    `web: los ${slugs.length} tipos de evento de las migraciones tienen su escena dibujada`,
    fallos.length === 0,
    fallos.join(" · "),
  );
}


zona("web");
{
  // EL `robots.txt` NO PROHIBE NADA, Y ESO ES DELIBERADO.
  //
  // Tenía tres `Disallow`: `/cotizar`, `/portal` e `/invitacion/`. Los tres hacían lo
  // contrario de lo que se buscaba, y los tres son fáciles de reponer «para arreglar» algo:
  //
  //   · `/cotizar` lleva `noindex`, que va DENTRO de la página. Prohibir el rastreo impide
  //     leerla, así que la orden de no indexar nunca llega — y si alguien la enlaza desde
  //     fuera, Google puede listar la URL sin título ni descripción.
  //   · `/portal` e `/invitacion/` son 301. Un 301 existe para que el buscador lo siga.
  //
  // Se afirma sobre el CUERPO de `escribeRobots`, no sobre el archivo: la palabra `Disallow`
  // aparece también en el comentario que explica por qué no está, y buscarla suelta haría
  // fallar el contrato por su propia documentación.
  const prerender = leer("scripts/prerender.mjs");
  const cuerpo = entre(prerender, "const escribeRobots = (urlSitio) => {", "};");
  const fallos = [];

  if (!cuerpo) fallos.push("no se encuentra el cuerpo de `escribeRobots`");
  else {
    const conDisallow = (cuerpo.match(/['"]Disallow:/g) || []).length;
    if (conDisallow > 0) fallos.push(`el robots.txt vuelve a llevar ${conDisallow} \`Disallow\``);
    if (!/Sitemap: /.test(cuerpo)) fallos.push("el robots.txt ya no anuncia el sitemap");
    if (!/Allow: \//.test(cuerpo)) fallos.push("el robots.txt ya no permite el rastreo");
  }

  // Y LA OTRA MITAD DE LA PAREJA: el `noindex` de /cotizar SE QUEDA.
  //
  // Las dos afirmaciones van juntas en un mismo contrato a propósito, porque la seguridad de
  // quitar el `Disallow` DEPENDE de que el `noindex` siga puesto. Separarlas dejaría pasar la
  // combinación que de verdad hace daño: sin prohibición y sin noindex, el formulario se
  // indexa y diluye al resto.
  //
  // La entrada vive en `src/rutas.js`, no en `src/paginas.js` —que solo mapea la carga
  // perezosa—. Al escribir esto miré el archivo equivocado y el contrato falló por eso, que
  // es justo para lo que sirve.
  const rutas = leerCodigo("src/rutas.js");
  const cotizar = entre(rutas, "ruta: '/cotizar'", "},");
  if (!cotizar) fallos.push("no se encuentra la entrada `/cotizar` en `src/rutas.js`");
  else if (!/indexable:\s*false/.test(cotizar)) {
    fallos.push("/cotizar dejó de ser `indexable: false`: sin Disallow y sin noindex, se indexa");
  }

  check(
    "web: el robots.txt no prohíbe rastrear, y /cotizar conserva su noindex",
    fallos.length === 0,
    fallos.join(" · "),
  );
}

zona("web");
{
  // EL 404 NO DECLARA SER OTRA PAGINA.
  //
  // `componeDocumento` solo retira de la plantilla las etiquetas que la ruta SUSTITUYE, y el
  // 404 no puede declarar `og:url` —se sirve desde cualquier dirección equivocada—, así que
  // heredaba el de la portada. Al pegar un enlace roto en WhatsApp, la tarjeta decía ser la
  // home.
  //
  // La regresión que este contrato vigila es concreta: que alguien «simplifique» el 404
  // volviendo a llamar a `componeDocumento` directamente. Por eso se afirma sobre la LLAMADA,
  // no sobre la existencia de la función auxiliar: la función podría seguir ahí sin usarse.
  const prerender = leer("scripts/prerender.mjs");
  const fallos = [];

  const escritura = entre(prerender, "writeFileSync(join(DIST, '404.html')", ");");
  if (!escritura) fallos.push("no se encuentra la escritura de `404.html`");
  else if (!/componeDocumentoDe404\(/.test(escritura)) {
    fallos.push("el 404 volvió a componerse con `componeDocumento`: heredaría el og:url de la portada");
  }

  const auxiliar = entre(prerender, "function componeDocumentoDe404(", "\n}");
  if (!auxiliar) fallos.push("no se encuentra `componeDocumentoDe404`");
  else {
    if (!/og:url/.test(auxiliar)) fallos.push("`componeDocumentoDe404` ya no retira el `og:url`");
    if (!/canonical/.test(auxiliar)) fallos.push("`componeDocumentoDe404` ya no retira el `canonical`");
  }

  check(
    "web: el 404 se compone quitándole el og:url y el canonical de la portada",
    fallos.length === 0,
    fallos.join(" · "),
  );
}

zona("web");
{
  // UN SOLO SEPARADOR EN LOS TITULOS.
  //
  // Seis páginas firmaban con `|` y veintiocho con `·`. El arreglo de la base fue un UPDATE,
  // pero el que aguanta es este: `componeTitulo` es el embudo de `<title>`, `og:title` y
  // `twitter:title`, y el dueño escribe los `seo_title` desde el panel — nada le impide
  // teclear una barra mañana.
  //
  // La regresión real es volver al `return titulo` a secas cuando el título ya trae la marca,
  // que es lo que dejaba pasar el separador ajeno. Se afirma sobre el CUERPO de la función.
  const cabecera = leerCodigo("src/lib/Cabecera.jsx");
  const cuerpo = entre(cabecera, "function componeTitulo(titulo) {", "\n}");
  const fallos = [];

  if (!cuerpo) fallos.push("no se encuentra `componeTitulo`");
  else {
    if (!/SEPARADOR/.test(cuerpo)) fallos.push("`componeTitulo` ya no usa la constante `SEPARADOR`");
    // Lo que de verdad normaliza: recortar el separador que trajera el título antes de la marca.
    if (!/replace\(/.test(cuerpo)) {
      fallos.push("`componeTitulo` ya no recorta el separador previo: un `seo_title` con `|` volvería a publicarse tal cual");
    }
    if (!/indexOf\(NOMBRE_SITIO\)/.test(cuerpo)) {
      fallos.push("`componeTitulo` ya no localiza la marca dentro del título");
    }
  }

  const sep = entre(cabecera, "const SEPARADOR =", ";");
  if (!sep) fallos.push("no se encuentra la constante `SEPARADOR`");
  else if (/\|/.test(sep)) fallos.push("el separador volvió a ser una barra");

  check(
    "web: los títulos se firman con un separador único, venga el texto de donde venga",
    fallos.length === 0,
    fallos.join(" · "),
  );
}


// ---------------------------------------------------------------- salida

// META-CONTRATO DEL REPARTO — FASE 1, punto 5 del plan de independización.
//
// Etiquetar sin comprobar la etiqueta es decorar. Si mañana se añade una sección sin
// `zona(...)`, sus contratos heredarían en silencio la zona de la sección anterior y la
// FASE 6 repartiría archivos con un mapa equivocado. Esto lo convierte en un fallo ruidoso.
zona("web");
{
  // EL JSON-LD NO PUEDE CERRAR SU PROPIA ETIQUETA.
  //
  // `JSON.stringify` escapa comillas y barras invertidas, pero NO escapa `<`. Y dentro del
  // JSON-LD viajan nombres que salen de la base y se editan desde el CRM: el de un salón, el
  // de un tipo de evento. Un nombre que contenga `</script>` cierra la etiqueta antes de
  // tiempo, y lo que venga detrás lo ejecuta el navegador.
  //
  // No es teórico, y no se queda en la sesión de quien lo escribió: el sitio se prerenderiza,
  // así que ese HTML se sirve a todo el que entre. Se comprobó contando cierres — sin escape
  // el navegador ve DOS `</script>` donde debería haber uno.
  //
  // EL DETALLE QUE CASI SE COLÓ, y que es la razón de que este contrato exija barra DOBLE:
  // escribir `'\u003c'` en el fuente no sirve de nada. JavaScript resuelve ese escape al
  // leer el literal, así que la cadena que queda es el carácter `<` y el `replace` cambia `<`
  // por `<`. Un no-op con aspecto de arreglo, que además pasa cualquier revisión por encima.
  // La versión de una barra ES la regresión que esto persigue, no una variante aceptable.
  //
  // `textContent` no entra aquí a propósito: asignar a `textContent` no reinterpreta marcado,
  // así que `Cabecera.jsx` está a salvo sin escapar nada.
  const fallos = [];
  // Se barre `scripts/` ADEMAS de `src/`, y no es un detalle: el mismo agujero estaba en
  // `scripts/prerender.mjs`, que es el que produce el HTML SERVIDO a todo el que entre. La
  // primera version de este contrato solo miraba `src/`: arreglo el camino del cliente y dejo
  // abierto el peor.
  //
  // Y la condicion NO es «usa dangerouslySetInnerHTML». Esa era la segunda version, y tampoco
  // valia: `prerender.mjs` no lo usa, monta la cadena HTML a mano. Vigilar el MECANISMO deja
  // fuera cualquier forma nueva de hacer lo mismo. La propiedad es: **si un archivo serializa
  // JSON-LD y lo mete en una etiqueta <script>, tiene que escapar `<`**. Da igual como la meta.
  //
  // `textContent` queda exento con razon: asignar a `textContent` NO reinterpreta marcado, asi
  // que `Cabecera.jsx` esta a salvo sin escapar nada. Se distingue por que ese camino crea el
  // elemento con `createElement` y nunca escribe la etiqueta como texto.
  for (const ruta of [...leerDirRec("src"), ...leerDirRec("scripts")].filter((f) => /\.(jsx?|mjs)$/.test(f))) {
    // Esta misma suite queda fuera: contiene las cadenas como PATRONES de busqueda, no como
    // codigo que inyecte nada. Sin esto, el contrato se acusa a si mismo.
    if (ruta.endsWith("test-contratos-api.mjs")) continue;
    const s = leerCodigo(ruta);
    if (!s.includes("application/ld+json")) continue;
    if (!/JSON\.stringify/.test(s)) continue;

    // ¿Escribe la etiqueta como TEXTO? Eso es lo peligroso, venga por React o por plantilla.
    const laEscribeComoTexto =
      s.includes("dangerouslySetInnerHTML") || /<script[^>]*application\/ld\+json/.test(s);
    if (!laEscribeComoTexto) continue;

    if (!/replace\(\s*\/<\/g\s*,\s*["']\\\\u003c["']\s*\)/.test(s)) {
      fallos.push(`${ruta} mete JSON-LD en un <script> sin escapar \`<\` con barra doble`);
    }
  }

  check(
    "web: todo JSON-LD inyectado como HTML escapa `<`, para que un nombre del CMS no cierre el <script>",
    fallos.length === 0,
    fallos.join(" · "),
  );
}


zona("comun");
const sinZona = casos.filter((c) => !c.zona).map((c) => c.nombre);
check(
  "reparto: todos los contratos declaran a qué aplicación viajan (web / portal / crm / comun)",
  sinZona.length === 0,
  sinZona.length ? `${sinZona.length} sin zona · p.ej. ${sinZona.slice(0, 3).join(" · ")}` : "",
);

let fallan = 0;
for (const c of casos) {
  if (!c.ok) fallan++;
  const marca = c.ok ? "PASA " : "FALLA";
  console.log(`${marca}  ${c.nombre}${c.ok || !c.detalle ? "" : `  ->  ${c.detalle}`}`);
}
console.log(`\n${casos.length - fallan}/${casos.length} pasan`);
const porZona = Object.fromEntries(ZONAS.map((z) => [z, casos.filter((c) => c.zona === z).length]));
console.log(`reparto  ${ZONAS.map((z) => `${z} ${porZona[z]}`).join("  ·  ")}`);
process.exit(fallan === 0 ? 0 : 1);
