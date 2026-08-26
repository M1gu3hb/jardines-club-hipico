# Patrón de imágenes — para sitios donde las fotos son el producto

> Escrito el 2026-08-25 a partir del caso real de Jardines Club Hípico, y pensado para
> reutilizarse. El siguiente proyecto es la web de un fotógrafo: ahí esto no es una mejora,
> es el requisito.

---

## El objetivo, en una frase

**Que nunca parezca que las fotos están cargando.** Ni que se pintan a franjas, ni que saltan
de borrosas a nítidas, ni que una se queda muerta con el icono roto.

Todo lo de abajo existe para eso y para nada más.

---

## 1 · Mide antes de arreglar

En Jardines, la intuición decía «las imágenes pesan mucho». El recuento dijo algo más útil:

| | |
|---|---|
| Archivos de imagen | 449 |
| Peso total | 257 MB |
| Media | 587 kB |
| **Mediana de ancho** | **576 px** |
| Más anchas de 1600 px | **86 (19 %)** |
| La mayor | 4608 × 3072 |

**El problema no estaba repartido: 86 archivos de 449 eran casi todo el peso.** Fotos salidas
de la cámara, sin tocar, servidas tal cual y dibujadas a 300-500 px.

Medir cambió la solución. Si el peso hubiera estado repartido, habría tocado reprocesar todo;
siendo el 19 %, bastaba con dejar que cada hueco pidiera el tamaño que necesita.

**Cómo medirlo** (Node, sin dependencias): recorrer la carpeta de medios sumando `statSync`
por extensión, y leer ancho y alto de las cabeceras de PNG/JPEG/WebP. En este repo eso ya está
hecho en `scripts/medidas-medios.mjs`, y su salida (`src/data/medidas-medios.json`) se usa
también en tiempo de ejecución.

---

## 2 · Quién redimensiona: las tres opciones

| | A favor | En contra |
|---|---|---|
| **Variantes pre-generadas** (`sharp`, una vez, versionadas) | Control total, cero coste por petición, portable, **y la cabecera de caché es tuya** | ~4 archivos por imagen; en 449 son 1 816 y 99 MB en el repositorio |
| **Optimizador del borde** (`/_vercel/image`) | Sin archivos nuevos, sin tiempo de build, negocia AVIF/WebP con el navegador | **Sirve `max-age=0`: hay que revalidar TODAS las fotos en cada visita.** Y ata al proveedor |
| **CDN de imágenes** (imgix, Cloudinary) | Lo mismo, más transformaciones | Dominio de terceros: hay que abrir la CSP |

> ### ⚠️ AQUÍ SE ELIGIÓ PRIMERO EL BORDE, Y FUE UN ERROR
>
> Este documento recomendaba el optimizador del borde. **Se desplegó y el sitio quedó peor**,
> hasta el punto de que el dueño lo dijo sin que hiciera falta preguntarle. La recomendación
> está corregida abajo; se deja escrito el error porque el motivo es lo más útil de la página.

### Por qué el borde falló, medido

Con la caché del borde **ya caliente** (552 variantes pre-calentadas, 0 fallos), la galería de
69 fotos daba esto:

| | |
|---|---|
| Tamaño por imagen | 8-19 kB |
| Tiempo de **descarga** | **0 ms** |
| TTFB | 110-920 ms |
| **Bloqueado en cola** | **media 1 780 ms, máximo 4 725 ms** |

La primera explicación que escribí fue «el estático responde en 30 ms y el optimizador en
110-920». **Era falsa, y medirla la desmintió**: petición a petición hay paridad (81 · 90 ·
130 ms el estático contra 74 · 95 · 100 ms el optimizador).

**La causa real es la cacheabilidad.** El optimizador sirve cada variante con
`Cache-Control: max-age=0, must-revalidate`. Un `304 Not Modified` de cero bytes cuesta entre
350 y 530 ms. Por 69 fotos, **en cada visita** y en cada vuelta desde el visor. Un archivo
propio lleva la cabecera que uno quiera:

```json
{ "source": "/v/(.*)", "headers": [
  { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" } ] }
```

Resultado del cambio, misma galería en producción:

| | Antes (borde) | Después (estáticas) |
|---|---|---|
| En cola, primera visita | 1 780 ms | **734 ms** |
| Total por imagen | 2 087 ms | **1 089 ms** |
| **Segunda visita** | las 69 revalidando | **69 de 69 desde caché · 21 ms** |

Esa última fila es el premio, y **no tiene nada que ver con el tamaño de los archivos**.

### La recomendación corregida

**Para un sitio de fotografía: pre-genera y sé dueño de tu caché.** Es lo que hacen los sitios
donde la foto es el producto. El coste —archivos en el repositorio— se paga una vez; la
revalidación se paga en cada visita de cada visitante.

