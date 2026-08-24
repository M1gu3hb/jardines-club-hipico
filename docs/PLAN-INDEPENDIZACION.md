# PLAN-INDEPENDIZACION.md — partir Jardines en tres aplicaciones independientes

> **2026-08-24 · Documento de EJECUCIÓN.** Nada de esto está implementado todavía.
>
> Este documento manda sobre `docs/PLAN-EXPANSION.md` en todo lo que se refiere a **cómo y en
> qué orden** se hace la separación. `PLAN-EXPANSION.md` sigue siendo válido para el alcance
> general y las decisiones de producto, pero su §9 (orden de ejecución) **queda sustituido**
> por las fases de aquí, por decisión del dueño.
>
> Todo lo que se afirma abajo se verificó el 2026-08-24 contra producción —Supabase, Vercel y
> GitHub—, no contra la documentación del repo. Donde la documentación se contradice con esto,
> gana esto.

---

## 0. Punto de partida — verificado, no recordado

| | |
|---|---|
| Repo actual | `M1gu3hb/jardines-club-hipico` · `main` = `64db16e` (24-ago 02:02 UTC) |
| Repo nuevo (portal) | `M1gu3hb/JCH-portal-cliente` — creado 24-ago, **vacío**, `main` |
| Repo nuevo (CRM) | `M1gu3hb/JCH-CRM` — creado 24-ago, **vacío**, `main` |
| Vercel | equipo `mh-astral-systems` (Pro) · **un** proyecto: `jardines-club-hipico` (vite, Node 24) |
| Dominios | **ninguno propio.** Solo `*.vercel.app`. El dominio `.mx` se compra al final |
| Supabase | `vuzyhbiwnnngeohysxcw` — **uno solo, compartido, y así se queda** |
| Migraciones | ledger hasta `sec_28`. `sec_29` escrita y **sin aplicar** |
| Frontend | 157 archivos en `src/` · 10 rutas · 8 funciones en `api/` · 322 contratos |

**Datos vivos el 2026-08-24 — esto es lo que hace que la separación sea BARATA ahora:**

```
eventos 2 · solicitudes 12 · perfiles 3 admin + 2 cliente + 3 operativo · auth.users 9
invitaciones 0 · rsvps 0 · accesos 0 · mesas 0 · invitados 0 · salon_planos 0 · documentos 0
Storage: clientes 0 · planos 0 · sitio 0 · operativo 4 objetos
```

> **NO HAY UN SOLO QR IMPRESO EN CIRCULACIÓN.** Cero invitaciones, cero mesas, cero accesos
> registrados. Eso significa que **mover las rutas por token a otro origen no rompe nada hoy**,
> y no volverá a ser cierto en cuanto se estrene el portal. Esta ventana es el mejor argumento
> para separar ahora y no después.

---

## 1. REGLAS NO NEGOCIABLES

Estas no se discuten, no se optimizan y no se saltan "por esta vez".

**R1 · UN SOLO proyecto de Supabase.** `vuzyhbiwnnngeohysxcw`. Las tres apps hablan con el
mismo backend. No se crea otro proyecto, no se clona la base, no se migran datos entre
proyectos. Todo el aislamiento se consigue con RLS, roles y orígenes.

**R2 · CERO pérdida de datos y CERO pérdida de credenciales.** Los 9 usuarios de `auth.users`,
los 8 perfiles de `jardines.perfiles`, los 2 eventos, las 12 solicitudes y sus contraseñas
**no se tocan, no se recrean y no se migran**. Esta separación mueve **código**, no datos.
Cualquier paso que proponga borrar, recrear o reasignar un usuario está prohibido.

**R3 · Vero Seguros no se toca.** Schema `public`, bucket `site-media`, `auth.users` compartida.
Ni directa ni indirectamente. Vale el candado entero de `CLAUDE.md`.

**R4 · Primero lo aditivo, luego se despliega, y SOLO ENTONCES se retira lo viejo.**
Nada se borra del repo actual hasta que su sustituto esté desplegado y validado por una
persona. Revocar antes de desplegar ya tumbó el formulario público una vez (`sec_05` → `sec_13`).

