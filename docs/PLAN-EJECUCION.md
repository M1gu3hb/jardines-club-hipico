# PLAN-EJECUCION.md — Auditoría (FASE 00) y decisiones de ejecución

> **DOCUMENTO HISTÓRICO.** Es el plan con el que se ejecutó la migración de estático → dinámico
> (FASE-02, julio 2026). Se conserva porque explica *por qué* el proyecto quedó como quedó, pero
> **no describe el estado actual** y no debe usarse como referencia. Para el estado real:
> [`PROJECT_CONTEXT.md`](../PROJECT_CONTEXT.md), [`ARCHITECTURE.md`](ARCHITECTURE.md),
> [`DATABASE.md`](DATABASE.md) y [`SEGURIDAD.md`](SEGURIDAD.md).
>
> Lo que ya no aplica de este documento: el login del admin en `/Admin` con credenciales en el
> código (hoy es Supabase Auth + rol + ruta secreta), y el modelo de permisos previo al
> blindaje `sec_01..22`.

Migración de sitio estático → dinámico con **Supabase** + portal de eventos.
*(Los `plan/FASE-*.md` que citaba la versión original no están en el repo.)*

## Proyecto Supabase
- Proyecto `vuzyhbiwnnngeohysxcw`. URL `https://vuzyhbiwnnngeohysxcw.supabase.co`.
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
6. **Admin secreto:** ruta no adivinable (se define slug); guard por rol `admin`; se elimina el login hardcodeado `admin` / contraseña fija en el código.

## Punto de partida del admin y el nav (estado en FASE-00, ya superado)
- `/Admin`: `src/pages/Admin.jsx` con login por `sessionStorage` y credenciales fijas en el
  código → `AdminDashboard` con tabs (`AdminConfig, AdminSalones, AdminServicios,
  AdminServicioItems, AdminAmenidadItems, AdminGaleria, AdminAlimentos, AdminSolicitudes`).
- Nav de secciones: `src/components/Sidebar.jsx` (`navItems`), scroll a `#id`. *(Ese archivo se
  borró el 2026-08-03; el menú real es `StaggeredMenu`.)*

**Cómo quedó:** el login fijo se eliminó (hoy es Supabase Auth + rol + ruta secreta), `/Admin`
devuelve 404, y a `Sidebar.jsx` lo sustituyó `StaggeredMenu` — quedó huérfano y **se borró**.
Estado real en
`docs/MAPA.md` y `docs/FILE_MAP.md`.

## Riesgos / notas
- `service_role` no se puede extraer por MCP → el dueño debe ponerlo en Vercel para las funciones `api/`.
- Exponer `jardines` a PostgREST puede requerir confirmar en el dashboard si el `ALTER ROLE` no basta.
- Repo pesado (hoy **586 MB** de medios); los medios en `/media/` siguen sirviendo (no se migran a Storage salvo nuevos uploads del CMS).
