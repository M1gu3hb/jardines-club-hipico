# PASOS DE MIGUEL — desbloquear a Claude Code

> **2026-08-30.** Todo lo que **solo tú puedes hacer**, y que hoy son trabas. Al terminar esto,
> Claude Code tiene autonomía real: credenciales, navegador y permiso para probar de verdad.
>
> Son **seis bloques**. Los tres primeros son los que importan; los otros tres son de minutos.
> Tiempo total: unos 30-40 minutos, casi todo esperando descargas.

---

## Antes de nada: dos cosas que ya NO tienes que hacer

**El CRM está desplegado.** `jch-crm.vercel.app` sirve `af53b8e` desde `main`, READY. La raíz es un
404 a propósito (el panel vive tras `ADMIN_SLUG`). Los tres proyectos están en producción sin un
solo error de build en tres días.

**Base44 ya no existe como dependencia.** Cero en los tres `package.json` y en los tres lockfiles.
No hay ningún `base44Client.json`. Lo único que queda es el **nombre** de `src/api/base44Client.js`,
que es el shim de datos y por dentro solo habla con Supabase. Renombrarlo es un refactor de tres
repos (54 imports, 3 manifiestos con hash, 32 ocurrencias en los contratos, ~80 documentos) y **no
arregla nada**. Si algún día molesta, se hace; hoy no es la traba.

---

## BLOQUE 1 · El navegador — la traba más grande

**Este es el motivo de que el proyecto esté por debajo del 50%.** Nada se ha visto funcionar en
pantalla: ni el panel con sesión, ni el editor de la invitación, ni el responsive del armazón, ni
el service worker sin red.

Hoy solo existe `scripts/captura.mjs` en el portal —CDP crudo contra el Chrome del sistema, sin
dependencias— y sirve para hacer fotos, no para iniciar sesión y rellenar formularios.

La solución es **Playwright en una carpeta aparte**, fuera de los tres repos, para no tocar sus
`package.json` ni sus hashes.

### Pega esto entero en PowerShell

```powershell
# --- 1.1 Comprobaciones previas -------------------------------------------
node -v
npm -v

# --- 1.2 Carpeta de pruebas de navegador, FUERA de los tres repos ---------
$P = "D:\MIS PROYECTOS\_pruebas-navegador"
New-Item -ItemType Directory -Force -Path $P | Out-Null
Set-Location -LiteralPath $P
if (-not (Test-Path -LiteralPath (Join-Path $P "package.json"))) {
  npm init -y | Out-Null
  (Get-Content -LiteralPath (Join-Path $P "package.json")) `
    -replace '"main": "index.js"', '"type": "module", "main": "index.js"' |
    Set-Content -LiteralPath (Join-Path $P "package.json")
}

# --- 1.3 Playwright + el navegador ----------------------------------------
npm install --save-dev playwright
npx playwright install chromium

# --- 1.4 Que no se suba nada por accidente --------------------------------
@"
node_modules/
capturas/
.env.local
"@ | Set-Content -LiteralPath (Join-Path $P ".gitignore") -Encoding UTF8
New-Item -ItemType Directory -Force -Path (Join-Path $P "capturas") | Out-Null

# --- 1.5 Prueba de humo: que de verdad abre un navegador ------------------
@'
import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 375, height: 812 } });
await p.goto("https://jardines-club-hipico.vercel.app/", { waitUntil: "networkidle" });
await p.screenshot({ path: "capturas/humo.png", fullPage: false });
console.log("OK ·", await p.title());
await b.close();
'@ | Set-Content -LiteralPath (Join-Path $P "humo.mjs") -Encoding UTF8

node humo.mjs
```

**Qué tiene que pasar:** la última línea imprime `OK · <título del sitio>` y aparece
`capturas/humo.png`. Si eso sale, Claude Code ya puede abrir, navegar, iniciar sesión, rellenar y
fotografiar cualquiera de las tres aplicaciones.

**Si falla `npx playwright install chromium`** por permisos, abre PowerShell como administrador y
repite solo esa línea.

---

## BLOQUE 2 · Credenciales de prueba — la segunda traba

Claude Code **nunca ha entrado al panel ni al portal**. Sin eso no puede comprobar la mitad de lo
que construye, y por eso tantas cosas quedan como «sin comprobar».

Hace falta **un administrador de prueba** (el cliente de prueba ya existe:
`pruebaportal@portal.jardines.local`).

### 2.1 · Crear el usuario

1. Entra a **Supabase → Authentication → Users → Add user → Create new user**.
2. Correo: `pruebaadmin@portal.jardines.local`
3. Contraseña: una de al menos 12 caracteres, **que no uses en ningún otro sitio**.
4. Marca **Auto Confirm User** (si no, no podrá entrar).

### 2.2 · Darle rol de admin

En **Supabase → SQL Editor**, pega y ejecuta:

> ⚠️ **CORREGIDO el 2026-08-30.** La primera versión de este bloque unía por `perfiles.id`, y la
> columna que apunta a `auth.users` es **`perfiles.user_id`**. Con el join malo parecía que el
> usuario no tenía rol cuando sí lo tenía. Es el mismo error que este proyecto ya documentó tres
> veces: **comparar dos cosas con el método equivocado y concluir sobre el dato**. El SQL de abajo
> es el correcto.

```sql
-- Le da rol admin al usuario de prueba. Idempotente: se puede correr dos veces.
update jardines.perfiles p
   set rol = 'admin'
  from auth.users u
 where u.id = p.user_id                       -- ← user_id, NO id
   and u.email = 'pruebaadmin@portal.jardines.local';

