# 01 · AUDITORÍA DEL SITIO ACTUAL

> **2026-08-24.** Todo lo de aquí está medido contra el repo `jardines-club-hipico` en
> `ad91904` y contra el proyecto de Supabase en producción. Nada está recordado.

---

## 1. Punto de partida

| | |
|---|---|
| Repo | `M1gu3hb/jardines-club-hipico` · `main` = `ad91904` |
| Vercel | proyecto `jardines-club-hipico` · `jardines-club-hipico.vercel.app` |
| Stack | Vite + React 19 + Tailwind + Framer Motion + shadcn/ui · Node 24 |
| Router | `react-router-dom`, `BrowserRouter` — **SPA pura, sin SSR ni prerender** |
| Bundle público | **775 kB** (era 1 098 kB antes de la separación) |
| Puertas | lint 0 · build exit 0 · contratos 60/60 · typecheck **9** (línea base) |
| Dominio propio | **ninguno todavía.** El `.mx` se compra al final |

El repo acaba de salir de la separación en tres aplicaciones. **Ya no contiene** el panel de
administración, el portal del cliente, la vista de meseros ni las rutas por token: eso vive en
`JCH-CRM` y `JCH-portal-cliente`. `api/` tiene exactamente `solicitud.js` y `_lib/`.

---

## 2. Arquitectura actual — una sola página

```
main.jsx → App.jsx
  ErrorBoundary → QueryClientProvider → AuthProvider → BrowserRouter
    /            → Layout → Home.jsx      ← TODO el sitio vive aquí
    /portal      → redirect 301 al portal (vercel.json)
    /invitacion/:token → redirect 301
    *            → PageNotFound
```

**Hay exactamente una ruta pública.** Todo el contenido comercial es una sucesión de secciones
dentro de `Home.jsx`, navegadas por scroll con anclas. Google ve **una sola URL**.

`Home.jsx` importa 17 componentes de sección: `SplashScreen`, `StaggeredMenu`, `SoundToggle`,
`soundSystem`, `HeroSection`, `SalonesSection`, `ServiciosAmenidades`, `GaleriaSection`,
`CtaCotizacion`, `FormularioModal`, `ContactoSection`, `NoIncluyeSection`,
`ScrollAnimationSection`, `ProximamenteModal`, `Confianza`, `ComoFunciona`, `FaqSection`.

---

## 3. Inventario de componentes — qué hace cada uno y a dónde debería ir

29 componentes en `src/components/` (raíz) + `ui/`. Ninguno se borra; todos tienen destino.

| Componente | Qué hace hoy | Destino propuesto |
|---|---|---|
| `SplashScreen` | Intro de carga | **Auditar** — ver §7 |
| `StaggeredMenu` (+ `.css`) | Menú de anclas de una página | **Reescribir a navegación multipágina.** Conserva su estética |
| `SoundToggle` · `soundSystem` | Sonido de interacción | Global, se conserva |
| `HeroSection` | Hero con **dos videos de fondo** | **INTOCABLE** (regla N1). Se le añaden CTAs y copy |
| `SalonesSection` | Grid de salones desde Supabase | Base de `/espacios` (hub) |
| `SalonOverlay` · `SalonGallery` | Overlay de detalle de un salón | Se **conserva** como UX rápida, pero cada espacio gana además URL propia |
| `ServiciosAmenidades` · `ServiceAmenityCard` | Servicios y amenidades mezclados | Se **parte**: `/servicios` y `/amenidades` |
| `GaleriaSection` | Galería de 69 medios | Resumen en Home + base de `/galeria` |
| `MediaCarrusel` · `MediaViewer` | Visor de imagen/video | Reutilizables en todas las páginas |
| `CtaCotizacion` | CTA a cotizar | Se reutiliza como bloque de cierre en todas las páginas |
| `FormularioModal` | Formulario por pasos → RPC + `/api/solicitud` | **Se conserva el modal** y además nace `/cotizar` como página |
| `ContactoSection` | Datos de contacto | Base de `/contacto` y de `/ubicacion` |
| `NoIncluyeSection` | Bloque «no incluye» al final | **Se disuelve** y se redistribuye como contexto positivo en `/servicios` |
| `ScrollAnimationSection` · `ScrollAnimationCaptions` · `ScrollHint` | Narrativa con scroll | Se conserva en Home; candidato a `/nosotros` |
| `ProximamenteModal` · `ProximamenteCartel` | Cartel «próximamente» conmutable | Se conserva tal cual |
| `Confianza` | Rating + estadísticas + reseñas | Se conserva. **Lee un JSON local, no Supabase** (§5) |
| `ComoFunciona` | Los 3 pasos | Resumen en Home + página `/como-funciona` |
| `FaqSection` | **9 preguntas hardcodeadas** | Se **redistribuyen** por página + índice en `/preguntas-frecuentes` |
| `BarraDulces` | Sección de barra de dulces | A `/servicios/barra-de-dulces` o dentro de servicios |
| `AnimatedItem` · `ErrorBoundary` | Armazón | Se conservan |

