import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * datos.js — las lecturas del sitio, en un solo sitio.
 *
 * ── Por qué con react-query y no con `useEffect` ────────────────────────────
 *
 * Porque ahora hay varias páginas y casi todas quieren los mismos datos. La lista de espacios
 * la usan `/espacios`, la ficha de cada espacio, la Home, el selector de «Encuentra tu
 * espacio» y el formulario de cotización.
 *
 * Con `useEffect` en cada página, moverse por el sitio dispara la misma consulta una y otra
 * vez: se ve un parpadeo de vacío en cada navegación y se gasta cuota de Supabase para
 * traer exactamente lo mismo. Con una caché compartida, la segunda visita es instantánea.
 *
 * `staleTime` de cinco minutos: este contenido lo edita el dueño desde el panel cada varios
 * días, no cada varios segundos. Cinco minutos es invisible para él y ahorra casi todas las
 * lecturas de una sesión.
 *
 * ── Lo que NO hace ──────────────────────────────────────────────────────────
 *
 * No inventa datos de respaldo. Si Supabase no responde, la lista viene vacía y la pantalla
 * lo dice. El respaldo estático que hubo aquí no era una aproximación al recinto: era otro
 * recinto, con cinco salones que no existen y el jardín a la mitad de su capacidad real.
 *
 * ── Y POR QUÉ CASI TODAS LEEN EN MODO ESTRICTO ──────────────────────────────
 *
 * «La pantalla lo dice» era mentira, y lo fue durante todo el rediseño. `entities.X.list` y
 * `.filter` devuelven `[]` **tanto si no hay filas como si la lectura se cayó**: `runQuery`
 * escribe el error en la consola y devuelve la lista vacía. Con eso la promesa de react-query
 * SIEMPRE resuelve, así que `isError` era **falso para siempre** y las seis ramas de «no
 * pudimos cargar» del sitio —`/espacios`, la ficha de espacio, la de tipo de evento,
 * `/galeria`, `/avisos` y los destacados de la portada— nunca se ejecutaron ni una vez.
 *
 * Lo que se veía en su lugar era peor que un error, y le dolía a quien llega de fuera:
 *
 *   · Un enlace a `/espacios/salon-encanto` compartido por WhatsApp durante una caída
 *     enseñaba **«página no encontrada»**. Un 404 para una dirección que existe: quien lo
 *     recibe no entiende «vuelve luego», entiende «ese salón ya no está».
 *   · `/amenidades` pintaba un `<h1>` de **«0 amenidades»** justo encima de un texto que
 *     enumera inflables, cámara 360, pista pixel led y un mago.
 *
 * Por eso las lecturas que **DECIDEN** algo —si se pinta un 404, si se afirma un número—
 * usan `listEstricto`/`filterEstricto`, que propagan el error y encienden `isError` de verdad.
 *
 * Lo que NO se hizo, y es deliberado: cambiar `runQuery` para que lance siempre. Ese archivo
 * es copia byte a byte con el portal y el CRM (`scripts/compartidos.json`), y dentro de los
 * tres hay veintitantas lecturas decorativas escritas sin un solo `catch`. Hacerlas lanzar
 * cambiaría un dato de menos por una pantalla en blanco, en tres aplicaciones a la vez.
 *
 * Las tres que se quedan tolerantes son `useAlimentos`, `useServiciosExtra` y `useConfigSitio`:
 * ninguna decide un 404 ni sostiene un número en pantalla. Si fallan se pierde una fila de
 * etiquetas o un teléfono, y ninguna pantalla afirma algo falso por ello.
 */

const CINCO_MINUTOS = 5 * 60 * 1000;

const consulta = (clave, fn, extra = {}) => ({
  queryKey: clave,
  queryFn: fn,
  staleTime: CINCO_MINUTOS,
  ...extra,
});

/**
 * Todas las lecturas pasan por aqui, y no es solo por no repetirse.
 *
 * `useQuery` infiere `data` como `unknown` cuando la funcion no declara lo que devuelve, y
 * entonces CADA `.map()` y CADA `.filter()` sobre una lista es un error de tipos. Eran mas de
 * diez, todos el mismo error escrito diez veces. Anotarlo aqui una vez lo resuelve en todas.
 *
 * @param {any[]} clave
 * @param {() => Promise<any[]>} fn
 * @returns {{ data: any[] | undefined, isLoading: boolean, isError: boolean, isSuccess: boolean }}
 */
function useLista(clave, fn) {
  return /** @type {any} */ (useQuery(consulta(clave, fn)));
}

/** Los 8 espacios activos, en el orden que fijó el dueño. */
export const useSalones = () =>
  useLista(['salones'], () => base44.entities.Salon.filterEstricto({ activo: true }, 'orden'));

/**
 * Un espacio por su slug.
 *
 * Se filtra en memoria sobre la lista completa en vez de consultar por slug: son ocho filas,
 * la lista ya está en caché casi siempre, y así entrar a una ficha desde `/espacios` no
 * genera ni una petición más. Consultar por slug sería más "correcto" y mediblemente peor.
 */
