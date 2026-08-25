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
import { URL_SITIO } from './src/config/sitio.js'

/**
 * Sustituye `%VITE_SITE_URL%` en `index.html`.
 *
 * ── `order: 'pre'` NO es opcional ───────────────────────────────────────────
 *
 * Vite trae su propia sustitución de `%VARIABLE%` en el HTML, y se ejecuta ANTES que los
 * plugins normales. Como `VITE_SITE_URL` no está definida en el entorno (a propósito: su
 * valor por defecto vive en `src/config/sitio.js`, no en un `.env`), Vite no la encontraba,
 * avisaba y dejaba el marcador tal cual.
 *
 * Resultado, y solo se veía levantando el servidor: en desarrollo el `og:url` y los dos
 * JSON-LD contenían literalmente la cadena `%VITE_SITE_URL%`. El build sí funcionaba, así
 * que ninguna de las cuatro puertas lo habría cazado nunca.
 *
 * Con `order: 'pre'` este plugin sustituye primero y Vite ya no encuentra nada que avisar.
 *
 * El valor sale de `src/config/sitio.js`, el mismo módulo que usa el JavaScript del sitio,
 * para que el HTML y la aplicación no puedan discrepar sobre cuál es su propia dirección.
 */
const urlDelSitio = () => ({
  name: 'url-del-sitio',
  transformIndexHtml: {
    order: 'pre',
    handler: (html) => html.split('%VITE_SITE_URL%').join(URL_SITIO),
  },
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
