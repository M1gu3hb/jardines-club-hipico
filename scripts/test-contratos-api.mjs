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
const check = (nombre, ok, detalle = "") => casos.push({ nombre, ok, detalle });

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

// ---------------------------------------------------------------- notificar
{
  const front = leer("src/lib/notificar.js");
  const api = leer("api/notificar.js");

  const cuerpo = [...front.matchAll(/JSON\.stringify\(\{([^}]*)\}/g)].map((m) => m[1]).join(" ");
  for (const campo of ["accion", "eventoId"]) {
    check(`notificar: el front envía \`${campo}\``, cuerpo.includes(campo), cuerpo.trim());
  }
  check(
    "notificar: el front ya NO envía `titulo` en el cuerpo HTTP",
    !/JSON\.stringify\(\{[^}]*\btitulo\b/.test(front),
  );

  const accionesFront = [...front.matchAll(/^\s{2}(\w+):\s*"(\w+)",/gm)].map((m) => m[2]);
  const accionesApi = [...api.matchAll(/^\s{2}(\w+):\s*\{ pretitulo/gm)].map((m) => m[1]);
  const huerfanas = accionesFront.filter((a) => !accionesApi.includes(a));
  check(
    "notificar: toda acción del front existe en la API",
    huerfanas.length === 0,
    huerfanas.join(", "),
  );
  check("notificar: la API exige eventoId", /!eventoId \|\|/.test(api));
  check("notificar: la API verifica que la acción ocurrió", /accionOcurrio/.test(api));
}

// ---------------------------------------------------------------- correo-cliente
{
  const front = leer("src/components/admin/eventos/EventoDocumentos.jsx");
  const api = leer("api/correo-cliente.js");
  // SIN comentarios: la cabecera de la ruta cita el código viejo (`select("id, nombre, …")`,
  // `"Tu cotización está lista"`) para explicar el fallo, y las afirmaciones negativas de
  // abajo casaban con esa explicación en vez de con el código. Es justo el falso positivo
  // que `leerCodigo` existe para evitar.
  const apiCodigo = leerCodigo("api/correo-cliente.js");
  check("correo-cliente: el front envía `documentoId`", /documentoId:/.test(front));
  check(
    "correo-cliente: el front ya NO envía el nombre del documento",
    !/documento:\s*doc\.titulo/.test(front),
  );
  check("correo-cliente: la API exige rol admin", /rol:\s*"admin"/.test(api));
  // LA RUTA NUNCA FUNCIONÓ: pedía `nombre` y la tabla tiene `titulo`. PostgREST devolvía
  // 42703, el `error` se descartaba y `doc` quedaba en null, así que la guarda de pertenencia
  // lo tomaba por documento ajeno y respondía 400 en TODOS los casos.
  check(
    "correo-cliente: lee las columnas que la tabla tiene de verdad",
    /\.select\("id, titulo, tipo, evento_id"\)/.test(apiCodigo) && !/select\("[^"]*\bnombre\b/.test(apiCodigo),
  );
  check(
    "correo-cliente: un fallo de lectura no se disfraza de «documento ajeno»",
    /error: errDoc/.test(apiCodigo) && /if \(errDoc\)[\s\S]{0,300}lectura_fallida/.test(apiCodigo),
  );
  // El botón "Avisar" está en TODOS los documentos, así que el titular no puede dar por hecho
  // que es una cotización.
  //
  // La negativa se afirma sobre la LLAMADA a `plantillaOro` y sobre el asunto, no sobre el
  // archivo: "Tu cotización está lista" tiene que seguir existiendo dentro de `ENCABEZADOS`
  // —es el caso de la cotización— y prohibirlo en todo el archivo hacía fallar código correcto.
  {
    const plantilla = entre(apiCodigo, "plantillaOro({", "});");
    const envio = entre(apiCodigo, "await enviarCorreo({", "});");
    check(
      "correo-cliente: el titular se adapta al tipo real del documento",
      /const ENCABEZADOS = \{/.test(apiCodigo) &&
        /titulo: enc\.titulo/.test(plantilla) && !/titulo: "Tu cotización/.test(plantilla) &&
        /\$\{enc\.asunto\}/.test(envio) && !/Ver mi cotización/.test(plantilla),
      plantilla ? "" : "no se encontró la llamada a plantillaOro",
    );
  }
  check(
    "correo-cliente: la API comprueba que el documento sea del evento",
    /doc\.evento_id !== ev\.id/.test(api),
  );
}

// ---------------------------------------------------------------- solicitud
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

// ---------------------------------------------------------------- escapado de correos
for (const ruta of [
  "api/notificar.js",
  "api/correo-cliente.js",
  "api/crear-admin.js",
  "api/crear-usuario-evento.js",
  "api/cron-recordatorios.js",
  "api/solicitud.js",
]) {
  const s = leer(ruta);
  if (!/plantillaOro/.test(s)) continue;
  check(`${ruta}: importa escHtml`, /escHtml/.test(s));
  // Interpolaciones dentro de cuerpoHtml que no pasan por escHtml ni son
  // fragmentos ya construidos.
  const cuerpos = [...s.matchAll(/cuerpoHtml:\s*`([\s\S]*?)`,/g)].map((m) => m[1]);
  const crudas = cuerpos
    .flatMap((c) => [...c.matchAll(/\$\{([^}]+)\}/g)].map((m) => m[1].trim()))
    .filter((e) => !/^escHtml\(/.test(e))
    .filter((e) => !/^(detalleHtml|cuerpo|bloque|panelUrl)$/.test(e));
  check(`${ruta}: sin variables sin escapar en cuerpoHtml`, crudas.length === 0, crudas.join(" | "));
}

// ---------------------------------------------------------------- cron fail-closed
{
  const s = leerCodigo("api/cron-recordatorios.js");
  check("cron: falla cerrado si falta CRON_SECRET", /if \(!secret\)/.test(s));
  check("cron: no continúa cuando la variable no existe", !/if \(secret\)\s*\{/.test(s));
  check("cron: comparación en tiempo constante", /igualSeguro/.test(s));
  check("cron: limita el método HTTP", /req\.method !== "GET"/.test(s));
}

// ---------------------------------------------------------------- primer acceso
{
  const api = leer("api/canjear-acceso.js");
  const front = leer("src/components/portal/PortalLogin.jsx");
  check("acceso: canje en dos fases", /canjear_acceso_iniciar/.test(api) && /canjear_acceso_confirmar/.test(api));
  check("acceso: libera el lease si falla el paso intermedio", /canjear_acceso_liberar/.test(api));
  check("acceso: el servidor decide el destino según el rol", /destino/.test(api) && /fila\.rol === "admin"/.test(api));
  check("acceso: el front respeta el destino del servidor", /destino/.test(front));
  check("acceso: el front ya no decodifica credenciales en base64", !/atob\(/.test(front));
}

// ---------------------------------------------------------------- credenciales en correos
for (const ruta of ["api/crear-admin.js", "api/crear-usuario-evento.js"]) {
  const s = leer(ruta);
  check(`${ruta}: sin contraseña en el correo`, !/Contraseña: \$\{password\}/.test(s));
  check(`${ruta}: sin enlace con credenciales en base64`, !/toString\("base64"\)/.test(s));
  check(`${ruta}: usa enlace de un solo uso`, /crear_acceso_unico/.test(s));
}

// ---------------------------------------------------------------- corte por idempotencia
// El corte en `duplicado` tiene que devolver la MISMA FORMA que el camino de
// éxito. Cuando no lo hacía, el panel escribía `usuario: undefined` en el estado
// del evento y volvía a pedir credenciales para un evento que ya las tenía.
{
  const api = leerCodigo("api/crear-usuario-evento.js");
  const front = leer("src/components/admin/eventos/EventoDatos.jsx");
  check(
    "crear-usuario-evento: el corte por duplicado devuelve la identidad",
    /duplicado: true, userId: ev\.auth_user_id, usuario: ev\.usuario/.test(api),
  );
  check(
    "crear-usuario-evento: la identidad se relee de la fila, no del cuerpo",
    /from\("eventos"\)[\s\S]{0,120}auth_user_id/.test(api),
  );
  check("EventoDatos: distingue duplicado antes de dar por creadas", /r\.duplicado/.test(front));
}
{
  const api = leerCodigo("api/crear-admin.js");
  const front = leer("src/components/admin/AdminAdministradores.jsx");
  check("crear-admin: el corte por duplicado no inventa correoEnviado",
    /duplicado: true, userId/.test(api) && !/duplicado: true, correoEnviado/.test(api));
  check("AdminAdministradores: distingue duplicado", /r\.duplicado/.test(front));
}
// Las dos rutas de ALTA responden 429 en `en_curso` (no 200 como las de correo):
// un alta en vuelo todavía puede fallar y compensarse.
for (const ruta of ["api/crear-admin.js", "api/crear-usuario-evento.js"]) {
  const s = leerCodigo(ruta);
  check(`${ruta}: en_curso responde 429, no 200`, /idem === "en_curso"\) return generico\(res, 429\)/.test(s));
}

// ---------------------------------------------------------------- errores de supabase-js
// supabase-js resuelve con { error } en vez de rechazar: `.catch()` no atrapa nada.
for (const ruta of [
  "api/notificar.js", "api/correo-cliente.js", "api/solicitud.js",
  "api/crear-admin.js", "api/crear-usuario-evento.js",
  "api/cron-recordatorios.js", "api/canjear-acceso.js",
]) {
  const s = leerCodigo(ruta);
  check(`${ruta}: sin .catch(() => {}) sobre llamadas a Supabase`, !/\.catch\(\(\) => \{\}\)/.test(s));
  check(`${ruta}: sin .then(() => {}, () => {})`, !/\.then\(\(\) => \{\},\s*\(\) => \{\}\)/.test(s));
}

// Compensaciones comprobables
for (const ruta of ["api/crear-admin.js", "api/crear-usuario-evento.js"]) {
  const s = leerCodigo(ruta);
  check(`${ruta}: la compensacion usa compensarAlta (comprobada)`, /compensarAlta/.test(s));
  check(`${ruta}: no borra usuarios sin comprobar`, !/deleteUser\([^)]*\)\.catch/.test(s));
}
{
  const s = leerCodigo("api/canjear-acceso.js");
  check("canjear-acceso: libera el lease con rpcSeguro", /rpcSeguro\(admin, "canjear_acceso_liberar"/.test(s));
  check("canjear-acceso: deja evidencia si no pudo liberar", /lease_no_liberado/.test(s));
}

// idemCerrar comprobado en la ruta de exito
for (const ruta of [
  "api/notificar.js", "api/correo-cliente.js", "api/solicitud.js",
  "api/crear-admin.js", "api/crear-usuario-evento.js",
]) {
  const s = leerCodigo(ruta);
  check(`${ruta}: comprueba el booleano de idemCerrar`, /(const cerrad\w+ = await idemCerrar)/.test(s));
  check(`${ruta}: audita el incidente si no cerro`, /idem_no_cerrada/.test(s));
}
{
  const s = leerCodigo("api/cron-recordatorios.js");
  check("cron: comprueba idemCerrar y las escrituras", /escrituraOk/.test(s) && /incidentes/.test(s));
  check("cron: no marca resena_recordada sin confirmar", /cierre_incompleto/.test(s));
  const doc = leer("api/cron-recordatorios.js");
  check("cron: documenta semantica at-least-once", /AT-LEAST-ONCE/.test(doc));
}

// ---------------------------------------------------------------- plano del salón
// Los fallos que ya ocurrieron: el rollback borraba el archivo de una escritura
// que sí había cuajado, porque la relectura no distinguía "no hay fila" de "la
// lectura falló".
{
  const s = leerCodigo("src/components/admin/SalonPlanoUpload.jsx");
  const cConfirmar = entre(s, "const confirmar = async", "const borrarObjeto");
  const cSubir = entre(s, "const subir = async", "const quitar = async");
  const cQuitar = entre(s, "const quitar = async", "if (!salonId)");

  // `confirmar()` tiene que devolver los TRES estados. Se comprueba dentro de su
  // cuerpo, no en todo el archivo: si no, cualquier literal suelto lo daría por
  // bueno.
  check(
    "plano: la confirmación distingue tres estados, no dos",
    /"si"/.test(cConfirmar) && /"no"/.test(cConfirmar) && /"desconocido"/.test(cConfirmar),
    cConfirmar ? "" : "no se encontró confirmar()",
  );
  check(
    "plano: la confirmación lee con filterEstricto, no con el filter que devuelve []",
    /filterEstricto\(/.test(cConfirmar) && !/SalonPlano\.filter\(/.test(s),
    cConfirmar ? "" : "no se encontró confirmar()",
  );

  // Orden dentro de `subir`, no distancia: la rama "desconocido" tiene que
  // desarmar el rollback (`subidoPath = null`) y ENTONCES cortar, antes de que el
  // `catch` llegue a `borrarObjeto`. Si el `throw` va primero, el archivo de una
  // escritura que sí cuajó se borra igual.
  {
    const iDesc = cSubir.indexOf('post.estado === "desconocido"');
    const rama = iDesc < 0 ? "" : cSubir.slice(iDesc);
    const iNull = rama.indexOf("subidoPath = null");
    const iThrow = rama.indexOf("throw");
    check(
      'plano: con "desconocido" NO se hace rollback',
      iDesc >= 0 && iNull >= 0 && iThrow > iNull,
      iDesc < 0
        ? "subir() no distingue el estado desconocido"
        : "el rollback no se desarma antes de cortar",
    );
  }

  // Lo que evita el desastre en `quitar` son las DOS guardas, no que la llamada a
  // `confirmar()` esté cerca de `borrarObjeto`: dejando la llamada y quitando las
  // guardas, el archivo se borra pase lo que pase con la fila.
  {
    const iBorrar = cQuitar.indexOf("borrarObjeto(");
    const limite = iBorrar < 0 ? -1 : iBorrar;
    check(
      'plano: quitar corta con "desconocido" antes de tocar el bucket',
      cortaAntesDe(cQuitar, 'post.estado === "desconocido"', limite),
      cQuitar ? "" : "no se encontró quitar()",
    );
    check(
      "plano: quitar corta si la fila sigue viva",
      cortaAntesDe(cQuitar, 'post.estado === "si"', limite),
      cQuitar ? "" : "no se encontró quitar()",
    );
  }

  // Atado a la ESCRITURA. El identificador sobrevive en las dos lecturas
  // (`actual?.imagenPlanoPath`, `plano.imagenPlanoPath`), que son justo las que no
  // importan: sin el path en `datos` cada reemplazo deja un huérfano público sin asa,
  // y con `/imagenPlanoPath/` a secas quitarlo de la escritura pasaba 94/94.
  check(
    "plano: el path se ESCRIBE en la fila (si no, el huérfano no se puede limpiar)",
    /const\s+datos\s*=\s*\{[^}]*imagenPlanoPath\s*:/.test(s),
  );
  // Tolerante al espaciado: partir el mismo `if` en tres líneas no cambia la lógica.
  check(
    "plano: no se escriben medidas nulas sobre unas válidas",
    /if\s*\(\s*medidas\s*\)\s*\{\s*datos\.ancho\s*=/.test(s),
  );
}
{
  const s = leerCodigo("src/api/base44Client.js");
  // El `throw` que importa es el del cuerpo estricto, no uno cualquiera del archivo: medido
  // por distancia, el contrato llegó a sostenerse sobre el texto de un `console.error`.
  // Desde 8E ese cuerpo es compartido (`runQueryEstricto`), así que se afirman las dos mitades:
  // que el cuerpo lanza, y que las dos lecturas estrictas son ese cuerpo y no otro.
  const cEstricto = entre(s, "async function runQueryEstricto(", "\nfunction makeEntity(");
  check(
    "shim: la lectura estricta propaga el error en vez de devolver []",
    /throw error/.test(cEstricto),
    cEstricto ? "" : "no se encontró runQueryEstricto",
  );
  const cFiltro = entre(s, "async filterEstricto(", "async get(");
  check(
    "shim: filterEstricto y listEstricto usan ese cuerpo, no `runQuery`",
    /async filterEstricto\(filter, sort\) \{ return runQueryEstricto\(/.test(cFiltro) &&
      /async listEstricto\(sort\) \{ return runQueryEstricto\(/.test(cFiltro) &&
      !/return runQuery\(/.test(cFiltro),
    cFiltro ? "" : "no se encontró filterEstricto",
  );
  check("shim: storage.remove distingue 'no borró nada'", /borrado: Array\.isArray\(data\)/.test(s));
}

// ---------------------------------------------------------------- operativo
{
  const s = leerCodigo("src/components/admin/AdminOperativo.jsx");
  const carga = entre(s, "const cargar = useCallback", "useEffect(");

  // LA CADENA DEL GUARDARRAÍL, eslabón por eslabón. Romper cualquiera reintroduce
  // el fallo de 5B —bypass del bloqueo, "sin acceso" imposible de mostrar, aviso
  // que no dispara—, así que no basta con comprobar el último.
  //
  //   Evento(operativoActivo: true) -> idsActivos -> vigentesDe -> alternarGlobal
  check(
    "operativo: la carga trae SOLO los eventos con el operativo activo",
    /Evento\.filterEstricto\(\s*\{[^}]*operativoActivo:\s*true/.test(carga),
    carga.trim() || "no se encontró cargar()",
  );
  check(
    "operativo: `idsActivos` sale de esos eventos",
    /idsActivos\s*=\s*new Set\(\s*eventos\.map\(/.test(s),
  );
  // Atado a la definición de `vigentesDe`, no al archivo entero: `inertesDe`
  // también menciona `idsActivos`, así que buscarlo suelto daba por bueno el
  // conteo sin cruzar. (Comprobado reintroduciendo el fallo: no lo atrapaba.)
  {
    const def = (s.match(/const vigentesDe = [\s\S]*?;\n/) || [""])[0];
    check(
      "operativo: `vigentesDe` cruza contra los eventos ACTIVOS",
      /idsActivos\.has\(a\.eventoId\)/.test(def),
      def.trim() || "no se encontró vigentesDe",
    );
  }
  check(
    "operativo: el guardarraíl usa ese conteo cruzado",
    /vigentes = vigentesDe\(persona\.id\)\.length[\s\S]{0,200}accesoGlobal && vigentes === 0/.test(s),
  );

  // "Visibles y revocables" es una propiedad de UI, así que se mira la UI. Con
  // `/inertesDe/` a secas bastaba con que la definición existiera: borrar el bloque
  // JSX que las pinta las devolvía a ser invisibles e irrevocables y pasaba igual.
  {
    const def = (s.match(/const inertesDe = [\s\S]*?;\n/) || [""])[0];
    check(
      "operativo: `inertesDe` selecciona lo que NO da acceso",
      /!idsActivos\.has\(a\.eventoId\)/.test(def),
      def.trim() || "no se encontró inertesDe",
    );
  }
  check(
    "operativo: las asignaciones a eventos cerrados se PINTAN y se pueden revocar",
    // `a.eventoId` en el handler distingue este render del de los chips activos,
    // que pasa `ev` y quedaría fuera del contrato.
    /inertesDe\([^)]*\)\.map\(/.test(s) && /alternarAsignacion\(\s*p,\s*\{[^}]*a\.eventoId/.test(s),
  );

  // Atado a las lecturas de `cargar`. La mitad positiva anterior la satisfacía el
  // `filterEstricto` de `alternarGlobal`, y la negativa casaba con una sola grafía.
  check(
    "operativo: la carga no confunde 'vacío' con 'falló'",
    /OperativoPersonal\.filterEstricto\(/.test(carga) && /Evento\.filterEstricto\(/.test(carga),
    carga.trim() || "no se encontró cargar()",
  );

  // Atado al `disabled` del botón, no a que la función exista: restaurar el
  // `disabled` viejo reintroducía la carrera literal con `ocupadaPersona` todavía
  // definida en el archivo, y la suite pasaba entera.
  check(
    "operativo: el botón global se bloquea con cualquier operación en vuelo",
    /disabled=\{\s*ocupadaPersona\(\s*p\.id\s*\)/.test(s),
  );
  {
    const def = (s.match(/const ocupadaPersona = [\s\S]*?;\n/) || [""])[0];
    check(
      "operativo: `ocupadaPersona` cubre el botón global Y los chips",
      /g:\$\{personalId\}/.test(def) && /startsWith\(/.test(def),
      def.trim() || "no se encontró ocupadaPersona",
    );
  }
}
{
  const s = leerCodigo("src/api/base44Client.js");
  // `operativo_asignacion` conserva historial: revocar es `revocada_at`.
  const bloque = (s.match(/const asignaciones = \{[\s\S]*?\n\};/) || [""])[0];
  check("asignaciones: revocar marca revocada_at", /revocada_at: new Date\(\)/.test(bloque));
  check("asignaciones: NUNCA se borra la fila", !/\.delete\(\)/.test(bloque));
  check("asignaciones: asignar es idempotente (reactiva la revocada)", /revocada_at: null/.test(bloque));
}

// ---------------------------------------------------------------- solicitudes: estatus
// El fallo real: `sec_07` puso un CHECK con cinco estatus y el panel seguía ofreciendo otros
// tres. Solo coincidía "Nueva", así que CUALQUIER cambio violaba el CHECK (23514) — y como
// `updateStatus` no capturaba nada, el desplegable volvía solo y el dueño no veía por qué.
{
  const jsx = leerCodigo("src/components/admin/AdminSolicitudes.jsx");
  const sql = leer(migracion("sec_07"));
  // La lista dejó de vivir en el componente: ahora está en el catálogo, que es el único sitio
  // donde puede vivir una lista espejo de la base. El contrato la sigue hasta allí.
  const catalogo = leerCodigo("src/lib/catalogos.js");
  const listaSolicitud = (catalogo.match(/SOLICITUD_ESTATUS = \[([^\]]*)\]/) || ["", ""])[1];

  // Se cruzan los DOS archivos: la lista del catálogo contra el CHECK de la migración. Afirmar
  // solo sobre uno de ellos dejaría pasar exactamente la divergencia que causó el fallo.
  {
    const restriccion = (sql.match(/solicitudes_estatus_valido[\s\S]*?check \(([\s\S]*?)\);/) || ["", ""])[1];
    const enBase = [...restriccion.matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
    const enPanel = [...listaSolicitud.matchAll(/"([^"]+)"/g)].map((m) => m[1]).sort();
    check(
      "solicitudes: el catálogo ofrece EXACTAMENTE los estatus que admite el CHECK de sec_07",
      enBase.length > 0 && enPanel.length > 0 && enBase.join("|") === enPanel.join("|"),
      `base=[${enBase.join(", ")}]  catálogo=[${enPanel.join(", ")}]`,
    );
  }

  // Cada estatus ofrecido tiene color: si no, `STATUS_COLORS[…]` sale `undefined` y el
  // `className` del <select> queda sin borde ni fondo.
  {
    const colores = (jsx.match(/const STATUS_COLORS = \{([\s\S]*?)\n\};/) || ["", ""])[1];
    const sinColor = [...listaSolicitud.matchAll(/"([^"]+)"/g)].map((m) => m[1]).filter((e) => !colores.includes(`"${e}"`));
    check("solicitudes: todos los estatus ofrecidos tienen color", sinColor.length === 0, sinColor.join(", "));
  }

  // Atado al cuerpo de `updateStatus`, no al archivo: el fallo era invisible porque esta
  // función concreta no capturaba nada.
  {
    const cuerpo = entre(jsx, "const updateStatus = async", "return (");
    check(
      "solicitudes: updateStatus captura el fallo y lo enseña",
      /catch \(/.test(cuerpo) && /setError\(/.test(cuerpo),
      cuerpo ? "" : "no se encontró updateStatus",
    );
    check(
      "solicitudes: al fallar, el desplegable se repone con el valor de la base",
      cortaAntesDe(cuerpo, "catch (", cuerpo.indexOf("finally")) || /catch \([\s\S]*?await load\(\)/.test(cuerpo),
      cuerpo ? "" : "no se encontró updateStatus",
    );
    // ORDEN: la confirmación tiene que ir ANTES de decir que se guardó. Al revés, el mensaje
    // de éxito afirma algo que todavía no consta.
    const iConf = cuerpo.indexOf("filterEstricto");
    // El `setOk` que importa es el del MENSAJE, no el `setOk("")` que limpia al empezar.
    // Buscar `setOk(` a secas encontraba el reinicio —que va antes de todo— y el contrato
    // fallaba sobre código correcto. (Lo atrapó él mismo al escribirlo.)
    const iOk = cuerpo.search(/setOk\([^")]/);
    check(
      "solicitudes: se confirma releyendo ANTES de decir que se guardó",
      iConf >= 0 && iOk > iConf,
      iConf < 0 ? "updateStatus no relee con filterEstricto" : "el mensaje de éxito va antes de la confirmación",
    );
    check(
      "solicitudes: no se muestra el error crudo de Postgres",
      /mensajeDeError\(/.test(cuerpo) && !/setError\(\s*(e|err)[.?]/.test(cuerpo),
    );
  }
  check(
    "solicitudes: la carga no confunde 'vacío' con 'falló'",
    /SolicitudEvento\.filterEstricto\(null/.test(jsx) && !/SolicitudEvento\.list\(/.test(jsx),
  );
}

// ---------------------------------------------------------------- notificaciones: se BORRAN
// Decisión del dueño: la actividad del portal se borra, no se archiva. Ni a mano ni a los
// 7 días queda nada. Y `delete` del shim devuelve `{success:true}` pase lo que pase (J-02),
// así que un borrado que RLS rechace en silencio diría "quitadas ✓" sin quitar nada.
{
  const jsx = leerCodigo("src/components/admin/AdminInicio.jsx");
  const cuerpo = entre(jsx, "const quitarNotifs = async", "const noLeidas");

  check(
    "notificaciones: quitar BORRA la fila, no la marca",
    /Notificacion\.delete\(/.test(cuerpo) && !/leida:\s*true/.test(cuerpo),
    cuerpo ? "" : "no se encontró quitarNotifs",
  );
  // ORDEN: la guarda tiene que cortar antes de que se pise el estado de la pantalla — y eso
  // se mide contra el PRIMER `setNotifs(`, sea cual sea su argumento. Anclarlo a
  // `setNotifs(frescas` dejaba pasar un `setNotifs([])` colado antes de confirmar: la lista
  // se vaciaba en pantalla aunque la base hubiera rechazado el borrado. (Lo atrapó la
  // mutación; el contrato anterior no.)
  {
    const iConf = cuerpo.indexOf("filterEstricto");
    const iPinta = cuerpo.search(/setNotifs\(/);
    check(
      "notificaciones: el borrado se confirma releyendo antes de pintar",
      iConf >= 0 && iPinta > iConf && cortaAntesDe(cuerpo, "if (sobreviven)", iPinta),
      iConf < 0 ? "quitarNotifs no relee" : "la pantalla se pisa antes de confirmar el borrado",
    );
  }
  check(
    "notificaciones: si el borrado falla, se avisa y se recarga",
    /catch \(/.test(cuerpo) && /setErrorNotif\(/.test(cuerpo) && /await cargarNotifs\(\)/.test(cuerpo),
    cuerpo ? "" : "no se encontró quitarNotifs",
  );
  // Se borra por notificación Y por grupo: atado a las dos llamadas del render, no a que
  // la función exista.
  check(
    "notificaciones: se puede quitar una sola y el grupo entero",
    /quitarNotifs\(\[n\.id\]/.test(jsx) && /quitarNotifs\(items\.map\(\(n\) => n\.id\)/.test(jsx),
  );
  check(
    "notificaciones: la carga no confunde 'vacío' con 'falló'",
    /Notificacion\.filterEstricto\(null/.test(jsx) && !/Notificacion\.list\(/.test(jsx),
  );
  // `marcarLeidas` se conserva a propósito (ver su cabecera), pero ya no puede mentir.
  {
    const marcar = entre(jsx, "const marcarLeidas = async", "const hoy =");
    check(
      "notificaciones: marcar leídas también confirma la escritura",
      /filterEstricto/.test(marcar) && /siguenSinLeer/.test(marcar) && /catch \(/.test(marcar),
      marcar ? "" : "no se encontró marcarLeidas",
    );
  }
}
{
  const cron = leerCodigo("api/cron-recordatorios.js");
  const limpieza = entre(cron, "let notifsBorradas = 0;", "// 1)");
  // Tolerante al espaciado: partir la cadena de supabase-js en varias líneas es reformateo,
  // no una regresión. (El contrato de una sola línea daba falso positivo.)
  check(
    "cron: borra la actividad de más de 7 días (no la archiva)",
    /from\(\s*"notificaciones"\s*\)\s*\.delete\(\s*\)\s*\.lt\(\s*"created_at"/.test(limpieza),
    limpieza ? "" : "no se encontró la limpieza",
  );
  check(
    "cron: cuenta lo REALMENTE borrado, no lo que pidió borrar",
    /\.select\("id"\)/.test(limpieza) && /\(borradas \|\| \[\]\)\.length/.test(limpieza),
    limpieza ? "" : "no se encontró la limpieza",
  );
  // El digest tiene que distinguir "entró hoy" de "se está enfriando": son dos cosas
  // distintas y antes solo se reportaba la segunda, así que el dueño no veía el trabajo nuevo.
  {
    // Anclado a código, no a un comentario: `leerCodigo` los quita, así que `// 1) Digest`
    // no existe en la cadena que se inspecciona y el recorte salía vacío.
    const digest = entre(cron, "let digestEnviado = false;", "const claveDigest");
    check(
      "cron: el digest separa las solicitudes recientes de las estancadas",
      /recientes\.map\(/.test(digest) && /estancadas\.map\(/.test(digest),
      digest ? "" : "no se encontró el digest",
    );
    check(
      "cron: `recientes` son las de las últimas 24 h, no todas",
      /const recientes = \(solicitudes \|\| \[\]\)\.filter\([\s\S]*?created_at >= hace24h\)/.test(cron) &&
        /const hace24h = new Date\(hoy\.getTime\(\) - 86400000\)/.test(cron),
    );
    check(
      "cron: el digest se manda también cuando SOLO hay solicitudes recientes",
      /if \(recientes\.length \|\|/.test(digest),
      digest ? "" : "no se encontró el digest",
    );
    check(
      "cron: cada bloque dice qué hacer, no solo el número",
      /const bloque = \(titulo, quehacer, items\)/.test(digest) && /escHtml\(quehacer\)/.test(digest),
      digest ? "" : "no se encontró el digest",
    );
    check(
      "cron: el digest reporta cuántos avisos borró la limpieza",
      /pieLimpieza[\s\S]*?\$\{notifsBorradas\}/.test(digest) && /cuerpo \+ pieLimpieza/.test(cron),
      digest ? "" : "no se encontró el digest",
    );
  }
  check(
    "cron: la limpieza queda auditada en sus dos caminos",
    /auditar\(admin, "cron_limpieza_notificaciones", "ok"/.test(limpieza) &&
      /auditar\(admin, "cron_limpieza_notificaciones", "error"/.test(limpieza),
    limpieza ? "" : "no se encontró la limpieza",
  );
}

// ---------------------------------------------------------------- catálogos (listas cerradas)
// EL PATRÓN QUE YA COSTÓ DOS BUGS: una lista de opciones declarada dentro del componente que la
// usa, que nadie cruza contra la restricción de la base.
//   1. `AdminSolicitudes` ofrecía tres estatus que el CHECK no admitía  → bloque 7A
//   2. `EventoDocumentos` ofrecía el tipo "comprobante", inexistente    → esta etapa
//
// Un contrato estático no puede consultar la base, pero SÍ puede impedir la vía por la que se
// coló: que exista una segunda copia de la lista fuera del catálogo. Mientras solo haya una,
// el cruce contra la base se hace en un sitio y se revisa en un sitio.
{
  const catalogo = leerCodigo("src/lib/catalogos.js");

  // CADA LISTA CONTRA SU RESTRICCIÓN DECLARADA.
  //
  // Un contrato estático no puede consultar Postgres, pero la restricción real está escrita
  // literal encima de cada catálogo en una línea `RESTRICCION: [...]`. Comparar las dos
  // mitades atrapa el fallo que de verdad ocurrió las dos veces: alguien añade un valor a la
  // lista de la UI que la base no admite.
  //
  // Lo que NO prueba: que la línea `RESTRICCION` coincida con producción. Si se editan las dos
  // a la vez, pasa. Esa comprobación es humana, al revisar el diff — y por eso la línea está
  // escrita literal y adyacente.
  //
  // (Se descubrió mutando: la primera versión de este contrato solo exigía que el comentario
  //  mencionara el nombre de la restricción, así que devolver "comprobante" al catálogo pasaba
  //  146/146. Un contrato que no atrapa su propia regresión es peor que ninguno.)
  {
    const doc = leer("src/lib/catalogos.js");
    for (const nombre of ["DOCUMENTO_TIPOS", "EVENTO_ESTATUS", "SOLICITUD_ESTATUS", "MESA_FORMAS", "MUSICA_TIPOS"]) {
      const i = doc.indexOf(`export const ${nombre}`);
      const cabecera = i < 0 ? "" : doc.slice(Math.max(0, i - 900), i);
      // La ÚLTIMA de la cabecera, no la primera: la ventana de 900 caracteres alcanza el
      // bloque del catálogo anterior, así que `match` a secas cogía su restricción y todos
      // menos el primero fallaban contra la lista equivocada.
      const todas = [...cabecera.matchAll(/RESTRICCION:\s*\[([^\]]*)\]/g)];
      const declarada = todas.length ? todas[todas.length - 1][1] : "";
      const enBase = [...declarada.matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
      const lista = (doc.slice(i).match(/= \[([^\]]*)\]/) || ["", ""])[1];
      const enUI = [...lista.matchAll(/"([^"]+)"/g)].map((m) => m[1]).sort();
      check(
        `catálogos: ${nombre} ofrece EXACTAMENTE lo que admite su restricción`,
        enBase.length > 0 && enUI.length > 0 && enBase.join("|") === enUI.join("|"),
        i < 0 ? "no existe" : `restricción=[${enBase.join(", ")}]  lista=[${enUI.join(", ")}]`,
      );
    }
  }

  // NINGÚN otro archivo puede declarar la misma lista. Se comprueba buscando el array literal
  // completo de cada catálogo fuera de `catalogos.js`.
  const archivos = [
    "src/components/admin/eventos/EventoDocumentos.jsx",
    "src/components/admin/eventos/AdminEventos.jsx",
    "src/components/admin/eventos/EventoDatos.jsx",
    "src/components/admin/eventos/_ui.jsx",
    "src/components/admin/AdminSolicitudes.jsx",
    "src/components/admin/SalonPlanoUpload.jsx",
    "src/components/mesas/MesaEditor.jsx",
    "src/components/mesas/MesaReglas.jsx",
    "src/components/portal/PortalDocumentos.jsx",
  ];
  const catalogos = [...catalogo.matchAll(/export const ([A-Z_]+) = \[([^\]]*)\]/g)].map((m) => ({
    nombre: m[1],
    valores: [...m[2].matchAll(/"([^"]+)"/g)].map((v) => v[1]),
  }));
  const duplicados = [];
  for (const ruta of archivos) {
    const s = leerCodigo(ruta);
    for (const { nombre, valores } of catalogos) {
      if (valores.length < 2) continue;
      // Un array literal que empiece por el primer valor y contenga el segundo = copia de la lista.
      const re = new RegExp(`\\[\\s*"${valores[0]}"\\s*,[^\\]]*"${valores[1]}"`);
      if (re.test(s)) duplicados.push(`${ruta} redeclara ${nombre}`);
    }
  }
  check(
    "catálogos: ningún componente declara su propia copia de una lista de la base",
    duplicados.length === 0,
    duplicados.join(" · "),
  );

  // El tipo "comprobante" no existe en `documentos_tipo_check`. No puede volver por ningún
  // lado: ni el desplegable, ni un icono, ni un texto que se lo prometa al cliente.
  for (const ruta of [
    "src/components/admin/eventos/EventoDocumentos.jsx",
    "src/components/portal/PortalDocumentos.jsx",
    "src/components/portal/PortalShell.jsx",
  ]) {
    check(
      `documentos: «comprobante» no vuelve a aparecer en ${ruta.split("/").pop()}`,
      !/comprobante/i.test(leerCodigo(ruta)),
    );
  }

  // El `accept` del selector de archivos sale del catálogo, no de un comodín. `image/*` incluye
  // HEIC (lo que sale de un iPhone), GIF y SVG — ninguno admitido por el bucket `clientes`.
  {
    const s = leerCodigo("src/components/admin/eventos/EventoDocumentos.jsx");
    check(
      "documentos: el selector de archivos ofrece SOLO lo que admite el bucket",
      /accept=\{BUCKET_MIME\[BUCKET\]\.join\(","\)\}/.test(s) && !/image\/\*/.test(s),
    );
  }
}

// ---------------------------------------------------------------- documentos: subir y borrar
{
  const s = leerCodigo("src/components/admin/eventos/EventoDocumentos.jsx");
  const subir = entre(s, "const subir = async", "const descargar");
  const borrar = entre(s, "const borrar = async", "return (");

  // El archivo se sube ANTES de insertar la fila. Si la fila no cuaja y nadie limpia, queda un
  // huérfano en un bucket privado — y con «comprobante» eso pasaba en cada intento.
  check(
    "documentos: si la fila no cuaja, el archivo subido se limpia",
    /subidoPath = path/.test(subir) && /if \(subidoPath\)[\s\S]{0,200}storage\.remove/.test(subir),
    subir ? "" : "no se encontró subir()",
  );
  check(
    "documentos: la subida se confirma releyendo",
    /filterEstricto[\s\S]{0,200}some\(\(d\) => d\.archivoUrl === path\)/.test(subir),
    subir ? "" : "no se encontró subir()",
  );
  // ORDEN: primero la fila, y el archivo SOLO con confirmación negativa (criterio de 5A).
  {
    const iFila = borrar.indexOf("Documento.delete");
    const iConf = borrar.indexOf("filterEstricto");
    const iArchivo = borrar.indexOf("storage.remove");
    check(
      "documentos: al borrar, el archivo se toca DESPUÉS de confirmar que la fila se fue",
      iFila >= 0 && iConf > iFila && iArchivo > iConf,
      borrar ? `fila=${iFila} confirmación=${iConf} archivo=${iArchivo}` : "no se encontró borrar()",
    );
  }
  check(
    "documentos: el borrado del archivo ya no vive en un catch vacío",
    !/catch \{\s*\/\*[^*]*\*\/\s*\}/.test(borrar) && /const \{ borrado \}/.test(borrar),
    borrar ? "" : "no se encontró borrar()",
  );
  check(
    "documentos: no se enseña el error crudo de Postgres",
    /mensajeDeError\(/.test(s) && !/setError\("No se pudo subir: " \+/.test(s),
  );
  check(
    "documentos: la carga no confunde 'vacío' con 'falló'",
    /Documento\.filterEstricto\(\{ eventoId \}/.test(s) && !/Documento\.filter\(\{ eventoId \}/.test(s),
  );
}

// ---------------------------------------------------------------- eliminar evento (8B)
// La ÚNICA operación irreversible del panel. El orden de los pasos no es estilo: es lo que
// impide dejar archivos sin asa o huérfanas invisibles.
{
  const api = leerCodigo("api/eliminar-evento.js");
  const ui = leerCodigo("src/components/admin/eventos/EventoEliminar.jsx");

  // ORDEN: los paths viven en `documentos`, que cae por CASCADE. Si la fila se borrara antes,
  // los archivos quedarían en el bucket para siempre y sin forma de localizarlos.
  {
    const iStorage = api.indexOf('storage.from(BUCKET).remove');
    const iHuerfanas = api.indexOf('from("notificaciones").delete()');
    const iFila = api.indexOf('from("eventos").delete()');
    const iAuth = api.indexOf("borrarUsuario(");
    check(
      "eliminar-evento: el orden es archivos → huérfanas → fila → usuario de Auth",
      iStorage > 0 && iHuerfanas > iStorage && iFila > iHuerfanas && iAuth > iFila,
      `storage=${iStorage} huerfanas=${iHuerfanas} fila=${iFila} auth=${iAuth}`,
    );
  }
  check(
    "eliminar-evento: se compara lo borrado del bucket con lo pedido",
    /Array\.isArray\(borrados\) \? borrados\.length : 0/.test(api) && /n < rutas\.length/.test(api),
  );
  check(
    "eliminar-evento: un listado truncado corta en vez de dejar archivos sueltos",
    />= TOPE_LISTADO/.test(api) && /listado_truncado/.test(api),
  );
  // Se confirma que NO SOBREVIVE NINGUNA, no que el número coincida con el inventario. Comparar
  // contra un conteo de hace segundos era una carrera garantizada —el cron y el propio cliente
  // escriben en `notificaciones` mientras esto corre— y abortaba en el paso 2, con el bucket ya
  // vaciado. Las DOS huérfanas tienen que confirmarse: recoger el resultado de una y no mirarlo
  // era declarar el criterio y no aplicarlo.
  check(
    "eliminar-evento: las huérfanas se confirman releyendo que no queda ninguna",
    /\.delete\(\)\.eq\("evento_id", eventoId\)\.select\("id"\)/.test(api) &&
      /const notifsVivas = await sobrevivientes\("notificaciones"\)/.test(api) &&
      /if \(notifsVivas > 0\)/.test(api) &&
      /const ubicVivas = await sobrevivientes\("operativo_ubicaciones"\)/.test(api) &&
      /if \(ubicVivas > 0\)/.test(api),
  );
  check(
    "eliminar-evento: la confirmación de huérfanas NO se mide contra el inventario viejo",
    !/hecho\.(notificaciones|ubicaciones) !== inv\./.test(api),
  );
  check(
    "eliminar-evento: el borrado de la fila se confirma releyendo",
    /la fila sigue existiendo/.test(api) && /paso: "confirmar"/.test(api),
  );
  // `resenas` es SET NULL y se conserva A PROPÓSITO: es prueba social del salón.
  check(
    "eliminar-evento: la reseña NO se borra",
    !/from\("resenas"\)\.delete/.test(api) && /resenas/.test(api),
  );
  check(
    "eliminar-evento: la UI avisa de que la reseña seguirá publicada",
    /inv\.resenas > 0/.test(ui) && /NO se borra/.test(ui),
  );
  // El inventario cuenta invitados vía `mesas`: la tabla NO tiene `evento_id`, y pedirlo daría
  // 42703 — el mismo fallo que tuvo `correo-cliente` — con el inventario mostrando 0 justo
  // antes de un borrado irreversible.
  check(
    "eliminar-evento: los invitados se cuentan vía mesas, no por evento_id",
    /cuentaPorLote\("invitados", "mesa_id", await idsDe\("mesas"\)\)/.test(api) &&
      !/"invitados"[\s\S]{0,80}eq\("evento_id"/.test(api),
  );
  // Mismo caso, encontrado al revisar el mapa de FKs entero: `accesos` tampoco tiene `evento_id`
  // (cae por CASCADE desde `invitaciones`, y su `invitacion_id` es NOT NULL, así que ninguno
  // sobrevive al borrado).
  check(
    "eliminar-evento: los accesos se cuentan vía invitaciones, no por evento_id",
    /cuentaPorLote\("accesos", "invitacion_id", await idsDe\("invitaciones"\)\)/.test(api) &&
      !/"accesos"[\s\S]{0,80}eq\("evento_id"/.test(api),
  );
  // `operativo_ubicaciones` tiene PK compuesta y NO tiene `id`.
  check(
    "eliminar-evento: las ubicaciones se confirman por personal_id, no por id",
    /from\("operativo_ubicaciones"\)\.delete\(\)\.eq\("evento_id", eventoId\)\.select\("personal_id"\)/.test(api),
  );
  // La confirmación por nombre se compara contra la FILA. Que el botón se habilite en el
  // navegador no autoriza nada.
  check(
    "eliminar-evento: el nombre se compara contra la fila del servidor",
    /String\(confirmacion \|\| ""\)\.trim\(\) !== String\(ev\.nombre_evento \|\| ""\)\.trim\(\)/.test(api),
  );
  check(
    "eliminar-evento: solo admin, con rate limit e idempotencia",
    /autorizarJardines\(req, admin, \{ rol: "admin" \}\)/.test(api) &&
      /rateLimit\(admin, "eliminar-evento"/.test(api) && /idemIniciar\(admin, "eliminar-evento"/.test(api),
  );
  check(
    "eliminar-evento: si se interrumpe, se dice qué quedó hecho",
    /hecho\.archivos\}\/\$\{hecho\.archivosPedidos\}/.test(api) && /NO borrado/.test(api),
  );
  // La UI no puede prometer que borra una cuenta a partir de `evento.usuario`: una fila puede
  // tener usuario sin `auth_user_id` (los tres duplicados de "Boda ortega" estaban así).
  check(
    "eliminar-evento: la cuenta a borrar la dice el servidor, no el objeto del navegador",
    /cuentaCliente: ev\.auth_user_id \? ev\.usuario : null/.test(api) &&
      /\{cuenta &&/.test(ui) && !/\{evento\.usuario &&/.test(ui),
  );
}

// ---------------------------------------------------------------- borrado de usuarios (8F)
// EL CONTRATO QUE VALE PARA SIEMPRE. `auth.users` es la tabla COMPARTIDA con Vero Seguros y
// `deleteUser` es un hard delete sobre ella. El uuid que se le pasaba venía de
// `jardines.eventos.auth_user_id`, una columna que cualquier admin puede escribir desde el
// navegador (`eventos_upd` no restringe columnas), y nadie comprobaba de quién era. Vero tiene
// UN administrador. Lo que sigue es lo que impide que vuelva a pasar, en este llamador y en
// cualquiera que se escriba después.
{
  const guard = leerCodigo("api/_lib/guard.js");

  // 1) Un solo sitio en TODO el proyecto puede llamar a deleteUser.
  {
    const archivos = [
      "api/_lib/guard.js", "api/_lib/correo.js", "api/eliminar-evento.js", "api/crear-admin.js",
      "api/crear-usuario-evento.js", "api/canjear-acceso.js", "api/notificar.js",
      "api/correo-cliente.js", "api/solicitud.js", "api/cron-recordatorios.js",
      "src/api/base44Client.js", "src/api/supabaseClient.js",
    ];
    const fuera = archivos
      .filter((f) => f !== "api/_lib/guard.js")
      .filter((f) => /deleteUser\s*\(/.test(leerCodigo(f)));
    check(
      "auth: solo `guard.js` puede llamar a deleteUser",
      /deleteUser\s*\(/.test(guard) && fuera.length === 0,
      fuera.join(", "),
    );
  }

  // 2) Y ahí dentro, el deleteUser va DESPUÉS del permiso, no antes ni en paralelo.
  {
    const cuerpo = entre(guard, "export async function borrarUsuario(", "\n}\n");
    const iPermiso = cuerpo.indexOf("permiso?.tipo");
    const iNoDeclarado = cuerpo.indexOf('motivo: "permiso_no_declarado"');
    const iDelete = cuerpo.indexOf("deleteUser(");
    check(
      "borrarUsuario: sin permiso declarado NO se borra, y el permiso se mira antes",
      iPermiso >= 0 && iNoDeclarado > iPermiso && iDelete > iNoDeclarado,
      `permiso=${iPermiso} sin_declarar=${iNoDeclarado} delete=${iDelete}`,
    );
    // El argumento no puede tener valor por defecto: si lo tuviera, olvidarlo dejaría de fallar.
    check(
      "borrarUsuario: `permiso` no tiene valor por defecto",
      /export async function borrarUsuario\(admin, userId, permiso\)/.test(guard),
    );
  }

  // 3) Las cinco comprobaciones de pertenencia, cada una atada a su motivo.
  {
    const cuerpo = entre(guard, "export async function usuarioEsClienteDelEvento(", "\n}\n");
    // Se afirma sobre el ORDEN, no sobre la distancia: cada condición tiene que aparecer, su
    // rechazo detrás, y el rechazo ANTES del `return` de éxito. Un `[\s\S]{0,200}` solo diría
    // que dos textos están cerca, que no es lo mismo que "esto gobierna aquello".
    const iExito = cuerpo.indexOf('motivo: "cliente_del_evento"');
    const reglas = [
      ["dominio del correo", "endsWith(DOMINIO_CLIENTE_PORTAL)", "no_es_cuenta_de_portal"],
      ["marca de otra app", 'app !== "jardines"', "marcado_de_otra_aplicacion"],
      ["rol en perfiles", 'perfil.rol !== "cliente"', "no_es_un_cliente"],
      ["otro evento", 'from("eventos")', "compartido_con_otro_evento"],
      ["personal de operativo", 'from("operativo_personal")', "es_personal_de_operativo"],
    ];
    for (const [nombre, condicion, motivo] of reglas) {
      const iCond = cuerpo.indexOf(condicion);
      const iMotivo = cuerpo.indexOf(motivo);
      check(
        `usuarioEsClienteDelEvento: comprueba ${nombre}`,
        iExito > 0 && iCond >= 0 && iMotivo > iCond && iMotivo < iExito,
        `cond=${iCond} motivo=${iMotivo} exito=${iExito}`,
      );
    }
    // Falla CERRADO: cada lectura que no se pueda hacer devuelve "no", nunca sigue adelante.
    check(
      "usuarioEsClienteDelEvento: una lectura que falla dice que NO",
      /lectura_de_auth_fallida/.test(cuerpo) && /lectura_de_perfiles_fallida/.test(cuerpo) &&
        /lectura_de_eventos_fallida/.test(cuerpo) && /lectura_de_operativo_fallida/.test(cuerpo),
    );
  }

  // 4) La excepción de la compensación. Tiene DOS mitades y hay que vigilar las dos por separado,
  // porque una es una comprobación y la otra es un contrato de llamador.
  //
  // Aquí vivía un contrato que pasaba sin comprobar nada: afirmaba
  // `permiso.creadoEnEstaPeticion !== userId`, y el único llamador pasaba `userId` como las dos
  // cosas — `userId !== userId`, siempre falso, no rechazaba nunca. El contrato era cierto y la
  // propiedad que decía vigilar no existía.
  {
    const cuerpo = entre(guard, "export async function borrarUsuario(", "\n}\n");
    // (i) La mitad que SÍ es una comprobación: la cuenta tiene que ser reciente.
    check(
      "borrarUsuario: la compensación solo borra cuentas recién creadas",
      /usuarioRecienCreado\(admin, userId\)/.test(cuerpo) && !/creadoEnEstaPeticion/.test(cuerpo),
      cuerpo ? "" : "no se encontró borrarUsuario",
    );
    const ventana = entre(guard, "export async function usuarioRecienCreado(", "\n}\n");
    check(
      "usuarioRecienCreado: mide contra `created_at` y falla cerrado",
      /Date\.now\(\) - creado > VENTANA_RECIEN_CREADO_MS/.test(ventana) &&
        /la_cuenta_no_es_reciente/.test(ventana) &&
        /lectura_de_auth_fallida/.test(ventana) && /sin_fecha_de_alta/.test(ventana),
      ventana ? "" : "no se encontró usuarioRecienCreado",
    );
    check(
      "compensarAlta: usa la excepción estrecha, no la de cliente",
      /borrarUsuario\(admin, userId, \{ tipo: "recien_creado_aqui" \}\)/.test(guard),
    );
  }

  // (ii) La mitad que es un CONTRATO DE LLAMADOR, y por eso se verifica aquí y no en ejecución:
  // el uuid que se compensa tiene que salir de `createUser`, nunca de una lectura de la base. Si
  // alguien pasara a `compensarAlta` un `auth_user_id` leído de `eventos`, la compensación se
  // convertiría en el mismo agujero que 8F cerró.
  {
    for (const ruta of ["api/crear-admin.js", "api/crear-usuario-evento.js"]) {
      const s = leerCodigo(ruta);
      // La variable arranca en null y solo se le asigna el id que devuelve `createUser`.
      const asignaciones = [...s.matchAll(/\bnuevoId\s*=\s*([^;]+);/g)].map((m) => m[1].trim());
      const validas = asignaciones.length > 0 &&
        asignaciones.every((v) => v === "null" || v === "created.user.id");
      // Y lo que se compensa es esa variable, no otra cosa.
      const compensaciones = [...s.matchAll(/compensarAlta\(admin,\s*\{([\s\S]*?)\}\)/g)]
        .map((m) => m[1]).filter((c) => /userId\s*:/.test(c));
      const compensanNuevoId = compensaciones.length > 0 &&
        compensaciones.every((c) => /userId:\s*nuevoId\b/.test(c));
      check(
        `${ruta}: lo que se compensa es el id que devolvió createUser, no uno leído de la base`,
        validas && compensanNuevoId,
        `asignaciones=[${asignaciones.join(" | ")}] compensaciones=${compensaciones.length}`,
      );
    }
    // Nadie más puede llamar a `compensarAlta`: un tercer llamador quedaría fuera del contrato de
    // arriba y la propiedad dejaría de estar cubierta sin que nada fallara.
    const rutas = ["api/eliminar-evento.js", "api/canjear-acceso.js", "api/notificar.js",
                   "api/correo-cliente.js", "api/solicitud.js", "api/cron-recordatorios.js"];
    const intrusos = rutas.filter((r) => /compensarAlta\(/.test(leerCodigo(r)));
    check("compensarAlta: solo la llaman las dos rutas de alta", intrusos.length === 0, intrusos.join(", "));
  }

  // 5) El endpoint pasa el permiso de cliente, con SU eventoId.
  {
    const api = leerCodigo("api/eliminar-evento.js");
    check(
      "eliminar-evento: el borrado del usuario declara que es el cliente de ESE evento",
      /borrarUsuario\(admin, authUserId, \{ tipo: "cliente_de_evento", eventoId \}\)/.test(api),
    );
    // Y el uuid se guarda para la auditoría DEL CATCH: si la fila cuaja y falla la relectura, sin
    // este dato no hay forma de encontrar después la cuenta que quedó viva.
    //
    // Se recorta el catch. Buscar `authUserId` sobre todo el archivo no comprobaba nada: ya
    // aparece en la auditoría del paso 4, así que quitarlo del catch dejaba pasar el contrato —
    // vacuo, y encima sobre la propiedad que más falta hace cuando algo se rompe a mitad.
    // Hay DOS `} catch (e) {` en el archivo —el del inventario y el del borrado— y `entre()`
    // coge el primero: el recorte llegaba hasta el final del fichero e incluía la auditoría del
    // paso 4, que también dice `authUserId`. El contrato volvía a ser vacuo. Se toma el ÚLTIMO.
    const cuerpoCatch = api.slice(api.lastIndexOf("} catch (e) {"));
    check(
      "eliminar-evento: el catch audita el authUserId y el estado real de la fila",
      /authUserId,/.test(cuerpoCatch) && /fila_sin_confirmar/.test(cuerpoCatch) &&
        /ESTADO_FILA\[hecho\.fila\]/.test(cuerpoCatch),
      cuerpoCatch ? "" : "no se encontró el catch",
    );
    // El tercer estado tiene que decir algo distinto de "NO borrado": afirmar que no se borró
    // cuando lo que pasó es que no se pudo comprobar es justo la mentira que hay que evitar.
    check(
      "eliminar-evento: «sin confirmar» no se cuenta como «NO borrado»",
      /sin_confirmar: "no se pudo comprobar/.test(cuerpoCatch),
    );

    // --- storage: las dos fuentes de rutas, y las subcarpetas
    check(
      "eliminar-evento: las rutas salen del listado Y de documentos.archivo_url",
      /from\("documentos"\)\.select\("archivo_url"\)/.test(api) &&
        /const rutasDeTabla = \(docs \|\| \[\]\)[\s\S]{0,120}d\.archivo_url/.test(api),
    );
    // `archivo_url` la escribe el navegador (`documentos_upd` es `is_admin()` sin restricción de
    // columna). Sin acotar al prefijo, este borrado destruiría un objeto arbitrario del bucket
    // `clientes` — los documentos de otro cliente. La unión de fuentes solo es segura acotada.
    {
      const iPrefijo = api.indexOf("const prefijo = `${eventoId}/`");
      const iRutas = api.indexOf("const rutas = [...new Set([");
      check(
        "eliminar-evento: solo se borran rutas dentro de la carpeta del evento",
        iPrefijo > 0 && iRutas > iPrefijo &&
          /rutasDeTabla\.filter\(\(r\) => r\.startsWith\(prefijo\)\)/.test(api) &&
          /archivo_url_fuera_de_prefijo/.test(api),
        `prefijo=${iPrefijo} rutas=${iRutas}`,
      );
    }
    {
      // Una subcarpeta llega con `id: null`; mandarla a `remove` no borra nada y `n < pedidos`
      // dejaba el evento imposible de borrar con el mensaje "0 de 1 archivos".
      const iCarpetas = api.indexOf("o.id === null");
      const iCorte = api.indexOf('motivo: "subcarpetas"');
      const iRutas = api.indexOf("const rutas =");
      check(
        "eliminar-evento: las subcarpetas cortan y no entran en las rutas",
        iCarpetas > 0 && iCorte > iCarpetas && iRutas > iCorte && /o\.id !== null/.test(api),
        `carpetas=${iCarpetas} corte=${iCorte} rutas=${iRutas}`,
      );
    }

    // --- nombre vacío: los TRES sitios
    check(
      "eliminar-evento: el servidor rechaza borrar un evento sin nombre",
      /evento_sin_nombre/.test(api) &&
        /if \(!String\(ev\.nombre_evento \|\| ""\)\.trim\(\)\)/.test(api),
    );
    {
      const ui = leerCodigo("src/components/admin/eventos/EventoEliminar.jsx");
      check(
        "eliminar-evento: el botón exige texto, no solo que coincida",
        /const coincide = escrito\.length > 0 && escrito === nombreReal;/.test(ui),
      );
      const ficha = leerCodigo("src/components/admin/eventos/EventoDatos.jsx");
      const guardar = entre(ficha, "const guardar = async () => {", "setGuardando(true);");
      check(
        "eventos: la ficha no guarda el nombre en blanco",
        /if \(!String\(form\.nombreEvento \|\| ""\)\.trim\(\)\)/.test(guardar) &&
          /setErrorNombre\(/.test(guardar) && /return;/.test(guardar),
        guardar ? "" : "no se encontró `const guardar`",
      );
    }

    // --- cuotas: la de consulta antes de contar, la destructiva antes de comparar el nombre
    {
      const iConsulta = api.indexOf('rateLimit(admin, "eliminar-evento-consulta"');
      const iInventario = api.indexOf("inv = await inventario(");
      const iDestructiva = api.indexOf('rateLimit(admin, "eliminar-evento",');
      const iNombre = api.indexOf('String(confirmacion || "").trim() !==');
      check(
        "eliminar-evento: la cuota de consulta va antes del inventario",
        iConsulta > 0 && iInventario > iConsulta,
        `consulta=${iConsulta} inventario=${iInventario}`,
      );
      check(
        "eliminar-evento: la cuota destructiva va antes de comparar el nombre",
        iDestructiva > 0 && iNombre > iDestructiva,
        `cuota=${iDestructiva} nombre=${iNombre}`,
      );
    }

    // --- inventario completo: las once que cascadean + las tres de SET NULL + segundo nivel
    {
      const cuerpoInv = entre(api, "async function inventario(", "\n}\n");
      const faltan = ["evento_notas", "evento_wishlist", "evento_reglas_mesas",
                      "operativo_asignacion", "cronograma", "musica", "items_contratados",
                      "documentos", "mesas", "rsvps", "invitaciones"]
        .filter((t) => !cuerpoInv.includes(`cuenta("${t}")`));
      check(
        "eliminar-evento: el inventario cuenta las once tablas que caen por CASCADE",
        faltan.length === 0,
        faltan.join(", "),
      );
    }
  }
}

// ---------------------------------------------------------------- homónimos (8C)
// Medido en producción antes de escribir esto: cuatro eventos «Boda ortega» creados con 24
// segundos de diferencia, con el MISMO cliente, fecha, salón y creador. En la lista se pintan
// idénticos y el único distinto —el que tiene cuenta de portal— es el que hay que conservar.
// La confirmación "escribe el nombre exacto" NO distingue entre ellos: protege del borrado por
// accidente, no del borrado equivocado. Sin discriminante visible, 8C es una ruleta.
{
  const api = leerCodigo("api/eliminar-evento.js");
  const ui = leerCodigo("src/components/admin/eventos/EventoEliminar.jsx");
  const lista = leerCodigo("src/components/admin/eventos/AdminEventos.jsx");

  // El recuento excluye la propia fila (si no, «1 más» sería siempre al menos 1) y se hace
  // sobre el nombre de la FILA leída, no sobre lo que mande el navegador.
  const bloque = entre(api, "const { count: homonimos", "return res.status(200).json({");
  check(
    "eliminar-evento: los homónimos se cuentan por nombre de la fila, excluyéndola",
    /\.eq\("nombre_evento", ev\.nombre_evento\)\s*\.neq\("id", eventoId\)/.test(bloque) &&
      /count: "exact", head: true/.test(bloque),
    bloque.slice(0, 160),
  );
  // El error del recuento corta: un `homonimos` a 0 por fallo de lectura escondería el aviso
  // justo en el caso que lo necesita.
  {
    const iErr = api.indexOf("if (errHom)");
    const iCorte = iErr < 0 ? -1 : api.indexOf("generico(res, 500)", iErr);
    const iResp = api.indexOf("homonimos: homonimos");
    check(
      "eliminar-evento: si el recuento de homónimos falla, no se responde inventario",
      iErr > 0 && iCorte > iErr && iResp > iCorte,
      `errHom=${iErr} corte=${iCorte} respuesta=${iResp}`,
    );
  }

  // El aviso de la UI: se enseña SOLO cuando hay homónimos, y dice cuál es este.
  const aviso = entre(ui, "{inv && homonimos > 0 && (", "{inv && (");
  check(
    "eliminar-evento: con homónimos, la UI dice la hora de alta y si tiene cuenta",
    aviso.includes("fechaLarga(creadoEl)") &&
      /cuenta[\s\S]{0,200}no tiene cuenta de portal/.test(aviso),
    aviso ? "" : "no se encontró el bloque de aviso",
  );
  check(
    "eliminar-evento: la UI no inventa el discriminante — viene del servidor",
    /setHomonimos\(r\.homonimos \|\| 0\);\s*setCreadoEl\(r\.creadoEl \|\| ""\)/.test(ui) &&
      !/evento\.createdAt/.test(ui),
  );

  // La lista: la marca se calcula sobre TODOS los eventos, no sobre los filtrados. Contarlo
  // sobre `lista` haría desaparecer la marca en cuanto un filtro escondiera a la gemela — justo
  // cuando más falta hace.
  const recuento = entre(lista, "const vecesPorNombre =", "const repetido =");
  check(
    "eventos: los nombres repetidos se cuentan sobre todos los eventos, no sobre los filtrados",
    /^const vecesPorNombre = eventos\s*\.reduce\(/.test(recuento.trim()) && !/\blista\b/.test(recuento),
    recuento.slice(0, 120),
  );
  check(
    "eventos: una fila con nombre repetido enseña alta y acceso para poder distinguirla",
    /repetido\(e\) && \([\s\S]{0,400}altaCorta\(e\.createdAt\)[\s\S]{0,200}sin acceso/.test(lista),
  );
}

// ---------------------------------------------------------------- tres estados (8E)
// "Todavía no ha llegado", "de verdad no hay nada" y "la lectura se cayó" se pintaban las tres
// igual, porque el shim devuelve `[]` en las tres. Lo que sigue ata las piezas que impiden que
// vuelvan a fundirse.
{
  const estado = leerCodigo("src/components/ui/Estado.jsx");
  const hook = leerCodigo("src/lib/useCarga.js");

  // EL ORDEN ES LA PROPIEDAD. Quien llama calcula `vacio` desde `datos || []`, así que cuando
  // la lectura falla `vacio` TAMBIÉN es cierto. Si la rama de vacío se mirara antes que la de
  // error, un fallo volvería a presentarse como "no hay nada" — el bug entero, de vuelta.
  {
    const cuerpo = entre(estado, "export function Estado({", "\n}\n");
    const iCarga = cuerpo.indexOf("if (cargando)");
    const iError = cuerpo.indexOf("if (error)");
    const iVacio = cuerpo.indexOf("if (vacio)");
    check(
      "Estado: se mira cargando, luego error, y solo al final vacío",
      iCarga >= 0 && iError > iCarga && iVacio > iError,
      `cargando=${iCarga} error=${iError} vacio=${iVacio}`,
    );
  }
  check(
    "Estado: el fallo dice que NO está vacío y ofrece reintentar",
    /No es que esté vacío/.test(estado) && /onReintentar &&/.test(estado),
  );

  // El efecto tiene que depender de `deps`, no de la función: `cargar` se recrea en cada render,
  // así que depender de ella dispararía una lectura por render — un bucle contra la base.
  {
    const cb = entre(hook, "const fnRef = useRef(cargar);", "useEffect((");
    check(
      "useCarga: la lectura depende de las `deps`, no de la función que se recrea",
      /useCallback\(\(\) => fnRef\.current\(\), deps\)/.test(cb),
      cb.slice(0, 120),
    );
  }
  {
    // Reintentar NO borra lo último bueno: parpadear a esqueleto en cada recarga esconde datos
    // que sí están.
    const rec = entre(hook, "const recargar = useCallback(", "return {");
    check(
      "useCarga: reintentar limpia el error pero no los datos",
      /setError\(null\)/.test(rec) && /setRefresco\(/.test(rec) && !/setDatos\(/.test(rec),
      rec.slice(0, 140),
    );
  }
  check(
    "useCarga: una respuesta vieja no pisa a una nueva",
    /mio !== turno\.current/.test(hook) && /\+\+turno\.current/.test(hook),
  );

  // AdminConfig y MesaReglas: aquí el fallo disfrazado de "aún no hay nada" no es cosmético.
  // Ambos tienen una rama "no existe todavía" que construye un objeto SIN `id`, y guardar desde
  // ahí CREA una fila nueva. Con la lectura floja, un fallo llevaba a esa rama y se acababa con
  // dos filas de configuración (o dos de reglas) para lo que solo admite una.
  for (const [archivo, ent, nombre, guarda] of [
    ["src/components/admin/AdminConfig.jsx", "ConfigSitio", "AdminConfig", "if (!config)"],
    ["src/components/mesas/MesaReglas.jsx", "EventoReglasMesas", "MesaReglas", "if (!reglas)"],
  ]) {
    const src = leerCodigo(archivo);
    const cargarBloque = entre(src, "const cargar = () =>", "useEffect(");
    check(
      `${nombre}: la lectura que decide si crear fila nueva es estricta`,
      /Estricto\(/.test(cargarBloque) &&
        !new RegExp(`${ent}\\.(list|filter)\\(`).test(cargarBloque) &&
        /\.catch\(\(e\) => setErrorCarga\(/.test(cargarBloque),
      cargarBloque ? "" : "no se encontró el bloque `const cargar`",
    );
    // Y el fallo corta ANTES de que se pueda pintar el formulario en blanco.
    const iError = src.indexOf("if (errorCarga)");
    const iGuarda = src.indexOf(guarda);
    check(
      `${nombre}: con la lectura caída no se llega al formulario vacío`,
      iError > 0 && iGuarda > iError,
      `errorCarga=${iError} ${guarda}=${iGuarda}`,
    );
  }

  // Las pantallas que se quedaban en "Cargando…": el apagado del flag tiene que ocurrir también
  // cuando la lectura falla, o no hay forma de salir de ahí.
  {
    const editor = leerCodigo("src/components/mesas/MesaEditor.jsx");
    const cargarEditor = entre(editor, "const cargar = useCallback(", "}, [eventoId]);");
    check(
      "MesaEditor: un fallo también apaga el estado de carga",
      /finally \{\s*setCargando\(false\);/.test(cargarEditor) && /catch \(e\)/.test(cargarEditor),
      cargarEditor ? "" : "no se encontró `const cargar`",
    );
    const meseros = leerCodigo("src/components/meseros/EventoMeseros.jsx");
    const cargarMeseros = entre(meseros, "const cargar = useCallback(", "}, [eventoId]);");
    check(
      "EventoMeseros: un fallo también apaga el estado de carga",
      cortaAntesDe(
        cargarMeseros.replace("return;", "throw;"),
        "catch (e)",
        cargarMeseros.replace("return;", "throw;").indexOf("setMesas(ms)"),
      ) && /setCargando\(false\);\s*(return|throw)/.test(cargarMeseros.replace("return;", "throw;")),
      cargarMeseros ? "" : "no se encontró `const cargar`",
    );
  }
}

// ---------------------------------------------------------------- alta de evento (8A)
// La causa raíz: el formulario validaba `password.length < 6` y el servidor `< 8`, y el
// usuario ni siquiera se comprobaba en el cliente. Una contraseña de 6 pasaba el formulario,
// moría en el servidor con un 400 opaco, y el evento quedaba creado sin credenciales.
// Estos contratos existen para que NO PUEDAN volver a divergir.
{
  const reglas = leerCodigo("api/_lib/reglas-credenciales.js");
  const api = leerCodigo("api/crear-usuario-evento.js");
  const alta = leerCodigo("src/components/admin/eventos/AdminEventos.jsx");
  const ficha = leerCodigo("src/components/admin/eventos/EventoDatos.jsx");

  // Las reglas viven en UN archivo y lo importan los tres. No se comprueba que los números
  // "coincidan" —eso volvería a ser dos copias— sino que no haya una segunda copia.
  check(
    "credenciales: el servidor usa las reglas compartidas",
    /from "\.\/_lib\/reglas-credenciales\.js"/.test(api) && /validarCredenciales\(/.test(api),
  );
  for (const [nombre, s] of [["alta de evento", alta], ["ficha del evento", ficha]]) {
    check(
      `credenciales: ${nombre} usa las MISMAS reglas que el servidor`,
      /reglas-credenciales\.js"/.test(s) && /validarCredenciales\(/.test(s),
    );
    // La regresión literal: una longitud mínima escrita a mano en el cliente.
    check(
      `credenciales: ${nombre} no vuelve a validar por su cuenta`,
      !/password\.length < \d/.test(s) && !/length < 6/.test(s),
    );
  }
  check(
    "credenciales: las reglas no dependen del servidor (el navegador las importa)",
    !/process\.env/.test(reglas) && !/require\(|from "node:/.test(reglas),
  );
  // H4 · EL TERCER VALIDADOR. Con una sola fuente, bajar `PASSWORD_MIN` mueve cliente y servidor
  // a la vez — hasta ahí, correcto por diseño. Pero GoTrue tiene su propia política, es
  // configuración GLOBAL del proyecto (la comparte Vero) y **no se puede leer desde aquí**. Si
  // esta constante bajara por debajo del mínimo de Auth, el formulario aceptaría y el alta
  // moriría en `createUser`: la misma forma del bug original.
  //
  // El número no se puede anclar al valor real, así que se ancla a un SUELO con el motivo
  // escrito: 8 es lo que Supabase recomienda explícitamente y el defecto de GoTrue es 6, así
  // que cualquier proyecto configurado por encima del defecto estará en 8 o más.
  {
    const min = Number((reglas.match(/export const PASSWORD_MIN = (\d+);/) || [])[1]);
    check(
      "credenciales: `PASSWORD_MIN` no baja del suelo de 8 (política de Auth, no legible desde aquí)",
      Number.isFinite(min) && min >= 8,
      `PASSWORD_MIN = ${min}`,
    );
    // RETIRADO EN A-ter: este contrato afirmaba que tres frases estuvieran escritas en el
    // comentario que acompaña al número. No protegía nada —el suelo lo protege el contrato de
    // arriba, que sí mira el valor— y rompía la suite si alguien reescribía la explicación en
    // sinónimos, sin tocar una línea ejecutable. Es decir, fallaba las dos direcciones a la vez:
    // vacuo hacia el bug y ruidoso hacia el refactor.
    //
    // Un contrato sobre prosa no es un contrato. Ver `docs/DECISIONS.md` D-COD-20.
    // Y si Auth rechaza igualmente, el alta lo dice en vez de responder opaco.
    //
    // G2 · REESCRITO EN 9F-2. La versión anterior buscaba tres cadenas
    // —`password_rechazada_por_auth`, el texto del mensaje y `campo: "password"`— sueltas sobre
    // el archivo entero. Las tres seguirían presentes con `const debil = false;` delante: la
    // rama quedaría muerta, el dueño volvería a leer "No se pudo crear el usuario" y el
    // contrato pasaría igual, afirmando en su nombre una propiedad que ya no se cumple. Era un
    // contrato sobre el TEXTO ESCRITO, no sobre el comportamiento.
    //
    // Lo que hay que afirmar es que la rama es ALCANZABLE: que la clasificación se calcula a
    // partir del error real que devolvió Auth, y que es esa clasificación —no otra cosa— la que
    // gobierna el 400 y el motivo auditado.
    {
      const bloque = entre(api, "if (createErr) {", "nuevoId = created.user.id;");
      // El nombre de la señal se DERIVA de la rama que responde 400, no se fija: renombrar
      // `debil` es un refactor y tumbaba este contrato entero (seis fallos de golpe).
      const señal = (/else\s+if\s*\((\w+)\)\s*\{\s*\n?\s*res\.status\(400\)/.exec(bloque) || [])[1];
      const def = señal ? entre(bloque, `const ${señal} =`, ";") : "";
      const rama = señal ? entre(bloque, `} else if (${señal}) {`, "} else {") : "";
      const fallos = [];
      if (!señal) fallos.push("ninguna rama `else if (…)` responde 400: la clasificación no gobierna nada");
      // 1) El material de la decisión sale del error real, no de una constante ni del cuerpo
      //    de la petición.
      if (!/const msg = createErr\.message \|\| "";/.test(bloque)) fallos.push("`msg` no sale de `createErr.message`");
      if (señal && !/\bmsg\b|\bcreateErr\b/.test(def)) fallos.push(`\`${señal}\` no se calcula desde el error: «${def.trim()}»`);
      // 2) Es `debil` quien gobierna el 400, y el 400 dice qué campo y por qué.
      if (señal && !rama) fallos.push(`no hay una rama gobernada por \`${señal}\``);
      if (señal && !/res\.status\(400\)/.test(rama)) fallos.push(`la rama de \`${señal}\` no responde 400`);
      if (!/campo: "password"/.test(rama)) fallos.push("el 400 no señala el campo `password`");
      if (!/La política de contraseñas del proyecto rechazó/.test(rama)) fallos.push("el 400 no explica la causa");
      // 3) Y el rastro auditado sale de la misma decisión: si se separaran, la auditoría diría
      //    una cosa y la pantalla otra.
      if (señal && !new RegExp(`${señal}\\s*\\?\\s*"password_rechazada_por_auth"`).test(bloque)) fallos.push(`el motivo auditado no lo gobierna \`${señal}\``);
      check(
        "credenciales: la rama del rechazo de Auth es ALCANZABLE y gobierna el 400 (no solo está escrita)",
        fallos.length === 0,
        fallos.join(" · "),
      );
    }
    // G4 · Y LA CAUSA NO SE AFIRMA DESDE UNA PALABRA SUELTA.
    //
    // `/password|weak|pwned|leaked|caracteres/i` clasificaba como "tu contraseña es débil"
    // cualquier error de Auth que mencionara "password" por el motivo que fuera. El dueño se
    // iba a probar contraseñas más largas mientras la causa real seguía intacta — el mismo
    // error que este bloque persigue, afirmarle algo sin haberlo comprobado.
    //
    // La propiedad no es "qué frases hay" (eso cambiará cuando cambie GoTrue), sino que la
    // clasificación NO cuelgue de una palabra suelta: código de error, o frases completas.
    {
      const bloque = entre(api, "if (createErr) {", "nuevoId = created.user.id;");
      // La lista se localiza POR ESTRUCTURA, no por su nombre: se lee de la propia definición
      // de `debil` sobre qué se hace el `.some(` y se recorta ese array. Fijar el nombre a mano
      // hacía fallar el contrato por un simple renombrado —una mutación inocua que la primera
      // versión de este contrato no superó—, y un contrato que castiga cambios inocuos acaba
      // borrado por ruidoso.
      //
      // Se aplica a LAS DOS clasificaciones del bloque, no solo a la de la contraseña: en 0.b se
      // encontró que `duplicado` seguía adivinando desde una subcadena justo encima de lo que
      // G4 había arreglado. Una regla que solo cubre el caso que la motivó vuelve a fallar en el
      // de al lado.
      // Los nombres NO se fijan: se DERIVAN de la cadena `if (X) … else if (Y) …` que decide la
      // respuesta. Renombrar `debil` a `esDebil` es un refactor, y tumbaba dos contratos.
      const señales = [...new Set([
        (/if\s*\((\w+)\)\s*\{\s*\n?\s*res\.status\(409\)/.exec(bloque) || [])[1],
        (/else\s+if\s*\((\w+)\)\s*\{\s*\n?\s*res\.status\(400\)/.exec(bloque) || [])[1],
      ].filter(Boolean))];
      const sueltos = [];
      let conCodigo = 0;
      for (const señal of señales) {
        const def = entre(bloque, `const ${señal} =`, ";");
        const nombreLista = (def.match(/(\w+)\.some\(/) || [])[1];
        const lista = nombreLista ? entre(bloque, `const ${nombreLista} = [`, "];") : "";
        const fuente = `${lista}\n${def}`;
        // Literales de regex **y** de comparación por cadena. La versión anterior solo auditaba
        // regex, así que `msg.toLowerCase().includes("password")` volvía a colar exactamente la
        // palabra suelta que la regla prohíbe, por la puerta de al lado.
        const literales = [
          ...[...fuente.matchAll(/\/((?:[^/\\\n]|\\.)+)\/[a-z]*/g)].map((m) => m[1]),
          ...[...fuente.matchAll(/\.(?:includes|startsWith|endsWith|indexOf|search|match)\(\s*["'`]([^"'`]+)["'`]/g)].map((m) => m[1]),
        ];
        // Que CONSULTE el código, no cómo lo compare: `codigo === "x"`, un `includes` sobre una
        // lista o un `Set` son la misma propiedad. Exigir la forma es el defecto de N1 otra vez
        // —lo cazó una mutación inocua con `["email_exists", …].includes(codigo)`—.
        if (/\bcodigo\b/.test(def)) conCodigo++;
        sueltos.push(...literales.filter((r) => !/\s|\.\*/.test(r)).map((r) => `${señal}: «${r}»`));
      }
      if (señales.length !== 2) sueltos.push(`no se identificaron las dos clasificaciones del if/else (encontradas: ${señales.join(", ") || "ninguna"})`);
      check(
        "credenciales: los errores de Auth se clasifican por código o por frase, nunca por una palabra suelta",
        conCodigo === señales.length && señales.length === 2 && sueltos.length === 0,
        sueltos.length
          ? `patrones que casan por una palabra suelta: ${sueltos.join(", ")}`
          : `solo ${conCodigo}/${señales.length || 2} clasificaciones miran el código de error`,
      );
      // Al estrechar la clasificación, más fallos caen en el "no se pudo" opaco. El código de
      // Auth tiene que quedar auditado SIEMPRE o la causa se pierde del todo.
      check(
        "credenciales: el código de error de Auth queda auditado clasifique o no",
        /const codigo = String\(createErr\.code \|\| ""\);/.test(bloque) &&
          /codigo: codigo \|\| "\(sin código\)"/.test(entre(bloque, "await auditar(", "});")),
      );
    }
    check(
      "credenciales: el rechazo de Auth no se responde como «no se pudo» (texto)",
      /password_rechazada_por_auth/.test(api) &&
        /La política de contraseñas del proyecto rechazó/.test(api) &&
        /campo: "password"/.test(api),
    );
  }

  check(
    "credenciales: el 400 dice QUÉ campo falló",
    /status\(400\)\.json\(\{ error: v\.mensaje, campo: v\.campo \}\)/.test(api),
  );

  // El id del evento se fija UNA vez al abrir el formulario. Si vuelve a generarse dentro
  // del shim en cada clic, el reintento crea otro evento y la clave de idempotencia
  // `${eventoId}:${usuario}` nunca coincide — que es como salieron cuatro "Boda ortega".
  {
    const abrir = entre(alta, "const abrirCrear = ", "const crear = async");
    check(
      "alta: el id del evento se fija al ABRIR el formulario, no en cada clic",
      /setEventoId\(nuevoId\(\)\)/.test(abrir),
      abrir ? "" : "no se encontró abrirCrear",
    );
    const crear = entre(alta, "const crear = async", "if (abierto)");
    check(
      "alta: ese id es el que se escribe",
      /Evento\.create\(\{\s*id: eventoId/.test(crear),
      crear ? "" : "no se encontró crear()",
    );
    // Se afirma sobre el TRY, no sobre `crear()` entero: desde 9A el `catch` hace la misma
    // relectura para detectar el reintento sobre un evento que ya existía, así que buscarla en
    // toda la función dejaba pasar el borrado de la del camino feliz. Contrato vacuo, encontrado
    // mutando — no leyendo.
    const tryAlta = entre(crear, "let evento;", "} catch (e) {");
    check(
      "alta: se confirma releyendo antes de dar el alta por buena",
      /Evento\.filterEstricto\(\{ id: eventoId \}\)/.test(tryAlta) && /!guardado \|\| !guardado\.usuario/.test(tryAlta),
      tryAlta ? "" : "no se encontró el try de crear()",
    );
    // Si el evento quedó a medias, el formulario se CIERRA: dejarlo abierto con un aviso
    // pequeño es lo que invitaba a pulsar "Crear evento" otra vez.
    const iEvento = crear.indexOf("if (evento)");
    check(
      "alta: si el evento quedó a medias, el formulario se cierra",
      iEvento >= 0 && /if \(evento\) \{[\s\S]{0,200}setCreando\(false\)/.test(crear),
      iEvento < 0 ? "no se distingue el evento a medias" : "el formulario sigue abierto",
    );
  }
  check(
    "alta: la lista marca los eventos sin credenciales",
    /!e\.usuario &&[\s\S]{0,300}Sin credenciales/.test(alta),
  );

  // 9A · el falso negativo que quedaba DESPUÉS de 8A. Con el id fijo, si el primer INSERT
  // cuaja y se pierde la respuesta, el reintento choca con la clave primaria y `evento` sigue
  // sin asignarse: el mensaje decía "No se pudo crear el evento" cuando sí se había creado.
  // Se decide RELEYENDO la fila, nunca por el texto del error.
  {
    const cuerpo = entre(alta, "} catch (e) {", "} finally {");
    const iRelee = cuerpo.indexOf("Evento.filterEstricto({ id: eventoId })");
    const iRama = cuerpo.indexOf("if (yaExistia)");
    const iNoSePudo = cuerpo.indexOf("No se pudo crear el evento");
    check(
      "alta: un reintento sobre un evento que YA existe no se anuncia como fallo",
      iRelee > 0 && iRama > iRelee && iNoSePudo > iRama &&
        /YA ESTABA CREADO/.test(cuerpo) && !/duplicate key|23505/.test(cuerpo),
      `relee=${iRelee} rama=${iRama} noSePudo=${iNoSePudo}`,
    );
  }
}

// ---------------------------------------------------------------- sec_25 (9B)
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

// ---------------------------------------------------------------- solicitud -> evento (9C)
// ¿DE QUIÉN ES ESTE DATO Y QUIÉN ME LO DIO? Lo escribió un desconocido en el formulario
// público. Que esté en la base solo dice que pasó por `solicitud_crear`, no que sea bueno.
// Estos contratos atan lo que NO puede copiarse tal cual.
{
  const mapeo = leerCodigo("src/lib/solicitudAEvento.js");
  const alta = leerCodigo("src/components/admin/eventos/AdminEventos.jsx");
  const sol = leerCodigo("src/components/admin/AdminSolicitudes.jsx");
  const ficha = leerCodigo("src/components/admin/eventos/EventoDatos.jsx");

  // 1) EL SALÓN. Es texto libre en la solicitud y un uuid en el evento. Solo casa exacto: un
  // salón mal asignado es peor que uno sin asignar, y nadie lo notaría hasta el día del evento.
  {
    const cuerpo = entre(mapeo, "export function resolverSalon(", "\n}\n");
    check(
      "9C: el salón se resuelve por nombre exacto contra los salones reales, o se deja vacío",
      /clave\(s\.nombre\) === t/.test(cuerpo) &&
        /salonId: ""/.test(cuerpo) && /motivo: "no_casa"/.test(cuerpo) &&
        !/includes\(t\)|startsWith|indexOf\(t\)/.test(cuerpo.replace("SALON_SIN_DEFINIR.includes(t)", "")),
      cuerpo ? "" : "no se encontró resolverSalon",
    );
    // El id del salón NUNCA sale de la solicitud: solo de la lista de salones.
    check(
      "9C: el salonId sale de `salones`, nunca de la solicitud",
      !/salonId: s\.|salonId: solicitud\.|salonId: .*salonSeleccionado/.test(mapeo),
    );
  }

  // 2) LAS CREDENCIALES. No se derivan del correo ni del nombre: son credenciales, y
  // derivarlas de datos públicos las haría adivinables desde fuera.
  {
    const cuerpo = entre(mapeo, "export function solicitudAEvento(", "\n}\n");
    check(
      "9C: usuario y contraseña salen VACÍOS del prellenado",
      /usuario: "",\s*\n\s*password: "",/.test(cuerpo) &&
        !/usuario: .*email|usuario: .*nombre|password: /.test(cuerpo.replace('password: "",', "")),
      cuerpo ? "" : "no se encontró solicitudAEvento",
    );
  }

  // 3) FECHA Y CORREO. Solo se proponen si son lo que dicen ser; si no, campo vacío y aviso.
  check(
    "9C: la fecha solo se copia si es una fecha de verdad",
    /export function fechaValida/.test(mapeo) &&
      /d\.toISOString\(\)\.slice\(0, 10\) !== s/.test(mapeo) &&
      /fechaEvento: fecha/.test(mapeo),
  );
  check(
    "9C: el correo solo se copia si tiene forma de correo",
    /export function correoValido/.test(mapeo) && /clienteEmail: correo/.test(mapeo),
  );

  // 4) LOS TEXTOS LARGOS se recortan antes de escribirse. `comentarios` admite 2000 en la
  // solicitud y `eventos.notas` no tiene tope: sin recortar, la nota interna se vuelve ilegible.
  check(
    "9C: todo lo que se copia pasa por `recorta`",
    /const recorta = \(v, max\)/.test(mapeo) &&
      /clienteNombre: recorta\(/.test(mapeo) && /tipoEvento: recorta\(/.test(mapeo) &&
      /clienteTelefono: recorta\(/.test(mapeo),
  );

  // 5) EL NOMBRE DEL EVENTO nunca puede quedar vacío: con "" la confirmación del borrado se
  // cumple sola (8F-2), así que un prellenado vacío reabriría ese agujero por la puerta de atrás.
  {
    const cuerpo = entre(mapeo, "export function nombrePropuesto(", "\n}\n");
    check(
      "9C: el nombre propuesto nunca es cadena vacía",
      /return tipo \|\| cliente \|\| `Solicitud/.test(cuerpo),
      cuerpo ? "" : "no se encontró nombrePropuesto",
    );
  }

  // 6) EL ESTATUS de la solicitud sale del catálogo, nunca de una lista nueva: esa divergencia
  // es la que rompió el guardado del estatus en el bloque 7.
  check(
    "9C: el estatus propuesto sale de SOLICITUD_ESTATUS",
    /from "@\/lib\/catalogos"/.test(mapeo) &&
      /SOLICITUD_ESTATUS\.filter\(/.test(mapeo) &&
      !/\["Cotizada", ?"Cerrada"\]/.test(mapeo),
  );
  // Y se PROPONE: si el admin no elige, la solicitud se queda como estaba.
  {
    const crear = entre(alta, "const crear = async", "if (abierto)");
    check(
      "9C: el estatus de la solicitud solo cambia si el admin lo eligió",
      /if \(origen\?\.id && cerrarSolicitud\)/.test(crear),
      crear ? "" : "no se encontró crear()",
    );
    // Y si ese cambio falla, el evento NO se revierte: ya está bien creado.
    check(
      "9C: si el cambio de estatus falla, el evento no se deshace",
      /catch \(e2\)[\s\S]{0,400}Cámbialo a mano desde Solicitudes/.test(crear),
    );
  }

  // 7) LA TRAZABILIDAD. Sin `solicitud_id` escrito, la conversión queda huérfana y la misma
  // solicitud se puede convertir tres veces sin que nada lo note.
  {
    const crear = entre(alta, "const crear = async", "if (abierto)");
    check(
      "9C: el alta escribe de qué solicitud salió",
      /solicitudId: origen\?\.id \|\| null/.test(crear),
      crear ? "" : "no se encontró crear()",
    );
    check(
      "9C: la solicitud ya convertida no ofrece convertirse otra vez",
      /eventosPorSolicitud\[selected\.id\] \?/.test(sol) &&
        /ya se convirtió en evento/.test(sol),
    );
    // 9E-2 · EL GUARDARRAÍL DONDE SE ESCRIBE. El distintivo de arriba es informativo y
    // desaparece justo cuando su lectura se cae — que es cuando vuelve a salir el botón. Lo que
    // impide de verdad el segundo evento es esta comprobación, ANTES de crear la fila, y
    // `eventos_solicitud_id_idx` no es único, así que la base tampoco lo impide.
    {
      const iGuarda = crear.indexOf("if (origen?.id) {");
      const iLee = crear.indexOf("Evento.filterEstricto({ solicitudId: origen.id })");
      const iCrea = crear.indexOf("Evento.create({");
      check(
        "9C: antes de crear se comprueba que esa solicitud no generó ya otro evento",
        iGuarda >= 0 && iLee > iGuarda && iCrea > iLee &&
          /ya generó el evento/.test(crear) && /ev\.id !== eventoId/.test(crear),
        `guarda=${iGuarda} lee=${iLee} crea=${iCrea}`,
      );
      // Y esa lectura decide si se duplica un dato: no puede ser floja.
      check(
        "9C: esa comprobación usa `filterEstricto`, no `filter`",
        !/Evento\.filter\(\{ solicitudId/.test(crear),
      );
    }
    // El comentario de la otra pantalla NO puede volver a afirmar una garantía que no existe.
    check(
      "9C: no se afirma que la conversión sea idempotente por `solicitud_id`",
      !/idempotente por `solicitud_id`/.test(leer("src/components/admin/AdminSolicitudes.jsx")),
    );
    // Esa lectura decide si se ofrece un botón destructivo de duplicar: no puede ser floja.
    check(
      "9C: lo ya convertido se lee con `filterEstricto`, no con `filter`",
      /Evento\.filterEstricto\(null, "-created_date"\)/.test(sol) &&
        !/Evento\.filter\(null/.test(sol),
    );
    // Del barrido de 9E: la wishlist y las notas del cliente también decidían con `filter`, y
    // su sección solo se pinta si hay algo — así que un fallo la hacía desaparecer entera y el
    // dueño concluía que el cliente no había pedido nada.
    check(
      "9C: lo que el cliente pidió en su portal se lee estricto y el fallo se dice",
      /EventoWishlist\.filterEstricto/.test(ficha) && /EventoNota\.filterEstricto/.test(ficha) &&
        /setFalloDeseos\(true\)/.test(ficha) && /No es\s*\n?\s*que no haya pedido nada/.test(ficha),
    );
    check(
      "9C: la ficha del evento dice de qué solicitud salió",
      /evento\.solicitudId &&/.test(ficha) && /salió de una solicitud/.test(ficha) &&
        // Y con tres estados: "buscando", "esta es", y "no se pudo leer" — nunca el mismo
        // valor para "todavía no ha llegado" y para "la lectura se cayó" (H3).
        /origenEstado === "cargando"/.test(ficha) && /origenEstado === "fallo"/.test(ficha) &&
        /SolicitudEvento\.filterEstricto/.test(ficha),
    );
  }

  // 8) EL PRELLENADO ES EDITABLE y se ve que viene de fuera. Es lo que separa una ayuda de un
  // automatismo: el admin tiene que poder corregir lo que escribió un desconocido.
  check(
    "9C: se avisa de que los datos los escribió el cliente y hay que revisarlos",
    /lo escribió él, no tú/.test(alta) && /avisosPrefill\.map/.test(alta),
  );
  // EL PRELLENADO Y LA LISTA DE SALONES — reescrito en 9E-1, corregido en 9F-1 (G1).
  //
  // El contrato original afirmaba `if (!prefill || cargando) return;`. No era vacuo —mutarlo
  // fallaba— pero certificaba **el guardarraíl equivocado**, que es peor: daba luz verde justo
  // a la condición que falla. `cargando` es `false` cuando la lectura se CAE (`useCarga` llena
  // `error` y deja `datos` en null), así que el prellenado pasaba con la lista vacía y la
  // pantalla afirmaba que el salón del cliente "no coincide con ninguno de los registrados"
  // sin haber mirado ninguno.
  //
  // 9E-1 lo ató a `salonesConocidos = errorCarga ? null : (datos ? salones : null)`. Esa señal
  // arreglaba la dirección peligrosa pero afirmaba algo falso en la otra: `useCarga` **conserva
  // `datos` a propósito** cuando una recarga falla, así que "recarga caída + lista buena en
  // memoria" es un estado alcanzable —guardar en la ficha de un evento y que la recarga que
  // dispara `onActualizado` se caiga— y ahí `salonesConocidos` valía `null` mientras el
  // desplegable pintaba los ocho salones. La pantalla decía "aquí no sale ninguno" con ocho
  // delante.
  //
  // 9F-1 las separa en dos preguntas: ¿tengo lista? (`datos`) y ¿está al día? (`errorCarga`).
  {
    const efecto = entre(alta, "useEffect(() => {\n    if (!prefill) return;", "}, [prefill, salonesDisponibles]);");
    check(
      "9C: el prellenado no ocurre sin ninguna lista de salones con la que decidir",
      /if \(salonesDisponibles === null\) return;/.test(efecto) &&
        !/cargando\) return;/.test(efecto),
      efecto ? "" : "no se encontró el efecto del prellenado",
    );
    // La señal tiene que ser de TRES estados: `null` cuando no hay ninguna lista, la lista
    // cuando sí. Si volviera a ser `datos?.sals || []`, el contrato de arriba pasaría sin que la
    // propiedad se cumpliera.
    //
    // Y **no puede depender de `errorCarga`**: eso es lo que reintroduciría G1 — negarle al
    // dueño una conversión que sí podía terminar, y llamar "no legible" a una lista que tiene
    // delante. Las dos mitades se afirman por separado.
    check(
      "9C: `salonesDisponibles` distingue «no tengo ninguna» de «miré y no hay ninguno»",
      /const salonesDisponibles = datos \? salones : null;/.test(alta),
    );
    {
      const def = entre(alta, "const salonesDisponibles =", "\n");
      check(
        "9F-1: tener lista y tenerla al día son señales distintas",
        !/errorCarga/.test(def) &&
          /const salonesDesactualizados = Boolean\(errorCarga && datos\);/.test(alta),
        def ? `definición: ${def.trim()}` : "no se encontró la definición",
      );
    }
    // Y el módulo puro tiene que tener ese tercer resultado, o la señal no serviría de nada.
    check(
      "9C: `resolverSalon` no afirma nada si no recibe la lista",
      /if \(!Array\.isArray\(salones\)\) return \{ salonId: "", motivo: "lista_no_disponible" \};/.test(mapeo) &&
        /puedeDecidirSalon: salon\.motivo !== "lista_no_disponible"/.test(mapeo),
    );
    // El aviso, con la lista caída, NO puede decir que no coincide.
    {
      const rama = entre(mapeo, 'if (salon.motivo === "lista_no_disponible")', 'else if (salon.motivo === "no_casa")');
      check(
        "9C: con la lista caída no se afirma que el salón no coincide",
        /NO se ha comprobado/.test(rama) && !/no coincide con ninguno/.test(rama),
        rama ? "" : "no se encontró la rama de lista no disponible",
      );
    }
    // El traspaso NO se consume hasta que se aplica: si se perdiera, el dueño tendría que
    // volver a Solicitudes sin saber que hace falta.
    //
    // CORREGIDO EN 9F-3, y es un caso de manual. La versión de 9E afirmaba
    // `/abrirCrear\(…\);\s*\n\s*onPrefillConsumido\?\.\(\);/` sobre TODO el archivo: comprueba
    // que esas dos líneas están juntas y en ese orden, pero no que no haya OTRA llamada antes.
    // Metiendo `onPrefillConsumido?.();` justo detrás de `if (!prefill) return;` —o sea,
    // consumiendo el traspaso antes del guardarraíl, que es exactamente el bug— el contrato
    // seguía en verde. Comprobado mutando.
    //
    // Se afirma sobre el efecto entero y sobre el orden: **una sola** llamada, y después de
    // aplicar.
    {
      const iAplica = efecto.indexOf("abrirCrear(prefill");
      const consumos = [...efecto.matchAll(/onPrefillConsumido\?\.\(\)/g)].map((m) => m.index);
      check(
        "9C: el prellenado no se da por consumido si no se llegó a aplicar",
        consumos.length === 1 && iAplica >= 0 && consumos[0] > iAplica,
        `aplica en ${iAplica}, se consume en [${consumos.join(", ")}]`,
      );
    }
    // Y el dueño tiene salida: se le dice qué pasa y puede reintentar.
    check(
      "9C: sin ninguna lista y con una conversión esperando, se explica y se ofrece reintentar",
      /prefill && salonesDisponibles === null &&/.test(alta) &&
        /No se puede convertir ahora mismo/.test(alta) && /onClick=\{recargar\}/.test(alta),
    );
    // La ficha del evento tiene el mismo desplegable y el mismo riesgo, y recibe LAS DOS
    // señales: sin lista el control está muerto y hay que decirlo; con lista vieja se puede
    // trabajar avisando.
    check(
      "9C: la ficha recibe por separado «no hay lista» y «la lista puede estar vieja»",
      /salonesIlegibles=\{salonesDisponibles === null && !cargando\}/.test(alta) &&
        /salonesDesactualizados=\{salonesDesactualizados\}/.test(alta),
    );
  }

  // ── G3 · EL AVISO DE «NO SE PUDO COMPROBAR SI YA SE CONVIRTIÓ» ───────────────
  //
  // 9E-4 añadió `falloConvertidas` y **no lo contrató**: es lo único de aquel barrido que
  // quedó sin red. La señal existe porque, si la lectura del mapa de convertidas se cae, el
  // panel enseña "Crear evento con estos datos" para una solicitud que YA es un evento — que
  // es exactamente cómo nacieron los tres duplicados de «Boda ortega».
  //
  // Se afirman las tres cosas que la hacen valer algo, no que la frase esté escrita:
  {
    const cuerpo = entre(sol, "const cargarConvertidas = useCallback(", "useEffect(() => { cargarConvertidas");
    const fallos = [];
    // 1) ALCANZABILIDAD. Con `filter` en vez de `filterEstricto`, una lectura caída resuelve
    //    `[]` y el `.catch` es código muerto: la señal no se levanta nunca y el aviso, escrito
    //    y todo, no se pinta jamás. Es la misma forma que G2 un piso más arriba.
    if (!/base44\.entities\.Evento\.filterEstricto\(/.test(cuerpo)) fallos.push("el mapa no se lee con `filterEstricto`: el `.catch` sería código muerto");
    // 2) El fallo levanta la señal Y vacía el mapa en el mismo sitio: media verdad sería peor
    //    que ninguna (mapa viejo + "no se pudo comprobar").
    if (!/\.catch\(\(\) => \{\s*setEventosPorSolicitud\(\{\}\);\s*setFalloConvertidas\(true\);\s*\}\)/.test(cuerpo)) fallos.push("el `.catch` no vacía el mapa y levanta la señal a la vez");
    // 3) Y BAJA al recuperarse. Una señal que solo sube deja un aviso eterno que el dueño
    //    aprende a ignorar — el mismo defecto que H3.
    if (!/setFalloConvertidas\(false\);/.test(cuerpo)) fallos.push("la señal no vuelve a bajar cuando la lectura funciona");
    check("9F-3: el fallo del mapa de convertidas se levanta, se baja y es alcanzable", fallos.length === 0, fallos.join(" · "));

    // 4) Y no puede contradecir a lo que está pintado al lado: si de esta solicitud SÍ se sabe
    //    que ya hay evento, decir "no se pudo comprobar" junto al recuadro verde es falso.
    check(
      "9F-3: «no se pudo comprobar» no se pinta junto al «ya se convirtió»",
      /\{falloConvertidas && !eventosPorSolicitud\[selected\.id\] && \(/.test(sol),
    );
  }

  // ── G1 · EL AVISO NO PUEDE CONTRADECIR AL DESPLEGABLE ────────────────────────
  //
  // Esto NO se contrata sobre el texto. Que la frase "aquí no sale ninguno" esté escrita en el
  // archivo no dice nada sobre cuándo se pinta: escrita estaba también cuando se pintaba con
  // ocho salones a la vista. La propiedad es **cuál es su condición**, y tiene que ser la misma
  // magnitud que llena el desplegable.
  //
  // Se deriva del propio render en vez de fijarla a mano: se lee de qué array salen los
  // `<option>` y se exige que el aviso esté gobernado por la LONGITUD DE ESE MISMO array. Si
  // alguien cambia el desplegable a otra fuente, el contrato lo sigue; si vuelve a colgar el
  // aviso de un flag de error, falla.
  {
    /**
     * @param {string} archivo  componente con el desplegable de salón
     * @param {string} aviso    trozo del texto del aviso cuya condición se examina
     * @param {"vacio"|"lleno"} exige  qué tiene que estar pasando para que se pueda pintar
     */
    const avisoAtadoAlDesplegable = (archivo, aviso, exige = "vacio") => {
      // `leerCodigo`: los comentarios de estos dos archivos explican justamente la regresión y
      // citan `salones.length`, así que con comentarios el contrato se aprobaría a sí mismo.
      const bloque = entre(leerCodigo(archivo), ">Salón</label>", "</select>");
      if (!bloque) return { ok: false, detalle: `${archivo}: no se encontró el bloque del salón` };

      // 1) ¿De qué array salen las opciones?
      const fuente = bloque.match(/\{\s*(\w+)\.map\(/);
      if (!fuente) return { ok: false, detalle: `${archivo}: el desplegable no mapea ningún array` };
      const arr = fuente[1];

      // 2) La condición que gobierna el aviso: el `&& (` que lo abre, hacia atrás desde el texto.
      //
      //    TODAS las apariciones, no `indexOf`. Con la primera bastaba para que una **segunda**
      //    copia del aviso, mal guardada y colocada DETRÁS de la buena, pasara en verde: el
      //    contrato certificaba la copia correcta y no miraba la otra. Es la misma puerta que
      //    "recorta el primer `update`" en `sec_26`, y por ella entraban cinco de los quince.
      const apariciones = [...bloque.matchAll(new RegExp(aviso.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"))].map((m) => m.index);
      if (!apariciones.length) return { ok: false, detalle: `${archivo}: no se encontró el aviso «${aviso}»` };
      const condiciones = apariciones.map((i) => {
        const antes = bloque.slice(0, i);
        const j = antes.lastIndexOf("&& (");
        return j < 0 ? "" : antes.slice(antes.lastIndexOf("{", j), j);
      });

      // 3) Tiene que exigir que ese array esté VACÍO, y no poder ser cierta por otra vía.
      //
      //    CORREGIDO EN N1 (fase 0.a). La primera versión exigía el literal
      //    `salones\.length\s*===\s*0`, así que `(salones || []).length === 0` —mismo
      //    comportamiento y estrictamente más seguro— hacía FALLAR el contrato. Y no era
      //    hipotético: en `EventoDatos` los otros dos props tienen valor por defecto y `salones`
      //    no, así que la edición defensiva natural sobre ese archivo era justo la prohibida.
      //    Un contrato que castiga un cambio inocuo acaba borrado por ruidoso, y con él se va
      //    la propiedad.
      //
      //    Lo que importa no es cómo esté escrito, sino que (i) la condición dependa de la
      //    LONGITUD del array del desplegable y (ii) no haya una disyunción que la haga cierta
      //    con opciones delante. El `|| []` defensivo no es una disyunción de la guarda: es un
      //    valor por defecto del propio array, así que se normaliza antes de mirar los `||`.
      const malas = condiciones.filter((cond) => {
        const limpio = cond.replace(new RegExp(`\\(\\s*${arr}\\s*\\|\\|\\s*\\[\\s*\\]\\s*\\)`, "g"), arr);
        const dependeDeLaLongitud = exige === "vacio"
          ? new RegExp(`(!\\s*${arr}\\??\\.length\\b)|(${arr}\\??\\.length\\s*(===?\\s*0|<\\s*1))`).test(limpio)
          : new RegExp(`(${arr}\\??\\.length\\s*(>\\s*0|>=\\s*1|!==?\\s*0))|([^!\\w]${arr}\\??\\.length\\b\\s*&&)`).test(limpio);
        return !(dependeDeLaLongitud && !limpio.includes("||"));
      });
      return {
        ok: malas.length === 0,
        detalle: malas.length === 0 ? ""
          : `${archivo}: ${malas.length} de ${condiciones.length} apariciones del aviso no exigen que `
            + `${arr} esté ${exige}, o tienen una disyunción: ${malas.map((c) => `«${c.trim()}»`).join(" / ")}`,
      };
    };

    // El aviso de "no sale ninguno" y el de "puede estar desactualizada" son la misma propiedad
    // en las dos direcciones: cada uno habla de un estado del desplegable y no puede pintarse en
    // el otro. El segundo NO es simetría gratuita — "esta lista puede estar desactualizada" con
    // el desplegable vacío son dos avisos que se contradicen en el mismo hueco.
    for (const [archivo, aviso, exige, etiqueta] of [
      ["src/components/admin/eventos/AdminEventos.jsx", "aquí no sale ninguno", "vacio", "«no sale ninguno» no se pinta con el desplegable lleno"],
      ["src/components/admin/eventos/EventoDatos.jsx", "aquí no sale ninguno", "vacio", "«no sale ninguno» no se pinta con el desplegable lleno"],
      ["src/components/admin/eventos/AdminEventos.jsx", "puede estar desactualizada", "lleno", "«puede estar desactualizada» solo con opciones delante"],
      ["src/components/admin/eventos/EventoDatos.jsx", "puede estar desactualizada", "lleno", "«puede estar desactualizada» solo con opciones delante"],
    ]) {
      const r = avisoAtadoAlDesplegable(archivo, aviso, exige);
      check(`9F-1: ${etiqueta} (${archivo.split("/").pop()})`, r.ok, r.detalle);
    }

    // Y el motivo sigue siendo distinto según el estado: "no se pudo leer" y "no hay ninguno"
    // son afirmaciones diferentes sobre el mundo y no se pueden fundir en una.
    check(
      "9F-1: con el desplegable vacío se distingue «no se pudo leer» de «no hay ninguno»",
      /salonesDisponibles === null\s*\n?\s*\? "No se pudo leer la lista de salones/.test(alta) &&
        /: "No hay salones registrados todavía/.test(alta),
    );
  }
}

// ---------------------------------------------------------------- CSP e imágenes (9D)
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

// ------------------------------------------- FASE A · la escritura que fabricaba el éxito
//
// EL HECHO, comprobado EJECUTANDO contra la base (en un bloque revertido):
//
//     UPDATE denegado por RLS  ->  sin error, 0 filas   (silencioso)
//     DELETE denegado por RLS  ->  sin error, 0 filas   (silencioso)
//     INSERT denegado por RLS  ->  ERROR 42501          (ruidoso)
//
// De esa asimetría sale todo: `create` no necesita variante estricta y `update`/`delete` sí.
// El shim devolvía el propio `patch` cuando el UPDATE tocaba cero filas, así que el llamador
// leía la fila "guardada" que él mismo había escrito. Es el gemelo de J-02 del lado de la
// escritura, y de ahí salió el P0 del portal.
{
  const shim = leerCodigo("src/api/base44Client.js");

  // 1) Las variantes estrictas existen y **lanzan** cuando no se tocó ninguna fila. No basta
  //    con que estén escritas: sin el `if (!data) throw` son un alias de `update`.
  {
    const upd = entre(shim, "async updateEstricto(", "\n    },");
    const del = entre(shim, "async deleteEstricto(", "\n    },");
    // NADA DE FORMAS. Ni el nombre del ayudante que construye el error —renombrar una función
    // interna es un refactor—, ni la forma exacta de la guarda: `if (!data)`, `if (data === null)`
    // y `if ((data || []).length === 0)` son la misma propiedad, y las tres reescrituras rompían
    // la versión anterior. Se DERIVA el nombre de la variable del propio destructuring y se
    // afirma que hay un `throw` que depende de ella.
    const fallos = [];
    const lanzaSiVacio = (cuerpo, quien) => {
      const nombre = (/const \{\s*data(?::\s*(\w+))?\s*,/.exec(cuerpo) || [])[1] || "data";
      if (!new RegExp(`\\b${nombre}\\b`).test(cuerpo)) return `\`${quien}\` no usa el resultado de la escritura`;
      // Cualquier condición que mencione esa variable y corte con un `throw`. Se recorre cada
      // `throw` hacia atrás en vez de casar un `if (...)` con un regex: `[^)]*` no atraviesa
      // paréntesis anidados, así que `if ((data || []).length === 0) throw` —una reescritura
      // equivalente y más defensiva— lo hacía fallar. Lo cazó la mutación inocua.
      const guarda = [...cuerpo.matchAll(/\bthrow\b/g)].some((t) => {
        const atras = cuerpo.slice(Math.max(0, t.index - 200), t.index);
        const iIf = atras.lastIndexOf("if");
        return iIf >= 0 && new RegExp(`\\b${nombre}\\b`).test(atras.slice(iIf));
      });
      if (!guarda) return `\`${quien}\` no lanza cuando la escritura no tocó nada`;
      return "";
    };
    for (const [cuerpo, quien] of [[upd, "updateEstricto"], [del, "deleteEstricto"]]) {
      const f = lanzaSiVacio(cuerpo, quien);
      if (f) fallos.push(f);
    }
    // Y `updateEstricto` devuelve lo que dijo la BASE, no el parche que le pasaron: si volviera a
    // `{ id, ...patch }` lanzaría igual y seguiría fabricando la fila.
    {
      const param = (/async updateEstricto\(\s*\w+\s*,\s*(\w+)\s*\)/.exec(upd) || [])[1];
      if (param && new RegExp(`\\.\\.\\.\\s*${param}\\b`).test(upd)) fallos.push("`updateEstricto` sigue devolviendo el parche");
    }
    // `deleteEstricto` tiene que PEDIR las filas borradas; sin `.select()` no hay nada que contar.
    if (!/\.select\(\)/.test(del)) fallos.push("`deleteEstricto` no pide las filas borradas, así que no puede contarlas");
    check("A.1: `updateEstricto`/`deleteEstricto` lanzan cuando la escritura no tocó nada", fallos.length === 0, fallos.join(" · "));
  }

  // 2) El error es DISTINGUIBLE de un fallo de red. Sin `code`, una pantalla no puede decir
  //    "no tienes permiso" en vez de "reintenta", y mandar a reintentar algo que nunca va a
  //    funcionar es la forma de mentira que este bloque persigue.
  check(
    "A.1: el fallo de escritura llega con un código propio y un mensaje legible",
    // `shim` está sin comentarios A PROPÓSITO en las dos mitades: con el archivo comentado,
    // mover el mensaje a un comentario dejaba el contrato en verde y al usuario sin texto.
    /code = "escritura_sin_efecto"/.test(shim) && /El cambio no se guardó/.test(shim),
  );

  // 3) `update` y `delete` NO se han vuelto estrictos. Es deliberado y hay que poder verlo: hoy
  //    diez componentes escriben sin un solo `catch`, así que hacerlos lanzar cambiaría el
  //    engaño silencioso por una pantalla muerta, justo antes de la validación del dueño.
  // Antes esto exigía además que el comentario dijera "FABRICA EL ÉXITO". Un contrato sobre
  // prosa no protege nada —la advertencia se puede reescribir en sinónimos sin tocar una línea
  // ejecutable, y entonces rompe la suite sin que nada haya cambiado— así que se queda solo la
  // mitad ejecutable. Ver la decisión sobre contratos-de-comentario en `docs/DECISIONS.md`.
  check(
    "A.1: `update` sigue siendo el no estricto (deliberado: ver D-COD-18)",
    /return rowToObj\(data\) \|\| \{ id, \.\.\.patch \};/.test(shim),
  );

  // 4) EL P0. `PortalInvitacion` es el único escritor de la invitación en todo el repo y solo se
  //    monta para el rol `cliente`, cuyo UPDATE sobre `eventos` no toca ninguna fila. Tiene que
  //    escribir estricto **y** traducir ese caso a algo que no sea "intenta de nuevo".
  {
    const r = confirmacionAtadaALaEscritura(
      leerCodigo("src/components/portal/PortalInvitacion.jsx"),
      "const guardar = async (", "\n  };", /await\s+base44\.rpc\(/,
    );
    check(
      "A.2 (P0): la invitación del cliente no puede volver a decir «Guardado ✓» sin haber guardado",
      r.ok, r.detalle,
    );
  }

  // 5) Y el panel deja de atribuirle al cliente una causa falsa. Esa frase es la que tapó el P0
  //    durante meses: el dueño leía una explicación plausible y no volvía a mirar.
  {
    // NO se contrata la frase. Prohibir un texto no impide reescribir la misma atribución falsa
    // con otras palabras, y exigir otro texto rompe con un sinónimo: las dos direcciones malas
    // a la vez. Lo que se afirma es que el aviso **deriva del hecho comprobable**: hay token o
    // no lo hay. `invitacion_token` solo lo escribe esta función, así que su ausencia es prueba
    // de que nunca cuajó — y su presencia, de que sí, que es lo que impide volver a decir
    // «nunca se guardó» de una invitación que el cliente activó y luego apagó.
    const rsvps = leerCodigo("src/components/admin/eventos/EventoRsvps.jsx");
    const bloque = entre(rsvps, "{!evento.invitacionActiva && (", "\n      )}");
    check(
      "A.2: el aviso de la invitación deriva de si hay token, no de una suposición",
      /evento\.invitacionToken\s*\?/.test(bloque) && bloque.split("invitacionToken").length > 1,
      bloque ? "" : "no se encontró el bloque del aviso",
    );
  }

  // 6) Las dos pantallas del panel que afirmaban «Guardado.» sin mirar. La propiedad es la
  //    misma que en el P0 y se afirma igual: la confirmación va DESPUÉS de la escritura y
  //    DENTRO del `try`. Y el `catch` es obligatorio: estricto sin `catch` es un botón girando.
  for (const [archivo, ancla, fin, escritura] of [
    ["src/components/admin/eventos/EventoDatos.jsx", "const guardar = async () => {", "\n  };", /Evento\.updateEstricto\(/],
    ["src/components/mesas/MesaReglas.jsx", "const guardar = async () => {", "\n  };", /EventoReglasMesas\.updateEstricto\(/],
  ]) {
    const r = confirmacionAtadaALaEscritura(leerCodigo(archivo), ancla, fin, escritura);
    check(`A.3: «Guardado.» solo si la base lo confirmó (${archivo.split("/").pop()})`, r.ok, r.detalle);
  }
}

// ------------------------------------------- sec_26, escrita y NO aplicada
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

// ------------------------------------------- A-bis · UNA PIEZA QUE NADIE INVOCA
//
// El hallazgo que invalidó el resultado de la fase A: `sec_26` estaba bien escrita, bien
// ensayada y **sin un solo llamador**. `grep -rn invitacion_guardar src/ api/` daba 0, y sus
// dos únicas apariciones fuera de la migración eran contratos verdes comprobando los
// `grant`/`revoke` de una función que ningún código invoca.
//
// La consecuencia no era cosmética: el dueño aprueba la migración, se aplica, se prueba el
// portal, sale el MISMO error de permisos, y se concluye que la vía RPC no sirve. La conclusión
// sería falsa y cerraría el camino correcto.
//
// Esta comprobación es genérica a propósito: no mira `invitacion_guardar`, mira **toda** función
// que cualquier migración cree en `jardines` y exige que alguien la llame. Un contrato que solo
// cubriera el caso que lo motivó volvería a fallar en el siguiente.
{
  const migraciones = leerDir("supabase/migrations").filter((f) => f.endsWith(".sql"));
  const sqlTodo = migraciones.map((f) => leer(`supabase/migrations/${f}`)).join("\n");
  const sqlCrudo = sqlTodo;

  /**
   * Rangos `[inicio, fin)` de los bloques `do $tag$ … $tag$`.
   *
   * Son scripts de UNA vez —precondiciones, ensayos, comprobaciones— y no dejan ningún llamador
   * vivo. `usadaEnSql` los contaba como uso, así que un `perform jardines.fn(...)` dentro de un
   * `do` de precondición —el estilo de casa— bastaba para que este contrato no disparase. Si el
   * ensayo de `sec_26` se hubiera quedado en el archivo, la huérfana que lo motivó todo habría
   * pasado desapercibida.
   *
   * Se escanea en vez de usar un `replace` global: los cuerpos de función también se abren con
   * `$$`, así que un `replace` perezoso empareja el `$$` equivocado y se desincroniza. Probado:
   * con `replace` el bloque de `sec_26` no se recortaba y la mutación seguía pasando.
   */
  const rangosDo = (() => {
    // Se salta el cierre de TODA comilla-dólar, sea `do $$`, `as $$` o `format($f$…$f$)`. Ese es
    // el detalle que arruinó las dos versiones anteriores: buscar solo `do $tag$` y avanzar deja
    // el escáner **dentro** del siguiente cuerpo de función, y a partir de ahí todos los rangos
    // salen corridos. Comprobado: el `perform` de prueba en `sec_26` salía como "fuera de
    // do-block" con 19 bloques detectados.
    const rangos = [];
    let i = 0;
    for (;;) {
      const m = /\$\w*\$/.exec(sqlTodo.slice(i));
      if (!m) break;
      const abre = i + m.index;
      const tag = m[0];
      const cierra = sqlTodo.indexOf(tag, abre + tag.length);
      if (cierra < 0) break;
      // ¿La palabra justo antes de la comilla es `do`? Entonces es un script de una vez.
      const antes = sqlTodo.slice(Math.max(0, abre - 40), abre).trimEnd();
      if (/\bdo$/i.test(antes)) rangos.push([antes.lastIndexOf("do") + Math.max(0, abre - 40), cierra + tag.length]);
      i = cierra + tag.length;
    }
    return rangos;
  })();
  const dentroDeDo = (i) => rangosDo.some(([a, b]) => i >= a && i < b);
  // Las funciones que las migraciones definen y **conceden a un rol del navegador**. Una
  // `security definer` sin `grant` a `anon`/`authenticated` es interna (la llaman otras
  // funciones o policies) y no tiene por qué aparecer en `src/`.
  //
  // Hay DOS formas de conceder en este repo, y mirar solo una dejaría fuera justo el ejemplo
  // que motivó todo esto (`registrar_llegada_mesa`, sin llamador desde hace meses):
  //   (1) literal:  grant execute on function jardines.x(...) to authenticated;
  //   (2) en bucle: foreach f in array[...] loop execute format('grant execute … %s to anon…')
  // Para (2) se afirma sobre el ORDEN, no sobre la distancia: para cada bucle que concede a un
  // rol del navegador, se toman los nombres del `array[` inmediatamente anterior.
  //
  // OJO CON EL CORTE: los grants se leen del SQL **crudo** y las llamadas del **sin do-blocks**.
  // No es asimetría gratuita: un `grant` dentro de un `do $$ … $$` —que es como los concede
  // `sec_06`, en bucle sobre un array— sigue siendo un permiso permanente; una llamada dentro de
  // ese mismo `do` es un script de una vez y no deja ningún llamador. Calcular las dos cosas
  // sobre el texto recortado hacía desaparecer la mitad de los grants del proyecto.
  const expuestas = new Set(
    [...sqlCrudo.matchAll(/grant\s+execute\s+on\s+function\s+jardines\.(\w+)\s*\([^)]*\)\s*to\s+[^;]*\b(anon|authenticated)\b/gi)]
      .map((m) => m[1]),
  );
  for (const m of sqlCrudo.matchAll(/execute\s+format\(\s*'grant execute on function %s to ([^']*)'/gi)) {
    if (!/\b(anon|authenticated)\b/.test(m[1])) continue;          // service_role no es el navegador
    const antes = sqlCrudo.slice(0, m.index);
    const iArr = antes.lastIndexOf("array[");
    if (iArr < 0) continue;
    for (const f of antes.slice(iArr).matchAll(/'jardines\.(\w+)\s*\(/g)) expuestas.add(f[1]);
  }
  // `leerCodigo`, NO `leer`: una mención en un comentario no es una llamada. Con el archivo
  // comentado, escribir «su único escritor, `registrar_llegada_mesa`, no tiene llamador» dentro
  // de un comentario hacía que el contrato diera esa función por invocada — y por documentar el
  // problema, además. Lo cazó al escribir el aviso de B.1.
  const codigoCliente = [...leerDirRec("src"), ...leerDirRec("api")]
    .filter((f) => /\.(js|jsx|mjs)$/.test(f))
    .map((f) => leerCodigo(f)).join("\n");

  // "Nadie la invoca" no es "el JavaScript no la invoca". Media docena de estas funciones
  // —`is_admin`, `is_my_event`, `client_can_edit`, `mis_canales`…— están concedidas a
  // `authenticated` justamente porque **las policies las ejecutan como el usuario que llama**,
  // y jamás se tocan desde el navegador. Contarlas como huérfanas sería el contrato ruidoso de
  // siempre: mucho falso positivo y, en dos semanas, un `git rm`.
  //
  // La propiedad de verdad es «alguien la invoca»: el cliente, una policy, o otra función. Se
  // buscan usos como llamada —`jardines.nombre(`— descartando su propia definición y las líneas
  // de grant/revoke/drop, que nombran la función sin usarla.
  const usadaEnSql = (fn) => {
    const re = new RegExp(`jardines\\.${fn}\\s*\\(`, "g");
    for (const m of sqlTodo.matchAll(re)) {
      const lineaIni = sqlTodo.lastIndexOf("\n", m.index) + 1;
      const linea = sqlTodo.slice(lineaIni, sqlTodo.indexOf("\n", m.index));
      if (/^\s*--/.test(linea)) continue;                                  // comentario
      if (/\b(grant|revoke|drop|comment)\b/i.test(linea)) continue;        // nombra, no usa
      if (/create\s+(or\s+replace\s+)?function/i.test(linea)) continue;    // su definición
      if (/^\s*'jardines\./.test(linea)) continue;                         // elemento de un array de grants
      if (dentroDeDo(m.index)) continue;                                   // script de una vez, no un llamador
      return true;
    }
    return false;
  };
  // C.2 · LA FORMA QUE EVADE ESTE CONTRATO Y ADEMÁS CONCEDE DE MÁS.
  // `grant execute on all functions in schema jardines to authenticated` no casa `on function
  // jardines.x(...)`, así que pasaba en verde — y concede EXECUTE sobre **todas** las funciones
  // del schema, incluidas las que `sec_17` mantuvo privadas a propósito. El contrato callaba en
  // el caso peor y ladraba en el leve.
  //
  // Se PROHÍBE en vez de reconocerse. Reconocerla significaría dar por expuestas también las
  // privadas y exigirles llamador, que es ruido; y el problema no es que el contrato no la vea:
  // es que esa forma no debe usarse aquí. Los grants de este proyecto son por función, uno a uno.
  {
    const masivos = [...sqlCrudo.matchAll(/grant\s+execute\s+on\s+all\s+functions\s+in\s+schema\s+(\w+)\s+to\s+([^;]+)/gi)]
      .filter((m) => /\b(anon|authenticated)\b/.test(m[2]));
    check(
      "C.2: ninguna migración concede EXECUTE en bloque sobre todo el schema",
      masivos.length === 0,
      masivos.map((m) => `grant … on all functions in schema ${m[1]} to ${m[2].trim()}`).join(" · "),
    );
  }

  // HUÉRFANAS CONOCIDAS. Al escribir este contrato salieron seis, todas anteriores a este
  // bloque y todas comprobadas: cero apariciones en `src/`, en `api/` y en el bundle construido.
  // Se listan con su motivo en vez de bajar el listón, para que el contrato pase hoy y **falle
  // con cualquier huérfana nueva** — que es lo que habría atrapado `invitacion_guardar`.
  //
  // La lista solo puede encoger. Está anotada como J-16 en `docs/BUGS_PENDING.md`; si alguien
  // añade una entrada aquí en vez de enchufar la función, la deuda queda a la vista con nombre
  // y fecha en el `git blame`, que es exactamente lo que no pasó con `registrar_llegada_mesa`.
  const HUERFANAS_CONOCIDAS = {
    registrar_llegada_mesa: "**concedida a `anon`**, invocable sin autenticarse. Escribiría `mesas.ocupadas`, la fuente que el tablero de staff lee y que nadie llena (fase B.1). Es la más urgente de las seis: las otras cinco exigen sesión",
    // `revocar_staff_token` SALIÓ de esta lista en B.4: cancelar un evento lo revoca, que es
    // exactamente su caso de uso. El contrato de entradas caducadas lo exigió al commitear.
    confirmar_evento: "flujo de confirmación que nunca se construyó en la interfaz",
    auditoria_reciente: "la auditoría se consulta por SQL, no hay pantalla que la lea",
    operativo_ubicar: "la ubicación en vivo del operativo no llegó a tener pantalla",
    operativo_evento_activo: "idem: parte del operativo que quedó sin interfaz",
    // Séptima, y la destapó C.3: su único "uso" estaba dentro de un `do $$` de `sec_23`, así
    // que con los do-blocks contando como llamada quedaba oculta.
    info_mesa_token: "**concedida a `anon`**. `sec_23` la conservó como «la vía viva y protegida» frente a `info_mesa_publica`, que sí retiró — pero la interfaz nunca llegó a usarla: el front va por `info_invitacion` y `progreso_mesas_staff`",
  };
  const huerfanas = [...expuestas]
    .filter((fn) => !new RegExp(`["'\`]${fn}["'\`]`).test(codigoCliente))
    .filter((fn) => !usadaEnSql(fn));
  const nuevas = huerfanas.filter((fn) => !(fn in HUERFANAS_CONOCIDAS));
  check(
    "A-bis: ninguna RPC concedida al navegador se queda sin llamador (salvo las huérfanas ya anotadas)",
    nuevas.length === 0,
    nuevas.length ? `concedidas al navegador y sin llamador: ${nuevas.join(", ")}` : "",
  );
  // Y la lista no puede quedarse con entradas muertas: una huérfana que ya se enchufó tiene que
  // salir de aquí, o la próxima vez que se desenchufe nadie se enterará.
  const yaNoHuerfanas = Object.keys(HUERFANAS_CONOCIDAS).filter((fn) => !huerfanas.includes(fn));
  check(
    "A-bis: la lista de huérfanas conocidas no tiene entradas caducadas",
    yaNoHuerfanas.length === 0,
    yaNoHuerfanas.length ? `ya tienen llamador (o dejaron de existir); quítalas de la lista: ${yaNoHuerfanas.join(", ")}` : "",
  );

  // Y el lado concreto: la pantalla del P0 tiene que ir por la RPC, no por la tabla. Con
  // `entities.Evento` seguiría tocando cero filas por muy estricta que fuera la variante.
  {
    const inv = leerCodigo("src/components/portal/PortalInvitacion.jsx");
    const fallos = [];
    if (!/base44\.rpc\(\s*["']invitacion_guardar["']/.test(inv)) fallos.push("no llama a la RPC");
    if (/entities\.Evento\.(update|updateEstricto)\(/.test(inv)) fallos.push("sigue escribiendo por `entities.Evento`, que pasa por `eventos_upd`");
    // Hoy la RPC no existe en la base: eso tiene que ser un mensaje propio, no "no tienes
    // permiso" ni un reventón.
    if (!/PGRST202/.test(inv)) fallos.push("no distingue «la función todavía no existe» de un fallo de permisos");
    check("A-bis: la invitación del cliente va por `sec_26` y no por la tabla", fallos.length === 0, fallos.join(" · "));
  }
}

// ------------------------------------------- FASE T · el token que la migración rechazaba
//
// `sec_26` validaba `^[a-f0-9]{32,128}$` y `tokenSeguro()` produce **base64url de 43
// caracteres**. El día que el dueño aprobara la migración, cada clic en «Crear y activar
// invitación» habría devuelto `token_invalido` — el 100 % — y el cliente habría leído «No se
// pudo generar el enlace… inténtalo otra vez», que es exactamente la mentira que este bloque
// existe para matar. Y habría parecido intermitente, porque «Desactivar» no valida el token.
//
// ESTE CONTRATO NO MIRA LA FORMA DE LA REGEX. Ejecuta el generador **real** contra la
// validación **real** extraída del SQL. Es la única manera de que no vuelva a pasar: cualquier
// contrato que se limitara a comparar dos textos habría dado por buenas las dos versiones.
{
  const sql = leer(migracion("sec_26"));

  // T.1 · REESCRITO EN B.5, y el cambio de propiedad es el interesante.
  //
  // La versión anterior ejecutaba `tokenSeguro()` de verdad contra la regex de la migración y
  // exigía que pasaran los 2000 — porque la regex pedía hexadecimal y el generador produce
  // base64url, así que habría rechazado el 100 % de los tokens. Ese contrato era correcto y
  // atrapaba el bug.
  //
  // B.5 lo deja sin objeto: si el token lo emite el servidor, **no hay nada que validar**. La
  // propiedad que sustituye a aquella es más fuerte, porque elimina la clase entera en vez de
  // comprobar que esta vez casa: ningún token entra desde fuera, así que no puede haber una
  // regex mal escrita ni un cliente eligiendo `AAAA…A`.
  {
    const firma = entre(sql, "create or replace function jardines.invitacion_guardar(", ") returns");
    const inv = leerCodigo("src/components/portal/PortalInvitacion.jsx");
    const fallos = [];
    if (/\bp_token\b/.test(firma)) fallos.push("la firma sigue aceptando un token de fuera");
    if (!/jardines_private\.token_seguro\(\)/.test(sql)) fallos.push("el servidor no genera el token");
    if (/p_token\s*:/.test(inv)) fallos.push("el front sigue mandando un token");
    if (/tokenSeguro\s*\(/.test(inv)) fallos.push("el front sigue generando un token para la invitación");
    check("T.1: el token de la invitación lo emite el servidor; nadie lo aporta desde fuera", fallos.length === 0, fallos.join(" · "));
  }

  // T.2 · El token se EMITE una vez. La primera versión lo sobrescribía en cada activación, así
  // que dos pestañas bastaban para dejar muertos los enlaces ya repartidos — justo lo contrario
  // de lo que el comentario del front prometía.
  {
    // La propiedad, tras B.5: un token ya emitido **solo puede cambiar si se pide expresamente**.
    // Se comprueba sobre el `case` que lo calcula: toda rama que genere uno nuevo tiene que estar
    // condicionada a `p_rotar` o a que no hubiera ninguno. Una rama que generase sin condición
    // sería la sobrescritura de T.2 otra vez, con otro nombre.
    const limpio = sql.replace(/^\s*--.*$/gm, "");
    // El nombre de la variable se DERIVA de la asignación, no se fija: renombrar `v_token` es un
    // refactor y tumbaba este contrato. Van cuatro veces que el mismo defecto reaparece en un
    // contrato nuevo — por eso la regla está escrita en `docs/PROMPTS.md` §9.
    const nombreVar = (/invitacion_token\s*=\s*(\w+)\b/.exec(limpio) || [])[1] || "v_token";
    const calculo = entre(limpio, `${nombreVar} := case`, "end;");
    const ramas = calculo.split(/\bwhen\b/).slice(1);
    const malas = ramas.filter((r) => /token_seguro\(\)/.test(r) && !/p_rotar|is\s+null/.test(r.split(/\bthen\b/)[0]));
    const asignaDesdeElCalculo = new RegExp(`invitacion_token\\s*=\\s*${nombreVar}\\b`).test(limpio);
    check(
      "T.2: un token ya emitido solo cambia si se pide rotarlo",
      malas.length === 0 && ramas.length > 0 && asignaDesdeElCalculo,
      !ramas.length ? "no se encontró el cálculo del token"
        : malas.length ? `ramas que generan token sin condición: ${malas.map((r) => `«when ${r.split("then")[0].trim()}»`).join(", ")}`
        : asignaDesdeElCalculo ? "" : "`invitacion_token` no se asigna desde el token calculado",
    );
    // Y el front y el SQL tienen que decir lo mismo: el comentario que prometía la conservación
    // fue lo que hizo que nadie mirara si el SQL la hacía.
    const inv = leer("src/components/portal/PortalInvitacion.jsx");
    // Y el front no puede tener un token propio con el que rellenar el hueco: si lo tuviera,
    // volvería a poder repartir uno distinto del que la base guardó.
    check(
      "T.2: el token del front sale SOLO de la respuesta de la base",
      /invitacionToken:\s*r\.token\s*\|\|\s*null/.test(inv) && !/tokenSeguro\s*\(/.test(inv),
    );
  }

  // T.3 · Cada `motivo` que la función puede devolver tiene mensaje en el front, y cada mensaje
  // del front corresponde a un motivo que la función puede devolver. Una rama sin mensaje deja
  // al cliente con un texto genérico; un mensaje sin rama es decoración.
  {
    const motivosSql = new Set([...sql.matchAll(/'motivo',\s*'(\w+)'/g)].map((m) => m[1]));
    const inv = leerCodigo("src/components/portal/PortalInvitacion.jsx");
    const bloqueMotivos = entre(inv, "const MOTIVOS = {", "};");
    const motivosFront = new Set([...bloqueMotivos.matchAll(/^\s*(\w+):/gm)].map((m) => m[1]));
    const sinMensaje = [...motivosSql].filter((m) => !motivosFront.has(m));
    const sinRama = [...motivosFront].filter((m) => !motivosSql.has(m));
    check(
      "T.3: cada motivo de `sec_26` tiene mensaje, y cada mensaje tiene su motivo",
      sinMensaje.length === 0 && sinRama.length === 0,
      [sinMensaje.length ? `motivos sin mensaje: ${sinMensaje.join(", ")}` : "",
       sinRama.length ? `mensajes sin motivo en la función: ${sinRama.join(", ")}` : ""].filter(Boolean).join(" · "),
    );
  }
}

// ------------------------------------------- 1.2 · EL ESCAPADOR, EJECUTADO
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

// ------------------------------------------- 0 · LA FUENTE ÚNICA DEL AFORO (sec_27 aplicada)
//
// `progreso_mesas_staff` leía `mesas.ocupadas`, que no escribe nadie. Ahora suma de
// `invitaciones.personas_registradas`, que es donde `registrar_acceso_staff` escribe — y
// devuelve `fuente` para que la pantalla sepa de dónde viene el número.
//
// Ese `fuente` es lo que apaga el aviso provisional del tablero **solo**, sin que nadie tenga
// que acordarse de quitarlo. Por eso se contrata la cadena: si la migración dejara de
// devolverlo, o la pantalla dejara de mirarlo, el aviso se quedaría pintado para siempre
// afirmando algo que ya no pasa — que es cómo envejecen todos los avisos viejos.
// Se afirma sobre el CUERPO de cada función, recortado con `entre()`, no sobre el archivo entero.
// Medido mutando: el primer intento buscaba «aforo de la mesa» en todo el SQL, y esa frase vive
// también en el bloque de poscondiciones (`… not like '%aforo de la mesa%' …`, dos veces). Borrar
// el `raise exception` de verdad —la comprobación entera— dejaba el contrato en VERDE. Es la
// tercera forma de vacuidad del §9: presencia no es alcanzabilidad. Lo mismo con
// `sum(i.personas_registradas)`, que aparece en las dos funciones: quitarla de `progreso` la
// dejaba viva en `registrar` y el contrato pasaba afirmando algo de la función equivocada.
{
  const sql = leer(migracion("sec_27"));
  const staff = leerCodigo("src/components/meseros/StaffPage.jsx");
  // `as $$ … end $$;` de cada función, que es donde la propiedad tiene que estar.
  const progreso = entre(sql, "create or replace function jardines.progreso_mesas_staff", "end $$;");
  const registrar = entre(sql, "create or replace function jardines.registrar_acceso_staff", "end $$;");
  const fallos = [];
  if (!progreso) fallos.push("no se encuentra la definición de `progreso_mesas_staff`");
  if (!registrar) fallos.push("no se encuentra la definición de `registrar_acceso_staff`");
  if (!/'fuente',\s*'invitaciones'/.test(progreso)) fallos.push("`progreso_mesas_staff` no devuelve `fuente: invitaciones`");
  if (!/sum\(i\.personas_registradas\)/.test(progreso)) fallos.push("`progreso_mesas_staff` no suma de `invitaciones.personas_registradas`");
  // El freno de aforo: leer lo ya registrado en TODA la mesa, cruzarlo con `mesas.capacidad` y
  // cortar. Las tres cosas, dentro del cuerpo de `registrar_acceso_staff`.
  if (!/sum\(i\.personas_registradas\)/.test(registrar)) fallos.push("`registrar_acceso_staff` no cuenta lo ya registrado en la mesa");
  // Sin ventana de caracteres: partir el `if` en tres líneas no es una regresión, y un
  // `[\s\S]{0,80}` decía que los dos textos estaban cerca, no que uno gobernara al otro.
  if (!/>\s*m\.capacidad\b/.test(registrar)) fallos.push("`registrar_acceso_staff` no compara contra `mesas.capacidad`");
  if (!/m\.capacidad\s+is\s+not\s+null/.test(registrar)) fallos.push("`registrar_acceso_staff` no protege la comparación de una capacidad nula");
  if (!/raise\s+exception\s+'excede el aforo de la mesa/.test(registrar)) fallos.push("`registrar_acceso_staff` no corta cuando se excede el aforo");
  if (!/fuente\s*!==\s*"invitaciones"/.test(staff)) fallos.push("el aviso del tablero no cuelga de `fuente`, así que no se apagaría solo");
  check("0: el avance de mesas sale de `invitaciones`, y el aviso provisional se apaga solo", fallos.length === 0, fallos.join(" · "));
}

// ------------------------------------------- 1.4 · UN SOLO NÚMERO, Y QUE SEA EL SUYO
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

// ------------------------------------------- 2.1 · `orden` CABE EN UN `integer`
//
// `AdminGaleria` escribía `orden: Date.now()`. `jardines.galeria.orden` es `integer` (máximo
// 2 147 483 647) y `Date.now()` va por 1.75×10¹². Comprobado ejecutándolo contra la base:
// `22003 integer out of range`. NINGUNA subida a la galería funcionó nunca; las 69 filas que hay
// son las del seed. Y sin `catch`, el `throw` se llevaba el `setUploading(false)`: spinner eterno.
//
// Diez tablas de `jardines` tienen `orden integer`. El contrato es sobre la FORMA —un reloj no
// cabe en un `int4`— y mira todo `src/`, no solo la galería.
{
  const culpables = [];
  for (const f of leerDirRec("src")) {
    if (!/\.jsx?$/.test(f)) continue;
    const codigo = leerCodigo(f);
    // `orden` (o `p_orden`, `orden:`) asignado desde un reloj, en cualquier espaciado.
    if (/\borden\s*[:=]\s*Date\.now\(\)/.test(codigo)) culpables.push(f);
  }
  check(
    "2.1: nadie usa el reloj como `orden` — no cabe en el `integer` de la columna",
    culpables.length === 0,
    culpables.join(" · "),
  );

  // Y la galería calcula el siguiente a partir de lo que ya hay.
  const gal = leerCodigo("src/components/admin/AdminGaleria.jsx");
  check(
    "2.1: `AdminGaleria` deriva el `orden` del máximo que ya existe",
    /Math\.max\([\s\S]{0,80}\bg\.orden\b/.test(gal) && /siguienteOrden\(/.test(gal),
    "no se ve el cálculo de `siguienteOrden` a partir de `orden`",
  );
}

// ------------------------------------------- 2.2 · EL PANEL NO ESCRIBE COLUMNAS QUE NO EXISTEN
//
// `AdminConfig` tenía dos cajas que escribían `textoServicios` y `textoAmenidades`. Esas columnas
// NO EXISTEN en `jardines.config_sitio` — comprobado contra producción, `42703 column does not
// exist` en las dos. No eran cajas inertes: el shim manda el objeto tal cual, PostgREST rechaza la
// petición ENTERA por la columna desconocida y `handleSave` no tenía `catch`, así que el botón se
// quedaba en «Guardando…» y no se guardaba nada — ni el teléfono que el dueño acababa de corregir.
{
  const cfg = leerCodigo("src/components/admin/AdminConfig.jsx");
  const fallos = [];
  for (const muerta of ["textoServicios", "textoAmenidades"]) {
    if (new RegExp(`\\b${muerta}\\b`).test(cfg)) fallos.push(`\`AdminConfig\` vuelve a escribir \`${muerta}\`, que no es columna`);
  }
  // Y el guardado atrapa el fallo en vez de dejar el botón colgado.
  const guardar = entre(cfg, "const handleSave", "\n  };");
  if (!/catch\s*\(/.test(guardar)) fallos.push("`handleSave` no atrapa el fallo");
  if (!/finally\s*\{[\s\S]*?setSaving\(false\)/.test(guardar)) fallos.push("`setSaving(false)` no está en un `finally`: un fallo deja el botón colgado");
  check("2.2: el panel no escribe columnas que no existen, y el guardado no se cuelga", fallos.length === 0, fallos.join(" · "));
}

// ------------------------------------------- 2.3 · EL `accept` NO PROMETE MÁS QUE EL BUCKET
//
// Storage rechaza lo que no esté en `allowed_mime_types`. Un `accept="image/*"` incluye HEIC —lo
// que sale de un iPhone—, SVG y BMP, que el bucket `sitio` NO admite: el selector de archivos
// dejaba elegir justo lo que Storage iba a tirar. Y `AdminAlimentos` decía `accept=".pdf"` contra
// un bucket que no admitía PDF en absoluto (lo arregló `sec_28`).
{
  const fallos = [];
  // `BUCKET_MIME.sitio` existe y es el espejo del bucket.
  const cat = leerCodigo("src/lib/catalogos.js");
  const bloqueSitio = entre(cat, "sitio: [", "]");
  if (!bloqueSitio) fallos.push("`BUCKET_MIME` no tiene entrada para `sitio`");
  if (!/application\/pdf/.test(bloqueSitio)) fallos.push("`BUCKET_MIME.sitio` no incluye `application/pdf` (lo añadió `sec_28`)");

  // Ningún `accept` con comodín: `image/*` y `video/*` prometen más de lo que el bucket admite.
  for (const f of leerDirRec("src")) {
    if (!/\.jsx$/.test(f)) continue;
    const codigo = leerCodigo(f);
    for (const m of codigo.matchAll(/accept="([^"]*\*[^"]*)"/g)) fallos.push(`${f}: accept="${m[1]}"`);
  }
  check("2.3: ningún `accept` promete tipos que el bucket va a rechazar", fallos.length === 0, fallos.join(" · "));

  // Y `sec_28` es la que amplía `sitio` — sin tocar el bucket de Vero.
  const sql = leer(migracion("sec_28"));
  // Se recorta la SENTENCIA `update`, no se busca por todo el archivo: `where id = 'sitio'`
  // aparece también en la precondición y en la poscondición, así que quitarlo del `update` —el
  // único sitio donde protege algo— dejaba el contrato en verde. Medido mutando.
  const upd = entre(sql, "update storage.buckets", ";");
  const fallos2 = [];
  if (!upd) fallos2.push("`sec_28` no tiene un `update storage.buckets`");
  if (!/where\s+id\s*=\s*'sitio'/.test(upd)) fallos2.push("el `update` de `sec_28` no está acotado al bucket `sitio`");
  if (/site-media/.test(upd)) fallos2.push("el `update` de `sec_28` toca el bucket de Vero");
  if (!/array_append\(allowed_mime_types,\s*'application\/pdf'\)/.test(upd)) fallos2.push("el `update` de `sec_28` no añade `application/pdf`");
  // Y la migración comprueba, después, que el bucket de Vero salió como entró.
  if (!/site-media/.test(sql)) fallos2.push("`sec_28` no comprueba que el bucket de Vero no cambia");
  check("2.3: `sec_28` amplía `sitio` y deja intacto `site-media` (Vero)", fallos2.length === 0, fallos2.join(" · "));
}

// ------------------------------------------- 3.1 · EL SITIO ARRANCA AUNQUE LA BASE NO CONTESTE
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

  // Qué señal gobierna el render. Se DERIVA del propio archivo en vez de fijarse.
  const puerta = (home.match(/\{\s*!?(\w+)\s*&&\s*configLoaded\s*&&/) || [])[0] ? "configLoaded" : "";
  if (!puerta) fallos.push("ya no se ve `configLoaded` gobernando el montaje del splash");

  // Y hay un `setTimeout` cuyo callback levanta ESA señal. El plazo concreto NO se afirma: subirlo
  // a 4 s sigue cumpliendo la propiedad, y atarlo al número obligaba además a adivinar el
  // espaciado —una coma final tras `2500,` rompía la afirmación sin que hubiera regresión.
  const conTimeout = /setTimeout\(\s*\(\)\s*=>\s*setConfigLoaded\(true\)\s*,/.test(home);
  if (!conTimeout) fallos.push("ningún temporizador levanta `configLoaded`: una lectura colgada deja la página en blanco");

  // El temporizador se limpia (si no, deja un setState sobre un componente desmontado).
  if (!/clearTimeout\(/.test(home)) fallos.push("el temporizador no se limpia al desmontar");

  check("3.1: una lectura colgada no puede dejar la portada en blanco", fallos.length === 0, fallos.join(" · "));
}

// ------------------------------------------- 3.2 · HAY UN ERROR BOUNDARY, Y ENVUELVE LA APP
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

// ------------------------------------------- 4.1 · LOS MENSAJES DE LA PUERTA SON ALCANZABLES
//
// Las tres pantallas del día del evento clasificaban el error buscando la palabra «autorizado»
// dentro del mensaje del servidor. Y el servidor, A PROPÓSITO, no la dice:
// `jardines_private.error_generico()` levanta `'no disponible'` con errcode `42501` para no
// revelarle a quien prueba tokens si acertó. Resultado medido: esas ramas eran INALCANZABLES, y al
// mesero cuyo link renovaron —en la puerta, con invitados esperando— la pantalla le enseñaba la
// cadena literal «no disponible».
//
// Se clasifica por CÓDIGO, que es lo que el servidor sí se compromete a mandar y lo que no cambia
// al reescribir un texto.
{
  const fallos = [];
  const mapa = leerCodigo("src/lib/erroresPuerta.js");
  if (!/["']42501["']/.test(mapa)) fallos.push("`erroresPuerta` no clasifica por el código 42501");
  // Y distingue el cupo de la invitación del aforo de la mesa, que `sec_27` separó en el servidor.
  if (!/excede el aforo de la mesa/.test(mapa)) fallos.push("no distingue el aforo de la mesa");
  if (!/excede el cupo/.test(mapa)) fallos.push("no distingue el cupo de la invitación");

  // Ninguna pantalla de la puerta vuelve a clasificar por la palabra que el servidor no dice.
  for (const f of ["src/components/meseros/StaffPage.jsx", "src/components/meseros/AccesoPage.jsx"]) {
    const codigo = leerCodigo(f);
    if (/autorizado/.test(codigo)) fallos.push(`${f} vuelve a clasificar por la palabra «autorizado», que el servidor no manda`);
    if (!/mensajePuerta\(/.test(codigo)) fallos.push(`${f} no usa \`mensajePuerta\``);
  }
  check("4.1: los mensajes de la puerta se clasifican por código, no por una palabra que el servidor no dice", fallos.length === 0, fallos.join(" · "));

  // Y la pantalla de error del tablero no es un callejón: la red del salón se cae y vuelve.
  const staff = leerCodigo("src/components/meseros/StaffPage.jsx");
  const pantallaError = entre(staff, "if (error) {", "\n  }");
  check(
    "4.1: la pantalla de error del tablero ofrece reintentar",
    /onClick=\{\(\)\s*=>\s*\{[^}]*cargar\(\)/.test(pantallaError) || /onClick=\{cargar\}/.test(pantallaError),
    "sin botón de reintento: un corte de red deja al mesero en un callejón",
  );
}

// ------------------------------------------- 4.2 · «HOY» ES EL DEL SALÓN, NO EL DEL SERVIDOR
//
// `new Date().toISOString().slice(0, 10)` da el día en UTC, y la CDMX va seis horas por detrás:
// de las 18:00 en adelante, hora local, «hoy» en UTC ya es MAÑANA. El panel calculaba así los
// eventos próximos —el evento de esta noche desaparecía de la lista justo cuando se mira el panel
// antes de él— y el cron comparaba así contra `fecha_evento`, que es una columna `date`: un día
// natural del calendario de Xochimilco, no un instante.
{
  const culpables = [];
  for (const f of leerDirRec("src").concat(leerDirRec("api"))) {
    if (!/\.(jsx?|mjs)$/.test(f)) continue;
    const codigo = leerCodigo(f);
    // Un instante recortado a diez caracteres es una FECHA en UTC. Recortar a más (`slice(0, 13)`,
    // el ISO completo) es un instante y no tiene este problema.
    for (const m of codigo.matchAll(/toISOString\(\)\s*\.\s*slice\(\s*0\s*,\s*10\s*\)/g)) {
      culpables.push(`${f}:${codigo.slice(0, m.index).split("\n").length}`);
    }
    if (/toISOString\(\)\s*\.\s*split\(\s*["']T["']\s*\)\s*\[\s*0\s*\]/.test(codigo)) culpables.push(`${f} (split T)`);
  }
  // `solicitudAEvento.js` lo usa para VALIDAR que una cadena es una fecha real (ida y vuelta),
  // no para saber qué día es hoy: ahí el UTC de los dos lados se cancela.
  const reales = culpables.filter((c) => !c.startsWith("src/lib/solicitudAEvento.js"));
  check(
    "4.2: nadie calcula «hoy» en UTC — el día del salón no es el del servidor",
    reales.length === 0,
    reales.join(" · "),
  );

  const fechas = leerCodigo("src/lib/fechas.js");
  check(
    "4.2: `hoyLocal()` compone la fecha a mano, sin pasar por UTC",
    /export function hoyLocal/.test(fechas) && /getFullYear\(\)/.test(fechas) && !/hoyLocal[\s\S]{0,200}toISOString/.test(fechas),
    "`hoyLocal` no existe o vuelve a pasar por `toISOString`",
  );

  const cron = leerCodigo("api/cron-recordatorios.js");
  check(
    "4.2: el cron resuelve el día en la zona del salón, no en la del servidor",
    /America\/Mexico_City/.test(cron) && /Intl\.DateTimeFormat/.test(cron),
    "el cron sigue calculando el día con la zona de Vercel (UTC)",
  );
}

// ------------------------------------------- 4.3 · `sec_29` — EL LIBRO DE ENTRADAS (NO APLICADA)
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
  for (const v of ["/media/img/NBa3E9g.mp4", "/media/img/uykWsK9.mp4"]) {
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

  // 4) LLENA EL HERO Y ESTÁ EN BUCLE. El archivo es VERTICAL (576×1024) y el hero es apaisado,
  //    así que algo hay que ceder: o el cuadro entero con lados vacíos, o llenar y recortar. El
  //    primer intento fue `contain` —cumplía «que se vea completo»— y en produccion se veía como
  //    un reel centrado con marco oscuro. Corregido a `cover` a peticion del dueño.
  const temporal = entre(hero, "function HeroVideoTemporal()", "\nexport default function HeroSection");
  if (!temporal) fallos.push("no se encuentra `HeroVideoTemporal`");
  if (!/objectFit:\s*ajuste/.test(temporal)) fallos.push("el ajuste del video no sale de la configuración");
  if (!/ajuste:\s*"cover"/.test(cfg)) fallos.push("`ajuste` no es `cover`: el video no llenaría el hero");
  if (!/objectPosition:\s*posicion/.test(temporal)) fallos.push("la franja que sobrevive al recorte no sale de la configuración");
  if (!/\bloop\b/.test(temporal)) fallos.push("el video no está en bucle");
  if (!/\bmuted\b/.test(temporal)) fallos.push("el video no está silenciado — sin eso el navegador ni lo arranca");
  if (!/\bplaysInline\b/.test(temporal)) fallos.push("sin `playsInline`, iOS lo abre a pantalla completa");

  // 5) UN SOLO `<video>`. La version de `contain` montaba DOS —el centrado y una copia
  //    desenfocada de fondo— y al pasar a `cover` la copia sobra: seria un segundo decodificador
  //    de video, en el movil tambien, pintando algo que ya no se ve. Se cuentan las etiquetas
  //    dentro del componente; si alguien reintroduce el fondo, esto lo dice.
  const nVideos = (temporal.match(/<video\b/g) || []).length;
  if (nVideos !== 1) fallos.push(`\`HeroVideoTemporal\` monta ${nVideos} elementos <video>, y debe montar exactamente 1`);
  if (/filter:\s*["'`]?\s*blur/.test(temporal)) fallos.push("vuelve a haber una copia desenfocada de fondo");

  check("TEMP: un solo video, llenando el hero y en bucle", fallos.length === 0, fallos.join(" · "));
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
  const etiqueta = entre(temporal, "<video", "/>");
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

// ---------------------------------------------------------------- salida
let fallan = 0;
for (const c of casos) {
  if (!c.ok) fallan++;
  const marca = c.ok ? "PASA " : "FALLA";
  console.log(`${marca}  ${c.nombre}${c.ok || !c.detalle ? "" : `  ->  ${c.detalle}`}`);
}
console.log(`\n${casos.length - fallan}/${casos.length} pasan`);
process.exit(fallan === 0 ? 0 : 1);
