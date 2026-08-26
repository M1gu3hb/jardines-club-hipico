# BUGS_PENDING.md

> Estado a **2026-08-04**.
>
> **Una sola numeración.** Hasta ahora convivían dos esquemas `B*` —el de este archivo y el de
> las órdenes de trabajo de código— y colisionaban: un mismo reporte decía "cerrado B3" y
> "abierto B3" refiriéndose a cosas distintas. Desde aquí:
>
> - **`J-##`** = bug abierto de este archivo. El número se asigna **en orden de detección** y
>   **no se reutiliza** aunque el bug se cierre; la **lista va ordenada por prioridad**, así que
>   los números no salen correlativos y eso es correcto, no un hueco.
> - Los identificadores de las órdenes de trabajo (`S1`, `B1`, `L5`…) son de esos documentos y
>   **no** se usan aquí: cuando algo de ahí queda abierto, entra con su `J-##`.
>
> Formato: bug · impacto · causa · archivos · prioridad · estado.

## Estado general

**No hay bugs críticos abiertos.** Quedan diez pendientes, riesgos residuales aceptados, y lo
que depende de terceros. **J-08 y J-09** (bloque 7) quedan resueltos en código y pendientes de que
el dueño los vea funcionar en pantalla.

**J-12 (C3) queda resuelto en 9D**: salió de cruzar la CSP desplegada contra lo que carga el bundle.

**J-10 y J-11 son nuevos (8F) y los dos son de RLS.** Se anotan, no se arreglan: tocar una policy
de la base compartida exige migración y el orden de despliegue de `docs/SEGURIDAD.md` §8.bis. En
los dos casos el **uso peligroso** ya está cerrado en código; lo que sigue abierto es el permiso.

---

## Abiertos

### ~~J-14~~ — La invitación digital del cliente **RESUELTA** · 2026-08-26

Se deja el historial entero porque explica un fallo que duró meses y su forma de esconderse, pero
**la afirmación central de este apartado ya no es cierta y por eso se reescribe en vez de dejarle
un banner encima.**

**Lo que decía:** que `eventos_upd` exige `is_admin()`, que por tanto el UPDATE de la invitación
*«nunca ha tocado una fila»*, y que `select count(invitacion_token) from jardines.eventos` daba
**0** contra producción.

**Lo que dice la base hoy** (2026-08-26, misma consulta): **1 evento con token, 1 con
`invitacion_activa` y 1 con mensaje**. La función escribe.

Se cerró por **las dos vías a la vez**, que era justo lo que este apartado decía que hacía falta:

- **`sec_26` está aplicada** desde el 2026-08-05, con lo que `PortalInvitacion` puede llamar a
  `jardines.invitacion_guardar` y el cliente activa su invitación desde su portal.
- **Y la activación también está en el panel**, que era la alternativa que este apartado dejaba
  abierta. `EventoDatos` tiene el interruptor y acuña el token si falta, en el mismo UPDATE —
  porque `info_invitacion` busca la página *por* el token, así que activar sin token habría sido
  otro estado que parece resuelto y no lo está.

Las dos vías conviven a propósito: `is_my_event` es solo `auth_user_id = auth.uid()` y no cubre a
un admin, así que la RPC sirve al cliente y el UPDATE directo al dueño.

**Lo que queda de este apartado, y merece releerse:** el fallo duró meses porque se escondía por
partida doble. El shim daba por bueno un UPDATE de cero filas, y el panel le decía al dueño «El
cliente aún no activó su invitación digital» — atribuyéndole al cliente una causa falsa. Esa
segunda mitad es la peor: un mensaje de estado que inventa una explicación plausible impide
buscar la verdadera.

### J-16 — Siete RPC concedidas al navegador que nadie invoca

Salieron del contrato que ata migración y llamador. Todas comprobadas con cero apariciones en
`src/`, en `api/` y en el bundle construido:

