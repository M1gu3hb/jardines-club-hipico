/**
 * telefono.js — convierte lo que un cliente escribió en un formulario en un enlace de WhatsApp.
 *
 * ── POR QUÉ ESTO NO ES `replace(/\D/g, "")` Y YA ────────────────────────────
 *
 * `wa.me/<numero>` abre un chat con QUIEN SEA que tenga ese número. Si la conversión se equivoca,
 * el dueño no ve un error: le escribe a un desconocido creyendo que es su cliente, con el nombre
 * y los datos del evento delante. Por eso la regla de este archivo es:
 *
 *   **ante la duda, `null`** — y sin número no se pinta el botón. Mejor copiar y pegar a mano una
 *   vez que abrir el chat equivocado una vez.
 *
 * ── LO QUE ESCRIBE LA GENTE DE VERDAD ───────────────────────────────────────
 *
 * Medido sobre las 11 solicitudes que hay en producción: **las 11 traen exactamente 10 dígitos**,
 * sin lada de país y sin separadores. El formulario no valida el formato —solo que no esté
 * vacío— así que el resto de formas son posibles y se cubren, pero ese es el caso normal.
 */

/**
 * @param {unknown} bruto lo que el cliente escribió en el campo «Teléfono / WhatsApp»
 * @returns {string|null} solo dígitos, listo para `wa.me/`, o `null` si no se puede afirmar
 */
export function numeroWhatsApp(bruto) {
  const crudo = String(bruto ?? "").trim();
  if (!crudo) return null;

  // EL CAMPO TIENE QUE PARECER UN TELÉFONO Y NADA MÁS. Solo dígitos y los separadores que la
  // gente escribe de verdad: espacios, `+`, guiones, paréntesis y puntos.
  //
  // Sin esta puerta bastaba con que los dígitos sueltos de cualquier texto sumaran una longitud
  // válida. Comprobado: `<img src=x onerror=alert(1)>5564395810` daba `15564395810` —el `1` del
  // `alert(1)` pegado delante— y salía un botón que abre el chat de UN DESCONOCIDO. No era una
  // inyección (el resultado son dígitos), pero sí exactamente el fallo que este archivo existe
  // para evitar. Una extensión («… ext 4») también cae aquí, y bien: eso no es un móvil.
  if (!/^[\d\s+().-]+$/.test(crudo)) return null;

  let d = crudo.replace(/\D/g, "");
  if (!d) return null;

  // Prefijo de marcación internacional escrito a mano: 00xx (Europa) u 011xx (Norteamérica).
  if (d.startsWith("011")) d = d.slice(3);
  else if (d.startsWith("00")) d = d.slice(2);

  let candidato = null;
  if (d.length === 10) {
    // México sin lada de país. EL CASO NORMAL: las 11 solicitudes reales son así.
    candidato = `52${d}`;
  } else if (d.length === 12 && d.startsWith("52")) {
    // Ya venía completo.
    candidato = d;
  } else if (d.length === 13 && d.startsWith("521")) {
    // El viejo formato de WhatsApp México (52 + 1 + celular). `wa.me` quiere 52 + 10.
    candidato = `52${d.slice(3)}`;
  } else if (d.length === 11 && d.startsWith("1")) {
    // EE. UU. / Canadá, que es de donde llega algún cliente.
    candidato = d;
  }
  // Cualquier otra longitud —una extensión pegada al final, un `01` de larga distancia, medio
  // número— NO se adivina. Un `0155…` de 12 dígitos, por ejemplo, cae aquí a propósito.

  // Invariante de salida: solo dígitos. De esto depende que el valor sea seguro dentro de una URL
  // y dentro de un atributo HTML.
  //
  // HOY ES REDUNDANTE, y conviene decirlo en vez de aparentar que protege algo: con la puerta de
  // forma de arriba puesta, `d` ya solo puede ser dígitos y todas las ramas construyen a partir
  // de `d` y de literales. Se comprobó mutándolo — quitar esta línea no cambia ningún resultado.
  // Se queda porque deja de ser redundante en el momento en que alguien afloje la puerta, que es
  // exactamente cuando haría falta.
  return candidato && /^[0-9]{10,15}$/.test(candidato) ? candidato : null;
}

/**
 * Enlace `wa.me` completo, con un saludo ya escrito en la caja de texto.
 *
 * El saludo NO se envía solo: WhatsApp lo deja en el campo de escritura para editarlo o borrarlo.
 * Va porque el objetivo de todo esto es ahorrar tiempo, y el folio es justo lo que habría que
 * teclear a mano. Para quitarlo, devolver solo `https://wa.me/${numero}`.
 */
export function enlaceWhatsApp(bruto, { nombre, folio } = {}) {
  const numero = numeroWhatsApp(bruto);
  if (!numero) return null;

  const saluda = String(nombre || "").trim().split(/\s+/)[0] || "";
  const texto =
    `Hola${saluda ? ` ${saluda}` : ""}, le escribo de Jardines Club Hípico. ` +
    `Recibimos su solicitud${folio ? ` (folio ${folio})` : ""} y con gusto le ayudo con la cotización.`;

  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}