**R5 · El repo actual conserva su proyecto de Vercel y su URL.** `jardines-club-hipico.vercel.app`
es lo que tiene tráfico hoy. No se renombra el proyecto, no se recrea, no se cambia el dominio
de producción.

**R6 · Ninguna app arranca sin `storageKey` propio.** Cada `createClient` de Supabase declara
un `storageKey` distinto y explícito. Sin eso, dos apps que compartan origen en un preview se
pisan la sesión.

**R7 · `service_role` jamás en el bundle.** Vive solo en variables de entorno de Vercel, leído
solo desde `api/`. Se comprueba en cada fase que el bundle construido no contiene más JWT que
la `anon`, que es pública.

**R8 · Ninguna URL entre apps queda hardcodeada.** Se leen de variables de entorno. Hoy
`api/_lib/correo.js:5` tiene `SITIO_URL` fija (J-01) y **eso hay que arreglarlo antes de mudar
el portal**, no después. Ver §4.

**R9 · Las cuatro puertas pasan en CADA repo, en cada fase.**
`npm run lint` 0 · `npm run build` exit 0 · `npm run test:contratos` verde · `npm run typecheck`
sin subir de su línea base. Si una puerta falla, la fase no está terminada.

**R10 · Auditoría entre fases, obligatoria.** Al terminar cada fase se corre su checklist y se
escribe el resultado. **No se empieza la fase siguiente con una casilla sin marcar.** Si algo no
se puede comprobar, se dice y se para — no se asume.

**R11 · Sin secretos en commits, documentos, logs ni mensajes de PR.** Ni tokens, ni
`service_role`, ni contraseñas, ni correos internos, ni datos personales de clientes.

**R12 · Migraciones forward-only.** Si alguna fase necesita SQL, va como migración nueva
numerada `sec_30` en adelante, con precondiciones dentro que la hagan **fallar sin tocar nada**
si el estado no es el esperado. Toda tabla nueva en `jardines` necesita `GRANT` explícito
(ver §4, peligro P5).

---

## 2. EL REPARTO — qué se lleva cada repositorio

Auditado archivo por archivo sobre `main` = `64db16e`.

### 2.1 · WEB PÚBLICA — repo actual `jardines-club-hipico`

Se queda con el sitio y **pierde todo lo demás**.

```
src/pages/Home.jsx · src/Layout.jsx · src/pages.config.js (reducido a Home)
src/components/  (raíz, 28 archivos)
    SplashScreen · StaggeredMenu · SoundToggle · soundSystem · HeroSection
    SalonesSection · SalonOverlay · SalonGallery · ServiciosAmenidades
    ServiceAmenityCard · GaleriaSection · CtaCotizacion · FormularioModal
    ContactoSection · NoIncluyeSection · ScrollAnimationSection
    ScrollAnimationCaptions · ScrollHint · ProximamenteModal · ProximamenteCartel
    Confianza · ComoFunciona · FaqSection · BarraDulces · MediaCarrusel
    MediaViewer · AnimatedItem · ErrorBoundary
src/config/negocio.js · src/config/heroTemporal.js
src/lib/precargaHero.js · media.js · PageNotFound.jsx
src/data/resenas.json · src/data/site-data.json
api/solicitud.js
public/media/** · nano-banana/**
scripts/build-media.mjs · seed-supabase.mjs · montage.mjs · gen-images.mjs
scripts/reorder-galeria.mjs · scripts/raw/** · scripts/seed/**
index.html  (JSON-LD, og:*)  ← aquí nacen robots.txt y sitemap.xml
```

**Lo que la web PIERDE, y es el punto de todo esto:** `pages/Admin.jsx`, `components/admin/**`,
`components/auth/**`, `components/portal/**`, `components/meseros/**`, `components/mesas/**`,
`components/evento/**`, `components/invitacion/**`, y las rutas `/portal`, `/acceso/:token`,
`/staff/:token`, `/invitacion/:token` y la ruta secreta del panel.

