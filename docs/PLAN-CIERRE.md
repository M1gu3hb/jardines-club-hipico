# PLAN-CIERRE.md — FASES 4 a 7: conectar, retirar y documentar

> ## ✅ EJECUTADO — 2026-08-24
>
> Este plan está **cumplido y desplegado**. Se conserva entero porque explica POR QUÉ se hizo
> cada cosa, y eso no caduca. Lo que se desvió del plan está anotado en `docs/ESTADO.md` y,
> con detalle, en los mensajes de commit de cada fase.
>
> **Lo que se desvió:** el §2.b pedía Password Protection en `jch-crm` antes de las variables. El dueño la descartó —exige plan superior— y en su lugar el panel volvió tras `ADMIN_SLUG` con `/` en 404, que recupera la misma capa de descubrimiento y es gratis. Las cuatro casillas de la FASE 4 que exigen credenciales quedaron sin comprobar, por decisión suya, y están escritas en `docs/NEXT_STEPS.md`. Al repartir los contratos aparecieron doce secciones que no quedaban en ningún repo: nueve se recuperaron reescribiéndolas para recorrer el `api/` real de cada uno.

> **2026-08-24 · Continuación de `docs/PLAN-INDEPENDIZACION.md`.**
> Las FASES 1, 2 y 3 están **hechas y desplegadas**. Este documento cubre lo que falta.
> Donde este documento contradiga al anterior en las fases 4–7, **gana este**: el dueño relajó
> la restricción de validación humana y añadió el reparto de documentación.

---

## 0. Estado auditado el 2026-08-24, después de FASE 3

Verificado contra GitHub, Vercel y Supabase — no contra el reporte de la sesión anterior.

| App | Repo · commit | Proyecto Vercel | URL |
|---|---|---|---|
| Web pública | `jardines-club-hipico` · `5bf5602` | `jardines-club-hipico` | `jardines-club-hipico.vercel.app` |
| Portal | `JCH-portal-cliente` · `5fb5750` | `jch-portal-cliente` | `jch-portal-cliente.vercel.app` |
| CRM | `JCH-CRM` · `339bd32` | `jch-crm` | `jch-crm.vercel.app` |

**La base de datos está intacta**, que era la regla R2:

```
eventos 2 · perfiles 8 · auth.users 9 · admin_users de Vero 1
solicitudes 13  (12 + la solicitud de prueba de FASE 1, confirmada por correo)
invitaciones 0 · mesas 0 · documentos 0
```

**Nada se borró del repo de la web.** Sigue sirviendo el sitio con el panel dentro; eso es lo
que retira la FASE 6.

---

## 1. DOS CORRECCIONES DE HECHO — antes de ejecutar nada

### 1.1 · Los eventos NO hay que migrarlos: nunca se movieron

Las tres aplicaciones hablan con **el mismo proyecto de Supabase**, el mismo schema `jardines`
y la misma tabla `jardines.eventos`. Los 2 eventos **ya están ahí** y el CRM los verá en cuanto
tenga sus variables de entorno. No hay copia, no hay pega, no hay migración.

**Recrearlos sería destructivo, no conservador.** Un evento nuevo nace con un `id` nuevo, y de
`eventos.id` cuelgan **14 tablas** por clave foránea (`documentos`, `mesas`, `invitaciones`,
`rsvps`, `cronograma`, `musica`, `items_contratados`, `evento_notas`, `evento_wishlist`,
`evento_reglas_mesas`, `accesos`…) más `eventos.solicitud_id`, que es el rastro de qué lead lo
originó. Copiar y pegar rompería todo eso a cambio de nada.

**Regla: en las FASES 4–7 no se crea, no se borra y no se reescribe ni una fila de
`jardines.eventos`.** Lo único que se verifica es que sigan siendo 2 y con los mismos datos.

### 1.2 · Borrar usuarios de Auth es la operación más peligrosa del proyecto

El dueño autorizó reiniciar credenciales. Se puede, pero **no borrando filas de `auth.users`**:

- `auth.users` está **compartida con Vero Seguros** y tiene 9 filas. Una de ellas es el
  **único** administrador de Vero (`public.admin_users` tiene exactamente 1 fila).
- `deleteUser` es un *hard delete*. Este proyecto ya tuvo un P0 por esto (bloque 8F), y por eso
  `api/_lib/guard.js` es el único sitio que puede llamarlo, con `borrarUsuario(admin, userId,
  permiso)` y cinco condiciones que se comprueban antes.
- `jardines.perfiles.user_id` cae en CASCADA. Borrar mal deja huérfanos o se lleva una cuenta
  ajena.

**Camino seguro para "empezar con credenciales nuevas", en este orden:**

