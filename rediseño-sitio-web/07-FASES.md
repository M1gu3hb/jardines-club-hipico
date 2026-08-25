# 07 · FASES DE IMPLEMENTACIÓN

> **2026-08-24.** El orden en que se hace, con su puerta al final de cada fase.
>
> **Regla que gobierna todo: no se empieza una fase con una casilla de la anterior sin marcar.**
> Si algo no se puede comprobar, se dice y se para — no se asume.

---

## Puerta común a TODAS las fases

Se corre al final de cada una. Si falla, la fase no ha terminado:

- [ ] `npm run lint` → 0
- [ ] `npm run build` → exit 0
- [ ] `npm run test:contratos` → verde
- [ ] `npm run typecheck` → **no sube de 9** (línea base de este repo)
- [ ] Todo contrato nuevo **validado mutando**: se reintroduce la regresión real, se ve fallar,
      se restaura, y se comprueba que una mutación inocua **pasa**
- [ ] Commit con mensaje que explique el *porqué*, no solo el *qué*
- [ ] **Producción intacta**: sin merge a `main`, sin deploy de producción

---

## FASE 0 · Preparar el terreno

Sin escribir una línea de la web nueva.

1. `git status` limpio. Crear y subir la rama **`redesign/sitio-publico-v2`**.
2. Conectar un **Preview Deployment** de Vercel a esa rama y comprobar que responde.
3. **Encender Vercel Web Analytics** en el proyecto de la web. Hoy no hay ninguna medición; sin
   línea base no se podrá saber si el rediseño sirvió. Es un clic y no toca la CSP.
4. Leer entera esta carpeta.

**Puerta FASE 0**
- [ ] Rama creada y subida · `main` intacto
- [ ] Preview Deployment vivo y accesible
- [ ] Analítica encendida y registrando

---

## FASE 1 · Auditoría viva y competencia

Lo que ya está auditado está en `01-AUDITORIA.md` y `02-INVENTARIO-CONTENIDO.md`. Falta:

1. **Revisar uno por uno** los sitios de referencia que citó el dueño: Casa Xipe, Club Hípico
   Santiago, FIVE Event Center, Historic Concord Exchange, Bella Sombra, más los que se
   encuentren mejores. Anotar de cada uno: qué se ve primero, cómo se descubren los espacios,
   cómo se comparan capacidades, cómo separan tipos de evento, galería, FAQs, camino a la visita,
   camino a la cotización, y **qué funciona en móvil**.
2. Escribir `10-COMPETENCIA-DETALLE.md`. **Nada de copiar diseño, textos ni estructura.**
3. **Mapear los 14 servicios reales a sus cuatro familias**, leyendo sus títulos, no a ojo.
4. Confirmar con el dueño los **8 slugs** definitivos (`02-INVENTARIO` §2.2).

**Puerta FASE 1**
- [ ] `10-COMPETENCIA-DETALLE.md` escrito, con hallazgos concretos y no generalidades
- [ ] Los 14 servicios mapeados a familia, por evidencia
- [ ] Slugs confirmados por el dueño y congelados

---

## FASE 2 · Cimientos: datos, routing y SEO técnico

La fase más importante. Todo lo demás se apoya aquí.

1. **Corregir los datos rotos** (`05-MODELO-DATOS` §2.1): capacidades de Jardines, Espejos,
   Eclipse y Estancias. **Va primero que todo lo demás.**
2. Migraciones **`sec_30`, `sec_31`, `sec_32`** — con precondiciones dentro y **`GRANT` explícito**
   en la tabla nueva (`sec_27` ya no los concede solos).
3. **Routing multipágina** en `App.jsx`, con `React.lazy` + `Suspense` por ruta.
4. **Layout base**: navegación nueva, breadcrumbs, footer-mapa del sitio.
5. **Sistema de `<head>` por ruta**: title, description, canonical, OG, Twitter, JSON-LD.
6. **Arreglar el bug del dominio ajeno**: `og:url` e `image` de los JSON-LD dejan de apuntar a
   `jardinesclubhipico.com`. `VITE_SITE_URL` como variable.
