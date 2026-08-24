# ESTADO.md — el sitio público, sin optimismo

> **2026-08-24** · repo `M1gu3hb/jardines-club-hipico` (público) ·
> <https://jardines-club-hipico.vercel.app>
>
> **Commit de CÓDIGO: `9d0e053`** («FASE 6 (web): se retira el panel, el portal y siete
> funciones»). Encima hay un commit `2f49bf0` que **solo toca documentación** (nueve `.md`, cero
> archivos de `src/`, `api/` o `vercel.json` — comprobado con `git show --stat`), así que no
> mueve el bundle. Este documento se ancla al commit de código a propósito: si citara el último
> deployment se quedaría obsoleto cada vez que alguien escribe un `.md`.
>
> **Lo que NO puedo afirmar desde aquí:** no tengo acceso al panel de Vercel ni a la base. Todo
> lo de abajo está medido **ejecutando los comandos en este repositorio**. Que el archivo que
> Vercel sirve hoy sea exactamente este build es una afirmación del juego general
> (`docs/ESTADO.md`), que dice haberlo comprobado contra la URL de producción; yo no lo he
> vuelto a comprobar.

---

## 1. En una frase

El sitio está separado, compila, pasa sus cuatro puertas y ya no arrastra el panel ni el portal —
pero **nadie ha llenado el formulario a mano después de la separación**, y ese es el único flujo
de escritura que esta aplicación tiene.

---

## 2. Qué es este repo hoy

Una sola página React servida en `/`, más **una** ruta serverless.

| | |
|---|---|
| Rutas de React | **1** — `/` (`src/pages/Home.jsx`). Cualquier otra cae en `PageNotFound` |
| Rutas serverless | **1** — `api/solicitud.js`. `api/_lib/` (4 archivos) no se publica: Vercel ignora las carpetas que empiezan por `_` |
| Redirects 301 en el borde | **3** — `/portal`, `/portal/` y `/invitacion/:token` → el portal del cliente |
| Autenticación | **ninguna**. No hay login, ni `AuthProvider`, ni rutas protegidas |
| Rol con el que habla a la base | **`anon`**, siempre |
| Archivos rastreados | **689** al escribir esto: 687 en `9d0e053`, más las dos copias de `ECOSISTEMA.md` que entraron con `2f49bf0`. Este juego de `docs/app/` suma encima |

Reparto de esos archivos, contado con `git ls-files`:

| Carpeta | Archivos | Nota |
|---|---|---|
| `public/media/` | **473** | 241 frames de la animación de scroll, 231 en `img/`, 1 en `b44/`. De todos ellos, **25 son video** |
| `src/` | **101** | 49 son primitivas de `ui/` (shadcn) y 29 archivos propios — 28 componentes y una hoja de estilos |
| `supabase/` | **30** | 28 migraciones `.sql`, el ledger `APLICADAS.txt` y `tests/seguridad.sql` |
| `scripts/` | **22** | 5 `.mjs` de contenido, 8 SQL de seed, 7 JSON crudos, `compartidos.json` y la suite de contratos |
| `docs/` | **23** | 22 del juego general (20 `.md` + 2 muestras `.html`) y `docs/app/ECOSISTEMA.md`. Este juego de `docs/app/` se añade encima |
| `nano-banana/` | **16** | prompts y referencias de generación de imágenes |
| raíz | **14** | configuración del build, `index.html`, `vercel.json`, `CLAUDE.md`, `README.md` |
| `api/` | **5** | `solicitud.js` + `_lib/{correo,guard,telefono,urls}.js` |
| `public/` (sin media) | **4** | `favicon.png`, `sw.js` y los dos manifiestos |
| `.claude/` | **1** | `launch.json` |

---

## 3. Las cuatro puertas — ejecutadas hoy, no citadas

```
npm run lint            -> 0 problemas
npm run build           -> exit 0
npm run test:contratos  -> 59/59   (reparto: web 31 · portal 0 · crm 0 · comun 28)
npm run typecheck       -> 9 errores  (LÍNEA BASE — no debe subir)
```