| Función | Por qué importa |
|---|---|
| `registrar_llegada_mesa` | **concedida a `anon`**: invocable sin autenticarse. Escribiría `mesas.ocupadas`, la fuente que el tablero de meseros lee y **nadie llena**. La más urgente de las siete |
| `info_mesa_token` | **concedida a `anon`**. `sec_23` la conservó como «la vía viva y protegida» frente a `info_mesa_publica`, que sí retiró — pero la interfaz nunca llegó a usarla |
| `revocar_staff_token` | el panel solo rota el token, nunca lo revoca sin sustituto |
| `confirmar_evento` | flujo de confirmación que nunca se construyó en la interfaz |
| `auditoria_reciente` | la auditoría se consulta por SQL; no hay pantalla que la lea |
| `operativo_ubicar`, `operativo_evento_activo` | parte del operativo que quedó sin interfaz |

Están en una lista explícita del contrato, con su motivo, para que **cualquier huérfana nueva**
haga fallar la suite. La lista solo puede encoger.

`info_mesa_token` apareció al arreglar C.3: su único «uso» era un `to_regprocedure` dentro de un
bloque `do $$`, que el contrato contaba como llamada. Las dos concedidas a `anon` son las que
importan primero: se pueden invocar sin sesión.

### J-15 — Las escrituras que RLS deja en cero filas siguen reportando éxito *(mitad cerrada)*

`update()` y `delete()` del shim devuelven éxito cuando la base no tocó ninguna fila —
comprobado ejecutando: UPDATE y DELETE denegados por RLS no dan error, `INSERT` sí (42501).

Existen `updateEstricto`/`deleteEstricto` y están migradas las escrituras que **deciden** algo.
Las demás siguen usando la variante muda. Cerrar la clase entera exige que **toda** escritura
tenga `catch` primero: hoy diez componentes escriben sin ninguno, y hacer que `update` lance
cambiaría el engaño por una pantalla muerta. Ver `docs/DECISIONS.md`.

### J-01 — `SITIO_URL` está hardcodeada al dominio de Vercel

> **✅ CERRADO el 2026-08-24, en la FASE 1 de la separación.** `SITIO_URL` dejó de existir:
> ahora son `URL_WEB`, `URL_PORTAL` y `URL_CRM`, declaradas UNA vez en `api/_lib/urls.js` y
> leídas de variables de entorno. En la FASE 4 pasaron a sus valores reales, así que cada
> correo enlaza a la aplicación que le toca.
>
> Lo que quedaba de este bug era peor de lo que parecía: `crear-usuario-evento` construía con
> ella el enlace mágico de primer acceso, que es de **un solo uso**. Con el portal mudado de
> origen, ese enlace habría caído en una ruta inexistente — el correo se quema y el cliente se
> queda fuera sin que nadie se entere. Era el peligro P1 del plan.
>
> **Lo único que sigue escrito a mano** es el destino de los dos redirects 301 en el
> `vercel.json` de la web, porque Vercel no interpola variables de entorno ahí. Está acotado a
> configuración de despliegue, no a código, y un contrato lo vigila.
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
- **La mitad de LECTURA está cerrada (8E, 2026-08-04).** `filterEstricto` tenía hermano:
  `listEstricto`. Las pantallas que **deciden** con una lectura ya no la hacen floja, y el `[]`
  ambiguo dejó de poder disfrazarse de "aquí no hay nada". Dos de esos disfraces llegaban a
  perder datos: `AdminConfig` caía en la rama "no hay configuración" y guardar creaba una
  **segunda fila** en `config_sitio` (y el sitio lee la primera que devuelva Postgres);
  `MesaReglas` hacía lo mismo con las reglas del evento. Lo que sigue abierto es la mitad de
  **ESCRITURA**: `update` fabricando el objeto y `delete` devolviendo `{success:true}`.