7. **Prerender en el build** + generación de `sitemap.xml` + `robots.txt`.
8. **Cambiar el `rewrites` de `vercel.json`** para que sirva primero el estático y solo caiga al
   `index.html` si no existe. **Probar ruta por ruta**: es el cambio más delicado de la fase.
9. **404 real**, no 200 con shell.

**Puerta FASE 2** — sobre el Preview, con `curl`
- [ ] Las capacidades de los 8 espacios son correctas y coherentes entre texto y números
- [ ] Las tres migraciones aplicadas; **una tabla nueva es legible por `anon`** (comprobado, no supuesto)
- [ ] `curl` de una ruta cualquiera devuelve **HTML con contenido y metadata propia**
- [ ] `/robots.txt` responde `text/plain`; `/sitemap.xml` responde `application/xml`
- [ ] Una URL inventada devuelve **404**, no 200
- [ ] Ninguna URL apunta ya a `jardinesclubhipico.com`
- [ ] El formulario de cotización **sigue funcionando** — se comprueba de punta a punta

---

## FASE 3 · Home nueva

Los 10 bloques de `03-ARQUITECTURA` §3. **El Hero se conserva intacto** (N1); solo gana CTAs y
la línea de diferenciadores.

`NoIncluyeSection` se disuelve. Lo que sale de la Home no se borra: se mueve.

**Puerta FASE 3**
- [ ] La Home carga y navega a todas las secciones nuevas
- [ ] El Hero se comporta **exactamente** como antes: los dos videos, la intro, el sonido
- [ ] Ningún componente retirado de la Home ha quedado huérfano sin destino
- [ ] Splash: solo Home, solo primera visita, respeta `reduced-motion`
- [ ] Móvil 375 y 430 revisados a mano

---

## FASE 4 · Espacios · **P0**

1. `/espacios` — hub con comparación real y filtros
2. Plantilla de espacio (`03-ARQUITECTURA` §5)
3. **Los 8 espacios**, todos desde la base
4. `SalonOverlay` se conserva para exploración rápida
5. FAQs **propias de cada espacio** — no las mismas ocho veces
6. `/cotizar?espacio={slug}` recibe el contexto

**Puerta FASE 4**
- [ ] Las 8 URLs responden 200 con contenido propio **sin ejecutar JavaScript**
- [ ] Las 8 tienen title, description, H1, canonical, OG y breadcrumbs **únicos**
- [ ] El comparador ordena y filtra bien, **y `Jardines` aparece en los filtros numéricos**
- [ ] Desde un espacio se llega a: eventos, servicios, galería, otro espacio y cotizar
- [ ] En móvil, nombre y capacidad se ven **sin hacer scroll**
- [ ] Las 8 están en el sitemap

---

## FASE 5 · Eventos · **P0 parcial**

1. `/eventos` — hub
2. Plantilla de tipo de evento
3. **`/eventos/bodas` y `/eventos/xv-anos`**, con contenido real
4. Las otras cuatro: filas creadas con **`activo = false`** — no se enlazan, no entran en el
   sitemap, la plantilla queda lista

**Puerta FASE 5**
- [ ] Bodas y XV años tienen **≥ 350 palabras propias cada una y son realmente distintas**
- [ ] Cada una con ≥ 4 fotos reales de ese tipo de evento
- [ ] FAQs propias, no compartidas
- [ ] `/cotizar?evento={slug}` recibe el contexto
- [ ] Las inactivas **no aparecen** en el sitemap ni en ningún enlace
- [ ] SEO completo en las dos activas

---

## FASE 6 · Servicios, amenidades y galería

1. **`/servicios`: UNA página**, cuatro familias (`02-INVENTARIO` §4). **No las cinco
   subpáginas** — no hay contenido y lo prohíbe el §55 del encargo
2. `/amenidades` con narrativa desde la experiencia del invitado, no una lista de checks
3. `/galeria` con los 69 medios. **Los filtros solo si las fotos ya están etiquetadas**
4. Optimización de imágenes: `alt`, dimensiones, `srcset`, formatos modernos

