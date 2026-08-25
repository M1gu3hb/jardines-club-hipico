# 04 · SEO — estrategia técnica y de contenido

> **2026-08-24.** El SEO de este sitio no es «poner títulos». Es arquitectura, HTML indexable,
> enlaces internos y contenido propio. Lo de fuera del sitio está en `09-SEO-LOCAL.md`.

---

## 1. El objetivo realista

Ver `03-ARQUITECTURA` §1: las búsquedas genéricas del sector las dominan los directorios
(`bodas.com.mx`, `lugaresparaeventos.mx`, `zaloneros`, `eventech`). Un recinto solo no les gana
por «salones para bodas CDMX», y perseguirlo es quemar esfuerzo.

**Lo que sí se puede ganar, y es donde va todo el trabajo:**

| Objetivo | Cómo |
|---|---|
| **Marca** | Que «Jardines Club Hípico» devuelva el sitio propio primero, no Facebook ni un directorio |
| **Local pack / Maps** | NAP consistente + ficha de Google trabajada + `/ubicacion` |
| **Long-tail de intención** | «salón para 300 personas Xochimilco» · «jardín para boda con capilla» · «salón de eventos con hospedaje CDMX» · «dónde hacer XV años Xochimilco» |
| **Comparación** | «cuánta gente cabe en…», «se puede hacer ceremonia y recepción en el mismo lugar» |
| **AI Search** | Contenido propio con datos que nadie más tiene: capacidades exactas, montajes, qué pasa si llueve, qué incluye |

**No se hace:** 80 páginas de «mejor salón para bodas en X». Eso es el contenido basura que el
encargo prohíbe (§53) y que Google trata como duplicado.

---

## 2. El problema técnico: hoy no hay HTML indexable

Vite + React + `BrowserRouter`. La respuesta inicial es un `<div id="root">` vacío. Todo el
contenido comercial —salones, capacidades, servicios— **lo pinta JavaScript después de hablar
con Supabase**.

Con una sola página apenas importa. Con 25 páginas que tienen que posicionar, es el problema
central: si alguien descarga `/espacios/salon-encanto` sin ejecutar JavaScript, **hoy no hay ni
una palabra sobre el Salón Encanto**.

### 2.1 · Opciones evaluadas

| Opción | Veredicto |
|---|---|
| **Migrar a Next.js** | ⛔ **No.** Reescribir 45 archivos, cambiar el shim, el routing, el deploy y los contratos, para un sitio de ~25 rutas estáticas. Lo prohíbe explícitamente el §75 del encargo |
| **SSR con Vike / vite-plugin-ssr** | ⛔ **No.** Servidor en runtime para contenido que cambia una vez al mes. Complejidad sin beneficio |
| **Prerender en el build (SSG)** | ✅ **SÍ.** Las rutas son finitas y conocidas: 8 espacios + 6 eventos + ~11 fijas ≈ 25 |
| **Solo `react-helmet` sin prerender** | ⛔ **No.** Arregla el `<head>` para quien ejecuta JS, pero el HTML sigue vacío |

### 2.2 · La decisión

**Prerender en tiempo de build, con hidratación normal en el cliente.**

```
npm run build
  1. vite build                        → bundle normal
  2. script de prerender:
       · lee de Supabase la lista real de espacios y tipos de evento (anon key, lectura pública)
       · levanta la app en headless para cada ruta
       · escribe dist/<ruta>/index.html con el HTML YA RENDERIZADO y su <head> propio
  3. genera sitemap.xml a partir de esa misma lista
```

Resultado: cada ruta devuelve HTML real con su `title`, su `description`, su `canonical`, su
Open Graph y su contenido. El navegador hidrata encima y **vuelve a pedir los datos a Supabase**,
así que el usuario siempre ve lo actual.

**El precio, y hay que decirlo:** el HTML servido es una foto del momento del build. Si el dueño
cambia un salón en el panel, **el HTML estático no cambia hasta el siguiente build** (el usuario
sí lo ve, porque el cliente re-consulta; el crawler no).

**Mitigación:** un *Deploy Hook* de Vercel que el panel dispare al guardar contenido, o un
rebuild programado. Se decide en la FASE 2.

