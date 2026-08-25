# 06 · DISEÑO, MOTION Y RESPONSIVE

> **2026-08-24.** Lo que se conserva, lo que se consolida y lo que se diseña nuevo.
> La regla que manda sobre todas: **el Hero no se toca.**

---

## 1. Qué NO se toca — regla N1

**El Hero se conserva exactamente como está.** Los dos videos de fondo, la intro, el
comportamiento de arranque, la composición y la dirección artística.

Lo único que se le añade:
- Los dos CTAs: *Explorar espacios* · *Cotizar mi evento*
- Una línea de diferenciadores reales: 8 espacios · 30-600 invitados · capilla · hospedaje ·
  área infantil · Xochimilco

Nada más. **No se rediseña, no se sustituye el video, no se cambia la animación de entrada, no se
"moderniza".** Si algún cambio de arquitectura obliga a tocar `HeroSection.jsx`, se toca lo
mínimo imprescindible y se documenta por qué.

Los **videos del hero ya están comprimidos**: no se vuelven a comprimir (regla del repo).

---

## 2. Lo que tampoco se convierte en otra cosa

**Jardines no se convierte en una plantilla genérica de bodas.** Nada de beige + tipografía
cursiva + flores «porque es un venue». Esa es la trampa más fácil de este encargo y está
explícitamente prohibida.

La identidad actual **se conserva y se evoluciona**:

```
negro #0a0a0a · dorado de marca #C9A84C
skeuomorfismo · profundidad · brillo · metal · iluminación
video · fotografía · movimiento · cards · sonido · sensación premium
```

`theme.css` ya define los tokens (`.skeu-card`, `.skeu-gold-btn`, scrollbar dorada). Se
**consolida**, no se sustituye.

---

## 3. Design system — consolidar lo que ya existe

El problema real a resolver: **componentes hechos en fechas distintas con dorados distintos**. No
se rediseña la identidad, se unifica.

Trabajo concreto:

1. **Auditar todos los dorados** que aparecen hoy en `src/` y reducirlos a una escala nombrada
   (`--oro-base`, `--oro-claro`, `--oro-tenue`, `--oro-borde`). Si hay quince tonos, quedan tres
   o cuatro **y se justifica cada uno**.
2. Lo mismo con superficies, bordes, sombras y radios.
3. **Escala tipográfica** con jerarquía clara: H1 de página, H2 de sección, H3 de bloque, cuerpo,
   pie. Hoy cada sección tiene la suya.
4. **Componentes canónicos** que las páginas nuevas reutilizan sin reinventar:
   `PageHero` · `SectionHeader` · `FichaDatos` · `CardEspacio` · `CardEvento` · `GaleriaGrid` ·
   `FaqAcordeon` · `Breadcrumbs` · `CtaBloque` · `EnlacesRelacionados`
5. Un documento corto en esta carpeta cuando esté hecho: `11-DESIGN-SYSTEM.md`.

**No se instala una librería de UI nueva.** Ya hay shadcn/ui y Tailwind.

---

## 4. Motion — un sistema, no un efecto repetido

Hoy la página se siente viva, y eso se conserva. El problema a evitar es el que señala el
encargo: **todo entrando con `opacity 0 → 1` y `translateY 20px`**. Después de tres scrolls eso
deja de leerse como animación y empieza a leerse como retraso.

**Familias de motion, cada una con su papel:**

| Familia | Dónde | Qué hace |
|---|---|---|
| **Reveal** | Secciones | Entrada por defecto, sobria |
| **Stagger** | Grids de cards, galerías | Los hijos entran escalonados, no en bloque |
| **Texto** | Titulares de página | Entrada por líneas o palabras. **Solo en H1**, no en todo |
| **Profundidad** | Cards skeuomórficas | El brillo y la sombra responden al puntero |
| **Máscara** | Fotografía | La imagen se revela, no se desvanece |
| **Parallax ligero** | Fondos y heros de página | Muy contenido. Nunca en móvil |
| **Transición de ruta** | Al navegar | Que cambiar de página no sea un salto en seco |

**Reglas del sistema:**

- **Una sola familia por bloque.** Nada de reveal + parallax + stagger a la vez.
- **Duraciones y curvas centralizadas** en tokens, no escritas a mano en cada componente.
- **`prefers-reduced-motion` se respeta siempre.** No es opcional.
- **La animación nunca retrasa el contenido**: el texto se lee aunque la animación no haya
  terminado. Y **jamás** se anima nada que afecte al LCP.
