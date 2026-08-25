# 03 · ARQUITECTURA DE INFORMACIÓN

> **2026-08-24.** Qué rutas existen, qué contiene cada una, qué nace ya y qué espera.
> Se apoya en `02-INVENTARIO-CONTENIDO.md`: aquí no se propone ninguna página que no tenga
> contenido detrás o un plan explícito para tenerlo.

---

## 1. Lectura de competencia — lo que cambia la estrategia

No se copia diseño, ni textos, ni estructura. Lo que interesa es entender el terreno.

**El hallazgo que más importa:** en México, las búsquedas genéricas del sector —«salones para
bodas CDMX», «jardines para boda Estado de México»— están dominadas por **directorios**:
`bodas.com.mx`, `lugaresparaeventos.mx`, `zaloneros.com.mx`, `eventech.mx`, `bodasmexico.com.mx`.
Son agregadores con miles de fichas y años de autoridad.

**Consecuencia estratégica, y hay que decirla claro:** un sitio de un solo recinto **no va a
ganarle a bodas.com.mx** por «salón para bodas en CDMX». Perseguir esos términos es quemar
esfuerzo. El terreno que Jardines **sí puede ganar** es otro, y es mejor:

| Terreno | Por qué se puede ganar |
|---|---|
| **Marca** — «Jardines Club Hípico» | Nadie compite por ella. Hoy la ficha de Google y Facebook aparecen antes que el sitio |
| **Local pack / Maps** | Es un negocio físico con dirección real. Aquí compite de tú a tú |
| **Long-tail específico** — «salón para 300 personas Xochimilco», «jardín para boda con capilla CDMX», «salón de eventos con hospedaje Xochimilco» | Los directorios no tienen páginas dedicadas a esto. Jardines sí puede tenerlas |
| **Intención de comparación** — «cuánta gente cabe en…», «se puede hacer ceremonia y recepción en…» | Contenido propio que ningún agregador puede inventar |
| **Los propios directorios** | Estar bien listado en ellos **es parte de la estrategia**, no competencia. Ver `09-SEO-LOCAL.md` |

**Qué se aprende de cómo funcionan los sitios de recinto que sí están bien hechos:**

1. **La capacidad es lo primero que se enseña**, antes que la prosa. Quien busca recinto filtra
   por número de invitados; si tiene que leer tres párrafos para saber si caben, se va.
2. **Cada espacio tiene su URL, su galería y su ficha comparable.** El overlay está bien para
   explorar rápido, pero el espacio necesita página propia — es lo que se comparte por WhatsApp
   y lo que indexa Google.
3. **Separan «espacio» de «tipo de evento»** y los cruzan. Son dos formas distintas de entrar:
   unos llegan pensando «¿dónde?» y otros «¿sirve para mi boda?».
4. **La visita presencial es la conversión real.** Un recinto se vende cuando se ve.
5. **En móvil, lo primero es: nombre, capacidad, fotos, contacto.** Nada de 1 000 px de
   decoración antes del dato.

Todo eso ya está reflejado en la arquitectura de abajo.

> **Pendiente de FASE 1:** revisar uno por uno los sitios que citó el dueño (Casa Xipe, Club
> Hípico Santiago, FIVE Event Center, Historic Concord Exchange, Bella Sombra) y anotar qué hace
> cada uno con: descubrimiento de espacios, comparación de capacidades, galería, FAQs, camino a
> la visita y comportamiento en móvil. Se documenta en `10-COMPETENCIA-DETALLE.md`, que se crea
> en esa fase. **No se ha hecho todavía y no se finge que sí.**

---

## 2. El mapa de rutas

```
/                                   Home — distribuidor
│
├── /espacios                       Hub · comparador
│   ├── /espacios/salon-de-los-espejos
│   ├── /espacios/salon-encanto
│   ├── /espacios/jardines
│   ├── /espacios/eclipse
│   ├── /espacios/area-infantil-pony
│   ├── /espacios/capilla
│   ├── /espacios/quiosco
│   └── /espacios/estancias
│
├── /eventos                        Hub
│   ├── /eventos/bodas              ← P0
│   ├── /eventos/xv-anos            ← P0
│   ├── /eventos/cumpleanos         ← espera contenido
│   ├── /eventos/infantiles         ← espera contenido
│   ├── /eventos/corporativos       ← espera contenido
│   └── /eventos/nocturnos          ← espera contenido
│
├── /servicios                      UNA página, cuatro familias
├── /amenidades
├── /galeria
├── /como-funciona
├── /preguntas-frecuentes
├── /ubicacion
├── /nosotros                       ← espera contenido
├── /cotizar                        + ?espacio= &evento= &personas=
├── /contacto
│
├── /robots.txt                     nuevo
├── /sitemap.xml                    nuevo, generado
└── *                               404 real
```

