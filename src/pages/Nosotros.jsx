import { Link } from 'react-router-dom';
import Pagina from '@/components/navegacion/Pagina';
import { useSalones } from '@/lib/datos';

/**
 * /nosotros — la página que TODAVÍA NO EXISTE de verdad.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * LEE ESTO ANTES DE «MEJORARLA»
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * No hay ni un párrafo de historia real de Jardines Club Hípico en ninguna parte: ni en la
 * base, ni en el sitio anterior, ni en los documentos. No se sabe de qué año es, ni por qué
 * se llama «Club Hípico», ni quién lo empezó, ni cuántos eventos han pasado.
 *
 * **Y no se inventa.** Una historia inventada en la página «Nosotros» es la mentira más
 * fácil de detectar y la más cara: el dueño la lee y ve que no es su negocio, o peor, un
 * cliente la menciona en una visita y nadie sabe de qué habla.
 *
 * Por eso esta página:
 *
 *   · lleva `indexable: false` en `rutas.js` → fuera del sitemap, con `noindex`
 *   · NO aparece en el pie ni en el menú
 *   · dice solo cosas VERIFICADAS: el número de espacios sale de la base, la ubicación de
 *     `config/negocio.js`, y ninguna frase afirma nada que no se pueda comprobar
 *
 * Existe únicamente para que quien llegue por una dirección adivinada o un enlace viejo
 * encuentre algo cierto en vez de un 404.
 *
 * **Para terminarla** hacen falta las respuestas del bloque F de
 * `rediseño-sitio-web/13-ENTREVISTA.md`: el año, el origen del nombre, si es familiar y el
 * tamaño del terreno. Con eso se escribe de verdad y se quita el `indexable: false`.
 */
export default function Nosotros() {
  const { data: salones } = useSalones();
  const cuantos = salones?.length;

  return (
    <Pagina
      clave="nosotros"
      eyebrow="Xochimilco, Ciudad de México"
      encabezado="Jardines Club Hípico"
      entradilla="Un recinto para eventos al sur de la Ciudad de México."
    >
      <div className="mx-auto max-w-3xl px-5 sm:px-8 pb-20">
        <div className="space-y-5 text-base font-light leading-[1.85] text-white/55">
          <p>
            Jardines Club Hípico es un recinto de eventos en Santa Inés, Xochimilco. Todo
            ocurre dentro del mismo terreno: la ceremonia, la fiesta, el área de los niños y
            hasta dónde dormir, sin que nadie tenga que trasladarse a mitad del día.
          </p>
          <p>
            {cuantos
              ? `Hoy son ${cuantos} espacios distintos`
              : 'Son varios espacios distintos'}
            , entre jardines al aire libre, salones cerrados, una capilla, un área infantil y
            estancias para hospedaje. Se rentan por separado o combinados, según lo que pida
            el evento.
          </p>
        </div>

        {/* Este bloque es deliberadamente honesto y va a la vista. Un hueco reconocido es
            mejor que un párrafo de relleno sobre «nuestra pasión por los momentos únicos»,
            que es lo que escribiría cualquiera que no conociera este lugar. */}
        <div className="mt-12 rounded-2xl border border-dashed border-[#C9A84C]/20 p-7">
          <p className="text-[10px] font-light tracking-[0.28em] uppercase text-[#C9A84C]/60">
            Esta página está a medias
          </p>
          <p className="mt-3 text-sm font-light leading-relaxed text-white/45">
            Falta lo que de verdad importa aquí: desde cuándo existe el lugar, de dónde viene
            lo de «Club Hípico» y quién lo levantó. Preferimos dejar el hueco a rellenarlo con
            frases bonitas que no dicen nada.
          </p>
        </div>

        <div className="mt-12 flex flex-col sm:flex-row gap-3">
          <Link
            to="/espacios"
            className="skeu-gold-btn rounded-full px-7 py-3.5 text-center text-xs font-medium tracking-[0.16em] uppercase text-[#1a1408]"
          >
            Ver los espacios
          </Link>
          <Link
            to="/ubicacion"
            className="skeu-dark-btn rounded-full px-7 py-3.5 text-center text-xs font-medium tracking-[0.16em] uppercase"
          >
            Dónde estamos
          </Link>
        </div>
      </div>
    </Pagina>
  );
}
