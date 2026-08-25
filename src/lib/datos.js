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
  useLista(['salones'], () => base44.entities.Salon.filter({ activo: true }, 'orden'));

/**
 * Un espacio por su slug.
 *
 * Se filtra en memoria sobre la lista completa en vez de consultar por slug: son ocho filas,
 * la lista ya está en caché casi siempre, y así entrar a una ficha desde `/espacios` no
 * genera ni una petición más. Consultar por slug sería más "correcto" y mediblemente peor.
 */
export function useSalon(slug) {
  const q = useSalones();
  return { ...q, data: q.data?.find((s) => s.slug === slug) };
}

/**
 * Los tipos de evento PUBLICADOS.
 *
 * El filtro por `activo` no es un detalle: las seis filas nacieron apagadas porque su
 * contenido propio hoy es de cero palabras. Quitar este filtro publicaría seis páginas
 * prácticamente idénticas, que es contenido duplicado y penaliza a todo el sitio.
 */
export const useTiposEvento = () =>
  useLista(['tipos_evento'], () => base44.entities.TipoEvento.filter({ activo: true }, 'orden'));

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
  useLista(['tipos_evento', 'todos'], () => base44.entities.TipoEvento.list('orden'));

export function useTipoEvento(slug) {
  const q = useTiposEvento();
  return { ...q, data: q.data?.find((t) => t.slug === slug) };
}

export const useGaleria = () => useLista(['galeria'], () => base44.entities.Galeria.list('orden'));

export const useServicios = () =>
  useLista(['servicios'], () => base44.entities.ServicioItem.list('orden'));

export const useAmenidades = () =>
  useLista(['amenidades'], () => base44.entities.AmenidadItem.list('orden'));

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