export function useSalon(slug) {
  const q = useSalones();
  return {
    ...q,
    data: q.data?.find((s) => s.slug === slug),
    /**
     * La lista LLEGÓ, y llegó sin un solo espacio.
     *
     * No es lo mismo que «este slug no existe», y la diferencia decide qué se pinta. Un
     * `find` sobre una lista vacía devuelve `undefined` igual que un slug inventado, así que
     * sin este dato la ficha no puede distinguir «no hay tal salón» de «no hay NINGÚN salón»
     * — y acaba enseñando un 404 para una dirección real, que es el fallo que se comparte
     * por WhatsApp.
     *
     * Con las lecturas estrictas una caída ya viaja por `isError`; esto cubre el otro camino:
     * una respuesta correcta de cero filas (una política de lectura que se cierra de más).
     * Ahí no hay error que propagar y el sitio entero está roto, no ese slug.
     */
    listaVacia: q.isSuccess && (q.data?.length ?? 0) === 0,
  };
}

/**
 * Los tipos de evento PUBLICADOS.
 *
 * El filtro por `activo` no es un detalle: las seis filas nacieron apagadas porque su
 * contenido propio hoy es de cero palabras. Quitar este filtro publicaría seis páginas
 * prácticamente idénticas, que es contenido duplicado y penaliza a todo el sitio.
 */
export const useTiposEvento = () =>
  useLista(['tipos_evento'], () => base44.entities.TipoEvento.filterEstricto({ activo: true }, 'orden'));

/**
 * TODOS los tipos, apagados incluidos. Solo para el hub `/eventos`.
 *
 * El hub no es una página de contenido: es un desvío por intención. Alguien que llega
 * pensando «vengo por una boda» tiene que poder decirlo aunque `/eventos/bodas` todavía no
 * exista, y el hub lo manda entonces al formulario con el tipo ya puesto.
 *
 * Ocultar los tipos apagados dejaría el hub vacío hoy —las seis filas nacieron apagadas— y
 * perdería justamente la información más valiosa que trae una visita: a qué viene.
 */
export const useTodosLosTipos = () =>
  useLista(['tipos_evento', 'todos'], () => base44.entities.TipoEvento.listEstricto('orden'));

export function useTipoEvento(slug) {
  const q = useTiposEvento();
  return { ...q, data: q.data?.find((t) => t.slug === slug) };
}

/**
 * Los anuncios publicados.
 *
 * Fíjate en que aquí NO hay filtro por `activo` ni por vigencia, y no es un olvido: **el filtro
 * vive en la política de lectura de la base** (`sec_33`/`sec_34`). Un borrador o un aviso
 * caducado no llega hasta aquí — no es que se descarte al pintarlo: es que `anon` no puede
 * leerlo, ni consultando la tabla a mano.
 *
 * Es más seguro que filtrar en el cliente y además hace imposible el fallo clásico de olvidar
 * el filtro en una de las dos pantallas que leen lo mismo.
 */
export const useAnuncios = () =>
  useLista(['anuncios'], () => base44.entities.Anuncio.listEstricto('orden'));

export const useGaleria = () =>
  useLista(['galeria'], () => base44.entities.Galeria.listEstricto('orden'));

export const useServicios = () =>
  useLista(['servicios'], () => base44.entities.ServicioItem.listEstricto('orden'));

export const useAmenidades = () =>
  useLista(['amenidades'], () => base44.entities.AmenidadItem.listEstricto('orden'));

// Las dos TOLERANTES que quedan, y no por descuido: ver la cabecera del archivo. Ninguna
// decide un 404 ni sostiene un número, así que un fallo aquí quita una fila de etiquetas —
// no hace mentir a ninguna pantalla.
export const useServiciosExtra = () =>
  useLista(['servicios_extra'], () => base44.entities.ServicioExtra.list('orden'));

export const useAlimentos = () =>
  useLista(['alimentos'], () => base44.entities.AlimentoMenu.list('orden'));

/**
 * La configuración del sitio: teléfono, WhatsApp, correo, logo.
 *
 * Devuelve un objeto, no una lista, así que no puede pasar por `useLista`. Se anota igual,
 * por el mismo motivo: sin tipo, cada `config?.whatsappNumero` sería un error.
 *
 * @returns {{ data: any, isLoading: boolean, isError: boolean, isSuccess: boolean }}
 */
export const useConfigSitio = () =>
  /** @type {any} */ (
    useQuery(consulta(['config_sitio'], async () => (await base44.entities.ConfigSitio.list())[0] || {}))
  );

/** Los medios son videos si la extensión lo dice. Misma regla que usa el resto del sitio. */
export const esVideo = (url = '') => /\.(mp4|webm|mov|ogg|m4v)(\?|$)/i.test(url);