Dos condiciones que hacen que funcione:

1. **No regenerar en cada build.** El script salta lo que ya existe. Reprocesar 449 imágenes en
   cada despliegue son minutos para producir exactamente lo mismo.
2. **Un manifiesto de qué anchos existen** (`src/data/variantes.json`, 20 kB). El navegador no
   puede mirar el disco: sin él, `srcset` ofrecería direcciones que quizá no existen, o sea
   404, o sea imágenes rotas.

**La trampa que trae la caché larga:** con `immutable` a un año y un generador que salta lo
existente, **cambiar una foto sin cambiarle el nombre no surte efecto**. Nombre nuevo, o borrar
sus variantes a mano. Escríbelo donde se lea, porque muerde meses después.

**Por eso todo lo específico del proveedor vive en UNA función.** En `src/lib/imagen.js`:

```js
function ADAPTADOR(url, ancho, calidad) {
  return `/_vercel/image?url=${encodeURIComponent(url)}&w=${ancho}&q=${calidad}`;
}
```

Cambiar de Vercel a otro CDN, o a variantes generadas en el build, es reescribir esa función.
El resto del sitio no sabe quién redimensiona.

---

## 3 · `srcset` recortado al tamaño de origen

Esto es lo que casi nadie hace y **es lo que más se nota cuando falta**.

Con la mediana en 576 px, ofrecer siempre `[320, 640, 960, 1280, 1920, 2560]` significa que a
una imagen de 576 px se le puede pedir 1920. El optimizador **la agranda**: el resultado pesa
más que el original y se ve peor.

Con las medidas reales a mano, la lista se recorta por imagen:

```js
export function anchosPara(url) {
  const origen = medidasDe(url)?.ancho;
  if (!origen) return ANCHOS;
  const utiles = ANCHOS.filter((a) => a <= origen);
  return utiles.length > 0 ? utiles : [ANCHOS[0]];
}
```

**Y `sizes` no es opcional.** Sin él, el navegador supone que la imagen ocupará el ancho
completo de la ventana y elige la variante más grande de `srcset` — tirando por tierra media
optimización. Cada sitio de uso debe declarar el hueco real:

```jsx
<Foto sizes="(min-width: 1280px) 25vw, (min-width: 640px) 33vw, 100vw" … />
```

---

## 4 · `decode()`, no `load`

Un JPEG progresivo se dibuja en pasadas: primero borroso, luego nítido. Y aunque no lo sea, el
navegador puede pintar la imagen a franjas conforme llegan los bytes.

El evento `load` llega cuando **terminó de descargar** — pero el pintado ya empezó. Por eso se
ve «cargando».

`img.decode()` resuelve cuando el archivo está descargado **y descomprimido en memoria**,
listo para dibujarse de una vez:

```jsx
const alDescargar = async () => {
  try { await imgRef.current?.decode(); } catch { /* desmontado a mitad */ }
  setEstado('lista');
};
// …
<img onLoad={alDescargar} className={estado === 'lista' ? 'opacity-100' : 'opacity-0'} />
```

Manteniéndola invisible hasta ese momento, **nunca se la ve pintarse**: aparece entera.

### ⚠️ Y aquí hay una trampa que deja fotos invisibles PARA SIEMPRE

El fragmento de arriba, tal cual, tiene un fallo grave. **`onLoad` no se dispara si la imagen
ya estaba completa cuando React enganchó el manejador** — y eso pasa constantemente con las que
vienen de la caché del navegador: se resuelven en el mismo instante en que se les pone el `src`,
antes de que el componente termine de montarse.

El evento se pierde, el estado se queda en «cargando» y la foto permanece en `opacity: 0`:
descargada, decodificada, con sus píxeles en memoria, y **para siempre invisible**.

Medido en producción sobre esta galería: **7 de 69 fotos** con la caché caliente, y **60 de 69**
en el peor caso. Ninguna petición había fallado: las 69 acabaron bien. Es decir, buena parte de
«hay fotos que no cargan» **nunca fue la red**. Y es irónico —cuanto mejor va la caché, más
fotos se pierden el evento—, lo que explica por qué el fallo aparece justo después de optimizar.

El arreglo no espera al evento: **pregunta por el estado.**

```jsx
useEffect(() => {
  const el = imgRef.current;
  if (el && el.complete && el.naturalWidth > 0) alDescargar();
}, [src, intento, alDescargar]);
```

`complete` con `naturalWidth > 0` significa que los píxeles ya están; que además llegara el
aviso es indiferente. `naturalWidth` importa porque `complete` también es `true` cuando la
imagen falló.

**La regla general, que vale para todo lo demás de esta página:** si algo falla, tiene que
fallar hacia «se ve», no hacia «no se ve». Esperar un evento es confiar en que llegue.

---

