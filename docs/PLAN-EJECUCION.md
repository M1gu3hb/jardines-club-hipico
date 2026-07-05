# PLAN-EJECUCION.md — Auditoría (FASE 00) y decisiones de ejecución

Migración de sitio estático → dinámico con **Supabase** + portal de eventos. Ver `../plan/FASE-*.md`.

## Proyecto Supabase
- **JCH + MH** (`vuzyhbiwnnngeohysxcw`), org `M1gu3l97`. URL `https://vuzyhbiwnnngeohysxcw.supabase.co`.
- **Todo Jardines vive en el schema `jardines`** (el proyecto Supabase se comparte con otro sitio ajeno).
- Env (front): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (anon key es público). Server (`api/`):
  `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE` (secreto, lo pone el dueño en Vercel), `GMAIL_*`, `MAIL_TO`.

## Seam de datos (único acceso) — `src/api/base44Client.js`
Firmas que consumen los componentes (NO cambian):
- `base44.entities.<Entidad>.list(sort?)` · `.filter(query, sort?)` · `.get(id)` · `.create(data)` · `.update(id, patch)` · `.delete(id)`
- `base44.functions.invoke(name, payload)` — solo `gmailSolicitud`/`notificarNuevaSolicitud` → `POST /api/solicitud`.
- `base44.integrations.Core.UploadFile({ file })` → `{ file_url }`.
- `base44.auth.me()` · `.logout()` · `.redirectToLogin()`.

### Llamadas reales (entidad → sort/filtro → archivo)
- `ConfigSitio.list()` → Home, AdminConfig.
- `Salon.filter({activo:true}, "orden")` → Home. `Salon.list("orden")` → AdminSalones. `Salon.list()` → FormularioModal.
- `Galeria.list()` (sin sort; orden del arreglo) → Home. `Galeria.list("-orden")` → AdminGaleria.
- `ServicioItem.filter({activo:true}, "orden")` → ServiciosAmenidades. `.list("orden")` → AdminServicioItems.
- `AmenidadItem.filter({activo:true}, "orden")` → ServiciosAmenidades. `.list("orden")` → FormularioModal/AdminAmenidadItems.
- `ServicioExtra.list("orden")` → FormularioModal/AdminServicios.
- `AlimentoMenu.list("orden")` → FormularioModal/AdminAlimentos.
- `SolicitudEvento.create()`/`.update(id,patch)` → FormularioModal. `.list("-created_date")` → AdminSolicitudes.
- `integrations.Core.UploadFile` → AdminConfig/AdminGaleria/AdminSalones/AdminAlimentos.

## Formas de entidad (de `src/data/site-data.json` + `resenas.json`)
- **config** (1): `logoUrl, telefonoContacto, whatsappNumero, correoAdmin, ubicacionTexto, ubicacionLinkMapa, informacionServicios, textoNoIncluye, proximamenteActivo(bool), proximamenteImagenUrl, proximamenteTitulo, proximamenteDescripcion, proximamenteTextoBoton, colorPrimario, colorSecundario, id`.
- **salones[8]**: `nombre, descripcion, descripcionLarga, capacidad, capacidadMin(num), capacidadMax(num), imagenPrincipal, imagenes[](jsonb), caracteristicas[](jsonb), activo(bool), orden(num), id`.
- **galeria[69]**: `imagenUrl, (titulo, orden), id`.
- **servicios[14] / amenidades[15]**: `titulo, descripcion, imagenUrl, imagenesUrl[](jsonb), activo, orden, id`.
- **serviciosExtra[11]**: `nombre, categoria, descripcion, aplicaA, activo, orden, id`.
- **alimentos[3]**: `nombre, descripcion, pdfUrl, activo, orden, id`.
- **resenas.json**: `{ rating, googleUrl, stats[], resenas[] }` (resenas: `autor, texto, estrellas, evento`).

## Decisiones de ejecución
1. **Columnas snake_case** en DB (como el plan). El shim traduce **camelCase↔snake_case** con un
   convertidor genérico (lectura: snake→camel; escritura: camel→snake). Casos: `imagenPrincipal↔imagen_principal`,
   `imagenesUrl↔imagenes_url`, `capacidadMin↔capacidad_min`, etc. `id` se conserva. Sort `-created_date` → `created_at`.
2. **jsonb** para `imagenes`, `caracteristicas`, `imagenesUrl`, `stats`, y arrays de reglas.
3. **Exponer el schema `jardines`** a PostgREST vía `ALTER ROLE authenticator SET pgrst.db_schemas=...` + `NOTIFY pgrst`.
   El cliente supabase-js usa `db: { schema: 'jardines' }`.
4. **Seed** con SQL generado desde el JSON (vía MCP execute_sql, que corre server-side, no expone service_role),
   conservando los `id` originales de Base44. El JSON se conserva como respaldo/seed.
5. **Auth cliente sin correo:** Supabase Auth con email sintético `${usuario}@portal.jardines.local`. Creación de
   usuarios de cliente server-side (`api/crear-usuario-evento.js` con service_role). Admin: cuenta única rol `admin`.
6. **Admin secreto:** ruta no adivinable (se define slug); guard por rol `admin`; se elimina el login hardcodeado `admin/hipico2024`.

## Estado actual del admin y nav
- `/Admin`: `src/pages/Admin.jsx` (login sessionStorage `admin`/`hipico2024`) → `AdminDashboard` con tabs
  (`AdminConfig, AdminSalones, AdminServicios, AdminServicioItems, AdminAmenidadItems, AdminGaleria, AdminAlimentos, AdminSolicitudes`).
- Nav de secciones: `src/components/Sidebar.jsx` (`navItems`), scroll a `#id`. → FASE-09 lo cambia a StaggeredMenu.

## Riesgos / notas
- `service_role` no se puede extraer por MCP → el dueño debe ponerlo en Vercel para las funciones `api/`.
- Exponer `jardines` a PostgREST puede requerir confirmar en el dashboard si el `ALTER ROLE` no basta.
- Repo pesado (~560 MB medios); los medios en `/media/` siguen sirviendo (no se migran a Storage salvo nuevos uploads del CMS).
