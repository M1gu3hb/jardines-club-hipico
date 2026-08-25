# 05 · MODELO DE DATOS — qué cambia en Supabase

> **2026-08-24.** El objetivo: que el dueño edite «Salón Encanto» en el panel y se actualice
> `/espacios/salon-encanto` **sin tocar JSX**. Y que las páginas de evento crezcan sin
> hardcodear.

---

## 1. Reglas que gobiernan cualquier cambio aquí

- **Un solo proyecto de Supabase**, `vuzyhbiwnnngeohysxcw`, compartido con Vero Seguros. El
  candado de `CLAUDE.md` vale entero: schema `public`, bucket `site-media` y `auth.users` **no
  se tocan**.
- **Migraciones forward-only**, en `supabase/migrations/`, numeradas `sec_30` en adelante, con
  **precondiciones dentro** que hagan fallar la migración **sin tocar nada** si el estado no es
  el esperado.
- **⚠️ `sec_27` ya cambió las reglas: toda tabla nueva en `jardines` nace SIN grants para
  `anon`/`authenticated`.** Si se crea una tabla y se olvida el `GRANT`, **falla en silencio**:
  el shim devuelve lista vacía en vez de error (J-02). Cada migración que cree una tabla lleva:
  ```sql
  alter table jardines.nueva enable row level security;
  revoke insert, update, delete on jardines.nueva from anon;
  grant select on jardines.nueva to anon, authenticated;
  -- + una policy por comando, con rol explícito (nunca PUBLIC)
  ```
- **Primero lo aditivo, luego se despliega, y solo entonces se retira lo viejo.** Ninguna
  columna existente se renombra ni se borra mientras el frontend actual la use.
- **Nada de esto rompe el CRM ni el portal.** Los dos leen las mismas tablas: cualquier columna
  nueva es aditiva y opcional.

---

## 2. `jardines.salones` — columnas nuevas

Todas **aditivas y anulables**. El sitio actual sigue funcionando sin ellas.

| Columna | Tipo | Para qué | ¿Bloqueante? |
|---|---|---|---|
| `slug` | `text unique not null` | La URL. **Se fija a mano**, no se deriva del nombre | ⛔ **Sí** |
| `tipo_espacio` | `text` | `interior` · `exterior` · `mixto` · `hospedaje` · `ceremonia` | ⛔ **Sí** |
| `capacidad_hospedaje` | `int` | Estancias no tiene capacidad de evento, tiene de hospedaje | Recomendado |
| `eventos_ideales` | `jsonb` | Slugs de tipos de evento: `["bodas","xv-anos"]` | ⛔ **Sí** |
| `servicios_relacionados` | `jsonb` | Ids o slugs de servicios | Recomendado |
| `preguntas` | `jsonb` | FAQs propias del espacio: `[{p,r}]` | ⛔ **Sí** |
| `seo_title` | `text` | Si está vacío se genera del nombre | Recomendado |
| `seo_description` | `text` | Igual | Recomendado |
| `og_image` | `text` | Si está vacío se usa `imagen_principal` | Recomendado |
| `datos_rapidos` | `jsonb` | Baños, cocina, estacionamiento, cobertura… **solo confirmados** | Recomendado |

### 2.1 · Antes de nada: arreglar los datos que ya están mal

Esto **no es una migración de esquema**, es corrección de contenido, y va **primero**:

| Espacio | Problema | Qué hace falta |
|---|---|---|
| **Jardines** | `capacidad_min` y `capacidad_max` en `null` | Cargar el rango real. Es el espacio más grande y hoy **queda fuera de cualquier filtro** |
| **Salón de los Espejos** | texto «300-400» vs `capacidad_min` = 150 | Decidir cuál es el dato verdadero |
| **Espacio Nocturno (Eclipse)** | texto «80-120» vs `capacidad_min` = 50 | Igual |
| **Estancias (Bungalos)** | sin capacidad de ningún tipo | `tipo_espacio = 'hospedaje'` + `capacidad_hospedaje` |

**Sin esto, ni el comparador de `/espacios` ni «Encuentra tu espacio» pueden funcionar con
honestidad**, y recomendar mal es peor que no recomendar.

---

## 3. `jardines.tipos_evento` — tabla nueva

Hoy los tipos de evento no existen como dato: solo son opciones del formulario.

```
id · slug (unique) · nombre · descripcion_corta · descripcion_larga
imagen_hero · galeria (jsonb) · espacios_recomendados (jsonb de slugs)
servicios_relacionados (jsonb) · preguntas (jsonb)
seo_title · seo_description · og_image · activo · orden
```

**`activo` es la pieza clave del plan de contenido:** las páginas de evento sin contenido se
crean con `activo = false`, **no se enlazan desde ningún sitio y no entran en el sitemap**. El día
que tengan material, se activan y aparecen solas. Así se cumple la regla N4 sin bloquear el
desarrollo de la plantilla.

