# DECISIONS.md

Registro de decisiones técnicas y de producto (formato: decisión · razón · consecuencia · archivos).

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
- **Consecuencia:** se valida por hash (con doble lectura de compatibilidad) y el riesgo residual
  queda documentado. El retiro está escrito en el archivo `.noapply`.
- **Archivos:** `sec_04`, `PENDIENTE_jardines_sec_10_*.noapply`.

### D-SEC-5 — Las configuraciones globales de Auth no se tocan
- **Razón:** password policy, protección de contraseñas filtradas, JWT, SMTP y redirect URLs son
  compartidas con Vero; cambiarlas podría afectar su inicio de sesión.
- **Consecuencia:** se reportan como pendientes compartidos en `docs/SEGURIDAD.md` §9.

## 2026-07-03

### D1 — Migración estática (sin backend) en vez de recrear la base de datos
- **Razón:** el cliente quería salir de Base44 rápido, con el sitio idéntico, simple y barato. No
  necesitaba edición en vivo constante.
- **Consecuencia:** contenido congelado en JSON; el panel admin no persiste; cambios de contenido se
  hacen en código (`scripts/raw/*.json`).
- **Archivos:** `src/data/site-data.json`, `scripts/build-media.mjs`, `scripts/raw/*`.

### D2 — SHIM que imita el SDK de Base44
- **Razón:** evitar reescribir todos los componentes (Home, formulario, admin) que llamaban
  `base44.entities.*`.
- **Consecuencia:** los componentes quedaron intactos; el archivo se llama `base44Client.js` pero es
  100% local. Cirugía mínima.
- **Archivos:** `src/api/base44Client.js`.

### D3 — Auto-hospedar TODOS los medios
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
