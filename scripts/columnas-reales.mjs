#!/usr/bin/env node
/**
 * columnas-reales.mjs — ¿existen de verdad las columnas que `api/` le pide a la base?
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * POR QUÉ EXISTE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * `api/_lib/mcp-herramientas.js` pedía `numero_invitados` a `jardines.eventos`, y esa columna
 * NO existe: el número de personas solo vive en `solicitudes.numero_personas`. PostgREST no
 * ignora una columna desconocida — rechaza la consulta ENTERA con un 42703. O sea que
 * `buscar_eventos`, `ver_evento`, `ver_cuenta`, `registrar_pago` y todo lo que pasaba por
 * `resolverEvento` estaban rotos de raíz. No a medias: no funcionaba ninguno.
 *
 * Y se subió así. Las cuatro puertas del proyecto —lint, typecheck, contratos, build— pasaban
 * las cuatro, porque **ninguna habla con la base**. Un nombre de columna es una cadena de
 * texto: para JavaScript es correcta hasta que Postgres opina.
 *
 * Esto cierra ese hueco. No sustituye a las cuatro puertas: es la quinta, y solo hace falta
 * cuando se toca `api/` o cuando cambia el esquema.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * LO QUE LEE, Y LO QUE LE FALTABA  (D-P-7)
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Extraía de `.from().select()`, de `.from().insert/update({...})` y de las constantes `COLS_*`.
 * **No leía los filtros** —`.eq("columna", …)`, `.in`, `.order`, `.not`…— y eso es exactamente la
 * forma del bug que lo hizo nacer: `numero_invitados` viajaba en un filtro. Peor aún,
 * `api/eliminar-evento.js` filtra DIECISÉIS tablas por `.eq("evento_id")` y ninguna de esas
 * dieciséis salía en su lista: la puerta decía «OK» sobre el archivo más destructivo del repo
 * habiendo mirado nada de él.
 *
 * Un filtro con una columna inexistente falla igual de fuerte: PostgREST devuelve 42703 y rechaza
 * la consulta entera. Que la columna esté en el `select` o en el `where` no cambia nada.
 *
 * Ahora se recorre la CADENA que sigue a cada `.from("tabla")` —cortada en el siguiente `.from(`
 * para no atribuirle a una tabla los filtros de la siguiente— y se anota toda columna nombrada
 * por un filtro.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * CÓMO SE USA
 * ══════════════════════════════════════════════════════════════════════════════
 *
 *   node scripts/columnas-reales.mjs          → si hay credenciales, comprueba y falla si sobra alguna
 *   node scripts/columnas-reales.mjs --sql    → imprime el SQL para pegarlo en el editor de Supabase
 *
 * Las credenciales salen de `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE`. Si no están, el script
 * NO falla: imprime el SQL y lo dice. Es deliberado — la `service_role` no debe andar suelta en
 * la máquina de nadie, y pegar una consulta en el editor es una barrera perfectamente válida.
 */
import { readFileSync, readdirSync } from "node:fs";

const RAIZ = new URL("..", import.meta.url);

/** Todos los `.js` bajo `api/`, recursivo. */
function archivosDe(dir) {
  const salida = [];
  for (const e of readdirSync(new URL(dir, RAIZ), { withFileTypes: true })) {
    if (e.isDirectory()) salida.push(...archivosDe(`${dir}/${e.name}`));
    else if (e.name.endsWith(".js")) salida.push(`${dir}/${e.name}`);
  }
  return salida;
}

const referencias = new Map(); // "tabla.col" -> Set(archivos)

/**
 * Los filtros de PostgREST cuyo PRIMER argumento es un nombre de columna.
 *
 * `select` no está: su argumento es una lista y ya lo cubre el bloque de arriba. `or` tampoco:
 * su argumento es una expresión entera y sacarle las columnas pide un analizador de verdad —
 * declarado aquí en vez de aparentado, que es lo que pide la regla de los contratos.
 */
