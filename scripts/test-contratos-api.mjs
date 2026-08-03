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

// ---------------------------------------------------------------- salida
let fallan = 0;
for (const c of casos) {
  if (!c.ok) fallan++;
  const marca = c.ok ? "PASA " : "FALLA";
  console.log(`${marca}  ${c.nombre}${c.ok || !c.detalle ? "" : `  ->  ${c.detalle}`}`);
}
console.log(`\n${casos.length - fallan}/${casos.length} pasan`);
process.exit(fallan === 0 ? 0 : 1);