-- Comprobación: tiene que devolver una fila con rol = admin
select u.email, coalesce(p.rol,'SIN PERFIL') rol
  from auth.users u
  left join jardines.perfiles p on p.user_id = u.id
 where u.email like 'prueba%';
```

Si la comprobación dice **SIN PERFIL**, es que el trigger no lo creó. Entonces:

```sql
insert into jardines.perfiles (user_id, rol, email)
select u.id, 'admin', u.email
  from auth.users u
 where u.email = 'pruebaadmin@portal.jardines.local'
   and not exists (select 1 from jardines.perfiles p where p.user_id = u.id);
```

**Nunca insertes un perfil con `user_id` nulo**: queda huérfano, no sirve para entrar, y ensucia
los recuentos de integridad.

### 2.3 · Dejárselas a Claude Code

En PowerShell:

```powershell
$P = "D:\MIS PROYECTOS\_pruebas-navegador"
@"
# Credenciales de PRUEBA. No son de producción. Este archivo esta en .gitignore.
JCH_ADMIN_EMAIL=pruebaadmin@portal.jardines.local
JCH_ADMIN_PASS=PON_AQUI_LA_CONTRASENA
JCH_CLIENTE_EMAIL=pruebaportal@portal.jardines.local
JCH_CLIENTE_PASS=PON_AQUI_LA_CONTRASENA
JCH_EVENTO_PRUEBA=4f6b66ae
"@ | Set-Content -LiteralPath (Join-Path $P ".env.local") -Encoding UTF8

notepad (Join-Path $P ".env.local")
```

Rellena las dos contraseñas en el Bloc de notas y guarda.

> **Tres reglas sobre este archivo, y no son opcionales:**
> 1. Vive **solo** en `_pruebas-navegador`, que no es ninguno de los tres repos y ya tiene
>    `.gitignore`.
> 2. **Son cuentas de prueba.** Nunca pongas ahí tu contraseña real de administrador.
> 3. Si alguna vez se filtra, se cambian esas dos contraseñas y ya está — no dan acceso a nada
>    tuyo.

---

## BLOQUE 3 · Vercel — cuatro cosas de clic

### 3.1 · `DEPLOY_HOOK_WEB` (lleva pendiente desde el 27) 🔴

Es lo que impide que el CMS publique. Hoy el hook apunta al proyecto equivocado y el código lo
detecta y falla cerrado.

1. **Vercel → proyecto `jardines-club-hipico` → Settings → Git → Deploy Hooks.**
   Si no existe, crea uno: nombre `DEPLOY_HOOK_WEB`, rama `main`. **Copia su URL.**
2. **Vercel → proyecto `jch-crm` → Settings → Environment Variables.**
   Busca `DEPLOY_HOOK_WEB` y **pega ahí la URL del paso anterior**. Entornos: Production, Preview y
   Development.
3. **Redespliega el CRM** (Deployments → el último → ⋯ → Redeploy). Una variable nueva **no entra
   en un despliegue ya construido**: eso ya costó tres horas de 503 con el `MCP_TOKEN`.

### 3.2 · Web Analytics del sitio público

**Vercel → `jardines-club-hipico` → Analytics → Enable.** Está apagado, y por eso no puedes
distinguir «no entró nadie» de «entraron y el formulario falla». Es un botón.

### 3.3 · Comprueba que estas variables existen en `jch-crm`

Settings → Environment Variables. Solo mira que estén (los valores no me los enseñes nunca):

`MCP_TOKEN` · `CRON_SECRET` · `DEPLOY_HOOK_WEB` · `SUPABASE_URL` · `SUPABASE_SERVICE_ROLE` ·
`GMAIL_USER` · `GMAIL_APP_PASSWORD` · `VITE_SUPABASE_URL` · `VITE_SUPABASE_ANON_KEY`

Las cuatro primeras **fallan cerrado**: sin ellas la ruta responde 500 o 503 y no hace nada.

### 3.4 · `VITE_ADMIN_SLUG` — la trampa que nadie ve

Se lee con `process.env` desde `api/` en **los tres repos**, pese a llevar prefijo `VITE_`. Si solo
está definida como variable de build, `api/` la ve `undefined` y usa el literal por defecto.

Comprueba que en los tres proyectos esté marcada también para **Production**, no solo para el
build.

---

## BLOQUE 4 · Las skills en Claude Code

Que `/` no te ofrezca skills casi siempre es que no están donde el CLI las busca. Diagnóstico:

```powershell
Write-Host "`n=== Skills personales ===" -ForegroundColor Cyan
Get-ChildItem "$env:USERPROFILE\.claude\skills" -Directory -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty Name

