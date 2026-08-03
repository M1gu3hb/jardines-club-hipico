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
