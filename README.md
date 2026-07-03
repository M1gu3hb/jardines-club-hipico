# Jardines Club Hípico — Sitio web

Sitio de eventos (salón y jardines en Xochimilco, CDMX). Migrado de **Base44** a un
proyecto **Vite + React** independiente, listo para GitHub + Vercel.

- **Stack:** React 18, Vite 6, Tailwind CSS 3, Framer Motion, shadcn/ui (Radix), Lucide.
- **Datos:** estáticos, congelados en [`src/data/site-data.json`](src/data/site-data.json).
- **Medios:** auto-hospedados en [`public/media/`](public/media) (imágenes, videos y los
  241 frames de la animación de scroll). Cero dependencia de Base44 o imgur.
- **Formulario:** envía la solicitud por correo con una función serverless de Vercel
  ([`api/solicitud.js`](api/solicitud.js)) usando Gmail.

## Cómo correr

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera dist/
npm run preview  # sirve dist/ localmente
```

## Estructura

```
├── api/
│   └── solicitud.js          # Función serverless: envía el formulario por Gmail
├── public/
│   ├── media/
│   │   ├── img/              # Imágenes y videos (migrados de imgur)
│   │   ├── frames/           # 241 frames de la animación de scroll
│   │   └── b44/              # Medios que estaban en base44 (anuncio "Próximamente")
│   ├── favicon.png
│   └── manifest.json
├── scripts/
│   ├── raw/                  # Snapshot crudo de los datos de Base44 (fuente de verdad)
│   └── build-media.mjs       # Descarga medios + genera src/data/site-data.json
├── src/
│   ├── api/base44Client.js   # SHIM: reemplaza el SDK de Base44 por datos locales
│   ├── data/site-data.json   # Contenido congelado (config, salones, galería, etc.)
│   ├── components/           # Componentes de UI (ver docs/COMPONENTES.md)
│   ├── components/admin/     # Panel /Admin (edición en memoria, sin persistencia)
│   ├── pages/                # Home.jsx y Admin.jsx
│   ├── Layout.jsx            # Estilos globales + tokens skeuomorphism
│   └── App.jsx               # Router (sin auth)
├── vercel.json               # Fallback SPA
└── docs/                     # Mapa de la web para futuras modificaciones
```

## Documentación (mapa de la web)

- [`docs/MAPA.md`](docs/MAPA.md) — arquitectura, flujo de datos y **dónde tocar** para cada cambio típico.
- [`docs/COMPONENTES.md`](docs/COMPONENTES.md) — referencia componente por componente.
- [`docs/DATOS.md`](docs/DATOS.md) — modelo de datos y cómo editar el contenido.
- [`docs/DEPLOY.md`](docs/DEPLOY.md) — deploy en Vercel, variables de entorno y dominio.

## Variables de entorno (solo para el formulario → Gmail)

Se configuran en Vercel (Project → Settings → Environment Variables):

| Variable | Descripción |
|---|---|
| `GMAIL_USER` | Correo Gmail desde el que se envía (ej. `tucuenta@gmail.com`) |
| `GMAIL_APP_PASSWORD` | Contraseña de aplicación de 16 caracteres de esa cuenta |
| `MAIL_TO` | (opcional) destino de las solicitudes. Por defecto `mighuer427@gmail.com` |

## Panel de administración

`/Admin` — usuario `admin`, contraseña `hipico2024` (en [`src/pages/Admin.jsx`](src/pages/Admin.jsx)).
En esta versión estática el admin permite **ver** el contenido y editarlo **en memoria**
durante la sesión, pero **no persiste** (el sitio es estático). Para cambios permanentes,
se editan los datos en el código — ver [`docs/DATOS.md`](docs/DATOS.md).
