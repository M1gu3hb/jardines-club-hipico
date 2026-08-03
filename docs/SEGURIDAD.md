# SEGURIDAD.md — Modelo de seguridad de Jardines Club Hípico

> Última revisión: **2026-08-03**. 21 migraciones (`jardines_sec_01..22`, sin `sec_10`) aplicadas
> en producción. Proyecto Supabase `vuzyhbiwnnngeohysxcw` (PostgreSQL 17, `us-east-1`),
> **compartido con Vero Seguros**.
>
> **Estado formal: `ESPERANDO_VALIDACION_HUMANA_AUTENTICADA`, no CERRADO.** Las pruebas
> automáticas pasan y el código está desplegado, pero cinco flujos solo se comprueban con
> credenciales reales frente a la pantalla: alta de cliente, enlace de primer acceso, subir y
> abrir documentos, aviso de cotización, y generar/abrir el link de meseros. Ver
> `docs/NEXT_STEPS.md` §1.

## 1. Regla de convivencia con Vero Seguros

El proyecto de Supabase aloja dos aplicaciones distintas:

| | Jardines Club Hípico | Vero Seguros |
|---|---|---|
| Schema | `jardines` (+ `jardines_private`) | `public` |
| Autorización de admin | `jardines.perfiles.rol = 'admin'` | `public.admin_users` |
| Buckets | `clientes`, `operativo`, `planos`, `sitio` | `site-media` |

**No tocar nada de Vero.** Lo único compartido de verdad es `auth.users` y el trigger
`on_auth_user_created`. Antes de modificar cualquier cosa compartida hay que demostrar que Vero no
cambia (ver §2).

## 2. Aislamiento en Auth (lo más delicado)

`auth.users` tiene un solo trigger: `on_auth_user_created → jardines.handle_new_user()`. Se dispara
para **todos** los usuarios, también los de Vero.

**Prueba de aislamiento:** Vero autoriza con `public.is_admin()`, que lee exclusivamente
`public.admin_users` y no consulta `jardines.perfiles` en ningún punto. Por eso dejar de crear
perfiles de Jardines para usuarios de Vero no altera ninguna decisión de autorización suya.

Reglas del trigger:

1. Solo crea perfil si el usuario es de Jardines, y eso se decide **únicamente** con señales
   controladas por el servidor:
   - una invitación vigente en `jardines_private.aprovisionamiento`, o
   - `raw_app_meta_data->>'app' = 'jardines'`, que solo escribe la Admin API con `service_role`.

   El dominio del correo **ya no cuenta** (`sec_18`): era un dato que elige quien se registra.
2. **Nunca** lee `raw_user_meta_data` para decidir el rol. Como máximo asigna `cliente`.
3. Nunca lanza excepción: un fallo aquí jamás debe impedir el alta de un usuario de Vero.

### Cómo se conceden roles

| Rol | Vía | Quién puede |
|---|---|---|
| `cliente` | trigger (por defecto) o `jardines.asignar_rol` | `service_role` |
| `operativo` | `jardines.asignar_rol` | `service_role` |
| `admin` | `jardines.aprovisionar_usuario` + `jardines.asignar_rol` | `service_role` |

`asignar_rol` y `aprovisionar_usuario` tienen `EXECUTE` **solo** para `service_role`: se invocan desde
`api/crear-admin.js` y `api/crear-usuario-evento.js`, que primero verifican que quien llama es admin.
Desde el navegador no son alcanzables.

> Nada en el front debe volver a mandar `rol` dentro de `user_metadata`. No sirve y confunde.

## 3. Matriz de acceso

| Actor | Alcance |
|---|---|
| `anon` | `SELECT` sobre el contenido público del sitio + las RPC públicas. **Sin** INSERT/UPDATE/DELETE en ninguna tabla. |
| cliente | Su evento y todo lo que cuelga de él. Nada de otros clientes ni del negocio. |
| operativo | Su persona, sus canales y los eventos que tiene permitidos. |
| administrador | Todo lo de Jardines. |
| `service_role` | Operaciones administrativas. **Solo servidor.** |

Todas las políticas nombran roles explícitos: **ninguna** apunta a `PUBLIC`. Hay una policy por
comando y tabla (sin solapamientos permisivos).

## 4. Funciones

- Los helpers (`is_admin`, `es_admin`, `is_my_event`, `client_can_edit`, `mi_personal_id`,
  `mis_canales*`, `eventos_operativos_permitidos`) tienen `EXECUTE` **solo** para `authenticated`, y
  únicamente porque las políticas RLS se evalúan con los privilegios de quien consulta.
- Las funciones de trigger (`handle_new_user`, `solicitud_saneo`, `resena_moderacion`,
  `auditar_cambio_operativo`) **no** son invocables por la API. `sync_staff_token_hash` dejó de
  existir con `sec_20`: ya no hay columna en claro que sincronizar.
- Todas las `SECURITY DEFINER` usan `search_path = ''` y nombres completamente calificados.
- `jardines_private` no está expuesto en la Data API y `anon`/`authenticated` no tienen `USAGE`.

## 5. Tokens de staff

`eventos.staff_token_hash` (HMAC-SHA256 con pepper privado) es la vía de validación. Además:
expiración (`staff_token_expira`, por defecto fecha del evento + 2 días), revocación
(`staff_token_revocado_at`), rotación (`jardines.rotar_staff_token`, 256 bits) y auditoría.

