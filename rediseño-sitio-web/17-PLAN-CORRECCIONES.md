# 17 · PLAN DE CORRECCIONES — la revisión del dueño sobre el preview

> **Fecha:** 2026-08-25 · **Rama:** `redesign/sitio-publico-v2` · **Origen:** revisión del dueño
> sobre `jardines-club-hipico-git-redesign-siti-4d8489`, con capturas.
>
> Este documento **manda** sobre `16-CAMBIOS-PEDIDOS.md`. Si algo se contradice, gana lo de aquí.

---

## OBJETIVO

**Que el sitio se pueda enseñar a un cliente sin tener que explicarle nada.**

Se cumple cuando las cuatro se cumplen a la vez:

1. **Nada invisible ni roto.** Cada sección enseña su título. Nada aparece en blanco mientras
   carga. Ninguna navegación deja al visitante a media página.
2. **Menos secciones, no más.** Ubicación y Contacto son una. `/nosotros` sale. El menú deja de
   parecer un índice de libro.
3. **Lo que ya funcionaba, vuelve.** Las tarjetas de salón, la distribución de la galería en
   teléfono y el bloque de cotización del sitio viejo eran mejores. Se recuperan, no se reinventan.
4. **Cotizar es una página, no una ventana.** Un formulario grande, por pasos, con dirección propia.

**Y la regla de trabajo:** entre cada paso, una auditoría. No se pasa al siguiente sin comprobar
—en el navegador, no en la cabeza— que lo anterior se ve, carga y se navega.

---

## LA CAUSA RAÍZ, QUE EXPLICA VARIAS QUEJAS A LA VEZ

`TextoQueAparece` anima con `whileInView`, que espera a que el elemento ENTRE en pantalla. Un
título de página **ya está en pantalla al cargar**: nunca «entra», así que el observador no
dispara y el texto se queda en `opacity: 0` para siempre.

Verificado sobre el HTML construido de `/galeria`:

```html
<h1 ... aria-label="Galería"><span ...><span style="opacity:0;transform:translateY(105%)">Galería</span></span></h1>
```

El texto SÍ está —Google lo lee— pero el visitante no lo ve. Por eso el dueño ve un hueco entre
el `eyebrow` y la entradilla, y por eso «hay dos o tres excepciones»: las excepciones son los
títulos a los que sí se llega scrolleando.

**Regla que sale de esto:** lo que está visible al cargar se anima AL MONTAR; `whileInView` es
solo para lo que hay que ir a buscar scrolleando. Y ninguna animación puede ser la única razón
por la que un texto es visible.

---

## LOS PASOS

Cada uno termina con su auditoría. `[ ]` pendiente · `[x]` hecho y auditado.

### PASO 1 · Los títulos vuelven a verse  ✅
- [x] `TextoQueAparece` gana entrada al montar, y deja de depender de `whileInView` para existir.
- [x] Se quita el margen negativo del viewport, que estrecha la zona de disparo sin ganar nada.
- [x] El `<h1>` de `Pagina.jsx` y los `<h2>` de portada usan la entrada correcta.
- **Auditoría:** abrir 6 rutas en el navegador y LEER el título en pantalla. Y comprobar que
  sigue en el HTML para Google.

### PASO 2 · El splash, una sola vez  ✅
- [x] Se recuerda que ya se vio (por sesión). Al volver al inicio no reaparece.
- [x] Quitar el recuadro de «próximamente» que sale al entrar: **eso nunca se pidió**; el dueño
      lo pidió para los ANUNCIOS, no como bienvenida.
- **Auditoría:** entrar, navegar a tres secciones, volver al inicio. El splash sale una vez.

### PASO 3 · El scroll al cambiar de sección  ✅
- [x] `TransicionDePagina` usa el tipo de navegación de React Router, no
      `performance.getEntriesByType('navigation')` — esa API describe cómo se cargó EL DOCUMENTO,
      no la navegación del SPA, así que no cambia nunca y la condición es falsa siempre.
- **Auditoría:** bajar al pie de una sección, cambiar por el menú, comprobar que se llega arriba.

### PASO 4 · Skeleton loaders en todo lo que carga  ✅
- [x] Un componente de esqueleto reutilizable, con la forma de lo que va a llegar.
- [x] Aplicado a: espacios, tipos de evento, servicios, amenidades, galería, avisos, preguntas.
- [x] Ninguna pantalla en blanco: hoy `if (isLoading) return null` deja el hueco vacío.
- **Auditoría:** con la red frenada, recorrer las rutas y comprobar que ninguna sale vacía.

