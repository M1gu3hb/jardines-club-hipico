import { renderToString } from 'react-dom/server';
// En React Router 7 `StaticRouter` se exporta desde el paquete raíz. El sub-módulo
// `react-router-dom/server`, que es donde vivía en la 6, YA NO EXISTE: importarlo de ahí
// rompe el build con «Missing "./server" specifier».
import { StaticRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CARGADORES } from '@/paginas';
import { ContextoCabecera } from '@/lib/Cabecera';
import ArbolDeRutas from '@/ArbolDeRutas';

/**
 * entrada-servidor.jsx — pinta una ruta a HTML, en el build.
 *
 * ── Por qué prerenderizar, si Google ejecuta JavaScript ─────────────────────
 *
 * Porque «ejecuta JavaScript» no es lo mismo que «lo ejecuta siempre y pronto». Google
 * rastrea el HTML primero y deja el renderizado para una segunda pasada que puede tardar
 * días. Y hay muchos lectores que NO ejecutan nada: la vista previa de WhatsApp, la de
 * Facebook, la de X, la de Slack, muchos agregadores. Para todos ellos una aplicación de una
 * sola página es un `<div id="root">` vacío.
 *
 * Un recinto de eventos se comparte por WhatsApp constantemente. Que el enlace salga sin
 * título, sin descripción y sin foto es dinero perdido en el sitio exacto donde ocurre la
 * recomendación.
 *
 * ── Los datos entran YA CARGADOS ────────────────────────────────────────────
 *
 * `renderToString` es SÍNCRONO: no espera a nadie. Si las páginas pidieran sus datos aquí, el
 * HTML saldría con «Cargando…» congelado — que es peor que no prerenderizar, porque esa
 * palabra sería el contenido indexado.
 *
 * Así que el guion los trae antes y los siembra en una caché nueva **por ruta**. Nueva y no
 * compartida: un `QueryClient` reutilizado entre renders arrastra estado de la página
 * anterior, y en un bucle de veintitantas rutas eso acaba mezclando datos de una en otra.
 *
 * ── Y el `<head>` sale por el contexto ──────────────────────────────────────
 *
 * `Cabecera` normalmente toca el `document`, que aquí no existe. Cuando encuentra el
 * recolector del contexto escribe en él durante el render, y al terminar lo leemos de vuelta.
 * Es la misma pieza sirviendo a los dos mundos, sin una segunda implementación que mantener.
 */

/**
 * Trae de la base todo lo que pinta el sitio, una sola vez para todo el build.
 *
 * ── Por qué vive aquí y no en `scripts/prerender.mjs` ───────────────────────
 *
 * Porque usa **el mismo shim que usan las páginas**. El shim traduce `snake_case` a
 * `camelCase`, aplica el orden por defecto y decide cómo se lee cada tabla. Si el guion
 * consultara Supabase por su cuenta tendría que repetir esas reglas, y la primera vez que
 * alguien tocara una —una columna nueva, un orden distinto— el prerender empezaría a
 * generar un HTML que no se parece a lo que ve el visitante. Sin fallar.
 *
 * Las claves son EXACTAMENTE las de `src/lib/datos.js`. Una que no coincida no rompe nada:
 * simplemente esa consulta no encuentra su siembra y la página se prerenderiza vacía. Por eso
 * el guion comprueba después que el HTML lleva contenido de verdad.
 */
export async function traeDatos() {
  const { base44 } = await import('@/api/base44Client');

  const [salones, tipos, galeria, servicios, amenidades, alimentos, config] = await Promise.all([
    base44.entities.Salon.filter({ activo: true }, 'orden'),
    base44.entities.TipoEvento.list('orden'),
    base44.entities.Galeria.list('orden'),
    base44.entities.ServicioItem.list('orden'),
    base44.entities.AmenidadItem.list('orden'),
    base44.entities.AlimentoMenu.list('orden'),
    base44.entities.ConfigSitio.list(),
  ]);

  return {
    salones,
    tipos,
    siembra: [
      { clave: ['salones'], datos: salones },
      { clave: ['tipos_evento'], datos: tipos.filter((t) => t.activo) },
      { clave: ['tipos_evento', 'todos'], datos: tipos },
      { clave: ['galeria'], datos: galeria },
      { clave: ['servicios'], datos: servicios },
      { clave: ['amenidades'], datos: amenidades },
      { clave: ['alimentos'], datos: alimentos },
      { clave: ['config_sitio'], datos: config[0] || {} },
    ],
  };
}

/** Módulos de página, resueltos una sola vez para todo el build. */
let paginasResueltas = null;

async function resuelvePaginas() {
  if (paginasResueltas) return paginasResueltas;
  const pares = await Promise.all(
    Object.entries(CARGADORES).map(async ([clave, carga]) => [clave, (await carga()).default]),
  );
  paginasResueltas = Object.fromEntries(pares);
  return paginasResueltas;
}

/**
 * Pinta una ruta.
 *
 * @param {string} ruta Camino a pintar, por ejemplo `/espacios/salon-encanto`.
 * @param {Array<{clave: any[], datos: any}>} siembra Datos ya traídos, por clave de consulta.
 * @returns {Promise<{html: string, cabecera: any}>}
 */
export async function pinta(ruta, siembra = []) {
  const paginas = await resuelvePaginas();

  const cache = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        // Sin reintentos y sin caducidad: en el build no hay a quién reintentar ni tiempo que
        // pase. Cualquier consulta que no venga sembrada tiene que fallar rápido y en seco, no
        // quedarse esperando y dejar el render a medias.
        staleTime: Infinity,
        gcTime: Infinity,
      },
    },
  });

  siembra.forEach(({ clave, datos }) => cache.setQueryData(clave, datos));

  const recolector = { datos: null };

  const html = renderToString(
    <QueryClientProvider client={cache}>
      <ContextoCabecera.Provider value={recolector}>
        <StaticRouter location={ruta}>
          <ArbolDeRutas paginas={paginas} />
        </StaticRouter>
      </ContextoCabecera.Provider>
    </QueryClientProvider>,
  );

  cache.clear();

  return { html, cabecera: recolector.datos };
}
