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
  check("correo-cliente: el front envía `documentoId`", /documentoId:/.test(front));
  check(
    "correo-cliente: el front ya NO envía el nombre del documento",
    !/documento:\s*doc\.titulo/.test(front),
  );
  check("correo-cliente: la API exige rol admin", /rol:\s*"admin"/.test(api));
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
}

// ---------------------------------------------------------------- escapado de correos
for (const ruta of [
  "api/notificar.js",
  "api/correo-cliente.js",
  "api/crear-admin.js",
  "api/crear-usuario-evento.js",
  "api/cron-recordatorios.js",
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
  // Dentro del cuerpo de `filterEstricto`: el `throw` que importa es el suyo. Medido
  // por distancia, el contrato se sostenía sobre el texto de un `console.error`.
  const cFiltro = entre(s, "async filterEstricto(", "async get(");
  check(
    "shim: filterEstricto propaga el error en vez de devolver []",
    /throw error/.test(cFiltro),
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

  // Se cruzan los DOS archivos: la lista del panel contra el CHECK de la migración. Afirmar
  // solo sobre el panel dejaría pasar exactamente la divergencia que causó el fallo.
  {
    const restriccion = (sql.match(/solicitudes_estatus_valido[\s\S]*?check \(([\s\S]*?)\);/) || ["", ""])[1];
    const enBase = [...restriccion.matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
    const lista = (jsx.match(/const ESTATUS = \[([^\]]*)\]/) || ["", ""])[1];
    const enPanel = [...lista.matchAll(/"([^"]+)"/g)].map((m) => m[1]).sort();
    check(
      "solicitudes: el panel ofrece EXACTAMENTE los estatus que admite el CHECK de sec_07",
      enBase.length > 0 && enPanel.length > 0 && enBase.join("|") === enPanel.join("|"),
      `base=[${enBase.join(", ")}]  panel=[${enPanel.join(", ")}]`,
    );
  }

  // Cada estatus ofrecido tiene color: si no, `STATUS_COLORS[…]` sale `undefined` y el
  // `className` del <select> queda sin borde ni fondo.
  {
    const lista = (jsx.match(/const ESTATUS = \[([^\]]*)\]/) || ["", ""])[1];
    const colores = (jsx.match(/const STATUS_COLORS = \{([\s\S]*?)\n\};/) || ["", ""])[1];
    const sinColor = [...lista.matchAll(/"([^"]+)"/g)].map((m) => m[1]).filter((e) => !colores.includes(`"${e}"`));
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

// ---------------------------------------------------------------- salida
let fallan = 0;
for (const c of casos) {
  if (!c.ok) fallan++;
  const marca = c.ok ? "PASA " : "FALLA";
  console.log(`${marca}  ${c.nombre}${c.ok || !c.detalle ? "" : `  ->  ${c.detalle}`}`);
}
console.log(`\n${casos.length - fallan}/${casos.length} pasan`);
process.exit(fallan === 0 ? 0 : 1);
