import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import ParejaQueBaila from './ParejaQueBaila';

/**
 * La imagen del anuncio, auto-hospedada como todo lo demás.
 *
 * EL NOMBRE ES NUEVO A PROPÓSITO. La versión anterior vivía en
 * `anuncio-clases-de-baile.png` y medía 2172×724. Los archivos de `public/` se sirven **con su
 * nombre**, sin la huella que Vite le pone a lo que vive en `src/`: reutilizar el nombre habría
 * dejado a todo el que ya visitó el sitio viendo la imagen vieja desde su caché, sin forma de
 * saberlo desde aquí. Un nombre distinto es la única invalidación que no depende de nadie.
 */
const IMAGEN = '/media/img/anuncio-clases-de-baile-ancho.png';

/**
 * La MISMA pieza, recompuesta más corta, para cuando la pantalla está en vertical.
 *
 * No es un recorte de la otra ni un tamaño distinto del mismo archivo: es otra composición, con
 * el texto y la pareja más juntos. Por eso son dos archivos y no dos `srcset` del mismo — un
 * `srcset` sirve para dar la misma imagen en varias resoluciones, no para cambiarla.
 *
 * 1672×626 → 2,67:1. En un teléfono de 375 px eso son 140 px de alto **con la imagen entera**,
 * frente a los 78 px que daría la ancha a proporción natural.
 */
const IMAGEN_VERTICAL = '/media/img/anuncio-clases-de-baile-vertical.png';

/**
 * BandaClasesDeBaile — el anuncio de la academia, a sangre.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * POR QUÉ VUELVE, Y POR QUÉ DISTINTO
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Estuvo en la portada y se retiró el 2026-08-25: *«quítalo por el momento, no me gusta cómo se
 * ve, me lo imaginé diferente»*. Aquella versión iba dentro de un `max-w-6xl` con marco dorado
 * y esquinas redondeadas — o sea, una tarjeta. El dueño no quería una tarjeta.
 *
 * Ahora entrega **su propia imagen** y dice cómo la quiere: *«abajo del hero, como si fuera
 * parte del hero, que cubra todo el ancho de la pantalla»*. Así que se va el marco, se van las
 * esquinas, se va el ancho máximo y se va el relleno lateral. De borde a borde.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * DOS IMÁGENES, NO UNA RECORTADA — Y POR QUÉ SE LLEGÓ AQUÍ
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * La pieza ancha mide 2172×452, o sea 4,81:1. A ancho completo en un móvil de 375 px eso da
 * **78 px de alto**, y ahí «Próximamente» queda en unos 7 px: presente, ilegible, inútil.
 *
 * El primer intento fue **recortarla** en pantallas estrechas —2:1 en móvil, anclado al 32%
 * para no comerse el texto—. Funcionaba en el sentido estricto: el texto se leía y nada
 * desbordaba. Pero recortar es tirar composición, y el dueño lo vio enseguida: *«en formato
 * vertical se recorta»*.
 *
 * Así que ahora hay **dos archivos**, no uno recortado de dos maneras:
 *
 *   · **vertical** (`orientation: portrait`) → 1672×626, 2,67:1. Se enseña **entera**, a su
 *     proporción exacta. En 375 px son 140 px de alto y no falta nada.
 *   · **horizontal** (`orientation: landscape`) → la ancha de siempre, que es la que se pensó
 *     para PC y tablet apaisada, y que ahí luce.
 *
 * El criterio es la ORIENTACIÓN y no el ancho, porque es lo que se pidió —«únicamente en
 * formato vertical»— y porque describe mejor el caso: una tablet en vertical tiene 820 px de
 * ancho, que para un punto de corte por anchura sería «escritorio», y sin embargo sufre
 * exactamente el mismo problema que un teléfono.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * LA CAJA SIGUE A LA IMAGEN, Y NO AL REVÉS
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Aquí no hay `aspect-ratio` fijado por CSS. Es `w-full h-auto` y ya: la altura sale de la
 * proporción del archivo que el navegador haya cargado.
 *
 * Y eso NO es pereza, es lo que hace el arreglo a prueba de fallos. El primer intento sí
 * fijaba la proporción por CSS —una para vertical y otra para horizontal— con `<picture>`
 * eligiendo el archivo. Dos mecanismos distintos decidiendo lo mismo, y **medido en el
 * navegador: se desincronizan.** Al girar la pantalla sin recargar, el CSS cambiaba de
 * proporción al instante y la fuente no: la imagen corta acababa metida en una caja de 4,81:1
 * con `object-cover`, o sea **recortada** — exactamente lo que se estaba arreglando.
 *
 * Con la caja siguiendo al archivo eso no puede pasar. Si el navegador tarda en cambiar de
 * fuente, o no la cambia nunca, lo peor que ocurre es que se vea la otra composición **entera**.
 * Un fallo que no recorta nada.
 *
 * Las medidas van en los dos sitios —`width`/`height` en el `<source>` y en el `<img>`— para
 * que reserve el hueco correcto ANTES de descargar, y la portada no dé un salto al llegar.
 *
 * ── Por qué `<picture>` y no `srcset` ───────────────────────────────────────
 *
 * `srcset` sirve para dar **la misma imagen** en varias resoluciones y dejar que el navegador
 * elija; puede escoger cualquiera y da igual, porque son la misma. Aquí las dos NO son la
 * misma: cambia la composición. Eso es *art direction*, y para eso está `<picture>` con
 * `media`, que no deja elección: en vertical, esa.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * EL TEXTO ESTÁ DENTRO DE LA IMAGEN, Y ESO OBLIGA A DOS COSAS
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * El dueño entrega el anuncio ya compuesto, con «Próximamente · Clases de baile · en Jardines
 * Club Hípico» dibujado dentro. Se respeta tal cual: es su pieza.
 *
 * Pero un texto dentro de un PNG **no existe para nadie que no lo esté mirando**. Google no lo
 * lee, un lector de pantalla no lo dice y un Ctrl+F no lo encuentra. Por eso van dos cosas más:
 * un `alt` que dice exactamente lo mismo, y un `<h2>` real oculto a la vista pero presente en
 * el documento, para que el esquema de la portada no tenga un agujero donde hay un anuncio.
 *
 * ── Si la imagen no está ────────────────────────────────────────────────────
 *
 * Cae en la pareja dibujada con su texto en HTML. No es teórico: el archivo lo pone el dueño a
 * mano en `public/media/img/`, y un anuncio que se vuelve un hueco roto el día que alguien
 * mueve un archivo es peor que no tener anuncio.
 *
 * ── Lo que NO dice ──────────────────────────────────────────────────────────
 *
 * Ni fecha, ni horarios, ni precios. No existen todavía. Anunciar una academia con datos
 * inventados genera preguntas que nadie puede contestar.
 */
