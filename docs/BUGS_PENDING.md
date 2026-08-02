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

## 2026-08-01 — Riesgos residuales de seguridad (ver docs/SEGURIDAD.md)

- **`eventos.staff_token` sigue en claro** durante la ventana de compatibilidad. Una fuga de lectura
  de `eventos` expondría los tokens de staff vigentes. Mitigado con expiración, revocación, rotación,
  rate limit y auditoría. Retiro listo en `PENDIENTE_jardines_sec_10_*.noapply`.
- **Tokens de mesa e invitación son credenciales portadoras** (quien tenga el QR entra). Es el diseño
  del producto. Mitigado con rate limit, respuestas genéricas y 256 bits en los nuevos.
- **Pendientes compartidos con Vero** (no modificados a propósito): protección de contraseñas
  filtradas desactivada; `public.is_admin()` y `public.rls_auto_enable()` ejecutables por `anon`;
  `public.content_audit(actor)` sin índice de FK.
- **Documentación previa desactualizada:** `PROJECT_CONTEXT.md`, `docs/DATABASE.md` y
  `docs/ARCHITECTURE.md` siguen describiendo la etapa estática ("no hay base de datos en vivo"),
  anterior a FASE-02. No se reescribieron en esta sesión por quedar fuera del alcance.

## 2026-08-02 — Estado tras el cierre

**Resueltos y verificados en producción:** escalamiento por `raw_user_meta_data`, perfiles
cruzados con Vero, IDOR entre eventos, enumeración por `info_mesa_publica`, `/api/notificar`
abierto a cualquier sesión y con HTML arbitrario, cron fail-open, `/api/solicitud` con cuerpo
arbitrario, contraseñas en correos y enlaces, `INSERT` público sin validación, **token de staff
en claro (columna eliminada en `sec_20`)** e `INSERT` de compatibilidad (`sec_21`).

**Riesgos residuales reales** (documentados, no bloqueantes):

- Los tokens de mesa e invitación son **credenciales portadoras** por diseño del producto:
  quien tenga el QR entra. Mitigado con 256 bits, rate limit y respuestas genéricas.
- `operativo_canales` es **global, no por evento**. Con dos eventos activos a la vez, el
  personal de ambos compartiría canal de radio. Hoy no ocurre (un evento a la vez).
- 2 vulnerabilidades `high` de React Router por **"RSC Mode CSRF"**: no aplican, esta app es
  una SPA con `BrowserRouter` y no usa RSC. Verificado por búsqueda en `src/`.
- **Pendientes compartidos con Vero**, excluidos a propósito: protección de contraseñas
  filtradas desactivada (config global de Auth), `public.is_admin()` y `public.rls_auto_enable()`
  ejecutables por `anon`, y `public.content_audit(actor)` sin índice de FK.
