# BUGS_PENDING.md

> Estado a **2026-08-03**. Formato: bug · impacto · causa · archivos · prioridad · estado.

## Estado general

**No hay bugs críticos abiertos.** Lo que queda son riesgos residuales conocidos (documentados y
aceptados), pendientes que dependen de otra persona, y dos cosas menores de contenido/SEO.

---

## Abiertos

### B2 — `og:url` y JSON-LD con dominio placeholder
- **Impacto:** bajo (SEO / cómo se ve al compartir en redes).
- **Causa:** el `index.html` se escribió antes de conectar el dominio. Son **tres** valores:
  `og:url` y el `url` de los **dos** bloques JSON-LD. Y al conectar el dominio hay que tocar
  además `SITIO_URL` en `api/_lib/correo.js` (B8).
- **Archivos:** `index.html`.
- **Prioridad:** baja. **Estado:** abierto.

### B3 — Sin pantalla para asignar personal a eventos
- **Impacto:** bajo hoy, alto el día que haya dos eventos simultáneos con equipos distintos.
- **Causa:** la tabla `jardines.operativo_asignacion` y sus políticas existen, pero no se
  construyó UI. Hoy los 3 operativos tienen `acceso_global = true` porque la plantilla es fija y
  el salón opera un evento a la vez.
- **Archivos:** faltaría un componente en `src/components/admin/`; base ya lista (`sec_14`, `sec_18`).
- **Prioridad:** media. **Estado:** abierto (es funcionalidad faltante, no un defecto).

### B8 — `SITIO_URL` está hardcodeada al dominio de Vercel
- **Impacto:** medio. **Todos** los correos transaccionales (alta de cliente, primer acceso,
  aviso de cotización, notificaciones al admin, recordatorios del cron) enlazan a
  `https://jardines-club-hipico.vercel.app`, no al dominio propio. También el logo embebido.
- **Causa:** `api/_lib/correo.js:5` la fija como constante, sin leer ninguna variable de entorno.
- **Archivos:** `api/_lib/correo.js`.
- **Prioridad:** media — sube a alta en cuanto se conecte el dominio, porque entonces los correos
  seguirán apuntando al viejo. **Estado:** abierto. Ligado al pendiente de dominio de
  `docs/NEXT_STEPS.md`.

### B5 — No hay fallback si Supabase no responde
- **Impacto:** alto si ocurre. Todas las secciones que leen de la base (espacios, galería,
  servicios, amenidades, alimentos, config del sitio) se renderizan **vacías**. Sobreviven solo
  el hero, los frames y el bloque de Confianza, que salen de archivos locales.
- **Causa:** `src/data/site-data.json` se documentó durante meses como "fallback estático", pero
  **nunca se conectó**: ningún archivo de `src/` ni de `api/` lo importa. Es solo la entrada de
  `scripts/seed-supabase.mjs`.
- **Archivos:** `src/api/base44Client.js` (no tiene rama de degradación), `src/data/site-data.json`.
- **Prioridad:** media. **Estado:** abierto — detectado el 2026-08-03 por la auditoría de
  documentación. No es una regresión: nunca existió. Lo que se corrigió fue la doc que afirmaba
  lo contrario.

### B4 — El cliente no puede cambiar su contraseña desde el portal
- **Impacto:** bajo. El primer acceso es por enlace de un solo uso y la contraseña se comparte
  por separado, pero no hay forma de rotarla sin intervención del admin.
- **Archivos:** faltaría una vista en `src/components/portal/`.
- **Prioridad:** media. **Estado:** abierto.

---

## Riesgos residuales aceptados (no son bugs, están documentados)

- **Los tokens de mesa, invitación y staff son credenciales portadoras**: quien tenga el QR
  entra. Es el diseño del producto. Mitigado con 256 bits, expiración, revocación, rate limit y
  respuestas genéricas idénticas para inexistente / revocado / expirado.
- **`operativo_canales` es global, no por evento.** Con dos eventos activos a la vez, el personal
  de ambos compartiría canal de radio. Hoy no ocurre.
- **2 vulnerabilidades `high` de React Router por "RSC Mode CSRF"**: no aplican. Esta app es una
  SPA con `BrowserRouter` y no usa RSC. Verificado por búsqueda en `src/`.
- **`npm run typecheck` reporta 155 errores.** Es la **línea base histórica** del proyecto
  (JSX sin tipos), no una regresión. La regla es que ese número **no suba**.
- **Pendientes compartidos con Vero Seguros**, excluidos a propósito por el candado: protección
  de contraseñas filtradas desactivada (config global de Auth), `public.is_admin()` y
  `public.rls_auto_enable()` ejecutables por `anon`, y `public.content_audit(actor)` sin índice
  de FK. Requieren el visto bueno de Vero. Ver `docs/SEGURIDAD.md` §9.

---

## Pendiente de validación humana

**Estado formal del blindaje: `ESPERANDO_VALIDACION_HUMANA_AUTENTICADA`.**

Las pruebas automáticas pasan y el código está en producción, pero cinco flujos solo se pueden
comprobar con credenciales reales frente a la pantalla. Miguel debe confirmar visualmente:

1. Alta de cliente desde el panel.
2. Enlace de primer acceso (que el cliente entre con él).
3. Subir un documento y que el cliente lo abra.
4. Aviso de cotización (que llegue el correo).
5. Generar el link de meseros y abrirlo.

Hasta entonces **no se declara CERRADO**.

---

## Resueltos en código y migraciones — pendientes de validación humana

