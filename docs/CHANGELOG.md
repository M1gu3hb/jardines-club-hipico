# CHANGELOG.md

## 2026-08-04 — C1 y despliegue a producción del bloque 8

> **Desplegado.** Commit `b1dbf69`, deployment `dpl_A1Ex55zgGErxznJJYFCNcYhEC5r6`, 8 funciones.
> Es el primer despliegue que incluye el endpoint de borrado de eventos.

### C1 — la rama del permiso aparentaba comprobar y no comprobaba

`if (permiso.creadoEnEstaPeticion !== userId)` con el único llamador pasando `userId` como las
dos cosas es `userId !== userId`: siempre falso, no rechazaba nunca nada. **Un guardarraíl que
parece comprobar y no comprueba es peor que no tenerlo, porque invita a confiar.**

Se hicieron las dos cosas, porque son mitades distintas del mismo problema:

- **Fuera el `if` tautológico.** En su lugar, una comprobación que sí mira algo real: la cuenta
  tiene que haberse creado hace menos de 10 minutos. No demuestra que el uuid venga de esta
  petición, pero descarta lo que importa — cualquier uuid leído de la base apunta a una cuenta
  vieja. Falla cerrado.
- **El contrato estático que cierra el resto:** los dos llamadores de `compensarAlta` solo
  asignan `nuevoId` desde `created.user.id`, solo compensan esa variable, y **nadie más puede
  llamar a `compensarAlta`** — un tercer llamador quedaría fuera del contrato sin que nada
  fallara.

El comentario dice ahora explícitamente cuál de las dos mitades es una comprobación y cuál es un
contrato de llamador.

### Verificación post-deploy, sin sesión

Las seis cabeceras y `Cache-Control: no-store` en las ocho rutas `api/`. Cada función responde
405 al método incorrecto y 401 sin sesión; **`/api/eliminar-evento` responde 405 a GET y 401 a
POST sin sesión**. Las rutas por token con un token inventado devuelven el mismo HTML que
cualquier otra ruta, así que no filtran si existe. El bundle: `comprobante` **0** apariciones, el
código nuevo presente, **0 secretos** (el único JWT es la `anon`, que es pública por diseño).

### Dos cosas que salieron de la verificación, y ninguna es cosmética

- **8A nunca se mergeó.** La documentación afirmaba que estaba en `main`; era falso, arrastrado
  de un resumen anterior. `AdminEventos.jsx` en producción sigue pidiendo 6 caracteres de
  contraseña cuando el servidor exige 8: una contraseña de 6 o 7 crea el evento y falla al crear
  las credenciales. Vive en `claude/jardines-bloque-8` (`a56e904`), sin PR, y hay que rebasarlo.
- **J-12:** cruzando la CSP desplegada contra lo que carga el bundle, `CtaCotizacion` pinta
  siempre un fondo de `images.unsplash.com` que `img-src` **bloquea**. Otros tres componentes
  tienen placeholders del mismo origen en el camino degradado.

### Entregables

- **`docs/ESTADO.md` (nuevo)** — el estado revisable de un vistazo, sin optimismo: qué está en
  producción, qué no se ha hecho, y la deuda viva en una tabla.
- **`docs/VALIDACION.md`** — reescrito como documento único de cierre, con una **Parte 0** para
  borrar los tres duplicados de «Boda ortega» (la primera ejecución real del borrado) y una
  **Parte 1** con las seis cosas nuevas que hay que ver funcionando.

### Contratos
**202 → 206.** Los cuatro nuevos validados mutando: quitar la comprobación de recencia, ablandar
la ventana, compensar un uuid leído de la base en cada ruta de alta, y añadir un tercer llamador
de `compensarAlta`. Los seis fallan exactamente su contrato; subir la ventana de 10 a 15 minutos
(inocua) pasa.

## 2026-08-04 — 8F: ningún borrado de usuario sin comprobar de quién es la cuenta

> Correcciones de la auditoría del bloque 8, **antes de mergear**. Nada de lo de abajo llegó a
> desplegarse: producción sigue en `82154f6`.

### El P0

`api/eliminar-evento.js` le pasaba a `deleteUser` el uuid de `jardines.eventos.auth_user_id`, y
nadie comprobaba de quién era. La cadena, verificada contra producción:

1. `eventos_upd` (`sec_09`) es `using is_admin() with check is_admin()` — autoriza **la fila
   entera, sin restricción de columna**. `Evento.update(id, { authUserId: "<cualquier uuid>" })`
   desde el navegador pasa RLS.
2. `deleteUser` es un **hard delete** sobre `auth.users`, la tabla compartida con Vero Seguros.
3. `public.admin_users` tiene **una sola fila**, y su `user_id` existe en `auth.users`.
4. No hay `UNIQUE` sobre `eventos.auth_user_id` — el único índice único de `eventos` es sobre
   `usuario`—, así que dos eventos pueden apuntar al mismo usuario.

No hace falta mala fe: un `auth_user_id` mal escrito por un bug basta.

**El guardarraíl va en `guard.js`, no en el endpoint**, para que proteja también a los llamadores
que todavía no existen. `borrarUsuario` exige ahora un `permiso` **sin valor por defecto**:
olvidarlo niega el borrado. Dos permisos y solo dos — `cliente_de_evento` (cinco condiciones) y
`recien_creado_aqui` (solo el uuid que esa misma petición acaba de crear, que es lo que necesita
`compensarAlta` y lo único que necesita). Falla cerrado. Detalle en `docs/SEGURIDAD.md` §2.

**Un diagnóstico del brief no se aplicó tal cual, y se explica por qué.** Pedía exigir
`app_metadata.app === "jardines"`. Medido en producción: `api/crear-admin.js` pone **la misma
marca**, así que no distingue un cliente de un administrador de Jardines; y de los tres clientes
de portal que hay hoy **solo uno** la lleva. Exigirla dejaría las otras dos cuentas imposibles de
borrar para siempre. Se usa como **descalificador** (rechaza si dice otra cosa) y se añaden dos
condiciones que el brief no pedía: el rol en `jardines.perfiles` y que ningún otro evento
referencie ese uuid.

### El segundo bloqueante: un nombre vacío anulaba la confirmación

Con `nombre_evento = ""`, `String("" || "").trim() !== String("" || "").trim()` es `false` — la
confirmación pasa— y en el navegador el botón se habilitaba con la caja en blanco. El nombre se
podía vaciar desde la ficha, que lo guardaba sin validar. Cerrado en los tres sitios: servidor,
botón y ficha.

### Los otros ocho

- **La carrera de `notificaciones`.** Se comprobaba `borradas !== inventario`, contra un conteo de
  segundos antes; el cron y el propio cliente escriben en esa tabla mientras el borrado corre. Una
  notificación nueva abortaba el proceso **en el paso 2, con el bucket ya vaciado**: el evento
  quedaba visible con documentos que no se pueden abrir. Ahora se comprueba que **no sobreviva
  ninguna**, no que el número coincida.
- **Inventario incompleto.** Faltaban `evento_notas`, `evento_wishlist`, `evento_reglas_mesas`,
  `operativo_asignacion` y los `accesos`. El caso feo: `EventoDatos` pinta la wishlist y las notas
  del cliente dos secciones más arriba, y el bloque "se va a borrar" no las nombraba — un evento
  que solo tuviera wishlist decía "no tiene datos cargados todavía" y se la llevaba.
- **`operativo_ubicaciones` se borraba sin confirmar**: se recogía el resultado y no se miraba,
  justo al lado del bloque que sí lo hacía.
- **El `catch` no guardaba `auth_user_id` ni el estado real de la fila.** Si la fila cuajaba y
  fallaba la relectura se respondía "Evento: NO borrado" —falso—, el reintento daba 404 y la
  cuenta del cliente quedaba viva sin rastro. `fila` pasa a tener **tres** estados.
- **Las rutas del bucket ahora salen de dos fuentes**: el listado por prefijo y
  `documentos.archivo_url`, que es la referencia real sobre la que razona la cabecera.
- **Las subcarpetas** llegan con `id: null`, `remove` no las borra y `n < pedidos` se cumplía
  siempre: el evento quedaba **imposible de borrar** con el mensaje "Se borraron 0 de 1 archivos".
- **Las dos cuotas.** `soloInventario` respondía **antes** del rate limit (16 consultas por
  petición, barra libre) y el 429 llegaba **después** de comparar el nombre, así que los intentos
  fallidos de confirmación no contaban. Ahora hay cuota de consulta antes del inventario y la
  destructiva antes de la comparación.
- **Los dos hallazgos de RLS se anotan, no se arreglan**: J-10 (las policies no restringen
  columnas) y J-11 (`eventos_del` permite borrar desde el navegador, así que el orden
  storage-primero es convención y no garantía). Exigen migración.

### Lo que encontró la autoauditoría

Al arreglar el punto de las rutas introduje **el mismo fallo un piso más abajo**:
`documentos.archivo_url` también la escribe el navegador (`documentos_ins`/`documentos_upd` son
`is_admin()` sin restricción de columna), así que una `archivo_url` con cualquier ruta habría
hecho que este borrado destruyera un objeto arbitrario del bucket `clientes` — los documentos de
otro cliente. Las rutas se acotan ahora a `<eventoId>/`; lo que quede fuera no se borra y queda
auditado.