1. **No borrar nada.** Cambiar la contraseña del usuario existente, o reemitir el enlace de
   primer acceso desde el CRM (`crear-usuario-evento` ya lo hace y es idempotente).
2. Si de verdad hay que dar de baja una cuenta de cliente, se hace **desde el CRM**, con el
   endpoint que ya existe y sus cinco guardas — nunca por SQL suelto ni desde Studio.
3. **Jamás** tocar la cuenta cuyo correo no termine en `@portal.jardines.local` o
   `@staff.jardines.local`. Los correos reales son de administradores, y uno de ellos es de Vero.

---

## 2. PRERREQUISITO QUE SOLO PUEDE HACER EL DUEÑO

Nada de la FASE 4 se puede validar sin esto. No es una excusa: Vercel **no devuelve el valor**
de las variables cifradas, así que no se pueden copiar entre proyectos por CLI ni por API.

**a) Variables de entorno**

- `jch-portal-cliente` → `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `MAIL_TO`
- `jch-crm` → las siete anteriores **+ `CRON_SECRET`**

**b) Protección del CRM — abierto ahora mismo, y es lo más urgente**

Auditado hoy: `jch-crm` **no tiene ni SSO ni Password Protection**. Su URL es adivinable y
sirve el panel de administración. Hoy es inofensivo porque sin variables no habla con Supabase;
**en el momento en que se pongan las variables, el panel queda expuesto en una URL pública**.
La `anon key` es pública por diseño y la barrera real es RLS + `RequireAdmin`, pero eso no es
razón para dejar la puerta abierta cuando cerrarla es gratis.

→ **Activar Password Protection (o Vercel Authentication) en el proyecto `jch-crm` antes de
ponerle las variables.** El repo `JCH-CRM` además es público; conviene pasarlo a privado.

---

## 3. FASE 4 — Conectar las tres

1. En la web pública, el enlace "Portal del cliente" del menú apunta a la URL del portal.
2. `URL_PORTAL` y `URL_CRM` pasan a sus valores reales en las variables de entorno de cada
   proyecto. **Los cuatro correos y los dos enlaces mágicos tienen que apuntar al portal.**
3. **Decidir el enlace mágico del admin.** La sesión anterior encontró que
   `api/crear-admin.js:137` construye `/portal#entrar=<token>` y que ese token lo canjea
   `PortalLogin.jsx` — o sea, **el alta de un administrador se redime en el portal, no en el
   CRM**. El plan original no lo contemplaba. Hay dos salidas y hay que elegir a propósito:
   (a) que el correo del admin apunte a `URL_PORTAL` y el portal, tras canjear, redirija al CRM
   según el rol que devuelve el servidor; o (b) duplicar la pantalla de canje en el CRM.
   **Recomendada: (a)** — el servidor ya decide el `destino` por rol en `canjear-acceso`.
4. En el repo de la web, `/portal` y `/invitacion/:token` **redirigen** (301) a la URL nueva.
   No se borran todavía: redirigen.

**Checklist FASE 4**
- [ ] Las dos apps nuevas arrancan y leen de Supabase (ya no sale "El sitio no está configurado")
- [ ] El CRM muestra **los 2 eventos y las 13 solicitudes** que ya existen — sin haber creado ni
      tocado ninguna fila
- [ ] Un cliente entra al portal nuevo
- [ ] Un enlace de primer acceso recién emitido lleva al portal nuevo y funciona al primer intento
- [ ] `/portal` en la web vieja redirige, no 404
- [ ] El formulario público sigue creando solicitud y mandando correo

---

## 4. FASE 5 — Validación (relajada por el dueño)

El dueño confirmó: **nadie está usando el portal**, el CRM lo operan él y una persona que ya
está enterada, y el correo de la prueba de FASE 1 **llegó bien**. Eso permite validar sin
ventana de mantenimiento.

Lo que **no** se relaja:

- [ ] `select count(*) from jardines.eventos` = **2**, con los mismos `id`, `nombre_evento`,
      `fecha_evento`, `salon_id` y montos que hoy
- [ ] `auth.users` = 9 y `public.admin_users` (Vero) = 1
- [ ] El administrador de Vero entra a su aplicación sin problema
- [ ] Las cuatro puertas pasan en los tres repos

---

## 5. FASE 6 — Retirar del repo de la web · único paso destructivo

Tal como está escrito en `PLAN-INDEPENDIZACION.md` §5 FASE 6. Se ejecuta **solo** con la
FASE 4 cerrada.

**La prueba de que sirvió:**
- [ ] El bundle público no contiene el slug del panel, ni `AdminSolicitudes`, ni
      `eliminar-evento`, ni `crear-admin`, ni `PortalShell`