> **Qué significa "resuelto" aquí.** El código está escrito, las migraciones aplicadas y las
> comprobaciones automáticas del repo pasan. Lo que **no** puede afirmar este documento es el
> comportamiento observado en producción con credenciales reales: eso es exactamente lo que
> falta (§ "Pendiente de validación humana"). Las afirmaciones sobre el estado de la base
> (grants, RLS, checksums) se comprobaron por consulta directa; las que describen el resultado
> de un flujo de usuario **no**.
>
> Tampoco hay CI: **no existe `.github/`**. Cuando estos documentos dicen que una suite "corre
> en CI", léase "está lista para correr en CI"; hoy se ejecuta a mano.

**Seguridad (2026-08-01 / 02), migraciones `sec_01..22`:**

- Escalamiento de privilegios por `raw_user_meta_data` (el rol lo elegía el cliente).
- Perfiles cruzados: el trigger compartido creaba perfil de Jardines a usuarios de Vero
  (el único que existía se retiró en `sec_22`).
- IDOR entre eventos en el módulo operativo, y fuga de `staffToken` de otros eventos.
- Enumeración por `info_mesa_publica` (respuestas que distinguían casos).
- `/api/notificar` aceptaba cualquier sesión de Supabase y metía HTML arbitrario en un correo
  que salía hacia el cliente.
- `/api/cron-recordatorios` era **fail-open**: sin `CRON_SECRET` configurado, se ejecutaba igual.
- `/api/solicitud` aceptaba un cuerpo arbitrario, sin sesión ni rate limit: se podía inundar el
  buzón del dueño con contenido inventado y fijar el `replyTo`.
- Contraseñas en texto dentro de correos y enlaces con credenciales en base64.
- `WITH CHECK (true)` en `solicitudes` (INSERT público sin validación).
- Token de staff en claro (columna eliminada, `sec_20`) e INSERT de compatibilidad (`sec_21`).
- 12 índices de FK faltantes; Storage sin límites de tamaño ni MIME y con listado abierto.

**Cerrados el 2026-08-03 (bloque 3):**

- **B6 — la suite probaba las RPC superadas.** `seguridad.sql` llamaba a `api_idempotencia` y
  `canjear_acceso_unico`, así que la idempotencia recuperable y el canje en dos fases solo
  tenían cobertura textual. Ahora prueba las vigentes, y las tres residuales se retiraron con
  `sec_23`. Las aserciones nuevas se verificaron en vivo contra producción.
- **B7 — última dependencia de imgur.** El JSON-LD apunta a la copia auto-hospedada y se retiró
  `i.imgur.com` de la CSP. Comprobado antes: 0 URLs de imgur en el contenido de producción.
- Token de invitación con fallback predecible, "Recibida" en `—` para siempre, 503 sin mensaje,
  anticipo irreversible, 4 componentes huérfanos y `cajaCredenciales()` muerta (ver
  `docs/CHANGELOG.md`).

**Bugs previos encontrados de paso:**

- **El folio de la solicitud nunca se guardaba:** el front intentaba un `UPDATE` que RLS
  rechazaba en silencio, así que el folio del correo no coincidía con el de la base. Ahora lo
  genera el servidor dentro de `solicitud_crear`.
- **Los documentos del cliente no se podían abrir:** se subían a `evento-<id>/` pero la policy
  comparaba contra `<id>`. Corregido (no había archivos, sin pérdida de datos).
- **`.update().eq()` sin `select`** devolvía éxito aunque afectara cero filas.
- El panel rotaba `staff_token` desde el navegador con `crypto.randomUUID()` escribiendo directo
  en la tabla; ahora usa la RPC `rotar_staff_token`.

**Regresiones que introdujo y corrigió el propio trabajo de blindaje** (documentadas porque
explican por qué existen las reglas de despliegue y las suites de prueba):

- `sec_05` revocó el INSERT de `anon` sobre `solicitudes` **antes** de desplegar el frontend que
  usa la RPC, y dejó el formulario público roto. Restablecido saneado en `sec_13`. De ahí sale
  la regla de `docs/SEGURIDAD.md` §8.bis.
- Un trigger de auditoría leía `new.evento_id` dentro de un `CASE`; PL/pgSQL resuelve los campos
  del registro en **todas** las ramas, así que rompió toda escritura sobre `operativo_personal`.
  Corregido en `sec_12` con `to_jsonb()`.
- Se borró una función dejando dos llamadas vivas: el lint no lo vio porque el bloque `rules`
  anulaba `no-undef`. Corregido y verificado reintroduciendo el fallo a propósito.
- El contrato `/api/notificar` quedó desalineado con `src/lib/notificar.js` y todos los correos
  daban 400 en silencio. De ahí nace `scripts/test-contratos-api.mjs`.

**FASE-01 (histórico):**

- Scroll salta al cerrar el formulario — resuelto (D8), `useLockBodyScroll` con `overflow:hidden`.
- Galería en orden invertido — resuelto (D6).
- Sección "Información de Servicios" vacía — resuelto.
- Erratas y duplicados en nombres de salones — resuelto.
- **B1 (obsoleto): "el panel `/Admin` no persiste".** Ya no aplica: desde FASE-02 el panel
  escribe en Supabase. Además `/Admin` es 404; el panel vive en la ruta `ADMIN_SLUG`.

---

## Notas / no-bugs

- Requests `206 Partial Content` con `ERR_ABORTED` en los videos de la galería = comportamiento
  normal de `<video preload="metadata">`.
- Si una escritura del panel "no hace nada", sospecha primero de una **policy de RLS**, no de la
  UI: el shim registra el error en consola con el prefijo `[shim]`.
