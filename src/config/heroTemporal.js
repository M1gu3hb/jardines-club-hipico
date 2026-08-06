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
 * ── EL ARCHIVO ──────────────────────────────────────────────────────────────
 *
 *   576 × 1024 px  ·  VERTICAL 9:16  ·  68.6 s  ·  5.66 MB  ·  H.264 + AAC
 *
 * Los dos videos que sustituye son 854 × 480 — apaisados. Este es vertical, y
 * el hero es apaisado, así que **algo hay que ceder**: o se ve el cuadro entero
 * y sobran lados, o se llena la pantalla y se recorta. No hay una tercera.
 *
 * ── LO QUE SE ELIGIÓ, Y POR QUÉ ─────────────────────────────────────────────
 *
 * `cover`: llena el hero y recorta, igual que el carrusel de siempre. En un PC
 * se ve una franja horizontal del centro del cuadro.
 *
 * El primer intento fue al revés —`contain`, el cuadro completo, con una copia
 * desenfocada detrás rellenando los lados— porque lo pedido era «que se vea
 * completo». Puesto en producción se veía como un reel centrado con marco
 * oscuro: cumplía la letra y no la intención. Corregido a petición del dueño:
 * «que se adaptara al fondo aunque se recorte un poco».
 *
 * Cuánto se recorta, medido:
 *
 *   Teléfono en vertical (390×844)   se ve el 82 % del alto del cuadro
 *   iPad apaisado       (1180×820)   se ve el 39 %
 *   Laptop 15"          (1440×900)   se ve el 35 %
 *   Monitor 1080p       (1920×1080)  se ve el 32 %
 *
 * `posicion` decide QUÉ franja sobrevive. `"center"` deja la del medio; si la
 * acción del video estuviera arriba, `"center top"` la conservaría.
 *
 * Si algún día se quiere volver a verlo entero: `ajuste: "contain"`.
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
   * "cover" = llena el hero y recorta (lo pedido). "contain" = cuadro completo
   * con lados vacíos.
   *
   * El `@type` no es decorativo: sin él, TypeScript infiere `string` y
   * `objectFit: ajuste` deja de compilar contra `CSSProperties`. La unión
   * además impide escribir aquí un valor que `object-fit` no entienda.
   *
   * @type {"cover" | "contain"}
   */
  ajuste: "cover",

  /** Qué franja del cuadro sobrevive al recorte. Ej.: "center", "center top". */
  posicion: "center",

  /**
   * Cuánto se ve el video por debajo de los degradados del hero. Los dos videos
   * de siempre van a 0.72; este sube a 0.92 para que se aprecie, y las letras
   * siguen legibles porque los degradados negros del hero no se tocan.
   */
  opacidad: 0.92,
};