- **Archivos:** `src/api/base44Client.js` (y todos los llamadores).
- **Prioridad:** media. **Estado:** abierto (mitad de lectura cerrada; escritura pendiente).

### J-06 — El guardarraíl del operativo es solo de cliente
- **Impacto:** medio. `AdminOperativo` **bloquea** apagar `acceso_global` a quien tenga 0
  asignaciones vigentes a eventos activos, pero eso vive **en el navegador**. Cualquier admin
  puede poner `acceso_global = false` desde Supabase Studio o por SQL y dejar a esa persona en
  0 eventos, sin aviso ninguno.
- **Causa:** la invariante "nadie con 0 eventos efectivos" **no está garantizada en la base**.
  `sec_14` es fail-closed a propósito —que es lo correcto— pero no hay constraint ni trigger que
  impida el estado sin salida.
- **Por qué está así:** es coherente con el alcance que se fijó (la fase era frontend sobre lo
  que existe, sin tocar `operativo_eventos_permitidos` ni policies). Garantizarlo en la base
  exigiría un trigger sobre `operativo_personal`, y eso es una decisión de producto: quizá haya
  casos legítimos de dejar a alguien sin acceso a propósito (una baja, por ejemplo).
- **Archivos:** `src/components/admin/AdminOperativo.jsx`; la garantía faltaría en `jardines`.
- **Prioridad:** media. **Estado:** abierto, documentado a propósito.

### J-07 — `operativo_activo` no se maneja desde el panel
- **Impacto:** bajo, pero es la causa de que existan asignaciones inertes. Nada en `src/` ni en
  `api/` **escribe** `operativo_activo`: la única aparición es el filtro de lectura de
  `AdminOperativo`. Se enciende y se apaga a mano en la base.
- **Consecuencia:** al cerrar un evento, sus asignaciones quedan vigentes pero **dejan de dar
  acceso** (el OR de `sec_14` exige el evento activo). La pantalla ya las cuenta aparte y permite
  revocarlas, pero el ciclo completo sigue siendo manual.
- **Archivos:** faltaría un control en `src/components/admin/eventos/`.
- **Prioridad:** baja. **Estado:** abierto.

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

### J-10 — Las policies de `jardines` no restringen COLUMNAS, y una de ellas es `auth_user_id`
- **Impacto:** alto, y es el que causó el P0 del bloque 8F. `eventos_upd` (`sec_09`) es
  `for update to authenticated using (jardines.is_admin()) with check (jardines.is_admin())`:
  autoriza **la fila entera**, sin decir qué columnas. Así que cualquier admin puede hacer
  `Evento.update(id, { authUserId: "<cualquier uuid>" })` desde el navegador y RLS lo acepta.
  Ese uuid alimentaba un `deleteUser` sobre `auth.users`, la tabla **compartida con Vero**, que
  tiene **un solo administrador**. `documentos_ins`/`documentos_upd` tienen la misma forma, y su
  columna `archivo_url` alimenta un `storage.remove` sobre el bucket `clientes`.
- **Causa:** las policies conceden por rol, no por columna. Postgres sí permite acotarlo
  (`GRANT UPDATE (col1, col2)`), pero eso es una migración.
- **Mitigación aplicada (8F, sin migración):** ningún dato que venga de esas columnas se usa para
  destruir nada sin comprobar antes a quién pertenece. `borrarUsuario` exige un permiso explícito
  y verifica cinco condiciones; las rutas de `archivo_url` se acotan a `<eventoId>/`. El agujero
  de RLS **sigue abierto**: lo que se cerró es el uso peligroso, no el permiso.
- **Por qué no se arregla aquí:** cambiar una policy de producción compartida es una decisión con
  migración, y el orden de despliegue de `docs/SEGURIDAD.md` §8.bis dice que lo aditivo va antes
  y lo restrictivo después de desplegar. Revocar antes de desplegar ya rompió el formulario
  público una vez.
