# 12 · BITÁCORA DE IMPLEMENTACIÓN

> **ESTE ES EL DOCUMENTO DE ESTADO.** Si retomas el trabajo —sesión nueva, contexto compactado,
> otra máquina— **lee esto primero y no te fíes de ninguna memoria.** Después lee
> `07-FASES.md`, y de ahí el documento de la fase que toque.
>
> Se actualiza al cerrar cada fase. Última actualización: **2026-08-24**.

---

## 0. Dónde estamos

| | |
|---|---|
| Rama | **`redesign/sitio-publico-v2`** — todo el trabajo vive aquí |
| `main` | **`ad91904`, INTACTO.** No se mergea ni se despliega a producción (§86 del encargo) |
| Preview | Automático en cada push. **Detrás del login de Vercel** — el dueño entra, nadie más |
| Fase actual | **FASE 2** en curso · FASE 1 pendiente solo de la investigación de competencia |

### Commits de esta rama, en orden

```
a784ca2  FASE 0: el plan del rediseño entra al repo, en su propia rama
ef5565c  FASE 0: medicion encendida, que hasta hoy no habia ninguna
b2a3033  FASE 1: el mapeo de servicios encuentra que las dos tablas estan cruzadas
f4169d0  FASE 1: bitacora de estado, y las cuatro respuestas del dueño
52647ff  FASE 2: el sitio dejaba de ser suyo en los metadatos
```

### FASE 2 — avance punto por punto (los 9 del `07-FASES.md`)

| # | Punto | Estado |
|---|---|---|
| 1 | Corregir capacidades rotas | ⛔ **BLOQUEADO** — necesita al dueño (§ abajo) |
| 2 | Migraciones `sec_30/31/32` | ⛔ **BLOQUEADO** — escribe en la base de producción |
| 3 | Routing multipágina | ⬜ siguiente |
| 4 | Layout base (nav, breadcrumbs, footer) | ⬜ |
| 5 | `<head>` por ruta | ⬜ |
| 6 | Bug del dominio ajeno | ✅ **`52647ff`** |
| 7 | Prerender + sitemap + robots | ⬜ |
| 8 | `rewrites` de `vercel.json` | ⬜ |
| 9 | 404 real | ⬜ |

**Los puntos 3-5 y 7-9 se pueden hacer sin la base**, con las rutas estáticas. Las dinámicas
(`/espacios/:slug`, `/eventos/:slug`) esperan a las migraciones.

---

## 1. RESPUESTAS DEL DUEÑO — 2026-08-24

Esto es lo que **no** se puede deducir del código. Se pregunta una vez y se escribe aquí.

### 1.1 · Los 8 slugs: **CONFIRMADOS Y CONGELADOS**

```
salon-encanto · salon-de-los-espejos · jardines · quiosco
eclipse · area-infantil-pony · capilla · estancias
```

Los ocho son espacios reales del recinto y **cada uno se renta por separado**. Una vez
publicados no se cambian sin redirect 301.

### 1.2 · «Sala para conferencias» → **es un SERVICIO, no un espacio**

Palabras del dueño: *«no vive como salón, vive como servicio; podemos dar nuestros salones
como salas de conferencias»*.

**Consecuencia:** NO nace un noveno espacio. Es una **configuración** que se ofrece sobre los
salones existentes. Su sitio natural es `/eventos/corporativos` y una mención en la ficha de
los salones que la admitan. Corrige la fila 3 del mapeo de `11-MAPEO-SERVICIOS.md`.

### 1.3 · Alimentos y bebidas: **SÍ EXISTE, y con mucho contenido**

Esto **desbloquea la familia** que `11-MAPEO-SERVICIOS.md` había dado por no viable. La base
está vacía, pero el servicio existe. Lo que el dueño confirmó, textual:

- **Comida de tres tiempos** — *«el principal»*
- **Taquiza**
- **Buffet**
- **Formal e informal**
- **Refrescos: familia Coca-Cola, refill ilimitado**
- **Barbacoa**
- **Paquete completo**
- *«Tenemos proveedores de todo, absolutamente de todo»*

> **OJO.** Esto viene de una conversación, no de la base. Antes de publicarlo hay que pedirle
> al dueño la lista precisa —qué incluye cada opción, para cuántas personas, qué es paquete y
> qué es a la carta— porque la regla de honestidad (§79 del encargo) prohíbe inventar. Lo de
> arriba sirve para **estructurar** la página; el detalle fino lo aporta él.
>
> Y hay que meterlo en la base (`alimentos` tiene 3 filas con descripción **vacía**), no
> escribirlo en el JSX.