> Hoy el bundle público es **un solo archivo de 1073 KB que incluye el panel de administración
> y el slug de su ruta secreta**. Cualquier visitante se lo descarga. Eso se termina aquí, y es
> comprobable: ver checklist de FASE 6.

### 2.2 · PORTAL DEL CLIENTE — repo `JCH-portal-cliente`

Es el que más va a crecer. Nace como PWA y su ruta raíz `/` **es el portal** (deja de ser
`/portal`).

```
src/components/portal/**  (14 archivos)
    PortalPage · PortalShell · PortalLogin · PortalInicio · PortalInactivo
    PortalDocumentos · PortalContratado · PortalArmalo · PortalSugerencias
    PortalInvitacion · PortalResena · PortalInstall · Celebracion · Dock
src/components/evento/EventoCronograma.jsx · EventoMusica.jsx · SelectorHora.jsx
src/components/mesas/MesaEditor.jsx · MesaReglas.jsx
src/components/invitacion/InvitacionPublica.jsx      ← ruta /invitacion/:token
src/lib/notificar.js · sugerencias.js · catalogo.js · media.js
src/config/negocio.js  (parcial)  ·  src/config/portal.js  (SOLO usuarioAEmail,
    CLIENTE_EMAIL_DOMINIO y GOOGLE_RESENA_URL — el ADMIN_SLUG NO viaja aquí)
api/notificar.js · api/canjear-acceso.js
public/manifest.json · public/manifest.webmanifest · public/sw.js   ← la PWA se muda AQUÍ
```

**Decisión y su razón — `/invitacion/:token` va al PORTAL.** Es lo que el cliente comparte con
**sus** invitados: pertenece a su ecosistema, no al de la casa. Hoy hay **0 invitaciones**, así
que mover la ruta no rompe ningún enlace existente.

> **Ojo con los dos manifests.** `public/` tiene hoy `manifest.json` **y**
> `manifest.webmanifest`, y `index.html` solo enlaza el primero. Antes de mudarlos hay que
> determinar cuál manda y **borrar el otro**, no arrastrar los dos.

### 2.3 · CRM / PUNTO DE VENTA — repo `JCH-CRM`

Todo lo que opera la casa. **Este repo debería ser privado** (ver checklist de FASE 0).

```
src/pages/Admin.jsx  →  pasa a ser la raíz `/` del CRM
src/components/admin/**  (16 archivos + eventos/8)
    AdminDashboard · AdminInicio · AdminLogin · AdminConfig · AdminSalones
    AdminGaleria · AdminServicios · AdminServicioItems · AdminAmenidadItems
    AdminAlimentos · AdminResenas · AdminSolicitudes · AdminAdministradores
    AdminOperativo · SalonPlanoUpload
    eventos/ AdminEventos · EventoFicha · EventoDatos · EventoDocumentos
             EventoItems · EventoRsvps · EventoEliminar · _ui
src/components/auth/RequireAdmin.jsx
src/components/meseros/**  EventoMeseros · StaffPage · AccesoPage · QrImg
src/components/mesas/EventoMesasAdmin.jsx  (+ MesaEditor y MesaReglas, ver §3)
src/components/evento/**  (compartido con el portal, ver §3)
src/lib/tokenSeguro.js · erroresPuerta.js · catalogos.js · solicitudAEvento.js
    cronogramaSugerencias.js
src/config/portal.js  (SOLO ADMIN_SLUG)
api/crear-admin.js · crear-usuario-evento.js · correo-cliente.js
api/eliminar-evento.js · cron-recordatorios.js
vercel.json → el `crons` de recordatorios se muda aquí
```

**Rutas `/staff/:token` y `/acceso/:token` van al CRM**: las usa el personal de la casa, no el
cliente. Hoy los tokens de staff se rotan y se entregan de uno en uno, así que cambiar de origen
no invalida nada permanente.

