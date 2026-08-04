# AUDITORÍA FUNCIONAL

> **Fecha:** 2026-08-04 · **Rama auditada:** `main` (`0d86c21`), que es **lo que está desplegado**.
> **Base:** `vuzyhbiwnnngeohysxcw`, consultada en vivo. Solo lecturas y ensayos en
> `BEGIN/ROLLBACK`. Ninguna escritura, ningún correo, el cron no se disparó.
>
> Línea base al empezar: `lint` 0 · `build` exit 0 · `test:contratos` 127/127 · `typecheck` 59.

---

## 0. Alcance — leer esto primero

### El bloque 8 NO estaba terminado cuando se lanzó esta auditoría

Solo **8A** está hecho, y **sin mergear ni desplegar**. 8B, 8C, 8D y 8E siguen pendientes. El
brief pedía excluir del alcance lo que esas fases ya están arreglando, así que **queda fuera**:

| Fuera de alcance | Fase que lo cubre |
|---|---|
| Que no exista un botón para borrar un evento | 8B |
| Los 3 eventos "Boda ortega" duplicados en producción | 8C |
| Que no se pueda convertir una solicitud en evento | 8D |
| **El patrón 6 completo** — que "cargando", "vacío" y "falló" se vean igual, en las tres zonas | 8E |
| La validación divergente cliente/servidor de las credenciales (contraseña 6 vs 8, usuario sin patrón) y el falso negativo al crear eventos | 8A (hecho, sin desplegar) |

El **patrón 6 es la exclusión más grande**: afecta a prácticamente cada pantalla que hace
`useEffect` + `useState`, y reportarlo aquí sería duplicar el trabajo de 8E con decenas de
hallazgos que ya tienen arreglo en vuelo. **No está auditado y no está en las tablas.**

### Zonas cubiertas y no cubiertas

Este barrido **no llegó a las siete zonas**. Se priorizó profundidad sobre cobertura, que es lo
que pedía el brief, y se declara sin adornos:

| Zona | Estado |
|---|---|
| **Transversal — restricciones de la base vs. listas de la UI** | ✅ **Completo.** Los 17 `CHECK` de `jardines` cruzados contra todas las listas de opciones cerradas del código |
| **1. Sitio público — formulario de cotización** | ✅ **Completo, extremo a extremo**, incluido el camino de fallo |
| **1. Sitio público — resto** (menú, galería, overlays, carruseles, FAQ, splash, sonido, scroll) | ❌ **No auditado** |
| **2. Panel — documentos del evento** | ✅ Completo |
| **2. Panel — contadores del dashboard** | ✅ Completo, cruzados contra la base |
| **2. Panel — resto** (login, CMS, reseñas, administradores, operativo, 6 de las 8 pestañas de la ficha) | ❌ **No auditado** |
| **3. Portal del cliente** | ❌ **No auditado** (solo el `CHECK` de `resenas.estrellas`, vía el barrido transversal) |
| **4. Vistas por token** | ⚠️ **Parcial** — solo la escritura del RSVP |
| **5. Los siete correos** | ❌ **No auditado** |
| **6. El cron** | ⚠️ **Parcial** — solo el criterio de "estancadas" contra el del dashboard |
| **7. Las siete rutas `api/`** | ❌ **No auditado en esta pasada** |

**Un barrido que se calla lo que no miró es peor que uno corto y honesto.** Lo de arriba es lo
que no se miró.

---

## 1. Resumen ejecutivo

**Elementos auditados con veredicto: 14.**

| Veredicto | Nº |
|---|---|
| `CUMPLE` | 8 |
| `MIENTE` | 1 |
| `A MEDIAS` | 3 |
| `MUERTO` | 0 |
| `NO VERIFICABLE` | 2 |

### Los hallazgos más graves

1. **P0 — El tipo de documento «comprobante» no existe en la base.** El panel lo ofrece en el
   desplegable; el `CHECK` solo admite `cotizacion`, `contrato` y `otro`. Toda subida marcada
   como comprobante falla con `23514`. Es **el bug del estatus, otra vez y literal**.
2. **P1 — Cada subida fallida deja un archivo huérfano en el bucket privado.** El archivo se
   sube *antes* de insertar la fila y no se limpia si el insert falla. Con el hallazgo 1, cada
   intento de "comprobante" deja basura no referenciada en `clientes`.
3. **P1 — Borrar un documento traga el error del bucket y no confirma la fila.** El objeto puede
   quedarse en Storage y el borrado de la fila no se comprueba (J-02).
