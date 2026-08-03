# DATABASE.md — Modelo de datos

> Estado real a **2026-08-03**. Verificado contra el proyecto en producción.

## Resumen

**Hay base de datos en vivo.** PostgreSQL 17 en Supabase, proyecto `vuzyhbiwnnngeohysxcw`
(`us-east-1`), **compartido con otra aplicación distinta (Vero Seguros)** que vive en el schema
`public`. Ver el candado en `CLAUDE.md` y `docs/SEGURIDAD.md` §1.

| Schema | Qué contiene | Expuesto en la Data API |
|---|---|---|
| `jardines` | 32 tablas: contenido del sitio + operación de eventos | Sí |
| `jardines_private` | 6 tablas internas: secretos, auditoría, rate limit, idempotencia, aprovisionamiento, accesos de un solo uso | **No** (`anon`/`authenticated` sin `USAGE`) |
| `public` | **Vero Seguros. No tocar.** | Sí (de ellos) |

**RLS activo en todas las tablas de `jardines`.** `anon` solo tiene `SELECT` sobre el contenido
público del sitio; **no** tiene INSERT/UPDATE/DELETE en ninguna tabla. La escritura pública
ocurre exclusivamente por RPC (`solicitud_crear`, `rsvp_crear`).

Los componentes no nombran tablas: usan el mapa `TABLES` de `src/api/base44Client.js`, que
traduce nombre de entidad → tabla y camelCase ↔ snake_case.

`src/data/site-data.json` y `src/data/resenas.json` **ya no son la fuente de verdad**: son
fallback estático. El seed inicial se hizo con `scripts/seed-supabase.mjs` (histórico).

---

## A. Contenido del sitio (público, lectura para `anon`)

### ConfigSitio → `config_sitio` (1 fila)
- **Propósito:** configuración global del sitio público.
- **Campos:** `logo_url`, `telefono_contacto`, `whatsapp_numero`, `correo_admin`,
  `ubicacion_texto`, `ubicacion_link_mapa`, `informacion_servicios`, `texto_no_incluye`,
  `proximamente_activo`, `proximamente_imagen_url`, `proximamente_titulo`,
  `proximamente_descripcion`, `proximamente_texto_boton`, `proximamente_fecha`,
  `color_primario`, `color_secundario`.
- **Se usa en:** `Home.jsx` (props a Hero, Contacto, NoIncluye, WhatsApp), `AdminConfig`.
- **Reglas:** `whatsapp_numero` solo dígitos, sin `+` ni espacios (ej. `525548663656`).
  Si `proximamente_activo = false`, el cartel del hero no se muestra.

### Salon → `salones` (8 filas)
- **Propósito:** los espacios que se rentan.
- **Campos:** `nombre`, `descripcion`, `descripcion_larga`, `capacidad` (texto),
  `capacidad_min`, `capacidad_max`, `imagen_principal`, `imagenes[]`, `caracteristicas[]`,
  `activo`, `orden`.
- **Relaciones:** ← `eventos.salon_id`, ← `salon_planos.salon_id`.
- **Reglas:** `orden` controla la aparición; `activo = false` lo oculta del sitio.

### Galeria → `galeria` (69 filas)
- **Campos:** `imagen_url` (imagen o video), `titulo`, `orden`.
- **Reglas:** el orden mostrado es el de `orden`; los videos se detectan por extensión.

### ServicioItem → `servicios` · AmenidadItem → `amenidades`
- **Campos:** `titulo`, `descripcion`, `imagen_url`, `imagenes_url[]`, `activo`, `orden`,
  `portal_sugerible`.
- **Reglas:** `descripcion` se muestra al **expandir** la tarjeta, no en la miniatura (D9).
  `portal_sugerible = true` lo ofrece el portal del cliente en "ármalo".

### ServicioExtra → `servicios_extra` · AlimentoMenu → `alimentos`
- `servicios_extra`: `nombre`, `categoria`, `descripcion`, `aplica_a`, `activo`, `orden`.
- `alimentos`: `nombre`, `descripcion`, `pdf_url` (Google Drive), `activo`, `orden`.

### Resena → `resenas` · ResenasConfig → `resenas_config`
- `resenas`: `autor`, `texto`, `estrellas`, `evento`, `aprobada`, `orden`, `evento_id`,
  `enviada_google`.
- `resenas_config`: `rating`, `google_url`, `stats` (jsonb).
- **Reglas:** el carrusel de Confianza solo muestra reseñas con `aprobada = true`. El trigger
  `resena_moderacion` impide que un cliente se auto-apruebe.

