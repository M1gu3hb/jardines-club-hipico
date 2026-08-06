/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  VIDEO TEMPORAL DEL HERO — «Style Contest 2026»                          ║
 * ║                                                                          ║
 * ║  PARA QUITARLO:  pon  `activo: false`  aquí abajo. Nada más.             ║
 * ║  Vuelven solos los dos videos de siempre (NBa3E9g + uykWsK9), con su      ║
 * ║  carrusel y sus tiempos, porque ese código NO se tocó: sigue entero en    ║
 * ║  `HeroVideoBg` de `src/components/HeroSection.jsx`.                       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ── LO QUE HAY QUE SABER DEL ARCHIVO ────────────────────────────────────────
 *
 *   576 × 1024 px  ·  VERTICAL 9:16  ·  68.6 s  ·  5.66 MB  ·  H.264 + AAC
 *
 * Los dos videos que sustituye son 854 × 480 — HORIZONTALES. Por eso el hero
 * los ponía con `object-fit: cover` (llenan la pantalla y lo que sobra se
 * recorta). Con un video vertical eso no sirve: en una pantalla de PC, `cover`
 * dejaría ver una franja estrecha del centro y se perdería casi todo.
 *
 * Se pidió que se vea COMPLETO en todos los dispositivos, así que va con
 * `object-fit: contain`: el cuadro entero siempre, sin recortar un pixel. La
 * consecuencia geométrica, dicha claramente:
 *
 *   · Teléfono en vertical  → llena prácticamente toda la pantalla.
 *   · Tablet                → franjas oscuras a los lados.
 *   · PC / laptop           → el video ocupa una columna central; a 1920 px de
 *                             ancho son unos 600 px de video y el resto, lados.
 *
 * Para que esos lados no se vean como huecos muertos, en pantallas anchas se
 * pinta DETRÁS una copia del mismo archivo, desenfocada y oscurecida. Es el
 * mismo fichero: el navegador lo descarga una sola vez. En teléfono no se pinta
 * —ahí no hay lados que rellenar— y así no se decodifican dos videos en un móvil.
 *
 * Si prefieres que llene la pantalla aunque recorte, cambia `ajuste` a "cover".
 *
 * ── UN DETALLE DEL BUILD, COMPROBADO ────────────────────────────────────────
 *
 * Rollup resuelve `HERO_TEMPORAL.activo` en tiempo de compilación —es un literal
 * de un módulo estático— y BORRA del bundle la rama apagada. Comprobado mirando
 * `dist/assets/`:
 *
 *   activo: true   →  el bundle solo cita `style-contest-2026.mp4`
 *   activo: false  →  el bundle solo cita `NBa3E9g.mp4` y `uykWsK9.mp4`
 *
 * O sea: el interruptor no deja código muerto viajando al navegador. Y los tres
 * .mp4 siguen los tres en `dist/media/` —Vite copia `public/` tal cual—, así que
 * al cambiar el flag y volver a desplegar, los videos de siempre ya están ahí.
 *
 * Consecuencia práctica: quitar el video es cambiar `activo` a `false` y volver a
 * desplegar. No hay que tocar ningún otro archivo ni borrar nada.
 */
export const HERO_TEMPORAL = {
  /** ← EL INTERRUPTOR. `false` devuelve los dos videos de siempre. */
  activo: true,

  /** Auto-hospedado en `public/media/`, como todo lo demás. Copiado tal cual. */
  src: "/media/img/style-contest-2026.mp4",

  /**
   * "contain" = se ve completo (lo pedido). "cover" = llena y recorta.
   *
   * El `@type` no es decorativo: sin él, TypeScript infiere `string` y
   * `objectFit: ajuste` deja de compilar contra `CSSProperties`. La unión
   * además impide escribir aquí un valor que `object-fit` no entienda.
   *
   * @type {"contain" | "cover"}
   */
  ajuste: "contain",

  /**
   * Cuánto se ve el video por debajo de los degradados del hero. Los dos videos
   * de siempre van a 0.72; este sube a 0.92 para que se aprecie, y las letras
   * siguen legibles porque los degradados negros del hero no se tocan.
   */
  opacidad: 0.92,

  /** Ancho mínimo (px) para pintar el fondo desenfocado. Por debajo, no se pinta. */
  fondoDifuminadoDesde: 900,
};