**Requisito de Vercel:** `vercel.json` tiene hoy un `rewrites` que manda **todo** a
`/index.html`. Eso **anula el prerender**: hay que cambiarlo para que sirva primero el archivo
estático que exista y solo caiga al `index.html` cuando no haya ninguno. Es el cambio técnico más
delicado de esta fase y hay que probarlo ruta por ruta.

---

## 3. Metadatos por página

Cada ruta indexable necesita, y esto se comprueba en el QA:

```
<title>            único, ≤ 60 caracteres, con la marca al final
<meta description> única, 140-160 caracteres, con intención comercial
<link canonical>   absoluta, al dominio oficial
<h1>               uno solo, distinto del title
og:title / og:description / og:image / og:url / og:type
twitter:card / twitter:title / twitter:description / twitter:image
JSON-LD             según §6
BreadcrumbList
```

**Ejemplos** (borradores; el copy final se afina con el dueño):

| Ruta | title | H1 |
|---|---|---|
| `/` | Jardines Club Hípico \| Salón y jardines para eventos en Xochimilco | Todo tu evento en un solo lugar |
| `/espacios` | Salones y jardines para eventos — 8 espacios de 30 a 600 personas | Nuestros espacios |
| `/espacios/salon-encanto` | Salón Encanto — 200 a 300 invitados \| Jardines Club Hípico | Salón Encanto |
| `/espacios/capilla` | Capilla para bodas en Xochimilco \| Jardines Club Hípico | Capilla |
| `/eventos/bodas` | Bodas en Xochimilco — ceremonia y recepción en un solo lugar | Tu boda completa en un solo lugar |
| `/ubicacion` | Cómo llegar — Sta Inés, Xochimilco, CDMX \| Jardines Club Hípico | Dónde estamos |

Regla: **ninguna página comparte title, description ni H1 con otra.** Se verifica en el QA (§9).

---

## 4. Canonical y dominios

**Hoy hay un bug en producción, y es de los que cuestan:** `index.html` declara `og:url` y los
dos JSON-LD apuntando a `https://jardinesclubhipico.com/`. **Ese dominio no es del negocio** —
está registrado por un tercero, sirve una página vacía y no está a la venta.

Efecto: al compartir el sitio por WhatsApp, la vista previa apunta a un sitio ajeno y la imagen
del JSON-LD (que vive en ese dominio) **no carga**. Y a Google se le está señalando que la URL
canónica está en otro sitio.

**Se arregla en la FASE 2, antes que nada:**

- El dominio oficial se declara en una variable de entorno (`VITE_SITE_URL`), no a mano.
- **Hoy** su valor es `https://jardines-club-hipico.vercel.app`, que es lo que sirve el sitio.
- **Cuando se compre el `.mx`**, se cambia la variable y se redespliega. Un solo sitio que tocar.
- `canonical` absoluto en todas las rutas, apuntando a ese dominio.
- Los otros dos hostnames de Vercel (`...-mh-astral-systems`, `...-git-main-...`) y cualquier
  preview: **`X-Robots-Tag: noindex`**.

---

## 5. `robots.txt` y `sitemap.xml`

Hoy **no existe ninguno de los dos**, y pedir `/robots.txt` devuelve el HTML de la app por culpa
del `rewrites`.

**`robots.txt`** — permisivo para el sitio público, con el sitemap declarado. No se usa como
sustituto de `noindex`: si una URL se bloquea en robots, Google **no puede leer su `noindex`**.
Lo privado se marca con `noindex`, no se esconde en robots.

**`sitemap.xml`** — **generado en el build**, a partir de la misma lista real que usa el
prerender. Incluye solo URLs públicas indexables con estado 200. **No incluye**: portal, CRM,
rutas de staff, invitaciones, tokens, previews ni URLs con parámetros
(`/cotizar?espacio=…` **no entra**; `/cotizar` sí).

Un sitemap escrito a mano se desincroniza el primer día. Generado, no puede.

---

## 6. Datos estructurados — con criterio, sin abusar

| Página | Schema |
|---|---|
| `/` | `WebSite` + `LocalBusiness`/`EventVenue` (el actual, que está bien hecho) |
| `/espacios/*` | `WebPage` + `BreadcrumbList` + `Place` cuando sea semánticamente correcto |
| `/eventos/*` | `WebPage` + `BreadcrumbList`. **Nunca `Event`** |
| Todas las interiores | `BreadcrumbList` |