Y la prueba de comportamiento encontró que `getUserById` **resuelve con `{ error }`** en vez de
lanzar —el mismo comportamiento que ya obligó a arreglar `deleteUser`—, así que un corte de Auth
se auditaba como "ese usuario no existe". Rechaza igual, pero era una respuesta falsa sobre el
porqué.

### Archivos modificados
`api/_lib/guard.js`, `api/eliminar-evento.js`,
`src/components/admin/eventos/{EventoEliminar,EventoDatos}.jsx`, `scripts/test-contratos-api.mjs`,
`docs/{SEGURIDAD,BUGS_PENDING,CHANGELOG,FILE_MAP,NEXT_STEPS}.md`, `PROJECT_CONTEXT.md`.

### Contratos
**177 → 202.** Entre ellos el que vale para siempre: **ningún `deleteUser` fuera de `guard.js`**,
y dentro de `guard.js` el permiso se mira **antes**. Dos contratos previos se reescribieron
porque el mecanismo que afirmaban cambió a propósito (la carrera de `notificaciones` y el conteo
de invitados). Validados mutando: 21 mutaciones destructivas hacen fallar exactamente su
contrato, 1 inocua pasa. **Dos de los contratos nuevos eran vacuos y los descubrió la mutación,
no la lectura** — los dos anclaban a un texto que ya existía en otro sitio del mismo archivo.

### Lo que NO se tocó
Ninguna migración. Ninguna policy. Ninguna escritura en producción. Nada de `public` ni del bucket
`site-media`.

## 2026-08-04 — Bloque 8: borrar un evento, separar homónimos y los tres estados de una lectura

### Cambios realizados

**8B — Eliminar un evento (nuevo).** Lo único irreversible del panel, así que el orden de los
pasos es la pieza de diseño: **archivos primero** (los paths viven en `documentos.archivo_url`,
que cae por CASCADE — borrar la fila antes dejaría los archivos en el bucket sin ninguna asa),
luego las **huérfanas** (`notificaciones` y `operativo_ubicaciones` tienen la FK en SET NULL y
sobrevivirían con `evento_id = NULL`), luego **la fila**, y **el usuario de Auth al final**. Sin
confirmación negativa no se pasa al siguiente eslabón: `storage.remove` responde 200 con lista
vacía cuando una policy deniega, así que se compara lo pedido con lo devuelto, y los borrados
huérfanos se cuentan con `.select()` contra el inventario. La `reseña` **se conserva a
propósito** — es prueba social del salón, no del registro administrativo — y la pantalla lo dice.
Probado por ejecución en `BEGIN/ROLLBACK` con un evento de prueba con datos en las tres capas.

**Tres divergencias entre la base y lo que el código creía**, encontradas verificando
`information_schema.columns` antes de escribir una línea:

- `invitados` **no tiene `evento_id`** (solo `mesa_id`). Contarlos por `evento_id` habría dado
  `42703` — el mismo fallo que `correo-cliente` — y el inventario habría mostrado **0 invitados
  justo antes de un borrado irreversible**. Se cuentan uniendo por `mesas`.
- `operativo_ubicaciones` **no tiene `id`** (PK compuesta): se borra por `evento_id` y se
  confirma con `personal_id`.
- **8D está bloqueado**: la trazabilidad solicitud→evento necesita una columna que no existe
  (`eventos` no tiene `solicitud_id`, `solicitudes` no tiene `evento_id`). Requiere migración.

**8C — Los homónimos.** Medido en producción: **cuatro** eventos «Boda ortega» creados con 24
segundos de diferencia, con el **mismo** cliente, fecha, salón y creador. En la lista del panel
se pintan **idénticos**; el único distinto es el cuarto, que tiene la cuenta de portal. La
confirmación de 8B es "escribe el nombre exacto", y ese nombre **no identifica la fila**:
protege de borrar por accidente, no de borrar el equivocado. Tal como estaba, limpiar los
duplicados era una ruleta que podía llevarse el acceso del cliente. Ahora el endpoint devuelve
`homonimos` y `creadoEl`, el diálogo dice **cuál** se está borrando (hora de alta + si tiene
cuenta) y la lista marca los nombres repetidos.

**Los tres duplicados siguen en producción**: `1cf6b357`, `45c19b82`, `1e01d947`, cada uno con
1 fila de `evento_reglas_mesas` y 0 en todo lo demás, sin usuario de Auth y sin objetos en el
bucket. Se conserva `53f69d07` (`ortega-jch`). El borrado se hace con la maquinaria de 8B desde
el panel, **después** de que esto se despliegue — es también su prueba de fuego.

**8E — Cargando, vacío y falló dejan de ser la misma pantalla.** El shim devuelve `[]` cuando
la lectura falla, así que "todavía no ha llegado", "de verdad no hay nada" y "se cayó la lectura"
se pintaban las tres con el texto de vacío. `AdminAdministradores` era el caso límite: su estado
vacío decía literalmente *"Cargando equipo…"*. Dos hallazgos que **no son cosméticos**:

- **`AdminConfig` podía crear una segunda fila de configuración.** Leía con `list()`; un fallo
  devolvía `[]`, el componente tomaba la rama "no hay configuración" y pintaba el formulario
  **en blanco** con `configId = null`. Guardar desde ahí **creaba** otra fila en `config_sitio`,
  y el sitio lee la primera que devuelva Postgres: el teléfono y el correo del salón podían
  desaparecer sin que nadie borrara nada. `MesaReglas` tenía la misma forma (segunda fila de
  reglas para el mismo evento).
- **Pantallas colgadas en "Cargando…" para siempre**: `setCargando(false)` vivía *después* del
  `await`, así que un fallo dejaba `MesaEditor`, `EventoMeseros` y `AdminInicio` en el mensaje
  de carga sin nada que reintentar.

Piezas nuevas: `listEstricto` en el shim (aditivo, hermano de `filterEstricto`), el hook
`useCarga` (turno por lectura, para que una respuesta vieja no pise a una nueva) y
`src/components/ui/Estado.jsx` con esqueletos que tienen **la forma** del contenido.

**El orden dentro de `<Estado>` es la propiedad, no el estilo**: quien llama calcula `vacio`
desde `datos || []`, así que cuando la lectura falla `vacio` **también** es cierto. Si la rama
de vacío se mirara antes que la de error, el bug entero volvería. Hay un contrato para eso.

### Archivos modificados
`api/eliminar-evento.js` (nuevo), `src/components/admin/eventos/EventoEliminar.jsx` (nuevo),
`src/lib/useCarga.js` (nuevo), `src/components/ui/Estado.jsx` (nuevo),
`src/api/base44Client.js`, `src/components/admin/eventos/{AdminEventos,EventoDatos,EventoFicha,EventoDocumentos,EventoItems,EventoRsvps}.jsx`,
`src/components/admin/{AdminServicios,AdminAlimentos,AdminGaleria,AdminResenas,AdminAdministradores,AdminServicioItems,AdminAmenidadItems,AdminSalones,AdminSolicitudes,AdminInicio,AdminConfig}.jsx`,
`src/components/evento/{EventoCronograma,EventoMusica}.jsx`,
`src/components/mesas/{MesaEditor,MesaReglas,EventoMesasAdmin}.jsx`,
`src/components/meseros/EventoMeseros.jsx`,
`src/components/portal/{PortalContratado,PortalDocumentos}.jsx`,
`scripts/test-contratos-api.mjs`.

### Contratos
**146 → 177.** Los 31 nuevos, validados mutando la regresión real en el archivo real: 18
mutaciones destructivas hacen fallar exactamente el contrato que les toca, 2 inocuas pasan.

### Lo que NO se tocó
Ninguna migración. Ninguna escritura en producción (solo lecturas de verificación). Nada de
`public` ni del bucket `site-media` — el candado de Vero, intacto.

## 2026-08-04 — P0: el tipo de documento «comprobante» no existe en la base

### Cambios realizados

**El hallazgo.** `EventoDocumentos` ofrecía cuatro tipos de documento y `documentos_tipo_check`
admite tres. Elegir «comprobante» daba `23514` y la subida fallaba. `jardines.documentos` tenía
**0 filas**: ese flujo nunca funcionó desde el día uno. Es el **segundo** bug de la misma familia
que el estatus de solicitud del bloque 7.

**El barrido, antes de tocar nada.** Los **17 `CHECK`** de `jardines`, las **5** configuraciones
de Storage y los **8 `<select>`** del proyecto, cruzados uno a uno. Además del P0 conocido
aparecieron **tres casos que la auditoría no había visto**:

- `PortalDocumentos.jsx:10` tenía un icono mapeado a «comprobante» — un control muerto.
- `PortalShell.jsx:136` le prometía al cliente "y comprobantes".
- `EventoDocumentos.jsx:99` usaba `accept=".pdf,image/*"`, pero el bucket `clientes` solo admite
  `pdf/jpeg/png/webp/avif`. Un **HEIC de iPhone** pasa el selector y lo rechaza Storage.

**La consolidación.** `src/lib/catalogos.js` es ahora el único sitio donde vive una lista espejo
de la base. Migradas las seis que había sueltas. Un contrato prohíbe que un componente vuelva a
declarar la suya, y otro cruza cada lista contra la restricción que declara.