4. **P2 — El formulario público no valida nada de lo que sí valida el servidor.** El visitante
   se entera después de enviar. Los mensajes son correctos y no se pierde el lead, así que es
   fricción, no mentira.
5. **P2 — El «Enviado ✓» del aviso de cotización vive solo en memoria.** Al recargar desaparece
   y el admin no sabe si ya avisó.

### Lo que sí hace lo que promete

El **camino del dinero está sano**: formulario público → RPC `solicitud_crear` → trigger de
saneo → `CHECK` → folio del servidor, incluido el camino de error, verificado ejecutando. Y los
cuatro contadores del dashboard coinciden exactamente con la base.

---

## 2. Transversal — cada lista de opciones contra su restricción real

Este es el barrido que habría encontrado el bug del estatus antes de que costara meses. Se
extrajeron los **17 `CHECK`** de `jardines` y se cruzaron contra todas las listas cerradas del
código.

```sql
select c.relname, con.conname, pg_get_constraintdef(con.oid)
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'jardines' and con.contype = 'c';
```

| Lista en la UI | Restricción real | Veredicto |
|---|---|---|
| `documentos.tipo` — `["contrato","cotizacion","comprobante","otro"]` (`EventoDocumentos.jsx:6`) | `CHECK tipo IN ('cotizacion','contrato','otro')` | **`MIENTE`** — ver P0-1 |
| `eventos.estatus` — `["Apartado","Confirmado","Realizado","Cancelado"]` (`_ui.jsx:52`) | `CHECK` con esos cuatro exactos | `CUMPLE` |
| `solicitudes.estatus` — los cinco (`AdminSolicitudes.jsx:21`) | `CHECK` con esos cinco exactos | `CUMPLE` — lo arregló el bloque 7A |
| `mesas.forma` — `["redonda","cuadrada"]` (`MesaEditor.jsx:25`, `MesaReglas.jsx:19`) | `CHECK forma IN ('redonda','cuadrada')` | `CUMPLE` |
| `rsvps.personas` — la UI acota a 1–20 (`InvitacionPublica.jsx:118`) | `CHECK personas BETWEEN 1 AND 30` | `CUMPLE` — la UI es **más** estrecha, que es el lado seguro |
| `musica.tipo`, `operativo_personal.rol`, `perfiles.rol`, `resenas.estrellas`, `accesos.personas`, `invitaciones.*` | sus `CHECK` respectivos | `NO VERIFICABLE` en esta pasada — no se localizó ni auditó la UI que los escribe |

**Método que conviene repetir en cada bloque futuro:** el cruce de arriba es barato (una consulta
y un `grep`) y es el único que atrapa el patrón 1 sin depender de que alguien tropiece con él.

---

## 3. Zona 1 — Sitio público: el formulario de cotización

Es el camino que genera el negocio, así que se auditó entero, incluido el fallo.

| Elemento | Qué promete | Veredicto | Evidencia | A quién afecta |
|---|---|---|---|---|
| Envío del formulario | "Tu solicitud queda registrada y te damos un folio" | `CUMPLE` | Ejecutado contra producción: `select jardines.solicitud_crear(...)` como `anon` devuelve `{"id":…,"folio":"JCH-268762"}`. Rollback aplicado | Visitante, dueño |
| Folio | Lo genera el servidor, no el navegador | `CUMPLE` | `solicitud_crear` lo devuelve del `returning`; `FormularioModal.jsx` no lo fabrica (contrato ya existente) | Visitante |
| Traducción de errores | "Si algo va mal, te digo qué corregir" | `CUMPLE` | `FormularioModal.jsx:13-20` declara los 6 mensajes; el trigger `solicitud_saneo` lanza **exactamente esos 6** (`sec_13:41-55`). Se verificó que el conjunto coincide | Visitante |
| Rate limit | "Si insistes, te lo digo sin perder tus datos" | `CUMPLE` | `sec_13:31` lanza con `errcode 42501`; `FormularioModal.jsx:29` lo traduce a un mensaje que conserva el formulario | Visitante |
| Validación en el cliente | El formulario parece validar lo que envía | **`A MEDIAS`** | Ejecutado: `solicitud_crear(... p_numero_personas => 99999 ...)` → `P0001 Número de personas inválido` desde `solicitud_saneo():34`. El input es `type="number"` **sin `max`** (`FormularioModal.jsx:293`), y no hay un solo `maxLength` en el archivo | Visitante |
| Longitudes largas | — | `CUMPLE` | Ejecutado: un comentario de 2001 caracteres **no** rompe; el trigger de saneo recorta antes del `CHECK`. *La hipótesis de que fallaría era falsa* | Visitante |

