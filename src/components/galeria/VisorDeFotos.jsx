import { useCallback, useEffect, useRef, useState } from 'react';
import useLockBodyScroll from "@/hooks/useLockBodyScroll";
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { fuenteDe, sePuedeOptimizar } from '@/lib/imagen';
import { isVideo } from '@/components/MediaViewer';

/**
 * VisorDeFotos — el visor a pantalla completa del sitio público.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * POR QUÉ EXISTE, HABIENDO YA UN `MediaViewer`
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * `MediaViewer` es **copia byte a byte en los tres repositorios** y un contrato lo vigila. Y
 * hacían falta dos cosas que obligan a tocarlo:
 *
 *   1. **Controles visibles.** El dueño: *«la flecha más llamativa, y la equis para cerrar más
 *      llamativa, que brillen»*. Los de `MediaViewer` son grises sobre foto: en una imagen
 *      clara desaparecen, y quien no los encuentra se siente atrapado.
 *
 *   2. **Precargar la vecina.** *«Cambio de imagen y sale todo sin nada, se pinta de arriba
 *      hacia abajo y tarda como tres segundos.»* Eso pasa porque la siguiente foto **se
 *      empieza a pedir en el momento del clic**. Aquí se piden la anterior y la siguiente en
 *      cuanto se abre una: al pulsar la flecha, ya están.
 *
 * Duplicar código tiene un coste real y aquí se paga a conciencia: el visor del portal y el
 * del CRM enseñan documentos de un evento ya contratado, donde nadie navega una galería de
 * sesenta y nueve fotos. Son necesidades distintas de verdad, no la misma con otro nombre.
 *
 * **Lo que NO se duplicó** fue el formulario de cotización, y ahí la decisión fue la contraria:
 * ese es el camino que da de comer, y dos copias significan arreglar un fallo en una y dejarlo
 * vivo en la otra. Un visor de fotos no tiene esa consecuencia.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * CÓMO EVITA EL PARPADEO AL CAMBIAR
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * La foto anterior **no se quita hasta que la nueva está lista**. Se dibujan las dos, la nueva
 * encima con opacidad 0, y solo cuando ha descargado y decodificado se hace el cambio. Así no
 * hay ni un fotograma con el hueco vacío — que es exactamente lo que el dueño describía.
 */

/**
 * A qué ancho se pide cada foto.
 *
 * El visor deja márgenes y la imagen entra con `object-contain`, así que el hueco real ronda
 * los 1 200-1 600 px incluso en pantalla grande. Pedir 2560 sería descargar el doble para
 * dibujar lo mismo. Las variantes se generan a calidad 85 en WebP, que a tamaño de
 * pantalla es indistinguible del original.
 */
const ANCHO_VISOR = 1600;

function fuenteGrande(url) {
  return sePuedeOptimizar(url) ? fuenteDe(url, ANCHO_VISOR) : url;
}

/**
 * @param {Object}   props
 * @param {Array}    props.piezas    Cada una con `url` y opcionalmente `alt` o `titulo`.
 * @param {number}   props.indice    Cuál se enseña. `null` cierra.
 * @param {() => void} props.onCerrar
 * @param {(i: number) => void} props.onCambiar Recibe el índice nuevo.
 */
