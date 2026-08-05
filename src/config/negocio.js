/**
 * LOS DATOS DE CONTACTO DEL NEGOCIO — un solo sitio.
 *
 * Por qué existe este archivo, y por qué no contradice la regla «no hay fallback estático del
 * contenido»:
 *
 * El contenido del sitio (salones, galería, textos) vive en Supabase y no tiene respaldo: si la
 * base no responde, se renderiza vacío. Eso es correcto para contenido que cambia. **El teléfono
 * del negocio no es contenido**: es un hecho, y hasta hoy estaba escrito a mano en seis sitios
 * distintos con un número EQUIVOCADO.
 *
 * Medido contra producción el 2026-08-05:
 *
 *     jardines.config_sitio.telefono_contacto = '+52 55 2311 8153'
 *     jardines.config_sitio.whatsapp_numero   = '525523118153'
 *     jardines.config_sitio.correo_admin      = 'jardinesclubhipico@gmail.com'
 *
 * Y lo que el código decía en su lugar:
 *
 *     "525548663656"                    ← en 5 componentes + el JSON-LD de `index.html`
 *     "+52 55 0000 0000"                ← `ContactoSection`, con su `tel:5500000000`
 *     "contacto@jardinesclubhipico.mx"  ← un dominio que no es el del negocio
 *
 * El JSON-LD es lo más grave: es HTML estático, no pasa por Supabase, y es lo que Google publica
 * en la ficha del negocio. Llevaba un número que no es el suyo.
 *
 * REGLA DE USO: la base MANDA siempre. Esto solo se usa cuando `config_sitio` no ha llegado, y
 * entonces dice la verdad en vez de inventarla. Si el dueño cambia el número en el panel Admin, el
 * sitio usa el nuevo; este archivo solo queda desactualizado como respaldo, y el contrato `1.4`
 * ata su valor al del JSON-LD para que los dos no puedan divergir en silencio.
 */

/** WhatsApp, en el formato que espera `wa.me/` (sin `+`, sin espacios). */
export const WHATSAPP = "525523118153";

/** Teléfono para mostrar. El `tel:` se deriva quitando lo que no es dígito. */
export const TELEFONO = "+52 55 2311 8153";

/** Correo del negocio. El mismo que recibe las solicitudes del formulario. */
export const CORREO = "jardinesclubhipico@gmail.com";

/** Dirección visible. Coincide con el `PostalAddress` del JSON-LD de `index.html`. */
export const UBICACION = "Sta Inés, Xochimilco, 16810 CDMX";

/** Enlace al mapa. Antes el respaldo era `https://maps.google.com` — el mapa de nadie. */
export const MAPA = "https://maps.app.goo.gl/s52mSRk6gAvtBKn1A";
