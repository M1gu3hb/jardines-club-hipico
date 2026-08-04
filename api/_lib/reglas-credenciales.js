// api/_lib/reglas-credenciales.js — Las reglas de usuario y contraseña, en UN solo sitio.
//
// POR QUÉ EXISTE ESTE ARCHIVO
//   El dueño creó "Boda ortega" cuatro veces creyendo que fallaba. Las tres primeras dejaron
//   el evento creado y sin usuario. La causa: el cliente y el servidor validaban cosas
//   distintas.
//
//     cliente  →  password.length < 6    ·  usuario: solo .trim() no vacío
//     servidor →  password.length < 8    ·  usuario: /^[a-zA-Z0-9._-]{3,60}$/
//
//   Una contraseña de 6 o 7 caracteres, o un usuario con espacio, acento o ñ, pasaba el
//   formulario y lo rechazaba el servidor con un 400 que solo decía "Solicitud inválida".
//
//   Duplicar las reglas en dos archivos es lo que permitió que divergieran, así que **no se
//   duplican**: viven aquí y las importan los dos.
//     - servidor: `api/crear-usuario-evento.js`
//     - cliente:  `src/components/admin/eventos/AdminEventos.jsx` y `EventoDatos.jsx`
//
//   Este módulo es **solo constantes y funciones puras**: sin `process.env`, sin imports de
//   Node y sin secretos, precisamente para que el navegador lo pueda incluir sin arrastrar
//   nada del servidor.

/** Letras sin acentos, números, punto, guion y guion bajo. De 3 a 60. */
export const USUARIO_RE = /^[a-zA-Z0-9._-]{3,60}$/;
export const USUARIO_MIN = 3;
export const USUARIO_MAX = 60;
/**
 * MÍNIMO DE CONTRASEÑA — y por qué 8 es un SUELO, no una preferencia.
 *
 * Hay TRES validadores, no dos. Este archivo lo comparten cliente y servidor, así que entre
 * ellos no pueden divergir. Pero **GoTrue tiene su propia política** —longitud mínima,
 * caracteres exigidos, rechazo de contraseñas filtradas— y es **configuración global del
 * proyecto de Supabase**, la misma que usa Vero Seguros (ver `docs/SEGURIDAD.md` §9.1). No se
 * puede leer desde el código ni desde las herramientas de esta sesión, y **no se debe tocar**.
 *
 * Consecuencia: bajar este número no reabre la divergencia entre los dos JS —se mueven a la
 * vez— pero sí puede reabrirla contra Auth. Si aquí dijera 6 y GoTrue exige 8, el formulario
 * aceptaría y el alta moriría en `createUser`: la misma forma del bug original, un piso más
 * abajo.
 *
 * 8 es el suelo porque es lo que Supabase recomienda explícitamente ("anything less than 8
 * characters is not recommended") y porque el mínimo de GoTrue por defecto es 6: cualquier
 * proyecto configurado por encima del defecto estará en 8 o más. Si alguna vez se sube la
 * política de Auth por encima de 8, hay que subir esta constante también — y hasta entonces,
 * `api/crear-usuario-evento.js` traduce el rechazo de Auth a un mensaje que dice qué pasó.
 *
 * Un contrato de `scripts/test-contratos-api.mjs` impide bajarlo.
 */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 200;
export const NOMBRE_MAX = 120;

/** Explicación de las reglas, para enseñarla en el formulario ANTES de que falle. */
export const AYUDA_USUARIO =
  `Entre ${USUARIO_MIN} y ${USUARIO_MAX} caracteres: letras sin acentos, números, punto, guion y guion bajo. Sin espacios ni ñ.`;
export const AYUDA_PASSWORD = `Mínimo ${PASSWORD_MIN} caracteres.`;

const no = (campo, mensaje) => ({ ok: false, campo, mensaje });

/**
 * Valida las credenciales. La usan cliente y servidor, así que **no pueden discrepar**.
 *
 * Devuelve SIEMPRE la misma forma —`{ok, campo, mensaje}`— en vez de una unión discriminada:
 * el llamador no tiene que estrechar tipos para leer el mensaje, y `campo` es justo lo que
 * faltaba antes (ni el 400 del servidor ni el formulario decían cuál de los dos estaba mal).
 * Aquí no se filtra nada sensible: es el propio admin escribiendo su formulario.
 *
 * @returns {{ok: boolean, campo: string, mensaje: string}}
 */
export function validarCredenciales({ usuario, password, nombre }) {
  const u = String(usuario ?? "");
  const p = String(password ?? "");

  if (!u) return no("usuario", "Falta el usuario del cliente.");
  if (!USUARIO_RE.test(u)) {
    return no("usuario", u.length < USUARIO_MIN || u.length > USUARIO_MAX
      ? `El usuario debe tener entre ${USUARIO_MIN} y ${USUARIO_MAX} caracteres.`
      : `El usuario «${u}» tiene caracteres que no se admiten. ${AYUDA_USUARIO}`);
  }

  if (!p) return no("password", "Falta la contraseña.");
  if (p.length < PASSWORD_MIN) {
    return no("password", `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres (lleva ${p.length}).`);
  }
  if (p.length > PASSWORD_MAX) {
    return no("password", `La contraseña no puede pasar de ${PASSWORD_MAX} caracteres.`);
  }

  if (nombre != null && String(nombre).length > NOMBRE_MAX) {
    return no("nombre", `El nombre no puede pasar de ${NOMBRE_MAX} caracteres.`);
  }

  return { ok: true, campo: "", mensaje: "" };
}