**`api/correo-cliente.js` nunca había funcionado** — hallazgo de la autoauditoría, no del brief.
Pedía `select("id, nombre, evento_id")` y la tabla tiene **`titulo`**. PostgREST responde
`42703`, el `error` se descartaba, `doc` quedaba en `null` y la guarda de pertenencia lo tomaba
por documento ajeno: **400 en todos los casos**. El botón "Avisar" del panel fallaba siempre y
dejaba en la auditoría un `documento_ajeno` que acusaba al admin de algo que no hizo. Es uno de
los cinco flujos de validación del dueño.

**Los dos P1 de la misma pantalla.** El huérfano en el bucket al fallar la subida (ahora se
compensa y se comprueba el `{borrado}`) y el `catch {}` vacío al borrar (ahora: primero la fila,
se confirma releyendo, y el archivo **solo** con confirmación negativa, criterio de 5A).

### Archivos modificados
`src/lib/catalogos.js` (nuevo), `src/components/admin/eventos/EventoDocumentos.jsx`,
`src/components/admin/eventos/_ui.jsx`, `src/components/admin/AdminSolicitudes.jsx`,
`src/components/admin/SalonPlanoUpload.jsx`, `src/components/mesas/{MesaEditor,MesaReglas}.jsx`,
`src/components/admin/eventos/AdminEventos.jsx`,
`src/components/portal/{PortalDocumentos,PortalShell}.jsx`, `api/correo-cliente.js`,
`scripts/test-contratos-api.mjs`.

### Entidades/BD afectadas
**Ninguna migración.** Solo lecturas y ensayos en `BEGIN/ROLLBACK`.

### Bugs resueltos
Cierra los hallazgos **P0-1, P1-1, P1-2 y P2-3** de `docs/AUDITORIA-FUNCIONAL.md` (el informe
**no se toca**: se anota aquí). Y uno que la auditoría no vio: `correo-cliente` roto de origen.

### Bugs nuevos
Ninguno.

### Próximo paso
Terminar el bloque 8 (8B–8E).


## 2026-08-03 (i) — Bloque 7: las cuatro cosas que encontró el dueño usando el panel

> Esta rama salió de `main` en `7596324`, antes de que se mergeara el commit `7768de2` del
> despliegue (entrada **(h)**, abajo). Los dos están ya en `main`: primero (h) — PR #7 — y
> encima este bloque — PR #6.

### Cambios realizados

**7A — el estatus de la solicitud no se podía cambiar. No era ninguna de las dos hipótesis.**
Se descartaron por medición contra producción: `authenticated` **sí** tiene el GRANT de UPDATE
sobre `jardines.solicitudes` (hipótesis A), y el `update` del shim **sí** comprueba `error` y lanza
(hipótesis B, el `[]` de J-02).

La causa real es un **desajuste de vocabulario**. `sec_07:124-126` puso un CHECK que admite
`Nueva, En proceso, Cotizada, Cerrada, Descartada`, y el panel seguía ofreciendo `En revisión`,
`Confirmada` y `Cancelada`. El único valor que coincidía era `Nueva`, así que **cualquier** cambio
violaba el CHECK con un 23514. Verificado por impersonación de admin en `BEGIN/ROLLBACK`: con
`Contactada` salta el constraint, con `En proceso` el UPDATE devuelve la fila.

Lo que lo hacía **invisible** sí era `updateStatus` sin `try/catch`: el shim lanzaba, la promesa
quedaba rechazada sin capturar, `load()` nunca corría y el desplegable volvía solo. **Sin
migración.** La lista del panel pasa a ser la de la base, `STATUS_COLORS` cubre los cinco —con los
nombres viejos el `<select>` se quedaba sin borde—, y el guardado captura, traduce el error a algo
accionable y confirma releyendo antes de decir que guardó.

**7B — la actividad del portal se borra, no se archiva.** Decisión del dueño. **Sin migración**, y
verificado antes de darlo por hecho: `authenticated` tiene DELETE y la policy `notificaciones_del`
lo permite a un admin. Ensayado por impersonación: como admin borra 3 de 21; como autenticado **no
admin** borra 0. A mano se puede quitar una o el grupo entero de un evento; a los 7 días lo hace el
cron, que cuenta lo **realmente** borrado con `.select("id")` y lo audita.

**`marcarLeidas` se queda**, y la razón está escrita en su cabecera: borrar es irreversible y el
dueño mira la actividad de la semana más de una vez; si la única forma de apagar el contador fuera
borrar, apagarlo costaría el historial. Son dos intenciones distintas — *ya lo vi* y *ya no lo
quiero*. Lo que sí se arregla es que hacía hasta 120 UPDATE sin `catch` y sin confirmar.

**7C — el resumen diario.** Solo reportaba las estancadas, así que el dueño no veía el trabajo que
entraba. Se añade el bloque de las últimas 24 h, **separado** del de estancadas: una pide respuesta
hoy, la otra se está enfriando. El digest ahora también sale cuando *solo* hay recientes. Cada
bloque lleva una línea de **qué hacer**, y un pie de mantenimiento con los avisos que borró la
limpieza de 7B — si deja de correr, se ve en el correo.

**7D — el aviso de nueva solicitud usa la plantilla dorada.** Era la única de las 7 rutas con
transporter propio y texto plano, señalado en la primera auditoría del proyecto. Ahora usa
`enviarCorreo()` + `plantillaOro()`; el cuerpo va en tablas con estilos en línea (Gmail borra el
`<style>` del `<head>`) y **todo** dato de la fila pasa por `escHtml`. Se conservan `replyTo` desde
la fila, el asunto con folio y nombre, y el texto plano como alternativa.

**Contratos 99 → 127**, los 28 validados mutando la regresión real. Tres fallaron su propia
mutación mientras los escribía y hubo que corregirlos: uno medía el `setOk("")` del reinicio en vez
del mensaje de éxito; otro dejaba colar un `setNotifs([])` antes de confirmar el borrado; el
tercero daba falso positivo al partir una cadena de supabase-js en varias líneas.

### Archivos modificados
Código: `src/components/admin/AdminSolicitudes.jsx`, `src/components/admin/AdminInicio.jsx`,
`api/cron-recordatorios.js`, `api/solicitud.js`, `scripts/test-contratos-api.mjs`.
Muestras: `docs/muestras/correo-resumen-diario.html`, `docs/muestras/correo-nueva-solicitud.html`.
Docs: `docs/CHANGELOG.md`, `docs/NEXT_STEPS.md`, `docs/DECISIONS.md`, `docs/BUGS_PENDING.md`.

### Entidades/BD afectadas
**Ninguna migración.** El diagnóstico de 7A descartó la necesidad de `sec_25`. Solo consultas de
lectura y ensayos en `BEGIN/ROLLBACK`; producción quedó en las mismas 21 notificaciones.

### Bugs resueltos
El estatus de la solicitud (**J-08**), la actividad del portal que no se podía quitar y crecía sin
límite (**J-09**), el resumen diario que solo reportaba lo estancado, y el correo de solicitud
fuera del sistema de plantillas.

### Bugs nuevos
Ninguno.

### Decisiones tomadas
D-COD-16 (la lista de estatus la manda la base), D-COD-17 (borrar y "marcar leída" conviven, y por
qué). Ver `docs/DECISIONS.md`.

### Próximo paso
Desplegar y que el dueño confirme en pantalla el cambio de estatus y el borrado de actividad.
## 2026-08-03 (h) — Despliegue de los bloques 3–6 a producción

### Cambios realizados

**Sin cambios de código.** El único archivo nuevo es `docs/VALIDACION.md`.

**Merge y deploy.** PR #5 mergeado a `main` (`7596324`). Vercel desplegó
`dpl_B2tz9uFpuG33uepb7tAhCHH8DbMQ` en estado **READY**, 7 funciones serverless, alias
`jardines-club-hipico.vercel.app`. Bundle nuevo `index-B3L6RvCm.js`.

**Verificado antes de mergear.** Las 23 migraciones `sec_01..24` presentes (sin `sec_10`, que
nunca existió: su trabajo lo hizo `sec_20`); `sec_23` con 0 RPCs residuales vivas y `sec_24` con
su columna y su índice. **Vero intacto:** `public` con 4 funciones, `admin_users` con su fila,
bucket `site-media` con sus 2 objetos. RLS activo en las 32 tablas de `jardines`. `dist/` sin
ningún secreto ni JWT.

**Verificado después.** Las 6 cabeceras de `vercel.json` aplicándose y `Cache-Control: no-store`
en `/api/*`. Las 7 funciones responden con su guard (405 al método, 401/400 al cuerpo). Las 7
rutas de la SPA sirven. **El formulario público funciona de punta a punta**: RPC → folio del
servidor `JCH-828EF1` → fila en `solicitudes` → correo enviado, con `solicitud_crear` **ok** y
`solicitud_correo` **ok** en la auditoría.

**La CSP nueva, comprobada de forma exhaustiva.** El bloque 3 quitó `https://i.imgur.com` del
`img-src`. Se cruzaron **las 279 URLs de medios que la base sirve de verdad** (11 columnas de 8
tablas) contra la CSP desplegada: **0 de imgur, 0 de base44**, 272 relativas al mismo origen y 1
de `drive.google.com` que es un `<a href target="_blank">` de admin, no un subrecurso — CSP no
aplica a una navegación. Las **228 rutas distintas** de `/media/` se comprobaron una a una contra
producción: **228 sirven 200, 0 rotas**. Y el bundle desplegado no contiene ninguna referencia a
imgur.