El build emite `dist/assets/index-D2wWiyRD.js`, **775.31 kB** (gzip 234.54 kB) y
`dist/assets/index-B8mVm0Dt.css`, 93.70 kB (gzip 16.49 kB). Vite avisa de que hay un chunk mayor
de 500 kB: es esperado, no es un fallo, y es exactamente la cifra que la FASE 6 buscaba —el
bundle venía de 1073 kB con el panel dentro.

**Cuidado con los números de otros documentos.** El juego general todavía tiene párrafos
históricos con cifras del monolito, anteriores a la FASE 6. Localizadas hoy con `grep`, para que
nadie las tome por el estado actual:

| Cifra que aparece | Dónde | Hoy es |
|---|---|---|
| **322** contratos | `docs/ESTADO.md` (×2), `docs/PLAN-EXPANSION.md` (×2), `docs/PLAN-INDEPENDIZACION.md` (×4) | **59** |
| **278** contratos | `docs/NEXT_STEPS.md`, `docs/DEPLOY.md`, `docs/PROMPTS.md`, `PROJECT_CONTEXT.md` | **59** |
| typecheck **59** | `docs/ESTADO.md`, `docs/ARCHITECTURE.md`, `docs/BUGS_PENDING.md`, `README.md` | **9**| **7** funciones serverless | `docs/DEPLOY.md`, `docs/MAPA.md`, `PROJECT_CONTEXT.md`, `README.md` | **1** |
| **8** funciones en `api/` | `docs/PLAN-INDEPENDIZACION.md` | **1** |

El `CLAUDE.md` de la raíz **sí** está al día (dice `59/59` y 9 de typecheck). Para el estado de
hoy valen los cuatro de arriba, medidos en este repo.

---

## 4. Los 9 errores de typecheck, uno a uno

Ninguno es un fallo de ejecución; son huecos de tipado que `tsc` ve en un proyecto que es
JavaScript con `checkJs`. Se listan para que se note si alguien añade el décimo.

| Archivo | Qué dice |
|---|---|
| `src/api/base44Client.js` (×3) | `sort`/`filter` sobre `{}` y una instanciación de tipo "excesivamente profunda" en la cadena de PostgREST |
| `src/components/HeroSection.jsx` | `objectFit` sale como `string` y `CSSProperties` quiere el literal |
| `src/components/soundSystem.jsx` | `window.webkitAudioContext` no existe en la definición estándar |
| `src/components/SoundToggle.jsx` | el `useEffect` devuelve un `() => boolean` donde se espera un destructor |
| `src/components/StaggeredMenu.jsx` | la variable CSS `--sm-accent` en un objeto de estilo |
| `src/pages/Home.jsx` (×2) | props que el componente hijo no declara (`className`, `onMenuOpen`, `onMenuClose` en `StaggeredMenu`; `correoAdmin` en `FormularioModal`) |

El último es el único que huele a algo real: `Home.jsx` le pasa `correoAdmin` a
`FormularioModal`, y `FormularioModal` no lo recibe. Es una prop muerta, no un fallo — pero es
deuda que conviene mirar antes que las otras.

---

## 5. Base de datos

No se toca desde este repo, pero el repo la documenta y la vigila con contratos.

- Proyecto Supabase `vuzyhbiwnnngeohysxcw`, PostgreSQL 17, schema `jardines` (+ `jardines_private`).
- **28 migraciones** en `supabase/migrations/`: `sec_01` … `sec_29` **sin `sec_10`**.
- Según `APLICADAS.txt`, están aplicadas hasta **`sec_28`**. La única pendiente es **`sec_29`**
  (que el libro de entradas sobreviva al borrado de una invitación): escrita, con dos contratos
  que la vigilan, y **sin aplicar**. Ese archivo es la copia del ledger de la base, no la base:
  aquí no hay forma de confirmarlo contra Postgres.