## 5 · El marcador es NEUTRO, nunca una miniatura borrosa

Aquí hay una decisión que se toma mal por costumbre.

El patrón habitual —LQIP, «blur-up»— enseña una miniatura de 20 px estirada y borrosa, y la
sustituye por la buena al llegar. **Eso ES el salto de calidad**: la foto se ve mal y luego
bien, y el ojo lo lee como «esto todavía no está listo».

Si el objetivo es que nunca parezca que carga, el marcador tiene que ser **neutro** — un
rectángulo del color de la superficie, con un pulso suave. No promete una foto concreta, no
compite con ella y no hay sustitución que ver.

*(El blur-up sigue siendo buena idea cuando lo que importa es la percepción de velocidad por
encima de la de calidad — un feed social, por ejemplo. Para un portafolio de fotografía es
justo lo contrario.)*

---

## 6 · Reintento, porque el navegador no reintenta

Una petición de imagen que muere a medias en una red móvil **queda muerta**. El navegador no
lo reintenta solo, y la imagen no vuelve hasta recargar la página entera.

```js
const alFallar = () => {
  if (intento < 2) {
    setTimeout(() => setIntento((n) => n + 1), 700 * (intento + 1));
    return;
  }
  setEstado('rota');
};
// El `key={intento}` fuerza un <img> nuevo, y el sufijo `?r=N` se salta la caché fallida.
```

Espera creciente: si la red está saturada, insistir de inmediato solo la satura más. Y tras
agotar los reintentos, **un hueco discreto, jamás el icono partido del navegador**.

---

## 7 · Prioridad: lo que arregla «unas cargan y otras no»

Sesenta y nueve imágenes pidiéndose a la vez se pelean por el mismo ancho de banda: ninguna
termina pronto y algunas mueren.

- **Lo visible sin desplazarse** (hero, primera fila): `loading="eager"`,
  `fetchpriority="high"`, `decoding="sync"`.
- **Todo lo demás**: `loading="lazy"`, `decoding="async"`.

En este sitio son las 8 primeras de la galería y las 3 primeras del asomo de la portada.

---

## 8 · `width` y `height` siempre

Sin ellos la imagen ocupa cero alto hasta que llega, y al llegar empuja todo lo de abajo. En
una galería es la página entera moviéndose mientras alguien intenta tocar una foto.

Salen de las medidas reales, no de números tecleados a mano.

---

## El resultado, medido en producción

Doce imágenes de la galería, comparando lo que se servía antes con lo que se sirve ahora:

```
  dGg8Xxh.jpg       3756 kB  ->   23 kB
  ltW3p5N.jpg       3084 kB  ->   25 kB
  5uVcOay.jpg       3511 kB  ->   26 kB
  …
  TOTAL 12:  21.08 MB  ->  265 kB   (81x menos)
```

Extrapolado a las 64 fotos de `/galeria`: **112,4 MB → 1,38 MB**.

Un solo archivo, medido en el dominio real:

| | |
|---|---|
| Original JPEG | 2 105 458 b |
| AVIF a 320 px | 5 824 b |
| AVIF a 640 px | 15 513 b |
| AVIF a 1280 px | 39 048 b |

---

## Para llevárselo a otro proyecto

Se copian tres archivos y se ajusta uno:

| Archivo | Qué hace | ¿Hay que tocarlo? |
|---|---|---|
| `src/lib/imagen.js` | `srcset`, anchos, adaptador del proveedor | **Sí**: `ADAPTADOR` y `ANCHOS` |
| `src/components/ui/Foto.jsx` | `decode`, marcador, reintento, prioridad | No |
| `src/lib/medidas.js` + `scripts/medidas-medios.mjs` | Medidas reales de cada archivo | Solo la ruta de los medios |
| `vercel.json` → `images` | `sizes`, `formats`, `qualities`, `localPatterns` | **Sí**, si cambia el proveedor |

**`sizes` y `qualities` de `vercel.json` tienen que coincidir con `ANCHOS` y `CALIDAD` de
`imagen.js`.** Pedir un ancho o una calidad que no estén declarados devuelve un error del
borde, no una imagen — y eso se ve como una foto rota.

---

## Lo que este patrón NO resuelve

- **Los videos.** `/_vercel/image` no los toca. En este sitio son 320 MB en 25 archivos, y
  siguen sirviéndose tal cual. Para un sitio con video de peso, esto pide una solución aparte
  (poster, `preload="metadata"`, o un servicio de video).
- **Las imágenes de otro origen.** `localPatterns` restringe a `/media/`. Servir de un bucket
  o de un CDN ajeno exige declararlo en `remotePatterns` y abrir la CSP.
- **La primera petición de cada variante** la paga el primer visitante: el borde transforma y
  cachea. Con `minimumCacheTTL` de un año, es una vez por variante y ya.
