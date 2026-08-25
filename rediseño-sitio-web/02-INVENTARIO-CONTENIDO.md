# 02 · INVENTARIO DE CONTENIDO — qué páginas pueden nacer hoy

> **2026-08-24 · Medido contra Supabase en producción.**
>
> Este es el documento más importante de la carpeta. La arquitectura que quiere el dueño es
> correcta; lo que decide si se puede construir **hoy** o no es cuánto contenido real existe.
> Y su propia regla lo dice (§55 del encargo): *si no tenemos contenido suficiente, NO crees la
> página todavía*.

---

## 1. La regla de admisión

Una página nace cuando cumple **las tres**:

1. **Resuelve una intención real** de alguien que planea un evento.
2. **Tiene contenido propio suficiente** — no el de otra página con palabras cambiadas.
3. **Tiene material verificable**: datos reales y fotografías propias.

Si falla la 2 o la 3, la página **no se publica**: se queda como plantilla lista y su contenido
entra en `08-PENDIENTES-DE-MIGUEL.md`.

**Umbral mínimo por página indexable**, y no es un capricho: por debajo de esto una página no
aporta nada que el usuario no encuentre en la Home, y para Google es contenido delgado.

| | Mínimo |
|---|---|
| Texto propio y útil | **≥ 350 palabras** (~2 000 caracteres) |
| Fotografías propias del tema | **≥ 4** |
| Preguntas frecuentes propias | **≥ 3** |
| Datos concretos verificables | capacidad, medidas, características, incluidos |

---

## 2. Espacios — **8 de 8 pueden nacer**, con reparo

Medido: descripción larga entre **784 y 1 092 caracteres** (≈ 120-170 palabras), entre **7 y 28
imágenes**, y entre **7 y 15 características**.

**Veredicto: sí nacen las ocho.** Es el contenido más sólido que hay, y las fotografías sobran.
Pero el texto está **por debajo del umbral**: hoy da para media página, no para una página.

Lo que hace que aun así se sostengan: una página de espacio no es solo prosa. Con la ficha de
datos rápidos, la galería, los eventos ideales, los servicios enlazados y sus FAQs propias, el
contenido llega. **Pero cada espacio necesita entre 150 y 250 palabras más** de texto propio, y
esas las tiene que dar el dueño (`08-PENDIENTES`).

### 2.1 · Tres bloqueos de datos que hay que resolver ANTES del comparador

| Bloqueo | Qué pasa | Qué hace falta |
|---|---|---|
| **`Jardines` sin `capacidad_min`/`max`** | El espacio más grande **queda fuera de todo filtro numérico**. Alguien que busque «400 personas» no lo ve | Confirmar el rango real y cargarlo |
| **`Espejos`: texto dice 300-400, `capacidad_min` = 150** | El comparador y la ficha se contradicen entre sí | Decidir cuál es el dato verdadero |
| **`Eclipse`: texto dice 80-120, `capacidad_min` = 50** | Igual | Igual |
| **`Estancias` sin capacidad** | Correcto, es hospedaje — pero el modelo no lo distingue | Campo nuevo: `tipo_espacio` + capacidad de hospedaje |

**Sin esto, «Encuentra tu espacio» y la comparación de `/espacios` no se pueden construir con
honestidad.** Es lo primero que hay que cerrar.

### 2.2 · Slugs — se fijan a mano, no se derivan

Los nombres de la base no son los comerciales:

| Nombre en la base | Slug |
|---|---|
| Salón de los Espejos | `salon-de-los-espejos` |
| Salón Encanto | `salon-encanto` |
| Espacio Nocturno (Eclipse) | `eclipse` |
| Jardines | `jardines` |
| Área Infantil Pony | `area-infantil-pony` |
| Capilla | `capilla` |
| Quiosco | `quiosco` |
| Estancias (Bungalos) | `estancias` |

Derivar el slug del nombre daría `espacio-nocturno-eclipse` y `estancias-bungalos`. **El slug es
una columna, no un cálculo** — y una vez publicado no se cambia sin redirect 301.

---

## 3. Tipos de evento — **no existe contenido. Cero.**