> Se intentó la comprobación en navegador (consola, violaciones de CSP) pero **Chromium no
> atraviesa el proxy de la sesión** — falla contra cualquier host, incluido `example.com`. Se
> sustituyó por el cruce de arriba, que cubre más: incluye contenido que un render puntual de la
> home ni siquiera monta.

**Menú.** Los 9 identificadores (`inicio, salones, servicios, amenidades, como-funciona, galeria,
faq, contacto, no-incluye`) más `Portal de clientes` están en el bundle desplegado.
`como-funciona` y `faq` — las dos que el bloque 3 añadió — presentes.

**`docs/VALIDACION.md`**: guion para el dueño, sin jerga, con las cinco pruebas (qué hacer, qué
debe pasar, cómo saber que falló y dónde mirar), más un anexo con las dos pantallas nuevas.

### Archivos modificados
`docs/VALIDACION.md` (nuevo), `docs/CHANGELOG.md`, `docs/NEXT_STEPS.md`, `PROJECT_CONTEXT.md`.

### Entidades/BD afectadas
**Ninguna migración.** Una fila de prueba en `jardines.solicitudes` (folio `JCH-828EF1`, nombre
`PRUEBA DEPLOY`), marcada como tal y borrable.

### Bugs resueltos
Ninguno. Ninguno nuevo tampoco.

### Bugs nuevos
Ninguno. Sí queda anotado un **impedimento de datos**, no de código: **no hay ningún evento con
`operativo_activo`**, así que la pantalla de asignación no se puede ejercitar más allá del
guardarraíl hasta que se encienda ese interruptor — que no se maneja desde el panel (**J-07**).
No se encendió: cambia quién ve qué en producción.

### Próximo paso
Que Miguel siga `docs/VALIDACION.md`.


## 2026-08-03 (g) — Bloque 6: contratos que sí comprueban lo que dicen

### Cambios realizados

Un auditor mutó los 16 contratos que añadió el bloque 5, uno a uno, **reintroduciendo la
regresión real en el archivo real**. Tres no atrapaban nada, uno era frágil, dos propiedades no
tenían contrato y uno estaba acoplado al formato. Ninguno era un fallo de producto: **el código
de 5A y 5B es correcto**. Lo que fallaba era la red que debía sostenerlo.

**El patrón, uno solo:** un `grep` de identificador suelto sobre todo el archivo. Si el
identificador aparece en dos sitios, borrar el que importa deja vivo el otro y el contrato pasa
igual. Es exactamente lo que se detectó y corrigió en 5C con `idsActivos` / `inertesDe` — pero
quedaban tres iguales sin revisar.

**6A — los tres vacuos.** `imagenPlanoPath` sobrevivía en las dos lecturas, así que quitarlo de
la **escritura** pasaba 94/94 y cada reemplazo volvía a dejar un huérfano público sin asa.
`inertesDe` afirmaba "visibles y revocables" sin mirar la UI: borrar el bloque JSX que las pinta
—o solo la definición— pasaba igual. `ocupadaPersona` pasaba con el `disabled` viejo restaurado,
que es la carrera literal. Ahora se atan a la escritura, al render + handler, y al `disabled`.

**6B — el frágil, los dos agujeros, el formato y los márgenes.** La carga estricta del operativo
la satisfacía un `filterEstricto` de otra función. Nadie comprobaba el filtro `operativoActivo:
true` del que sale `idsActivos`, así que quitarlo reintroducía la regresión **completa** de 5B con
los contratos en verde. `quitar` comprobaba **proximidad** entre `confirmar()` y `borrarObjeto`,
no gobierno: dejando la llamada y quitando las dos guardas, el archivo se borraba pase lo que
pase con la fila. El contrato de las medidas fallaba al partir el mismo `if` en tres líneas. Y
los dos márgenes estrechos (uno medía distancia en caracteres, el otro se sostenía sobre el
texto de un `console.error`) **se endurecieron en vez de documentarse**: ahora se afirma sobre el
orden y sobre el cuerpo del método.

**Método, ahora escrito** en `docs/PROMPTS.md` §9 y en `CLAUDE.md`, más la cabecera del helper
`entre()` de la propia suite. Es el cuarto bloque en que aparece el mismo error; dejarlo en la
cabeza de una sesión no sirvió.

**15 mutaciones ejecutadas**, cada una aplicada al archivo real, comprobada como aplicada,
corrida contra la suite y restaurada con `git checkout --`. Trece debían fallar y fallaron; dos
(partir el `if` en tres líneas, reescribir el texto del `console.error`) debían **pasar** y
pasaron — la comprobación de que no se cambió fragilidad por falsos positivos.

### Archivos modificados
`scripts/test-contratos-api.mjs` (único archivo de código).
Docs: `CLAUDE.md`, `PROJECT_CONTEXT.md`, `README.md`, `docs/PROMPTS.md`, `docs/CHANGELOG.md`,
`docs/NEXT_STEPS.md`, `docs/FILE_MAP.md`, `docs/ARCHITECTURE.md`, `docs/DEPLOY.md`.

### Entidades/BD afectadas
**Ninguna. Sin migraciones.** No se tocó `src/` ni `api/`.

### Bugs resueltos
Ninguno de producto. Se cierra un fallo de la red de pruebas: 7 contratos que no comprobaban lo
que su nombre afirmaba.

### Bugs nuevos
Ninguno.

### Decisiones tomadas
D-COD-15 (ver `docs/DECISIONS.md`).

### Próximo paso
Validación humana autenticada de los 5 flujos. Sigue siendo lo único que queda.


## 2026-08-03 (f) — Bloque 5: el `[]` ambiguo y sus dos consecuencias

### Cambios realizados

Los dos defectos del bloque 4 compartían causa: **`runQuery` devuelve `[]` tanto cuando no hay
filas como cuando la lectura falla** (J-02, que se dejó abierto a propósito). Ese `[]` ya estaba
produciendo daño en dos sitios.

**5A — el rollback del plano podía destruir una escritura que sí ocurrió.** Si el `update` cuajaba
y la relectura fallaba, `guardado` era `null` → `throw` → el `catch` borraba del bucket **el
archivo que la fila acababa de referenciar**: fila apuntando a un archivo inexistente, plano
anterior huérfano sin asa, y un mensaje falso ("la base no aceptó el cambio"). El espejo en
`quitar` era peor: borraba el archivo y limpiaba la UI aunque la fila siguiera viva.
Ahora `confirmar()` devuelve **tres** estados y el rollback solo actúa con "no". Con
"desconocido" no se borra nada y se dice la verdad. La lectura de confirmación no pasa por
`runQuery`: se añade `entities.X.filterEstricto()`, que propaga el error.

**Permiso de borrado en `planos`, comprobado:** el admin **sí puede**. La policy
`planos admin escribe` es `cmd = ALL` para `authenticated` con `is_admin()`, y `ALL` cubre DELETE.
Así que la limpieza de huérfanos del bloque 4 sí estaba pasando. Corregido `DECISIONS.md`, que
atribuía esa policy a `sec_07`: `sec_07` solo fija límites y **dropea** la vieja. La policy vigente
vive en el dashboard, no en el repo — deuda anotada.
Y `storage.remove` distingue "borró" de "no borró nada": la Storage API responde 200 con lista
vacía si una policy lo deniega, así que el fallo era mudo.

**5B — el guardarraíl contaba asignaciones que no dan acceso.** El OR de `sec_14` exige
`operativo_activo = true` **antes** del OR, así que una asignación a un evento cerrado no da
acceso a nada. Contarlas rompía las tres cosas para las que existe la pantalla: el bloqueo se
saltaba (persona con `acceso_global` + 1 asignación inerte → el admin apagaba el acceso y quedaba
en 0 eventos), el "estado efectivo" nunca podía decir "sin acceso", y el aviso al revocar no
disparaba. Se cruza contra los eventos activos, y las asignaciones inertes pasan a ser **visibles
y revocables** — antes eran invisibles e irrevocables, y se acumulaban alimentando el bypass.
Más: carrera del botón global, carga que confundía "vacío" con "falló", estado que se pisaba
antes de validar, y un texto que mandaba a un control inexistente.

**5C — cobertura.** Ninguna de las dos pantallas tenía un solo contrato. **+16 (78 → 94)**.

> **Corrección (bloque 6).** Esta entrada decía que cada uno de los 16 se había **verificado
> reintroduciendo su regresión**. No era exacto, y la diferencia importa porque es justo la
> afirmación en la que se apoyaba la confianza en la suite.
>
> Lo que de verdad pasó: muté **algunos** mientras los escribía, encontré uno vacuo
> —buscaba `idsActivos` en todo el archivo y `inertesDe` también lo menciona— y lo até a la
> definición de `vigentesDe`. **No muté los dieciséis uno a uno.**
>
> La auditoría posterior sí lo hizo y encontró **3 que no atrapaban nada**
> (`imagenPlanoPath`, `inertesDe`, `ocupadaPersona`), **1 frágil** (la carga estricta del
> operativo), **2 agujeros** (nadie comprobaba el filtro `operativoActivo: true` del que sale
> `idsActivos`, ni que las guardas de `quitar` gobernaran el borrado) y **1 acoplado al
> formato**. Todos por el mismo motivo que el que sí corregí. Cerrados en el bloque 6, esta
> vez mutando **cada uno** de los contratos tocados.

