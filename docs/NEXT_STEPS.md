# NEXT_STEPS.md

> Estado a **2026-08-03**, tras el despliegue de los bloques 3–6. Ordenado por prioridad real.
> **Solo aparece lo que falta.** Lo ya hecho está en `docs/CHANGELOG.md`.
>
> **Bloques 3–6 desplegados y verificados** (PR #5, `7596324`): cabeceras, las 7 funciones, las
> rutas, los 228 medios y el formulario público de punta a punta, todo comprobado sin sesión
> contra <https://jardines-club-hipico.vercel.app>.
>
> **Bloque 7 mergeado** (PR #6) — arregla las cuatro cosas que encontró el dueño usando el panel:
> estatus de solicitudes, borrado de actividad, resumen diario y correo de nueva solicitud.
>
> **Bloque 8 desplegado** (PR #9, commit `b1dbf69`, 2026-08-04) — 8B (eliminar un evento),
> 8C (distinguir homónimos), 8E (los tres estados de una lectura), **8F** (el P0 del borrado de
> usuarios de Auth y los diez puntos de `api/eliminar-evento.js`) y **C1** (la rama tautológica
> del permiso).
>
> **8A NO está en `main`.** Se escribió en la rama `claude/jardines-bloque-8` (`a56e904`), nunca
> se abrió PR y nunca se mergeó. Lo comprobé al cerrar: `AdminEventos.jsx` en producción sigue
> pidiendo 6 caracteres de contraseña cuando el servidor exige 8. Ver §1 bis.
> Batería: `lint` 0, `build` exit 0, `test:contratos` **206/206**, `typecheck` 59 (línea base).
> Migraciones `sec_01..24`, Vero intacto. Lo único que impide declarar el proyecto cerrado es el §1.

## Urgente — bloquea el cierre del proyecto

0. **Borrar los tres duplicados de «Boda ortega» (8C), desde el panel, tras el deploy.**
   `1cf6b357`, `45c19b82`, `1e01d947` — cada uno con 1 fila de `evento_reglas_mesas` y **0** en
   todo lo demás, sin usuario de Auth y sin objetos en el bucket (medido el 2026-08-04). **Se
   conserva `53f69d07`**, el único con la cuenta `ortega-jch`. Los cuatro se llaman igual y en la
   lista se pintan idénticos: hay que fiarse del chip "nombre repetido" y de la hora de alta que
   ahora enseña el diálogo, **no** del nombre. No se borran con SQL suelto a propósito — hacerlo
   desde el panel es también la prueba de fuego de la maquinaria de 8B.

1 bis. **Recuperar 8A, que nunca se mergeó.** Es el falso negativo al crear eventos: el
   formulario valida `password.length < 6` y un usuario "no vacío", mientras el servidor exige 8
   caracteres y `/^[a-zA-Z0-9._-]{3,60}$/`. Una contraseña de 6 o 7, o un usuario con espacio,
   acento o ñ, **pasa el formulario, crea el evento y muere en el servidor con un «Solicitud
   inválida»**: el evento queda a medias, sin credenciales. Está arreglado en
   `claude/jardines-bloque-8` (`a56e904`) — con `api/_lib/reglas-credenciales.js` como único
   sitio donde viven las reglas — pero esa rama salió de antes del bloque 8 y toca los dos
   archivos que 8B/8C reescribieron (`AdminEventos.jsx`, `EventoDatos.jsx`), así que **hay que
   rebasarla sobre `main` y resolver el conflicto a mano**. No se hizo aquí porque estaba fuera
   del encargo de cierre. **Es el hueco funcional más grande que queda abierto.**

0. ter. **Decidir la migración de RLS por columnas (J-10 y J-11).** Son los dos hallazgos que
   8F anotó y no arregló, y salen de la misma causa: las policies de `jardines` conceden **la fila
   entera**, no columnas. Por eso `eventos.auth_user_id` y `documentos.archivo_url` —las dos
   entradas de las operaciones destructivas— las escribe el navegador. El **uso** ya está
   protegido en código; el **permiso** no. Haría falta un `sec_26` con `revoke update ... grant
   update (columnas)` y, para J-11, revocar `delete` sobre `jardines.eventos` **después** de que
   el endpoint esté desplegado y validado (§8.bis: aditivo primero, restrictivo al final).

0. bis. **Decidir la migración de 8D.** La trazabilidad solicitud→evento **no se puede hacer sin
   una columna nueva**: `eventos` no tiene `solicitud_id` y `solicitudes` no tiene `evento_id`.
   Recomendado: `sec_25` aditiva con
   `solicitud_id uuid references jardines.solicitudes(id) on delete set null`. Sin esa decisión
   8D queda bloqueado — es la única fase del bloque 8 que no se pudo hacer.

1. **Validación humana autenticada.** Es lo único que impide declarar CERRADO el blindaje de
   seguridad. El guion está escrito y es autónomo: **`docs/VALIDACION.md`**. Miguel debe confirmar
   **visualmente, con credenciales reales**:
   1. Alta de cliente desde el panel.
   2. Enlace de primer acceso (que el cliente entre con él, y que el segundo intento falle).
   3. Subir un documento y que el cliente lo abra desde su portal.
   4. Aviso de cotización (que llegue el correo).
   5. Generar el link de meseros y abrirlo.

   Hasta entonces el estado formal es **`ESPERANDO_VALIDACION_HUMANA_AUTENTICADA`**.

## Importante — después de la validación

1. bis. **Encender `operativo_activo` en un evento para poder probar la asignación de personal.**
   Hoy hay **0 eventos** con ese interruptor, así que la pantalla de "Personal del evento" solo
   permite comprobar el guardarraíl (que sí funciona con los datos actuales) y no la asignación ni
   la revocación. No se encendió en el despliegue porque cambia quién ve qué en producción — es
   una decisión del dueño. Está en el anexo de `docs/VALIDACION.md`. Relacionado con J-07.

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

## Sobre la red de pruebas

Los **127 contratos** de `scripts/test-contratos-api.mjs` corren a mano (no hay `.github/`, así que
no hay CI: ver `docs/FILE_MAP.md`). Los del bloque 6 están validados **mutando la regresión real**,
uno a uno. La regla para escribir los siguientes está en `CLAUDE.md`, `docs/PROMPTS.md` §9 y
`docs/DECISIONS.md` D-COD-15 — no es opcional: el mismo fallo apareció en cuatro bloques seguidos.

Lo que la suite **no** puede comprobar, por ser estática: que el rollback del plano no se ejecute
en el camino "desconocido" (propiedad de ejecución; el contrato solo puede exigir que el corte esté
antes del borrado) y cualquier cosa que dependa de una sesión autenticada. Eso lo cierra el §1.

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
