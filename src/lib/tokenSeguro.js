/**
 * tokenSeguro.js — Generación de tokens portadores.
 *
 * Estos tokens SON la credencial: quien tenga el enlace o el QR entra. No hay
 * contraseña detrás, así que la única defensa es que no se puedan adivinar.
 *
 * **Sin fallback a `Math.random()`.** `Date.now()` es acotable y `Math.random()`
 * no es criptográfico: un token construido con ellos se puede enumerar. Si el
 * navegador no trae WebCrypto preferimos fallar con un mensaje claro antes que
 * emitir un token débil que nadie notará hasta que lo adivinen.
 * `crypto.getRandomValues` existe en todo navegador con soporte real desde hace
 * años, y el sitio se sirve por HTTPS (WebCrypto exige contexto seguro).
 */

/**
 * UUID v4 de WebCrypto, para generar el id de una fila **antes** de escribirla.
 *
 * Existe por el falso negativo al crear eventos: el id se generaba dentro del shim, nuevo en
 * cada clic, así que un reintento creaba OTRO evento en vez de chocar con el anterior — y la
 * clave de idempotencia del alta de usuario, que es `${eventoId}:${usuario}`, nunca podía
 * dispararse. Fijando el id al ABRIR el formulario, el segundo INSERT choca con la clave
 * primaria y el reintento es idempotente por construcción.
 *
 * Sin fallback, por el mismo motivo que `tokenSeguro`: un id predecible aquí significaría
 * colisiones entre altas distintas.
 */
export function nuevoId() {
  if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") {
    throw new Error(
      "Este navegador no permite crear el evento de forma segura. Actualízalo o usa otro.",
    );
  }
  return crypto.randomUUID();
}

/** 256 bits de `crypto.getRandomValues`, en base64url. Lanza si no hay WebCrypto. */
export function tokenSeguro() {
  if (typeof crypto === "undefined" || typeof crypto.getRandomValues !== "function") {
    throw new Error(
      "Este navegador no permite generar un enlace seguro. Actualízalo o usa otro para continuar.",
    );
  }
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