**Sobre la validación en el cliente:** el chain funciona y el lead **no se pierde** — el visitante
ve "Número de personas inválido. Revísalo y vuelve a enviar." y sus datos siguen ahí. Por eso es
P2 y no P1. Pero descubrirlo después de rellenar tres pasos es fricción en el único formulario
que produce ingresos.

---

## 4. Zona 2 — Panel: documentos del evento

| Elemento | Qué promete | Veredicto | Evidencia | A quién afecta |
|---|---|---|---|---|
| Desplegable de tipo → **«comprobante»** | "Puedo clasificar el documento como comprobante" | **`MIENTE`** | `EventoDocumentos.jsx:6`. Ejecutado como admin: `insert … tipo='comprobante'` → `ERROR 23514 documentos_tipo_check`. Y `select count(*) … where tipo='comprobante'` = **0**: nunca ha funcionado | Dueño |
| Los otros tres tipos | igual | `CUMPLE` | Los tres están en el `CHECK` | Dueño |
| Subir documento | "El archivo queda guardado y ligado al evento" | **`A MEDIAS`** | `:51` sube al bucket, `:52` inserta la fila. Si el insert falla —p. ej. por lo anterior— **el archivo ya está en `clientes` y nadie lo borra**. No hay compensación | Dueño (basura invisible) |
| Mensaje de error al subir | "Te digo por qué falló" | **`A MEDIAS`** | `:61` `setError("No se pudo subir: " + err.message)` — enseña el mensaje **crudo de Postgres**. El dueño lee `violates check constraint "documentos_tipo_check"` y no puede hacer nada con eso | Dueño |
| Borrar documento | "Se borra el documento" | **`A MEDIAS`** | `:79` `try { storage.remove } catch { }` — traga el fallo entero; y `storage.remove` devuelve 200 con lista vacía si una policy deniega, así que ni siquiera lanza. `:80` `Documento.delete` devuelve `{success:true}` pase lo que pase (J-02) y no se confirma | Dueño |
| Botón «Avisar» | "Se avisó al cliente" | `CUMPLE` en el envío | `:25-30` manda solo el `documentoId`; el servidor relee y comprueba pertenencia (contrato ya existente) | Cliente |
| Marca «Enviado ✓» | "Ya avisé de este documento" | **`A MEDIAS`** | `:15` `avisados` es `useState` local. Al recargar la pestaña se pierde: nada lo persiste. El admin no sabe si ya avisó | Dueño |
| Descargar | "Abre el documento" | `NO VERIFICABLE` | `:70` pide una URL firmada de 1 h. Exige sesión de admin y navegador | Dueño |

---

## 5. Zona 2 — Panel: contadores del dashboard

Se comparó **cada número con la base**, y el criterio del dashboard con el del correo diario.

| Contador | Criterio en el código | Valor en la base | Veredicto |
|---|---|---|---|
| Solicitudes nuevas | `(s.estatus \|\| "Nueva") === "Nueva"` (`AdminInicio.jsx:88`) | **6** | `CUMPLE` |
| Reseñas por aprobar | `!r.aprobada` | **0** | `CUMPLE` |
| Portales activos | `e.portalActivo` | **1** | `CUMPLE` |
| Eventos en 30 días | fecha futura, `≤30` días, no cancelado | **0** | `CUMPLE` |

**Cruce dashboard ↔ cron.** El dashboard cuenta **6** "solicitudes nuevas"; el resumen diario
reporta **3** "estancadas" (`cron-recordatorios.js:95`, `Nueva` **y** >3 días). Los números
difieren **a propósito y con etiquetas distintas** — no es la afirmación huérfana del patrón 4.
`CUMPLE`.

---

## 6. Zona 4 — Vistas por token (parcial: solo el RSVP)

| Elemento | Qué promete | Veredicto | Evidencia |
|---|---|---|---|
| Contador de asistentes | 1 a 20 | `CUMPLE` | `InvitacionPublica.jsx:118` acota a 20; el `CHECK` permite hasta 30 |
| Campo «Tu nombre» | obligatorio | `CUMPLE` | `:36` corta antes de enviar |
| Campo de mensaje | libre | `NO VERIFICABLE` | Sin `maxLength`; el `CHECK` limita a 500. No se probó el camino largo — exige un token de invitación válido, y crear uno es una escritura |

El resto de la zona 4 (token inválido / expirado / revocado, respuesta genérica, registro de
accesos) **no se auditó**.

---

## 7. Hallazgos priorizados

### P0-1 · El tipo de documento «comprobante» no existe en la base

**Qué está roto.** El desplegable de subida ofrece cuatro tipos; la base solo admite tres.