---

## 4. Datos — qué hay en Supabase

Consultado el 2026-08-24. El sitio lee por el shim `src/api/base44Client.js`; **no hay fallback**:
si Supabase no responde, el sitio se renderiza vacío (J-03, abierto y aceptado).

### 4.1 · Los 8 espacios existen y están todos activos

| Orden | Nombre en la base | Capacidad (texto) | min | max | Imgs | Caract. | Desc. larga |
|---|---|---|---|---|---|---|---|
| 1 | Salón de los Espejos | 300-400 personas | **150** ⚠️ | 400 | 22 | 15 | 784 |
| 2 | Salón Encanto | 200-300 personas | 200 | 300 | 22 | 7 | 1019 |
| 3 | Espacio Nocturno (Eclipse) | 80-120 personas | **50** ⚠️ | 120 | 11 | 12 | 860 |
| 4 | Jardines | 400-600 personas | **null** ⛔ | **null** ⛔ | 28 | 9 | 982 |
| 5 | Área Infantil Pony | 100-150 personas | 100 | 150 | 9 | 7 | 823 |
| 6 | Capilla | 50-150 personas | 50 | 150 | 7 | 8 | 825 |
| 7 | Quiosco | 30-50 personas | 30 | 50 | 8 | 9 | 897 |
| 8 | Estancias (Bungalos) | **null** | **null** | **null** | 10 | 7 | 1092 |

**Tres problemas de datos, y son bloqueantes para el comparador:**

- ⛔ **`Jardines` no tiene `capacidad_min` ni `capacidad_max`.** Es el espacio más grande y el
  más importante para bodas, y **quedaría fuera de cualquier filtro numérico**.
- ⚠️ **`Salón de los Espejos` se contradice**: el texto dice «300-400» y `capacidad_min` es
  **150**. Lo mismo en Eclipse: texto «80-120», mínimo **50**. Hay que decidir cuál es el dato
  verdadero antes de construir nada que compare.
- **`Estancias (Bungalos)` no tiene capacidad de ningún tipo**, y es correcto: es hospedaje, no
  un espacio de evento. Pero el modelo actual no distingue *capacidad de evento* de *capacidad
  de hospedaje*. Falta un campo (ver `05-MODELO-DATOS.md`).

Los nombres de la base y los que usa el dueño no coinciden del todo: *Eclipse* está como
**«Espacio Nocturno (Eclipse)»** y *Estancias* como **«Estancias (Bungalos)»**. Los `slug` hay
que fijarlos a mano, no derivarlos del nombre.

### 4.2 · El resto del contenido

| Tabla | Filas | Activas | Long. media de descripción |
|---|---|---|---|
| `servicios` | 14 | 14 | **120 caracteres** |
| `amenidades` | 15 | 15 | **105 caracteres** |
| `servicios_extra` | 11 | 11 | **0 — vacía** |
| `alimentos` | 3 | 3 | **0 — vacía** |
| `galeria` | 69 | — | **0 con título** |
| `resenas` | **0** | 0 | — |

Esto está desarrollado en `02-INVENTARIO-CONTENIDO.md`. Es el documento que decide qué páginas
pueden nacer.

---

## 5. Reseñas — no vienen de Supabase

`jardines.resenas` está **vacía**. `Confianza.jsx` importa `src/data/resenas.json`, un archivo
local, y es el **único** JSON que el sitio lee en runtime.

Consecuencia para el rediseño: la regla «si el dato viene de Supabase, úsalo» **no aplica aquí**,
porque no viene. Hay dos caminos y hay que elegir: (a) dejar el JSON como está y documentarlo, o
(b) cargar las reseñas reales al panel para que la sección se alimente de la base. La (b) es
mejor, pero **exige que el dueño apruebe reseñas reales** — inventarlas está prohibido (N3).

