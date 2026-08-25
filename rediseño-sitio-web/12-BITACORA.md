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
| Fase actual | **FASE 1** cerrándose · siguiente **FASE 2** |

### Commits de esta rama, en orden

```
a784ca2  FASE 0: el plan del rediseño entra al repo, en su propia rama
ef5565c  FASE 0: medicion encendida, que hasta hoy no habia ninguna
b2a3033  FASE 1: el mapeo de servicios encuentra que las dos tablas estan cruzadas
```

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

## 4. Reglas que no se rompen en esta rama

- **Producción no se toca.** Sin merge a `main`, sin deploy de producción, sin tocar aliases.
- **Puerta al final de cada fase**: lint 0 · build exit 0 · contratos verde · typecheck **≤ 9**.
- **Todo contrato nuevo se valida mutando**: se ve fallar con la regresión real y pasar con una
  mutación inocua.
- **Nada de CRLF**: hay un contrato que lo vigila. Los archivos se escriben en LF.
- **Datos reales siempre.** Si falta información, se marca; no se rellena con genéricos.