---

## B. Operación del evento (privado, RLS por dueño)

### Evento → `eventos` (tabla central, 30 columnas)
- **Propósito:** un evento vendido. Todo lo demás cuelga de aquí.
- **Campos de negocio:** `nombre_evento`, `tipo_evento`, `fecha_evento`, `salon_id`, `estatus`,
  `monto_total`, `anticipo_monto`, `anticipo_pagado`, `notas`, `creado_por`.
- **Cliente:** `usuario`, `auth_user_id`, `cliente_nombre`, `cliente_email`,
  `cliente_telefono`, `portal_activo`, `confirmado_cliente`.
- **Invitación:** `invitacion_token`, `invitacion_activa`, `invitacion_mensaje`,
  `invitacion_dress_code`.
- **Operativo / staff:** `operativo_activo`, `operativo_desde`, `staff_token_hash`,
  `staff_token_expira`, `staff_token_revocado_at`, `staff_token_rotado_at`.
- **Otros:** `resena_recordada` (marca del cron).
- **Relaciones:** `salon_id → salones` (SET NULL), `auth_user_id → auth.users` (SET NULL).
  Hijos con `ON DELETE CASCADE`: `documentos`, `mesas`, `invitaciones`, `cronograma`, `musica`,
  `items_contratados`, `evento_notas`, `evento_wishlist`, `evento_reglas_mesas`, `rsvps`.
- **Reglas críticas:**
  - **No existe columna `staff_token` en claro** (retirada en `sec_20`). El token solo vive
    como HMAC en `staff_token_hash` y la rotación lo devuelve **una sola vez**.
  - Un cliente solo ve su evento (`is_my_event`); editar depende además de `client_can_edit`.

### Documento → `documentos`
- **Campos:** `evento_id`, `tipo`, `titulo`, `archivo_url`, `subido_por`.
- **Regla crítica:** el archivo va al bucket `clientes` en la carpeta **`<evento_id>/`**, sin
  prefijo `evento-`. La policy de Storage compara `foldername(name)[1]` contra `eventos.id`; con
  otro prefijo el cliente nunca puede abrir su documento.

### ItemContratado → `items_contratados`
- `evento_id`, `descripcion`, `cantidad`, `precio`, `notas`, `orden`.

### Mesa → `mesas` · Invitado → `invitados`
- `mesas`: `evento_id`, `nombre`, `forma`, `pos_x`, `pos_y`, `rotacion`, `capacidad`,
  `ocupadas`, `orden`, `token`.
- `invitados`: `mesa_id`, `nombre`, `notas`.
- **Reglas:** el `token` de mesa es una **credencial portadora** (quien tiene el QR entra).
  Se consulta con `info_mesa_token`/`info_mesa_publica`, siempre con rate limit y error genérico.

### EventoReglasMesas → `evento_reglas_mesas`
- `evento_id`, `formas_permitidas`, `opciones_personas`, `capacidad_libre`,
  `cliente_puede_editar`. Es lo que consulta `client_can_edit`.

### Invitacion → `invitaciones` · Acceso → `accesos` · Rsvp → `rsvps`
- `invitaciones`: `evento_id`, `mesa_id`, `token`, `nombre_invitado`, `max_personas`,
  `personas_registradas`, `estatus`.
- `accesos`: `invitacion_id`, `mesa_id`, `personas`, `registrado_por`, `registrado_at`.
- `rsvps`: `evento_id`, `nombre`, `personas`, `mensaje`. Se crean con la RPC `rsvp_crear`
  (rate limit por invitación y por IP); `anon` no inserta directo.

### Cronograma → `cronograma` · Musica → `musica`
- `cronograma`: `evento_id`, `hora`, `titulo`, `descripcion`, `orden`.
- `musica`: `evento_id`, `tipo`, `cancion`, `artista`, `enlace`, `notas`.

### EventoWishlist → `evento_wishlist` · EventoNota → `evento_notas` · Notificacion → `notificaciones`
- `evento_wishlist`: `evento_id`, `titulo`, `origen` (sugerencias del portal).
- `evento_notas`: `evento_id`, `texto` (notas internas del admin).
- `notificaciones`: `evento_id`, `tipo`, `titulo`, `detalle`, `leida`.

### Perfil → `perfiles`
- **Campos:** `user_id → auth.users` (CASCADE), `rol` (`cliente` | `operativo` | `admin`),
  `nombre`, `telefono`, `email`, `correo`.
