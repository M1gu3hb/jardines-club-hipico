# CLAUDE.md — SITIO PÚBLICO (juego de la app)

> **Este archivo manda sobre el trabajo que toca `src/`, `api/` o `vercel.json` de este repo.**
> El `CLAUDE.md` de la raíz es el del **juego GENERAL** (el histórico canónico de todo el
> ecosistema, que además viaja copiado a los otros dos repos). Los dos son válidos: el de la raíz
> cuenta de dónde viene el proyecto entero; **este** cuenta cómo se toca ESTA aplicación hoy.
> Si se contradicen sobre el estado ACTUAL del sitio público, gana este.

Sitio web público de **Jardines Club Hípico**, salón de eventos en Xochimilco, CDMX.
Repo `M1gu3hb/jardines-club-hipico` (público) · <https://jardines-club-hipico.vercel.app>

---

## LISTA DE LECTURA OBLIGATORIA — antes de tocar código

En este orden. No es decorativo: cada uno responde una pregunta que los siguientes dan por
contestada.

0. **`docs/app/ESTADO.md`** — dónde está ESTA app ahora mismo: qué commit corre, qué puertas
   pasan, qué queda abierto y qué NO se ha comprobado. Manda sobre el resto.
1. **`docs/ECOSISTEMA.md`** — hay **tres** aplicaciones y **un solo** Supabase, que además
   comparte otra empresa. Media página. Es idéntico en los tres repos: **no se edita aquí solo.**
2. **`docs/app/SEGURIDAD.md`** — el candado de Vero Seguros, qué puede hacer `anon`, la CSP y el
   reparto de secretos. **Obligatorio antes de tocar SQL, RLS, `api/`, `vercel.json` o el shim.**
3. **`docs/app/ARCHITECTURE.md`** — las cuatro capas y los dos flujos que existen.
4. **`docs/app/DATABASE.md`** — las **siete** tablas que este sitio lee y la **única** RPC que
   invoca, con el rol que usa para cada cosa.
5. **`docs/app/FILE_MAP.md`** — qué hace cada archivo del repo.
6. **`docs/app/CONTRATOS.md`** — qué afirma la suite y, sobre todo, **qué no**.
7. **`docs/app/BUGS_PENDING.md`** — lo que está roto o abierto y le toca a esta app.
8. **`docs/app/NEXT_STEPS.md`** — qué sigue, y las cinco casillas que nadie ha clicado.

Después, y solo si necesitas historia: el juego GENERAL en `docs/` (`CHANGELOG.md`,
`DECISIONS.md`, `PLAN-INDEPENDIZACION.md`, `PLAN-CIERRE.md`). Ese juego lo mantiene otra persona y
describe el proyecto **entero**, incluidas partes que ya no viven en este repositorio.

---

## Qué es y qué NO es este repositorio

Es la web pública y nada más: portada, espacios, galería, servicios, amenidades, FAQ, contacto y
el **formulario de cotización**. Una sola página React (`/`) y **una sola** ruta serverless
(`api/solicitud.js`).

**Ya no están aquí** —se fueron en la FASE 6, commit `9d0e053`— el panel de administración, el
portal del cliente, la vista de meseros, la ruta secreta del panel y siete funciones de `api/`.
Están en `M1gu3hb/JCH-CRM` y `M1gu3hb/JCH-portal-cliente`. **No los reintroduzcas aquí**: el
punto entero de la separación fue que un visitante del sitio dejara de descargárselos.

`/portal` y `/invitacion/:token` **siguen respondiendo**, pero como **redirects 301 en el borde**
declarados en `vercel.json` — no como rutas de React. Se hicieron así para no tirar las señales
que Google ya tenía, y porque un salto de cliente no las transfiere.

---

## Reglas que no se rompen EN ESTE REPO

### 1. Candado absoluto — Vero Seguros

El proyecto de Supabase `vuzyhbiwnnngeohysxcw` está **compartido con otra aplicación distinta,
Vero Seguros**, que vive en el schema `public`. Vero queda intacto siempre. **No modificar, ni
directa ni indirectamente:** su frontend, su repositorio, ninguna tabla / función / trigger /
policy / índice / dato del schema `public`, el bucket `site-media`, sus usuarios o sesiones, ni la
configuración **global** de Supabase Auth (contraseñas, JWT, SMTP, redirect URLs), que es
compartida y puede romperle el login.