export default function VisorDeFotos({ piezas, indice, onCerrar, onCambiar }) {
  const abierto = indice !== null && indice !== undefined && piezas && piezas.length > 0;
  const pieza = abierto ? piezas[indice] : null;

  const [listaLa, setListaLa] = useState(null); // qué dirección está ya dibujada
  const imgRef = useRef(null);

  const total = piezas ? piezas.length : 0;
  const ir = useCallback(
    (paso) => {
      if (!total) return;
      onCambiar((indice + paso + total) % total);
    },
    [indice, total, onCambiar],
  );

  // ── Teclado. Un visor que no se cierra con Escape se siente una trampa. ──
  useEffect(() => {
    if (!abierto) return undefined;
    const alPulsar = (e) => {
      if (e.key === 'Escape') onCerrar();
      if (e.key === 'ArrowRight') ir(1);
      if (e.key === 'ArrowLeft') ir(-1);
    };
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [abierto, ir, onCerrar]);

  // ── El scroll del fondo, con el gancho que es su único dueño ────────────
  //
  // Esto tenía su propio efecto guardando «cómo estaba». Con un solo componente en pantalla
  // funciona; en cuanto coincide con otro que hace lo mismo, el segundo captura el valor ya
  // modificado y al cerrar lo restaura — y el fondo se queda bloqueado para siempre. Es B-01,
  // que en `FormularioModal` dejaba la portada muerta después de cerrar el CTA principal.
  //
  // `useLockBodyScroll` lleva un contador: si dos cosas lo piden a la vez, el fondo se libera
  // cuando se va la última.
  useLockBodyScroll(abierto);

  // ══════════════════════════════════════════════════════════════════════════
  // LA PRECARGA DE LAS VECINAS — lo que quita los tres segundos
  // ══════════════════════════════════════════════════════════════════════════
  //
  // Se piden la anterior y la siguiente en cuanto se abre una. Son dos peticiones de unos cien
  // kilobytes que ocurren mientras el visitante está mirando la actual, o sea en tiempo que ya
  // estaba pasando de todas formas. Al pulsar la flecha, la foto ya está en la caché del
  // navegador y el cambio es instantáneo.
  //
  // Solo dos, y no toda la galería: precargar sesenta y nueve sería volver al problema que se
  // acaba de arreglar. Dos cubre el gesto real —avanzar o retroceder— y nada más.
  useEffect(() => {
    if (!abierto || typeof window === 'undefined' || total < 2) return;
    [indice + 1, indice - 1].forEach((i) => {
      const vecina = piezas[(i + total) % total];
      if (!vecina || isVideo(vecina.url)) return;
      const img = new Image();
      img.src = fuenteGrande(vecina.url);
    });
  }, [abierto, indice, piezas, total]);

  if (!abierto) return null;

  const url = fuenteGrande(pieza.url);
  const yaEsta = listaLa === url;

  const marcarLista = async () => {
    const el = imgRef.current;
    // Se espera al decodificado para que aparezca entera, con el mismo plazo de seguridad que
    // `Foto`: si `decode()` no resuelve —pestaña en segundo plano— se enseña igual.
    if (el && typeof el.decode === 'function') {
      await Promise.race([
        el.decode().catch(() => {}),
        new Promise((r) => setTimeout(r, 500)),
      ]);
    }
    setListaLa(url);
  };

  const contenido = (
    <AnimatePresence>
      <motion.div
        key="visor"
        role="dialog"
        aria-modal="true"
        aria-label={pieza.alt || pieza.titulo || 'Fotografía ampliada'}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/94 backdrop-blur-sm"
        onClick={onCerrar}
      >
        {/* ── LA FOTO ─────────────────────────────────────────────────── */}
        <div
          className="relative flex max-h-[86vh] max-w-[88vw] items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {isVideo(pieza.url) ? (
            <video
              src={pieza.url}
              controls
              autoPlay
              playsInline
              className="max-h-[86vh] max-w-[88vw] rounded-lg"
            />
          ) : (
            <>
              {/* Mientras la nueva no está lista se mantiene un fondo tenue en su sitio, para
                  que el visor no salte de tamaño ni parpadee a negro. */}
              {!yaEsta && (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 grid place-items-center"
                >
                  <span className="h-10 w-10 animate-spin rounded-full border-2 border-[#C9A84C]/25 border-t-[#C9A84C]/90" />
                </span>
              )}
              <img
                ref={imgRef}
                key={url}
                src={url}
                alt={pieza.alt || pieza.titulo || ''}
                onLoad={marcarLista}
                className={`max-h-[86vh] max-w-[88vw] rounded-lg object-contain transition-opacity duration-300 ${
                  yaEsta ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════
          * LOS CONTROLES, VISIBLES DE VERDAD
          * ══════════════════════════════════════════════════════════════
          *
          * Dorados, con fondo propio, borde y un resplandor. Los de antes eran grises sobre la
          * foto: en una imagen clara desaparecían, y un visor del que no se ve cómo salir se
          * siente una trampa.
          *
          * El fondo oscuro con desenfoque no es decoración: garantiza contraste **sea cual sea
          * la foto que haya debajo**, que es lo único que hace un control fiable.
          */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onCerrar(); }}
          aria-label="Cerrar"
          className="visor-control absolute right-4 top-4 sm:right-7 sm:top-7"
        >
          <X size={20} aria-hidden="true" />
        </button>

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); ir(-1); }}
              aria-label="Foto anterior"
              className="visor-control absolute left-3 top-1/2 -translate-y-1/2 sm:left-7"
            >
              <ChevronLeft size={24} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); ir(1); }}
              aria-label="Foto siguiente"
              className="visor-control absolute right-3 top-1/2 -translate-y-1/2 sm:right-7"
            >
              <ChevronRight size={24} aria-hidden="true" />
            </button>

            <span className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-[#C9A84C]/30 bg-black/70 px-4 py-1.5 text-[11px] font-light tracking-[0.16em] text-[#C9A84C] backdrop-blur-sm">
              {indice + 1} / {total}
            </span>
          </>
        )}

        {isVideo(pieza.url) && (
          <span className="pointer-events-none absolute bottom-5 left-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-white/60">
            <Play size={11} aria-hidden="true" /> Video
          </span>
        )}
      </motion.div>
    </AnimatePresence>
  );

  // En un portal, para que el visor no herede recortes ni contextos de apilamiento de la
  // tarjeta que lo abrió — que es el motivo clásico de que un modal salga «por debajo».
  return typeof document !== 'undefined' ? createPortal(contenido, document.body) : contenido;
}