---

## 6. SEO actual — el punto más débil

Verificado sobre el `index.html` del repo y sobre la respuesta de producción.

**Lo que hay:**
- Un solo `<title>`, una sola `description`, un solo bloque Open Graph.
- Dos bloques JSON-LD: `WebSite` y `EventVenue`, este último completo y correcto — dirección,
  coordenadas, teléfono `+525523118153`, capacidad máxima 600, `hasMap`, `sameAs` a Facebook.
- Los datos de contacto **coinciden** con `src/config/negocio.js` y con `config_sitio` en la base.
  Hay un contrato que impide que diverjan.

**Lo que falta o está mal:**

1. **No existe `robots.txt` ni `sitemap.xml`.** Verificado.
2. **El `rewrites` de `vercel.json` manda todo a `index.html`**, así que **cualquier URL
   inventada devuelve HTTP 200 con el shell de la app**. Pedir `/robots.txt` hoy devuelve HTML.
   Con una sola ruta apenas se nota; con 25 rutas es una fábrica de soft-404.
3. **`og:url` y los dos JSON-LD apuntan a `https://jardinesclubhipico.com/`**, un dominio que
   **no es del negocio** (verificado: no está disponible para compra, y sirve una página vacía).
   Al compartir el sitio por WhatsApp la vista previa se resuelve contra un sitio ajeno y la
   imagen del JSON-LD, que vive en ese dominio, **no carga**.
4. **No hay `<link rel="canonical">`** en ningún sitio.
5. **Tres hostnames sirven lo mismo**: `jardines-club-hipico.vercel.app`,
   `...-mh-astral-systems.vercel.app` y `...-git-main-...` (este sí protegido por Vercel Auth).
6. **Todo el contenido comercial se renderiza con JavaScript.** No hay HTML indexable en la
   respuesta inicial.
7. **No hay analítica.** Vercel Web Analytics está desactivado; no hay GA4. No existe línea base
   de tráfico contra la que medir el rediseño.

---

## 7. Splash screen — auditar, no borrar automáticamente

`SplashScreen` se muestra en la Home. Hoy tiene sentido: **solo existe la Home**. Mañana no:
alguien que busque «capilla para boda Xochimilco» va a aterrizar directo en `/espacios/capilla`,
y una intro obligatoria antes de ver la información que vino a buscar es fricción pura, y además
castiga el LCP justo en las páginas que tienen que posicionar.

**Recomendación (decisión del dueño):** conservarlo **solo en la Home**, **solo en primera
visita** de la sesión, con duración reducida y respetando `prefers-reduced-motion`. En cualquier
otra ruta, no se monta. No se borra.

---

## 8. Rendimiento, accesibilidad y responsive — estado

- **Bundle 775 kB** en un solo archivo. Con 25 rutas hay que partirlo por ruta (`React.lazy` +
  `Suspense`), o la primera carga empeora en vez de mejorar.
- **Medios: 577 MB en `public/media`**, versionados en git. El bucket `sitio` de Storage tiene
  **0 objetos**: nunca se ha subido nada por el CMS. Los medios son la única copia y no están
  optimizados a formatos modernos.
- **Videos del hero**: ya comprimidos. **No se vuelven a comprimir** (regla del repo).
- **CSP en modo enforcing** con `default-src 'self'`, HSTS, `X-Frame-Options: DENY` y las demás
  cabeceras. Conserva `'unsafe-inline'` en `script-src` y `style-src` — deuda conocida.
  Cualquier recurso externo nuevo (una fuente, un mapa embebido, un script de analítica)
  **exige tocar la CSP a propósito**, nunca abrirla con `*`.
- **Accesibilidad**: sin auditar. Entra en la FASE 10.

---

## 9. Lo que este rediseño NO toca

- El portal del cliente y el CRM (repos aparte).
- El backend: `jardines.solicitudes`, la RPC `solicitud_crear`, `api/solicitud.js` y el correo
  siguen igual. Solo se **añade contexto** al payload (ver `03-ARQUITECTURA.md` §9).
- Los datos de eventos, usuarios y credenciales.
- Vero Seguros.
- El Hero (N1).
