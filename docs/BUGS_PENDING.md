# BUGS_PENDING.md

> Estado a **2026-08-03**.
>
> **Una sola numeración.** Hasta ahora convivían dos esquemas `B*` —el de este archivo y el de
> las órdenes de trabajo de código— y colisionaban: un mismo reporte decía "cerrado B3" y
> "abierto B3" refiriéndose a cosas distintas. Desde aquí:
>
> - **`J-##`** = bug abierto de este archivo. Numeración correlativa, sin huecos, ordenada por
>   prioridad. **No se reutiliza un número liberado.**
> - Los identificadores de las órdenes de trabajo (`S1`, `B1`, `L5`…) son de esos documentos y
>   **no** se usan aquí: cuando algo de ahí queda abierto, entra con su `J-##`.
>
> Formato: bug · impacto · causa · archivos · prioridad · estado.

## Estado general

**No hay bugs críticos abiertos.** Quedan cinco pendientes —dos medios, tres bajos—, riesgos
residuales aceptados, y lo que depende de terceros.

---

## Abiertos

### J-01 — `SITIO_URL` está hardcodeada al dominio de Vercel
- **Impacto:** medio. **Todos** los correos transaccionales (alta de cliente, primer acceso,
  aviso de cotización, notificaciones al admin, recordatorios del cron) enlazan a
  `https://jardines-club-hipico.vercel.app`, no al dominio propio. También el logo embebido.
- **Causa:** `api/_lib/correo.js` la fija como constante, sin leer ninguna variable de entorno.
- **Archivos:** `api/_lib/correo.js`.
- **Prioridad:** media — **sube a alta en cuanto se conecte el dominio**, porque entonces los
  correos seguirán apuntando al viejo. **Estado:** abierto. Va junto con J-04.

### J-02 — El shim reporta éxito en escrituras que RLS dejó en 0 filas
- **Impacto:** medio, latente. Hoy no muerde porque las policies existen, pero es la **misma
  familia** que el bug del folio que cerró el blindaje: un `update` o `delete` bloqueado por RLS
  no devuelve error, devuelve **0 filas**.
- **Causa:** `base44Client.js` — `update` hace `rowToObj(data) || { id, ...patch }`, así que
  fabrica un objeto que parece guardado; `delete` devuelve `{success:true}` incondicionalmente.
- **Por qué sigue abierto:** es la API que usa **todo** el proyecto. Hacer que lancen convertiría
  en error visible cualquier escritura que hoy falla en silencio —que es lo correcto— pero sin
  poder probar los flujos de punta a punta el riesgo de romper algo en vivo supera al beneficio.
- **Mitigación en curso:** `SalonPlanoUpload` y `AdminOperativo` **confirman releyendo** en vez de
  confiar en el shim. Ese es el patrón a extender al resto.
- **Archivos:** `src/api/base44Client.js` (y todos los llamadores).
- **Prioridad:** media. **Estado:** abierto.

### J-03 — No hay fallback si Supabase no responde
- **Impacto:** alto si ocurre. Todas las secciones que leen de la base (espacios, galería,
  servicios, amenidades, alimentos, config del sitio) se renderizan **vacías**. Sobreviven solo
  el hero, los frames y el bloque de Confianza, que salen de archivos locales.
- **Causa:** `src/data/site-data.json` se documentó durante meses como "fallback estático", pero
  **nunca se conectó**: ningún archivo de `src/` ni de `api/` lo importa. Es solo la entrada de
  `scripts/seed-supabase.mjs`.
- **Archivos:** `src/api/base44Client.js` (no tiene rama de degradación), `src/data/site-data.json`.
- **Prioridad:** baja mientras Supabase aguante; el impacto es alto pero la probabilidad, baja.
  **Estado:** abierto. No es una regresión: nunca existió. Lo que se corrigió fue la doc.

### J-04 — `og:url` y JSON-LD con dominio placeholder
- **Impacto:** bajo (SEO / cómo se ve al compartir en redes).
- **Causa:** el `index.html` se escribió antes de conectar el dominio. Son **tres** valores:
  `og:url` y el `url` de los **dos** bloques JSON-LD.
- **Archivos:** `index.html`.
- **Prioridad:** baja. **Estado:** abierto. Se resuelve a la vez que J-01, al conectar el dominio.

### J-05 — El cliente no puede cambiar su contraseña desde el portal
- **Impacto:** bajo. El primer acceso es por enlace de un solo uso y la contraseña se comparte
  por separado, pero no hay forma de rotarla sin intervención del admin.
- **Archivos:** faltaría una vista en `src/components/portal/`.
- **Prioridad:** baja. **Estado:** abierto.

---

## Riesgos residuales aceptados (no son bugs, están documentados)

- **Los tokens de mesa, invitación y staff son credenciales portadoras**: quien tenga el QR
  entra. Es el diseño del producto. Mitigado con 256 bits, expiración, revocación, rate limit y
  respuestas genéricas idénticas para inexistente / revocado / expirado. Que además se guarden
  **en claro** es una decisión pendiente, no cerrada: ver `docs/DECISIONS.md` D-COD-2.
- **`operativo_canales` es global, no por evento.** Con dos eventos activos a la vez, el personal
  de ambos compartiría canal de radio. Hoy no ocurre.
