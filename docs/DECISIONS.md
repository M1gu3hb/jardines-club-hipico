# DECISIONS.md

Registro de decisiones técnicas y de producto (formato: decisión · razón · consecuencia · archivos).

## 2026-08-03 — Código (bloque 3)

### D-COD-1 — Un solo generador de tokens portadores, sin fallback
- **Razón:** `PortalInvitacion` generaba el token de `/invitacion/:token` con
  `crypto.randomUUID ? … : "inv-" + Date.now() + Math.random()`. Ese token **es** la credencial y
  se guarda en claro en `eventos.invitacion_token`: en la rama de fallback era adivinable
  (`Date.now()` es acotable y `Math.random()` no es criptográfico). `EventoMeseros` ya lo hacía
  bien; había dos criterios distintos para el mismo tipo de secreto.
- **Consecuencia:** `src/lib/tokenSeguro.js` — 256 bits de `crypto.getRandomValues` en base64url,
  importado por ambos. **Si no hay WebCrypto lanza** con un mensaje para el usuario, en vez de
  emitir un token débil que nadie detectaría hasta que lo adivinen.
- **Archivos:** `src/lib/tokenSeguro.js`, `src/components/portal/PortalInvitacion.jsx`,
  `src/components/meseros/EventoMeseros.jsx`.

### D-COD-2 — PENDIENTE: los tokens de invitación siguen en claro en la base
- **Estado: decisión no tomada.** D-COD-1 arregla la *generación*, no el *almacenamiento*.
  `eventos.invitacion_token` y `mesas.token` siguen guardándose en claro, como estaba
  `staff_token` antes de `sec_20`.
- **Por qué no se hizo ahora:** pasar a hash toca la RLS y la RPC pública `info_invitacion_publica`,
  y **los QR ya impresos seguirían siendo credenciales portadoras** de todos modos, así que el
  beneficio real se limita a una fuga de lectura de la tabla.
- **Qué haría falta:** columna `_hash` + validación por HMAC (como `sec_04`/`sec_20`), ventana de
  compatibilidad y reemisión de los QR vigentes. Decidir antes de la próxima temporada de eventos.

### D-COD-3 — `anticipo_pagado` se deriva del monto
- **Razón:** era `Number(monto) > 0 ? true : !!form.anticipoPagado`, un latch de un solo sentido:
  subía a `true` al capturar un monto y **nada volvía a bajarlo**, porque el `else` reponía el
  valor que venía de la base y **no existe ningún control en la UI** para ese campo. Un anticipo
  capturado por error quedaba marcado para siempre.
- **Consecuencia:** `anticipoPagado: Number(form.anticipoMonto) > 0`. Borrar el monto lo revierte.
  El panel captura un solo dato de anticipo (el monto) y el flag lo sigue.
- **Archivos:** `src/components/admin/eventos/EventoDatos.jsx`.

### D-COD-4 — Todas las rutas cortan igual en `duplicado`
- **Razón:** `crear-admin` y `crear-usuario-evento` continuaban con `idem === "duplicado"`
  mientras `solicitud`, `notificar` y `correo-cliente` cortaban. En `crear-admin` eso hacía que el
  segundo intento emitiera **otra invitación de aprovisionamiento de rol admin** antes de chocar
  con el 409 de `createUser`. La compensación la revocaba, pero era una ventana con una invitación
  de admin viva que dependía de que la compensación funcionara.
- **Consecuencia:** las cinco rutas cortan en `duplicado`. Una sola semántica de idempotencia en
  toda la superficie `api/`.
- **Archivos:** `api/crear-admin.js`, `api/crear-usuario-evento.js`.
- **CORREGIDA por D-COD-7:** el corte devolvía `{ok, duplicado}` a secas, y estas dos rutas
  tienen llamadores que leen campos del cuerpo. Ver abajo.

### D-COD-5 — El plano del salón se sube desde `AdminSalones`, al bucket `planos`
- **Razón:** el plano es un atributo del **salón**, no del evento; el editor de mesas
  (`MesaEditor`) ya lo leía y lo pintaba de fondo, y solo faltaba la pantalla para subirlo.
  Ponerlo en el módulo de eventos habría obligado a repetirlo por evento.
- **Consecuencia:** `SalonPlanoUpload` dentro del formulario de edición del salón. Sube al bucket
  `planos` (10 MB, imágenes sin SVG), **no** a `sitio` — `integrations.Core.UploadFile` está
  cableado a `sitio`, así que aquí se usa `base44.storage` directo. Una fila por salón: si ya
  existe se hace `update`. Se guardan `ancho`/`alto` reales de la imagen porque el editor los usa
  como `aspectRatio` y las mesas se posicionan en **%** sobre ese lienzo: si la proporción no
  coincide, las mesas se desplazan. Validación de MIME y tamaño en el cliente, para que el
  rechazo del bucket no llegue como error genérico.