Filas iniciales: `bodas`, `xv-anos`, `cumpleanos`, `infantiles`, `corporativos`, `nocturnos`.
Las dos primeras activas si tienen contenido; las otras cuatro **inactivas**.

---

## 4. `jardines.galeria` — el cambio de mayor retorno

Hoy: `imagen_url`, `titulo`, `orden`. **69 filas, ninguna con título, ninguna con forma de saber
a qué espacio o a qué evento pertenece.**

| Columna nueva | Para qué |
|---|---|
| `alt` | Accesibilidad y SEO. Describe la imagen, sin keyword stuffing |
| `salon_id` | Qué espacio sale en la foto (FK anulable a `salones`) |
| `tipo_evento_slug` | Qué tipo de evento (anulable) |
| `destacada` | Si sale en la Home o en el hero de su página |

**Esto es lo que desbloquea, todo a la vez:** los filtros de `/galeria`, las galerías por espacio,
las fotos de las páginas de evento, los `alt` para SEO y las imágenes de Open Graph.

**El trabajo es humano:** etiquetar 69 piezas, ~30 segundos cada una, media hora larga. Es la
tarea de mayor retorno de todo el rediseño. Ver `08-PENDIENTES-DE-MIGUEL.md`.

---

## 5. `jardines.solicitudes` — contexto comercial

Buena noticia: **la mayoría del contexto ya cabe.** La tabla tiene `salon_seleccionado`,
`tipo_evento`, `numero_personas` y `fecha_tentativa`.

Lo único que falta:

| Columna nueva | Para qué |
|---|---|
| `origen` | De qué página vino: `/eventos/bodas`, `/espacios/salon-encanto`, `home`… |
| `contexto` | `jsonb` con lo que aportó el selector: espacios sugeridos, rango de invitados, servicios de interés |

> **⚠️ Cuidado, esto es lo más delicado de todo el documento.** `solicitudes` **no admite INSERT
> directo**: `anon` no tiene el permiso desde `sec_21`. La única vía es la RPC
> `jardines.solicitud_crear`, que valida, aplica rate limit por IP y **genera el folio en el
> servidor**. Y hay un trigger, `solicitud_saneo`, que sanea y rechaza.
>
> Añadir un campo exige tocar **la RPC y el trigger**, no solo la tabla. Es aditivo y de bajo
> riesgo, pero es la **única vía de escritura pública que existe**: si se rompe, se cae el
> formulario de cotización, que es lo que da de comer. Se hace con precondiciones, se ensaya en
> `BEGIN/ROLLBACK`, y **el formulario actual tiene que seguir funcionando sin mandar los campos
> nuevos**.

---

## 6. `jardines.preguntas` — opcional, se decide en la FASE 7

Las 9 FAQs viven hardcodeadas en `FaqSection.jsx`. Dos caminos:

- **(a)** FAQs por página dentro del `jsonb` `preguntas` de cada espacio y tipo de evento, y las
  generales siguen en código. **Menos piezas, arranca ya.**
- **(b)** Tabla `preguntas` con `categoria`, `pregunta`, `respuesta`, `orden`, `activa`, editable
  desde el panel.

**Recomendada: (a) ahora, (b) cuando el volumen lo pida.** No se monta un CMS de FAQs para nueve
preguntas.

---

## 7. Panel de administración — dónde se edita todo esto

El panel vive en `JCH-CRM`, **otro repositorio**. Cada columna nueva necesita su control ahí, o
el dueño no puede editarla y volvemos a tocar JSX.

**Esto es trabajo del repo del CRM, no de este**, y hay que planificarlo aparte. Sin ese trabajo,
el objetivo del §56 del encargo —«edito Salón Encanto y se actualiza la página»— **no se cumple**.

Orden recomendado: primero las columnas y el sitio leyéndolas (aquí), después los controles del
panel (allá). Mientras tanto, los valores se cargan por SQL con el visto bueno del dueño.

---

## 8. Resumen de migraciones

| # | Qué | Riesgo | Bloqueante |
|---|---|---|---|
| `sec_30` | Columnas nuevas en `salones` (`slug`, `tipo_espacio`, `eventos_ideales`, `preguntas`, SEO…) | Bajo — aditivo | ⛔ Sí |
| `sec_31` | Tabla `tipos_evento` + RLS + **GRANT explícito** | Bajo — nueva | ⛔ Sí |
| `sec_32` | Columnas nuevas en `galeria` (`alt`, `salon_id`, `tipo_evento_slug`, `destacada`) | Bajo — aditivo | ⛔ Sí |
| `sec_33` | `origen` y `contexto` en `solicitudes` + **RPC y trigger** | **Medio** — toca la única vía de escritura pública | No (el sitio funciona sin ella) |

Más una **corrección de datos** (§2.1) que no es migración de esquema pero va **antes que todo lo
demás**.