No hay tabla, no hay filas, no hay textos, no hay fotos etiquetadas por tipo de evento. La
palabra «boda» hoy solo aparece dentro de descripciones de salones y en el desplegable del
formulario.

**Veredicto: las 6 páginas de evento nacen VACÍAS de contenido.** Son las de mayor valor
comercial del rediseño —son las que capturan «salón para boda en Xochimilco»— y son **100 %
contenido nuevo**.

Cada una necesita, como mínimo:

- 350-500 palabras propias, **realmente distintas entre sí** (no bodas con las palabras cambiadas)
- 4-8 fotografías reales **de ese tipo de evento** en el recinto
- 3-6 FAQs propias
- Qué espacios se recomiendan y por qué
- Qué servicios aplican

**Prioridad realista:** empezar por **bodas** y **XV años**. Son las dos de mayor volumen de
búsqueda y las que el dueño puede documentar con material existente. Las otras cuatro
(cumpleaños, infantiles, corporativos, nocturnos) se publican cuando tengan material propio.

> **Advertencia importante:** publicar seis páginas de evento con el mismo texto reescrito es
> exactamente el «contenido SEO basura» que el encargo prohíbe (§53), y además Google lo trata
> como contenido duplicado. **Mejor dos páginas buenas que seis mediocres.**

---

## 4. Servicios — **hoy NO alcanzan para 5 páginas**

Medido:

| Tabla | Filas | Descripción media |
|---|---|---|
| `servicios` | 14 | **120 caracteres** |
| `servicios_extra` | 11 | **0 — vacía** |
| `alimentos` | 3 | **0 — vacía** |

Sumando **todo** el texto de servicios que existe en la base: unos **1 700 caracteres**, ≈ 280
palabras. Repartido en cinco páginas, salen **56 palabras por página**.

**Veredicto: las 5 páginas de servicio NO nacen todavía.** Crearlas hoy sería exactamente lo que
el encargo prohíbe en su §55.

**Lo que sí nace ya:** `/servicios` como **una sola página completa**, bien construida, con los
14 servicios agrupados en las cinco familias, cada familia con su bloque, sus fotos y su
explicación. Eso sí tiene contenido suficiente y resuelve la intención real («¿qué ofrecen?»).

**Cuándo se parten en cinco páginas:** cuando cada familia tenga ≥ 350 palabras propias y ≥ 4
fotos. Se hace de una en una, empezando por **Alimentos y bebidas**, que es la que más preguntan.

### 4.1 · Agrupación propuesta de los 14 servicios

Las cinco familias del encargo son razonables. Al ver los datos reales, la agrupación se
confirma, con un matiz: **Barra de dulces** es un servicio, no una familia — cabe dentro de
Alimentos y bebidas. Pero tiene componente propio (`BarraDulces.jsx`) y valor comercial visible,
así que se conserva como bloque destacado dentro de esa familia, no como página aparte.

```
ALIMENTOS Y BEBIDAS          ← incluye barra de dulces y los 3 menús de `alimentos`
DECORACIÓN Y MOBILIARIO
MÚSICA, AUDIO E ILUMINACIÓN
COORDINACIÓN Y PERSONAL
```

**Cuatro familias, no cinco.** La quinta se separa el día que tenga contenido propio.

> El mapeo exacto de cada uno de los 14 servicios a su familia hay que hacerlo leyendo sus
> títulos reales. No se asigna a ojo: es trabajo de la FASE 6.

---

## 5. Amenidades — **sí nace, como una sola página**

15 amenidades activas, ~105 caracteres cada una. Total ≈ 1 575 caracteres.

**Veredicto: `/amenidades` nace como página única**, tal como pide el encargo (§16), con
narrativa desde la experiencia del invitado en vez de una lista de checks. El texto de la base da
para el esqueleto; hace falta la narrativa que lo une (≈ 300 palabras nuevas).

**No se crean subpáginas** (`/amenidades/wifi`, etc.). El encargo ya lo prohíbe y los datos lo
confirman: dos líneas no son una página.

---

## 6. Galería — **nace, pero SIN filtros**

69 medios. **Cero tienen título. Cero tienen forma de saber a qué espacio o a qué evento
pertenecen.** La tabla `galeria` solo tiene `imagen_url`, `titulo` y `orden`.

