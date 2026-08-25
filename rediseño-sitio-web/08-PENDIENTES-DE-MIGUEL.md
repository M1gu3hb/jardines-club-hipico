# 08 · PENDIENTES DE MIGUEL — lo que solo puede aportar el dueño

> **2026-08-24.** La regla N3 dice que no se inventa nada. Esto es la consecuencia directa:
> la lista de lo que hace falta y que ninguna sesión de IA puede fabricar.
>
> Ordenado por **cuánto desbloquea**, no por cuánto cuesta.

---

## 🔴 BLOQUEANTES — sin esto no se puede construir con honestidad

### 1. Las capacidades rotas · **15 minutos · desbloquea toda la FASE 4**

| Espacio | Qué pasa | Qué necesito |
|---|---|---|
| **Jardines** | `capacidad_min` y `capacidad_max` están **vacías** | El rango real. Es el espacio más grande y hoy **queda fuera de todo filtro numérico**: alguien que busque «400 personas» no lo ve |
| **Salón de los Espejos** | El texto dice «300-400» pero el mínimo guardado es **150** | ¿Cuál es el bueno? |
| **Espacio Nocturno (Eclipse)** | Texto «80-120», mínimo guardado **50** | ¿Cuál es el bueno? |
| **Estancias (Bungalos)** | Sin capacidad de ningún tipo | ¿Cuántas personas se hospedan? ¿Cuántas estancias hay? |

Sin esto, el comparador y «Encuentra tu espacio» **recomiendan mal**, y recomendar mal es peor
que no recomendar.

### 2. Tipo de cada espacio · **10 minutos**

Para cada uno de los 8: **interior · exterior · mixto · hospedaje · ceremonia**.
Es lo que permite filtrar por «quiero jardín» o «quiero interior».

### 3. Etiquetar las 69 fotos de la galería · **~40 minutos · la tarea de mayor retorno de todo el rediseño**

Por cada foto: **qué espacio sale** y **qué tipo de evento es** (si aplica). Con eso se desbloquea,
todo a la vez:

- Los filtros de `/galeria`
- La galería propia de cada uno de los 8 espacios
- Las fotos de las páginas de bodas y XV años
- Los `alt` para SEO y accesibilidad
- Las imágenes de Open Graph de cada página

Ninguna sesión puede hacer esto: **hay que saber qué se ve en cada foto.**

Te lo puedo preparar como una lista numerada con las miniaturas para que solo tengas que
escribir al lado.

---

## 🟠 NECESARIOS — la página nace pero coja sin esto

### 4. Contenido de **bodas** y **XV años** · **la pieza comercial más valiosa**

Hoy hay **cero palabras** sobre tipos de evento. Y son las dos páginas que capturan «salón para
boda en Xochimilco» y «dónde hacer XV años».

De cada una necesito:

- **300-500 palabras propias**, y que sean **realmente distintas** entre sí. Si XV años acaba
  siendo bodas con las palabras cambiadas, esa página no debería existir
- **4-8 fotos reales** de ese tipo de evento en el recinto
- **3-6 preguntas** con su respuesta — las que te hacen por WhatsApp
- Qué espacios recomiendas para ese evento y **por qué**
- Qué servicios aplican

**No hace falta que lo escribas bonito.** Escríbelo como se lo explicarías a un cliente por
teléfono y yo lo convierto en copy. Lo que no puedo es inventármelo.

### 5. Unas 150-250 palabras más por espacio

Cada espacio tiene hoy ~150 palabras. Da para media página. Lo que falta y que solo sabes tú:

- ¿Qué montajes admite? ¿Cuántas mesas caben en cada configuración?
- ¿Qué pasa si llueve? ¿Tiene cobertura, alternativa, plan B?
- ¿Baños propios o compartidos? ¿Cocina cerca?
- ¿Tiene horario distinto al resto?
- ¿Qué lo hace diferente de los otros siete? **Esto es lo más valioso**
- ¿Qué es lo que más preguntan de ese espacio?

### 6. Preguntas frecuentes reales

Tienes la mejor fuente que existe y no cuesta nada: **las preguntas que te llegan por WhatsApp
todos los días**. Las 9 que hay hoy no alcanzan para 20 páginas.

Ideal: 3-6 por espacio y 3-6 por tipo de evento. Puede ser una lista suelta; yo las reparto.

### 7. Datos que hoy no existen en ningún lado

- **Estacionamiento**: ¿cuántos coches? ¿Es propio? ¿Tiene costo?
- **Horarios**: ¿hay hora de cierre? ¿Cambia según el espacio?
- **Proveedores externos**: ¿se permiten? ¿Con condiciones?
- **Capilla**: ¿es religiosa, civil, simbólica? ¿Se puede celebrar misa?
- **Estancias**: ¿cuántas? ¿Capacidad de cada una? ¿Se rentan sueltas o solo con evento?
- **Área Infantil Pony**: ¿qué incluye? ¿Hay ponis de verdad? ¿Con supervisión?
- **Accesibilidad**: ¿hay rampas, baño accesible, acceso para silla de ruedas?

Cualquiera de estas que no me confirmes **no aparece en la web**. Es preferible el silencio a
una promesa que no se cumple.

---

## 🟡 DECISIONES QUE SOLO TÚ PUEDES TOMAR

| # | Decisión | Contexto |
|---|---|---|
| 8 | **Splash screen** | Recomiendo: solo Home, solo primera visita, duración corta. Ver `06-DISENO` §5 |
| 9 | **Reseñas** | La tabla `resenas` está **vacía**; el sitio lee un JSON local. ¿Lo dejamos así o cargas reseñas reales al panel? **No se inventa ninguna** |
| 10 | **Los 8 slugs** | Propuestos en `02-INVENTARIO` §2.2. Una vez publicados no se cambian sin redirect |
| 11 | **`/nosotros`** | No existe ni un párrafo. ¿Tienes historia real que contar, o la dejamos fuera? |
| 12 | **Analítica ahora** | Antes dijiste «al final». Recomiendo encenderla **antes** de empezar: sin línea base no se podrá saber si el rediseño funcionó |
| 13 | **Deploy Hook** | Con prerender, el HTML se congela en el build. ¿Quieres que guardar en el panel dispare un rebuild automático? |
| 14 | **Agendar visita** | ¿Lo metemos al funnel ya? Un recinto se vende cuando se ve |

---

## 🟢 FUERA DEL CÓDIGO — para la FASE 9

| # | Qué |
|---|---|
| 15 | Acceso a **Google Business Profile** para auditarla (o capturas) |
| 16 | Lista de **directorios** donde aparece el negocio. Ya detectamos que hay fichas con teléfonos anteriores |
| 17 | Confirmación de que el NAP oficial es: **+52 55 2311 8153** · `525523118153` · `jardinesclubhipico@gmail.com` · Duraznos S/N, Sta Inés, Xochimilco, 16810 CDMX |
| 18 | **El dominio `.mx`**: cuándo se compra. Estaba disponible el 24-ago, pero eso puede cambiar. Registrarlo no obliga a conectarlo |

---

## Cómo mandarme esto

No hace falta que sea ordenado ni bonito. Notas de voz, una lista suelta, un WhatsApp largo — lo
que sea más rápido para ti. Yo lo estructuro.

**Lo único que importa es que sea real.** Si un dato no lo sabes con certeza, dilo y lo dejamos
fuera: la regla N3 no se rompe ni una vez. Este repo ya se quemó con respaldos que inventaban
salones, y no se repite.
