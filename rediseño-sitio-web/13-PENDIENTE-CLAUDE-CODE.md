# 13 · PENDIENTE PARA CLAUDE CODE — cierre del sitio antes de entrar al CRM

> **2026-08-26.** Escrito después de la auditoría SEO del sitio en producción.
>
> **Lo de contenido YA ESTÁ HECHO** y aplicado a la base de datos desde esta sesión.
> Lo que queda aquí es **código + un rebuild**, que es lo único que no se puede hacer sin shell.

---

## ⚠️ LO PRIMERO: HAY QUE RECONSTRUIR

El sitio está **prerenderizado**. Todo el contenido nuevo ya está en
`jardines.tipos_evento`, pero **el HTML servido sigue siendo el del build anterior**.

**Hasta que no se ejecute un build y un deploy, ninguno de los cambios de abajo se ve en la
web.** Es el primer paso y condiciona la comprobación de todo lo demás.

---

## 1. Lo que YA se hizo (no rehacer)

Aplicado directamente a `jardines.tipos_evento` el 2026-08-26. Verificado con consulta.

### 1.1 · Fuera la mención al dueño — 5 filas

Lo pidió el dueño explícitamente. Estaba en **5** páginas, no en 3:

| Antes | Ahora | Páginas |
|---|---|---|
| «Las solicitudes las contesta el dueño en persona, por WhatsApp.» | «Las solicitudes las contestamos nosotros por WhatsApp.» | bodas, xv-anos |
| «Quien te contesta por WhatsApp es el dueño.» | «Nosotros te atendemos por WhatsApp.» | corporativos, infantiles, nocturnos |

Comprobado: **0 apariciones** de «dueño» en las 15 filas.

### 1.2 · Reescritas las 8 descripciones flojas

Cada una con **ángulo propio**, y todas las frases compartidas reescritas para que no aparezcan
calcadas. **No se inventó ni un dato**: todos los hechos ya estaban en el contenido verificado
del sitio.

| slug | antes | ahora | ángulo nuevo |
|---|---|---|---|
| `bautizos` | 1304 | **1723** | la familia extendida y el traslado que desarma el grupo |
| `presentaciones` | 1194 | **1691** | el protagonista tiene 3 años: manda el ritmo, no el espacio |
| `aniversarios` | 1311 | **1646** | es un reencuentro: mayores y gente de fuera |
| `graduaciones` | 1361 | **1684** | dos mitades; el problema es que se vea y se escuche |
| `posadas` | 1358 | **1729** | la agenda de diciembre, el frío, la piñata y la luz |
| `baby-showers` | 1137 | **1689** | de día, con juegos, y la foto de la revelación |
| `despedidas` | 1174 | **1623** | nadie maneja de vuelta |
| `reuniones` | 1233 | **1651** | el evento sin protocolo: que no se sienta montado |

### 1.3 · Escritas las 9 `seo_description` que estaban vacías

Estaban en `NULL`, y por eso el sitio caía al texto de la página y salían descripciones de hasta
225 caracteres que Google trunca. Las 9 nuevas miden entre **138 y 156 caracteres**:
`cumpleanos`, `graduaciones`, `posadas`, `aniversarios`, `bautizos`, `reuniones`,
`presentaciones`, `despedidas`, `baby-showers`.

### 1.4 · Roto el párrafo de cierre idéntico

Tres páginas cerraban con el mismo párrafo de 55 palabras (la visita con cita, el anticipo sin
monto fijo). Ahora cada una lo dice a su manera: en **corporativos** habla de revisar accesos y
logística de proveedores; en **nocturnos**, de que ese espacio hay que verlo de noche; en
**infantiles**, de traer al festejado. Comprobado: **0 filas** conservan el texto original.

### 1.5 · Resultado medido de la desduplicación

| Frase | Antes | Ahora |
|---|---|---|
| «La renta incluye el espacio…» | **11** páginas | **3** |
| «Son seis horas en total, cinco activas.» | **14** | **0** |
| «…es si hay meseros y atención en mesa» | **6+** | **0** |
| «sillas Tiffany, mantel y cubremantel y el montaje básico» | 5 | **0** |
| «No hay mínimo de personas» | 3 | **1** |
| Párrafo de cierre completo | 3 | **0** |
| «Quien te contesta por WhatsApp es el dueño» | 5 | **0** |