**Cómo reproducirlo.** Panel → un evento → pestaña Documentos → tipo **comprobante** → subir
cualquier PDF. Falla siempre.

**Evidencia.**
- `src/components/admin/eventos/EventoDocumentos.jsx:6` — `const TIPOS = ["contrato", "cotizacion", "comprobante", "otro"];`
- `CHECK ((tipo = ANY (ARRAY['cotizacion','contrato','otro'])))`
- Ejecutado como admin en `BEGIN/ROLLBACK`:
  `ERROR: 23514: new row for relation "documentos" violates check constraint "documentos_tipo_check"`
- `select count(*) from jardines.documentos where tipo='comprobante'` → **0**. Nunca cuajó una.

**Arreglo propuesto.** Alinear la lista con el `CHECK` quitando `comprobante` — mismo criterio
que D-COD-16 del bloque 7: manda la base. Si el dueño quiere el tipo de verdad, primero una
migración que lo añada al `CHECK` y después la UI, nunca al revés.

### P1-1 · Cada subida fallida deja un archivo huérfano en el bucket privado

**Qué está roto.** El archivo se sube antes de insertar la fila; si el insert falla, nadie lo
borra. El bucket `clientes` acumula objetos que ninguna fila referencia.

**Cómo reproducirlo.** Cualquier subida que falle — hoy, cualquier «comprobante».

**Evidencia.** `EventoDocumentos.jsx:51-57`: `storage.upload(...)` y luego
`Documento.create(...)`, sin `catch` que limpie. El `catch` de `:60` solo pinta el error.

**Arreglo propuesto.** Compensar en el `catch`: si el insert falla, borrar el objeto recién
subido y confirmar el borrado con `{borrado}`, como ya hace `SalonPlanoUpload`.

### P1-2 · Borrar un documento traga el error del bucket y no confirma la fila

**Qué está roto.** Dos fallos silenciosos en la misma función: el borrado del objeto está en un
`catch {}` vacío, y `Documento.delete` devuelve `{success:true}` incondicionalmente (J-02).

**Cómo reproducirlo.** No reproducible sin denegar una policy a propósito; el defecto es
estructural y se ve en el código.

**Evidencia.** `EventoDocumentos.jsx:79-81`. Además `storage.remove` responde **200 con lista
vacía** cuando una policy deniega — no lanza —, así que el `catch` ni siquiera se ejecutaría.

**Arreglo propuesto.** Usar el `{borrado}` que ya devuelve el shim y confirmar la desaparición de
la fila releyendo con `filterEstricto`, como en 7B.

### P2-1 · El formulario público no valida nada de lo que sí valida el servidor

**Evidencia.** `FormularioModal.jsx:293` (`type="number"` sin `max`), 0 `maxLength` en todo el
archivo; `solicitud_saneo():34` lanza `Número de personas inválido`.

**Arreglo propuesto.** Reflejar en el formulario las seis reglas del trigger — y hacerlo desde un
módulo compartido, como el `api/_lib/reglas-credenciales.js` que introduce 8A, para que no puedan
divergir.

### P2-2 · El «Enviado ✓» del aviso de cotización se pierde al recargar

**Evidencia.** `EventoDocumentos.jsx:15` — `avisados` es estado local, nada lo persiste.

**Arreglo propuesto.** Derivarlo de la auditoría (`jardines_private.auditoria`, acción
`correo_cliente`) o de una columna en `documentos`.

### P2-3 · El error de subida enseña el mensaje crudo de Postgres

**Evidencia.** `EventoDocumentos.jsx:61`.

**Arreglo propuesto.** Traducir como ya hace `AdminSolicitudes.mensajeDeError` desde 7A.

---

## 8. No verificable, y qué haría falta

| Qué | Qué haría falta |
|---|---|
| Descarga de documentos por URL firmada | Sesión de admin real + navegador |
| Mensaje largo en el RSVP contra el `CHECK` de 500 | Un token de invitación válido; crearlo es una escritura |
| `musica.tipo`, `operativo_personal.rol`, `perfiles.rol`, `resenas.estrellas`, `accesos.personas`, `invitaciones.*` frente a su UI | Localizar y auditar las pantallas que los escriben |
| Todo lo listado como no cubierto en §0 | Continuar el barrido |

---

## 9. Qué NO se auditó

Repetido aquí a propósito, para que no se pierda entre las tablas: **el resto del sitio público,
casi todo el panel, el portal del cliente entero, tres de las cuatro vistas por token, los siete
correos, el cron salvo un criterio, y las siete rutas `api/`.** Y el patrón 6 completo, excluido
porque lo cubre la fase 8E.
