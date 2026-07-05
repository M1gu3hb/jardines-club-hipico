# CLAUDE.md

## Propósito

Instrucciones permanentes para cualquier sesión de Claude Code o IA que trabaje en este
proyecto (**Jardines Club Hípico** — sitio web de salón de eventos). El objetivo es mantener
**documentación viva** para que cualquier sesión/cuenta continúe sin perder contexto.

## Regla crítica — leer antes de tocar código

1. `PROJECT_CONTEXT.md` (fuente principal de transferencia)
2. `docs/ARCHITECTURE.md`
3. `docs/DATABASE.md` (modelo de datos)
4. `docs/FILE_MAP.md`
5. `docs/DECISIONS.md`
6. `docs/BUGS_PENDING.md`
7. `docs/NEXT_STEPS.md`
8. `docs/CHANGELOG.md`
9. Mapa detallado de la UI: `docs/MAPA.md`, `docs/COMPONENTES.md`, `docs/DATOS.md`, `docs/DEPLOY.md`

## Documentación viva

Después de cada cambio significativo, actualizar la documentación correspondiente. Significativo =
crear/borrar/modificar archivos importantes, cambiar arquitectura, datos/entidades, rutas,
componentes, resolver o detectar bugs, cambiar reglas de negocio, flujo de usuario, config,
variables de entorno, scripts, dependencias, permisos/roles/seguridad.

## Reglas específicas de ESTE proyecto (no romper)

- **El sitio es DINÁMICO desde FASE-02 (2026-07-05).** El contenido vive en **Supabase**
  (Postgres, schema `jardines`, proyecto `vuzyhbiwnnngeohysxcw`). `src/data/site-data.json` y
  `src/data/resenas.json` quedan solo como **fallback estático** (por si Supabase no responde).
- **El acceso a datos es SOLO el shim `src/api/base44Client.js`.** Por dentro habla con Supabase
  (`src/api/supabaseClient.js`) pero conserva la MISMA API pública que el SDK de Base44
  (`base44.entities.X.list/filter/get/create/update/delete`, `functions.invoke`,
  `integrations.Core.UploadFile`, `auth`) y traduce camelCase↔snake_case. Los componentes NO
  cambian por esto — siguen llamando `base44.entities.X`. NO reintroducir dependencias de Base44.
- **Nunca exponer `service_role` ni `GMAIL_APP_PASSWORD` en el front.** El front solo usa la
  `anon key` (`VITE_SUPABASE_ANON_KEY`). Claves privadas solo en funciones `api/`.
- **RLS activo en TODAS las tablas** del schema `jardines`. El contenido público es de solo
  lectura para anónimos; escritura del CMS requiere rol admin.
- **Para cambiar contenido del sitio se usa el panel Admin (persiste en Supabase)**, no editar
  JSON. El seed inicial se generó con `scripts/seed-supabase.mjs` (ver `docs/DATABASE.md`).
- **Los medios se auto-hospedan** en `public/media/`. Si agregas una imagen, ponla ahí y usa la
  ruta `/media/img/...`. Los videos se detectan por extensión (`.mp4|webm|mov|ogg|m4v`).
- **Formulario → correo:** `src/components/FormularioModal.jsx` → `base44.functions.invoke("gmailSolicitud")`
  (shim) → `POST /api/solicitud` (función serverless en Vercel, Nodemailer + Gmail App Password).
- **Dorado de marca:** `#C9A84C`. Tema oscuro (`#0a0a0a`).
- **Videos del hero:** ya están comprimidos; NO comprimirlos más.
- Tras editar componentes/datos: `npm run build` debe pasar con exit 0 antes de subir.

## Regla de transferencia

`PROJECT_CONTEXT.md` es la fuente principal para transferir el proyecto. Debe estar siempre
actualizado, claro y accionable.

## Regla anti-documentación muerta

Si algo cambió, actualízalo. Si algo ya no aplica, márcalo obsoleto o elimínalo.

## Regla de cierre

Antes de terminar cualquier sesión, responder con: cambios hechos, archivos modificados,
documentación actualizada, bugs pendientes, próximo paso recomendado, y el bloque
"## Estado de documentación".

## Comandos clave

```bash
npm install
npm run dev                    # http://localhost:5173
npm run build                  # genera dist/
node scripts/build-media.mjs   # regenera src/data/site-data.json desde scripts/raw/*.json
```
