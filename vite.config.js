import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

/**
 * LA URL DEL SITIO, EN UN SOLO SITIO.
 *
 * `index.html` tenía escrito a mano `https://jardinesclubhipico.com` en el `og:url` y en los
 * dos bloques de JSON-LD. **Ese dominio no es nuestro**: el `.com` y el `.com.mx` están en
 * manos de terceros y el propio no se ha comprado todavía.
 *
 * No es cosmético. `og:url` y el `url` de un JSON-LD le dicen a Google cuál es la casa
 * oficial del negocio, así que estábamos declarando que la nuestra es la de otro. Y cuando
 * alguien compartía el sitio por WhatsApp, la tarjeta apuntaba ahí.
 *
 * Ahora sale de `VITE_SITE_URL`. El respaldo es el dominio real de hoy, no el ajeno: si la
 * variable falta, el peor caso es apuntar a la URL de Vercel, que sí es nuestra. El día que
 * se compre el `.mx` se cambia la variable y no se toca una línea de código.
 */
const SITIO = process.env.VITE_SITE_URL || 'https://jardines-club-hipico.vercel.app'

/** Sustituye `%VITE_SITE_URL%` en `index.html` durante el build. */
const urlDelSitio = () => ({
  name: 'url-del-sitio',
  transformIndexHtml: (html) => html.split('%VITE_SITE_URL%').join(SITIO),
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), urlDelSitio()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
