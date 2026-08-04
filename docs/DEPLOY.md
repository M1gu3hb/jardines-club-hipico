# Deploy, variables de entorno, correo y dominio

> Actualizado el **2026-08-03**.

## Vercel

Sitio Vite + **7 funciones serverless** en `api/`. Vercel detecta Vite automáticamente:

- **Framework preset:** Vite · **Build:** `npm run build` · **Output:** `dist` · **Install:** `npm install`
- **Rewrites (SPA), cabeceras HTTP y cron:** todo en [`vercel.json`](../vercel.json)
- Equipo `mh-astral-systems`, proyecto `jardines-club-hipico`

Cada push a `main` dispara un deploy automático. Deploy manual:

```bash
vercel deploy --prod --scope mh-astral-systems
```

## Variables de entorno

**`VITE_*` — se compilan dentro del bundle, son públicas por diseño. Dos de ellas, además, se
leen en el runtime de las funciones:**

| Variable | Para qué | ¿Dónde se lee? |
|---|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase | Front **y `api/`**: `_lib/guard.js` y `cron-recordatorios.js` la usan como respaldo si falta `SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | Clave anónima. **Nunca la `service_role`** | Front |
| `VITE_ADMIN_SLUG` | (opcional) sobreescribe la ruta secreta del panel sin tocar código | Front **y `api/`**: `notificar.js`, `canjear-acceso.js`, `cron-recordatorios.js`, `crear-admin.js` |

> ⚠️ **Si cambias `VITE_ADMIN_SLUG`, expón la variable también al runtime de las funciones**, no
> solo al build. Esas cuatro rutas hacen
> `process.env.VITE_ADMIN_SLUG || "<slug por defecto>"` para armar el enlace al panel de cada
> correo. Si el runtime no la ve, cae al valor por defecto de `src/config/portal.js` y **todos
> los correos enlazarán a una ruta que ya no existe** — sin fallar en el build ni en el front.
> En Vercel esto significa tenerla marcada para los tres entornos y para las Functions, no solo
> en Build.

**Servidor — secretas, solo en Vercel, solo se leen desde `api/`:**

| Variable | Para qué |
|---|---|
| `SUPABASE_URL` | URL del proyecto |
| `SUPABASE_SERVICE_ROLE` | Clave de servicio. **Jamás en el front, en logs ni en commits** |
| `GMAIL_USER` | Cuenta Gmail desde la que salen los correos |
| `GMAIL_APP_PASSWORD` | Contraseña de aplicación de 16 caracteres de esa cuenta |
| `MAIL_TO` | A dónde llegan las solicitudes |
| `CRON_SECRET` | Autoriza `/api/cron-recordatorios`. **Sin ella el cron no corre** (fail-closed) |

**Solo local, nunca en Vercel:**

| Variable | Para qué |
|---|---|
| `GEMINI_API_KEY` | La lee `scripts/gen-images.mjs` para generar imágenes con Nano Banana. Utilitario manual: no la necesita ni el build ni el runtime |

No hay `.env` en el repo (está en `.gitignore`). Tras cambiar una variable hay que redeploy.

## Cabeceras HTTP

`vercel.json` fija CSP en modo **enforcing**, HSTS (1 año), `X-Content-Type-Options: nosniff`,
`Referrer-Policy`, `Permissions-Policy` y `X-Frame-Options: DENY`; y `Cache-Control: no-store`
en `/api/*`.

> Si agregas un origen externo (CDN, fuente, imagen, endpoint), **decláralo en la CSP** o el
> navegador lo bloqueará en producción sin fallar en local.

## Cron

`vercel.json` programa `GET /api/cron-recordatorios` a las **15:00 UTC** diarias: manda el
digest del día y el recordatorio de reseña. La ruta compara `CRON_SECRET` en tiempo constante y
**falla cerrada** si la variable no existe. La semántica de envío es **at-least-once**: se
prefiere un correo duplicado a uno perdido.

## Correo (Gmail App Password)

1. La cuenta debe tener **Verificación en 2 pasos**: <https://myaccount.google.com/signinoptions/twosv>
2. Crea la contraseña de aplicación en <https://myaccount.google.com/apppasswords>
3. Cópiala (16 caracteres, sin espacios) a `GMAIL_APP_PASSWORD` y pon el correo en `GMAIL_USER`.
4. Redeploy.

> Si faltan las credenciales, `/api/solicitud` responde 500 y **no** sale el correo — pero el
> lead **sí quedó guardado** en `jardines.solicitudes` (lo escribe la RPC antes de llamar a la
> ruta), así que no se pierde. Revisa los logs de la función en Vercel.

## Base de datos

Las migraciones viven en `supabase/migrations/` y son **forward-only**. La base es **producción
compartida con otra aplicación (Vero Seguros)**: una migración aplicada afecta al sitio en línea
de inmediato, aunque el frontend nuevo siga en una rama.

**Orden obligatorio:** primero lo aditivo → se despliega el frontend → y solo entonces se retira
lo viejo. Ver `docs/SEGURIDAD.md` §8.bis (esa regla nació de romper el formulario público).

## Antes de desplegar

```bash
npm run lint            # 0 problemas
npm run build           # exit 0
npm run test:contratos  # 202/202
npm run typecheck       # 59 = línea base actual; no debe SUBIR
```

**Y si tocaste SQL, además:** `supabase/tests/seguridad.sql` (va en
`BEGIN/ROLLBACK`, no deja rastro). Lo exige `CLAUDE.md`. No hay CI que lo dispare —
**no existe `.github/`**: los cinco se corren a mano.

## Conectar un dominio propio

1. Vercel → **Project → Settings → Domains → Add**.
2. Configura en tu proveedor DNS los registros que muestre Vercel (normalmente un **A** al
   dominio raíz y un **CNAME** `cname.vercel-dns.com` para `www`). Usa los valores exactos que
   te dé el panel.
3. Espera la verificación (minutos a horas).
4. Actualiza **cuatro** sitios, no uno:
   - [`index.html`](../index.html): `og:url` (línea 17) y el `url` de **los dos** bloques JSON-LD
     (líneas 34 y 46 — WebSite y EventVenue).
   - [`api/_lib/correo.js`](../api/_lib/correo.js): la constante `SITIO_URL` está
     **hardcodeada** al dominio de Vercel. Si no se cambia, **todos** los correos transaccionales
     y el logo que embeben seguirán apuntando ahí (`docs/BUGS_PENDING.md` J-01).
5. Redeploy.

## Notas

- El repo pesa **586 MB** por los medios auto-hospedados: el primer clone y el primer deploy tardan.
- El panel admin **no** está en `/Admin` (esa ruta es 404): vive en `ADMIN_SLUG`
  (`src/config/portal.js`).