### 2.4 · COMPARTIDO POR LOS TRES

Esto es el problema de diseño más importante del reparto. Si se copia y pega, tendrás **tres
verdades distintas sobre la misma base** y los bugs se arreglarán una vez y seguirán vivos dos.

```
src/api/base44Client.js     ← EL SHIM. El único acceso a datos de todo el proyecto
src/api/supabaseClient.js
src/api/authContext.jsx     ← portal + CRM (la web deja de necesitarlo, ver §3.7)
src/components/ui/**        ← shadcn/ui (~45 archivos) + ui/Estado.jsx
src/lib/utils.js · query-client.js · fechas.js · useCarga.js
src/styles/theme.css · src/index.css
api/_lib/guard.js · correo.js · reglas-credenciales.js · telefono.js
scripts/test-contratos-api.mjs   ← los 322 contratos, que hay que repartir
```

**Decisión obligatoria en FASE 0:** cómo se comparte. Tres opciones, con su coste:

| Opción | A favor | En contra |
|---|---|---|
| **Paquete npm privado** (`@jch/core`) | una sola verdad, versionado real | hay que publicar y versionar en cada cambio |
| **Submódulo de git** | sin registry, sincronía explícita | los submódulos se olvidan de actualizar; fricción diaria |
| **Copia + contrato que compara** | cero infraestructura, arranca hoy | tres copias que hay que mantener a mano |

**Recomendación:** empezar con **copia + contrato** en las fases 2 y 3 —para no bloquear la
separación en un problema de tooling— y extraer el paquete en cuanto las tres apps estén vivas.
El contrato tiene que comparar los archivos compartidos byte a byte entre los tres repos y
fallar si divergen. Sin ese contrato, la copia es deuda pura.

---

## 3. LOS SIETE ACOPLAMIENTOS CRUZADOS — hay que romperlos ANTES de mover nada

Salieron de recorrer los `import` reales, no de suponerlos.

| # | Dónde | Qué pasa | Cómo se rompe |
|---|---|---|---|
| **A1** | `portal/PortalInicio.jsx:8` → `@/components/admin/eventos/_ui` | **el portal depende del CRM** | extraer `_ui.jsx` a `src/components/ui/` como módulo neutral, en el repo actual, antes de partir |
| **A2** | `mesas/MesaReglas.jsx:5` → `@/components/admin/eventos/_ui` | idem | mismo movimiento que A1 |
| **A3** | `portal/PortalArmalo.jsx:12` → `@/components/MediaCarrusel` | **el portal depende de la web pública** | `MediaCarrusel` y `MediaViewer` pasan a compartidos |
| **A4** | `portal/PortalShell.jsx:13-15` → `evento/*` y `mesas/MesaEditor` | portal y CRM usan los mismos componentes de evento | `components/evento/**` y `components/mesas/**` van a COMPARTIDOS |
| **A5** | `admin/eventos/EventoFicha.jsx:7-10` → `evento/*`, `mesas/EventoMesasAdmin`, `meseros/EventoMeseros` | interno del CRM | no hay que romperlo; viaja entero al CRM |
| **A6** | `auth/RequireAdmin.jsx:13` → `admin/AdminLogin` | interno del CRM | viaja entero al CRM |
| **A7** | `pages/Home.jsx:4` → `@/api/authContext` | **solo existe para el auto-redirect al portal**, que el dueño quiere fuera | se borra el redirect y **la web pública queda sin código de auth** — es el mayor recorte de superficie de todo el plan |

`_ui.jsx` además importa `@/lib/catalogos` (línea 55), así que al extraerlo hay que llevarse
esa dependencia o cortarla.

---

## 4. LOS SEIS PELIGROS QUE PUEDEN ROMPER PRODUCCIÓN

Ordenados por lo que cuesta arreglarlos si se descubren tarde.

