# 16 · CAMBIOS PEDIDOS POR EL DUEÑO SOBRE EL REDISEÑO

> **2026-08-25, viendo la previsualización.** Esto NO son ideas: son correcciones a lo que ya
> construí. Se escriben aquí antes de tocar nada porque la sesión va larga y esto no se puede
> perder.
>
> Orden = prioridad que él le dio, no la mía.

---

## 1. ✅ EL MENÚ DE SIEMPRE — hecho

> *«Le quitaste la animación que tenía, la de antes, que se iba de derecha a izquierda… ese
> está muy chingón. El que está ahorita quítalo, por favor, quítalo.»*

Tenía razón y estaba equivocado yo. `StaggeredMenu` vuelve a ser la navegación del sitio,
alimentado desde `rutas.js`. La barra horizontal se retiró.

- El botón **Cotizar** y el **interruptor de sonido** viven fuera del menú, en la cabecera.
- **Clases de baile** añadido, justo antes de **Portal de clientes**.
- `/clases-de-baile` lleva a un «próximamente» honesto: hay profesores y logística, **faltan
  horarios y precios** y no se inventan.

---

## 2. ⛔ EL SCROLL NO VUELVE ARRIBA AL CAMBIAR DE SECCIÓN

> *«Si estoy en una sección hasta abajo y cambio de sección, me deja hasta abajo. Tiene que
> regresar hasta arriba, de forma suave, que parezca que continúa.»*

**Es un fallo, no una preferencia.** Con React Router la posición de scroll se conserva al
navegar, así que quien cambia de página desde el pie aterriza a media página nueva sin
entender qué pasó.

Hace falta: al cambiar de ruta, subir arriba **con transición**, no de golpe. Y respetar
`prefers-reduced-motion`.

---

## 3. ⛔ LAS PREGUNTAS FRECUENTES, TODAS ABIERTAS

> *«Se siente muy invasivo y muchísimo texto. Que se pueda abrir cada una. Están divididas por
> secciones, eso está bien.»*

Yo las abrí todas a propósito, por SEO —el texto tiene que estar en el HTML para que Google lo
lea—. **Se puede tener las dos cosas:** el contenido va en el HTML y el acordeón solo lo
colapsa visualmente. Los grupos por tema se quedan.

---

## 4. ⛔ `/nosotros` NO DEBE DECIR QUE NO SE SABE LA FECHA

> *«Vi que le pusiste que no hay fecha clara de inicio y que ni el dueño lo sabe. No, no
> pongas eso. Piensa en la información.»*

Justo. Callar un dato es correcto; **anunciar que no lo sabes** es otra cosa, y en la página que
cuenta la historia del negocio suena a que nadie se acuerda de su propio origen. Se quita el
párrafo. La fecha sigue sin publicarse, simplemente no se menciona su ausencia.

---

## 5. ⛔ LOS AVISOS VAN HASTA ABAJO DEL TODO

> *«¿Por qué lo incluyes como una sección arriba? Ponlo hasta abajo de todas las secciones.»*

Y además: *«no sé qué les hiciste, ya no veo avisos»*. Hay que comprobar qué pasó con el cartel
de «próximamente» que existía antes (`ProximamenteCartel` / `ProximamenteModal`, alimentados por
`config_sitio.proximamente_*`). **La tabla `anuncios` está vacía a propósito**, pero el aviso
viejo sí tenía contenido y no debería haber desaparecido.

---

## 6. ⛔ FALTAN IMÁGENES Y SOBRA TEXTO PLANO

> *«Amenidades y servicios tampoco tienen imágenes… le falta mucha información, imágenes,
> dinamismo. A lo de nosotros, a preguntas… métele imágenes, usa imágenes de la galería. Tú
> analiza las imágenes de la galería para ver cuál conviene poner.»*

- Las fichas de servicios y amenidades **sí tienen fotos en la base** y no se estaban usando:
  la columna es `imagenes_url`, no `imagenes`, y leerla mal devolvía `undefined` sin ningún
  error. Corregido en `fotosDe()`.
- `/nosotros`, `/preguntas-frecuentes`, `/como-funciona` y `/ubicacion` son **paredes de
  texto**. Necesitan imágenes de la galería, elegidas mirándolas.

---

## 7. ⛔ SE SIENTE PLANA — FALTAN ANIMACIONES Y CARÁCTER

> *«Se siente muy plana, muy burda, muy sencilla. Métele animaciones, dinamismo, vida. Que el
> texto vaya apareciendo mientras haces scroll. Métele algo que construyas tú, un dibujo, una
> animación. Que cada sección sea única, se vea completa, con vida.»*

Y explícitamente: **usar los componentes de React Bits** (`reactbits.dev`), su documentación y
sus animaciones.

> **Nota técnica que hay que respetar al hacerlo:** la CSP del sitio es
> `script-src 'self'` y `connect-src 'self'` + Supabase. React Bits se usa **copiando el
> componente al repo**, que es su forma de distribución, así que encaja sin abrir la CSP.
> `gsap` y `framer-motion` ya están instalados.
>
> Y todo lo que se anime tiene que respetar `prefers-reduced-motion`, y **animar solo
> `transform` y `opacity`** para no provocar recálculos de diseño en cada fotograma.

---

## 8. ✅ SERVICIOS Y AMENIDADES, DOS INVITACIONES — hecho

> *«Pon algo tipo: tenemos muchos servicios, ver todos; muchas amenidades, ver todas. Ya no
> como ahorita, todas una encima de otra, no tienen el protagonismo que deberían.»*

- La portada enseña **dos bloques con el número real** y manda a cada página.
- `/servicios` y `/amenidades` rediseñadas: lo que tiene **3 fotos o más** abre en pieza ancha
  con su galería; el resto va en rejilla. **La jerarquía sale de cuántas fotos tiene cada uno**,
  no de una lista de destacados que alguien tenga que mantener.
- **Y «amenidad» pasa a significar lo que él dice que significa:** las atracciones. Yo las había
  mandado a `/servicios` por corrección semántica. Su vocabulario es el que oye el cliente.

---

## 9. ⛔ LA GALERÍA EN LA PORTADA, RECORTADA CON DEGRADADO

> *«Recórtala a la mitad, y la mitad de abajo que se vea con blur, como que invita a continuar.
> Agarra las principales, unas diez. Y al entrar, la galería con una descripción de qué es, los
> espacios, etcétera, y que los guíe al formulario.»*

---

## 10. ⛔ DESDE EL FORMULARIO, INVITAR A VER SERVICIOS Y AMENIDADES

> *«Si no han visto, invítalos a ver los servicios y amenidades para después regresar al
> formulario y continuarlo.»*

Ojo: **sin perder lo que ya llenaron.** Mandar a alguien fuera de un formulario a medias y que
al volver esté vacío es peor que no invitarlo.
