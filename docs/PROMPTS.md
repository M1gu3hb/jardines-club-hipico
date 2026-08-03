# PROMPTS.md

Prompts para continuar o transferir el proyecto a otra sesión, cuenta o IA.

---

## 1. PROMPT FIJO PARA CLAUDE CODE — DOCUMENTACIÓN VIVA DEL PROYECTO

> Este es el prompt que se pega al inicio de una sesión para que la IA mantenga la
> documentación viva. Es genérico: sirve para este proyecto y para cualquier otro.

```
PROMPT FIJO PARA CLAUDE CODE — DOCUMENTACIÓN VIVA DEL PROYECTO

REGLA PRINCIPAL
Nunca termines una sesión sin actualizar la documentación del proyecto con los cambios
realizados, decisiones tomadas, archivos tocados, entidades afectadas, bugs detectados y
próximos pasos.

ARCHIVOS OBLIGATORIOS

Raíz:
  CLAUDE.md           — instrucciones permanentes para cualquier IA que trabaje aquí
  PROJECT_CONTEXT.md  — documento principal de transferencia

Carpeta /docs:
  ARCHITECTURE.md   — arquitectura, capas, flujos
  DATABASE.md       — modelo de datos, entidades, relaciones, migraciones
  FILE_MAP.md       — mapa de archivos importantes
  DECISIONS.md      — decisiones técnicas y de producto
  BUGS_PENDING.md   — bugs abiertos y resueltos
  NEXT_STEPS.md     — próximos pasos priorizados
  CHANGELOG.md      — historial de cambios por fecha
  PROMPTS.md        — prompts útiles y de transferencia

En ESTE proyecto, además (y SEGURIDAD.md es de lectura OBLIGATORIA antes de tocar
SQL, RLS, funciones, Storage, api/ o auth):
  SEGURIDAD.md      — modelo de seguridad vigente
  DEPLOY.md         — deploy, variables de entorno, cron y dominio
  MAPA.md           — dónde tocar para cada cambio del sitio público
  COMPONENTES.md    — referencia componente por componente
  DATOS.md          — cómo se edita el contenido

ESTRUCTURA DE PROJECT_CONTEXT.md (15 secciones numeradas)
  1. Objetivo del proyecto
  2. Estado actual (funciona / incompleto / roto)
  3. Stack técnico
  4. Arquitectura general
  5. Módulos principales
  6. Entidades y base de datos
  7. Mapeo de archivos importantes
  8. Flujos críticos
  9. Decisiones tomadas
 10. Bugs pendientes
 11. Riesgos
 12. Próximos pasos
 13. Prompts útiles
 14. Cosas que NO se deben romper
 15. Última actualización

FORMATOS
  DATABASE.md  — por cada entidad: propósito, campos clave, relaciones, reglas de negocio.
                 Además: migraciones aplicadas y reglas de datos.
  FILE_MAP.md  — por cada archivo importante: qué hace, de qué depende, riesgo si se toca.
  CHANGELOG.md — por fecha, con: cambios realizados, archivos modificados, entidades/BD
                 afectadas, bugs resueltos, bugs nuevos, decisiones tomadas, próximo paso.

REGLAS
  1. Antes de tocar código, lee la documentación existente.
  2. Después de cada cambio significativo, actualiza la documentación correspondiente.
     Significativo = archivos importantes, arquitectura, datos/entidades, rutas, componentes,
     bugs, reglas de negocio, flujo de usuario, configuración, variables de entorno, scripts,
     dependencias, permisos/roles/seguridad.
  3. Anti-documentación muerta: si algo cambió, actualízalo; si ya no aplica, márcalo obsoleto
     o elimínalo. No dejes un banner encima de un cuerpo que dice lo contrario.
  4. PROJECT_CONTEXT.md es la fuente principal de transferencia: siempre actualizado, claro y
     accionable.

REGLA DE CIERRE
Tu respuesta final debe incluir: cambios hechos, archivos modificados, documentación
actualizada, bugs pendientes y próximo paso recomendado, y terminar con este bloque:

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

---

## 2. Prompt de arranque de ESTE proyecto (pégalo al inicio de una sesión nueva)

```
Este es Jardines Club Hípico: sitio web + portal de un salón de eventos (React 18 + Vite 6,
desplegado en Vercel, datos en Supabase).