Lo único realmente compartido es `auth.users` y el trigger `on_auth_user_created`. Detalle en
`docs/app/SEGURIDAD.md` §1 y en `docs/SEGURIDAD.md` §2 del juego general.

### 2. El sitio es DINÁMICO y no tiene fallback

El contenido vive en Supabase (schema `jardines`). **`src/data/site-data.json` NO es un
respaldo**: nadie en `src/` ni en `api/` lo importa — comprobado con `grep`; sus únicos lectores
son `scripts/seed-supabase.mjs` y `scripts/montage.mjs`. Si Supabase no responde, esas secciones
se pintan **vacías**. El único JSON que sí se lee en runtime es `src/data/resenas.json`,
importado por `src/components/Confianza.jsx`.

Lo que sí existe, y no es lo mismo, es `src/config/negocio.js`: los datos de contacto verificados
del negocio, para que ningún respaldo se los invente. Hay contratos que lo vigilan (1.4 y 1.5).

### 3. El acceso a datos es SOLO el shim `src/api/base44Client.js`

Conserva la API pública del viejo SDK de Base44 (`base44.entities.X.list/filter/get/create/update/
delete`, `functions.invoke`, `integrations.Core.UploadFile`, `auth`, `rpc`) y traduce
camelCase↔snake_case. Por dentro habla con Supabase vía `src/api/supabaseClient.js`.
**No reintroducir dependencias de Base44** y **no llamar a `supabase` directo desde un componente.**

El shim es **código común, compartido por copia** con los otros dos repos y registrado en
`scripts/compartidos.json` con su `sha256`. Editarlo solo aquí **rompe la suite**, y eso es
deliberado: tres copias divergentes serían tres verdades sobre la misma base. Lo que sí es propio
de cada app es `src/api/funciones.js`, que declara las rutas de `api/` que ESTA aplicación tiene
desplegadas — hoy exactamente una, `/api/solicitud`.

### 4. Este repo no autentica a nadie

La FASE 1 retiró el código de autenticación del sitio público. Aquí no hay login, ni
`AuthProvider`, ni rutas protegidas. Todo lo que el navegador hace lo hace como **`anon`**.
Si una tarea pide "que el admin entre por aquí", la respuesta es que no: eso es el CRM.

### 5. RLS es la frontera, no el dominio

Las tres apps usan la **misma `anon key`**, que es pública por diseño. Separar los repos **no**
protege los datos: lo que protege es RLS más el rol dentro del JWT. Lo que la separación sí da es
aislamiento de sesión (orígenes distintos ⇒ `localStorage` distinto) y menos superficie de código.
No escribas en ningún sitio que la separación "aisló los datos".

### 6. SQL: aditivo primero, retirada después

Migraciones **forward-only** en `supabase/migrations/`, nombradas
`<timestamp>_jardines_sec_NN_<tema>.sql`, y **el prefijo tiene que ser la versión que registró la
base** (`supabase/migrations/APLICADAS.txt` es la copia del ledger, y el contrato 1.1 la compara
contra los nombres de archivo). No reescribir migraciones aplicadas. Toda función
`SECURITY DEFINER` nueva lleva `search_path = ''`, nombres calificados y `EXECUTE` mínimo (nunca
`PUBLIC`). Al crear una tabla en `jardines` hay que activar RLS a mano.

**Revocar antes de desplegar el sustituto ya rompió el formulario público una vez** (`sec_05` →
`sec_13`). Primero lo aditivo, luego el frontend, y **solo entonces** lo restrictivo.

### 7. Medios auto-hospedados

Todo vive en `public/media/`. La CSP de `vercel.json` no admite orígenes de terceros para
imágenes y **no se ensancha**: el proyecto ya sacó imgur (D3) y Unsplash (J-12) por esto mismo, y
hay un contrato que lo impide (9D). Si agregas una imagen, ponla en `public/media/img/` y úsala
como `/media/img/...`. Los videos se detectan por extensión (`.mp4|webm|mov|ogg|m4v`).

**Los videos del hero ya están comprimidos: NO comprimirlos más.**

### 8. Un contrato se ata al uso, no al identificador

El fallo que más se ha repetido en este proyecto: un contrato que busca **un identificador suelto
sobre todo el archivo**. Si ese identificador aparece en más de un sitio, borrar el que importa
deja vivos los demás y el contrato pasa igual. Eso es **peor que no tener el contrato**.