### 1.4 · El Preview y el login de Vercel: **se queda como está**

El empleado que ayuda con la administración **no participa en esto** y no hay que involucrarlo.
El único que revisa el Preview es el dueño, que entra con su propia cuenta de Vercel.
**No se toca `ssoProtection`.**

---

## 2. Hallazgos que cambian el plan

Ninguno es opinión: todos salieron de leer el código o la base.

1. **Las tablas `servicios` y `amenidades` están cruzadas** (`11-MAPEO-SERVICIOS.md`).
   `amenidades` tiene entretenimiento y rentas; `servicios` tiene amenidades del recinto.
   El reparto se hace por lo que cada fila **es**, no por su tabla.
2. **De los 14 «servicios», solo seis lo son.** Cinco son amenidades, uno es un tipo de evento
   y uno es una política de horarios. Y «Sala para conferencias» es un servicio, confirmado
   arriba.
3. **El sitio no medía nada.** Ni Vercel Analytics ni Google Analytics. Se encendió en la
   FASE 0 para tener línea base *antes* del cambio. **Falta el interruptor del panel de
   Vercel**, que solo puede dar el dueño.
4. **Los Preview no se pueden verificar con `curl`** por el SSO. La puerta de la FASE 2 decía
   «sobre el Preview, con curl»: se verifica **en local** sobre el build, y el Preview queda
   para la revisión visual del dueño.

---

## 3. Lo que sigue pendiente del dueño

| # | Qué | Bloquea |
|---|---|---|
| 1 | Encender **Web Analytics** en el panel de Vercel | Nada, pero sin eso no se registra |
| 2 | **Detalle fino de alimentos y bebidas** (qué incluye cada opción, para cuántos) | Publicar `/servicios` con esa familia |
| 3 | Lo que ya listaba `08-PENDIENTES-DE-MIGUEL.md` | Varias fases |

---

## 3.bis · LOS DOS BLOQUEOS DE LA FASE 2 — datos exactos

### A · Las capacidades no cuadran entre el texto y los números

`jardines.salones` tiene DOS fuentes de capacidad y **se contradicen**. El texto es lo que el
sitio enseña hoy; los números son lo que usaría el comparador y «Encuentra tu espacio».

| Espacio | Texto que se publica | `capacidad_min` | Problema |
|---|---|---|---|
| **Jardines** | 400-600 personas | **`null`** | El espacio más grande **queda fuera de todo filtro numérico** |
| **Salón de los Espejos** | 300-400 personas | **150** | El comparador y la ficha dirían cosas distintas |
| **Espacio Nocturno (Eclipse)** | 80-120 personas | **50** | Igual |
| **Estancias (Bungalos)** | — | — | Es hospedaje, no capacidad de evento |

**La pregunta al dueño, y no se puede inventar (§79 del encargo):** ¿el número menor es el
mínimo REAL con el que se puede rentar el espacio, o es un dato viejo mal cargado? Cambia la
respuesta del buscador: si Espejos admite de verdad 150 personas, tiene que salir cuando
alguien busque 150; si no, recomendarlo sería mentir.

Y falta el rango de **Jardines**, que hoy no existe en números.

### B · Las migraciones escriben en la base de PRODUCCIÓN

El código vive en una rama, pero **la base es una sola y la comparte el sitio en vivo** (y Vero,
en su propio schema). `sec_30/31/32` añaden columnas a `salones` y la tabla `tipos_evento`.

Son **aditivas y anulables** —el sitio actual sigue funcionando sin ellas— pero siguen siendo
una escritura en producción, y la regla del dueño es preguntar antes. **No se aplican sin su sí.**

Cuando se apliquen: `sec_27` ya no concede permisos solos, así que toda tabla nueva necesita su
`GRANT` explícito y hay que **comprobar que `anon` puede leerla**, no suponerlo.

---
## 4. Reglas que no se rompen en esta rama

- **Producción no se toca.** Sin merge a `main`, sin deploy de producción, sin tocar aliases.
- **Puerta al final de cada fase**: lint 0 · build exit 0 · contratos verde · typecheck **≤ 9**.
- **Todo contrato nuevo se valida mutando**: se ve fallar con la regresión real y pasar con una
  mutación inocua.
- **Nada de CRLF**: hay un contrato que lo vigila. Los archivos se escriben en LF.
- **Datos reales siempre.** Si falta información, se marca; no se rellena con genéricos.
