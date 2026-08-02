# NEXT_STEPS.md

## Urgente
_(Nada urgente. El sitio está completo y en producción.)_

## Importante
- **Carrusel de reseñas:** llenar `src/data/resenas.json` → array `resenas` con 4-6 reseñas reales de
  Google (`{ "autor": "...", "texto": "...", "estrellas": 5, "evento": "Boda" }`). El carrusel se
  activa solo. El cliente debe proporcionar las reseñas.
- **Conectar dominio propio** en Vercel (Settings → Domains) y actualizar `og:url` + JSON-LD `url` en
  `index.html` al dominio real; redeploy. Ver `docs/DEPLOY.md`.

## Después
- Verificar/ajustar el remitente del correo si se quiere que salga de `jardinesclubhipico@gmail.com`
  en vez de `mighuer427@gmail.com` (cambiar `GMAIL_USER`/`MAIL_TO` en Vercel + generar App Password de esa cuenta).
- Optimizar peso de imágenes grandes (algunas imgur pesan varios MB) para mejorar carga en móvil, sin
  tocar los videos del hero.
- Considerar quitar el panel `/Admin` o dejarlo claramente como "solo vista" (no persiste).

## Ideas futuras
- Más testimonios / sección de eventos realizados con métricas.
- Analítica (GA4 / Vercel Analytics) para medir conversiones del formulario.
- Página/idioma o versiones por tipo de evento (bodas, XV, corporativos).
- Si el cliente quiere editar contenido sin código: migrar a un CMS o backend (Supabase) reusando el
  modelo de `docs/DATABASE.md`.

## Seguridad (2026-08-01)

1. **Probar en la interfaz** el botón "generar link de meseros" (ahora usa `rotar_staff_token`) y el
   envío del formulario público (ahora usa `solicitud_crear`). Es lo único que falta por validar con
   una persona frente a la pantalla.
2. Mostrar en el panel el token devuelto por la rotación **una sola vez**, con aviso de guardarlo.
3. Cuando 1 y 2 estén verificados, aplicar
   `supabase/migrations/PENDIENTE_jardines_sec_10_retiro_compat_staff_token.sql.noapply`.
4. Acordar con Vero los pendientes compartidos de `docs/SEGURIDAD.md` §9.
5. Reescribir `PROJECT_CONTEXT.md`, `docs/DATABASE.md` y `docs/ARCHITECTURE.md`: siguen describiendo
   la etapa estática y ya no corresponden a la realidad.

## 2026-08-02 — Tras el cierre del blindaje

Ya no queda nada bloqueante. Lo que sigue es mejora, no deuda de seguridad:

1. **Interfaz para asignar personal a eventos.** Hoy los 3 operativos tienen
   `acceso_global=true` porque la plantilla es fija y el salón opera un evento a la vez.
   Si algún día hay dos eventos simultáneos con equipos distintos, hace falta una pantalla
   para `jardines.operativo_asignacion` (la tabla y las políticas ya existen).
2. **Cambio de contraseña dentro del portal.** El primer acceso es por enlace de un solo uso;
   la contraseña se comparte por separado. Una pantalla de "cambiar mi contraseña" cerraría el ciclo.
3. **Canales operativos por evento.** `operativo_canales` es global: dos eventos simultáneos
   compartirían canal. Ver riesgo residual en `docs/SEGURIDAD.md`.
4. **Pendientes compartidos con Vero** (requieren su visto bueno, ver `docs/SEGURIDAD.md` §9).