### Archivos modificados
Código: `src/api/base44Client.js` (`filterEstricto`, `storage.remove`),
`src/components/admin/SalonPlanoUpload.jsx`, `src/components/admin/AdminOperativo.jsx`,
`scripts/test-contratos-api.mjs`.
Docs: `docs/BUGS_PENDING.md`, `docs/DECISIONS.md`, `docs/NEXT_STEPS.md`, `docs/CHANGELOG.md`.

### Entidades/BD afectadas
**Ninguna. Sin migraciones.** Solo consultas de lectura para verificar las policies de Storage.

### Bugs resueltos
El rollback destructivo del plano y el bypass del guardarraíl del operativo.

### Bugs nuevos
Ninguno. Documentados dos que ya existían: **J-06** (el guardarraíl es solo de cliente: cualquier
admin puede apagar `acceso_global` desde Studio) y **J-07** (`operativo_activo` no se maneja desde
el panel, que es la causa de que existan asignaciones inertes).

### Decisiones tomadas
D-COD-13, D-COD-14 (ver `docs/DECISIONS.md`).

### Próximo paso
Validación humana autenticada de los 5 flujos. Es lo único que queda.


## 2026-08-03 (e) — Bloque 4: regresión, tipado, plano endurecido y asignación de personal

### Cambios realizados

**4A — la regresión de la unificación de idempotencia (bloqueante).** El corte por `duplicado`
devolvía `{ok, duplicado}`, otra forma que el camino de éxito. Las tres rutas de correo tienen
llamadores que solo miran `res.ok`, pero `crear-usuario-evento` y `crear-admin` **leen campos del
cuerpo**: el panel escribía `usuario: undefined` y volvía a pedir credenciales para un evento que
ya las tenía — peor que antes del cambio. Arreglado en el **servidor**: el corte relee la fila y
devuelve la misma forma, así que un llamador futuro que olvide mirar `duplicado` tampoco se rompe.
`correoEnviado` no se inventa. Y se documenta la asimetría `en_curso → 429` en las rutas de alta
(D-COD-8). **+7 contratos** (71 → 78).

**4B — tipado estricto del shim.** `Record<string, …>` aceptaba cualquier nombre, así que apagaba
la detección de typos de entidad — y el shim tampoco protege: un typo consulta una tabla
inexistente y devuelve `[]`, o sea **lista vacía en silencio**. Ahora `Record<keyof typeof TABLES, …>`,
con cast en el argumento del Proxy. Línea base **sigue en 59**.

**4C — plano por salón.** El grave era **reasignación cruzada**: sin `key`, al pasar del salón A al
B se seguía viendo el plano de A con los botones activos, y "Reemplazar" movía la fila de A al
salón B. Arreglado con `key` + reset de estado + gate por `cargando`. `sec_24` añade el índice
único por salón y `imagen_plano_path` (sin él, cada reemplazo dejaba un huérfano descargable en un
bucket público, imposible de localizar). Quitar el plano ahora borra también el archivo. Las
medidas no se escriben si no se pudieron leer.

**4D — asignación de personal a eventos** (la 3E pendiente). Frontend sobre lo que ya existe.
`AdminOperativo` muestra el estado efectivo con la misma lógica del **OR** de `sec_14` y
**bloquea** apagar `acceso_global` a quien tenga 0 asignaciones vigentes: hoy los 3 operativos
están justo en ese caso, y un toggle ingenuo los dejaría sin acceso en pleno evento. Revocar es
`revocada_at`, nunca `DELETE`. `operativo_asignacion` tiene PK compuesta sin `id`, así que va por
un módulo aditivo del shim (`base44.asignaciones`), no por `entities`.

**4E — higiene.** Numeración de bugs unificada en **`J-##`** (había dos esquemas `B*` que
colisionaban), `Sidebar.jsx` deja de aparecer como existente, y `NEXT_STEPS` queda como estado
real de cierre.

### Archivos modificados
Código: `api/crear-usuario-evento.js`, `api/crear-admin.js`, `src/api/base44Client.js`,
`src/components/admin/eventos/EventoDatos.jsx`, `src/components/admin/AdminAdministradores.jsx`,
`src/components/admin/SalonPlanoUpload.jsx`, `src/components/admin/AdminSalones.jsx`,
`src/components/admin/AdminOperativo.jsx` (nuevo), `src/components/admin/AdminDashboard.jsx`,
`scripts/test-contratos-api.mjs`.
SQL: `supabase/migrations/…_sec_24_…sql` (nueva).
Docs: `CLAUDE.md`, `README.md`, `PROJECT_CONTEXT.md` y todo `docs/`.

### Entidades/BD afectadas
`sec_24`: columna `salon_planos.imagen_plano_path` + índice único `salon_planos_salon_id_uniq`.
Aditiva. **`public` (Vero) 4 → 4 funciones, sin cambios.** Ninguna policy ni grant modificados.
**El estado del operativo no cambió:** 3 personas, 3 con `acceso_global`, 0 asignaciones.

### Bugs resueltos
La regresión de 4A; el tipado laxo de 4B; los 5 riesgos del plano (4C).

### Bugs nuevos
Ninguno. Renumerados los abiertos: **J-01** … **J-05**.

### Decisiones tomadas
D-COD-7 … D-COD-12. D-COD-4 y D-COD-6 marcadas como **corregidas** por D-COD-7 y por 4B.

### Próximo paso
Validación humana autenticada de los 5 flujos. Es lo único que queda.


## 2026-08-03 (d) — Bloque 3: código (fases 3A–3D; **3E no hecha**)

### Cambios realizados

**3A — 12 hallazgos de código.**
- **S1 (P0).** El token de `/invitacion/:token` se generaba con
  `crypto.randomUUID ? … : "inv-" + Date.now() + Math.random()`. Ese token **es** la credencial y
  se guarda en claro: en la rama de fallback era adivinable. Se extrae el generador bueno de
  `EventoMeseros` a `src/lib/tokenSeguro.js` (256 bits de `crypto.getRandomValues`) y lo importan
  ambos. **Sin fallback:** si no hay WebCrypto lanza con mensaje al usuario.
- **B1.** `AdminSolicitudes` leía `s.created_date`, que el shim nunca produce (convierte
  `created_at` → `createdAt`): el fallback era código muerto y toda solicitud sin `fecha_envio`
  mostraba `—` para siempre. El `list("-created_date")` **no** se tocó: ese sí lo traduce el shim.
- **B3.** `guard.js` no tenía entrada `503`, así que el 503 de `canjear-acceso` llegaba como
  "Error" a secas justo cuando el cliente estrena su enlace y el fallo es transitorio.
- **B4.** `anticipoPagado` era un latch de un solo sentido. Ahora se deriva del monto.
- **L1/L2/L4/L5.** Borrados 4 huérfanos y `cajaCredenciales()`; el JSON-LD apunta a la copia
  auto-hospedada e `i.imgur.com` sale de la CSP; las 5 rutas cortan igual en `duplicado`.

**3B — menú.** `#como-funciona` y `#faq` existían en el DOM pero no en `MENU_ITEMS` ni en
`SECTIONS`: eran secciones de conversión inalcanzables y el indicador de sección activa se
quedaba pegado. Añadidas en el orden real del `<main>`.

**3C — `sec_23`.** Retiradas `info_mesa_publica`, `api_idempotencia` y `canjear_acceso_unico`.
Y `seguridad.sql` pasa a probar las **vigentes**: hasta ahora probaba las superadas, así que la
idempotencia recuperable y el canje en dos fases solo tenían cobertura textual (cierra B6).

**3D — plano por salón.** `SalonPlanoUpload` en `AdminSalones`, al bucket `planos`. Sin
migración: las policies ya existían. Añadido `storage.publicUrl` al shim (aditivo).

**Efecto lateral de 3D:** la línea base de `typecheck` baja de **155 a 59** al tipar el Proxy
`entities` (anotación JSDoc, cero runtime). El umbral castigaba escribir código correcto: cada
componente nuevo que usara el shim sumaba errores.

### Archivos modificados
Código: `src/lib/tokenSeguro.js` (nuevo), `src/components/admin/SalonPlanoUpload.jsx` (nuevo),
`src/components/portal/PortalInvitacion.jsx`, `src/components/meseros/EventoMeseros.jsx`,
`src/components/admin/AdminSolicitudes.jsx`, `src/components/admin/AdminSalones.jsx`,
`src/components/admin/eventos/EventoDatos.jsx`, `src/pages/Home.jsx`, `src/api/base44Client.js`,
`api/_lib/guard.js`, `api/_lib/correo.js`, `api/crear-admin.js`, `api/crear-usuario-evento.js`,
`index.html`, `vercel.json`. Borrados: `Sidebar.jsx`, `HeroTrustBar.jsx`,
`FormularioSection.jsx`, `ItemImageOverlay.jsx`.
SQL: `supabase/migrations/…_sec_23_…sql` (nueva), `supabase/tests/seguridad.sql`.
Docs: `CLAUDE.md`, `README.md`, `PROJECT_CONTEXT.md` y todo `docs/`.

### Entidades/BD afectadas
`sec_23` retira 3 funciones de `jardines`. Funciones de `jardines` 44 → 41; **`public` (Vero)
4 → 4, sin cambios**. Ninguna tabla, columna, policy ni grant modificados.

### Bugs resueltos
S1, B1, B3, B4 (código); B6 (suite probaba las RPC superadas); B7 (imgur en el JSON-LD).