### PASO 5 · El orden de la portada  ✅
- [x] Los espacios ANTES que los tipos de evento.
- [x] Los cuatro destacados: Espejos, Encanto, Jardines y **el área infantil** (sale Eclipse).
- [x] En «lo que no tiene un salón normal», «Recinto cerrado» → **«Área nocturna»** (a Eclipse),
      porque el que había mandaba a `/amenidades` y rompía el patrón de los otros tres.
- **Auditoría:** recorrer la portada entera y comprobar orden, enlaces y destinos.

### PASO 6 · Las tarjetas de salón, como estaban  ✅
- [x] Recuperar el diseño del sitio actual: marco dorado, «Ver detalles», el número de personas
      en pequeño. Sobre `main`, no de memoria.
- **Auditoría:** comparar contra el sitio en producción, lado a lado.

### PASO 7 · El bloque de cotización, en todas las páginas  ✅
- [x] El de «¿Listo para cotizar tu evento?» —fondo fotográfico, logo difuminado— sustituye al
      CTA de texto plano que hay hoy al pie.
- **Auditoría:** comprobarlo en seis rutas distintas y en teléfono.

### PASO 8 · La galería en teléfono
- [ ] Recuperar la distribución del sitio actual. Hoy salen minúsculas y no se ven.
- **Auditoría:** 375 px de ancho. Que se distinga lo que hay en la foto.

### PASO 9 · Menos secciones  ✅
- [x] Ubicación + Contacto = **una sola página**. Redirección de la que desaparece.
- [x] `/nosotros` se retira por ahora (decisión del dueño: la historia se venderá después, bien).
- [x] En el menú, **Avisos va al final del todo**, por debajo de Portal de clientes.
- **Auditoría:** que ningún enlace del sitio apunte a algo que ya no existe.

### PASO 10 · Los avisos que SÍ existían
- [ ] El sitio actual tenía avisos —información importante, información de servicios—. Buscarlos
      en `main` y traerlos.
- **Auditoría:** que `/avisos` no salga vacía.

### PASO 11 · Servicios, en el orden que se explica solo  ✅
- [x] Primero LOS SERVICIOS. Después «qué incluye la renta». Y al final «cómo se cobra alimentos
      y bebidas / lo que se suma aparte».
- **Auditoría:** leer la página de arriba abajo y ver si se entiende sin preguntar nada.

### PASO 12 · La capilla, con las preguntas que le faltan
- [ ] No está atada a una religión: se adapta a lo que crea la gente. Sirve también como espacio
      de eventos. Se renta sola. Añadir esas y las que falten.
- **Auditoría:** contar preguntas por tema y ver que ninguna quede coja.

### PASO 13 · Cotizar es una PÁGINA
- [ ] Formulario completo, por pasos, con dirección propia. Deja de ser una ventana que se abre.
- [ ] El botón de «Cotizar» del encabezado lleva ahí.
- **Auditoría:** completar una solicitud de principio a fin y comprobar que llega el correo.

### PASO 14 · Ortografía y detalle
- [x] «bungalows» → **«bungalos»**, como lo escribe el dueño.
- [ ] El menú se desplaza a la izquierda al abrirse: revisar por qué.

---

## LO QUE NO SE TOCA

- `main` sigue intacto. Nada se despliega a producción.
- Vero Seguros, ni de lejos.
- Sin cifras de dinero en el sitio. Explicar CÓMO se cobra, sí; cuánto, no.
- Nada inventado: ni fechas, ni capacidades, ni horarios.


---

## PENDIENTE QUE NO ES DEL SITIO — decisión del dueño

**`react/jsx-no-undef` en los tres repos.** Se descubrió que `<CtaFinal />` entró al pie SIN su
`import` y **el lint dio cero problemas**: `no-undef` no ve un símbolo usado solo como etiqueta
JSX. Lo cazó el prerender, ya con el sitio construido.

La regla que lo cierra es una línea. Pero `eslint.config.js` es **copia byte a byte en los tres
repos** y su contrato existe justo para que no diverjan, así que cambiarlo solo aquí crea la
deuda que ese contrato vigila. Se revirtió. Para aplicarlo hay que hacerlo en los tres a la vez
—web, portal y CRM— y regenerar el manifiesto: eso toca dos repositorios de producción y no
entra en el encargo del rediseño.

Validado por mutación antes de revertirlo: sin el `import`, el lint falla con
`'CtaFinal' is not defined`.

**Segundo agujero del mismo tipo:** `src/paginas.js` mapea cada ruta a un `import()` dinámico
**por cadena de texto**. Al borrar `pages/Ubicacion.jsx` el mapa siguió apuntando ahí y ni el
lint ni el `typecheck` dijeron nada — lo cazó el build. Un contrato que compruebe que cada
clave de `paginas.js` tiene su archivo, y que cada ruta de `rutas.js` tiene su clave, cerraría
esto antes. Es repo-local, así que no arrastra el problema de los archivos compartidos.