**Diferencias respecto a la propuesta del encargo, y su razón:**

| Cambio | Razón |
|---|---|
| `/servicios` **sin las 5 subpáginas** | 56 palabras por página. Lo prohíbe el propio §55 del encargo |
| **Cuatro familias de servicio, no cinco** | «Barra de dulces» es un servicio, no una familia. Se conserva como bloque destacado dentro de Alimentos y bebidas |
| `/eventos/eclipse` → `/eventos/nocturnos` | El espacio se llama Eclipse; el tipo de evento es «nocturno». No se mezclan |
| 4 de las 6 páginas de evento **esperan** | 0 palabras de contenido propio hoy |
| `/nosotros` **espera** | No existe ni un párrafo, y no se inventa (N3) |

---

## 3. Home nueva — distribuidor, no catálogo

La estructura del encargo es buena y se respeta:

1. **HERO** — **intocable** (N1). Los dos videos, la intro, la dirección artística. Se le añaden
   los dos CTAs (*Explorar espacios* · *Cotizar mi evento*) y una línea de diferenciadores reales:
   8 espacios · 30-600 invitados · capilla · hospedaje · área infantil · Xochimilco.
2. **¿QUÉ ESTÁS PLANEANDO?** — 6 cards con fotografía real, no iconos. Cada una a su página de
   evento. Las que aún no existan **no se muestran**: mejor 2 cards que 6 con enlaces a páginas
   vacías.
3. **ESPACIOS DESTACADOS** — 3-4, no los 8. Jardines · Espejos · Encanto · Eclipse. CTA *Ver los
   8 espacios*.
4. **DIFERENCIADORES** — capilla, hospedaje, área infantil, estacionamiento. Visual, no checklist.
5. **CONFIANZA** — se conserva tal cual. Fuente: JSON local (ver `01-AUDITORIA` §5).
6. **GALERÍA DESTACADA** — unas pocas fotos + *Ver galería completa*.
7. **CÓMO FUNCIONA** — los 3 pasos, resumidos + enlace a la página.
8. **DUDAS CRÍTICAS** — 4-5 FAQs de las más frecuentes + enlace al índice.
9. **UBICACIÓN** — mapa y referencia + enlace a `/ubicacion`.
10. **CTA FINAL** — cotizar / agendar visita.

Todo lo demás **sale de la Home** y vive en su página. `NoIncluyeSection` se disuelve y su
contenido reaparece en `/servicios` como contexto positivo: *el espacio es la base y a partir de
ahí se arma a la medida*.

---

## 4. `/espacios` — el hub que tiene que dejar comparar

Lo que el usuario tiene que poder hacer **sin leer prosa**: ver los 8, ordenar por capacidad,
filtrar por interior/exterior y por tipo de evento, y saltar al que le sirve.

Ficha comparable por espacio:

```
SALÓN ENCANTO
200 – 300 invitados · Interior
Bodas · XV años · Sociales
[foto]                        → Ver espacio    → Cotizar
```

**Bloqueado hasta arreglar las capacidades** (`02-INVENTARIO` §2.1). Con `Jardines` en `null`, el
comparador deja fuera al espacio más grande.

### 4.1 · «Encuentra tu espacio»

Herramienta de tres preguntas, **lógica pura sobre datos, sin IA**:

```
¿Qué evento planeas?     boda · XV · infantil · corporativo · cumpleaños · otro
¿Cuántas personas?       30-50 · 50-100 · 100-200 · 200-300 · 300-400 · 400-600
¿Qué prefieres?          interior · jardín · nocturno · infantil · no sé
```

→ *«Estos espacios podrían funcionar para ti»* → cards → **Cotizar estos espacios**, con el
contexto ya cargado.

**Requisito duro:** capacidades numéricas correctas en los 8 y un campo `tipo_espacio`. Sin eso,
la herramienta recomienda mal, y recomendar mal es peor que no recomendar.

---

## 5. Página de espacio — la plantilla

Una sola plantilla, ocho instancias, todo desde la base:

1. **Hero** — nombre, foto/video real, capacidad, tipo, CTA *Cotizar este espacio*
2. **Datos rápidos** — capacidad, interior/exterior, montajes, accesibilidad, baños, cocina,
   estacionamiento, cobertura ante lluvia. **Solo datos confirmados**; lo que no se sepa, no se
   muestra