### Bugs nuevos
Ninguno. B3 (**UI de asignación de personal**) sigue abierto: era la fase 3E, no hecha.

### Decisiones tomadas
D-COD-1 … D-COD-6 (ver `docs/DECISIONS.md`). **D-COD-2 queda como decisión pendiente:** los
tokens de invitación y de mesa siguen guardándose en claro.

### Próximo paso
Validación humana autenticada de los 5 flujos. Después, la fase 3E.


## 2026-08-03 (c) — Inventario de grants por nivel + hallazgos deferidos

### Cambios realizados

**Bloqueante — regresión introducida por el bloque (b).** Al corregir el hallazgo 4, `DATABASE.md`
pasó a afirmar que las RPCs ejecutables por `anon` eran **las únicas 4**. Son **8**: el bloque D.5
de `sec_06` concede `execute … to anon, authenticated` sobre siete funciones y `sec_13` añade
`solicitud_crear`. Las cuatro omitidas (`info_invitacion_staff`, `registrar_acceso_staff`,
`progreso_mesas_staff`, `registrar_llegada_mesa`) estaban agrupadas bajo una etiqueta que sugería
sesión, mezcladas con otras que sí la exigen.

**§D reestructurado por `EXECUTE` real**, en tres niveles, verificado contra
`pg_proc`/`aclexplode` en producción:

- **Nivel 1 — `anon` + `authenticated` (8):** subdividido en "abiertas al público" (4) y "exigen
  además token de staff válido" (4). Estas últimas se comportan bien —resuelven por
  `evento_por_staff`, con rate limit y respuesta genérica— pero **el grant no las distingue** de
  las abiertas: el staff opera sin sesión, con el token en la URL del QR. Se anota explícitamente.
- **Nivel 2 — solo `authenticated`:** helpers de RLS, `info_invitacion`, `operativo_*`,
  `registrar_acceso` y las de admin cuyo rol comprueba el cuerpo, no el `EXECUTE`.
- **Nivel 3 — solo `service_role`**, más las residuales y las funciones de trigger.

El criterio es el inventario por grant porque la pregunta de toda revisión de seguridad es
*"¿qué alcanza alguien sin sesión?"*, y agrupar por sensación de acceso la responde mal.

**Hallazgos deferidos del primer informe:**

- **Nuevo §D.bis en `DATABASE.md`:** `api_idempotencia`, `canjear_acceso_unico` e
  `info_mesa_publica` siguen vivas sin llamadores, y **`seguridad.sql` prueba las dos primeras en
  vez de las vigentes** — la idempotencia recuperable y el canje en dos fases solo tienen
  cobertura textual. Abierto como B6; el `DROP` va en un bloque aparte con verificación previa.
- **Cuarto huérfano:** `ItemImageOverlay.jsx` (0 imports). Son 4, no 3.
- **`seed-supabase.mjs` no toca la base:** sin `supabase-js`, sin env, sin red — genera
  `scripts/seed/*.sql`. Corregido en `CLAUDE.md`, `ARCHITECTURE.md`, `DATOS.md`, `FILE_MAP.md`.
- **`build-media.mjs` descarga 571 MB por red** desde `i.imgur.com` y `media.base44.com`, un CDN
  que puede desaparecer. Advertido donde se documentaba solo como generador de JSON.
- **Última dependencia de imgur:** `index.html` sirve el logo del JSON-LD desde `i.imgur.com` y la
  CSP lo autoriza solo por eso, pese a que el activo ya está auto-hospedado. Documentado en D3 y
  abierto como B7 (el arreglo es código: bloque aparte).
- **`SITIO_URL` hardcodeada** al dominio de Vercel: todos los correos enlazan ahí. B8, ligado al
  pendiente de dominio.
- **La CSP conserva `'unsafe-inline'`** en `script-src` y `style-src`: no protege contra XSS
  inline, solo acota orígenes. Anotado como deuda en `ARCHITECTURE.md`.
- **`functions.invoke()` falla en silencio:** solo reconoce dos nombres y devuelve `{}` con
  cualquier otro. Las demás rutas usan métodos propios.
- **Estado unificado:** "resuelto en código y migraciones, pendiente de validación humana", y se
  separa lo que el repo prueba de lo que solo afirma sobre producción. **No hay CI: no existe
  `.github/`.**
- **Datos personales retirados** (`PROMPTS.md` §regla de secretos): correo en `DECISIONS.md` —que
  además estaba mal, era `MAIL_TO`, no el remitente— y la org en `PLAN-EJECUCION.md`.
- **Higiene:** `SEGURIDAD.md` y los 4 docs de UI añadidos a la lista obligatoria de `PROMPTS.md`;
  8 componentes montados que faltaban en `COMPONENTES.md` y `_ui.jsx` en `FILE_MAP.md`;
  `FormularioModal` son 2 pasos y solo consume `Salon`; `informacionServicios` **sí** tiene
  contenido (465 caracteres, 3 párrafos en producción); orden real del `<main>` en `MAPA.md`;
  `search_path` en **7** funciones, no 10; repo **586 MB** e `img/` **230** archivos;
  `GEMINI_API_KEY` documentada; `proximamente_fecha` marcada huérfana; el módulo operativo
  **entero** sin frontend; batería de `DEPLOY.md` con `seguridad.sql`; los **dos** bloques JSON-LD.

### Archivos modificados
`CLAUDE.md`, `PROJECT_CONTEXT.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`,
`docs/FILE_MAP.md`, `docs/DATOS.md`, `docs/MAPA.md`, `docs/COMPONENTES.md`, `docs/DEPLOY.md`,
`docs/DECISIONS.md`, `docs/PROMPTS.md`, `docs/NEXT_STEPS.md`, `docs/BUGS_PENDING.md`,
`docs/PLAN-EJECUCION.md`, `docs/CHANGELOG.md`.

### Entidades/BD afectadas
Ninguna. **Sin migraciones.** Solo consultas de lectura para verificar grants,
`informacion_servicios` y `proximamente_fecha`.

### Bugs resueltos
La regresión del inventario de RPCs. Documentación que describía al revés dos scripts
(`seed-supabase`, `build-media`), que daba por genérico un `invoke()` que falla en silencio, y
que se contradecía sobre el estado del proyecto.

### Bugs nuevos
Ninguno introducido. **Detectados y documentados:** B6 (la suite prueba las RPCs superadas),
B7 (dependencia de imgur), B8 (`SITIO_URL` hardcodeada).

### Decisiones tomadas
D3 ampliada con la excepción de imgur y con que `build-media` no es offline.

### Próximo paso
Validación humana autenticada de los 5 flujos (`docs/NEXT_STEPS.md` §1).

## 2026-08-03 (b) — Correcciones de la auditoría de documentación sobre `370ee5c`

### Cambios realizados
Seis afirmaciones de la reescritura anterior mandaban a alguien al archivo equivocado o a
confiar en una protección inexistente. Todas verificadas contra el código y la base antes de
corregirlas:

1. **El "fallback estático" no existe.** `site-data.json` no lo importa nadie en `src/` ni en
   `api/` (0 resultados): solo alimenta `scripts/seed-supabase.mjs` y `scripts/montage.mjs`. El
   único JSON vivo es `resenas.json` (`Confianza.jsx`). **Si Supabase cae, el sitio se renderiza
   vacío** — riesgo real que la doc anterior ocultaba. Corregido en los 10 sitios donde aparecía.
2. **El menú lateral ya no es `Sidebar.jsx`** (huérfano, 0 imports). El real es `StaggeredMenu`,
   con los items en `MENU_ITEMS` de `Home.jsx`.
3. **Los estilos globales no viven en `Layout.jsx`** (son 10 líneas, solo el fondo). Están en
   `src/styles/theme.css`, importado en `main.jsx` — por eso aplican también al portal, al admin
   y a `/acceso`. Ese archivo **no aparecía en ningún documento**; ahora está en `FILE_MAP.md`.
4. **Tres RPCs mal clasificadas:** `info_invitacion` es de `authenticated`, no pública;
   `info_mesa_publica` está revocada para `anon`/`authenticated` y su cuerpo **no** tiene rate
   limit ni error genérico (al revés de lo que decía la doc); `revocar_acceso_unico` es de
   `service_role`, no de admin.
5. **`VITE_ADMIN_SLUG` y `VITE_SUPABASE_URL` no son solo del build:** cuatro rutas de `api/` las
   leen en runtime. Documentado, con el aviso de que cambiar el slug sin exponerlo al runtime de
   las funciones deja todos los enlaces al panel de todos los correos apuntando al valor viejo.
6. **`DECISIONS.md` D1/D2/D3** quedaron sin sello. D1 marcada SUPERADA; D2 y D3 marcadas con su
   estado real (ver "Discrepancias" abajo).

**Y el agujero en la suite:** la aserción B6 de `supabase/tests/seguridad.sql` excluía
`solicitudes` del invariante "`anon` sin INSERT/UPDATE/DELETE" con
`count(*) filter (where table_name <> 'solicitudes') = 0`. Era un resto de la ventana de
compatibilidad que `sec_21` cerró: la suite habría pasado igual si alguien reintrodujera
escritura pública sobre esa tabla, y `CLAUDE.md` presenta esa prueba como la garantía del
invariante. Ahora es `count(*) = 0` sin filtro.

