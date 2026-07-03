# Prompts + referencias para Nano Banana (imágenes faltantes)

Aquí están los materiales para generar con **Nano Banana (Gemini 2.5 Flash Image)** las
**5 imágenes** de servicios/amenidades que aún no tienen foto real. Cada subcarpeta trae:

- **`prompt.md`** — el prompt largo, detallado y "quirúrgico" (en inglés, que es como el
  modelo obedece mejor) + instrucciones de uso.
- **`referencia-*.jpg/png`** — fotos reales de nuestros espacios para usar como
  **referencia de estilo/lugar** (image-to-image), para que el resultado se parezca a
  Jardines Club Hípico y no se vea genérico.

## Las 5 imágenes

| # | Carpeta | Servicio/Amenidad | Archivo destino sugerido |
|---|---|---|---|
| 1 | `1-sanitarios/` | Sanitarios amplios y limpios (servicio) | `sanitarios.jpg` |
| 2 | `2-seguridad-privada/` | Seguridad privada durante el evento (servicio) | `seguridad.jpg` |
| 3 | `3-coordinacion-montaje/` | Coordinación de montaje y desmontaje (servicio) | `montaje.jpg` |
| 4 | `4-flexibilidad-horarios/` | Flexibilidad de horarios (servicio) | `horarios.jpg` |
| 5 | `5-trampolin/` | Trampolín (amenidad) | `trampolin.jpg` |

## Cómo generarlas (con Nano Banana)

**Opción A — Manual (con tu Google AI Pro, sin costo extra):**
1. Entra a [gemini.google.com](https://gemini.google.com) o [AI Studio](https://aistudio.google.com).
2. **Sube las imágenes de referencia** de la subcarpeta.
3. Pega el prompt de `prompt.md`.
4. Genera, descarga la mejor, y guárdala como el archivo destino sugerido.

**Opción B — Automático (con billing de la API, ~$0.04 c/u):**
- Con `GEMINI_API_KEY` (tier de pago) puedes usar el script `scripts/gen-images.mjs`
  (ya trae la lógica de image-to-image con referencia).

## Cómo meter el resultado al sitio

1. Copia la imagen final a: `public/media/img/<nombre>.jpg` (ej. `public/media/img/sanitarios.jpg`).
2. En `scripts/raw/servicios.json` (o `amenidades.json`), en el ítem correspondiente, pon:
   `"imagenUrl": "/media/img/sanitarios.jpg"`.
3. Corre: `node scripts/build-media.mjs` (regenera `src/data/site-data.json`).
4. `npm run build` y push (Vercel redespliega solo).

> Nota: las descripciones de cada servicio/amenidad **ya están puestas** y se muestran al
> expandir cada tarjeta. Solo falta la imagen de estas 5.
