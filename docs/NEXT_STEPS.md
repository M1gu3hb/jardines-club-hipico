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

6. **Conectar el dominio propio en Vercel.** Al hacerlo hay que tocar **cuatro** sitios, no uno:
   - `index.html`: `og:url` (línea 17) y el `url` de **los dos** bloques JSON-LD (34 y 46).
   - `api/_lib/correo.js`: la constante `SITIO_URL` está **hardcodeada** al dominio de Vercel;
     si no se cambia, todos los correos transaccionales seguirán enlazando ahí (B8).
   - Redeploy. Ver `docs/DEPLOY.md`.

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

**Resuelta en código y migraciones; pendiente de validación humana.** Las 21 migraciones
`sec_01..22` se aplicaron y los hallazgos de la auditoría están cerrados **en el repo**. Lo que
falta no es código: son los 5 flujos del §1, que solo se comprueban con credenciales reales.
Mientras eso no ocurra, el estado es `ESPERANDO_VALIDACION_HUMANA_AUTENTICADA` y **§1 sigue
siendo bloqueante**.

Queda además deuda **no bloqueante** detectada el 2026-08-03, toda en `docs/BUGS_PENDING.md`:
la suite prueba las RPCs superadas en vez de las vigentes (B6), tres funciones residuales sin
llamadores esperan `DROP`, la CSP conserva `'unsafe-inline'`, y no hay fallback si Supabase cae
(B5).
