import { createContext, useContext, useEffect } from 'react';
import { NOMBRE_SITIO, urlAbsoluta } from '@/config/sitio';

/**
 * Cabecera — el `<head>` de cada ruta, sin dependencias nuevas.
 *
 * ── Por qué no `react-helmet` ───────────────────────────────────────────────
 *
 * Porque hace falta muy poco y ese poco tiene que funcionar en dos entornos distintos: en el
 * navegador, moviendo etiquetas del DOM al cambiar de ruta; y en el prerender, donde no hay
 * DOM y hay que DEVOLVER las etiquetas como texto para meterlas en el HTML del build.
 *
 * Son sesenta líneas. Una dependencia más en el bundle público, con su propio historial de
 * incompatibilidades con React 18 en modo estricto, no se paga sola por esto.
 *
 * ── Cómo resuelve los dos entornos ──────────────────────────────────────────
 *
 * Durante el render hay un contexto opcional con un objeto mutable dentro. El prerender lo
 * provee; el navegador no. Cuando existe, `Cabecera` escribe ahí sus datos DURANTE el render
 * —no en un efecto, porque en el servidor los efectos no corren nunca— y `entrada-servidor`
 * los recoge al terminar. Cuando no existe, el efecto toca el `document` como siempre.
 *
 * ── Por qué se limpia lo que se pone ────────────────────────────────────────
 *
 * Cada etiqueta que este componente crea lleva `data-cabecera`. Al cambiar de ruta se borran
 * todas y se ponen las nuevas. Sin eso, navegar de un espacio a otro iría ACUMULANDO
 * `og:title` en el `<head>`: el navegador no se queja, pero los rastreadores leen el primero
 * que encuentran, que sería el de la página anterior.
 */

/** El recolector del prerender. `null` en el navegador. */
export const ContextoCabecera = createContext(null);

const MARCA = 'data-cabecera';

/** Compone el `<title>` firmando con el nombre del negocio, sin repetirlo si ya viene. */
function componeTitulo(titulo) {
  if (!titulo) return NOMBRE_SITIO;
  return titulo.includes(NOMBRE_SITIO) ? titulo : `${titulo} · ${NOMBRE_SITIO}`;
}

/**
 * Reúne las etiquetas de una ruta en una lista plana, que es lo que consumen los dos
 * entornos: el navegador la recorre creando nodos y el prerender la convierte en texto.
 */
export function etiquetasDe({ titulo, descripcion, ruta, imagen, noindex, jsonLd }) {
  const url = ruta ? urlAbsoluta(ruta) : undefined;
  const imagenAbs = imagen
    ? (imagen.startsWith('http') ? imagen : urlAbsoluta(imagen))
    : undefined;

  const metas = [];
  const enlaces = [];

  if (descripcion) metas.push({ name: 'description', content: descripcion });

  // `noindex` no impide que la página funcione: impide que compita en resultados. Se usa en
  // lo que existe pero no aporta al buscador, como el formulario de cotización.
  if (noindex) metas.push({ name: 'robots', content: 'noindex, follow' });

  if (url) {
    enlaces.push({ rel: 'canonical', href: url });
    metas.push({ property: 'og:url', content: url });
  }

  metas.push({ property: 'og:type', content: 'website' });
  metas.push({ property: 'og:site_name', content: NOMBRE_SITIO });
  metas.push({ property: 'og:locale', content: 'es_MX' });
  metas.push({ property: 'og:title', content: componeTitulo(titulo) });
  if (descripcion) metas.push({ property: 'og:description', content: descripcion });
  if (imagenAbs) metas.push({ property: 'og:image', content: imagenAbs });

  // Twitter lee `summary_large_image` para enseñar la foto grande. Sin esto, un enlace
  // compartido sale como una línea de texto y pierde todo el atractivo del recinto.
  metas.push({ name: 'twitter:card', content: imagenAbs ? 'summary_large_image' : 'summary' });
  metas.push({ name: 'twitter:title', content: componeTitulo(titulo) });
  if (descripcion) metas.push({ name: 'twitter:description', content: descripcion });
  if (imagenAbs) metas.push({ name: 'twitter:image', content: imagenAbs });

  return { titulo: componeTitulo(titulo), metas, enlaces, jsonLd: jsonLd || null };
}

export default function Cabecera(props) {
  const recolector = useContext(ContextoCabecera);
  const datos = etiquetasDe(props);

  // EN EL SERVIDOR: durante el render, porque los efectos no corren. Escribir en un objeto
  // del contexto durante el render es un efecto secundario y en general está mal; aquí es
  // deliberado y está acotado al prerender, que renderiza una sola vez y tira el árbol.
  if (recolector) recolector.datos = datos;

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    document.title = datos.titulo;

    document.querySelectorAll(`[${MARCA}]`).forEach((n) => n.remove());

    const creados = [];

    datos.metas.forEach((m) => {
      // SE RETIRA LA QUE YA HUBIERA, y esto es lo que arregla un fallo silencioso de verdad.
      //
      // `index.html` trae su propio `og:url`, su `og:title` y su `description`: los de la
      // portada. Al añadir los de esta ruta SIN quitar aquéllos, el `<head>` acaba con dos
      // etiquetas del mismo nombre — y todo rastreador lee LA PRIMERA. O sea que cada página
      // interior le estaba diciendo a WhatsApp y a Google el título y la URL de la portada,
      // con la página correcta escrita justo debajo, sin verse.
      //
      // Se comprobó en el navegador: en `/espacios`, `og:url` seguía siendo la raíz del sitio.
      // Ninguna de las cuatro puertas del proyecto puede cazar esto, porque no es un error.
      const selector = m.name
        ? `meta[name="${m.name}"]:not([${MARCA}])`
        : `meta[property="${m.property}"]:not([${MARCA}])`;
      document.head.querySelectorAll(selector).forEach((n) => n.remove());

      const el = document.createElement('meta');
      if (m.name) el.setAttribute('name', m.name);
      if (m.property) el.setAttribute('property', m.property);
      el.setAttribute('content', m.content);
      el.setAttribute(MARCA, '');
      document.head.appendChild(el);
      creados.push(el);
    });

    datos.enlaces.forEach((l) => {
      // El canonical de `index.html` es el de la Home. Si se dejara puesto, TODA página
      // interna le estaría diciendo a Google «la buena es la portada», y ninguna se
      // indexaría por su cuenta. Se retira antes de poner el propio.
      document.head
        .querySelectorAll(`link[rel="${l.rel}"]:not([${MARCA}])`)
        .forEach((n) => n.remove());
      const el = document.createElement('link');
      el.setAttribute('rel', l.rel);
      el.setAttribute('href', l.href);
      el.setAttribute(MARCA, '');
      document.head.appendChild(el);
      creados.push(el);
    });

    if (datos.jsonLd) {
      const el = document.createElement('script');
      el.type = 'application/ld+json';
      el.textContent = JSON.stringify(datos.jsonLd);
      el.setAttribute(MARCA, '');
      document.head.appendChild(el);
      creados.push(el);
    }

    return () => creados.forEach((el) => el.remove());
    // Se compara el contenido serializado y no las props una a una: `jsonLd` es un objeto
    // literal que se recrea en cada render, y compararlo por identidad haría que el efecto
    // se re-ejecutara siempre, tirando y recreando el `<head>` en cada pintada.
  }, [JSON.stringify(datos)]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