**P1 · EL ENLACE MÁGICO DE PRIMER ACCESO. El más grave.**
`api/crear-usuario-evento.js:229` construye `${SITIO_URL}/portal#entrar=<token>` y
`api/_lib/correo.js:5` tiene `SITIO_URL` **hardcodeada** al dominio de Vercel de la web.
Si el portal se muda de origen y esto no cambia primero, **ningún cliente nuevo puede entrar**,
y el token es de un solo uso: el correo se quema sin que nadie lo note. Lo mismo en
`api/correo-cliente.js:124` y `:132`.
→ **`SITIO_URL` tiene que dejar de ser constante y pasar a variable de entorno, con una URL por
app (`URL_WEB`, `URL_PORTAL`, `URL_CRM`), en FASE 1 — antes de mudar nada.**

**P2 · LAS SESIONES ABIERTAS SE PIERDEN.**
Al cambiar de origen, `localStorage` cambia: quien tenga sesión iniciada hoy en el sitio web
tendrá que volver a entrar en el portal nuevo. **No se pierde la cuenta ni la contraseña**
(R2 lo prohíbe), solo la sesión activa. Hay que avisar a los 2 clientes con portal antes de
FASE 4. Y cada app necesita su `storageKey` (R6).

**P3 · EL CRON SE QUEDA HUÉRFANO.**
`vercel.json` define `crons` apuntando a `/api/cron-recordatorios`. Si esa función se muda al
CRM y el `crons` se queda en la web, el cron llama a una ruta que ya no existe y **el resumen
diario deja de llegar sin avisar**. El `crons` y la función se mudan **juntos**, y el
`CRON_SECRET` se configura en el proyecto nuevo antes del primer disparo.

**P4 · LA CSP Y LAS VARIABLES DE ENTORNO SON POR PROYECTO.**
`vercel.json` lleva CSP en modo enforcing (`default-src 'self'`). Cada proyecto nuevo necesita
su propio `vercel.json` completo — no se hereda nada. Y cada uno necesita `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`, y los que use de `SUPABASE_SERVICE_ROLE`, `GMAIL_*`, `MAIL_TO`,
`CRON_SECRET`, `VITE_ADMIN_SLUG`. **Un proyecto sin sus variables construye bien y falla en
runtime**, que es la peor forma de fallar.

**P5 · `sec_27` YA CAMBIÓ LAS REGLAS PARA LAS TABLAS NUEVAS.**
La migración `jardines_sec_27_permisos_por_columna_y_defaults` está aplicada y hace
`alter default privileges ... revoke all on tables from anon, authenticated`. Consecuencia:
**toda tabla nueva en `jardines` nace sin grants**, y por el shim (J-02) fallará **en silencio**,
devolviendo lista vacía en vez de un error. Cualquier fase que cree una tabla debe incluir el
`GRANT` explícito y comprobarlo.
*(Aviso: pese a su nombre, esa migración **no** implementa permisos por columna. J-10 y J-11
siguen abiertos: `authenticated` tiene UPDATE de tabla completa sobre `jardines.eventos` —
`auth_user_id` incluida— y `eventos_del` permite DELETE desde el navegador. Verificado contra
los grants reales el 24-ago.)*

**P6 · EL PROYECTO DE VERCEL TRAE PROTECCIÓN SSO HEREDADA.**
El proyecto actual tiene `ssoProtection` en modo `all_except_custom_domains`: los alias de
preview quedan detrás de login de Vercel y el de producción abierto (comprobado). Los proyectos
nuevos nacerán con la configuración por defecto del equipo. **Hay que comprobar explícitamente
que el portal en producción queda ABIERTO** —si no, los clientes ven una pantalla de login de
Vercel— y decidir si el CRM se queda con Password Protection encendido (recomendado: sí; la
cuenta es Pro, no cuesta extra, y sustituye a la idea del "subdominio no adivinable").

---

## 5. LAS FASES

Cada fase termina con su checklist. **R10: no se empieza la siguiente con una casilla sin
marcar.**

---

### FASE 0 — Decidir y congelar · sin escribir una línea de código

Sirve para que ninguna decisión se tome a media migración.