Write-Host "`n=== Plugins ===" -ForegroundColor Cyan
Get-ChildItem "$env:USERPROFILE\.claude\plugins" -Directory -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty Name

Write-Host "`n=== Skills por proyecto ===" -ForegroundColor Cyan
foreach ($r in @("JCH","JCH-CRM","JCH-portal-cliente")) {
  $d = "D:\MIS PROYECTOS\$r\.claude\skills"
  Write-Host "$r ->" (Test-Path -LiteralPath $d)
}
```

- **Si «Skills personales» sale vacío**, las skills están en tu cuenta pero no en el CLI. La vía
  más segura es instalarlas desde el propio Claude Code con `/plugin` en una sesión interactiva.
- **Si salen listadas y aun así `/` no las ofrece**, es cosa de la interfaz, no de los archivos: en
  ese caso puedes invocarlas escribiendo el nombre completo, o pedirle a Claude Code que lea el
  `SKILL.md` por ruta directa. **Las skills que de verdad importan en este proyecto**
  (`morphiq-prs`, `contratos-por-mutacion`, `supabase-vercel-produccion`) **son documentos**: si el
  CLI no las carga, se leen como archivo y funcionan igual.

---

## BLOQUE 5 · La prueba de dos minutos que llevas debiendo

**Cero cotizaciones en tres días**, y `api/solicitud` no ha recibido ni una invocación. Puede ser
temporada o puede estar roto, y hoy no hay forma de saberlo.

**Entra desde tu teléfono a `jardines-club-hipico.vercel.app/cotizar`, rellena el formulario y
mándalo.**

- **Si llega el correo con folio** → está vivo. Es tráfico o es SEO tras el rediseño, y lo
  atacamos con la analítica ya encendida.
- **Si no llega** → tienes un P0, y sabes exactamente dónde mirar.

Hazlo antes de arrancar la sesión: cambia qué es lo urgente.

---

## BLOQUE 6 · La línea base real de las cuatro puertas

Para que Claude Code arranque sabiendo de dónde parte, y no de un documento que puede estar
desfasado:

```powershell
foreach ($r in @("JCH","JCH-CRM","JCH-portal-cliente")) {
  $d = "D:\MIS PROYECTOS\$r"
  Write-Host "`n========== $r ==========" -ForegroundColor Yellow
  Set-Location -LiteralPath $d
  if (-not (Test-Path -LiteralPath (Join-Path $d "node_modules"))) { npm ci }
  Write-Host "--- lint ---"      -ForegroundColor Cyan; npm run lint
  Write-Host "--- typecheck ---" -ForegroundColor Cyan; npm run typecheck
  Write-Host "--- contratos ---" -ForegroundColor Cyan; npm run test:contratos
  Write-Host "--- build ---"     -ForegroundColor Cyan; npm run build
}
Set-Location -LiteralPath "D:\MIS PROYECTOS"
```

Tarda unos minutos. **Guarda la salida** — es el punto de partida contra el que se mide todo lo que
venga después.

---

## Resumen: qué desbloquea cada bloque

| | Qué desbloquea |
|---|---|
| **1 · Playwright** | Que Claude Code **vea** lo que construye: sesión, editor, responsive, service worker. Es la traba grande |
| **2 · Credenciales** | Que pueda entrar al panel y al portal como admin y como clienta |
| **3.1 · Deploy hook** | Que el CMS **publique**. Lleva roto desde el 27 |
| **3.2 · Analytics** | Poder distinguir «no hay tráfico» de «el formulario falla» |
| **3.3 / 3.4 · Variables** | Que el MCP, el cron y los correos funcionen en producción |
| **4 · Skills** | Que las cargue, o saber que hay que leerlas como archivo |
| **5 · El formulario** | Saber si el negocio está perdiendo clientes ahora mismo |
| **6 · Las puertas** | Partir de números medidos, no heredados |

---

## Cuando termines

Abre la sesión nueva de Claude Code con los tres repos y dile que empiece leyendo este archivo,
`portal/14-AUDITORIA-EXTERNA.md` y `portal/11-BITACORA.md`.

**Lo que cambia respecto a todas las sesiones anteriores:** ahora puede abrir un navegador, iniciar
sesión y comprobar. Todo lo que hasta hoy quedaba como «sin comprobar» pasa a ser comprobable — y
ahí es donde está el 45% que falta.