- [ ] El bundle público pesa **sensiblemente menos de 1099 KB** (anotar el número real)
- [ ] `api/` de la web se queda **solo** con `solicitud.js` y `_lib/`
- [ ] Ninguna de las tres apps importa nada de otra

**Y aquí se resuelve el hueco que la FASE 2 dejó abierto a propósito:** el shim
(`src/api/base44Client.js`) nombra `eliminar-evento`, `crear-admin`, `crear-usuario-evento` y
`correo-cliente` en los tres repos. La sesión anterior hizo lo correcto al no bifurcarlo por su
cuenta y congelar la lista con un contrato. Ahora hay que decidirlo: separar el shim en un
**núcleo común** (entidades, RPC, storage, auth — idéntico en los tres) y un **módulo de
funciones por app** que solo declare las rutas que esa app tiene desplegadas.

---

## 6. FASE 7 — Documentación: cuatro juegos, ninguno con menos información

Esto no es cosmético. Es la red contra que se agote una ventana de contexto o se compacte una
sesión. **Nada de memoria: todo contexto en archivo.**

### 6.1 · Los cuatro juegos

| Juego | Dónde vive | Qué contiene |
|---|---|---|
| **GENERAL** | `jardines-club-hipico/docs/` (canónico) | Todo el ecosistema: las tres apps, el Supabase compartido, Vero, el histórico completo. **Es el que ya existe. Se ACTUALIZA, no se recorta: no se borra una sola línea de información.** |
| **WEB** | `jardines-club-hipico/docs/app/` | Solo el sitio público |
| **PORTAL** | `JCH-portal-cliente/docs/` | Solo el portal |
| **CRM** | `JCH-CRM/docs/` | Solo el CRM |

### 6.2 · Las copias del GENERAL, sin divergencia

El dueño quiere el juego general disponible desde cualquier repo. Copiarlo a mano crea tres
verdades distintas — el mismo error que el plan señala para el shim.

**Solución, reutilizando maquinaria que ya existe:** copiar el juego GENERAL a
`docs/general/` en los dos repos nuevos, y registrarlo en `scripts/compartidos.json` con su
`sha256` —el mecanismo que la FASE 2 ya construyó y que un contrato verifica en cada ejecución—.
Si alguien edita la copia y no el canónico, **la suite falla**. Así hay cuatro copias reales y
una sola verdad.

### 6.3 · Qué lleva CADA juego

En los tres juegos por app, adaptado a esa app y **verificado contra el código real de ese
repo**, no copiado del general:

```
CLAUDE.md          reglas que no se rompen EN ESE REPO + comandos + puertas + línea base
docs/ESTADO.md     qué hay en producción HOY, con su commit y su URL, sin optimismo
docs/ARCHITECTURE.md   capas y flujos de ESA app
docs/FILE_MAP.md   qué hace cada archivo de ESE repo
docs/DATABASE.md   SOLO las tablas y RPC que ESA app toca, y con qué rol
docs/SEGURIDAD.md  lo que aplica a ESA app (el candado de Vero va en los tres)
docs/BUGS_PENDING.md  los J-## que le tocan
docs/NEXT_STEPS.md
docs/CONTRATOS.md  qué cubre su suite y qué no
docs/ECOSISTEMA.md  media página, idéntica en los tres: hay tres apps, un solo Supabase,
                    quién eres tú, dónde están las otras dos y dónde vive el general
```

### 6.4 · Reglas de la documentación

- **Cada afirmación se verifica contra el código o contra producción antes de escribirla.** Este
  proyecto ya tuvo documentación que afirmaba que un merge estaba hecho cuando no lo estaba, y
  un `ESTADO.md` anclado a un commit de 17 días atrás.
- **Del GENERAL no se borra información.** Se marca lo obsoleto como obsoleto, con fecha, y se
  añade lo nuevo. Nunca un banner encima de un cuerpo que dice lo contrario.
- **Ningún documento por app puede contradecir al general.** Si hay contradicción, se arregla,
  no se elige.
- **Cero secretos**: ni tokens, ni `service_role`, ni contraseñas, ni valores de variables de
  entorno, ni datos personales de clientes.
- El `CLAUDE.md` de cada repo abre con su **lista de lectura obligatoria**, como el actual.

**Checklist FASE 7**
- [ ] Los cuatro juegos existen y están completos
- [ ] El general no perdió una sola línea de información respecto de hoy
- [ ] Las copias de `docs/general/` están registradas con `sha256` y hay un contrato que lo verifica
- [ ] Cada `ESTADO.md` está anclado al commit real de **su** repo
- [ ] Ninguna afirmación de ningún documento contradice el código de su repo — comprobado, no supuesto
- [ ] Este documento y `PLAN-INDEPENDIZACION.md` quedan marcados como **EJECUTADOS**, con fecha
      y con lo que se desvió del plan
