# Datos y contenido

Todo el contenido editable está congelado en **[`src/data/site-data.json`](../src/data/site-data.json)**.
Es un snapshot de los datos que había en Base44 el día de la migración.

## Estructura de `site-data.json`

```jsonc
{
  "config":       { /* ConfigSitio: 1 objeto */ },
  "salones":      [ /* Salon: 8 espacios */ ],
  "galeria":      [ /* Galeria: 69 imágenes/videos */ ],
  "servicios":    [ /* ServicioItem: 14 */ ],
  "amenidades":   [ /* AmenidadItem: 15 */ ],
  "serviciosExtra": [ /* ServicioExtra: 11 (checkboxes del formulario) */ ],
  "alimentos":    [ /* AlimentoMenu: 3 (menús + PDF) */ ],
  "framesTotal":  241
}
```

### `config` (campos usados por la web)

| Campo | Uso |
|---|---|
| `logoUrl` | Logo (sidebar, hero, splash) |
| `telefonoContacto` | Tarjeta de teléfono en Contacto |
| `whatsappNumero` | Botones de WhatsApp (solo dígitos, ej. `525548663656`) |
| `correoAdmin` | Tarjeta de correo en Contacto |
| `ubicacionTexto` | Texto de ubicación (actualmente vacío → muestra "Ciudad de México") |
| `ubicacionLinkMapa` | Link "Ver mapa" |
| `proximamenteActivo` | `true`/`false` para mostrar el cartel "Próximamente" |
| `proximamenteImagenUrl`, `proximamenteTitulo`, `proximamenteDescripcion`, `proximamenteTextoBoton` | Contenido del cartel/anuncio |
| `informacionServicios` | Texto de la sección `#no-incluye`. **Actualmente `null`** → la sección sale vacía (fiel a Base44) |
| `textoNoIncluye` | Texto real de "no incluye" (NO se muestra; el componente lee `informacionServicios`) |

> **Para mostrar el texto de "no incluye":** copia el valor de `textoNoIncluye` a
> `informacionServicios` en `site-data.json`, o cambia el prop en
> [`Home.jsx`](../src/pages/Home.jsx) a `texto={config?.textoNoIncluye}`.

### `salones[]`

Campos: `nombre`, `descripcion`, `descripcionLarga`, `capacidad`, `capacidadMin/Max`,
`imagenPrincipal`, `imagenes[]`, `caracteristicas[]`, `activo`, `orden`, `id`.
El orden en la web lo da `orden` (1..8).

### `galeria[]`, `servicios[]`, `amenidades[]`

- `galeria`: `{ imagenUrl }`.
- `servicios`/`amenidades`: `{ titulo, descripcion, imagenUrl, imagenesUrl[], activo, id }`.

Todas las rutas de medios apuntan a `/media/...` (locales).

## Cómo editar contenido (permanente)

1. Edita **[`src/data/site-data.json`](../src/data/site-data.json)** directamente.
2. Si agregas una **imagen o video nuevo**, ponlo en `public/media/img/` y usa la ruta
   `/media/img/tu-archivo.jpg` en el JSON.
3. `npm run build` y redeploy (o push a GitHub si Vercel está conectado al repo).

> El panel `/Admin` permite previsualizar cambios en memoria, pero **no** los guarda.
> La fuente de verdad del contenido es `site-data.json`.

## Medios (`public/media/`)

| Carpeta | Contenido | Origen |
|---|---|---|
| `img/` | 224 imágenes y videos | migrados de imgur |
| `frames/` | 241 frames `frame-001.jpg` … `frame-241.jpg` | animación de scroll (migrada de Base44) |
| `b44/` | `62261123a_VWSTYLEANUNCIO.jpg` | anuncio "Próximamente" (migrado de Base44) |

## Regenerar el snapshot (avanzado)

El snapshot se generó con [`scripts/build-media.mjs`](../scripts/build-media.mjs) a partir de los
JSON crudos en [`scripts/raw/`](../scripts/raw). Ese script **descarga los medios** y **reescribe
las URLs** a rutas locales, limpiando artefactos (p.ej. un `" ×"` que traían algunas URLs).

```bash
node scripts/build-media.mjs
```

Solo es necesario si cambias los datos crudos de `scripts/raw/`. Para ediciones normales,
edita directamente `src/data/site-data.json`.

## El shim de datos

[`src/api/base44Client.js`](../src/api/base44Client.js) expone la misma API que el SDK de Base44
(`base44.entities.<Entidad>.list()/filter()/create()/update()/delete()`,
`base44.functions.invoke()`, `base44.integrations.Core.UploadFile()`), pero sirviendo el snapshot
local. Gracias a esto, **ningún componente tuvo que reescribirse** al quitar Base44.