**Qué se decide:**
- Cómo se comparte el código común (§2.4). Recomendado: copia + contrato ahora, paquete después.
- Si `JCH-CRM` pasa a privado. **Recomendado: sí.** Hoy es público y contiene el slug del panel.
- Si `JCH-portal-cliente` es público o privado (da igual funcionalmente; público facilita el
  trabajo de las sesiones de IA).
- Nombres definitivos de los proyectos de Vercel: `jch-portal-cliente` y `jch-crm`.
- Si se aplica `sec_29` antes o después de separar (no bloquea; recomendado: después).

**Checklist FASE 0**
- [ ] Los dos repos existen, están vacíos y su rama por defecto es `main`
- [ ] Decidido y escrito aquí: mecanismo de código compartido
- [ ] Decidido y escrito aquí: visibilidad de cada repo
- [ ] Inventario de **todas** las variables de entorno del proyecto actual de Vercel, con a qué
      proyecto va cada una (los **valores** no se copian a ningún documento — R11)
- [ ] Copia de seguridad verificada de `public/media` **fuera de git** (hoy es la única copia:
      el bucket `sitio` tiene 0 objetos)
- [ ] Foto del estado de la base: recuentos de las 8 tablas de §0, guardada para comparar al
      final

---

### FASE 1 — Preparativos ADITIVOS, todos en el repo actual

Nada se mueve todavía. Se prepara el terreno para que mover sea trivial. Cada punto se despliega
y se verifica en producción **antes** de pasar a FASE 2.

1. **Romper A1 y A2:** extraer `admin/eventos/_ui.jsx` a un módulo neutral en
   `src/components/ui/`. Actualizar los 5 llamadores (`PortalInicio`, `MesaReglas`,
   `AdminInicio`, `AdminAdministradores`, `AdminResenas`).
2. **Romper A3:** `MediaCarrusel` y `MediaViewer` pasan a considerarse compartidos.
3. **Romper A7:** borrar el auto-redirect de `Home.jsx` (líneas ~57-62) y su import de
   `authContext`. **Esto ya lo quería el dueño por su cuenta.**
4. **P1 — matar `SITIO_URL`:** convertirla en variables de entorno `URL_WEB`, `URL_PORTAL`,
   `URL_CRM` con valor por defecto igual al de hoy, de modo que **el comportamiento no cambie**.
   Actualizar `crear-usuario-evento.js`, `correo-cliente.js`, `crear-admin.js`,
   `cron-recordatorios.js`.
5. **Contratos:** marcar cada uno de los 322 con a qué app pertenecerá (web / portal / CRM /
   común). Sin moverlos todavía.

**Checklist FASE 1** — todo verificado contra `jardines-club-hipico.vercel.app` desplegado
- [ ] `npm run lint` 0 · `build` exit 0 · `test:contratos` verde · `typecheck` en línea base
- [ ] Ningún archivo de `components/portal/**` ni de `components/mesas/**` importa ya de
      `components/admin/**` (comprobado por búsqueda, no por lectura)
- [ ] `Home.jsx` no importa `authContext` y entrar con sesión de cliente **ya no** empuja al portal
- [ ] Los cuatro correos siguen enlazando exactamente a donde enlazaban antes
- [ ] El formulario público de cotización sigue creando solicitud **y** mandando correo
- [ ] Los 322 contratos tienen etiqueta de destino

---

### FASE 2 — Nacer el PORTAL · `JCH-portal-cliente`

El repo actual **no se toca**. El portal nace en paralelo y convive.

1. Proyecto Vite limpio en `JCH-portal-cliente` (mismo stack: React + Tailwind + shadcn).
2. Copiar lo de §2.2 + lo compartido de §2.4. **Copiar, no cortar.**
3. `createClient` con `storageKey: "jch-portal"` (R6) y `db: { schema: "jardines" }`.
4. La ruta raíz `/` es el portal. `/invitacion/:token` como segunda ruta.
5. Mudar la PWA: resolver el conflicto de los dos manifests y llevarse el `sw.js`.
6. `vercel.json` propio: CSP completa, `Cache-Control: no-store` en `/api/*`, y **`noindex`**.
7. Proyecto de Vercel `jch-portal-cliente` ligado al repo. Variables de entorno puestas.
8. Desplegar y **comprobar que la URL de producción NO pide login de Vercel** (P6).