**Veredicto:**
- ✅ `/galeria` nace como página completa con los 69 medios.
- ⛔ **Los filtros por espacio y por tipo de evento NO se pueden construir**: no existe el dato.
- ⛔ Los `alt` descriptivos tampoco: no hay de dónde sacarlos.

**Qué hace falta:** etiquetar las 69 piezas. Es trabajo manual del dueño (o de quien conozca las
fotos) y es la tarea de mayor retorno de todo el rediseño, porque desbloquea a la vez: los
filtros de la galería, las galerías por espacio, las fotos de las páginas de evento, los `alt`
para SEO y las imágenes de Open Graph.

**Estimación honesta:** 69 piezas × ~30 segundos = **media hora larga de trabajo**. Es poco para
lo que desbloquea.

---

## 7. Preguntas frecuentes — **9 existen, hardcodeadas**

Están en `FaqSection.jsx`, no en la base. Cubren: capacidad, paquetes, estacionamiento,
hospedaje, capilla, tipos de evento, ubicación y cómo apartar.

**Veredicto:** se **redistribuyen**, no se tiran (§30 del encargo). Nueve preguntas repartidas
entre ~20 páginas dan a menos de una por página, así que hacen falta **más**. Cada página
específica necesita 3-6 FAQs propias, y esas salen de las preguntas que el dueño recibe por
WhatsApp todos los días — que es la mejor fuente que existe y no cuesta inventarla.

`/preguntas-frecuentes` nace como **índice completo** agrupado por tema.

---

## 8. Reseñas — la tabla está vacía

`jardines.resenas` = **0 filas**. `Confianza.jsx` lee `src/data/resenas.json`.

**Veredicto:** la sección se conserva **exactamente como está** y se documenta que su fuente es
un archivo local. No se inventa ninguna reseña ni ninguna métrica (N3). Si el dueño quiere que se
alimente de la base, tiene que cargar reseñas reales al panel primero.

---

## 9. Tabla resumen — qué nace y qué espera

| Página | ¿Nace ahora? | Por qué |
|---|---|---|
| `/` (Home nueva) | ✅ | Todo el contenido existe, solo se redistribuye |
| `/espacios` | ⚠️ **Tras arreglar capacidades** | Sin los datos de `Jardines` el comparador miente |
| `/espacios/{8}` | ✅ | 8 espacios con fotos y texto; necesitan +150-250 palabras cada uno |
| `/eventos` (hub) | ✅ | El hub sí: es distribución, no contenido nuevo |
| `/eventos/bodas` | ⚠️ **Necesita contenido** | 0 palabras hoy. Es la de mayor valor |
| `/eventos/xv-anos` | ⚠️ **Necesita contenido** | 0 palabras hoy |
| `/eventos/{otros 4}` | ⛔ **NO todavía** | Sin material propio serían bodas con palabras cambiadas |
| `/servicios` (una página) | ✅ | 14 servicios + narrativa nueva |
| `/servicios/{5 subpáginas}` | ⛔ **NO todavía** | 56 palabras por página. Prohibido por §55 |
| `/amenidades` | ✅ | 15 amenidades + narrativa |
| `/galeria` | ⚠️ **Sin filtros** | Falta etiquetar las 69 piezas |
| `/como-funciona` | ✅ | Los 3 pasos existen y funcionan |
| `/preguntas-frecuentes` | ✅ | 9 existentes + las que aporte el dueño |
| `/ubicacion` | ✅ | Dirección, mapa y coordenadas verificadas |
| `/nosotros` | ⚠️ **Necesita contenido** | No existe ni un párrafo. Y no se inventa |
| `/cotizar` | ✅ | El formulario ya existe y funciona |
| `/contacto` | ✅ | Datos verificados en `config/negocio.js` |

**Cuenta:** **10 páginas nacen limpias**, 4 nacen con reparo, 3 grupos esperan contenido.

Eso no es un fracaso del plan: es la diferencia entre un sitio que responde de verdad y 40 URLs
vacías. El encargo lo pide explícitamente en su §77: *no construyas 40 páginas al mismo tiempo si
eso reduce calidad*.