Antes de tocar código lee, en este orden: CLAUDE.md, PROJECT_CONTEXT.md, docs/SEGURIDAD.md,
docs/ARCHITECTURE.md, docs/DATABASE.md, docs/FILE_MAP.md, docs/DECISIONS.md,
docs/BUGS_PENDING.md, docs/NEXT_STEPS.md y docs/CHANGELOG.md.

CANDADO ABSOLUTO: el proyecto de Supabase (vuzyhbiwnnngeohysxcw) está COMPARTIDO con otra
aplicación distinta, Vero Seguros, que vive en el schema `public`. No modifiques, ni directa
ni indirectamente, nada de `public`, el bucket `site-media`, sus usuarios, ni la configuración
GLOBAL de Supabase Auth. Lo único compartido de verdad es `auth.users` y el trigger
`on_auth_user_created`; antes de tocarlo hay que demostrar que Vero no cambia.

Reglas clave:
- El sitio es DINÁMICO. Los datos viven en el schema `jardines`. NO hay fallback estático: si
  Supabase no responde, el sitio se renderiza vacío. src/data/site-data.json no lo importa
  nadie (solo alimenta el seed); el único JSON vivo es src/data/resenas.json.
- El acceso a datos es SOLO el shim src/api/base44Client.js. No reintroducir Base44.
- RLS activo en todas las tablas. `anon` no tiene INSERT/UPDATE/DELETE en ninguna: la
  escritura pública va por RPC. Al crear una tabla nueva hay que activar RLS a mano.
- Toda función SECURITY DEFINER nueva: `search_path = ''`, nombres calificados y EXECUTE mínimo.
- Migraciones forward-only en supabase/migrations/. La base es producción compartida: primero
  lo aditivo, luego se despliega el frontend, y SOLO entonces se retira lo viejo.
- El panel admin NO está en /Admin (es 404): vive en la ruta secreta ADMIN_SLUG.
- Nunca pongas secretos, tokens, service_role, JWT, contraseñas ni datos personales en commits,
  logs, documentación o salida de pruebas.

Antes de subir: `npm run lint` (0), `npm run build` (exit 0), `npm run test:contratos` (99/99)
y `npm run typecheck` (59 = línea base, no debe subir). Si tocaste SQL, corre además
supabase/tests/seguridad.sql.

Al terminar, actualiza la documentación viva y el CHANGELOG, y cierra con el bloque
"## Estado de documentación".
```

---

## 3. Cómo cambiar contenido del sitio

```
El contenido del sitio se edita DESDE EL PANEL ADMIN (persiste en Supabase, schema `jardines`).
No edites src/data/site-data.json: no lo lee nadie en runtime, así que no cambiaría nada.

Solo si necesitas regenerar la entrada del seed: edita scripts/raw/<archivo>.json, corre
`node scripts/build-media.mjs` y luego `npm run build`. Si agregas una imagen propia, ponla en
public/media/img/ y usa la ruta /media/img/<archivo>.
```

## 4. Activar el carrusel de reseñas

```
El carrusel de Confianza muestra las filas de `jardines.resenas` con `aprobada = true`.
Se aprueban desde el panel admin (AdminResenas). El trigger `resena_moderacion` impide que un
cliente se auto-apruebe.
```

## 5. Agregar una ruta serverless nueva en `api/`

```
Empieza importando api/_lib/guard.js y usa, en este orden:
  1. `generico(res, 405)` si el método no es el esperado
  2. `clienteAdmin()` (única fuente de service_role)
  3. `autorizarJardines(req, admin, { rol })` — exige perfil de Jardines, así un usuario de
     Vero con sesión válida recibe 403
  4. `leerBody(req, maxBytes)` — límite de tamaño y JSON válido
  5. validación estricta de cada campo (formato UUID, listas cerradas)
  6. `rateLimit(...)` — es fail-closed
  7. `idemIniciar` / `idemCerrar` — idempotencia recuperable
  8. `escHtml()` en TODO valor que entre en un correo
  9. `auditar(...)` en éxito y en denegación

Recuerda: supabase-js resuelve con { data, error } en vez de rechazar, así que un `.catch()`
no atrapa nada. Comprueba `error` a mano o usa `rpcSeguro` / `escrituraOk`.

