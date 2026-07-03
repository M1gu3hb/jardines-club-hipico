# PROMPTS.md

Prompts útiles para continuar el proyecto en otra sesión/IA.

## Prompt para continuar el proyecto (pégalo al inicio de una nueva sesión)

```
Este es el sitio de Jardines Club Hípico (salón de eventos, Vite/React estático migrado de Base44).
Antes de tocar código lee: CLAUDE.md, PROJECT_CONTEXT.md y docs/ (ARCHITECTURE, DATABASE, FILE_MAP,
DECISIONS, BUGS_PENDING, NEXT_STEPS, CHANGELOG). Reglas clave: el sitio es estático; el contenido vive
en scripts/raw/*.json → node scripts/build-media.mjs → src/data/site-data.json; src/api/base44Client.js
es un SHIM local (no reintroducir Base44); medios en public/media; correo por api/solicitud.js (Gmail
App Password en Vercel). Deploy: push a main → Vercel. Al terminar, actualiza la documentación viva y
el CHANGELOG.
```

## Cómo editar contenido
```
Edita el ítem en scripts/raw/<archivo>.json (config/salones/galeria/servicios/amenidades/serviciosExtra/
alimentos), corre `node scripts/build-media.mjs`, luego `npm run build`. Si agregas una imagen, ponla en
public/media/img/ y usa la ruta /media/img/<archivo>.
```

## Activar el carrusel de reseñas
```
En src/data/resenas.json, llena el array "resenas" con objetos { "autor": "Nombre", "texto": "...",
"estrellas": 5, "evento": "Boda" }. El carrusel de Confianza aparece solo. build + push.
```

## Prompts de Nano Banana (imágenes en el estilo del lugar)
Los 5 prompts largos y "quirúrgicos" + imágenes de referencia están en la carpeta `nano-banana/`
(una subcarpeta por imagen, con `prompt.md`). Método: image-to-image en gemini.google.com o AI Studio
(subir las referencias de la subcarpeta + pegar el prompt), o vía API con `scripts/gen-images.mjs`
(requiere `GEMINI_API_KEY` con billing). Guardar el resultado en `public/media/img/<nombre>.jpg` y
poner la ruta en `imagenUrl` del ítem correspondiente.

Ejemplo (Trampolín): ver `nano-banana/5-trampolin/prompt.md`.

## Regenerar hojas de contacto de la galería (para reordenar)
```
npm i sharp   # una vez
node scripts/montage.mjs <carpeta-salida>   # genera galeria-sheet-N.jpg con índices
```

## Deploy manual (si el auto-deploy fallara)
```
vercel deploy --prod --scope mh-astral-systems
```
