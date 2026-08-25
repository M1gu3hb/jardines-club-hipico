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
| 1 | Corregir capacidades rotas | ✅ **hecho** en `sec_30` — ver §1.5 |
| 2 | Migraciones `sec_30/31/32` | ✅ **aplicadas y verificadas** — ver §1.6 |
| 3 | Routing multipágina | 🔄 **en curso** |
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

## 1.5 · CAPACIDADES — la respuesta del dueño cambia el modelo (2026-08-24)

**NO EXISTE UNA CAPACIDAD MÍNIMA DE RENTA.** Ese era el malentendido de fondo. Los números
pequeños que hay en la base no son un límite: son una **recomendación estética**.

Palabras del dueño: en Espejos, *«si son menos de cien personas se ve medio vacío; a partir de
cien ya se ve bien»*. Y aun así **lo han rentado para 40-60 personas** — *«lo demás se rellena
con sillones, con salitas»*. Lo mismo en Eclipse.

Eso da la vuelta al asunto: **no es una restricción, es un servicio.** Un recinto que adapta el
montaje a un grupo pequeño está resolviendo un problema, no poniendo una barrera.

| Espacio | Recomendado | Máximo real | Nota |
|---|---|---|---|
| **Jardines** | **400-600** | **~1 000** | *«pueden caber hasta mil personas, fácil»* |
| **Salón de los Espejos** | **100-400** | 400 | Por debajo de 100 se adapta con montaje lounge |
| **Espacio Nocturno (Eclipse)** | 80-120 | 120 | Igual: se ha usado para 40-50 |
| **Estancias (Bungalos)** | — | — | Es hospedaje, no capacidad de evento |

### Lo que esto obliga a cambiar

1. **`capacidad_min` y `capacidad_max` pasan a significar RECOMENDADO**, no límite. Hay que
   decirlo en la interfaz: «Recomendado para 100-400», no «Capacidad 100-400».
2. **Nace `capacidad_maxima_real`**: lo que de verdad cabe. Jardines se publica como 600 y
   admite unas 1 000; sin esa columna, un evento de 800 personas se iría a la competencia
   porque nuestra propia web dice que no cabe.
3. **«Encuentra tu espacio» NO descarta por debajo del mínimo.** Si alguien pide 50 personas,
   Espejos **sale igual**, con la nota de que se adapta con montaje lounge. Descartarlo sería
   perder una renta que hoy se acepta.
4. **El máximo sí descarta**, y ahí se usa el real, no el recomendado.

> **NO PUBLICAR:** el dueño contó que hace ~15 años metieron 6 000 personas en el patio grande
> para un evento que *«nunca vamos a volver a hacer»*. Es contexto para entender el terreno, no
> un dato comercial. No entra en la web ni en la base.

---

## 1.6 · MIGRACIONES APLICADAS (2026-08-24)

Las tres, con autorización expresa del dueño. Cada una lleva **precondiciones al entrar y
verificación al salir**, y las tres pasaron su propia verificación.

| Migración | Versión en la base | Qué hizo |
|---|---|---|
| `sec_30` | `20260825035218` | 11 columnas en `salones`, los 8 slugs, tipo de espacio, y las 3 capacidades falsas corregidas |
| `sec_31` | `20260825035353` | Tabla `tipos_evento` + RLS + 4 políticas + 6 filas **apagadas** |
| `sec_32` | `20260825035419` | 4 columnas en `galeria` + 2 claves foráneas + 3 índices |

### El trap que casi se traga todo esto

Desde `sec_27` **los permisos de este esquema son por columna**. Una columna nueva nace **sin
permiso para `anon`**. El sitio la habría leído como `null` **sin un solo error en consola** —
ni en el navegador, ni en los logs, ni en las pruebas. Habría parecido que el dato no se guardó.

Por eso cada migración lleva su `GRANT` explícito y, sobre todo, por eso la comprobación final
se hizo **desde el rol `anon`**, no desde el rol que aplica migraciones. Verificar con el rol
privilegiado habría dado verde con el sitio roto.

### Dos decisiones para no romper producción

1. **`slug` quedó anulable.** El panel del CRM inserta salones sin enviar slug; un `not null`
   habría reventado esa inserción el primer día. Sin slug simplemente no hay página.
2. **`on delete set null` en la galería, no `cascade`.** Borrar un salón del panel no puede
   llevarse por delante sus fotos: se pierde la etiqueta, no el patrimonio.

### Nota lateral

El 2026-08-25 aparece en la base `vero_seguros_viajes_y_estudiantes`, que **no es nuestra**.
Confirma que Vero sigue en desarrollo activo sobre este mismo proyecto. No se tocó nada suyo.

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
