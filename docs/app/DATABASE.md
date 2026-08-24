# DATABASE.md — lo que el sitio público toca de la base

> **Alcance deliberadamente estrecho.** El schema `jardines` tiene ~30 tablas; esta aplicación
> toca **siete para leer**, **una para escribir** (y solo a través de una RPC) y **cuatro RPC de
> control** desde el servidor. El modelo completo está en `docs/DATABASE.md` del juego general.
>
> Todo lo de aquí sale de leer el código de este repo y sus migraciones el **2026-08-24**.
> **No tengo conexión a la base desde este entorno**: lo que digo de las policies y los grants
> sale del SQL versionado en `supabase/migrations/`, no de una consulta a producción.

---

## 0. Dónde vive

| | |
|---|---|
| Proyecto Supabase | `vuzyhbiwnnngeohysxcw` |
| Motor | PostgreSQL 17 |
| Schemas de Jardines | `jardines` (público a PostgREST) y `jardines_private` (no expuesto) |
| Schema de **Vero Seguros** | `public` — **otra aplicación, no se toca nunca** |
| Cliente del navegador | `src/api/supabaseClient.js`, con `db: { schema: "jardines" }` |
| Rol del navegador | **`anon`**, siempre. Este sitio no autentica a nadie |
| Rol del servidor | **`service_role`**, solo dentro de `api/`, nunca en el bundle |

---

## 1. Lectura — siete tablas, todas como `anon`

Las **ocho** lecturas del sitio, repartidas en cuatro archivos. No hay más: comprobado con `grep`
de `entities.` / `functions.invoke` / `.auth.` sobre todo `src/` excluyendo `src/api/`, que
devuelve exactamente diez líneas — estas ocho, la escritura del formulario y el `invoke` del aviso.

| Tabla | Entidad del shim | Quién la pide | Cómo |
|---|---|---|---|
| `config_sitio` | `ConfigSitio` | `src/pages/Home.jsx` | `.list()` y se queda con `d[0]` |
| `salones` | `Salon` | `src/pages/Home.jsx` | `.filter({ activo: true }, "orden")` |
| `salones` | `Salon` | `src/components/FormularioModal.jsx` | `.list("orden")`, y filtra los inactivos en el cliente |
| `galeria` | `Galeria` | `src/pages/Home.jsx` | `.list()` |
| `servicios` | `ServicioItem` | `src/components/ServiciosAmenidades.jsx` | `.filter({ activo: true }, "orden")` |
| `amenidades` | `AmenidadItem` | `src/components/ServiciosAmenidades.jsx` | `.filter({ activo: true }, "orden")` |
| `resenas_config` | `ResenasConfig` | `src/components/Confianza.jsx` | `.list()` |
| `resenas` | `Resena` | `src/components/Confianza.jsx` | `.filter({ aprobada: true }, "orden")` |

**Qué lo permite.** `sec_06` crea, sobre nueve tablas de contenido —`alimentos`, `amenidades`,
`config_sitio`, `galeria`, `resenas_config`, `salon_planos`, `salones`, `servicios`,
`servicios_extra`— la policy:

```sql
create policy contenido_lectura on jardines.<tabla>
  as permissive for select to anon, authenticated using (true);
```

y la escritura queda en `contenido_admin`, `for all to authenticated using (jardines.is_admin())`.
Es decir: **`anon` puede leer ese contenido y no puede escribir nada**. `sec_06` empieza
justamente revocando `insert, update, delete on all tables in schema jardines from anon`.

`resenas` es distinta y más estricta:

```sql
create policy resenas_lectura_anon on jardines.resenas
  as permissive for select to anon using (aprobada = true);
```

Una reseña sin aprobar **no existe** para el sitio. El `.filter({ aprobada: true })` del
componente no es lo que protege nada: es cortesía. Lo que protege es la policy.

**Tres tablas legibles que este sitio NO lee:** `alimentos`, `servicios_extra` y `salon_planos`.
`anon` tiene SELECT sobre ellas por `contenido_lectura`, el shim las mapea (`AlimentoMenu`,
`ServicioExtra`, `SalonPlano`), pero ningún componente de este repo las pide. Es superficie sin
uso, no un fallo.

**Ordenación.** El shim ordena por la columna `orden` cuando la tabla la tiene y no se pasa
`sort`. Las tablas con `orden` que le importan a esta app: `salones`, `galeria`, `servicios`,
`amenidades`, `servicios_extra`, `alimentos`, `resenas`.

---

## 2. Escritura — una sola, y no es un INSERT

El formulario de cotización es el **único** camino de escritura del sitio público.