**Checklist FASE 2**
- [ ] Las cuatro puertas pasan en el repo nuevo
- [ ] La URL de producción del portal abre sin login de Vercel, desde una ventana privada
- [ ] Un cliente real entra con su usuario y contraseña **de siempre** — sin recrear cuentas (R2)
- [ ] Ve su evento, sus documentos, su cronograma, su música y sus sugerencias
- [ ] El bundle del portal **no** contiene el slug del panel ni ninguna referencia a
      `eliminar-evento`, `crear-admin` ni `AdminSolicitudes`
- [ ] El bundle no contiene más JWT que la `anon` (R7)
- [ ] `noindex` verificado en la respuesta HTTP
- [ ] El sitio web actual sigue funcionando **exactamente igual** que antes de esta fase

---

### FASE 3 — Nacer el CRM · `JCH-CRM`

Idéntico procedimiento. El repo actual sigue sin tocarse.

1. Copiar lo de §2.3 + lo compartido. `storageKey: "jch-crm"`.
2. La raíz `/` es el panel, detrás de `RequireAdmin`. Se conserva el `ADMIN_SLUG` como capa
   extra si el dueño quiere, **pero deja de contarse como protección**: está en un repo público.
3. Rutas `/staff/:token` y `/acceso/:token`.
4. Mudar el `crons` **junto con** `cron-recordatorios.js` (P3) y poner `CRON_SECRET`.
5. `vercel.json` propio + `noindex` + decidir Password Protection (P6).

**Checklist FASE 3**
- [ ] Las cuatro puertas pasan
- [ ] El dueño entra al panel con **su cuenta de siempre** y ve los 2 eventos y las 12 solicitudes
- [ ] Alta de cliente, enlace de primer acceso, subir documento, aviso de cotización y generar
      link de meseros: **los cinco probados a mano con credenciales reales**
- [ ] El cron dispara y el resumen diario llega
- [ ] `noindex` verificado
- [ ] La web pública y el portal siguen funcionando igual

---

### FASE 4 — Conectar las tres y redirigir a la gente

Aquí es donde el usuario empieza a ver el cambio.

1. En el menú de la web pública, "Portal del cliente" apunta a la **URL del portal nuevo**.
2. Los correos empiezan a usar `URL_PORTAL` y `URL_CRM` de verdad (P1).
3. En el repo actual, `/portal` deja de servir el portal y pasa a **redirigir** a la URL nueva.
   No se borra: redirige. Igual con `/invitacion/:token`.
4. Avisar a los 2 clientes con portal activo de que tendrán que volver a iniciar sesión (P2).

**Checklist FASE 4**
- [ ] Un cliente nuevo, creado desde el CRM, recibe su enlace mágico y **entra al portal nuevo**
      al primer intento. *(Esta es la casilla más importante de todo el plan — P1.)*
- [ ] `SITIO_URL` ya no aparece hardcodeada en ningún archivo de `api/`
- [ ] `/portal` en la web vieja redirige, no 404
- [ ] Los 2 clientes existentes entraron al portal nuevo con sus credenciales de siempre
- [ ] El formulario público sigue creando solicitud y mandando correo

---

### FASE 5 — Validación humana, con una persona delante

**No es opcional y no la puede firmar una IA.** El estado formal del proyecto es
`ESPERANDO_VALIDACION_HUMANA_AUTENTICADA` desde antes de empezar esto, y esta separación no se
declara terminada mientras siga así.

