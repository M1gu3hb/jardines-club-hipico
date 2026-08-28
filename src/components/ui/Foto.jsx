import { useCallback, useEffect, useRef, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { atributosDeImagen } from '@/lib/imagen';

/**
 * Foto — una imagen que aparece entera o no aparece.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * EL OBJETIVO, EN PALABRAS DEL DUEÑO
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * *«Que nunca dé la apariencia de que están rotas, o que cargan, o que tardan muchísimo. No
 * quiero que la imagen se vea primero a 240 y luego salte a 1080. El objetivo es que carguen
 * siempre.»*
 *
 * Tres reglas salen de ahí, y este componente no hace nada más:
 *
 *   1. **Nunca se ve pintarse.** Se espera a que el archivo esté descargado Y decodificado, y
 *      solo entonces se enseña, con un fundido. Ver `decode()`, abajo.
 *   2. **Nunca salta de calidad.** No hay versión previa borrosa que se sustituya después: eso
 *      ES el salto de 240 a 1080 que él no quiere. Mientras no está, hay un marcador NEUTRO.
 *   3. **Nunca queda un icono roto.** Si falla, se reintenta; si sigue fallando, hay un hueco
 *      con sentido en vez del icono partido del navegador.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * POR QUÉ `decode()` Y NO EL EVENTO `load`
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Un JPEG progresivo se dibuja en pasadas: primero borroso, luego nítido. Y aunque no lo sea,
 * el navegador puede pintar la imagen a franjas conforme llegan los bytes. El evento `load`
 * llega cuando terminó de descargar, pero el pintado ya empezó — por eso se ve «cargando».
 *
 * `img.decode()` devuelve una promesa que se resuelve cuando el archivo está descargado **y
 * descomprimido en memoria**, listo para dibujarse de una vez. Manteniendo la imagen invisible
 * hasta ese momento, el navegador nunca la dibuja a medias: aparece completa.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * EL REINTENTO, Y POR QUÉ ES NECESARIO AQUÍ
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * *«Una imagen de plano nunca termina de cargar y se queda en error, como si el navegador se
 * rindiera.»* Eso pasa de verdad: en una conexión móvil inestable, una petición puede morir a
 * medias, y el navegador **no lo reintenta solo**. La imagen queda muerta hasta que se recarga
 * la página entera.
 *
 * Aquí se reintenta dos veces con una espera creciente, añadiendo un parámetro que cambia para
 * que la petición no salga de la caché fallida. Si tras eso no hay imagen, se enseña un hueco
 * discreto — nunca el icono roto.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * PRIORIDAD
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * `prioridad` es para lo que se ve sin desplazarse: el hero, la primera fila de una galería.
 * Descarga sin esperar y le pide al navegador que la ponga por delante del resto de la cola.
 *
 * Todo lo demás va con `loading="lazy"`, que es lo que impide que sesenta y nueve fotos
 * compitan a la vez por el mismo ancho de banda — la causa real de que «unas carguen y otras
 * no».
 */

const REINTENTOS = 2;
const ESPERA_BASE = 700;

/**
 * Cuánto se espera como máximo a que `decode()` resuelva antes de enseñar la imagen igual.
 *
 * Medio segundo es de sobra para decodificar cualquier foto ya descargada —el trabajo es de
 * milisegundos— así que en la práctica este plazo nunca se agota. Está para el caso en que
 * `decode()` se quede colgado: ver la nota de `alDescargar`.
 */
const ESPERA_DECODE = 500;

/**
 * @param {Object}  props
 * @param {string}  props.url              Ruta del original.
 * @param {string}  [props.alt]            Vacío para decorativas.
 * @param {string}  [props.className]      Clases del `<img>`.
 * @param {string}  [props.claseContenedor]
 * @param {boolean} [props.prioridad]      `true` para lo visible sin desplazarse.
 * @param {string}  [props.sizes]          Cuánto ancho ocupará. Ver la nota de abajo.
 * @param {number}  [props.calidad]
 * @param {any}     [props.children]       Se pinta encima (insignias, degradados).
 */
export default function Foto({
  url,
  alt = '',
  className = '',
  claseContenedor = '',
  prioridad = false,
  // `sizes` NO es opcional de verdad: sin él el navegador supone que la imagen ocupará el
  // ancho completo de la ventana y elige la variante más grande de `srcset`, tirando por
  // tierra media optimización. El valor por defecto es conservador; cada sitio de uso debería
  // pasar el suyo.
  sizes = '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw',
  calidad,
  children,
}) {
  const [estado, setEstado] = useState('cargando'); // cargando · lista · rota
  const [intento, setIntento] = useState(0);
  const imgRef = useRef(null);
  const vivo = useRef(true);

  useEffect(() => () => { vivo.current = false; }, []);

  // Si cambia la dirección, se vuelve a empezar: sin esto, la imagen anterior se quedaría
  // marcada como lista y la nueva aparecería de golpe sin su fundido.
  useEffect(() => {
    setEstado('cargando');
    setIntento(0);
  }, [url]);

  const { src, srcSet, width, height } = atributosDeImagen(url);

  // El reintento añade un parámetro que cambia para saltarse la caché de la petición fallida.
  const sufijo = intento > 0 ? `${src.includes('?') ? '&' : '?'}r=${intento}` : '';

  /**
   * Cuando el navegador dice que descargó, se espera además a que decodifique.
   *
   * ── LA RED DE SEGURIDAD, Y POR QUÉ NO ES OPCIONAL ───────────────────────
   *
   * `decode()` NO garantiza resolverse siempre. En una pestaña que el navegador no está
   * dibujando —en segundo plano, o minimizada— puede quedarse pendiente indefinidamente,
   * porque no hay nada que pintar. Y si se espera a esa promesa para enseñar la foto, la foto
   * **no aparece nunca**.
   *
   * Ese fallo ya se cometió una vez en este sitio, con el splash: algo que solo se veía si una
   * animación llegaba a ejecutarse. La regla que salió de ahí vale igual aquí: **si algo
   * falla, tiene que fallar hacia «se ve», no hacia «no se ve»**.
   *
   * Así que se compite `decode()` contra un temporizador. Lo normal es que gane `decode()` en
   * unos milisegundos y la foto entre completa, que es todo el objetivo. Si no gana, se enseña
   * igual: en el peor caso se ve pintarse — molesto — en vez de no verse — inaceptable.
   *
   * `decode()` también puede rechazar si la imagen salió del documento mientras tanto. Ese
   * caso se traga en silencio: no es un fallo de carga.
   */
  const alDescargar = useCallback(async () => {
    const el = imgRef.current;
    if (!el) return;

    if (typeof el.decode === 'function') {
      const decodificada = el.decode().catch(() => {});
      const plazo = new Promise((resolver) => setTimeout(resolver, ESPERA_DECODE));
      await Promise.race([decodificada, plazo]);
    }

    if (vivo.current) setEstado('lista');
  }, []);

  /**
   * ══════════════════════════════════════════════════════════════════════════
   * EL EVENTO QUE NUNCA LLEGA — la causa real de «hay fotos que no cargan»
   * ══════════════════════════════════════════════════════════════════════════
   *
   * `onLoad` **no se dispara si la imagen ya estaba completa antes de que React
   * enganchara el manejador**, y eso pasa constantemente con las que vienen de la caché del
   * navegador: se resuelven en el mismo instante en que se les pone el `src`, antes de que el
   * componente termine de montarse. El evento se pierde, `estado` se queda en «cargando» y la
   * foto permanece en `opacity: 0` — descargada, decodificada y **para siempre invisible**.
   *
   * Medido en producción sobre la galería, con la caché ya caliente: **7 de 69 fotos** se
   * quedaban así. Sin nada roto en la red: las 69 peticiones acabaron bien.
   *
   * Por eso aquí no se espera al evento, se PREGUNTA por el estado. `complete` con
   * `naturalWidth > 0` significa que los píxeles ya están; que además llegara el aviso es
   * indiferente. Es la misma regla que rige el resto del sitio: **si algo falla, tiene que
   * fallar hacia «se ve», no hacia «no se ve»** — y esperar un evento es confiar en que llegue.
   */
  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) alDescargar();
  }, [src, intento, alDescargar]);

  const alFallar = () => {
    if (intento < REINTENTOS) {
      // Espera creciente: si la red está saturada, insistir de inmediato solo la satura más.
      const espera = ESPERA_BASE * (intento + 1);
      setTimeout(() => {
        if (vivo.current) setIntento((n) => n + 1);
      }, espera);
      return;
    }
    if (vivo.current) setEstado('rota');
  };

  return (
    <span className={`relative block overflow-hidden bg-white/[0.04] ${claseContenedor}`}>
      {/* EL MARCADOR. Neutro a propósito: NO es una miniatura borrosa de la propia foto.
          Una miniatura que después se sustituye es exactamente el salto de calidad que el
          dueño no quiere ver.

          Y QUIETO, no parpadeante. Antes latía con `animate-pulse`, y eso trabajaba contra el
          objetivo declarado —«que nunca se note que las imágenes tienen que cargar»—: un
          rectángulo que late es una animación cuyo único mensaje es «estoy cargando». Llama la
          atención justo hacia lo que no debería verse. Una superficie quieta se lee como parte
          del fondo y la foto simplemente aparece encima. */}
      {estado === 'cargando' && (
        <span
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-white/[0.02] to-transparent"
        />
      )}

      {estado === 'rota' ? (
        // Ni icono partido ni hueco negro: un marco discreto que se lee como «esta foto no
        // está», y que no rompe la composición de la rejilla.
        <span
          role="img"
          aria-label={alt || 'Imagen no disponible'}
          className="absolute inset-0 grid place-items-center bg-white/[0.03]"
        >
          {/* Discreto sí, invisible no: iba en blanco al 20% —1.77:1— y era el único aviso de que
              la foto falló. Un objeto gráfico que hace falta para entender el contenido pide 3:1
              (WCAG 1.4.11) y ese marco entero no dice nada más. */}
          <ImageOff size={18} className="text-[color:var(--texto-3)]" aria-hidden="true" />
        </span>
      ) : (
        <img
          ref={imgRef}
          key={intento}
          src={src + sufijo}
          srcSet={srcSet}
          sizes={srcSet ? sizes : undefined}
          alt={alt}
          width={width}
          height={height}
          loading={prioridad ? 'eager' : 'lazy'}
          // Siempre `async`. `sync` en las prioritarias pedía bloquear el hilo principal hasta
          // decodificar, que es lo CONTRARIO de lo que hace el `decode()` de arriba: ese ya
          // espera al decodificado sin congelar la página, y con él la foto entra entera igual.
          // Pedir las dos cosas solo añadía un tirón al pintar lo primero que se ve.
          decoding="async"
          fetchPriority={prioridad ? 'high' : 'auto'}
          onLoad={alDescargar}
          onError={alFallar}
          className={`${className} transition-opacity duration-500 ${
            estado === 'lista' ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {children}
    </span>
  );
}
