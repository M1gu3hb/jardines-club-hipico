# Datos y contenido

> Reescrito el **2026-08-03**. La versión anterior describía la etapa estática (FASE-01).
> Hoy el contenido vive en **Supabase**. **No hay copia de respaldo en runtime**: si la base no
> responde, el sitio se renderiza vacío.

## Dónde vive el contenido

**La fuente de verdad es la base de datos** (Supabase, schema `jardines`). El esquema completo
está en `docs/DATABASE.md`. Este documento explica cómo se **edita** ese contenido.

| Capa | Qué es | ¿Se edita? |
|---|---|---|
| `jardines.*` en Supabase | Contenido real del sitio y de los eventos | **Sí, desde el panel admin** |
| `src/data/site-data.json` | Snapshot de FASE-01. **Nadie lo importa** en `src/` ni en `api/`: solo alimenta `scripts/seed-supabase.mjs` y `scripts/montage.mjs` | Solo regenerándolo |
| `src/data/resenas.json` | **Sí se usa en runtime:** lo importa `src/components/Confianza.jsx` | Solo editándolo |
| `scripts/raw/*.json` | Fuente de `site-data.json` | Solo si se regenera el seed |

> ⚠️ **No existe fallback estático del contenido.** La documentación anterior afirmaba que
> `site-data.json` cubría una caída de Supabase; no es cierto y nunca se implementó. Si la base
> no responde, las secciones que leen de ella salen vacías. Es un riesgo real y sin mitigar.

## Cómo editar contenido (lo normal)

1. Entra al panel admin (ruta secreta `ADMIN_SLUG`, ver `src/config/portal.js`).
2. Edita la sección correspondiente: Configuración, Salones, Galería, Servicios, Amenidades,
   Alimentos o Reseñas.
3. Guarda. Persiste en Supabase y el sitio lo refleja sin redeploy.

**No** edites `src/data/site-data.json` para cambiar el sitio: no lo lee nadie en runtime, así que
no cambiaría nada de lo que ve el visitante.

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
| `img/` | 230 imágenes y videos | migrados de imgur |
| `frames/` | `frame-001.jpg` … `frame-241.jpg` | animación de scroll |
| `b44/` | anuncio "Próximamente" | migrado en FASE-01 |

Los videos del hero **ya están comprimidos**: no comprimirlos más.

## Regenerar `site-data.json` (avanzado, rara vez)

```bash
node scripts/build-media.mjs   # DESCARGA ~570 MB de medios por red + genera site-data.json
npm run build
```

⚠️ `build-media.mjs` **no es un generador offline**: descarga los medios desde `i.imgur.com` y
`media.base44.com`. Ese segundo origen es un CDN de Base44 que puede desaparecer sin aviso; si
eso ocurre, `public/media/` versionado en git es la única copia.

Esto **no cambia nada de lo que ve el visitante**: ese JSON no se importa en runtime. Solo sirve
como entrada de `scripts/seed-supabase.mjs`, que tampoco toca la base — **genera
`scripts/seed/*.sql`**, y esos `.sql` son los que se aplican aparte (histórico; no re-ejecutar a
ciegas sobre datos vivos).

## El shim de datos

`src/api/base44Client.js` expone la misma API que tenía el SDK de Base44
(`base44.entities.<Entidad>.list()/filter()/get()/create()/update()/delete()`,
`base44.functions.invoke()`, `base44.integrations.Core.UploadFile()`), pero por dentro habla con
Supabase y traduce camelCase ↔ snake_case. Gracias a eso **ningún componente tuvo que
reescribirse**, ni al quitar Base44 ni al conectar la base real.

Quien escribe decide RLS, no el front: si una escritura no aparece, casi siempre es una policy,
no un bug de UI.
