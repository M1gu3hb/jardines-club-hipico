# NEXT_STEPS.md

> Estado a **2026-08-03**. Ordenado por prioridad real.

## Urgente — bloquea el cierre del proyecto

1. **Validación humana autenticada.** Es lo único que impide declarar CERRADO el blindaje de
   seguridad. Miguel debe confirmar **visualmente, con credenciales reales**:
   1. Alta de cliente desde el panel.
   2. Enlace de primer acceso (que el cliente entre con él).
   3. Subir un documento y que el cliente lo abra desde su portal.
   4. Aviso de cotización (que llegue el correo).
   5. Generar el link de meseros y abrirlo.

   Hasta entonces el estado formal es **`ESPERANDO_VALIDACION_HUMANA_AUTENTICADA`**.

## Importante

2. **Interfaz para asignar personal a eventos.** Hoy los 3 operativos tienen
   `acceso_global = true` porque la plantilla es fija y el salón opera un evento a la vez. Si
   algún día hay dos eventos simultáneos con equipos distintos, hace falta una pantalla para
   `jardines.operativo_asignacion` — la tabla y las políticas ya existen (`sec_14`, `sec_18`).

3. **Cambio de contraseña dentro del portal.** El primer acceso es por enlace de un solo uso y
   la contraseña se comparte por separado; una vista de "cambiar mi contraseña" cierra el ciclo
   sin que el admin tenga que intervenir.

4. **Acordar con Vero los pendientes compartidos** (`docs/SEGURIDAD.md` §9): protección de
   contraseñas filtradas desactivada, `public.is_admin()` y `public.rls_auto_enable()`
   ejecutables por `anon`, y `public.content_audit(actor)` sin índice de FK. **Son suyos: no se
   tocan sin su visto bueno.**

## Después

5. **Canales operativos por evento.** `operativo_canales` es global; dos eventos simultáneos
   compartirían canal de radio. Ver riesgo residual en `docs/BUGS_PENDING.md`.

6. **Conectar el dominio propio en Vercel** y actualizar `og:url` + el `url` del JSON-LD en
   `index.html`; redeploy. Ver `docs/DEPLOY.md`.

7. **Reseñas reales aprobadas** en el panel, para que el carrusel de Confianza tenga contenido.

8. **Remitente del correo.** Si se quiere que salga de una cuenta propia en vez de la actual,
   hay que cambiar `GMAIL_USER` / `MAIL_TO` en Vercel y generar un App Password de esa cuenta.

9. **Peso de las imágenes.** Algunas migradas de imgur pesan varios MB. Optimizarlas mejoraría
   la carga en móvil. **No tocar los videos del hero** (ya comprimidos).

## Ideas futuras

- Más testimonios / sección de eventos realizados con métricas.
- Analítica (GA4 o Vercel Analytics) para medir la conversión del formulario.
- Versiones o secciones por tipo de evento (bodas, XV, corporativos).
- Bajar la deuda de `typecheck`: hoy son 155 errores de línea base. La regla mínima es que no
  suba; reducirla sería mejora real.

## Deuda de seguridad

**Ninguna bloqueante.** Las 21 migraciones `sec_01..22` están aplicadas en producción y los
hallazgos de la auditoría están cerrados. Lo que queda arriba es mejora o depende de terceros.
