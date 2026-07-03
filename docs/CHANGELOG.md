# CHANGELOG.md

## 2026-07-03 — Documentación viva del proyecto

### Cambios realizados
- Creados `CLAUDE.md` y `PROJECT_CONTEXT.md` (raíz) y `docs/` con ARCHITECTURE, DATABASE, FILE_MAP,
  DECISIONS, BUGS_PENDING, NEXT_STEPS, CHANGELOG, PROMPTS. Proyecto ahora transferible a otra sesión/IA.
### Archivos modificados
- `CLAUDE.md`, `PROJECT_CONTEXT.md`, `docs/*.md` (nuevos). Se conservan `docs/MAPA.md`, `COMPONENTES.md`, `DATOS.md`, `DEPLOY.md`.
### Entidades/BD afectadas: ninguna.
### Bugs resueltos: ninguno. ### Bugs nuevos: ninguno.
### Decisiones tomadas: adoptar el flujo de documentación viva.
### Próximo paso: llenar `resenas.json` con reseñas reales (ver NEXT_STEPS).

---

## 2026-07-03 — Imágenes Nano Banana integradas (commit afdaa12)
### Cambios realizados
- Integradas las 5 imágenes generadas con Nano Banana (referencias reales del lugar): Sanitarios,
  Seguridad privada, Coordinación de montaje, Flexibilidad de horarios (servicios) y Trampolín (amenidad).
### Archivos modificados
- `public/media/img/{sanitarios,seguridad,montaje,horarios,trampolin}.jpg`, `scripts/raw/servicios.json`,
  `scripts/raw/amenidades.json`, `src/data/site-data.json`.
### Bugs resueltos: los 5 ítems ya no muestran placeholder (tienen imagen real).
### Próximo paso: reseñas.

## 2026-07-03 — Descripciones + carpeta Nano Banana (commit 8c4e6f6)
### Cambios realizados
- Descripción para los 29 servicios/amenidades; se muestran al EXPANDIR (debajo de la imagen), no en la miniatura.
- `ServiceAmenityCard`: expandible si tiene media o descripción.
- Cancelada la generación con Pollinations (poco realista); creada carpeta `nano-banana/` con prompts + referencias.
### Archivos: `src/components/ServiceAmenityCard.jsx`, `scripts/raw/*.json`, `nano-banana/*`.

## 2026-07-03 — Servicio destacado "Barra de Dulces" (commit 17a4d59)
### Cambios realizados
- Nuevo `BarraDulces.jsx` (colaboración Dulce Corazón, acento rosa) entre Servicios y Amenidades; despliega flyer + descripción.
### Archivos: `src/components/BarraDulces.jsx`, `src/components/ServiciosAmenidades.jsx`, `public/media/img/dulce-corazon.png`.

## 2026-07-03 — Ajustes FAQ, orden y scroll (commit eba82c1)
### Cambios realizados
- FAQ: respuesta de "paquetes" corregida (no hay paquetes fijos, se arma a la medida) + rediseño (badge "P" + flecha).
- "Cómo funciona" movido entre Amenidades y el CTA; FAQ tras Galería. Fix del bug de scroll al cerrar el formulario.
### Archivos: `src/components/FaqSection.jsx`, `ComoFunciona.jsx`, `src/pages/Home.jsx`, `src/hooks/useLockBodyScroll.js`, `scripts/raw/config.json`.

## 2026-07-03 — Reorden de galería (commit 74c3bbc)
### Cambios realizados
- Galería reordenada por análisis visual; `Galeria.list()` sin sort (orden del arreglo = mostrado).
### Archivos: `scripts/raw/galeria.json`, `src/pages/Home.jsx`, `scripts/reorder-galeria.mjs`, `scripts/montage.mjs`.

## 2026-07-03 — "Cómo funciona" + FAQ (commit b9cca78)
### Cambios realizados
- Secciones nuevas `ComoFunciona.jsx` y `FaqSection.jsx`.
### Archivos: esos dos + `src/pages/Home.jsx`, `docs/MAPA.md`.

## 2026-07-03 — Mejoras de conversión fase 1 (commit 88c30c8)
### Cambios realizados
- Hero de venta, bloque `Confianza` (números + rating Google + carrusel), formulario corto, miniaturas
  en servicios/amenidades, sección "Información de servicios" llena, WhatsApp en desktop, Facebook, SEO
  EventVenue, correcciones de erratas/duplicados.
### Archivos: múltiples componentes + `scripts/raw/*`, `src/data/resenas.json`, `index.html`.

## 2026-07-03 — Migración inicial Base44 → Vite/Vercel (commit fac5332)
### Cambios realizados
- Sitio migrado a proyecto Vite independiente. SHIM de datos, medios auto-hospedados (466 archivos),
  auth de Base44 eliminada, función serverless de correo, deploy en GitHub + Vercel.
### Entidades/BD afectadas: entidades de Base44 congeladas en `site-data.json`.
### Decisiones: D1–D5 (ver DECISIONS.md).
