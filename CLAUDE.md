# CLAUDE.md

## Propósito

Instrucciones permanentes para cualquier sesión de Claude Code o IA que trabaje en este
proyecto (**Jardines Club Hípico** — sitio web + portal de un salón de eventos en Xochimilco,
CDMX). El objetivo es mantener **documentación viva** para que cualquier sesión o cuenta
continúe el trabajo sin perder contexto.

> **Regla principal:** nunca termines una sesión sin actualizar la documentación con los
> cambios realizados, decisiones tomadas, archivos tocados, entidades afectadas, bugs
> detectados y próximos pasos.

## Regla crítica — leer antes de tocar código

1. `PROJECT_CONTEXT.md` — fuente principal de transferencia. Léelo completo.
2. `docs/SEGURIDAD.md` — **modelo de seguridad vigente. Obligatorio antes de tocar SQL,
   RLS, funciones, Storage, `api/` o cualquier cosa de auth.**
3. `docs/ARCHITECTURE.md`
4. `docs/DATABASE.md` — modelo de datos real (Supabase)
5. `docs/FILE_MAP.md`
6. `docs/DECISIONS.md`
7. `docs/BUGS_PENDING.md`
8. `docs/NEXT_STEPS.md`
9. `docs/CHANGELOG.md`
10. `docs/PROMPTS.md` — prompts de arranque y de transferencia
11. Mapa detallado de la UI: `docs/MAPA.md`, `docs/COMPONENTES.md`, `docs/DATOS.md`, `docs/DEPLOY.md`

## Documentación viva

Después de cada cambio significativo, actualizar la documentación correspondiente.
**Significativo** = crear/borrar/modificar archivos importantes, cambiar arquitectura,
datos/entidades, rutas, componentes, resolver o detectar bugs, cambiar reglas de negocio,
flujo de usuario, configuración, variables de entorno, scripts, dependencias, o
permisos/roles/seguridad.

## CANDADO ABSOLUTO — Vero Seguros

El proyecto de Supabase `vuzyhbiwnnngeohysxcw` **está compartido con otra aplicación
distinta, Vero Seguros**. Vero queda intacto siempre. **No modificar, ni directa ni
indirectamente:**

- Su frontend o su repositorio.
- Tablas, funciones, triggers, políticas, índices o datos del schema `public`
  (incluidos `public.admin_users`, `public.insurers`, `public.services`,
  `public.content_audit`, `public.is_admin()`, `public.rls_auto_enable()`).
- El bucket `site-media`.
- Usuarios, sesiones o acceso administrativo de Vero.
- Configuración **global** de Supabase Auth (política de contraseñas, protección de
  contraseñas filtradas, JWT, SMTP, redirect URLs) — es compartida y puede romper su login.

Lo único realmente compartido es `auth.users` y el trigger `on_auth_user_created`. Antes de
tocar cualquier cosa compartida hay que demostrar que Vero no cambia (ver `docs/SEGURIDAD.md` §2).

## Regla de secretos

**Nunca** poner secretos, tokens, `service_role`, JWT, contraseñas, correos internos ni datos
personales en commits, logs, documentación, mensajes de PR ni salida de pruebas. El front solo
usa la `anon key`. Las claves privadas viven en variables de entorno de Vercel y solo se leen
desde `api/`.

## Reglas específicas de ESTE proyecto (no romper)

- **El sitio es DINÁMICO desde FASE-02 (2026-07-05).** El contenido vive en **Supabase**
  (Postgres 17, schema `jardines`, proyecto `vuzyhbiwnnngeohysxcw`).
- **No hay fallback estático del contenido.** `src/data/site-data.json` **no lo importa nadie**
  en `src/` ni en `api/`: solo es la entrada de `scripts/seed-supabase.mjs` (y de `montage.mjs`).
  **Si Supabase no responde, el sitio se renderiza vacío.** El único JSON que sí se usa en
  runtime es `src/data/resenas.json`, importado por `src/components/Confianza.jsx`.
- **El acceso a datos es SOLO el shim `src/api/base44Client.js`.** Por dentro habla con Supabase
  (`src/api/supabaseClient.js`) pero conserva la MISMA API pública que el SDK de Base44
  (`base44.entities.X.list/filter/get/create/update/delete`, `functions.invoke`,
  `integrations.Core.UploadFile`, `auth`) y traduce camelCase↔snake_case. Los componentes NO
  cambian por esto — siguen llamando `base44.entities.X`. NO reintroducir dependencias de Base44.
