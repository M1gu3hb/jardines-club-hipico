/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  VIDEO TEMPORAL DEL HERO — «Style Contest 2026»                          ║
 * ║                                                                          ║
 * ║  ESTADO HOY:  APAGADO (`activo: false`). El hero enseña los dos videos    ║
 * ║  de siempre. Se apagó a petición del dueño el 2026-08-06.                 ║
 * ║                                                                          ║
 * ║  PARA VOLVER A PONERLO:  `activo: true` aquí abajo, y desplegar.          ║
 * ║  PARA QUITARLO OTRA VEZ:  `activo: false`. Nada más, en los dos sentidos. ║
 * ║                                                                          ║
 * ║  NO SE BORRÓ NADA: el archivo sigue en `public/media/img/`, el componente ║
 * ║  sigue en `HeroSection.jsx` y todos los ajustes de abajo siguen puestos   ║
 * ║  tal como quedaron (nítido, con audio). Volver a encenderlo lo devuelve   ║
 * ║  exactamente como estaba, sin reconfigurar nada.                          ║
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
 * ── LO QUE SE ELIGIÓ, Y POR QUÉ — LA NITIDEZ MANDA ──────────────────────────
 *
 * Hubo dos intentos antes de este, y los dos enseñaron algo:
 *
 *   1º `contain` a secas + fondo desenfocado apagado  →  nítido, pero se veía
 *      como un reel pegado sobre un marco negro. Rechazado por el dueño.
 *   2º `cover`, llenando la pantalla  →  la composición gustaba, pero **se veía
 *      pixelado en PC**. Rechazado por el dueño, y con razón: es aritmética.
 *
 * El archivo tiene 576 × 1024 px. Cuánto hay que estirarlo, medido:
 *
 *   pantalla              cover            contain
 *   ───────────────────   ──────────────   ──────────────
 *   iPhone 390×844        0.82×  nítido    0.68×  nítido
 *   iPad apaisado         2.05×  se nota   0.80×  nítido
 *   Laptop 15" 1440×900   2.50×  PIXELA    0.88×  nítido
 *   Monitor 1080p         3.33×  PIXELA    1.05×  nítido
 *   Monitor 1440p         4.44×  PIXELA    1.41×
 *
 * No hay forma de arreglar eso desde el código: **el archivo no tiene los
 * píxeles**. Un video de 576 px de ancho no puede llenar un monitor de 1920 sin
 * inventarse tres de cada cuatro. La única solución real sería un original más
 * grande (1080×1920), y entonces `cover` sí aguantaría un PC.
 *
 * Así que se vuelve a `contain` —resolución real, nítido— y se arregla lo que
 * falló del primer intento, que no era el `contain` sino cómo se veían los
 * lados: ahora llevan una copia del mismo archivo muy desenfocada y más clara,
 * y el borde del video de delante se difumina para que no parezca un rectángulo
 * pegado. Ahí el desenfoque hace irrelevante el estirón: se ven manchas de
 * color, no píxeles.
 *
 * `posicion` decide qué parte se prioriza si algún día se vuelve a `cover`.
 *
 * ── UN DETALLE DEL BUILD, COMPROBADO ────────────────────────────────────────
 *
 * Rollup resuelve `HERO_TEMPORAL.activo` en tiempo de compilación —es un literal
 * de un módulo estático— y BORRA del bundle la rama apagada. Comprobado mirando
 * `dist/assets/`:
 *
 *   activo: true   →  el bundle solo cita `style-contest-2026.mp4`
 *   activo: false  →  el bundle solo cita `hero-salon-720.mp4` y `hero-jardin-720.mp4`
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
  activo: false,

  /** Auto-hospedado en `public/media/`, como todo lo demás. Copiado tal cual. */
  src: "/media/img/style-contest-2026.mp4",

  /**
   * "contain" = el cuadro entero a resolución real, NÍTIDO. "cover" = llena la
   * pantalla, pero en un PC estira el archivo 3× y se ven los píxeles.
   *
   * El `@type` no es decorativo: sin él, TypeScript infiere `string` y
   * `objectFit: ajuste` deja de compilar contra `CSSProperties`. La unión
   * además impide escribir aquí un valor que `object-fit` no entienda.
   *
   * @type {"contain" | "cover"}
   */
  ajuste: "contain",

  /** Qué parte se prioriza. Solo cambia algo con `cover`. */
  posicion: "center",

  // ── LOS LADOS, EN PANTALLAS ANCHAS ────────────────────────────────────────
  // Con `contain` el video no llega a los bordes de un PC. En vez de dejar
  // negro, se pinta detrás una copia del mismo archivo, muy desenfocada.

  /** Ancho mínimo (px) para pintar el fondo. Por debajo no se monta: un solo video. */
  fondoDesde: 900,

  /** Desenfoque del fondo, en px. Cuanto más alto, menos se reconoce el estirón. */
  desenfoque: 40,

  /**
   * Brillo del fondo, 0 a 1. El primer intento iba a 0.42 y quedaba tan apagado
   * que el video de delante parecía una foto pegada sobre negro. 0.55 lo lee
   * como luz ambiente en vez de como marco.
   */
  brilloFondo: 0.55,

  /**
   * Cuánto se difumina el borde del video de delante para que no se vea el
   * rectángulo. Porcentaje de su ancho; 0% lo deja con canto duro.
   */
  bordeSuave: "5%",

  /**
   * Cuánto se ve el video por debajo de los degradados del hero. Los dos videos
   * de siempre van a 0.72; este sube a 0.92 para que se aprecie, y las letras
   * siguen legibles porque los degradados negros del hero no se tocan.
   */
  opacidad: 0.92,

  // ── AUDIO ─────────────────────────────────────────────────────────────────
  //
  // LO QUE NO SE PUEDE HACER, y conviene saberlo antes de tocar esto: **ningún
  // navegador deja que un video arranque con sonido**. Chrome, Safari y Firefox
  // bloquean el autoplay con audio, y al bloquearlo dejan el video PAUSADO — un
  // fotograma congelado de fondo. No es una opción que se pueda activar desde
  // aquí ni desde Vercel: es política del navegador.
  //
  // Así que el video arranca SIEMPRE silenciado —eso siempre reproduce— y el
  // audio entra en cuanto el visitante hace algo: un clic, un toque, una tecla o
  // rodar la rueda del ratón. En la práctica, el primer scroll.
  //
  // Y se calla en tres casos, cualquiera de ellos:
  //   · el hero deja de verse (se bajó por la página);
  //   · el visitante apaga el sonido con el botón de arriba a la derecha;
  //   · `conAudio: false` aquí abajo.

  /** `false` deja el video mudo siempre, como los dos de siempre. */
  conAudio: true,

  /** 0 a 1. Es el volumen del propio archivo; 1 = tal cual se grabó. */
  volumen: 1,

  /**
   * Cuánto del hero tiene que verse para que suene, de 0 a 1. Con 0.3, el audio
   * se corta cuando ya se ha ido más del 70 % del hero — o sea, en cuanto se
   * empieza a leer la sección siguiente.
   */
  umbralVisible: 0.3,
};
