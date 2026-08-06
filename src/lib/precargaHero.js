import { HERO_TEMPORAL } from "@/config/heroTemporal";

/**
 * Deja el video del hero YA DESCARGADO antes de que el hero exista.
 *
 * ── Por qué hace falta ──────────────────────────────────────────────────────
 *
 * `Home` no monta el hero hasta que el splash termina (`splashDone`). Hasta ese
 * momento el `<video>` no existe, así que su `preload="auto"` no puede hacer
 * nada: la descarga empezaba justo cuando el video ya tenía que verse. De ahí
 * que arrancara lento la primera vez.
 *
 * El splash dura ~4 s de todas formas. Este `fetch` usa ese hueco: cuando el
 * hero monta, el archivo ya está en la caché del navegador y el `<video>` lo
 * lee de ahí sin pedir nada por red.
 *
 * ── Detalles que importan ───────────────────────────────────────────────────
 *
 * · Se llama a `.blob()` a propósito. Sin leer el cuerpo, el navegador puede
 *   dejar la descarga a medias; leerlo entero garantiza que el archivo completo
 *   queda cacheado. El blob se descarta acto seguido.
 * · `cache: "force-cache"` — en la segunda visita no se vuelve a descargar.
 * · Idempotente: se puede llamar desde varios sitios; solo descarga una vez.
 * · Nunca lanza. Si falla, el `<video>` descargará por su cuenta como antes:
 *   esto acelera, no es un requisito.
 * · Si `HERO_TEMPORAL.activo` es `false` no descarga nada, así que apagar el
 *   video temporal también apaga esta precarga.
 */
let enCurso = null;

export function precargarVideoHero() {
  if (!HERO_TEMPORAL.activo) return Promise.resolve(false);
  if (enCurso) return enCurso;
  if (typeof fetch !== "function") return Promise.resolve(false);

  enCurso = fetch(HERO_TEMPORAL.src, { cache: "force-cache", credentials: "omit" })
    .then((r) => (r.ok ? r.blob() : null))
    .then((b) => !!b)
    .catch(() => false);

  return enCurso;
}

/** Solo para pruebas: olvida la descarga en curso. */
export function _reiniciarPrecarga() {
  enCurso = null;
}