- **En móvil se reduce**: menos parallax, menos stagger, transiciones más cortas.

---

## 5. Splash screen — decisión

Ver `01-AUDITORIA` §7. Hoy tiene sentido porque solo existe la Home. Mañana no: quien busque
«capilla para boda Xochimilco» aterriza en `/espacios/capilla` y una intro obligatoria antes de
la información que vino a buscar es fricción — y castiga el LCP justo donde hay que posicionar.

**Recomendación:** se conserva, con tres condiciones:
- **solo en `/`**, en ninguna otra ruta
- **solo en la primera visita** de la sesión
- **duración reducida**, respetando `prefers-reduced-motion`, y sin bloquear el LCP

**No se borra.** Decisión final del dueño.

---

## 6. Responsive — tres diseños, no uno estirado

La regla: **desktop, tablet y móvil se diseñan cada uno para su dispositivo.** Ni se diseña
desktop y se «acomoda» en teléfono, ni se diseña móvil y se estira a 1920.

**Desktop (≥1280)** — composiciones grandes, fotografía a sangre, galerías amplias, comparación
de espacios en tabla o grid ancho, tipografía generosa, texturas visibles.

**Tablet (768-1279)** — composición propia. Dos columnas donde desktop tiene tres. No es desktop
reducido.

**Móvil (<768)** — **prioridad comercial**. En una página de espacio, lo primero que se ve:

```
SALÓN ENCANTO
200 – 300 invitados
[Cotizar]  [Ver fotos]
```

**Nadie debe pasar 1 000 px de decoración antes de saber cuántos caben.** Y los CTAs de WhatsApp
y Cotizar siempre alcanzables.

**El contenido importante no se elimina en móvil** porque ocupe espacio: se reordena, se colapsa
en acordeón o se resume visualmente. Pero sigue estando, y sigue en el HTML.

**Resoluciones de prueba obligatorias:** 320×568 · 375×812 · 430×932 · 768×1024 · 1024×768 ·
1366×768 · 1440×900 · 1920×1080 · ultrawide.

Se busca: overflow horizontal, cards cortadas, tipografía ilegible, galerías rotas, menú, filtros,
formularios, mapas, modales, CTAs, botones e imágenes.

---

## 7. Rendimiento — el sitio puede ser potente y rápido

Un recinto necesita muchas fotos. Eso **no** significa cargar 80 MB.

| Frente | Qué se hace |
|---|---|
| **Bundle** | Hoy 775 kB en un archivo. Con 25 rutas hay que partirlo: `React.lazy` + `Suspense` por ruta. Sin esto, el rediseño **empeora** la primera carga |
| **Imágenes** | WebP/AVIF, `srcset`, dimensiones explícitas, `loading="lazy"` salvo el hero |
| **Hero** | `fetchpriority="high"` en el póster. Los videos **no se recomprimen** |
| **Fuentes** | `font-display: swap` y precarga solo de la que entra en el primer render |
| **Supabase** | Una consulta por página, no una por componente. React Query ya está |
| **Terceros** | Casi ninguno. Cada uno que entre **exige tocar la CSP a propósito** |

**Métricas objetivo:** LCP < 2.5 s · CLS < 0.1 · INP < 200 ms, medidas en móvil con conexión
lenta, no en el escritorio del que lo hizo.

---

## 8. Accesibilidad — no es opcional en un sitio premium

- **Contraste** ≥ 4.5:1 en texto normal. **El dorado sobre negro hay que medirlo**, no suponerlo:
  es justo el par que suele fallar.
- **Foco visible** en todo elemento interactivo. Nada de `outline: none` sin sustituto.
- **Navegable con teclado** de principio a fin: menú, filtros, galería, modal, formulario.
- **Formularios** con `label` real asociado, no `placeholder` como etiqueta. Errores anunciados.
- **`alt`** en todas las imágenes; vacío (`alt=""`) en las decorativas.
- **Jerarquía de headings** correcta: un `h1`, sin saltar niveles.
- **`prefers-reduced-motion`** respetado en todo el motion system.
- **Áreas táctiles** ≥ 44×44 px.
- **Modales y overlays** con foco atrapado y cierre con `Escape`.

Se audita en la FASE 10 con herramienta **y** a mano con teclado.