**Checklist FASE 5** — Miguel, con credenciales reales, en un navegador
- [ ] Sitio público: navegación, galería, salones y formulario de cotización
- [ ] Portal: login, evento, documentos, invitación, sugerencias
- [ ] CRM: los cinco flujos de FASE 3, otra vez, ya con todo conectado
- [ ] Los recuentos de la base **coinciden con la foto de FASE 0**: 2 eventos, 12 solicitudes,
      9 usuarios, 8 perfiles. *(Si un número cambió sin que nadie lo pidiera, se para todo.)*
- [ ] Vero Seguros intacto: su admin entra a su aplicación

---

### FASE 6 — RETIRAR del repo actual · el único paso destructivo

**Solo se ejecuta con las fases 2 a 5 cerradas y firmadas.** Es la aplicación literal de R4.

1. Borrar del repo actual: `pages/Admin.jsx`, `components/admin/**`, `components/auth/**`,
   `components/portal/**`, `components/meseros/**`, `components/mesas/**`,
   `components/evento/**`, `components/invitacion/**`.
2. Borrar `api/crear-admin.js`, `crear-usuario-evento.js`, `correo-cliente.js`,
   `eliminar-evento.js`, `canjear-acceso.js`, `notificar.js`, `cron-recordatorios.js`.
   **Se queda solo `api/solicitud.js`** (+ `_lib/`).
3. Quitar las rutas del `App.jsx` de la web y reducir `pages.config.js`.
4. Quitar el `crons` del `vercel.json` de la web.
5. Reducir el shim de la web a lo que la web usa.
6. Repartir los contratos según las etiquetas de FASE 1.

**Checklist FASE 6 — la prueba de que la separación sirvió de algo**
- [ ] El bundle público **no contiene** el slug del panel · comprobado sobre el archivo servido
- [ ] El bundle público no contiene `AdminSolicitudes`, `eliminar-evento`, `crear-admin`,
      `PortalShell` ni `EventoMeseros`
- [ ] El bundle público **pesa sensiblemente menos que 1073 KB** (anotar el número real)
- [ ] Las cuatro puertas pasan en los **tres** repos
- [ ] Las tres aplicaciones siguen funcionando después del borrado
- [ ] Ninguna de las tres importa nada de otra

---

### FASE 7 — Cierre documental

Sin esto, la próxima sesión trabaja con documentación que miente — que es exactamente el
problema que este proyecto ya tuvo (`ESTADO.md` afirmando que 8A estaba mergeado cuando no).

**Checklist FASE 7**
- [ ] `CLAUDE.md` de cada repo, con su alcance y sus reglas
- [ ] `docs/ESTADO.md` reescrito y anclado al commit real de cada repo
- [ ] `PROJECT_CONTEXT.md` actualizado
- [ ] `docs/CHANGELOG.md` con el bloque de la separación
- [ ] `docs/ARCHITECTURE.md` describiendo **tres** aplicaciones, no una
- [ ] `docs/FILE_MAP.md` de cada repo
- [ ] Este documento marcado como **EJECUTADO**, con fecha y con lo que se desvió del plan
- [ ] Eliminada la referencia muerta a `docs/AUDITORIA-FUNCIONAL.md`, que no existe

---

## 6. LO QUE ESTE PLAN NO HACE — a propósito

- **No cierra J-10 ni J-11.** Son policies de una base compartida y exigen migración con el
  orden de `docs/SEGURIDAD.md` §8.bis. Mezclarlo con la separación es meter dos cambios de
  riesgo en la misma ventana. Va inmediatamente después, como bloque propio.
- **No saca los 577 MB de medios de git.** Reescribir la historia de un repo que **es**
  producción y está conectado a Vercel es una operación con filo propio, y además las rutas
  `/media/...` están **dentro de los datos de Supabase**: es también una migración de datos.
  Bloque aparte.
- **No rediseña el sitio web.** Eso es el paso 2 del dueño y empieza cuando esto termine.
- **No aplica `sec_29`.** Decisión pendiente, no bloquea.
- **No compra el dominio.** Va al final, y será `.mx` (el `.com` y el `.com.mx` están tomados
  por terceros).