- **No hizo falta migración:** `salon_planos` ya tenía policies de admin (`sec_06`) y el bucket
  `planos` ya tenía la suya. Comprobado contra producción antes de escribir la UI.
- **Corrección (2026-08-03):** esa policy **no la crea `sec_07`** — `sec_07` solo fija límites y
  MIME del bucket y **dropea** la vieja `"planos lectura publica"`. La policy vigente,
  `planos admin escribe`, vive **en el dashboard**, no en el repo. Verificado en producción: es
  `cmd = ALL` para `authenticated` con `jardines.is_admin()`, así que **cubre también DELETE** —
  la limpieza de huérfanos del bloque 4 sí funciona. Que no esté versionada es deuda conocida:
  una migración que la recree no se puede escribir sin tocar Storage de un proyecto compartido.
- **Archivos:** `src/components/admin/SalonPlanoUpload.jsx`, `src/components/admin/AdminSalones.jsx`,
  `src/api/base44Client.js` (`storage.publicUrl`, aditivo).

### D-COD-6 — Tipar el Proxy `entities` del shim: la línea base de `typecheck` baja de 155 a 59
- **Razón:** al añadir `SalonPlanoUpload` el `typecheck` subió a 159, y la regla es que no suba.
  Los 4 errores nuevos eran del mismo patrón que formaba **la mayoría** de la línea base: `tsc`
  tipaba el Proxy `entities` como `{}` y marcaba un `TS2339` por **cada** uso de
  `base44.entities.X` en todo el proyecto. Cualquier componente nuevo que hablara con la base
  inflaba el número, así que el umbral castigaba escribir código correcto.
- **Consecuencia:** una anotación `@type` sobre el Proxy. **Cero cambio en runtime.** Desaparecen
  96 errores de ruido (107 `TS2339` → 7) y los reales dejan de estar enterrados. Nueva línea base:
  **59**, actualizada en los 7 documentos que la citaban.
- **CORREGIDA en la fase 4B:** la primera versión usaba `Record<string, …>`, que acepta
  **cualquier** nombre de propiedad y por tanto apagó la única detección de typos que había. Un
  `base44.entities.Salones` pasaba el `typecheck`, y en runtime tampoco fallaba: `makeEntity` cae
  a `toSnake(nombre)`, consulta una tabla inexistente y `runQuery` devuelve `[]` ante el error —
  o sea, **lista vacía en silencio**, sin error de compilación ni de runtime. Ahora es
  `Record<keyof typeof TABLES, …>` y ese typo da `TS2339`. El `{}` inicial se resuelve con un cast
  en el argumento del Proxy, no relajando el tipo del resultado. La línea base **sigue en 59**.
- **Archivos:** `src/api/base44Client.js`.

### D-COD-7 — El corte por `duplicado` devuelve la misma forma que el éxito
- **Razón:** D-COD-4 unificó el corte en `duplicado`, pero se aplicó al pie de la letra sobre una
  premisa incompleta: las otras tres rutas tienen llamadores que **solo miran `res.ok`**, mientras
  que `crear-usuario-evento` y `crear-admin` **leen campos del cuerpo**. Devolver
  `{ok, duplicado}` a secas hacía que el panel escribiera `usuario: undefined` en el estado del
  evento y volviera a mostrar "este evento aún no tiene credenciales" para uno que sí las tiene.
  Era **peor que antes** del cambio: el código viejo llegaba al 409 y decía "Ese usuario ya existe".
- **Consecuencia:** el corte relee la fila (`eventos` / `perfiles`) y devuelve `usuario` y
  `userId`, la misma forma que el camino de éxito. Se eligió arreglarlo en el **servidor** y no en
  los llamadores porque así el fallo desaparece en el origen: un llamador futuro que olvide mirar
  `duplicado` tampoco se rompe. Los mensajes del panel sí distinguen el caso, para no anunciar como
  recién creado algo que ya existía. **`correoEnviado` no se inventa** en el corte: salió, o no, en
  la ejecución original.
- **Archivos:** `api/crear-usuario-evento.js`, `api/crear-admin.js`,
  `src/components/admin/eventos/EventoDatos.jsx`, `src/components/admin/AdminAdministradores.jsx`,
  `scripts/test-contratos-api.mjs`.

### D-COD-8 — Las dos rutas de ALTA responden 429 en `en_curso`; las de correo cortan con 200
- **Razón:** no es una inconsistencia olvidada, es una diferencia deliberada que hasta ahora no
  estaba escrita en ningún sitio. En `solicitud`, `notificar` y `correo-cliente`, `en_curso`
  significa "otro proceso ya está mandando este correo": dar 200 es correcto, el aviso va a salir.
  En un **alta**, `en_curso` significa que la creación está a medias y **todavía puede fallar y
  compensarse**; responder 200 le diría al admin que la cuenta existe cuando podría no llegar a
  existir. Por eso 429: reintenta.