3. **Descripción** — el texto largo de la base
4. **Galería** — las fotos de ese espacio
5. **Eventos ideales** — enlaces a `/eventos/*`
6. **Servicios relacionados** — enlaces a `/servicios`
7. **FAQs propias** — **distintas en cada espacio**, no las mismas ocho veces
8. **Otros espacios** — *¿necesitas más capacidad? → Jardines · ¿algo más íntimo? → Quiosco*
9. **CTA** — *Cotizar {espacio}* → `/cotizar?espacio={slug}`

El `SalonOverlay` actual **se conserva** para exploración rápida desde el hub, pero deja de ser
la única forma de ver un espacio.

---

## 6. Página de tipo de evento — la plantilla

Misma idea, contenido completamente distinto por tipo:

1. **Hero** propio de ese evento
2. **Espacios recomendados** — con su capacidad
3. **Lo específico de ese evento** — en bodas: ceremonia + recepción y capilla. En infantiles:
   el Área Pony y seguridad. En corporativos: logística, montaje, estacionamiento y audio. **No
   es la misma página con palabras cambiadas** — si acaba siéndolo, esa página no debe existir
4. **Servicios que aplican**
5. **Hospedaje**, cuando aplique
6. **Galería** de ese tipo de evento
7. **FAQs propias**
8. **CTA** → `/cotizar?evento={slug}`

---

## 7. Navegación

```
Inicio · Espacios · Eventos · Servicios · Galería · Información ▾ · [COTIZAR]

Información ▾ : Cómo funciona · Preguntas frecuentes · Amenidades ·
                Ubicación · Nosotros · Contacto
```

`StaggeredMenu` **conserva su estética** y pasa de anclas a rutas reales. En móvil: menú
completo + **CTA de WhatsApp y Cotizar siempre alcanzables**.

**Breadcrumbs** en toda página interior: `Inicio › Espacios › Salón Encanto`.

**Footer** — pasa a ser mapa del sitio real: espacios, eventos, servicios, información, NAP y
redes. Es la red de enlaces internos más barata que existe.

---

## 8. Enlaces internos — deliberados, no decorativos

```
BODAS         → Capilla · Jardines · Espejos · Estancias · Servicios · Galería · Cotizar
XV AÑOS       → Encanto · Espejos · Jardines · Música/DJ · Decoración · Cotizar
INFANTILES    → Área Pony · Jardines · Alimentos · Amenidades · Cotizar
NOCTURNOS     → Eclipse · Música · Barra · Cotizar
SALÓN ENCANTO → XV años · Bodas · Decoración · Galería · Cotizar
JARDINES      → Bodas · Capilla · Estancias · Amenidades · Cotizar
CAPILLA       → Bodas · Jardines · Estancias
ESTANCIAS     → Bodas · Ubicación · Amenidades
```

Regla: **cada página lleva a la siguiente respuesta**, no a un menú.

---

## 9. Cotización y contexto comercial

`/cotizar` como página propia, **además** del modal actual, que se conserva.

Parámetros soportados:

```
/cotizar
/cotizar?espacio=salon-encanto
/cotizar?evento=boda
/cotizar?espacio=salon-encanto&evento=boda
/cotizar?evento=boda&personas=230
```

Campos: nombre · WhatsApp · correo · tipo de evento · fecha · invitados · espacio · servicios de
interés · mensaje. **Corto.** No 35 campos.

**El contexto viaja con la solicitud.** Hoy `jardines.solicitudes` ya tiene
`salon_seleccionado`, `tipo_evento`, `numero_personas` y `fecha_tentativa`: **la mayoría del
contexto cabe sin tocar la base**. Lo que no cabe —de qué página vino, qué espacios sugirió el
selector— necesita una columna nueva (ver `05-MODELO-DATOS.md`).

> **Cuidado:** `solicitud_crear` es una RPC con validación en el servidor y rate limit. Añadir un
> campo exige tocar la RPC **y** el trigger `solicitud_saneo`. Es aditivo y de bajo riesgo, pero
> es una migración: se hace con precondiciones y sin romper el formulario actual, que es la única
> vía de escritura pública que existe.

### 9.1 · Agendar visita

CTA secundario en todas las páginas de espacio y de evento. **No hace falta calendario**: es una
solicitud con `tipo = visita`. Un recinto se vende cuando se ve; la visita es la conversión real
y hoy no está en el funnel.

---

## 10. Rutas públicas vs. operativas

| | |
|---|---|
| **Indexable** | Todo lo del mapa del §2 |
| **NO indexable** | `/portal` y `/invitacion/:token` (redirects 301 que se conservan), y todo lo que vive en los otros dos repos |

Nada operativo entra en el sitemap. Los metadatos de unas y otras no se mezclan.