export default function BandaClasesDeBaile() {
  const [falloLaImagen, setFalloLaImagen] = useState(false);

  return (
    <section aria-labelledby="banda-baile" className="relative w-full bg-[#0a0a0a]">
      {/* El encabezado real. Oculto a la vista porque las mismas palabras ya se leen dentro de
          la imagen; presente en el documento para Google y para los lectores de pantalla. */}
      <h2 id="banda-baile" className="sr-only">
        Próximamente: clases de baile en Jardines Club Hípico
      </h2>

      <Link
        to="/clases-de-baile"
        aria-label="Próximamente, clases de baile en Jardines Club Hípico. Ver más"
        className="group relative block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#C9A84C]/70"
      >
        {falloLaImagen ? (
          <Respaldo />
        ) : (
          <picture>
            {/* En vertical manda ésta, y `media` no admite discusión: el navegador no elige.
                Las medidas van en el `<source>` para que reserve el hueco correcto ANTES de
                descargarla — si solo estuvieran en el `<img>`, reservaría el de la ancha y la
                portada daría un salto al llegar el archivo. */}
            <source
              media="(orientation: portrait)"
              srcSet={IMAGEN_VERTICAL}
              width="1672"
              height="626"
            />
            <img
              src={IMAGEN}
              alt="Próximamente: clases de baile en Jardines Club Hípico"
              /* Las medidas reales del archivo ancho, que es el que sirve de respaldo. Con la
                 proporción fijada por CSS abajo no hacen falta para evitar el salto, pero van
                 igual: si el CSS no cargara, el navegador sigue reservando un hueco razonable
                 en vez de reflujar la portada entera. */
              width="2172"
              height="452"
              /* `eager` porque está pegado al hero: con `lazy` aparecía en blanco justo al
                 terminar la animación de entrada, que es cuando más se mira.
                 `fetchpriority="low"` para que ese adelanto NO le quite ancho de banda al vídeo
                 del hero, que es lo que mide el LCP. Las dos cosas juntas: se pide pronto, pero
                 detrás de lo importante. */
              loading="eager"
              fetchPriority="low"
              decoding="async"
              onError={() => setFalloLaImagen(true)}
              /* `h-auto` y ni un `aspect-*`: la altura la pone la proporción del archivo que se
                 haya cargado. Ver arriba — es lo que impide que una discrepancia entre el CSS y
                 la fuente vuelva a recortar. */
              className="block w-full h-auto transition-transform duration-700 group-hover:scale-[1.01]"
            />
          </picture>
        )}

        {/* La llamada a la acción, encima y abajo a la derecha. Discreta: el anuncio ya dice lo
            que tiene que decir, esto solo confirma que se puede pulsar. */}
        <span className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-full border border-[#C9A84C]/40 bg-black/55 px-4 py-2 text-[10px] font-light tracking-[0.18em] uppercase text-[#C9A84C] backdrop-blur-sm transition-colors duration-300 group-hover:border-[#C9A84C]/80 group-hover:bg-black/75 sm:bottom-5 sm:right-6 sm:text-[11px]">
          Avísame
          <ArrowRight
            size={12}
            aria-hidden="true"
            className="transition-transform duration-300 group-hover:translate-x-1"
          />
        </span>
      </Link>

      {/* Un hilo dorado abajo, y sólo abajo.
        *
        * Arriba no lleva nada a propósito: el dueño lo quiere «como si fuera parte del hero», y
        * cualquier línea ahí sería justo la costura que pidió que no se viera. Abajo sí, porque
        * lo que sigue son las cifras de confianza sobre el mismo negro y sin una separación la
        * imagen se derramaría en ellas. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#C9A84C]/45 to-transparent"
      />
    </section>
  );
}

/** Lo que se enseña si la imagen no está: la pareja dibujada y el texto en HTML. */
function Respaldo() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 py-10 sm:flex-row sm:gap-6 sm:px-8 sm:py-12">
      <ParejaQueBaila className="h-16 w-20 shrink-0 sm:h-20 sm:w-24" />
      <div className="min-w-0 flex-1 text-center sm:text-left">
        <p className="text-[9px] font-light tracking-[0.34em] uppercase text-[#C9A84C]/70 sm:text-[10px]">
          Próximamente
        </p>
        <p className="mt-1.5 text-lg font-extralight leading-tight text-white/95 sm:text-2xl">
          Clases de{' '}
          <span className="bg-gradient-to-br from-[#F0DFA6] via-[#E2C266] to-[#C9A84C] bg-clip-text font-serif italic text-transparent">
            baile
          </span>{' '}
          en Jardines Club Hípico
        </p>
      </div>
    </div>
  );
}