- **Este proyecto NO se puede reconstruir desde cero.** Las **19** migraciones fundacionales
  están en el ledger y **no existen como archivo en el repositorio**. Son 19 y no 20 porque la
  numeración tiene un hueco: `jardines_01…11` **sin `jardines_07`** (= 10) más `operativo_01…09`
  (= 9). El hueco lo hereda `APLICADAS.txt`, que es donde se puede comprobar; no es una errata
  de esta cuenta. Un `db push` contra una base vacía fallaría en `sec_01`, que ya da por hechas
  las tablas. Recuperarlas exigiría volcar el esquema de producción, y ese volcado incluiría el
  schema `public` de Vero Seguros. Está anotado como deuda; no se resuelve desde aquí.

---

## 6. Lo que YA NO está en este repo

Retirado en la FASE 6 (`9d0e053`): **74 archivos** — el panel de administración, el portal del
cliente, la vista de meseros, las pantallas de mesas, evento e invitación, el código de
autenticación (`authContext`, `config/portal`), once módulos de `src/lib/` y **siete rutas de
`api/`**. Viven en `M1gu3hb/JCH-CRM` y `M1gu3hb/JCH-portal-cliente`.

Lo que quedó en su sitio, y es deliberado:

- **`/portal` y `/invitacion/:token` siguen respondiendo**, como redirects **301 desde el borde**
  en `vercel.json`. Se hizo en el borde y no en React porque un salto de cliente no transfiere
  las señales que Google ya tenía en esas rutas. El fragmento `#entrar=<token>` de un enlace
  mágico viejo **sobrevive al salto**, porque un fragmento no viaja al servidor.
- **El shim sigue declarando las 27 entidades**, incluidas las 19 que esta app no usa. Es el
  precio de que el núcleo sea byte a byte idéntico en los tres repos. Ver
  `docs/app/BUGS_PENDING.md`.
- `vercel.json` **ya no tiene crons**: se fueron con las funciones que los servían.

---

## 7. Lo que está abierto

Detalle en `docs/app/BUGS_PENDING.md`. En una línea cada uno:

| | |
|---|---|
| **J-03** | Si Supabase no contesta, espacios / galería / servicios / amenidades se pintan **vacíos**. No hay fallback y nunca lo hubo |
| **J-04** | `og:url` y los dos bloques JSON-LD de `index.html` apuntan a `jardinesclubhipico.com`, que **no es el dominio servido** |
| **J-02 / J-15** | El shim da por buena una escritura que RLS dejó en cero filas. Aquí casi no muerde (la única escritura es la del formulario, y esa sí comprueba), pero el código viaja |
| **J-16** | Dos RPC concedidas a `anon` que nadie invoca — `registrar_llegada_mesa` e `info_mesa_token`. `anon` es el rol de ESTA app |
| **J-10 / J-11** | Policies de `jardines` que no acotan columnas y permiten borrar un evento desde el navegador. No se disparan aquí (exigen `is_admin()`), pero son de la base que este sitio comparte |

---

## 8. Las cinco casillas que NADIE ha clicado

Están enteras y con su procedimiento en `docs/app/NEXT_STEPS.md`. La que le toca directamente a
esta aplicación es la cuarta: **que el formulario público siga creando la solicitud y mandando el
correo después de la FASE 4.** No se comprobó porque escribe en producción y el dueño pidió
saltarla. Mientras no se compruebe, el único flujo de escritura del sitio está **verificado por
contratos estáticos y por nada más**.

---

## 9. Qué gana y qué NO gana la separación

**Gana**, medido: el bundle público pasó de **1073 kB a 775 kB** y ya no contiene el slug de la
ruta del panel, `AdminSolicitudes`, `eliminar-evento`, `crear-admin`, `PortalShell` ni
`RequireAdmin`. Cualquier visitante se los descargaba. Y gana aislamiento de sesión: al vivir en
orígenes distintos, un XSS en el sitio público ya no puede leer el `localStorage` del CRM.

**No gana** frontera de datos. Las tres apps usan la **misma `anon key`**, que es pública por
diseño; lo que separa los datos es **RLS más el rol del JWT**, no el dominio desde el que se
cargó el código. Si RLS está mal, tener tres repos no salva nada.