- **Qué haría falta:** `sec_26` con `revoke update on jardines.eventos from authenticated` +
  `grant update (columnas...) on jardines.eventos to authenticated`, dejando `auth_user_id` fuera
  de la lista (solo `service_role` la escribe, desde `crear-usuario-evento`). Lo mismo con
  `documentos.archivo_url`.
- **Archivos:** `supabase/migrations/..._sec_09_*.sql` (policies), `api/_lib/guard.js`,
  `api/eliminar-evento.js` (los usos, ya protegidos).
- **Prioridad:** media-alta. **Estado:** abierto — el uso está mitigado, el permiso no.

### J-11 — `eventos_del` permite borrar un evento desde el navegador, saltándose el endpoint
- **Impacto:** medio. `eventos_del` (`sec_09`) es `for delete to authenticated using
  (jardines.is_admin())` y el shim expone `Evento.delete`. Todo el orden de `api/eliminar-evento.js`
  —archivos primero, huérfanas después, fila al final— es **convención, no garantía**: un
  `base44.entities.Evento.delete(id)` desde la consola del navegador borra la fila directamente y
  deja los archivos del bucket sin ninguna referencia (los paths viven en `documentos`, que cae
  por CASCADE) y el usuario de Auth vivo.
- **Por qué no se arregla aquí:** misma razón que J-10 — es una policy, exige migración, y
  revocar antes de desplegar el sustituto rompe el panel.
- **Qué haría falta:** revocar `delete` a `authenticated` sobre `jardines.eventos` **después** de
  que el endpoint esté desplegado y validado, y quitar `Evento.delete` del shim.
- **Archivos:** `supabase/migrations/..._sec_09_*.sql`, `src/api/base44Client.js`.
- **Prioridad:** media. **Estado:** abierto.

### J-12 — El sitio público carga imágenes de Unsplash que la CSP bloquea *(resuelto en 9D)*
- **Impacto:** bajo, pero **visible**. `img-src` de la CSP desplegada solo admite `'self'`,
  `data:`, `blob:` y el bucket de Supabase. `CtaCotizacion.jsx` pinta **siempre** un fondo con
  `url('https://images.unsplash.com/...')`, así que en producción ese fondo está bloqueado y no
  se ve (va al 10 % de opacidad, por eso no salta a la vista). `GaleriaSection`, `SalonesSection`
  y `SalonOverlay` tienen placeholders del mismo origen, que solo salen si Supabase no devuelve
  contenido — es decir, **justo en el camino degradado**.
- **Cómo se encontró:** cruzando la CSP desplegada contra los orígenes que pide el bundle, en la
  verificación post-deploy de C3. No lo habría visto una prueba de humo.
- **Dos arreglos posibles, y son decisiones distintas:** quitar los placeholders de Unsplash y
  poner medios propios de `public/media/` (**recomendado** — el proyecto ya auto-hospeda todo), o
  añadir `https://images.unsplash.com` a `img-src` (ensancha la CSP para servir decoración de un
  tercero; peor).
- **Archivos:** `src/components/{CtaCotizacion,GaleriaSection,SalonesSection,SalonOverlay}.jsx`,
  `vercel.json` (la CSP).
- **Arreglo (9D):** las **catorce** referencias auto-hospedadas desde `public/media/img/` con
  fotos reales del salón. El barrido encontró **cinco más** que el reporte no citaba: los
  cinco salones de respaldo de `SalonesSection`, que en el camino degradado enseñaban la
  imagen rota. **La CSP no se ensanchó** —el proyecto ya sacó imgur por esto mismo (D3)— y
  hay un contrato que impide hacerlo después.
- **Prioridad:** baja. **Estado:** **resuelto**, pendiente de verse desplegado.

### J-13 — `eventos.solicitud_id` no es único: dos admins a la vez pueden duplicar la conversión
- **Impacto:** bajo hoy (un solo administrador activo), pero es una carrera real.
  `eventos_solicitud_id_idx` (`sec_25`) es un índice **no único**, así que la base no impide dos
  eventos de la misma solicitud.