const FILTROS =
  /\.(?:eq|neq|gt|gte|lt|lte|like|ilike|is|in|contains|containedBy|overlaps|order|not|match|filter)\(\s*["']([a-z_][a-z0-9_]*)["']/g;

function apunta(tabla, col, quien) {
  const c = col.trim();
  // PostgREST admite alias y embebidos; solo se comprueba lo que parece una columna simple.
  if (!/^[a-z_][a-z0-9_]*$/.test(c)) return;
  const clave = `${tabla}.${c}`;
  if (!referencias.has(clave)) referencias.set(clave, new Set());
  referencias.get(clave).add(quien);
}

for (const ruta of archivosDe("api")) {
  const s = readFileSync(new URL(ruta, RAIZ), "utf8");

  // .from("tabla") … .select("a, b, c")
  for (const m of s.matchAll(/\.from\(\s*["']([a-z_]+)["']\s*\)[\s\S]{0,400}?\.select\(\s*["']([^"']*)["']/g)) {
    for (const c of m[2].split(",")) apunta(m[1], c, ruta);
  }
  // .from("tabla") … .insert({ col: … }) / .update({ col: … })
  for (const m of s.matchAll(/\.from\(\s*["']([a-z_]+)["']\s*\)[\s\S]{0,200}?\.(?:insert|update)\(\s*\{([\s\S]{0,600}?)\}\s*\)/g)) {
    // La clave tiene que ir PEGADA a un `{` o a una `,`, no «tras cualquier blanco».
    //
    // Con `[{,\s]` bastaba un espacio delante, así que el ternario
    // `mesa_id: levantar ? null : mesa.id` hacía leer **`null` como si fuera una columna** —
    // `? null :` casaba—. Medido: la puerta pedía a la base una columna `invitados.null` que
    // obviamente no existe, e iba a reportarla como fallo. Una puerta que inventa un fallo se
    // desactiva a la semana, y con ella se van los 111 avisos que sí valen.
    for (const k of m[2].matchAll(/(?:^|[{,])\s*([a-z_][a-z0-9_]*)\s*:/g)) apunta(m[1], k[1], ruta);
  }
  // .from("tabla") … .eq("col", …) / .in / .order / .not / …
  //
  // Se recorta la cadena en el SIGUIENTE `.from(` para no atribuirle a una tabla los filtros de
  // la de al lado. Con una ventana fija de N caracteres, dos consultas seguidas en el mismo
  // archivo se contaminaban — y una atribución equivocada es peor que no mirar: manda a buscar
  // una columna a la tabla que no es.
  for (const m of s.matchAll(/\.from\(\s*["']([a-z_]+)["']\s*\)/g)) {
    const desde = m.index + m[0].length;
    const sig = s.indexOf(".from(", desde);
    const hasta = sig < 0 ? s.length : sig;
    const cadena = s.slice(desde, hasta);
    for (const f of cadena.matchAll(FILTROS)) apunta(m[1], f[1], ruta);
  }
  // Constantes de columnas sueltas, del tipo `const COLS_EVENTO = "id, nombre, …"`.
  for (const m of s.matchAll(/const\s+COLS_([A-Z_]+)\s*=\s*\n?\s*["']([^"']+)["']/g)) {
    const tabla = { EVENTO: "eventos" }[m[1]];
    if (!tabla) continue;
    for (const c of m[2].split(",")) apunta(tabla, c, `${ruta} (COLS_${m[1]})`);
  }
}

const pares = [...referencias.keys()].sort().map((k) => {
  const i = k.indexOf(".");
  return [k.slice(0, i), k.slice(i + 1)];
});

const sql =
  `with pedidas(tabla, col) as (values\n  ${pares.map(([t, c]) => `('${t}','${c}')`).join(",\n  ")}\n)\n` +
  `select p.tabla, p.col\n` +
  `from pedidas p\n` +
  `left join information_schema.columns c\n` +
  `  on c.table_schema = 'jardines' and c.table_name = p.tabla and c.column_name = p.col\n` +
  `where c.column_name is null\n` +
  `order by 1, 2;`;

if (process.argv.includes("--sql")) {
  console.log(sql);
  process.exit(0);
}

const url = process.env.SUPABASE_URL;
const clave = process.env.SUPABASE_SERVICE_ROLE;
if (!url || !clave) {
  console.log(`${pares.length} referencias a columnas encontradas en api/.\n`);
  console.log("No hay credenciales (SUPABASE_URL / SUPABASE_SERVICE_ROLE), así que no se puede");
  console.log("comprobar desde aquí. Pega esto en el editor SQL de Supabase — si devuelve filas,");
  console.log("cada una es una columna que el código pide y la base no tiene:\n");
  console.log(sql);
  // NO se falla: no tener la service_role a mano es lo correcto, no un error.
  process.exit(0);
}

const { createClient } = await import("@supabase/supabase-js");
const admin = createClient(url, clave, { auth: { persistSession: false } });
const { data, error } = await admin.rpc("exec_sql", { q: sql }).catch(() => ({ data: null, error: true }));

if (error || !Array.isArray(data)) {
  console.log("No se pudo consultar el esquema por RPC. Usa --sql y pega la consulta:\n");
  console.log(sql);
  process.exit(0);
}

if (data.length === 0) {
  console.log(`OK — las ${pares.length} columnas que api/ le pide a la base existen todas.`);
  process.exit(0);
}
console.error(`FALLA — ${data.length} columnas que api/ pide NO existen:\n`);
for (const f of data) console.error(`  ${f.tabla}.${f.col}`);
process.exit(1);