- **Regla crítica:** el rol **nunca** sale de `raw_user_meta_data` (lo escribe el cliente).
  Solo lo concede `asignar_rol` / `aprovisionar_usuario`, con `EXECUTE` únicamente para
  `service_role`. El trigger `handle_new_user` como máximo asigna `cliente`, y solo si hay
  señal server-side de que el usuario es de Jardines (para no crear perfiles a usuarios de Vero).

### SalonPlano → `salon_planos`
- `salon_id` (CASCADE), `imagen_plano_url`, `ancho`, `alto`, `notas`. Lienzo del editor de mesas.

### SolicitudEvento → `solicitudes`
- **Propósito:** leads del formulario público. **Sí se guardan** (antes solo se mandaban por correo).
- **Campos:** `folio`, `fecha_envio`, `hora_envio`, `nombre_completo`, `telefono`, `email`,
  `salon_seleccionado`, `tipo_evento`, `fecha_tentativa`, `numero_personas`, `comentarios`,
  `acepto_aviso_privacidad`, `estatus` (+ columnas históricas del formulario largo:
  `direccion`, `rfc`, `horario_inicio`, `horario_fin`, `manteleria_preferida`,
  `actividades_extras`).
- **Regla crítica:** se insertan **solo** por la RPC `solicitud_crear`. `anon` y
  `authenticated` no tienen INSERT (`sec_21`). El **folio lo genera el servidor**; el front
  nunca lo inventa ni lo actualiza.

### Módulo operativo → `operativo_*`
- `operativo_personal`: `usuario`, `nombre`, `rol`, `telefono`, `auth_user_id`, `activo`,
  `acceso_global`.
- `operativo_canales`: `nombre`, `color`, `es_general`. **Global, no por evento** (riesgo
  residual documentado).
- `operativo_personal_canal`: `personal_id`, `canal_id`, `puede_hablar`, `puede_escuchar`.
- `operativo_transmisiones`: `canal_id`, `personal_id`, `audio_path`, `duracion_ms`.
- `operativo_ubicaciones`: `personal_id`, `evento_id`, `lat`, `lng`, `precision_m`.
- `operativo_asignacion`: `personal_id`, `evento_id`, `revocada_at`. **Sin UI todavía**; hoy
  los 3 operativos tienen `acceso_global = true` porque el salón opera un evento a la vez.
- **Regla:** el evento del operativo **se deriva o se valida**; nunca se confía en el `p_evento`
  que manda el cliente (`operativo_ubicar`). Comportamiento **fail-closed** desde `sec_14`.

---

## C. Schema `jardines_private` (no alcanzable desde el navegador)

| Tabla | Propósito |
|---|---|
| `secretos` | El *pepper* del HMAC. Nunca sale de la base. |
| `auditoria` | Registro de operaciones sensibles. Actores sin sesión se guardan como HMAC irreversible. |
| `rate_limit` | Conteo persistente y atómico por cubo + clave **hasheada**. |
| `idempotencia` | Estados `procesando` / `completado` / `fallido` con lease, para que un fallo se pueda reintentar. |
| `aprovisionamiento` | Invitaciones server-side que autorizan al trigger a crear perfil de Jardines. |
| `acceso_unico` | Enlaces de primer acceso de un solo uso, con canje en dos fases. |

---

## D. Funciones y RPCs

**Helpers de RLS** (`EXECUTE` solo para `authenticated`, porque las policies se evalúan con los
privilegios de quien consulta): `is_admin`, `es_admin`, `is_my_event`, `client_can_edit`,
`mi_personal_id`, `mis_canales`, `mis_canales_hablar`, `mis_canales_escuchar`,
`eventos_operativos_permitidos`.

**RPCs públicas** (`anon`, todas con rate limit y error genérico): `solicitud_crear`,
`rsvp_crear`, `info_invitacion_publica`, `info_mesa_publica`, `info_invitacion`.

**RPCs de staff / operativo** (exigen token válido o sesión): `info_invitacion_staff`,
`info_mesa_token`, `registrar_acceso`, `registrar_acceso_staff`, `registrar_llegada_mesa`,
`progreso_mesas_staff`, `operativo_evento_activo`, `operativo_ubicar`.

**RPCs de admin:** `rotar_staff_token`, `revocar_staff_token`, `confirmar_evento`,
`auditoria_reciente`, `revocar_acceso_unico`.

