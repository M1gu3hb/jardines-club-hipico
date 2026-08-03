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

## Importante — después de la validación

2. **Cambio de contraseña dentro del portal** (J-05). El primer acceso es por enlace de un solo
   uso y la contraseña se comparte por separado; una vista de "cambiar mi contraseña" cierra el
   ciclo sin que el admin tenga que intervenir.

3. **Conectar el dominio propio en Vercel.** Cierra J-01 y J-04 a la vez. Hay que tocar
   **cuatro** sitios, no uno:
   - `index.html`: `og:url` y el `url` de **los dos** bloques JSON-LD.
   - `api/_lib/correo.js`: la constante `SITIO_URL` está **hardcodeada** al dominio de Vercel; si
     no se cambia, todos los correos transaccionales seguirán enlazando ahí.
   - Redeploy. Ver `docs/DEPLOY.md`.

4. **Extender el patrón de "confirmar releyendo"** (J-02), o arreglar el shim de raíz para que
   `update`/`delete` distingan "0 filas por RLS" de éxito, y que las lecturas que **deciden** usen
   `filterEstricto` en vez de `filter`. `SalonPlanoUpload` y `AdminOperativo` ya lo hacen; el resto
   del panel todavía confía en el `[]` ambiguo.

5. **Decidir si la invariante del operativo se garantiza en la base** (J-06). Hoy el bloqueo de
   "nadie con 0 eventos efectivos" vive solo en el navegador: por SQL o desde Studio se puede
   dejar a alguien sin acceso. Un trigger sobre `operativo_personal` lo cerraría, pero es decisión
   de producto — puede haber bajas legítimas.

6. **Acordar con Vero los pendientes compartidos** (`docs/SEGURIDAD.md` §9): protección de
   contraseñas filtradas desactivada, `public.is_admin()` y `public.rls_auto_enable()`
   ejecutables por `anon`, y `public.content_audit(actor)` sin índice de FK. **Son suyos: no se
   tocan sin su visto bueno.**

## Después

7. **Decidir sobre los tokens de invitación y mesa en claro** (`docs/DECISIONS.md` D-COD-2).
   Pasarlos a hash toca RLS y la RPC pública, y los QR ya impresos seguirían siendo portadores,
   así que el beneficio se limita a una fuga de lectura de la tabla. Decidir antes de la próxima
   temporada de eventos.

8. **Canales operativos por evento.** `operativo_canales` es global; dos eventos simultáneos
   compartirían canal de radio.

9. **Reseñas reales aprobadas** en el panel, para que el carrusel de Confianza tenga contenido.

10. **Remitente del correo.** Si se quiere que salga de una cuenta propia, cambiar `GMAIL_USER` /
   `MAIL_TO` en Vercel y generar un App Password de esa cuenta.

11. **Peso de las imágenes.** Algunas migradas de imgur pesan varios MB. **No tocar los videos
    del hero** (ya comprimidos).

12. **Quitar `'unsafe-inline'` de la CSP.** Exige eliminar los estilos y scripts en línea que
    quedan; hasta entonces la CSP acota orígenes pero no protege contra XSS inline.

## Ideas futuras

- Más testimonios / sección de eventos realizados con métricas.
- Analítica (GA4 o Vercel Analytics) para medir la conversión del formulario.
- Versiones o secciones por tipo de evento (bodas, XV, corporativos).
- Bajar la deuda de `typecheck`: hoy son **59** errores de línea base (eran 155 hasta que se
  tipó el Proxy del shim). Los 40 que quedan son casi todos `TS2741` de props opcionales sin
  declarar en los helpers de UI. La regla mínima es que no suba.

## Deuda de seguridad

**Resuelta en código y migraciones; pendiente de validación humana.** Las 23 migraciones
`sec_01..24` se aplicaron y los hallazgos de la auditoría están cerrados **en el repo**. Lo que
falta no es código: son los 5 flujos del §1, que solo se comprueban con credenciales reales.
Mientras eso no ocurra, el estado es `ESPERANDO_VALIDACION_HUMANA_AUTENTICADA` y **§1 sigue
siendo bloqueante**.

Queda además deuda **no bloqueante**, toda en `docs/BUGS_PENDING.md` con la numeración `J-##`:
`SITIO_URL` hardcodeada (J-01), el `[]` ambiguo del shim en escrituras y lecturas (J-02), el
guardarraíl del operativo que solo vive en el cliente (J-06), la ausencia de fallback si Supabase
cae (J-03), el dominio placeholder (J-04), el cambio de contraseña en el portal (J-05) y
`operativo_activo` sin control en el panel (J-07). Más los riesgos residuales aceptados, entre
ellos que la CSP conserva `'unsafe-inline'`.
