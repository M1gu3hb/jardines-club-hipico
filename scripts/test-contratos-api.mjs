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
import { readFileSync } from "node:fs";

const leer = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

/**
 * Igual que `leer`, pero sin comentarios. Necesario porque las cabeceras
 * describen el código ANTERIOR ("antes decía `if (secret) {`…") y eso dispara
 * falsos positivos al buscar patrones prohibidos.
 */
const leerCodigo = (p) =>
  leer(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
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
  const sql = leer("supabase/migrations/20260801213853_jardines_sec_07_indices_storage_constraints.sql");
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
    check(
      "alta: se confirma releyendo antes de dar el alta por buena",
      /Evento\.filterEstricto\(\{ id: eventoId \}\)/.test(crear),
      crear ? "" : "no se encontró crear()",
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

// ---------------------------------------------------------------- salida
let fallan = 0;
for (const c of casos) {
  if (!c.ok) fallan++;
  const marca = c.ok ? "PASA " : "FALLA";
  console.log(`${marca}  ${c.nombre}${c.ok || !c.detalle ? "" : `  ->  ${c.detalle}`}`);
}
console.log(`\n${casos.length - fallan}/${casos.length} pasan`);
process.exit(fallan === 0 ? 0 : 1);