```
FormularioModal.jsx
    base44.entities.SolicitudEvento.create(datos)
        |
        v  el shim NO hace insert para la tabla `solicitudes`
    supabase.rpc("solicitud_crear", { p_nombre_completo, p_telefono, p_email,
                                      p_salon, p_tipo_evento, p_fecha_tentativa,
                                      p_numero_personas, p_comentarios, p_acepto })
```

| | |
|---|---|
| Función | `jardines.solicitud_crear(text, text, text, text, text, date, integer, text, boolean)` |
| Definida en | `sec_05`, redefinida en `sec_13` |
| Tipo | `security definer`, `set search_path = ''` |
| Permiso | `revoke all ... from public` + `grant execute ... to anon, authenticated` |
| Devuelve | `jsonb` con `{ id, folio }` |

**`anon` NO tiene INSERT sobre `jardines.solicitudes`.** Lo tuvo entre `sec_13` y `sec_21` como
compatibilidad —porque `sec_05` revocó el INSERT antes de que el frontend nuevo estuviera
desplegado, y **eso rompió el formulario público en producción**— y `sec_21` lo retiró cuando el
frontend correcto ya estaba arriba:

```sql
revoke insert, update, delete, select on jardines.solicitudes from anon;
```

Nótese el `select`: **`anon` tampoco puede leer las solicitudes.** El formulario escribe a ciegas
y solo recibe de vuelta el `{ id, folio }` que la RPC le devuelve.

### El trigger es quien manda

`sec_13` metió toda la garantía en un `BEFORE INSERT` sobre la tabla, `trg_solicitud_saneo`, para
que **los dos caminos** (RPC e INSERT directo, mientras existió) tuvieran exactamente las mismas
reglas. Hoy solo queda el camino de la RPC, pero el trigger sigue siendo el que:

1. **Aplica el rate limit**: 5 por hora por IP, 200 por hora si no hay IP. Si se pasa, audita
   `solicitud_crear / denegado / rate_limit` y lanza con `errcode = '42501'`. La IP la resuelve
   `jardines_private.ip_solicitante()`, no el cliente.
2. **Recorta y valida**: nombre (2-120), teléfono contra `^[0-9+()\-\s]{7,30}$`, correo con forma
   de correo, aviso de privacidad obligatorio, personas 0-5000, fecha tentativa entre ayer y
   cinco años.
3. **Fija los campos internos**, y esto es lo importante: `estatus = 'Nueva'`,
   `folio = 'JCH-' || upper(right(id::text, 6))`, `fecha_envio` y `hora_envio` en horario de
   Ciudad de México, y **anula `direccion` y `rfc`**. El navegador no puede fijar ninguno.
4. Un admin (`jardines.is_admin()`) sale por la puerta de arriba sin pasar por nada de esto.

Por eso el front comprueba `if (!creada?.folio) throw new Error("SIN_CONFIRMACION")`: **el folio
es la prueba de que Postgres confirmó**. Antes se intentaba un UPDATE posterior para ponerlo, RLS
lo rechazaba en silencio, y el folio del correo no coincidía con el de la base.

---

## 3. Lo que hace el servidor — `service_role`

Solo `api/solicitud.js`, y solo después de que la fila ya existe.

| Objeto | Operación | Para qué |
|---|---|---|
| `jardines.solicitudes` | **SELECT** de 13 columnas por `id` | Releer la fila y componer el correo con los datos canónicos. El navegador solo manda el `id` |
| `jardines.api_rate_limit(text,text,int,int)` | RPC | Rate limit por IP, 10/hora, sobre el bucket `solicitud-correo`. **Fail-closed**: si no se puede evaluar, no pasa |
| `jardines.api_idem_iniciar(text,text,int,int)` | RPC | Idempotencia recuperable. Devuelve `procede` / `duplicado` / `en_curso` / `error` |
| `jardines.api_idem_cerrar(text,text,boolean)` | RPC | Cierra la clave. Solo se consume si el correo salió bien, así que un fallo real se puede reintentar |
| `jardines.api_auditar(...)` | RPC | Bitácora del resultado (`ok`, `denegado`, `error`) |

Las cuatro `api_*` están en `sec_15` y `sec_19` con
`revoke all ... from public, anon, authenticated` + `grant execute ... to service_role`. **El
navegador no puede invocarlas.** Escriben en `jardines_private.rate_limit`,
`jardines_private.idempotencia` y `jardines_private.auditoria`, tablas del schema privado que
PostgREST no expone.

---

## 4. Storage

**Este sitio no sube nada.** El shim expone `integrations.Core.UploadFile` (que apunta al bucket
`sitio`) y `storage.*`, pero ningún componente de este repo los llama — comprobado con `grep`.

