# Deploy, correo y dominio

## Vercel

El proyecto es un sitio Vite estático + una función serverless (`api/solicitud.js`).
Vercel detecta Vite automáticamente:

- **Framework preset:** Vite
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Install command:** `npm install`
- **Rewrites (SPA):** definidos en [`vercel.json`](../vercel.json)

Cada push a la rama `main` de GitHub dispara un deploy automático.

## Formulario → Gmail (variables de entorno)

El formulario se envía por correo mediante [`api/solicitud.js`](../api/solicitud.js), que usa
**Gmail con una contraseña de aplicación** (App Password). Configura en Vercel
(Project → Settings → Environment Variables) estas variables:

| Variable | Valor |
|---|---|
| `GMAIL_USER` | El correo Gmail desde el que se envía (ej. `tucuenta@gmail.com`) |
| `GMAIL_APP_PASSWORD` | La contraseña de aplicación de 16 caracteres de esa cuenta |
| `MAIL_TO` | (opcional) A dónde llegan las solicitudes. Default: `mighuer427@gmail.com` |

### Cómo generar la contraseña de aplicación de Gmail

1. La cuenta debe tener **Verificación en 2 pasos** activada:
   <https://myaccount.google.com/signinoptions/twosv>
2. Crea la contraseña de aplicación en:
   <https://myaccount.google.com/apppasswords>
3. Ponle un nombre (ej. "Jardines Web"), cópiala (16 caracteres) y pégala en
   `GMAIL_APP_PASSWORD` en Vercel. Quita los espacios.
4. Pon el mismo correo en `GMAIL_USER`.
5. Redeploy para que tome las variables.

> Si `GMAIL_USER`/`GMAIL_APP_PASSWORD` no están configuradas, el formulario igual muestra
> la confirmación al usuario (con su folio), pero **no** se envía el correo. Revisa los
> logs de la función en Vercel si no llegan correos.

## Conectar un dominio propio

1. En Vercel: **Project → Settings → Domains → Add**. Escribe tu dominio
   (ej. `jardinesclubhipico.com`).
2. Vercel te dará los registros DNS a configurar en tu proveedor de dominio:
   - Para el dominio raíz (`jardinesclubhipico.com`): un registro **A** a `76.76.21.21`.
   - Para `www`: un registro **CNAME** a `cname.vercel-dns.com`.
   (Vercel muestra los valores exactos; usa esos.)
3. Guarda los registros en tu proveedor DNS y espera la verificación (minutos a horas).
4. Una vez verificado, actualiza en [`index.html`](../index.html) los metadatos
   `og:url` y el `url` del bloque JSON-LD al dominio final, y vuelve a hacer deploy
   (mejora el SEO/compartir en redes).

## Notas

- El repo pesa (~560 MB por los videos e imágenes auto-hospedados). El primer push a
  GitHub y el primer deploy pueden tardar.
- No hay `.env` en el repo (está en `.gitignore`). Los secretos viven solo en Vercel.