**Solo `service_role`** (invocadas desde `api/`, nunca desde el navegador): `asignar_rol`,
`aprovisionar_usuario`, `revocar_aprovisionamiento`, `crear_acceso_unico`,
`canjear_acceso_iniciar`, `canjear_acceso_confirmar`, `canjear_acceso_liberar`,
`api_rate_limit`, `api_idem_iniciar`, `api_idem_cerrar`, `api_auditar`.

**Triggers:** `handle_new_user` (en `auth.users`, **compartido con Vero**),
`solicitud_saneo`, `resena_moderacion`, `auditar_cambio_operativo`.

> Toda función `SECURITY DEFINER` usa `search_path = ''` y nombres completamente calificados
> (`sec_17`). Ninguna tiene `EXECUTE` para `PUBLIC` (`sec_11`).

---

## E. Storage

| Bucket | Público | Límite | MIME | Reglas |
|---|---|---|---|---|
| `clientes` | no | 20 MB | PDF + imágenes | Admin escribe; el cliente solo lee `<evento_id>/…` |
| `operativo` | no | 5 MB | audio | Escritura solo en `tx/<canal_id>/…` y solo donde puede hablar |
| `planos` | sí | 10 MB | imágenes (sin SVG) | Sin listado |
| `sitio` | sí | 50 MB | imágenes + video | Sin listado |
| `site-media` | — | — | — | **De Vero. No tocar.** |

---

## F. Migraciones

Forward-only, en `supabase/migrations/`, nombradas
`<timestamp>_jardines_sec_NN_<tema>.sql`. **21 aplicadas en producción** (`sec_01`…`sec_22`;
no existe `sec_10`: se planeó como archivo `.noapply` y su contenido acabó en `sec_20`).

| # | Tema |
|---|---|
| 01 | Schema privado, pepper, auditoría, rate limit |
| 02 | `handle_new_user` sin escalamiento + aprovisionamiento |
| 03 | Operativo aislado por evento |
| 04 | Tokens de staff: hash, expiración, rotación, revocación |
| 05 | RPC `solicitud_crear` + rate limits públicos |
| 06 | Matriz RLS y grants |
| 07 | 12 índices de FK, límites de Storage, constraints |
| 08 | Auditoría de operaciones sensibles |
| 09 | Consolidación de policies permisivas |
| 11 | Revoca `EXECUTE` residual a `PUBLIC` |
| 12 | Corrige el trigger de auditoría del operativo |
| 13 | Restablece (saneado) el INSERT público de solicitudes |
| 14 | Operativo fail-closed + `acceso_global` |
| 15 | Rate limit e idempotencia para las rutas `api/` |
| 16 | `acceso_unico` (enlace de primer acceso) |
| 17 | `search_path = ''` y grants privados |
| 18 | `acceso_global` a los operativos existentes; fuera la confianza por dominio |
| 19 | Idempotencia recuperable + canje en dos fases |
| 20 | **Retiro de `eventos.staff_token` en claro** |
| 21 | Retiro del INSERT público de compatibilidad |
| 22 | Limpieza del único perfil cruzado con Vero |

**Regla de despliegue:** la base es producción compartida. Primero lo **aditivo**, luego se
despliega el frontend, y **solo entonces** se retira lo viejo. Ver `docs/SEGURIDAD.md` §8.bis.

**Al crear una tabla nueva** hay que activar RLS a mano (`public.rls_auto_enable` es de Vero y
solo cubre `public`):

```sql
alter table jardines.nueva enable row level security;
revoke insert, update, delete on jardines.nueva from anon;
-- + una policy por comando, con rol explícito (nunca PUBLIC)
```

---

## G. Reglas de negocio de datos

- El contenido del sitio se edita **desde el panel admin** (persiste en Supabase), no tocando JSON.
- Toda URL de medio propio apunta a `/media/...` (local) o a un bucket de Storage.
- El folio de una solicitud lo asigna el servidor dentro de `solicitud_crear`.
- La validación del formulario está en el servidor (formato y longitudes); el front valida
  además para dar buenos mensajes, pero no es la autoridad.
- Ninguna escritura pública ocurre por `INSERT` directo: siempre por RPC.
- La auditoría nunca guarda tokens completos, PIN, contraseñas ni `service_role`.

## H. Pruebas

`supabase/tests/seguridad.sql` — 63 aserciones dentro de `BEGIN/ROLLBACK` (no deja rastro).
Los datos sintéticos van con prefijo `sint-`.
