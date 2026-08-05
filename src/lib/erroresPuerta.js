/**
 * LOS MENSAJES DE LA PUERTA — traducidos por CÓDIGO, no por frase.
 *
 * ── El hallazgo ─────────────────────────────────────────────────────────────
 *
 * Las tres pantallas del día del evento clasificaban el error buscando una palabra dentro del
 * mensaje del servidor:
 *
 *     StaffPage    e.message?.includes("autorizado")   → «Este link no es válido o fue renovado…»
 *     AccesoPage   /no autorizado|autorizado/i         → «Necesitas abrir primero el link…»
 *
 * Y el servidor, deliberadamente, NO dice «autorizado». `jardines_private.error_generico()` —por
 * donde salen TODOS los rechazos de `evento_por_staff`: token inexistente, revocado, expirado, o
 * cuota agotada— hace:
 *
 *     raise exception 'no disponible' using errcode = '42501';
 *
 * Es a propósito: un mensaje genérico no le dice a quien prueba tokens si acertó. Pero significa
 * que **ninguna de esas dos ramas se puede alcanzar nunca**. Al mesero cuyo link renovaron, en la
 * puerta, con invitados esperando, la pantalla le enseña la cadena literal «no disponible».
 * El texto que explica exactamente qué hacer estaba escrito y era inalcanzable.
 *
 * ── El arreglo ──────────────────────────────────────────────────────────────
 *
 * Se clasifica por `code`, que es lo que el servidor SÍ se compromete a mandar y lo que no cambia
 * al reescribir un texto. PostgREST propaga el `errcode` de Postgres en `error.code`. El mensaje
 * humano lo pone el cliente, que es quien sabe en qué pantalla está — el servidor sigue sin
 * revelar nada.
 */

/** `error_generico()`: rechazo genérico del servidor. No dice por qué, a propósito. */
export const RECHAZO = "42501";

const esRechazo = (e) => e?.code === RECHAZO || /^no disponible$/i.test(e?.message || "");

/**
 * Traduce un error de las RPC de la puerta a algo que un mesero pueda leer y actuar.
 *
 * @param e        el error que lanzó el shim
 * @param pantalla "staff" (el tablero) o "acceso" (el QR de un invitado)
 */
export function mensajePuerta(e, pantalla) {
  if (esRechazo(e)) {
    return pantalla === "staff"
      ? "Este link de meseros ya no sirve: puede haber caducado o el organizador lo renovó. Pídele el link nuevo."
      : "Este teléfono no está autorizado para registrar. Abre primero el link de meseros que te pasó el organizador, en este mismo navegador.";
  }
  // El cupo de ESTA invitación y el aforo de LA MESA son dos cosas distintas, y desde `sec_27`
  // el servidor las distingue. Colapsarlas en «excede el cupo» mandaba al mesero a mirar el
  // número equivocado: el de la invitación que tiene delante, cuando el lleno es el de la mesa.
  const msg = e?.message || "";
  if (/excede el aforo de la mesa/i.test(msg)) {
    return "La mesa ya está llena. No caben más personas en esa mesa, aunque esta invitación tenga cupo.";
  }
  if (/excede el cupo/i.test(msg)) {
    return "Esta invitación ya no tiene cupo para tantas personas.";
  }
  if (/numero de personas invalido/i.test(msg)) {
    return "El número de personas no es válido.";
  }
  return pantalla === "staff" ? "No se pudo cargar el avance." : "No se pudo registrar. Inténtalo otra vez.";
}