- **Lo que sí lo impide (9E-2):** `AdminEventos.crear()` relee con `filterEstricto` si esa
  solicitud ya generó un evento y para si lo hay. Cierra el camino del fallo de lectura de la
  otra pantalla, que es el que se reprodujo.
- **Lo que NO cierra:** es comprobar-y-luego-escribir, no una transacción. Dos admins
  convirtiendo la misma solicitud a la vez podrían pasar los dos.
- **Qué haría falta:** `sec_26` con
  `create unique index eventos_solicitud_id_uniq on jardines.eventos (solicitud_id) where solicitud_id is not null`,
  sustituyendo al índice no único. **Precondición obligatoria:** comprobar antes que no haya ya
  duplicados, o el índice falla a mitad. Y el mensaje del 23505 hay que traducirlo en el alta,
  o el dueño verá un error crudo de Postgres donde hoy ve una explicación.
- **Por qué no se hizo:** el bloque 9 tenía una sola migración autorizada (`sec_25`).
- **Archivos:** `supabase/migrations/`, `src/components/admin/eventos/AdminEventos.jsx`.
- **Prioridad:** baja. **Estado:** abierto — el camino reproducible está cerrado, la carrera no.

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
- **El desplegable de salones puede enseñar una lista vieja (9F/G1).** `useCarga` conserva los
  últimos datos buenos cuando una recarga falla, y desde 9F eso ya no bloquea el alta ni la
  conversión: se puede seguir trabajando con la lista anterior. Consecuencia asumida: un salón
  creado o renombrado durante ese hueco no aparece, o aparece con el nombre viejo. Se avisa en
  pantalla ("esta lista puede estar desactualizada: la última recarga falló") y el `salon_id` que
  se guarda sale siempre de la lista, nunca del texto de la solicitud, así que lo peor que puede
  pasar es asignar un salón que existe pero no era el que se quería — corregible desde la ficha.
  La alternativa —bloquear— quitaba un trabajo que el dueño podía terminar.
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

### J-08 — El estatus de la solicitud no se podía cambiar *(resuelto en el bloque 7A)*
- **Impacto:** era alto. El correo de resumen diario le dice al dueño qué solicitudes están
  estancadas y no podía marcarlas como atendidas: el contador crecía para siempre y el correo
  perdía sentido.
- **Causa — no la que parecía.** `sec_07` puso un CHECK que admite
  `Nueva, En proceso, Cotizada, Cerrada, Descartada`, y el panel ofrecía `En revisión`,
  `Confirmada` y `Cancelada`. Solo coincidía `Nueva`, así que **cualquier** cambio violaba el
  CHECK (23514). **No** era el GRANT (existe) ni el `[]` mudo de J-02 (el `update` del shim sí
  lanza). Lo que lo hacía invisible era `updateStatus` sin `try/catch`.
- **Arreglo:** la lista del panel pasa a ser la de la base, y el guardado captura, traduce y
  confirma releyendo. **Sin migración.** Un contrato cruza ahora los dos archivos —el panel
  contra el CHECK de la migración— para que no puedan volver a divergir.
- **Lección:** al añadir un valor a una lista cerrada, se toca **primero** el CHECK.

### J-09 — La actividad del portal no se podía quitar y crecía sin límite *(resuelto en 7B)*
- **Impacto:** era medio. Se acumulaba y saturaba el inicio del panel.
- **Arreglo:** se borra —no se archiva— a mano (una o el grupo del evento) y automáticamente a
  los 7 días desde el cron, que audita cuántas filas se fueron y lo reporta en el resumen diario.
  **Sin migración:** el GRANT de DELETE y la policy `notificaciones_del` ya existían, comprobado
  por impersonación antes de escribir el código.

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