- **Consecuencia:** `crear-admin` y `crear-usuario-evento` mantienen `en_curso → 429`. Hay un
  contrato que lo fija.

### D-COD-9 — El plano se endurece en la base y en la pantalla, no en el shim
- **Razón:** cinco riesgos en la pantalla de planos. El grave era de **reasignación cruzada**: sin
  `key`, al pasar del salón A al B el componente no se desmontaba y seguía mostrando el plano de A
  con el nombre de B y los botones activos; un clic en "Reemplazar" movía la fila de A al salón B.
- **Consecuencia:**
  - `key={editing?.id}` **y** reset de estado al inicio de `cargar()`. Los dos: el `key` cubre el
    cambio de salón, el reset cubre las recargas. Y la rama de "plano existente" ya está gateada
    por `cargando`.
  - `sec_24` añade `salon_planos_salon_id_uniq`: la regla "una fila por salón" pasa de vivir en el
    estado de React a vivir en la base. La pantalla hace upsert y trata el choque `23505` como lo
    que es —otra pestaña se adelantó—, no como un fallo.
  - `sec_24` añade `imagen_plano_path`. Sin él no había forma de borrar el objeto anterior: el
    bucket es público y con el listado cerrado, así que cada reemplazo dejaba un huérfano
    descargable para siempre y sin asa. Ahora se borra al reemplazar, al quitar, y también si la
    subida cuaja pero la fila no.
  - **Quitar el plano borra también el archivo.** La razón que se había escrito ("permite
    recuperarlo") no se sostenía: la fila era el único sitio donde vivía la URL, así que no había
    nada que recuperar — pero el plano seguía descargable.
  - Las medidas solo se escriben si se pudieron leer: `null` sobre unas buenas haría que
    `MesaEditor` cayera a 1000×700 y desplazara todas las mesas, justo lo que se quería evitar.
- **Archivos:** `sec_24`, `src/components/admin/SalonPlanoUpload.jsx`,
  `src/components/admin/AdminSalones.jsx`.

### D-COD-10 — El shim no se toca ahora; se confirma releyendo
- **Razón:** `update`/`delete` del shim reportan éxito aunque RLS deje la operación en 0 filas.
  Arreglarlo de raíz es lo correcto, pero es la API que usa **todo** el proyecto y la validación
  humana de los 5 flujos es inminente: convertir en excepción algo que hoy pasa en silencio puede
  hacer visible un fallo en un flujo que no puedo probar de punta a punta.
- **Consecuencia:** `SalonPlanoUpload` **confirma cada escritura releyendo la fila** y falla con
  un mensaje explícito si la base no la aceptó. Queda abierto como **J-02** para extender el patrón
  —o arreglar el shim— después de la validación.

### D-COD-11 — La pantalla de asignación bloquea apagar `acceso_global` sin asignaciones
- **Razón:** `operativo_eventos_permitidos()` resuelve con un **OR** (asignación vigente **o**
  `acceso_global`), así que asignar es aditivo y seguro, pero **apagar `acceso_global` a alguien
  con 0 asignaciones lo deja en 0 eventos al instante** — fail-closed desde `sec_14`. Hoy los 3
  operativos tienen `acceso_global = true` y **0 asignaciones**: un toggle ingenuo dejaría al
  personal sin acceso en pleno evento.
- **Consecuencia:** `AdminOperativo` muestra el **estado efectivo** de cada persona con la misma
  lógica del OR, y **bloquea** apagar el acceso global mientras no haya al menos una asignación
  vigente, explicando por qué. Revocar una asignación sí se permite —es deliberado sobre esa
  persona— pero **avisa** si la deja en 0. Revocar es `revocada_at`, nunca `DELETE`.
- **Abrir la pantalla no cambia el estado de nadie:** solo lee.
- **Archivos:** `src/components/admin/AdminOperativo.jsx`, `src/components/admin/AdminDashboard.jsx`.

### D-COD-12 — Las asignaciones van por un módulo aparte del shim, no por `entities`
- **Razón:** `jardines.operativo_asignacion` tiene **PK compuesta `(personal_id, evento_id)` y no
  tiene columna `id`**, mientras que `makeEntity` asume `id` en `create`, `update` y `delete`.
  Pasarla por `entities` habría fallado en runtime.
- **Alternativa descartada:** añadirle un `id` por migración. No hace falta —el problema es del
  shim, no del modelo— y habría tocado una tabla del módulo operativo sin necesidad.
- **Consecuencia:** `base44.asignaciones.listar/asignar/revocar`, aditivo, sin cambiar ninguna
  firma existente. `asignar` es **idempotente**: si la fila existe porque se revocó antes, el
  INSERT choca con la PK y se reactiva poniendo `revocada_at = null`, en vez de fallar.
  Verificado contra producción el ciclo asignar → revocar → reasignar.
- **Archivos:** `src/api/base44Client.js`.

### D-COD-13 — Una lectura que DECIDE no puede devolver `[]` ante un fallo
- **Razón:** `runQuery` devuelve `[]` tanto si no hay filas como si la lectura falló. Da igual en
  una lista que se pinta; es **peligroso** cuando la lectura sirve para decidir. Ya causó dos
  daños distintos: el rollback del plano borraba el archivo de una escritura que sí había cuajado,
  y el guardarraíl del operativo se saltaba con datos incompletos.
- **Consecuencia:** `entities.X.filterEstricto()`, aditivo, que **propaga el error**. Se usa donde
  la lectura decide: confirmar una escritura y contar accesos. `filter` sigue igual para pintar.
  Y las confirmaciones devuelven **tres** estados —sí / no / no se pudo saber— porque colapsar el
  tercero en "no" es lo que convierte un fallo de red en una destrucción de datos.
- **Regla:** ante "no se pudo confirmar", **no deshagas nada** y dilo. Un huérfano en un bucket es
  mucho más barato que un dato destruido.
- **Archivos:** `src/api/base44Client.js`, `src/components/admin/SalonPlanoUpload.jsx`,
  `src/components/admin/AdminOperativo.jsx`.

### D-COD-14 — Las asignaciones inertes se muestran, no se ocultan
- **Razón:** una asignación vigente a un evento ya cerrado **no da acceso** (el OR de `sec_14`
  exige el evento activo). Los chips solo se pintaban para eventos activos, así que esas
  asignaciones eran **invisibles e irrevocables** desde la pantalla: se acumulaban solas y
  alimentaban el bypass del guardarraíl.
- **Consecuencia:** se listan aparte, marcadas como "no dan acceso", con su botón de revocar. La
  alternativa —ocultarlas y ya— dejaba un estado imposible de limpiar desde el panel.
- **Archivos:** `src/components/admin/AdminOperativo.jsx`.

### D-COD-15 — Un contrato se ata al uso, no al identificador, y se valida mutando
- **Razón:** cuatro veces en cuatro bloques ha aparecido el mismo fallo: un contrato que busca un
  identificador suelto sobre **todo** el archivo. Si ese identificador aparece en más de un sitio
  —y casi siempre aparece: definición, lectura, render, comentario— borrar el uso que importa deja
  vivos los demás y el contrato pasa. Un contrato así **da falsa confianza**: es peor que no
  tenerlo, porque su nombre afirma una propiedad que nadie comprueba. En el bloque 5 se corrigió
  uno (`idsActivos`) y quedaron tres iguales sin revisar; la auditoría los encontró.
- **Consecuencia:** la regla queda escrita en `CLAUDE.md`, en `docs/PROMPTS.md` §9 y en la cabecera
  del helper `entre()` de la propia suite, que es donde la va a leer quien escriba el siguiente.
  Dos consecuencias prácticas: **(a)** la afirmación se recorta al uso concreto —la definición, la
  escritura, el render, el `disabled`, el cuerpo de la función—, y **(b)** cuando lo que importa es
  el orden (una guarda que corta antes de un borrado), se afirma sobre el **orden**, nunca sobre la
  distancia en caracteres. Un `[\s\S]{0,400}` no dice nada sobre si un texto gobierna al otro.
  La validación es obligatoria y es empírica: reintroducir la regresión real en el archivo real,
  ver fallar el contrato, restaurar con `git checkout --`. Y al menos una mutación **inocua** —un
  reformateo— para no cambiar fragilidad por falsos positivos.
- **Consecuencia aceptada:** los contratos quedan acoplados a la forma concreta del código actual.
  Refactorizar `SalonPlanoUpload` o `AdminOperativo` obligará a reescribirlos. Es el precio de que
  comprueben algo: un contrato tolerante a cualquier reescritura no distingue una reescritura de
  una regresión.
- **Archivos:** `scripts/test-contratos-api.mjs`, `CLAUDE.md`, `docs/PROMPTS.md`.

### D-COD-16 — La lista de estatus la manda la BASE, no el panel
- **Razón:** el panel ofrecía `En revisión`, `Confirmada` y `Cancelada`; el CHECK de `sec_07`
  admite `Nueva, En proceso, Cotizada, Cerrada, Descartada`. Solo coincidía `Nueva`, así que
  cualquier cambio de estatus violaba el constraint. Había dos salidas: ampliar el CHECK por
  migración para admitir los nombres del panel, o alinear el panel con el CHECK.
- **Consecuencia:** se alinea el **panel**. Tres motivos: la base es producción compartida y esto
  no justifica una migración; el vocabulario del CHECK describe mejor un embudo de venta
  (`En proceso` → `Cotizada` → `Cerrada` / `Descartada`) que `Confirmada` / `Cancelada`, que
  hablan de un evento y no de una solicitud; y `Descartada` le da al dueño la forma de sacar una
  solicitud de la lista de "estancadas", que es justo lo que le faltaba.
- **Regla que queda escrita** (en la cabecera del componente y en un contrato): para añadir un
  estatus se toca **primero** el CHECK y después el panel. Al revés vuelve a romperse en silencio.
- **Archivos:** `src/components/admin/AdminSolicitudes.jsx`, `scripts/test-contratos-api.mjs`.

### D-COD-17 — Borrar y "marcar leída" conviven; no son lo mismo
- **Razón:** con el borrado real de la actividad del portal, cabía retirar `marcarLeidas()` por
  redundante. No lo es: borrar es **irreversible**, y el dueño mira la actividad de la semana más
  de una vez. Si la única forma de apagar el contador de "nuevo" fuera borrar, apagarlo costaría
  el historial de la semana.
- **Consecuencia:** se conservan las dos, con intenciones separadas y textos que lo dicen — *ya lo
  vi* (no borra nada) y *ya no lo quiero* (borra, no archiva). Lo que sí se corrigió es que
  `marcarLeidas` hacía hasta 120 UPDATE en un `Promise.all` sin `catch` y sin confirmar.
- **Consecuencia aceptada:** hay dos botones donde podría haber uno. Es el precio de que apagar el
  aviso no destruya información.
- **Archivos:** `src/components/admin/AdminInicio.jsx`.

## 2026-08-03 — Documentación

### D-DOC-1 — Reescribir los cuerpos obsoletos en vez de dejar banners encima
- **Razón:** `PROJECT_CONTEXT.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/DATOS.md` y
  `docs/PROMPTS.md` llevaban un aviso de "esto ya no es cierto" sobre un cuerpo que seguía
  diciendo "no hay base de datos en vivo". Una IA que leyera el cuerpo actuaría con datos falsos.
- **Consecuencia:** los cinco se reescribieron completos y `docs/FILE_MAP.md` también (llevaba
  sin actualizarse desde FASE-01). La regla anti-documentación muerta queda escrita en `CLAUDE.md`.
- **Archivos:** `CLAUDE.md`, `PROJECT_CONTEXT.md`, `docs/{ARCHITECTURE,DATABASE,FILE_MAP,DATOS,PROMPTS}.md`.

### D-DOC-2 — La documentación dice `ESPERANDO_VALIDACION_HUMANA_AUTENTICADA`, no "cerrado"
- **Razón:** el código está desplegado y las pruebas automáticas pasan, pero cinco flujos solo
  se pueden comprobar con credenciales reales frente a la pantalla. Documentar "cerrado" antes
  de eso convierte una suposición en un hecho para la siguiente sesión.
- **Consecuencia:** el estado formal aparece igual en `PROJECT_CONTEXT.md`, `docs/SEGURIDAD.md`,
  `docs/BUGS_PENDING.md` y `docs/NEXT_STEPS.md`, con la lista exacta de lo que falta validar.

## 2026-08-02 — Seguridad (segunda tanda)

### D-SEC-6 — Idempotencia **recuperable**, no una simple marca de "ya se hizo"
- **Razón:** la primera versión consumía la clave antes de saber si el correo había salido. Un
  fallo transitorio de Gmail dejaba el aviso perdido para siempre, porque el reintento se veía
  como duplicado.
- **Consecuencia:** estados `procesando` / `completado` / `fallido` con *lease* que expira
  (`api_idem_iniciar` / `api_idem_cerrar`). Un doble clic no duplica; un fallo real sí se reintenta.
- **Archivos:** `sec_19`, `api/_lib/guard.js`, todas las rutas de `api/`.

### D-SEC-7 — Los correos son **at-least-once**, y se dice explícitamente
- **Razón:** Gmail y PostgreSQL no comparten transacción. No existe "exactamente una vez": hay
  que elegir entre poder duplicar y poder perder.
- **Consecuencia:** se elige duplicar. Está escrito en la cabecera de `api/cron-recordatorios.js`
  y hay un contrato que verifica que esa nota siga ahí.
- **Archivos:** `api/cron-recordatorios.js`, `scripts/test-contratos-api.mjs`.

### D-SEC-8 — Canje del enlace de primer acceso **en dos fases**
- **Razón:** con un solo paso, si fallaba la generación del OTP el token ya se había quemado y
  el cliente se quedaba fuera sin manera de entrar.
- **Consecuencia:** `canjear_acceso_iniciar` toma un lease, `canjear_acceso_confirmar` lo
  consume y `canjear_acceso_liberar` lo devuelve si algo falla en medio. El **servidor** decide
  el destino según el rol leído en la base, no el cliente.
- **Archivos:** `sec_19`, `api/canjear-acceso.js`, `src/components/portal/PortalLogin.jsx`.

### D-SEC-9 — Retirar del todo el token de staff en claro
- **Razón:** D-SEC-4 lo conservó durante una ventana de compatibilidad por los QR impresos. Una
  vez validada la rotación, mantenerlo solo dejaba superficie de fuga.
- **Consecuencia:** la columna `eventos.staff_token` **ya no existe**. Solo queda el HMAC; la
  rotación devuelve el token **una sola vez** y el panel no puede reconsultarlo — tras recargar
  ofrece "Generar nuevo enlace". Inexistente, revocado y expirado dan la misma respuesta.
- **Archivos:** `sec_20`, `src/components/meseros/EventoMeseros.jsx`.

### D-SEC-10 — Pruebas de contrato estáticas entre frontend y `api/`
- **Razón:** `src/lib/notificar.js` mandaba `{titulo, detalle}` mientras `api/notificar.js` ya
  exigía `{accion, eventoId, nota}`. Compilaba, pasaba el lint y **todos los correos morían con
  un 400 en silencio**. Ninguna prueba de base de datos podía verlo: el desajuste estaba entre
  dos archivos de JavaScript.
- **Consecuencia:** `scripts/test-contratos-api.mjs` (94 comprobaciones, sin red ni
  credenciales) **puede** correr en CI — hoy no hay: no existe `.github/`, se ejecuta a mano con
  `npm run test:contratos`. Además se activó `no-undef` en ESLint, que estaba anulado porque el
  bloque `rules` sobreescribía `pluginJs.configs.recommended`.
- **Archivos:** `scripts/test-contratos-api.mjs`, `eslint.config.js`, `package.json`.

### D-SEC-11 — El operativo falla **cerrado**, con permiso explícito para el caso normal
- **Razón:** antes, cero asignaciones significaba "puede con todo", que es exactamente el
  comportamiento inseguro cuando alguien olvida configurar.
- **Consecuencia:** sin permiso no hay acceso. Como la plantilla del salón es fija y opera un
  evento a la vez, los 3 operativos existentes recibieron `acceso_global = true` explícito. Si
  algún día hay dos eventos simultáneos, hace falta UI para `operativo_asignacion`.
- **Archivos:** `sec_14`, `sec_18`.

## 2026-08-01 — Seguridad

### D-SEC-1 — El rol NUNCA sale de `user_metadata`; se usa una fuente server-side
- **Razón:** `raw_user_meta_data` lo escribe el propio usuario (es el `data` de `signUp`/`updateUser`).
  Usarlo para autorizar es escalamiento de privilegios directo.
- **Consecuencia:** el trigger solo concede `cliente`; elevar exige `jardines.asignar_rol`, con
  `EXECUTE` exclusivo de `service_role`. El front ya no manda `rol` en `user_metadata`.
- **Archivos:** `sec_02`, `api/crear-admin.js`, `api/crear-usuario-evento.js`.

### D-SEC-2 — El trigger compartido de `auth.users` no crea perfiles cruzados
- **Razón:** ese trigger se dispara también para los usuarios de Vero, y les creaba perfil de Jardines.
- **Prueba de que Vero no cambia:** Vero autoriza con `public.is_admin()`, que lee solo
  `public.admin_users`; nunca consulta `jardines.perfiles`.
- **Consecuencia:** el trigger exige señal server-side de pertenencia a Jardines y nunca lanza
  excepción, para no poder romper el alta de un usuario de Vero.
- **Archivos:** `sec_02`.

### D-SEC-3 — El evento del operativo se deriva o se valida; no se confía en `p_evento`
- **Razón:** no existe tabla de asignación persona↔evento; los canales son globales. Inventar un
  paso operativo nuevo habría cambiado la operación diaria.
- **Consecuencia:** evento permitido = `operativo_activo` **y**, si la persona tiene asignaciones
  explícitas, que esté entre ellas. Con cero asignaciones el comportamiento es el de siempre.
- **Archivos:** `sec_03`.

### D-SEC-4 — El token de staff en claro se conserva durante una ventana documentada
- **Razón:** hay QR ya impresos y el panel necesita recompartir el enlace sin invalidarlos.
- **Consecuencia:** se validó por hash (con doble lectura de compatibilidad) durante la ventana.
- **Archivos:** `sec_04`.
- **SUPERADA el 2026-08-02 por D-SEC-9:** `sec_20` eliminó la columna y el archivo `.noapply` ya
  no existe (su contenido acabó ahí). Por eso no hay migración `sec_10`.

### D-SEC-5 — Las configuraciones globales de Auth no se tocan
- **Razón:** password policy, protección de contraseñas filtradas, JWT, SMTP y redirect URLs son
  compartidas con Vero; cambiarlas podría afectar su inicio de sesión.
- **Consecuencia:** se reportan como pendientes compartidos en `docs/SEGURIDAD.md` §9.

## 2026-07-03

### D1 — Migración estática (sin backend) en vez de recrear la base de datos
- **SUPERADA en FASE-02 (2026-07-05).** La sustituyó la migración a Supabase: hay base de datos
  viva, el panel admin **sí** persiste y el contenido ya no se edita en código. Lo único que
  sobrevive de esta decisión es `scripts/raw/*` → `site-data.json` como entrada del seed.
- **Razón (histórica):** el cliente quería salir de Base44 rápido, con el sitio idéntico, simple y
  barato. No necesitaba edición en vivo constante.
- **Consecuencia (histórica):** contenido congelado en JSON; el panel admin no persistía; cambios
  de contenido se hacían en código (`scripts/raw/*.json`).
- **Archivos:** `src/data/site-data.json`, `scripts/build-media.mjs`, `scripts/raw/*`.

### D2 — SHIM que imita el SDK de Base44
- **VIGENTE en la decisión, SUPERADA en la implementación (FASE-02).** Mantener la API pública
  del shim sigue siendo la regla y es lo que evitó reescribir los componentes dos veces. Lo que
  ya no es cierto es el "100% local": desde FASE-02 `base44Client.js` importa `supabaseClient` y
  habla con Postgres. Ver `docs/ARCHITECTURE.md` §2.
- **Razón:** evitar reescribir todos los componentes (Home, formulario, admin) que llamaban
  `base44.entities.*`.
- **Consecuencia:** los componentes quedaron intactos en las dos migraciones. Cirugía mínima.
- **Archivos:** `src/api/base44Client.js`.

### D3 — Auto-hospedar TODOS los medios
- **VIGENTE, ampliada en FASE-02, con una excepción sin cerrar.** Los medios del sitio siguen
  sirviéndose desde `public/media/` (videos del hero, los 241 frames, flyers). Lo que se añadió
  es que **los medios que se suben desde el panel van a Storage de Supabase** (buckets `sitio`,
  `clientes`, `planos`, `operativo`), no al repo. Ver `docs/DATABASE.md` §E.
- **La excepción de imgur se cerró el 2026-08-03.** `index.html` servía el `image` del JSON-LD
  desde `i.imgur.com` y la CSP autorizaba ese origen solo por esa línea. Ahora apunta a la copia
  auto-hospedada y `i.imgur.com` **salió de la CSP**. Se comprobó antes que no quedaba ninguna
  URL de imgur en el contenido de producción.
- **Y `build-media.mjs` no es offline:** reconstruir los medios exige red contra `i.imgur.com` y
  `media.base44.com`. La independencia es del *runtime*, no del *build*.
- **Razón:** independencia total de Base44/imgur; que nada se rompa si esos servicios fallan.
- **Consecuencia:** repo pesado (**586 MB**); descarga por `build-media.mjs`; se limpió un artefacto `" ×"`
  que traían algunas URLs.
- **Archivos:** `public/media/*`, `scripts/build-media.mjs`.

### D4 — Correo del formulario con Gmail App Password (Nodemailer), no OAuth
- **Razón:** replicar el envío por Gmail que hacía Base44 sin montar un flujo OAuth complejo.
- **Consecuencia:** función serverless simple; requiere `GMAIL_USER`/`GMAIL_APP_PASSWORD` en Vercel;
  la cuenta necesita verificación en 2 pasos + App Password. **El remitente es `GMAIL_USER`**
  (`api/_lib/correo.js`); el destino de las solicitudes es `MAIL_TO`. Ambos valores viven solo en
  las variables de entorno de Vercel — no se documentan aquí.
- **Archivos:** `api/solicitud.js`.

### D5 — Formulario corto (2 pasos) en vez de 6
- **Razón:** reducir fricción y aumentar conversión; el resto de datos se afinan por WhatsApp.
- **Consecuencia:** solo se piden nombre, teléfono, tipo, fecha, personas (+ opcionales). Se quitaron
  dirección, factura, montaje, alimentos, servicios extra del flujo.
- **Archivos:** `src/components/FormularioModal.jsx`.

### D6 — Reorden de la galería por análisis visual + `Galeria.list()` sin sort
- **Razón:** el orden original no gustaba; además el `-orden` con valores nulos invertía la lista.
- **Consecuencia:** el orden del arreglo = orden mostrado; outliers (mapa, collage, letrero) al final.
- **Archivos:** `scripts/raw/galeria.json`, `scripts/reorder-galeria.mjs`, `src/pages/Home.jsx`.

### D7 — Imágenes faltantes con Nano Banana (no Pollinations)
- **Razón:** Pollinations (gratis) daba resultados poco realistas; Nano Banana image-to-image con
  fotos reales del lugar dio imágenes realistas y en el estilo del venue.
- **Consecuencia:** Nano Banana requiere tier de pago en la API o generarlas manual con Google AI Pro
  (Pro NO aplica a la API). Se dejó la carpeta `nano-banana/` con prompts + referencias.
- **Archivos:** `public/media/img/{sanitarios,seguridad,montaje,horarios,trampolin}.jpg`, `nano-banana/*`.

### D8 — `useLockBodyScroll` con `overflow:hidden` (no `position:fixed`)
- **Razón:** con `position:fixed` + `scrollTo` y `scroll-behavior:smooth`, cerrar el formulario
  "animaba" el scroll (bug reportado).
- **Consecuencia:** al cerrar el modal se conserva la posición exacta, sin salto.
- **Archivos:** `src/hooks/useLockBodyScroll.js`.

### D9 — Descripciones al EXPANDIR (no en la miniatura)
- **Razón:** el cliente no quería ver la descripción en la tarjeta comprimida.
- **Consecuencia:** cada servicio/amenidad tiene descripción; se muestra al expandir, debajo de la
  imagen. Las tarjetas sin imagen también se expanden (canExpand = media o descripción).
- **Archivos:** `src/components/ServiceAmenityCard.jsx`, `scripts/raw/servicios.json`, `amenidades.json`.

### D-COD-18 — `updateEstricto` aditivo, y `update` se queda como está

**Decisión.** Ante `update()` devolviendo éxito cuando RLS deja la escritura en cero filas, se
añaden `updateEstricto`/`deleteEstricto` y se migran las escrituras que deciden algo. **No** se
cambia el comportamiento de `update`/`delete`.

**Por qué no lo segundo, que cerraría la clase entera de una vez.** No por conservadurismo: por
el inventario. De las 71 escrituras del proyecto, **diez componentes escriben sin un solo
`catch`** — `AdminSalones` (7), `AdminServicioItems` (5), `AdminAmenidadItems` (5),
`AdminServicios` (3), `AdminResenas` (3), `AdminGaleria` (3), `AdminAlimentos` (3),
`EventoMusica` (2), `EventoCronograma` (2), `EventoItems` (2). Hacer que `update` lance
convertiría hoy un engaño silencioso en un **botón girando para siempre y sin mensaje**, que es
exactamente el síntoma por el que subir a la galería y el PDF del menú llevan meses muertos. Y
aterrizaría días antes de que el dueño valide el panel.

**Cuándo se revierte esta decisión.** Cuando toda escritura tenga `catch`. Entonces cambiar
`update` es un cambio de una línea y cierra J-15. Hasta entonces sería cambiar una forma de
fallar en silencio por otra peor.

**Lo que se comprobó ejecutando** (bloque revertido, contra producción): UPDATE denegado por RLS
→ sin error, 0 filas. DELETE → sin error, 0 filas. INSERT → `ERROR 42501`. Por eso `create` no
lleva variante estricta.

### D-COD-19 — La invitación digital: RPC acotada, no policy

**Decisión pendiente del dueño** (de quién es la invitación), pero si es del cliente, la vía es
una función `security definer` acotada a cuatro columnas y **no** una policy de UPDATE para el
rol `cliente`.

**Por qué.** Las policies de `jardines` conceden **la fila entera, no columnas** (J-10). Una
policy que dejara al cliente escribir su evento le dejaría escribir también `auth_user_id`,
`usuario`, `estatus`, `saldo`, `salon_id` y `solicitud_id` — incluida la columna que fue la
entrada del P0 del bloque 8. Sería abrir de par en par la deuda que J-10 ya señala, para
arreglar otra cosa.

### D-COD-20 — Un contrato sobre prosa no es un contrato

**Decisión.** Ningún contrato afirma sobre comentarios. Si la propiedad no tiene parte
ejecutable, no se escribe el contrato y el motivo se queda en el comentario, a secas.

**Por qué.** Se midieron dos contratos que solo miraban prosa y fallaban **las dos direcciones a
la vez**: no impedían reintroducir el bug —la atribución falsa de `EventoRsvps` se podía
reescribir con otras palabras— y sí rompían la suite si alguien reformulaba la explicación en
sinónimos, sin tocar una línea ejecutable. Un contrato así no protege y además enseña a ignorar
la suite.

Retirado: el del suelo de `PASSWORD_MIN` (su parte ejecutable —el valor ≥ 8— ya está
contratada aparte). Convertidos a su mitad ejecutable: el de `update` no estricto y el de
`EventoRsvps`, que ahora afirma que el aviso **deriva de si hay token**, no qué frase usa.

### D-COD-21 — Una pieza que nadie invoca es indistinguible de una que no existe

**Decisión.** Toda función de `jardines` concedida a `anon` o `authenticated` tiene que ser
invocada por alguien —el cliente, una policy u otra función—, y hay un contrato que lo
comprueba. Las excepciones se listan **con motivo**, no se toleran en silencio.

**Por qué.** `sec_26` se escribió, se ensayó y se documentó para arreglar el P0 de la invitación
**sin que ningún código la llamara**, y había contratos en verde comprobando sus `grant`. Si se
hubiera desplegado así: el dueño la aprueba, se aplica, se prueba el portal, sale el mismo error
de permisos y se concluye que la vía RPC no sirve — una conclusión falsa que habría cerrado el
camino correcto.

El contrato encontró **seis huérfanas más**, todas anteriores: `registrar_llegada_mesa` (que
escribiría la columna que el tablero de meseros lee y nadie llena), `revocar_staff_token`,
`confirmar_evento`, `auditoria_reciente`, `operativo_ubicar` y `operativo_evento_activo`.