Lo que sí ocurre es de lectura: el contenido que el CRM guarda en el bucket `sitio` se sirve por
URL pública desde `vuzyhbiwnnngeohysxcw.supabase.co`, y por eso la CSP de `vercel.json` admite ese
origen en `img-src` y `media-src`. Todo lo demás está auto-hospedado en `public/media/`.

Los buckets `clientes`, `operativo` y `planos` no los toca esta aplicación. El bucket `site-media`
es de **Vero Seguros** y no se toca nunca.

---

## 5. Las 19 entidades que el shim declara y este sitio no usa

`base44Client.js` mapea **27** nombres de entidad (contados en su tabla `TABLES`). Esta app usa
ocho: las siete de lectura más `SolicitudEvento`. Las otras **19** son `OperativoPersonal`, `Evento`, `Documento`,
`ItemContratado`, `Perfil`, `SalonPlano`, `EventoReglasMesas`, `Mesa`, `Invitado`, `Invitacion`,
`Acceso`, `Cronograma`, `Musica`, `EventoWishlist`, `EventoNota`, `Notificacion`, `Rsvp`,
`AlimentoMenu` y `ServicioExtra`.

**Por qué siguen aquí:** el shim es código común byte a byte con el portal y el CRM, y partirlo
sería tener tres verdades sobre la misma base. El riesgo número uno del plan de cierre era
justamente bifurcarlo.

**Qué riesgo real supone:** poco, y conviene decirlo con precisión. Que el código exista en el
bundle no da ningún permiso — `anon` no puede leer ni escribir ninguna de esas tablas, porque sus
policies exigen `authenticated` más `is_admin()` o `is_my_event()`. Un visitante que abra la
consola y llame `base44.entities.Evento.delete(id)` recibe un error de RLS. Lo que sí queda es
superficie: nombres de tabla y forma del modelo visibles para cualquiera. Eso ya era público de
todos modos, porque la `anon key` y el schema lo son.

---

## 6. Qué NO puede hacer este sitio contra la base

Dicho como lista, porque es más útil que la matriz completa:

- No puede **escribir** en ninguna tabla de contenido (`sec_06` revoca INSERT/UPDATE/DELETE a
  `anon` sobre todo el schema).
- No puede **leer** solicitudes, eventos, perfiles, documentos, invitados, mesas ni nada del
  modelo del evento.
- No puede **invocar** las funciones de control (`api_*`): son de `service_role`.
- No puede **autenticar** a nadie: no hay código de login en este repo.
- No puede tocar **nada del schema `public`** — ese es Vero Seguros. Ver `docs/app/SEGURIDAD.md` §1.

Lo único que puede hacer, y lo hace, es: leer siete tablas de contenido y llamar a
`solicitud_crear`.

---

## 7. Migraciones que importan a esta app

De las 28 del repo, estas son las que gobiernan lo de arriba:

| Migración | Qué hizo, en una línea |
|---|---|
| `sec_01` | Creó `jardines_private` con `auditoria`, `rate_limit` y `secretos` |
| `sec_05` | Movió el alta de solicitudes a la RPC `solicitud_crear` y revocó el INSERT de `anon` — **y rompió el formulario en producción, porque el frontend nuevo aún no estaba desplegado** |
| `sec_06` | La matriz de RLS: revoca escritura a `anon` en todo el schema y crea `contenido_lectura` / `contenido_admin`, más las policies de `resenas` |
| `sec_13` | Restableció el INSERT público **ya saneado** y metió toda la garantía en el trigger `trg_solicitud_saneo`, compartido por los dos caminos |
| `sec_15` | `api_rate_limit` y `api_auditar`, solo para `service_role` |
| `sec_19` | Idempotencia recuperable: `api_idem_iniciar` / `api_idem_cerrar` |
| `sec_21` | Retiró el INSERT y el SELECT públicos de `solicitudes`, ya con el frontend correcto arriba |

El par `sec_05` → `sec_13` es la razón de la regla de despliegue: **lo aditivo primero, el
frontend después, y solo entonces lo restrictivo.** Está en `docs/app/CLAUDE.md` §6 y en
`docs/SEGURIDAD.md` §8.bis.

---

## 8. Datos vivos (dato del ecosistema, no medido aquí)

Al **2026-08-24**, y según el recuento del plan de cierre —no lo he consultado yo—: 2 eventos,
13 solicitudes, 8 perfiles (3 admin, 2 cliente, 3 operativo), 9 usuarios en `auth.users`,
1 fila en `public.admin_users` (el **único** administrador de Vero), 0 invitaciones, 0 mesas y
0 documentos.

De todo eso, lo único que esta aplicación produce son **solicitudes**.