### Discrepancias con la auditoría (no aplicadas, a propósito)
- **D2 y D3 no son "SUPERADA".** D2: la decisión de conservar la API del shim sigue vigente; lo
  superado es el "100% local". D3: los medios **siguen** auto-hospedados en `public/media/`
  (videos del hero, 241 frames, flyer), solo que ahora los uploads del CMS van a Storage. Se
  sellaron con su estado real en vez de marcarlas obsoletas.
- El informe `docs/auditoria/AUDITORIA-DOCS-370ee5c.md` **no está en el repo**, así que cada
  hallazgo se verificó de forma independiente contra el código y la base.

### Archivos modificados
`CLAUDE.md`, `PROJECT_CONTEXT.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`,
`docs/FILE_MAP.md`, `docs/DATOS.md`, `docs/MAPA.md`, `docs/COMPONENTES.md`, `docs/DEPLOY.md`,
`docs/DECISIONS.md`, `docs/PROMPTS.md`, `docs/CHANGELOG.md`, `docs/BUGS_PENDING.md`,
`supabase/tests/seguridad.sql`.

### Entidades/BD afectadas
Ninguna. **No se aplicó ninguna migración.** Solo consultas de lectura para verificar grants y
la aserción B6.

### Bugs resueltos
Documentación que mandaba al archivo equivocado (`Sidebar.jsx`, `Layout.jsx`) y que prometía dos
protecciones inexistentes (fallback ante caída de Supabase; rate limit en `info_mesa_publica`).
Más el agujero de la suite B6.

### Bugs nuevos
Ninguno introducido. **Detectado y documentado:** no hay fallback si Supabase no responde
(ver `docs/BUGS_PENDING.md`).

### Decisiones tomadas
Sello de estado en D1 (SUPERADA), D2 y D3 (vigentes, con matiz).

### Próximo paso
Validación humana autenticada de los 5 flujos (`docs/NEXT_STEPS.md` §1).

## 2026-08-03 — Documentación viva reescrita para transferencia

### Cambios realizados
- Reescritos los documentos que aún describían la etapa **estática** (FASE-01) bajo un banner de
  "esto ya no es cierto": `PROJECT_CONTEXT.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`,
  `docs/DATOS.md` y `docs/PROMPTS.md`. Ahora el cuerpo describe la realidad: base de datos viva
  en Supabase, portal, panel, rutas serverless y modelo de permisos.
- **`docs/FILE_MAP.md` reescrito por completo** — llevaba sin actualizarse desde FASE-01 y no
  mencionaba `api/`, `supabase/`, el portal, las mesas ni el módulo operativo.
- `CLAUDE.md` ampliado: candado de Vero, regla de secretos, orden de despliegue, reglas de RLS y
  `SECURITY DEFINER` para tablas y funciones nuevas, y la batería que debe pasar antes de subir.
- `PROJECT_CONTEXT.md` reestructurado en las 15 secciones del prompt de transferencia.
- `docs/PROMPTS.md`: se guardó el **prompt fijo de documentación viva** (el que se usa para
  transferir el proyecto a otra cuenta o IA) y se reescribió el prompt de arranque, que todavía
  decía "el sitio es estático".
- `docs/DECISIONS.md`: añadidas D-SEC-6 … D-SEC-11 (idempotencia recuperable, semántica
  at-least-once, canje en dos fases, retiro del token en claro, pruebas de contrato, operativo
  fail-closed) y D-DOC-1 / D-DOC-2.
- `docs/BUGS_PENDING.md` y `docs/NEXT_STEPS.md` reorganizados; se marcó obsoleto el bug B1
  ("el panel no persiste"), que dejó de ser cierto en FASE-02.
- `docs/SEGURIDAD.md`: corregido el encabezado — son `sec_01..22` y el estado real es
  `ESPERANDO_VALIDACION_HUMANA_AUTENTICADA`, no "CERRADO".

### Archivos modificados
`CLAUDE.md`, `PROJECT_CONTEXT.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`,
`docs/FILE_MAP.md`, `docs/DATOS.md`, `docs/PROMPTS.md`, `docs/DECISIONS.md`,
`docs/BUGS_PENDING.md`, `docs/NEXT_STEPS.md`, `docs/CHANGELOG.md`, `docs/SEGURIDAD.md`.

### Entidades/BD afectadas
Ninguna. Solo lectura de la base para verificar el esquema documentado (32 tablas en
`jardines`, 6 en `jardines_private`, 55 funciones, 5 buckets).

### Bugs resueltos
Documentación contradictoria: el aviso decía "hay base de datos" y el cuerpo decía "no hay base
de datos en vivo". Una IA que leyera el cuerpo habría trabajado con premisas falsas.

### Bugs nuevos: ninguno.

### Decisiones tomadas: D-DOC-1, D-DOC-2 (ver `docs/DECISIONS.md`).

### Próximo paso
Validación humana autenticada de los 5 flujos (ver `docs/NEXT_STEPS.md` §1).

## 2026-08-02 — Cierre del blindaje (migraciones `jardines_sec_11..22`)

### Cambios realizados
- **Token de staff retirado en claro (`sec_20`).** La columna `eventos.staff_token` ya no
  existe: solo queda el HMAC. La rotación devuelve el token **una sola vez** y el panel no puede
  reconsultarlo; tras recargar ofrece "Generar nuevo enlace".
- **INSERT público de `solicitudes` retirado (`sec_21`)** una vez desplegado el frontend que usa
  la RPC. `anon` ya no escribe directo en ninguna tabla.
- **Rutas `api/` reescritas sobre un guard común** (`api/_lib/guard.js`): autorización que exige
  perfil de Jardines (un usuario de Vero recibe 403), límite de tamaño del cuerpo, rate limit
  fail-closed, idempotencia recuperable, escapado de HTML y respuestas genéricas.
- **`/api/notificar`**: lista cerrada de acciones y verificación en la base de que la acción
  ocurrió de verdad, en vez de aceptar HTML arbitrario de cualquier sesión.
- **`/api/cron-recordatorios`**: pasa a **fail-closed** (antes se ejecutaba sin `CRON_SECRET`),
  comparación en tiempo constante, idempotencia por mensaje y semántica **at-least-once** documentada.
- **Enlace de primer acceso de un solo uso** (`sec_16`) con **canje en dos fases** (`sec_19`):
  ya no viajan contraseñas en los correos ni credenciales en base64 en la URL.
- **`search_path = ''`** en las 7 funciones `SECURITY DEFINER` que faltaban (`sec_17`) y retiro
  de la confianza por dominio de correo en `handle_new_user` (`sec_18`).
- **Operativo fail-closed** (`sec_14`) con `acceso_global` explícito para los 3 operativos
  existentes (`sec_18`).
- **Cabeceras HTTP** en `vercel.json`: CSP en modo enforcing, HSTS, `nosniff`, `Referrer-Policy`,
  `Permissions-Policy`, `X-Frame-Options`.
- **Suites reproducibles:** `supabase/tests/seguridad.sql` (63 aserciones en `BEGIN/ROLLBACK`) y
  `scripts/test-contratos-api.mjs` (71 contratos estáticos frontend ↔ API, `npm run test:contratos`).
- **`no-undef` activado** en `eslint.config.js`: estaba anulado porque el bloque `rules`
  sobreescribía `pluginJs.configs.recommended`.
- **`sec_22`**: retirada de la única fila de perfil cruzado Vero → Jardines, con precondición estricta.

### Archivos modificados
- Nuevos: `supabase/migrations/*_jardines_sec_{11..22}_*.sql`, `api/_lib/guard.js`,
  `api/canjear-acceso.js`, `scripts/test-contratos-api.mjs`, `supabase/tests/seguridad.sql`.
- Modificados: `api/{solicitud,notificar,correo-cliente,crear-admin,crear-usuario-evento,cron-recordatorios}.js`,
  `src/api/base44Client.js`, `src/lib/notificar.js`, `src/components/FormularioModal.jsx`,
  `src/components/portal/PortalLogin.jsx`, `src/components/meseros/EventoMeseros.jsx`,
  `src/components/admin/eventos/EventoDocumentos.jsx`, `eslint.config.js`, `vercel.json`,
  `package.json`.

### Entidades/BD afectadas
`jardines` y `jardines_private`. Nuevas: `api_idempotencia`/`idempotencia`, `acceso_unico`.
Eliminada: la columna `eventos.staff_token`. **`public` (Vero) sin cambios**: 12 checksums
idénticos antes y después.

### Bugs resueltos
- `/api/notificar` estaba desalineado con `src/lib/notificar.js`: el front mandaba
  `{titulo, detalle}` y la API exigía `{accion, eventoId, nota}`. Todos los correos daban 400 en
  silencio. De ahí nace la suite de contratos.
- Trigger de auditoría que leía `new.evento_id` dentro de un `CASE` y rompía toda escritura sobre
  `operativo_personal` (`sec_12`).
- Formulario público roto por revocar el INSERT antes de desplegar el front (`sec_13`), origen de
  la regla de orden de despliegue de `docs/SEGURIDAD.md` §8.bis.
- Regresión del operativo: tras `sec_14`, 3 operativos quedaron con cero asignaciones y sin UI
  para crearlas (`sec_18`).
- Errores de supabase-js que se ignoraban: la librería resuelve con `{ data, error }` en vez de
  rechazar, así que los `.catch()` no atrapaban nada.

