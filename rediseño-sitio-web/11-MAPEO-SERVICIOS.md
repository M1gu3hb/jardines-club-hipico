# 11 · MAPEO DE SERVICIOS A FAMILIAS

> **2026-08-24 · FASE 1, punto 3.** El plan pedía mapear los 14 servicios a sus familias
> *«leyendo sus títulos, no a ojo»*. Al leerlos apareció algo que cambia la arquitectura de
> `/servicios` y `/amenidades`, y que hay que resolver **antes** de la FASE 6.

---

## 1. El hallazgo: las dos tablas están cruzadas

`jardines.servicios` y `jardines.amenidades` **no contienen lo que sus nombres prometen.**

**`amenidades` (15+ filas) no tiene ni una amenidad.** Tiene entretenimiento y rentas:

```
Alberca · Inflables Infantiles · Futbolito Inflable · Set fotográfico · Mega pantalla led
Pista pixel led · Mesa de dulces personalizada · Auto clásico · Variedad en Grupos Musicales
Chinelo · Cámara 360 · Gladiador · Aereobonji · Trampolín · Mago
```

Eso son **servicios contratables y atracciones**, no características del recinto.

**Y `servicios` (14 filas) sí tiene amenidades**, mezcladas con servicios de verdad:

```
Sanitarios amplios y limpios · Estacionamiento amplio para invitados
Jardines naturales y vegetación ornamental · Área de bar · Sala para conferencias
```

Eso son **características del recinto** — exactamente lo que el encargo (§16) quiere en
`/amenidades`.

**Por qué importa:** si `/amenidades` se construye leyendo la tabla `amenidades`, saldrá una
página de inflables y magos. Y si `/servicios` lee `servicios`, saldrá una página que habla de
baños y estacionamiento. Las dos páginas dirían lo contrario de lo que su URL promete, y el
usuario que busca «¿tienen estacionamiento?» no lo encontraría donde debe.

**La regla, entonces:** el reparto se hace por **lo que cada fila ES**, no por la tabla en la
que le tocó nacer.

---

## 2. Mapeo de los 14 de `servicios`

| # | Título real | Dónde va | Por qué |
|---|---|---|---|
| 1 | Actividades recreativas | **Experiencias** | Es entretenimiento, no logística |
| 2 | Mesa de Honor personalizada | **Decoración y mobiliario** | Montaje |
| 3 | Sala para conferencias | **→ `/espacios`** | Es un ESPACIO, no un servicio |
| 4 | Montajes hermosos y personalizables | **Decoración y mobiliario** | 14 fotos: es el que más contenido tiene |
| 5 | Eventos Nocturnos ármalos a tu gusto | **→ `/eventos/nocturnos`** | Es un TIPO DE EVENTO |
| 6 | Entretenimiento para tu evento | **Experiencias** | |
| 7 | Área de bar | **→ `/amenidades`** | Característica del recinto |
| 8 | Jardines naturales y vegetación ornamental | **→ `/amenidades`** | Característica del recinto |
| 9 | Sanitarios amplios y limpios | **→ `/amenidades`** | Característica del recinto |
| 10 | Seguridad privada durante el evento | **Coordinación y personal** | |
| 11 | Asesoría en decoración y logística | **Coordinación y personal** | |
| 12 | Coordinación de montaje y desmontaje | **Coordinación y personal** | |
| 13 | Flexibilidad de horarios según tu evento | **→ `/como-funciona`** | Es una POLÍTICA, no un servicio |
| 14 | Estacionamiento amplio para invitados | **→ `/amenidades`** | Característica del recinto |

**Resultado: de los 14 «servicios», solo 6 son servicios.** Cinco son amenidades, uno es un
espacio, uno es un tipo de evento y uno es una política.

---

## 3. Corrección a la agrupación del plan

`02-INVENTARIO` §4.1 propuso cuatro familias: Alimentos y bebidas · Decoración y mobiliario ·
Música, audio e iluminación · Coordinación y personal.

Al leer los datos reales, **dos de esas cuatro no se sostienen y falta una**:

| Familia propuesta | Veredicto |
|---|---|
| **Alimentos y bebidas** | ⚠️ **No hay contenido.** Ni un solo servicio de catering en las 14 filas. `alimentos` tiene 3 filas con descripción **vacía**. Lo único cercano es «Área de bar», que es una amenidad, y «Mesa de dulces», que está en `amenidades`. **No nace todavía.** |
| **Decoración y mobiliario** | ✅ Se sostiene: Montajes (14 fotos), Mesa de Honor, Asesoría en decoración |
| **Música, audio e iluminación** | ✅ Se sostiene, pero **su contenido está en `amenidades`**: Mega pantalla led, Pista pixel led, Variedad en Grupos Musicales |
| **Coordinación y personal** | ✅ Se sostiene: Seguridad, Coordinación de montaje, Asesoría logística |
| **Experiencias y entretenimiento** | ➕ **Falta, y es la que más contenido tiene.** Inflables, Futbolito, Gladiador, Trampolín, Aereobonji, Cámara 360, Set fotográfico, Auto clásico, Chinelo, Mago, Alberca, Actividades recreativas, Entretenimiento |

### La agrupación que sí sale de los datos

```
EXPERIENCIAS Y ENTRETENIMIENTO   ← la más rica: ~13 elementos, muchos con foto
DECORACIÓN Y MOBILIARIO          ← 3 elementos, uno con 14 fotos
MÚSICA, AUDIO E ILUMINACIÓN      ← 3 elementos, todos hoy en `amenidades`
COORDINACIÓN Y PERSONAL          ← 3 elementos
```

**Cuatro familias, pero no las cuatro del plan.** «Alimentos y bebidas» sale y entra
«Experiencias y entretenimiento», que es la que el recinto realmente tiene y además es su
diferenciador frente a un salón normal.

---

## 4. Lo que esto cambia en las fases

- **FASE 6** deja de leer «tabla `servicios` → `/servicios`» y «tabla `amenidades` →
  `/amenidades`». Cada página se arma con las filas que le corresponden **por contenido**, vengan
  de la tabla que vengan.
- **`/amenidades`** tiene material real: bar, jardines, sanitarios, estacionamiento — más lo que
  el dueño confirme (WiFi, cocina, accesibilidad). Justo lo que pide el §16 del encargo.
- **`/servicios`** no puede prometer alimentos y bebidas mientras no haya contenido. El §55 del
  encargo lo prohíbe explícitamente.
- **Sala para conferencias** puede ser un noveno espacio o una capacidad del Salón Encanto. **Hay
  que preguntárselo al dueño** — no se decide desde la base.

---

## 5. Lo que hay que preguntar al dueño

1. **¿«Sala para conferencias» es un espacio propio** o es una configuración de uno existente?
2. **¿Hay servicio de alimentos y bebidas?** Los tres registros de `alimentos` están vacíos y no
   hay ningún servicio de catering. Es de las primeras preguntas que hace un cliente.
3. **¿Se renombran las tablas** o se deja el cruce y se resuelve en el código? Renombrar es más
   limpio pero toca el panel; resolverlo en código es aditivo y no rompe nada hoy.