Al escribir o tocar uno: recorta el trozo que importa con `entre()`; si lo que importa es el
orden, afirma sobre el orden (`cortaAntesDe()`), nunca sobre la distancia en caracteres; tolera el
espaciado (`\s*`); **valídalo mutando** —reintroduce la regresión real, míralo fallar, restaura
con `git checkout --` y comprueba que `git status --porcelain` sale vacío—; y si una propiedad no
se puede expresar estáticamente sin quedar frágil, **dilo y no escribas el contrato**.
Guion completo en `docs/PROMPTS.md` §9 y `docs/DECISIONS.md` D-COD-15.

### 9. Regla de secretos

Nunca poner en commits, logs, documentación, PR ni salida de pruebas: tokens, `service_role`,
JWT, contraseñas, correos personales, ni el **valor** de una variable de entorno. Los **nombres**
sí. El navegador solo usa la `anon key`; las claves privadas viven en variables de Vercel y solo
las lee `api/`.

### 10. Documentación viva

Después de cada cambio significativo, actualiza el documento que corresponda de `docs/app/`. Si
algo ya no aplica, márcalo obsoleto o bórralo — no dejes un banner encima de un cuerpo que dice lo
contrario. **`docs/ECOSISTEMA.md` no se toca aquí solo**: es idéntico en los tres repos.

---

## Comandos

```bash
npm install
npm run dev                     # http://localhost:5173
npm run build                   # genera dist/
npm run lint                    # eslint --quiet (no-undef activo: atrapa símbolos borrados)
npm run typecheck               # tsc sobre jsconfig.json
npm run test:contratos          # contratos estáticos, sin red y sin credenciales
```

Scripts de contenido (no son parte del ciclo normal, ver `docs/app/FILE_MAP.md`):

```bash
node scripts/build-media.mjs    # OJO: DESCARGA ~570 MB por red y regenera src/data/site-data.json
node scripts/seed-supabase.mjs  # NO toca la base: solo escribe scripts/seed/*.sql
```

Si tocaste SQL, además: `supabase/tests/seguridad.sql` (va en `BEGIN/ROLLBACK`, no deja rastro).

---

## Las cuatro puertas — línea base REAL de este repo

Medidas ejecutándolas aquí el **2026-08-24**, sobre el árbol de `9d0e053`:

| Puerta | Comando | Línea base | Qué significa |
|---|---|---|---|
| Lint | `npm run lint` | **0 problemas** | cero, sin excepciones |
| Build | `npm run build` | **exit 0** · bundle **775.31 kB** (gzip 234.54 kB) | el aviso de "chunks > 500 kB" es esperado, no es un fallo |
| Contratos | `npm run test:contratos` | **59/59** — reparto `web 31 · comun 28` | ninguno puede quedar en rojo |
| Typecheck | `npm run typecheck` | **9 errores** | es la línea base, **no debe SUBIR** |

**Las cifras viejas ya no valen.** Antes de la FASE 6 este repo daba 322-323 contratos y 55-59
errores de typecheck, porque contenía el panel y el portal. Si un documento del juego general cita
esos números como el estado de HOY, está desactualizado — los de arriba son los medidos.

Los 9 errores de typecheck están en seis archivos y ninguno es un fallo de ejecución: son huecos
de tipado en JSX y en el shim. Listados uno a uno en `docs/app/ESTADO.md` §4.

---

## Regla de cierre

Antes de terminar una sesión que tocó este repo, responde con: cambios hechos, archivos
modificados (rutas absolutas), documentación actualizada, bugs detectados, próximo paso
recomendado, y este bloque:

```
## Estado de documentación
* docs/app/ESTADO.md actualizado: Sí/No
* docs/app/ARCHITECTURE.md actualizado: Sí/No/No aplica
* docs/app/FILE_MAP.md actualizado: Sí/No/No aplica
* docs/app/DATABASE.md actualizado: Sí/No/No aplica
* docs/app/SEGURIDAD.md actualizado: Sí/No/No aplica
* docs/app/CONTRATOS.md actualizado: Sí/No/No aplica
* docs/app/BUGS_PENDING.md actualizado: Sí/No
* docs/app/NEXT_STEPS.md actualizado: Sí/No
* Juego GENERAL (docs/CHANGELOG.md, docs/ESTADO.md) avisado: Sí/No

## Puertas
lint __ · build __ · contratos __/59 · typecheck __ (línea base 9)

## Próximo paso recomendado
[una sola acción concreta]
```