**Puerta FASE 6**
- [ ] `/servicios` cubre los 14 servicios agrupados, con el mensaje de «se arma a la medida»
- [ ] `/amenidades` tiene narrativa, no un listado
- [ ] `/galeria` carga sin castigar el LCP
- [ ] Si hay filtros, salen **de datos reales**; si no hay etiquetas, **no hay filtros**
- [ ] Todas las imágenes con `alt` y dimensiones

---

## FASE 7 · Información

`/como-funciona` · `/preguntas-frecuentes` · `/ubicacion` · `/contacto`

`/nosotros` **solo si el dueño aporta contenido real** (`08-PENDIENTES`). No se inventa historia
corporativa.

Las 9 FAQs actuales se **redistribuyen** a su página y se agrupan en el índice.

**Puerta FASE 7**
- [ ] Ninguna de las 9 FAQs originales se ha perdido
- [ ] `/ubicacion` con dirección, mapa, referencias verificadas y CTA de visita
- [ ] `/contacto` con WhatsApp, teléfono, correo, mapa y formulario
- [ ] `/nosotros` publicada **solo** con contenido real, o no publicada

---

## FASE 8 · Conversión

1. `/cotizar` como página, conservando el modal
2. **Encuentra tu espacio** — lógica sobre datos reales
3. **Agendar visita** como CTA secundario
4. `sec_33`: `origen` y `contexto` en `solicitudes` + RPC y trigger
5. Analítica: los 9 eventos de `04-SEO` §10

**Puerta FASE 8**
- [ ] `/cotizar` funciona con y sin parámetros
- [ ] El contexto llega a la solicitud y **se ve en el CRM**
- [ ] El selector **no recomienda ningún espacio que no cumpla la capacidad pedida**
- [ ] **El formulario sigue funcionando de punta a punta** — es lo que da de comer
- [ ] Los eventos de analítica se registran

---

## FASE 9 · SEO local

No es código. Es `09-SEO-LOCAL.md`: auditoría de la ficha de Google, NAP, directorios con
teléfonos viejos y plan de corrección. **Nada fuera del código se cambia sin autorización.**

**Puerta FASE 9**
- [ ] Informe escrito con hallazgos y recomendaciones
- [ ] Lista de directorios con datos incorrectos
- [ ] Search Console configurada y sitemap enviado

---

## FASE 10 · QA, rendimiento y accesibilidad

**No se termina porque compile.** Se abre cada ruta, de verdad.

- **Navegación**: cada ruta, enlaces internos, back/forward, 404, parámetros
- **SEO**: la checklist entera de `04-SEO` §9, ruta por ruta
- **Responsive**: las 9 resoluciones de `06-DISENO` §6
- **Rendimiento**: LCP, CLS, INP en móvil con conexión lenta
- **Accesibilidad**: contraste, teclado, foco, labels, headings, `reduced-motion`
- **Formularios**: modal y página, con y sin parámetros

**Puerta FASE 10**
- [ ] Las ~25 rutas abiertas a mano, una por una
- [ ] Ninguna comparte title, description, H1 ni canonical con otra
- [ ] Sin overflow horizontal en ninguna de las 9 resoluciones
- [ ] LCP < 2.5 s · CLS < 0.1 · INP < 200 ms en móvil
- [ ] Recorrido completo con teclado, sin ratón
- [ ] El formulario funciona en las nueve resoluciones

---

## Entregable final

Cuando la FASE 10 cierre:

**Rama** · **Commits** · **URL del Preview** · **Sitemap final** · **Qué SEO se implementó** ·
**Qué estrategia de prerender se eligió y por qué** · **Qué espacios existen** · **Qué eventos
existen** · **Cómo quedaron agrupados los servicios** · **Cómo viaja el contexto al formulario** ·
**Qué eventos de analítica se crearon** · **Qué se resolvió en responsive** · **Resultado de
rendimiento** · **Qué se detectó en SEO local** · **Qué datos reales siguen faltando** ·
y la confirmación explícita:

> **PRODUCCIÓN NO FUE MODIFICADA.**