Toda validación pasa por `jardines_private.evento_por_staff()`, que responde **siempre** el mismo
error genérico (`no disponible`): no distingue inexistente, expirado, revocado ni bloqueado. Eso es lo
que impide enumerar eventos, mesas e invitaciones.

> **Retirado el 2026-08-02 (`sec_20`).** La columna `eventos.staff_token` **ya no existe**: el token
> solo vive como hash. La rotación lo devuelve **una sola vez** y el panel no puede reconsultarlo —
> tras recargar ofrece "Generar nuevo enlace". Inexistente, revocado y expirado dan exactamente la
> misma respuesta.

## 6. Rate limits (server-side, persistentes)

`jardines_private.rate_limit`. Las claves se guardan **hasheadas con pepper**: no hay token, correo ni
IP en texto legible. El conteo usa `INSERT ... ON CONFLICT DO UPDATE ... RETURNING`, que es atómico y
no pierde incrementos con concurrencia. Limpieza oportunista de ventanas vencidas.

| Acción | Límite | Ventana | Clave |
|---|---|---|---|
| `solicitud_crear` | 5 (200 sin IP) | 1 h | IP |
| `rsvp_crear` | 30 por invitación · 10 por IP | 1 h | token / IP |
| `info_invitacion_publica` | 60 (1000 sin IP) | 10 min | IP |
| token de staff válido | 300 | 1 min | hash del token |
| **fallos** de token | 10 (200 sin IP) | 10 min | IP |
| `operativo_ubicar` | 120 | 1 min | persona |
| `registrar_acceso` (admin) | 600 | 1 min | uid |

La IP sale de `request.headers → x-forwarded-for` (la inyecta el gateway), **nunca** del body. Sin IP
se cae a un cubo global con umbral alto, para acotar enumeración masiva sin permitir que un atacante
deje fuera a todo el mundo.

## 7. Storage

| Bucket | Público | Límite | MIME | Reglas |
|---|---|---|---|---|
| `clientes` | no | 20 MB | PDF + imágenes | Admin escribe; el cliente solo lee `<evento_id>/…` |
| `operativo` | no | 5 MB | audio | Escritura solo en `tx/<canal_id>/…` y solo en canales donde puede hablar |
| `planos` | sí | 10 MB | imágenes (sin SVG) | Sin listado; descarga por URL pública |
| `sitio` | sí | 50 MB | imágenes + video | Sin listado; descarga por URL pública |
| `site-media` | — | — | — | **De Vero. No tocar.** |

Cerrar el listado no afecta la carga de imágenes: en un bucket público la descarga por
`/object/public/...` no necesita policy de `SELECT`.

**La carpeta de documentos debe ser el `id` del evento a secas** (sin prefijo `evento-`), porque la
policy compara `foldername(name)[1]` contra `eventos.id`.

## 8. Auditoría

`jardines_private.auditoria` (aislada; **no** se usa ni se toca `public.content_audit`, que es de
Vero). Registra: alta de usuario, cambio de rol, aprovisionamiento, uso/rotación/revocación de tokens
de staff, accesos, llegadas de mesa, solicitudes, RSVP, confirmación de evento y cambios de personal,
canales y asignaciones.

Nunca guarda tokens completos, PIN, contraseñas ni `service_role`. Cuando hay que identificar a un
actor sin sesión se guarda un HMAC irreversible. Lectura: `jardines.auditoria_reciente()`, solo admin.

## 8.bis Orden de despliegue (importante)

La base es **producción compartida**: una migración aplicada afecta al sitio que ya está en línea,
aunque el frontend nuevo siga en la rama. En `sec_05` se revocó el INSERT de `anon` sobre
`solicitudes` antes de desplegar el front que usa la RPC, y eso **dejó el formulario público roto**
hasta que `sec_13` lo restableció (ya saneado).

Regla para la próxima vez: **primero lo aditivo, se despliega el frontend, y solo entonces se retira
lo viejo.**

Ese retiro ya se completó: con el frontend nuevo desplegado y verificado, `sec_21` revocó el
INSERT de `anon` y `authenticated` sobre `solicitudes`. Hoy la única vía de escritura pública es
la RPC `solicitud_crear`.

## 9. Pendientes compartidos (requieren decisión, afectan a Vero)

No se cambiaron por estar fuera del alcance autorizado:

1. **Protección de contraseñas filtradas (HaveIBeenPwned)** — desactivada. Es configuración global de
   Auth: afecta también a Vero.
2. **`public.is_admin()` y `public.rls_auto_enable()`** ejecutables por `anon` — son funciones de
   Vero. `is_admin()` solo devuelve un booleano del propio llamador y `rls_auto_enable()` es un event
   trigger que falla fuera de contexto DDL, pero el `EXECUTE` debería revocarse del lado de Vero.
3. **`public.content_audit(actor)`** sin índice de FK — tabla de Vero.

## 10. Al agregar una tabla nueva en `jardines`

`public.rls_auto_enable` **solo** cubre el schema `public`. En `jardines` hay que hacerlo a mano:

```sql
alter table jardines.nueva enable row level security;
revoke insert, update, delete on jardines.nueva from anon;
-- + una policy por comando, con rol explícito (nunca PUBLIC)
```