---

## 2. Lo que hay que hacer — código

### 2.1 · Rebuild y deploy · **BLOQUEANTE**

Sin esto no se ve nada de lo anterior. Comprobar después, sobre el HTML servido:
- `/eventos/bautizos` ya no dice «La renta incluye el espacio…»
- Ninguna página menciona al dueño
- Las 9 `meta-description` nuevas aparecen y ninguna pasa de ~160 caracteres

### 2.2 · Quitar `Disallow: /cotizar` del `robots.txt` generado

En `scripts/prerender.mjs`. **El `noindex` de `/cotizar` se queda** — eso está bien puesto. Lo que
se quita es el `Disallow`, porque las dos cosas juntas se estorban: si Google no puede rastrear
la página, tampoco puede leer su `noindex`, y si alguien la enlaza desde fuera puede acabar
indexada como URL sin descripción. Lo mismo aplica a `/portal` y `/invitacion/`, que además son
redirects 301: **un 301 hay que dejarlo rastrear para que Google lo procese**.

### 2.3 · Quitar el `og:url` de la página 404

Hoy `dist/404.html` declara `og:url` apuntando a la portada, así que al compartirse dice ser la
home. Un 404 no debe tener `og:url` ni canonical. El `noindex, follow` que ya tiene está bien.

### 2.4 · Unificar el separador de los títulos

Cinco páginas usan `|` (bodas, xv-anos, infantiles, corporativos, nocturnos) y nueve usan `·`.
Delata dos tandas de redacción. **Elegir uno y aplicarlo a las 25 rutas.**

### 2.5 · Cerrar el hueco de `jsx-no-undef` en el lint

Sigue abierto por ser configuración compartida entre los tres repos, y ya dejó pasar dos fallos
que cazaron el typecheck y el build por suerte: un `Play` sin importar, y `src/paginas.js`
apuntando por cadena de texto a un archivo borrado. **Afecta a los tres repos** y conviene
cerrarlo antes de empezar el trabajo del CRM.

---

## 3. Lo que sigue BLOQUEADO por falta de datos del dueño

### 3.1 · `og_image` está en NULL en las 15 filas

No es que las páginas compartan foto: **ninguna tiene foto asignada**, y el sitio cae a un
respaldo. Por eso solo salen 5 imágenes sociales distintas para 14 páginas, y los grupos que
comparten imagen coinciden casi uno a uno con los que compartían texto.

**No se puede resolver adivinando.** Depende de lo mismo de siempre: **las 69 fotos de la galería
siguen sin etiquetar**, así que no hay forma de saber cuál es «la de bautizos». Elegirla a ojo
sería inventar.

→ Está en `08-PENDIENTES-DE-MIGUEL.md` §3. Son ~40 minutos de trabajo suyo y desbloquean a la vez
las imágenes sociales, los filtros de la galería, las galerías por espacio y los `alt`.

### 3.2 · Una frase real por evento

Las 8 páginas reescritas están diferenciadas por **ángulo**, que era lo que arreglaba el
solapamiento. Lo que las volvería imbatibles es un dato que solo tiene el dueño: a qué hora
suelen ser, cuántos suelen venir, qué le preguntan siempre. No bloquea nada.

---

## 4. Deuda anterior que sigue viva

- El PNG del anuncio pesa **1,7 MB**
- `renta-de-espacio` existe como fila 15 con `activo = false` y descripción vacía — decidir si se
  llena o se retira
- `/clases-de-baile` está publicada a propósito, con `noindex`; **falta el anuncio**, que el dueño
  todavía está decidiendo cómo hacer
- Las 8 páginas siguen por debajo de las 6 buenas en extensión (~1 700 caracteres frente a
  2 100-3 700). Está bien para su intención, pero si alguna no rinde, esa es la palanca

---

## 5. Orden recomendado

1. **Rebuild y deploy** — sin esto, lo demás no se puede ni comprobar
2. Verificar sobre el HTML servido que el contenido nuevo salió
3. Los cuatro arreglos de código (§2.2 a §2.5), con sus contratos
4. Las cuatro puertas en verde
5. Segundo deploy
6. **Y entonces sí, empezar con el CRM**