**`Event` no se usa.** Una página que habla de bodas **no es un evento programado**. `Event`
solo vale para un evento real con nombre, fecha, lugar y URL propia. Marcar `/eventos/bodas` como
`Event` es incorrecto y es el tipo de abuso que Google penaliza.

**FAQPage:** las FAQs se hacen porque son buenísimas para el usuario, para long-tail y para AI
Search. **No** porque vayan a dar rich results: Google retiró ese formato para casi todos los
sitios. Se marca con `FAQPage` solo donde sea semánticamente honesto, y **no se diseña la
estrategia contando con el resultado enriquecido**.

El `EventVenue` actual —dirección, coordenadas, teléfono, capacidad 600, `hasMap`, `sameAs`— se
**conserva y se corrige** su `url` e `image`, que apuntan al dominio ajeno.

---

## 7. Open Graph por página

Compartir es un canal real en este negocio: los enlaces viajan por WhatsApp.

- `/espacios/jardines` → foto de Jardines · «Jardines — 400 a 600 invitados»
- `/eventos/bodas` → foto real de una boda en el recinto
- `/` → la imagen de marca

**`og:image` sale de la base**, no se escribe a mano: la imagen principal del espacio o la del
tipo de evento. Requisito: ≥ 1200×630 y URL **absoluta**.

---

## 8. Imágenes

Hoy: 577 MB en `public/media`, sin formatos modernos, sin `srcset`, y **las 69 de la galería sin
título ni `alt`**.

- Nombres descriptivos, no `aMxWuH8.png`
- `alt` que **describa la imagen**, sin keyword stuffing
- `width`/`height` siempre, para no provocar CLS
- `srcset` + tamaños responsivos
- WebP/AVIF con respaldo
- `loading="lazy"` en todo menos el hero; el hero con `fetchpriority="high"`
- Los **videos del hero no se vuelven a comprimir** (regla del repo)

**Bloqueo:** los `alt` no se pueden escribir sin saber qué hay en cada foto. Ver
`08-PENDIENTES-DE-MIGUEL.md`.

---

## 9. QA de SEO — obligatorio antes de dar por terminada cualquier fase

Para **cada** ruta pública:

- [ ] Estado **200** (y el 404 devuelve 404 de verdad, no 200 con shell)
- [ ] `title` único · `description` única · **un solo `<h1>`** único
- [ ] `canonical` absoluto y correcto — **ninguna página apuntando al canonical de la Home**
- [ ] Open Graph y Twitter completos, con imagen propia
- [ ] `BreadcrumbList` presente y coherente con la ruta
- [ ] JSON-LD válido (Rich Results Test) y **sin `Event` mal usado**
- [ ] Aparece en `sitemap.xml`, y **solo** si es indexable
- [ ] **`curl` sin ejecutar JavaScript devuelve contenido útil y metadata propia** ← la prueba
      que decide si el prerender sirvió
- [ ] Enlaces internos entrantes desde al menos otra página
- [ ] Imágenes con `alt`, dimensiones y `srcset`

Y sobre el conjunto:

- [ ] `robots.txt` responde `text/plain` y declara el sitemap
- [ ] `sitemap.xml` responde `application/xml` y todas sus URLs dan 200
- [ ] Ningún hostname que no sea el oficial es indexable
- [ ] Ninguna URL con parámetros en el sitemap

---

## 10. Medición — sin esto, el rediseño no se puede evaluar

**Hoy no hay ninguna analítica.** Se rediseña sin línea base, y eso ya está asumido, pero a
partir del rediseño **sí hace falta medir** o no habrá forma de saber qué funcionó.

Mínimo: **Vercel Web Analytics** (un clic, sin cookies, sin tocar la CSP) y **Google Search
Console** con el sitemap enviado.

Eventos a instrumentar: `view_space` · `view_event_type` · `select_space` · `open_quote` ·
`submit_quote` · `whatsapp_click` · `schedule_visit` · `view_gallery` · `view_map`.
Parámetros: `space` · `event_type` · `guest_count_range` · `source_page`.
**Nada de datos personales.**

Preguntas que hay que poder responder a los tres meses: qué espacio se mira más, qué tipo de
evento genera más cotizaciones, qué página convierte mejor, cuántos hacen clic en WhatsApp,
cuántos piden visita.

> Cualquier script de terceros **exige tocar la CSP a propósito**. Nunca se abre con `*`.
