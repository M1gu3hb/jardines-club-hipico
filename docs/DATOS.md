# Datos y contenido

> Reescrito el **2026-08-03**. La versión anterior describía la etapa estática (FASE-01).
> Hoy el contenido vive en **Supabase**; los JSON de `src/data/` son solo fallback.

## Dónde vive el contenido

**La fuente de verdad es la base de datos** (Supabase, schema `jardines`). El esquema completo
está en `docs/DATABASE.md`. Este documento explica cómo se **edita** ese contenido.

| Capa | Qué es | ¿Se edita? |
|---|---|---|
| `jardines.*` en Supabase | Contenido real del sitio y de los eventos | **Sí, desde el panel admin** |
| `src/data/site-data.json` | Snapshot de FASE-01, usado como fallback si Supabase no responde | Solo regenerándolo |
| `src/data/resenas.json` | Fallback del bloque de Confianza | Solo regenerándolo |
| `scripts/raw/*.json` | Fuente del snapshot de fallback | Solo si se regenera el fallback |

## Cómo editar contenido (lo normal)

1. Entra al panel admin (ruta secreta `ADMIN_SLUG`, ver `src/config/portal.js`).
2. Edita la sección correspondiente: Configuración, Salones, Galería, Servicios, Amenidades,
   Alimentos o Reseñas.
3. Guarda. Persiste en Supabase y el sitio lo refleja sin redeploy.

**No** edites `src/data/site-data.json` para cambiar el sitio: solo cambiarías el fallback.

## Imágenes y videos

Hay dos caminos, según el origen:

- **Medios del repo** (`public/media/`): ponlos ahí y usa la ruta `/media/img/<archivo>`.
  Los videos se detectan por extensión (`.mp4|webm|mov|ogg|m4v`).
- **Medios subidos desde el panel**: van a Storage. Buckets y límites en `docs/DATABASE.md` §E
  y `docs/SEGURIDAD.md` §7.

> Si agregas un origen **externo** de imágenes o fuentes, hay que declararlo en la CSP de
> `vercel.json` o el navegador lo bloqueará en producción sin fallar en local.

## Entidades de contenido del sitio

| Entidad (front) | Tabla | Filas | Notas |
|---|---|---|---|
| `ConfigSitio` | `config_sitio` | 1 | Teléfono, WhatsApp, ubicación, cartel "Próximamente", colores |
| `Salon` | `salones` | 8 | `orden` manda; `activo=false` lo oculta |
| `Galeria` | `galeria` | 69 | Imágenes y videos |
| `ServicioItem` | `servicios` | 14 | `descripcion` se ve al **expandir** la tarjeta |
| `AmenidadItem` | `amenidades` | 15 | Igual estructura que servicios |
| `ServicioExtra` | `servicios_extra` | 11 | Histórico del formulario largo |
| `AlimentoMenu` | `alimentos` | 3 | `pdf_url` en Google Drive |
| `Resena` / `ResenasConfig` | `resenas` / `resenas_config` | — | Solo se muestran las `aprobada = true` |

Campos completos y reglas de negocio: `docs/DATABASE.md`.

Detalles de campos que suelen confundir:

- `whatsapp_numero` va **solo con dígitos**, sin `+` ni espacios (ej. `525548663656`).
- La sección `#no-incluye` lee `informacion_servicios`, **no** `texto_no_incluye` (esta última
  es histórica y no se muestra).
- Si `proximamente_activo = false`, el cartel del hero no aparece aunque tenga contenido.
- `portal_sugerible` en servicios y amenidades es lo que el portal ofrece en "ármalo".

## Medios en el repo (`public/media/`)

| Carpeta | Contenido | Origen |
|---|---|---|
| `img/` | ~224 imágenes y videos | migrados de imgur |
| `frames/` | `frame-001.jpg` … `frame-241.jpg` | animación de scroll |
| `b44/` | anuncio "Próximamente" | migrado en FASE-01 |

Los videos del hero **ya están comprimidos**: no comprimirlos más.

## Regenerar el fallback estático (avanzado, rara vez)

```bash
node scripts/build-media.mjs   # scripts/raw/*.json → src/data/site-data.json + descarga medios
npm run build
```

Esto **no** cambia lo que ve el visitante mientras Supabase responda: solo actualiza la copia de
respaldo. El seed original de la base se hizo con `scripts/seed-supabase.mjs` (histórico; no
re-ejecutar a ciegas sobre datos vivos).

## El shim de datos

`src/api/base44Client.js` expone la misma API que tenía el SDK de Base44
(`base44.entities.<Entidad>.list()/filter()/get()/create()/update()/delete()`,
`base44.functions.invoke()`, `base44.integrations.Core.UploadFile()`), pero por dentro habla con
Supabase y traduce camelCase ↔ snake_case. Gracias a eso **ningún componente tuvo que
reescribirse**, ni al quitar Base44 ni al conectar la base real.

Quien escribe decide RLS, no el front: si una escritura no aparece, casi siempre es una policy,
no un bug de UI.
