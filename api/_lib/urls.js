// api/_lib/urls.js — LAS TRES URL DEL ECOSISTEMA, EN UN SOLO SITIO.
//
// Vivían dentro de `correo.js` porque al principio solo las usaban los correos. Desde la
// FASE 4 también las necesita `canjear-acceso.js`, que decide a qué aplicación mandar a
// alguien después de canjear su enlace de primer acceso — y hacerle importar `correo.js`
// le habría metido nodemailer en el paquete para leer una cadena.
//
// `correo.js` las re-exporta, así que los `import { URL_WEB } from "./_lib/correo.js"` que
// ya existían siguen funcionando sin tocarlos.
//
// EL VALOR POR DEFECTO ES EL DE LA WEB a propósito: si una variable falta, el enlace lleva
// a un sitio que existe en vez de a `undefined/...`. Pero es un paracaídas, no la
// configuración: las tres se definen de verdad en cada proyecto de Vercel.
const URL_HOY = "https://jardines-club-hipico.vercel.app";

/** Sitio público. Sirve los medios (el logo de los correos) y las páginas de marketing. */
export const URL_WEB = process.env.URL_WEB || URL_HOY;
/** Portal del cliente. Su RAÍZ es el portal: no lleva sufijo `/portal`. */
export const URL_PORTAL = process.env.URL_PORTAL || URL_HOY;
/** CRM / punto de venta. El panel vive tras `ADMIN_SLUG`, no en la raíz. */
export const URL_CRM = process.env.URL_CRM || URL_HOY;

/** Ruta del panel dentro del CRM. Una sola definición para correos y redirecciones. */
export const RUTA_PANEL = process.env.VITE_ADMIN_SLUG || "gestion-jch-9f27ax";