- **La CSP conserva `'unsafe-inline'`** en `script-src` y `style-src`: acota orígenes, pero **no**
  protege contra XSS por inyección inline. Quitarlo exige eliminar los estilos y scripts en línea
  que quedan.
- **2 vulnerabilidades `high` de React Router por "RSC Mode CSRF"**: no aplican. Esta app es una
  SPA con `BrowserRouter` y no usa RSC. Verificado por búsqueda en `src/`.
- **`npm run typecheck` reporta 59 errores.** Es la **línea base actual** (JSX sin tipos), no una
  regresión. La regla es que **no suba**. Bajó desde 155 al tipar el Proxy `entities` del shim.
- **Pendientes compartidos con Vero Seguros**, excluidos a propósito por el candado: protección
  de contraseñas filtradas desactivada (config global de Auth), `public.is_admin()` y
  `public.rls_auto_enable()` ejecutables por `anon`, y `public.content_audit(actor)` sin índice
  de FK. Requieren el visto bueno de Vero. Ver `docs/SEGURIDAD.md` §9.

---

## Pendiente de validación humana

**Estado formal del blindaje: `ESPERANDO_VALIDACION_HUMANA_AUTENTICADA`.**

Las comprobaciones automáticas pasan y el código está desplegado, pero cinco flujos solo se
pueden comprobar con credenciales reales frente a la pantalla:

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
> falta. Las afirmaciones sobre el estado de la base (grants, RLS, recuentos) se comprobaron por
> consulta directa; las que describen el resultado de un flujo de usuario **no**.
>
> Tampoco hay CI: **no existe `.github/`**. Cuando estos documentos dicen que una suite "corre en
> CI", léase "está lista para correr en CI"; hoy se ejecuta a mano.

**Seguridad (2026-08-01 / 02), migraciones `sec_01..22`:**

- Escalamiento de privilegios por `raw_user_meta_data` (el rol lo elegía el cliente).
- Perfiles cruzados: el trigger compartido creaba perfil de Jardines a usuarios de Vero
  (el único que existía se retiró en `sec_22`).
- IDOR entre eventos en el módulo operativo, y fuga de `staffToken` de otros eventos.
- Enumeración por `info_mesa_publica` (respuestas que distinguían casos).
- `/api/notificar` aceptaba cualquier sesión de Supabase y metía HTML arbitrario en un correo
  que salía hacia el cliente.
- `/api/cron-recordatorios` era **fail-open**: sin `CRON_SECRET` configurado, se ejecutaba igual.
- `/api/solicitud` aceptaba un cuerpo arbitrario, sin sesión ni rate limit.
- Contraseñas en texto dentro de correos y enlaces con credenciales en base64.
- `WITH CHECK (true)` en `solicitudes` (INSERT público sin validación).
- Token de staff en claro (columna eliminada, `sec_20`) e INSERT de compatibilidad (`sec_21`).
- 12 índices de FK faltantes; Storage sin límites de tamaño ni MIME y con listado abierto.

**Bloque 3 (código, 2026-08-03):**

- Token de `/invitacion/:token` con fallback predecible (`Date.now()` + `Math.random()`).
- "Recibida" en `—` para siempre en Solicitudes: se leía un campo que el shim nunca produce.
- 503 sin mensaje en el canje del primer acceso.
- Anticipo que no se podía desmarcar (latch de un solo sentido).
- 4 componentes huérfanos y `cajaCredenciales()` muerta.
- Última dependencia de imgur: el JSON-LD apunta a la copia local y salió de la CSP.
- "Cómo funciona" y "Preguntas" no estaban en el menú ni en el scroll-spy.
- 3 RPC residuales retiradas (`sec_23`) y la suite pasa a probar las **vigentes**.

**Bloque 4 (código, 2026-08-03):**

- **Regresión de la unificación de idempotencia:** el corte por `duplicado` devolvía otra forma
  que el camino de éxito, así que el panel escribía `usuario: undefined` y volvía a pedir
  credenciales para un evento que ya las tenía.
- **Tipado del shim demasiado laxo:** `Record<string, …>` apagaba la detección de typos de
  entidad, y un typo daba **lista vacía en silencio**. Ahora es `keyof typeof TABLES`.
- **Reasignación cruzada de planos entre salones** (faltaba `key` + reset de estado).
- `salon_planos` admitía duplicados (índice único en `sec_24`) y dejaba huérfanos en un bucket
  público sin forma de localizarlos (`imagen_plano_path` en `sec_24`).
- Quitar el plano no borraba el archivo, que seguía descargable.
- Medidas nulas pisando medidas buenas y desplazando las mesas.

**Bugs previos encontrados de paso:**

- **El folio de la solicitud nunca se guardaba:** el front intentaba un `UPDATE` que RLS
  rechazaba en silencio. Ahora lo genera el servidor.
- **Los documentos del cliente no se podían abrir:** se subían a `evento-<id>/` pero la policy
  comparaba contra `<id>`.
- **`.update().eq()` sin `select`** devolvía éxito aunque afectara cero filas.

---

## Notas / no-bugs

- Requests `206 Partial Content` con `ERR_ABORTED` en los videos de la galería = comportamiento
  normal de `<video preload="metadata">`.
- Si una escritura del panel "no hace nada", sospecha primero de una **policy de RLS**, no de la
  UI: el shim registra el error en consola con el prefijo `[shim]`. Ver J-02.
