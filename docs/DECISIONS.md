# DECISIONS.md

Registro de decisiones técnicas y de producto (formato: decisión · razón · consecuencia · archivos).

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
- **Consecuencia:** `scripts/test-contratos-api.mjs` (71 comprobaciones, sin red ni
  credenciales) corre en CI. Además se activó `no-undef` en ESLint, que estaba anulado porque el
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
- **VIGENTE, ampliada en FASE-02.** Los medios del sitio siguen sirviéndose desde
  `public/media/` (videos del hero, los 241 frames, flyers). Lo que se añadió es que **los
  medios que se suben desde el panel van a Storage de Supabase** (buckets `sitio`, `clientes`,
  `planos`, `operativo`), no al repo. Ver `docs/DATABASE.md` §E.
- **Razón:** independencia total de Base44/imgur; que nada se rompa si esos servicios fallan.
- **Consecuencia:** repo pesado (~560 MB); descarga por `build-media.mjs`; se limpió un artefacto `" ×"`
  que traían algunas URLs.
- **Archivos:** `public/media/*`, `scripts/build-media.mjs`.

### D4 — Correo del formulario con Gmail App Password (Nodemailer), no OAuth
- **Razón:** replicar el envío por Gmail que hacía Base44 sin montar un flujo OAuth complejo.
- **Consecuencia:** función serverless simple; requiere `GMAIL_USER`/`GMAIL_APP_PASSWORD` en Vercel;
  la cuenta necesita verificación en 2 pasos + App Password. Remitente actual: `mighuer427@gmail.com`.
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
