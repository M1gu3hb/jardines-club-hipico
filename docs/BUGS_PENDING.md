# BUGS_PENDING.md

Formato: bug · impacto · sospecha de causa · archivos · prioridad · estado.

## Abiertos

_(No hay bugs críticos abiertos.)_

### B1 — Panel `/Admin` no persiste cambios
- **Impacto:** medio (confusión potencial). Quien edite desde `/Admin` verá cambios en la sesión pero
  se pierden al recargar.
- **Causa:** por diseño — el sitio es estático; el shim escribe en memoria.
- **Archivos:** `src/api/base44Client.js`, `src/components/admin/*`.
- **Prioridad:** baja. **Estado:** conocido / por diseño (documentar o quitar el admin si estorba).

### B2 — `og:url` y JSON-LD con dominio placeholder
- **Impacto:** bajo (SEO/compartir en redes). Apunta a `https://jardinesclubhipico.com/` sin confirmar.
- **Causa:** dominio propio aún no conectado.
- **Archivos:** `index.html`.
- **Prioridad:** baja. **Estado:** pendiente hasta conectar dominio.

## Resueltos (histórico)

- **Scroll salta al cerrar el formulario** — RESUELTO (D8): `useLockBodyScroll` con `overflow:hidden`.
- **Galería en orden invertido** (banner salía primero) — RESUELTO (D6): `Galeria.list()` sin sort + reorden.
- **Sección "Información de Servicios" vacía** — RESUELTO: se llenó `config.informacionServicios`.
- **Nombre "Sálon de los Espejos" (acento) y erratas/duplicados** — RESUELTO en `scripts/raw/*`.

## Notas / no-bugs
- **Screenshots del preview local se cuelgan** en esta máquina (herramienta `preview_screenshot`).
  Es un problema del entorno de preview, NO del sitio (producción carga bien). Verificar por DOM/eval
  o en la URL de producción.
- Requests `206 Partial Content` con `ERR_ABORTED` en videos de la galería = comportamiento normal de
  `<video preload="metadata">`, no es error.
