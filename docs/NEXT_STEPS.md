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