### Bugs nuevos: ninguno detectado.

### Decisiones tomadas: D-SEC-6 … D-SEC-11 (ver `docs/DECISIONS.md`).

### Próximo paso
Validación humana autenticada de los 5 flujos: el estado formal es
`ESPERANDO_VALIDACION_HUMANA_AUTENTICADA`, **no CERRADO**.

## 2026-08-01 — Endurecimiento de seguridad de Jardines (migraciones `jardines_sec_01..09`)

### Cambios realizados
- **Escalamiento de privilegios eliminado.** `jardines.handle_new_user()` tomaba el rol de
  `raw_user_meta_data->>'rol'`, que controla el cliente. Ahora el rol solo viene de fuente
  server-side (tabla privada de aprovisionamiento o `raw_app_meta_data`) y el trigger nunca concede
  más que `cliente`. La promoción exige `jardines.asignar_rol`, con `EXECUTE` solo para `service_role`.
- **Perfiles cruzados con Vero cortados.** El trigger vive en `auth.users`, compartida, y creaba
  perfil de Jardines para todos los usuarios (incluido el admin de Vero). Ahora solo lo crea si hay
  señal server-side de que el usuario es de Jardines.
- **IDOR del módulo operativo corregido.** `operativo_ubicar` aceptaba `p_evento` sin validar; ahora
  el evento se deriva o se valida contra los eventos permitidos. `operativo_evento_activo` dejó de
  devolver `staffToken` de otros eventos. Nueva tabla `operativo_asignacion` (opcional, aditiva).
- **Tokens de staff:** hash con pepper, expiración, rotación (256 bits), revocación, rate limit,
  auditoría y respuestas genéricas anti-enumeración. Los QR/enlaces vigentes siguen funcionando.
- **Rate limits reales** (`jardines_private.rate_limit`), persistentes, con claves hasheadas y
  conteo atómico seguro ante concurrencia.
- **RLS:** roles explícitos en todas las políticas (ninguna apunta ya a `PUBLIC`), una policy por
  comando, `(select auth.uid())`, y `anon` sin INSERT/UPDATE/DELETE en ninguna tabla.
- **Solicitudes:** el `WITH CHECK (true)` se sustituyó por `jardines.solicitud_crear`, que valida
  formato y longitudes, limita tasa y fija los campos internos en el servidor.
- **Storage:** límites de tamaño y MIME, listado público cerrado en `planos` y `sitio`, y escritura
  del operativo acotada a `tx/<canal_id>/…`.
- 12 índices de llave foránea, constraints de validación y auditoría aislada en `jardines_private`.

### Archivos modificados
- Nuevos: `supabase/migrations/2026080121*_jardines_sec_0{1..9}_*.sql`, `docs/SEGURIDAD.md`,
  `supabase/migrations/PENDIENTE_jardines_sec_10_retiro_compat_staff_token.sql.noapply`
  (**hecho por `sec_20` el 2026-08-02**; el archivo `.noapply` ya no existe, y por eso no hay
  migración `sec_10`).
- Modificados: `api/crear-admin.js`, `api/crear-usuario-evento.js`, `src/api/base44Client.js`,
  `src/components/FormularioModal.jsx`, `src/components/meseros/EventoMeseros.jsx`,
  `src/components/admin/eventos/EventoDocumentos.jsx`.

### Entidades/BD afectadas
Schema `jardines` (32 tablas) y nuevo schema privado `jardines_private`. **`public` (Vero) sin
cambios**: recuentos y checksums idénticos antes/después.

### Bugs resueltos
- El folio de la solicitud nunca se guardaba: el front intentaba un `UPDATE` que RLS rechazaba en
  silencio, así que el folio del correo no coincidía con el de la base. Ahora lo genera el servidor.
- Los documentos del cliente se subían a `evento-<id>/` pero la policy comparaba contra `<id>`, así
  que el cliente nunca podía abrirlos. Corregido (no había archivos, sin pérdida de datos).
- El panel rotaba `staff_token` desde el navegador con `crypto.randomUUID()` escribiendo directo en
  la tabla; ahora usa la RPC `rotar_staff_token`.

### Bugs nuevos: ninguno detectado.

### Decisiones tomadas: ver `docs/DECISIONS.md` (D-SEC-1 … D-SEC-5).

### Próximo paso
Probar en la interfaz el botón "generar link de meseros" y, una vez validado, aplicar
`PENDIENTE_jardines_sec_10_retiro_compat_staff_token.sql.noapply` para retirar el token en claro.
*(**hecho por `sec_20` el 2026-08-02.** Registro histórico: no queda nada pendiente aquí.)*

## 2026-07-03 — Documentación viva del proyecto

### Cambios realizados
- Creados `CLAUDE.md` y `PROJECT_CONTEXT.md` (raíz) y `docs/` con ARCHITECTURE, DATABASE, FILE_MAP,
  DECISIONS, BUGS_PENDING, NEXT_STEPS, CHANGELOG, PROMPTS. Proyecto ahora transferible a otra sesión/IA.
### Archivos modificados
- `CLAUDE.md`, `PROJECT_CONTEXT.md`, `docs/*.md` (nuevos). Se conservan `docs/MAPA.md`, `COMPONENTES.md`, `DATOS.md`, `DEPLOY.md`.
### Entidades/BD afectadas: ninguna.
### Bugs resueltos: ninguno. ### Bugs nuevos: ninguno.
### Decisiones tomadas: adoptar el flujo de documentación viva.
### Próximo paso: llenar `resenas.json` con reseñas reales (ver NEXT_STEPS).

---

## 2026-07-03 — Imágenes Nano Banana integradas (commit afdaa12)
### Cambios realizados
- Integradas las 5 imágenes generadas con Nano Banana (referencias reales del lugar): Sanitarios,
  Seguridad privada, Coordinación de montaje, Flexibilidad de horarios (servicios) y Trampolín (amenidad).
### Archivos modificados
- `public/media/img/{sanitarios,seguridad,montaje,horarios,trampolin}.jpg`, `scripts/raw/servicios.json`,
  `scripts/raw/amenidades.json`, `src/data/site-data.json`.
### Bugs resueltos: los 5 ítems ya no muestran placeholder (tienen imagen real).
### Próximo paso: reseñas.

## 2026-07-03 — Descripciones + carpeta Nano Banana (commit 8c4e6f6)
### Cambios realizados
- Descripción para los 29 servicios/amenidades; se muestran al EXPANDIR (debajo de la imagen), no en la miniatura.
- `ServiceAmenityCard`: expandible si tiene media o descripción.
- Cancelada la generación con Pollinations (poco realista); creada carpeta `nano-banana/` con prompts + referencias.
### Archivos: `src/components/ServiceAmenityCard.jsx`, `scripts/raw/*.json`, `nano-banana/*`.

## 2026-07-03 — Servicio destacado "Barra de Dulces" (commit 17a4d59)
### Cambios realizados
- Nuevo `BarraDulces.jsx` (colaboración Dulce Corazón, acento rosa) entre Servicios y Amenidades; despliega flyer + descripción.
### Archivos: `src/components/BarraDulces.jsx`, `src/components/ServiciosAmenidades.jsx`, `public/media/img/dulce-corazon.png`.

## 2026-07-03 — Ajustes FAQ, orden y scroll (commit eba82c1)
### Cambios realizados
- FAQ: respuesta de "paquetes" corregida (no hay paquetes fijos, se arma a la medida) + rediseño (badge "P" + flecha).
- "Cómo funciona" movido entre Amenidades y el CTA; FAQ tras Galería. Fix del bug de scroll al cerrar el formulario.
### Archivos: `src/components/FaqSection.jsx`, `ComoFunciona.jsx`, `src/pages/Home.jsx`, `src/hooks/useLockBodyScroll.js`, `scripts/raw/config.json`.

## 2026-07-03 — Reorden de galería (commit 74c3bbc)
### Cambios realizados
- Galería reordenada por análisis visual; `Galeria.list()` sin sort (orden del arreglo = mostrado).
### Archivos: `scripts/raw/galeria.json`, `src/pages/Home.jsx`, `scripts/reorder-galeria.mjs`, `scripts/montage.mjs`.

## 2026-07-03 — "Cómo funciona" + FAQ (commit b9cca78)
### Cambios realizados
- Secciones nuevas `ComoFunciona.jsx` y `FaqSection.jsx`.
### Archivos: esos dos + `src/pages/Home.jsx`, `docs/MAPA.md`.

## 2026-07-03 — Mejoras de conversión fase 1 (commit 88c30c8)
### Cambios realizados
- Hero de venta, bloque `Confianza` (números + rating Google + carrusel), formulario corto, miniaturas
  en servicios/amenidades, sección "Información de servicios" llena, WhatsApp en desktop, Facebook, SEO
  EventVenue, correcciones de erratas/duplicados.
### Archivos: múltiples componentes + `scripts/raw/*`, `src/data/resenas.json`, `index.html`.

## 2026-07-03 — Migración inicial Base44 → Vite/Vercel (commit fac5332)
### Cambios realizados
- Sitio migrado a proyecto Vite independiente. SHIM de datos, medios auto-hospedados (466 archivos),
  auth de Base44 eliminada, función serverless de correo, deploy en GitHub + Vercel.
### Entidades/BD afectadas: entidades de Base44 congeladas en `site-data.json`.
### Decisiones: D1–D5 (ver DECISIONS.md).
