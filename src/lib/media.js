/**
 * media.js — utilidades de medios para el portal.
 * Varias amenidades/servicios tienen VIDEO en `imagen_url` (o no tienen imagen).
 * Un <img> con un video pinta el ícono de "imagen rota". Estas funciones eligen
 * SOLO imágenes reales; si no hay, devuelven null para usar un ícono elegante.
 */
const RE_VIDEO = /\.(mp4|webm|mov|ogg|m4v)(\?.*)?$/i;
const RE_IMAGEN = /\.(jpe?g|png|webp|gif|avif|svg)(\?.*)?$/i;

/** true si la URL apunta a una imagen usable en <img>. */
export function esImagen(url) {
  if (!url || typeof url !== "string") return false;
  if (RE_VIDEO.test(url)) return false;
  // Aceptamos extensiones de imagen conocidas, o rutas sin extensión (CDN).
  return RE_IMAGEN.test(url) || !/\.\w{2,4}(\?.*)?$/.test(url);
}

/**
 * Primera imagen REAL de un ítem del catálogo (imagenUrl o imagenesUrl[]),
 * ignorando videos. Devuelve null si no hay ninguna imagen mostrable.
 */
export function imagenDe(item) {
  if (!item) return null;
  if (esImagen(item.imagenUrl)) return item.imagenUrl;
  if (esImagen(item.imagenPrincipal)) return item.imagenPrincipal;
  const arr = item.imagenesUrl || item.imagenes || [];
  const real = Array.isArray(arr) ? arr.find((u) => esImagen(u)) : null;
  return real || null;
}
