# Rediseño del sitio público — Jardines Club Hípico

> **2026-08-24 · Carpeta de planificación.** Nada de esto está implementado.
>
> Aquí vive TODO el plan del rediseño y la redistribución del sitio público. Ningún documento
> de esta carpeta se borra: si algo cambia, se marca obsoleto con fecha y se añade lo nuevo.

---

## Qué se está haciendo, en una frase

Convertir una landing page larga en un **sitio web completo**, sin tirar nada de lo que ya
funciona: **redistribuir + expandir + conectar**, nunca *borrar + rehacer*.

El principio que gobierna todas las decisiones:

> **MENOS INFORMACIÓN POR CAMINO · MÁS INFORMACIÓN DISPONIBLE EN TOTAL.**

Y el objetivo comercial concreto: que cuando llegue el WhatsApp, el prospecto ya venga
calificado — *«Vi el Salón Encanto, somos 230, boda en octubre, nos interesa capilla y
hospedaje, ¿tienen esa fecha?»* — en vez de empezar por *«¿qué espacios tienen?»*.

---

## ⚠️ SI RETOMAS ESTO, EMPIEZA POR LA BITÁCORA

**[`12-BITACORA.md`](12-BITACORA.md)** es el documento de ESTADO: en qué fase vamos, qué commits
hay en la rama, qué respondió el dueño a las preguntas que no se pueden deducir del código, y qué
hallazgos cambiaron el plan.

Se escribió porque este trabajo es largo y la memoria de una sesión no sobrevive. **Léela primero
y no te fíes de ningún recuerdo.** Después `07-FASES.md`, y de ahí el documento de la fase que toque.

---
## Los documentos, en orden de lectura

| # | Documento | Para qué |
|---|---|---|
| **01** | `01-AUDITORIA.md` | Qué existe hoy de verdad: código, componentes, datos, SEO. **Medido, no recordado.** |
| **02** | `02-INVENTARIO-CONTENIDO.md` | Cuánto contenido real hay por espacio y por servicio. **Es el documento que decide qué páginas pueden nacer.** |
| **03** | `03-ARQUITECTURA.md` | El mapa de rutas final, qué nace ya, qué espera, y por qué. Incluye la lectura de competencia. |
| **04** | `04-SEO.md` | Estrategia SEO técnica: prerender, canonical, sitemap, robots, schema, Open Graph. |
| **05** | `05-MODELO-DATOS.md` | Qué cambia en Supabase para que el contenido sea editable sin tocar JSX. |
| **06** | `06-DISENO-MOTION-RESPONSIVE.md` | Design system, motion, responsive. **Qué NO se toca.** |
| **07** | `07-FASES.md` | Las fases de implementación, con puertas y checklist obligatoria. |
| **08** | `08-PENDIENTES-DE-MIGUEL.md` | Lo que solo puede aportar el dueño: datos, fotos, textos, decisiones. |
| **09** | `09-SEO-LOCAL.md` | Lo que vive fuera del sitio: ficha de Google, NAP, directorios. |

---

## Reglas no negociables de este rediseño

**N1 · El Hero no se toca.** Los dos videos de fondo, la intro, la dirección artística del
arranque: **se conservan exactamente como están**. Se le puede añadir copy y CTAs, pero el
comportamiento visual del hero actual no se rediseña.

**N2 · Redistribuir, no eliminar.** Antes de retirar cualquier componente: (1) qué hace,
(2) si todavía aporta, (3) en qué página nueva vive, (4) se mueve, (5) se adapta. Ningún
componente se borra por «ya no cabe en la Home».

**N3 · Datos reales o nada.** No se inventan capacidades, precios, horarios, testimonios,
métricas, años de experiencia ni servicios. Si falta un dato, entra en `08-PENDIENTES` y la
página no se publica con relleno genérico. Este repo ya se quemó con respaldos que inventaban
salones; no se repite.

**N4 · Una página existe porque resuelve una intención real.** No porque podamos fabricar otra
URL. Si no hay contenido suficiente para una página, **esa página no nace todavía**.

**N5 · No se toca producción.** Todo el trabajo va en la rama `redesign/sitio-publico-v2`.
Sin merge a `main`, sin deploy de producción, sin cambiar aliases. Solo Preview Deployments.

**N6 · No se rompe el backend.** El sitio público habla con Supabase por el shim y con
`api/solicitud.js`. Cualquier cambio de estructura se audita antes contra sus dependencias.
El CRM y el portal no se tocan en esta iteración.

**N7 · Sin sobreingeniería.** No se migra a otro framework «porque sí». No se instala una
dependencia pesada para un fade. Se resuelve con el menor coste técnico que mantenga la calidad.

**N8 · Las cuatro puertas siguen mandando.** `lint` 0 · `build` exit 0 · `test:contratos` verde ·
`typecheck` sin subir de su línea base (hoy **9** en este repo). Cada fase termina con las cuatro
en verde o no ha terminado.

**N9 · Cero secretos.** Ni tokens, ni claves, ni correos internos, ni datos personales de
clientes en commits, documentos o logs.

**N10 · Se documenta mientras se hace, no al final.** Cada decisión que se desvíe de estos
documentos se anota aquí con su razón. Este proyecto ya tuvo documentación que mentía; no se
repite.

---

## El hallazgo que hay que leer antes que nada

La arquitectura que se propone es correcta. **El cuello de botella no es técnico: es de
contenido.** Medido contra la base de datos el 2026-08-24:

- Cada espacio tiene entre **784 y 1 092 caracteres** de descripción larga — unas 150 palabras.
- Los 14 servicios y las 15 amenidades tienen **~110 caracteres de descripción cada uno**: una
  línea.
- Los 11 servicios extra y los 3 menús tienen la descripción **vacía**.
- Las 69 fotos de la galería **no tienen ni título ni ninguna forma de saber a qué espacio o a
  qué tipo de evento pertenecen**.
- La tabla `resenas` está **vacía**: las reseñas del sitio salen de un JSON local.

Traducido: se puede construir hoy el esqueleto completo —rutas, plantillas, SEO técnico,
navegación—, pero **las páginas de servicios y la galería filtrable no pueden nacer con datos
reales todavía**. El detalle, con números, está en `02-INVENTARIO-CONTENIDO.md`, y lo que hace
falta para desbloquearlas, en `08-PENDIENTES-DE-MIGUEL.md`.