- **RLS activo en TODAS las tablas** de `jardines`. Contenido público = solo lectura para
  `anon`; escritura del CMS = rol admin. `anon` **no tiene** INSERT/UPDATE/DELETE en ninguna tabla.
- **Al crear una tabla nueva en `jardines`** hay que activar RLS a mano (`rls_auto_enable` solo
  cubre `public`, y es de Vero). Ver `docs/SEGURIDAD.md` §10.
- **Toda función `SECURITY DEFINER` nueva** debe llevar `search_path = ''`, nombres
  completamente calificados y `EXECUTE` mínimo (nunca `PUBLIC`).
- **Orden de despliegue:** primero lo **aditivo**, luego se despliega el frontend, y **solo
  entonces** se retira lo viejo. La base es producción compartida: revocar antes de desplegar
  ya rompió el formulario público una vez (`sec_05` → `sec_13`). Ver `docs/SEGURIDAD.md` §8.bis.
- **Migraciones forward-only** en `supabase/migrations/`, nombradas
  `<timestamp>_jardines_sec_NN_<tema>.sql`. No reescribir migraciones aplicadas.
- **Para cambiar contenido del sitio se usa el panel Admin (persiste en Supabase)**, no editar
  JSON. El seed inicial se generó con `scripts/seed-supabase.mjs` (ver `docs/DATABASE.md`).
- **Los medios se auto-hospedan** en `public/media/`. Si agregas una imagen, ponla ahí y usa la
  ruta `/media/img/...`. Los videos se detectan por extensión (`.mp4|webm|mov|ogg|m4v`).
- **Formulario → correo:** `src/components/FormularioModal.jsx` → RPC `solicitud_crear` (shim)
  → `POST /api/solicitud` (serverless en Vercel, Nodemailer + Gmail App Password). El folio lo
  genera **el servidor**; el front nunca lo inventa.
- **El panel admin NO vive en `/Admin`** (esa ruta es 404). Vive en la ruta secreta
  `ADMIN_SLUG` (`src/config/portal.js`, sobreescribible con `VITE_ADMIN_SLUG`).
- **Dorado de marca:** `#C9A84C`. Tema oscuro (`#0a0a0a`).
- **Videos del hero:** ya están comprimidos; NO comprimirlos más.

## Antes de subir cambios

Los cuatro tienen que pasar:

```bash
npm run lint            # 0 problemas
npm run build           # exit 0
npm run test:contratos  # 71/71
npm run typecheck       # 155 errores = línea base histórica, no debe SUBIR
```

Si tocaste SQL, además corre `supabase/tests/seguridad.sql` (63 aserciones, va en
`BEGIN/ROLLBACK`, no deja rastro).

## Regla de transferencia

`PROJECT_CONTEXT.md` es la fuente principal para transferir el proyecto. Debe estar siempre
actualizado, claro y accionable.

## Regla anti-documentación muerta

Si algo cambió, actualízalo. Si algo ya no aplica, márcalo obsoleto o elimínalo. No dejes
banners encima de un cuerpo que dice lo contrario.

## Regla de cierre

Antes de terminar cualquier sesión, responder con: cambios hechos, archivos modificados,
documentación actualizada, bugs pendientes, próximo paso recomendado, y este bloque:

```
## Estado de documentación
* CLAUDE.md actualizado: Sí/No
* PROJECT_CONTEXT.md actualizado: Sí/No
* CHANGELOG.md actualizado: Sí/No
* DATABASE.md actualizado: Sí/No/No aplica
* FILE_MAP.md actualizado: Sí/No
* BUGS_PENDING.md actualizado: Sí/No
* NEXT_STEPS.md actualizado: Sí/No

## Próximo paso recomendado
[una sola acción concreta]
```

## Comandos clave

```bash
npm install
npm run dev                    # http://localhost:5173
npm run build                  # genera dist/
npm run lint                   # eslint (no-undef activo: atrapa símbolos borrados)
npm run test:contratos         # contratos frontend ↔ api/ (estático, sin red)
node scripts/build-media.mjs   # regenera src/data/site-data.json (entrada del seed) desde scripts/raw/*.json
node scripts/seed-supabase.mjs # seed inicial de Supabase (histórico, no re-ejecutar a ciegas)
```