Después agrega el contrato correspondiente a scripts/test-contratos-api.mjs — leyendo antes la §9.
```

## 9. Cómo se escribe un contrato en `scripts/test-contratos-api.mjs`

> Esto no es estilo: es el fallo que más veces se ha repetido en este proyecto. Apareció en
> cuatro bloques seguidos y las cuatro veces con la misma forma.

**El fallo.** Un contrato que busca un **identificador suelto sobre todo el archivo** no comprueba
nada si ese identificador aparece en más de un sitio. Y casi siempre aparece: la definición, una
lectura, un render, un `console.error`. Borrar el uso que importa deja vivos los demás, y el
contrato pasa igual — con su nombre afirmando una propiedad que ya no se cumple.

Los cuatro casos reales, para que se reconozca el patrón:

| Contrato | Decía cubrir | Lo que pasaba |
|---|---|---|
| `/idsActivos/` | el conteo cruza contra los eventos activos | `inertesDe` también lo menciona |
| `/imagenPlanoPath/` | se guarda el path para limpiar el bucket | sobrevivía en las dos **lecturas** |
| `/inertesDe/` | las inertes son visibles y revocables | no miraba la UI en absoluto |
| `/ocupadaPersona/` | el botón se bloquea con algo en vuelo | la función seguía definida |

**La regla.**

1. **Ata la afirmación al uso concreto**, no al identificador. Recorta primero el trozo —la
   definición, el cuerpo de la función, el objeto que se escribe— con el helper `entre()`, y afirma
   sobre ese trozo. Si el contrato habla de UI, tiene que mirar el render **y** el handler.
2. **Si lo que importa es el orden, afirma sobre el orden.** `[\s\S]{0,400}` mide distancia en
   caracteres y la distancia no dice nada sobre si un texto gobierna al otro: el mismo texto a 300
   caracteres puede estar en otra rama. Para "esta guarda corta antes de aquel borrado" está
   `cortaAntesDe()`.
3. **No lo ates al formato.** Usa `\s*` donde pueda haber saltos de línea: partir un `if` en tres
   líneas no es una regresión y no debe romper nada.
4. **Valídalo mutando.** Reintroduce **la regresión real en el archivo real**, corre la suite, y
   compruébalo por ejecución — no leyendo el regex y convenciéndote de que sí. Restaura con
   `git checkout -- <archivo>`. Al terminar, `git status --porcelain` tiene que salir vacío.
5. **Muta también algo inocuo** (un reformateo) y comprueba que **pasa**: si no, cambiaste un
   contrato vacuo por un falso positivo, que es la otra forma de no comprobar nada.
6. Si una propiedad **no se puede expresar estáticamente** sin quedar frágil, **dilo y no escribas
   el contrato**. Un contrato que no comprueba nada es peor que no tenerlo: da falsa confianza y
   nadie vuelve a mirarlo.

Guion para mutar (probado; deja el árbol como estaba):

```bash
git diff --quiet -- "$F" || { echo "el archivo ya está sucio"; exit 1; }
perl -0pi -e "$SUBST" "$F"
git diff --quiet -- "$F" && { echo "la mutación NO se aplicó"; exit 1; }   # que de verdad mutó
npm run test:contratos --silent | grep '^FALLA'                            # ¿quién la atrapa?
git checkout -- "$F"
```

## 6. Prompts de Nano Banana (imágenes en el estilo del lugar)

Los 5 prompts largos + imágenes de referencia están en `nano-banana/` (una subcarpeta por
imagen, con `prompt.md`). Método: image-to-image en gemini.google.com o AI Studio (subir las
referencias + pegar el prompt), o vía API con `scripts/gen-images.mjs` (requiere
`GEMINI_API_KEY` con billing). Guardar el resultado en `public/media/img/<nombre>.jpg`.

Ejemplo: `nano-banana/5-trampolin/prompt.md`.

## 7. Regenerar hojas de contacto de la galería (para reordenar)

```bash
npm i sharp                                # una vez
node scripts/montage.mjs <carpeta-salida>  # genera galeria-sheet-N.jpg con índices
```

## 8. Deploy manual (si el auto-deploy fallara)

```bash
vercel deploy --prod --scope mh-astral-systems
```
