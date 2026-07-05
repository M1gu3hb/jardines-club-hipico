// seed-supabase.mjs — genera SQL para poblar el schema jardines desde el contenido estático.
// Escribe scripts/seed/*.sql (un archivo por tabla). Se ejecutan vía el MCP de Supabase.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(__dirname, "seed");

const data = JSON.parse(await readFile(path.join(ROOT, "src/data/site-data.json"), "utf8"));
const resenas = JSON.parse(await readFile(path.join(ROOT, "src/data/resenas.json"), "utf8"));

const q = (v) => {
  if (v === null || v === undefined || v === "") return "null";
  return "'" + String(v).replace(/'/g, "''") + "'";
};
const qb = (v) => (v === true ? "true" : v === false ? "false" : "null");
const qn = (v) => (v === null || v === undefined || v === "" ? "null" : Number(v));
const jb = (arr) => "'" + JSON.stringify(arr || []).replace(/'/g, "''") + "'::jsonb";

function table(tbl, cols, rows) {
  const colList = cols.join(", ");
  const values = rows.map((r) => "(" + r.join(", ") + ")").join(",\n  ");
  return `insert into jardines.${tbl} (${colList}) values\n  ${values};\n`;
}

await mkdir(OUT, { recursive: true });

// config_sitio
const c = data.config;
await writeFile(path.join(OUT, "01_config.sql"), table("config_sitio",
  ["logo_url","telefono_contacto","whatsapp_numero","correo_admin","ubicacion_texto","ubicacion_link_mapa","informacion_servicios","texto_no_incluye","proximamente_activo","proximamente_imagen_url","proximamente_titulo","proximamente_descripcion","proximamente_texto_boton","color_primario","color_secundario"],
  [[q(c.logoUrl),q(c.telefonoContacto),q(c.whatsappNumero),q(c.correoAdmin),q(c.ubicacionTexto),q(c.ubicacionLinkMapa),q(c.informacionServicios),q(c.textoNoIncluye),qb(c.proximamenteActivo),q(c.proximamenteImagenUrl),q(c.proximamenteTitulo),q(c.proximamenteDescripcion),q(c.proximamenteTextoBoton),q(c.colorPrimario),q(c.colorSecundario)]]));

// salones
await writeFile(path.join(OUT, "02_salones.sql"), table("salones",
  ["nombre","descripcion","descripcion_larga","capacidad","capacidad_min","capacidad_max","imagen_principal","imagenes","caracteristicas","activo","orden"],
  data.salones.map((s,i)=>[q(s.nombre),q(s.descripcion),q(s.descripcionLarga),q(s.capacidad),qn(s.capacidadMin),qn(s.capacidadMax),q(s.imagenPrincipal),jb(s.imagenes),jb(s.caracteristicas),qb(s.activo!==false),qn(s.orden??i+1)])));

// galeria (orden = posición para preservar el orden actual)
await writeFile(path.join(OUT, "03_galeria.sql"), table("galeria",
  ["imagen_url","titulo","orden"],
  data.galeria.map((g,i)=>[q(g.imagenUrl),q(g.titulo),i+1])));

// servicios
await writeFile(path.join(OUT, "04_servicios.sql"), table("servicios",
  ["titulo","descripcion","imagen_url","imagenes_url","activo","orden"],
  data.servicios.map((s,i)=>[q(s.titulo),q(s.descripcion),q(s.imagenUrl),jb(s.imagenesUrl),qb(s.activo!==false),i+1])));

// amenidades
await writeFile(path.join(OUT, "05_amenidades.sql"), table("amenidades",
  ["titulo","descripcion","imagen_url","imagenes_url","activo","orden"],
  data.amenidades.map((s,i)=>[q(s.titulo),q(s.descripcion),q(s.imagenUrl),jb(s.imagenesUrl),qb(s.activo!==false),i+1])));

// servicios_extra
await writeFile(path.join(OUT, "06_extra.sql"), table("servicios_extra",
  ["nombre","categoria","descripcion","aplica_a","activo","orden"],
  data.serviciosExtra.map((s,i)=>[q(s.nombre),q(s.categoria),q(s.descripcion),q(s.aplicaA||"todos"),qb(s.activo!==false),i+1])));

// alimentos
await writeFile(path.join(OUT, "07_alimentos.sql"), table("alimentos",
  ["nombre","descripcion","pdf_url","activo","orden"],
  data.alimentos.map((s,i)=>[q(s.nombre),q(s.descripcion),q(s.pdfUrl),qb(s.activo!==false),i+1])));

// resenas_config + resenas
let rsql = table("resenas_config", ["rating","google_url","stats"],
  [[qn(resenas.rating), q(resenas.googleUrl), jb(resenas.stats)]]);
if ((resenas.resenas||[]).length) {
  rsql += table("resenas", ["autor","texto","estrellas","evento","orden"],
    resenas.resenas.map((r,i)=>[q(r.autor),q(r.texto),qn(r.estrellas),q(r.evento),i+1]));
}
await writeFile(path.join(OUT, "08_resenas.sql"), rsql);

console.log("Seed SQL generado en scripts/seed/ (8 archivos).");
