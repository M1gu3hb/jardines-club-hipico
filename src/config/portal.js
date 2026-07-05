/**
 * portal.js — Configuración de rutas y auth del portal/admin.
 *
 * - ADMIN_SLUG: ruta secreta del panel de administración (no adivinable, sin enlaces
 *   públicos). La seguridad real es el login + RLS; el secreto de la URL es una capa extra
 *   que el dueño pidió. Se puede sobreescribir con la env `VITE_ADMIN_SLUG` sin tocar código.
 * - CLIENTE_EMAIL_DOMINIO: dominio del email SINTÉTICO interno de los clientes. El cliente
 *   nunca ve ni teclea este email; solo usa usuario + contraseña. Supabase Auth exige un email,
 *   así que se deriva del usuario.
 */

export const ADMIN_SLUG = import.meta.env.VITE_ADMIN_SLUG || "gestion-jch-9f27ax";

export const CLIENTE_EMAIL_DOMINIO = "portal.jardines.local";

/** Normaliza un usuario a un email sintético estable (minúsculas, sin espacios). */
export function usuarioAEmail(usuario) {
  const limpio = String(usuario || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9._-]/g, "");
  return `${limpio}@${CLIENTE_EMAIL_DOMINIO}`;
}
