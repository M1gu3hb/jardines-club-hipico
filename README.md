# Jardines Club Hípico — Sitio web y portal

Sitio de eventos (salón y jardines en Xochimilco, CDMX): web pública para captar cotizaciones,
panel de administración y portal del cliente. Migrado de **Base44** a un proyecto **Vite + React**
independiente con base de datos propia en **Supabase**.

- **Stack:** React 18, Vite 6, Tailwind CSS 3, Framer Motion, shadcn/ui (Radix), Lucide,
  react-router-dom 7.
- **Datos:** PostgreSQL en **Supabase** (schema `jardines`), con RLS en todas las tablas. Los
  JSON de `src/data/` quedan solo como **fallback estático**.
- **Backend:** 7 funciones serverless en [`api/`](api) (Vercel) + Nodemailer.
- **Medios:** auto-hospedados en [`public/media/`](public/media) y en Storage de Supabase.

> ⚠️ El proyecto de Supabase **está compartido con otra aplicación distinta (Vero Seguros)**, que
> vive en el schema `public`. Antes de tocar la base, lee el candado en
> [`CLAUDE.md`](CLAUDE.md) y [`docs/SEGURIDAD.md`](docs/SEGURIDAD.md).

## Cómo correr

```bash
npm install
npm run dev             # http://localhost:5173
npm run build           # genera dist/
npm run lint            # eslint
npm run test:contratos  # contratos frontend ↔ api/ (estático, sin red)
npm run typecheck       # 155 errores = línea base histórica; no debe subir
npm run preview         # sirve dist/ localmente
```

## Estructura

```
├── api/                      # Funciones serverless (Vercel)
│   ├── _lib/guard.js         # Módulo central de seguridad de las rutas
│   ├── _lib/correo.js        # Plantilla y envío de correo
│   ├── solicitud.js          # Aviso de lead nuevo
│   ├── notificar.js          # Aviso al admin de una acción del cliente
│   ├── correo-cliente.js     # Aviso de cotización lista
│   ├── crear-admin.js        # Alta de administrador
│   ├── crear-usuario-evento.js  # Alta de cliente + enlace de primer acceso
│   ├── canjear-acceso.js     # Canje del enlace de un solo uso (dos fases)
│   └── cron-recordatorios.js # Digest diario (cron de Vercel)
├── supabase/
│   ├── migrations/           # Migraciones forward-only (jardines_sec_01..22)
│   └── tests/seguridad.sql   # 63 aserciones de seguridad
├── public/media/             # img/ · frames/ (241) · b44/
├── scripts/
│   ├── test-contratos-api.mjs  # 71 contratos frontend ↔ api/
│   ├── build-media.mjs         # Regenera el fallback estático
│   └── seed-supabase.mjs       # Seed inicial (histórico)
├── src/
│   ├── api/                  # supabaseClient.js · base44Client.js (SHIM) · authContext.jsx
│   ├── components/           # público · admin/ · portal/ · mesas/ · meseros/ · invitacion/
│   ├── config/portal.js      # ADMIN_SLUG y correo sintético de clientes
│   ├── pages/                # Home.jsx y Admin.jsx
│   ├── Layout.jsx            # Estilos globales + tokens skeuomorphism
│   └── App.jsx               # Router + AuthProvider
├── vercel.json               # Fallback SPA, cabeceras HTTP (CSP, HSTS…) y cron
└── docs/                     # Documentación viva
```

## Documentación

Empieza por [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) y [`CLAUDE.md`](CLAUDE.md).

- [`docs/SEGURIDAD.md`](docs/SEGURIDAD.md) — **modelo de seguridad. Obligatorio antes de tocar
  SQL, RLS, `api/` o auth.**
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — capas y flujos.
- [`docs/DATABASE.md`](docs/DATABASE.md) — entidades, relaciones, RPCs y migraciones.
- [`docs/FILE_MAP.md`](docs/FILE_MAP.md) — qué hace cada archivo y su riesgo.
- [`docs/MAPA.md`](docs/MAPA.md) — dónde tocar para cada cambio típico del sitio público.
- [`docs/COMPONENTES.md`](docs/COMPONENTES.md) — referencia componente por componente.
- [`docs/DATOS.md`](docs/DATOS.md) — cómo se edita el contenido.
- [`docs/DEPLOY.md`](docs/DEPLOY.md) — deploy, variables de entorno, cron y dominio.
- [`docs/DECISIONS.md`](docs/DECISIONS.md), [`docs/BUGS_PENDING.md`](docs/BUGS_PENDING.md),
  [`docs/NEXT_STEPS.md`](docs/NEXT_STEPS.md), [`docs/CHANGELOG.md`](docs/CHANGELOG.md),
  [`docs/PROMPTS.md`](docs/PROMPTS.md).

## Variables de entorno

Se configuran en Vercel (Project → Settings → Environment Variables). Detalle en
[`docs/DEPLOY.md`](docs/DEPLOY.md).

| Variable | Ámbito | Descripción |
|---|---|---|
| `VITE_SUPABASE_URL` | front | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | front | Clave anónima (**nunca** la de servicio) |
| `VITE_ADMIN_SLUG` | front | (opcional) ruta del panel |
| `SUPABASE_URL` | servidor | URL del proyecto |
| `SUPABASE_SERVICE_ROLE` | servidor | Clave de servicio. **Secreta** |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | servidor | Cuenta y App Password del envío |
| `MAIL_TO` | servidor | Destino de las solicitudes |
| `CRON_SECRET` | servidor | Autoriza el cron. Sin ella, no corre |

No hay `.env` en el repo. Los secretos viven solo en Vercel.

## Panel de administración

El panel **no** está en `/Admin` (esa ruta devuelve 404). Vive en una **ruta secreta**
configurable (`ADMIN_SLUG` en [`src/config/portal.js`](src/config/portal.js)) y detrás de
`RequireAdmin`. El acceso es con cuenta de Supabase Auth y rol `admin` en `jardines.perfiles`;
la autorización real la aplica RLS en la base, no el navegador.

Desde el panel se edita el contenido del sitio y **persiste en Supabase** — ya no hace falta
tocar JSON ni redesplegar.
