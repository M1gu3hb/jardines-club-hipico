import { Link } from 'react-router-dom';
import { EsqueletoTarjetas, AvisoCargando } from '@/components/ui/Esqueleto';
import Pagina from '@/components/navegacion/Pagina';
import BloqueTexto from '@/components/navegacion/BloqueTexto';
import { Catalogo } from '@/components/catalogo/Ficha';
import { useServicios, useAmenidades, useAlimentos } from '@/lib/datos';
import { reparte } from '@/lib/servicios';
import { QUE_INCLUYE, COMO_SE_COBRA, ALIMENTOS, EXTRAS } from '@/data/textos-servicios';

/**
 * /servicios — lo que hace que el evento SALGA.
 *
 * ── Cómo se reparte con `/amenidades` ───────────────────────────────────────
 *
 * Aquí va lo de producción y logística: montaje, mesa de honor, asesoría, coordinación,
 * seguridad, sala de conferencias, alimentos. En `/amenidades` van las atracciones —inflables,
 * cámara 360, mago, pista pixel led—, que es lo que el dueño llama amenidades y lo que oye el
 * cliente cuando habla con él.
 *
 * ── El orden: primero lo que ya está pagado ─────────────────────────────────
 *
 * Va antes «qué incluye la renta» que el catálogo de lo contratable. Enseñar primero lo que se
 * puede comprar y después lo que ya viene deja al visitante con la sensación de que todo es
 * extra — justo lo contrario de lo que pasa aquí.
 *
 * Y «cómo se cobra» va en segundo lugar, no escondido al final, porque es la pregunta que la
 * gente trae en la cabeza mientras lee todo lo demás. Contestarla pronto libera la lectura.
 *
 * ── De dónde sale cada cosa ─────────────────────────────────────────────────
 *
 * La prosa está en `src/data/textos-servicios.js`: es la explicación del negocio, no una ficha.
 * Las fichas salen de las dos tablas, repartidas por lo que cada fila es y no por la tabla en
 * la que nació — están cruzadas en producción. Ver `src/lib/servicios.js`.
 */
export default function Servicios() {
  const { data: srv, isLoading: cargaS, isError: falloS } = useServicios();
  const { data: amn, isLoading: cargaA, isError: falloA } = useAmenidades();
  const { data: alimentos } = useAlimentos();

  const cargando = cargaS || cargaA;
  const { servicios, amenidades } = reparte(srv || [], amn || []);

  // EL FALLO ES DE LAS DOS LECTURAS. Los dos recuentos de esta página salen de `reparte`, que
  // cruza las dos tablas porque están cruzadas en producción (`src/lib/servicios.js`). Si solo
  // se cae una, el reparto sigue devolviendo filas y el titular anunciaría un número REAL de
  // una lista INCOMPLETA — que se lee igual de bien y es igual de falso.
  const fallo = falloS || falloA;

  // «Sin alimentos» es una opción del formulario, no un menú. En una página que enumera lo que
  // se puede contratar, enseñarla como si fuera un platillo más no tiene ningún sentido.
  const menus = (alimentos || [])
    .map((m) => m.nombre || m.titulo)
    .filter((n) => n && !/^sin alimentos$/i.test(n));

  return (
    <Pagina
      clave="servicios"
      eyebrow="Todo dentro del recinto"
      encabezado="Qué se puede contratar"
      acento="contratar"
      entradilla={
        'Y, antes que eso, qué viene ya incluido con la renta. Es lo que más se pregunta y ' +
        'hasta hoy no estaba escrito en ninguna parte.'
      }
    >
      {/* EL ORDEN LO DECIDIO EL DUEÑO, Y ES EL CORRECTO.
        *
        * Antes esta pagina abria con tres bloques de prosa —que incluye la renta, como se
        * cobra, lo que se suma aparte— y el catalogo quedaba debajo del todo.
        *
        * Quien entra aqui viene a ver QUE HAY. Recibirlo con las condiciones de contratacion
        * es contestarle una pregunta que todavia no ha hecho, y hacerle bajar media pagina
        * para llegar a la que si trae. Primero el catalogo; las condiciones despues, que es
        * cuando de verdad importan. */}
      <section aria-labelledby="catalogo-h" className="border-t border-white/5 bg-[#080808]">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-16">
          <div className="flex items-center gap-4">
            <span className="h-px w-10 bg-gradient-to-r from-[#C9A84C]/60 to-transparent" />
            <span className="text-[10px] font-light tracking-[0.32em] uppercase text-[#C9A84C]/75">
              El catálogo
            </span>
          </div>

          {/* NO SE AFIRMA UN NÚMERO QUE NO SE LEYÓ. Con `cargando` a secas, una lectura caída
              —que también deja de cargar— ponía aquí «0 servicios para tu evento» encima del
              catálogo, y el prerender congelaba ese cero en `dist/` hasta el siguiente
              despliegue. Sin número, el titular sigue siendo cierto pase lo que pase. */}
          <h2 id="catalogo-h" className="mt-5 text-2xl sm:text-4xl font-extralight tracking-tight text-white/95">
            {!cargando && !fallo && servicios.length > 0
              ? `${servicios.length} servicios para tu evento`
              : 'Servicios'}
          </h2>
          <p className="mt-5 max-w-2xl text-base font-light leading-relaxed text-white/50">
            Van aparte de la renta y tienen precio fijo. Y no hace falta contratarlos aquí: si
            ya tienes tus proveedores, también se puede hablar.
          </p>

          {cargando && (
            <div className="mt-10">
              <AvisoCargando que="los servicios" />
              <EsqueletoTarjetas cuantas={4} columnas="sm:grid-cols-2" />
            </div>
          )}

          {/* Un aviso por cada cosa distinta: «se cayó» y «no hay» dejaron de compartir rama en
              cuanto `isError` empezó a encenderse de verdad. */}
          {!cargando && fallo && (
            <p className="py-16 text-center text-sm font-light text-white/50">
              No pudimos cargar el catálogo ahora mismo.{' '}
              <Link to="/contacto" className="text-[#C9A84C] underline underline-offset-4">Escríbenos</Link>{' '}
              y te lo contamos.
            </p>
          )}

          {!cargando && !fallo && servicios.length === 0 && (
            <p className="py-16 text-center text-sm font-light text-white/50">
              Todavía no hay servicios publicados.{' '}
              <Link to="/contacto" className="text-[#C9A84C] underline underline-offset-4">Escríbenos</Link>{' '}
              y te contamos qué incluye tu evento.
            </p>
          )}

          <div className="mt-10">
            <Catalogo items={servicios} id="catalogo" />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-5 sm:px-8 divide-y divide-white/5">
        <BloqueTexto id="que-incluye" titulo="Qué incluye la renta" texto={QUE_INCLUYE} />
        <BloqueTexto id="como-se-cobra" titulo="Cómo se cobra" texto={COMO_SE_COBRA} />
        <BloqueTexto id="alimentos" titulo="Alimentos y bebidas" texto={ALIMENTOS}>
          {menus.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-2">
              {menus.map((m) => (
                <li
                  key={m}
                  className="rounded-full border border-[#C9A84C]/25 px-4 py-1.5 text-xs font-light text-white/70"
                >
                  {m}
                </li>
              ))}
            </ul>
          )}
        </BloqueTexto>
        <BloqueTexto id="extras" titulo="Lo que se suma aparte" texto={EXTRAS} />
      </div>

      {/* El puente a la otra página. Sin él, quien llega buscando inflables se va pensando que
          no hay, porque esta página no habla de eso en ningún momento. */}
      <section className="border-t border-white/5">
        <div className="mx-auto max-w-3xl px-5 sm:px-8 py-16 text-center">
          {/* Este ya degradaba a una frase sin número cuando la lista salía vacía, así que
              nunca llegó a decir «0». Lo que sí podía decir era un número CORTO Y FALSO: con
              una sola de las dos tablas caída, el reparto cruzado encuentra un par de filas
              donde hay quince. Por eso el guardia es `fallo`, no `length`. */}
          <h2 className="text-2xl sm:text-3xl font-extralight text-white/90">
            {!fallo && amenidades.length > 0
              ? `Y hay ${amenidades.length} amenidades más`
              : 'Y luego están las amenidades'}
          </h2>
          <p className="mt-4 text-sm font-light leading-relaxed text-[color:var(--texto-3)]">
            Inflables, cámara 360, pista pixel led, un mago, un auto clásico para las fotos.
            Todo lo que hace que un evento se recuerde está en su propia página.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/amenidades"
              className="skeu-gold-btn w-full sm:w-auto rounded-full px-7 py-3.5 text-xs font-medium tracking-[0.16em] uppercase text-[#1a1408]"
            >
              Ver las amenidades
            </Link>
            <Link
              to="/cotizar"
              className="skeu-dark-btn w-full sm:w-auto rounded-full px-7 py-3.5 text-xs font-medium tracking-[0.16em] uppercase"
            >
              Cotizar mi evento
            </Link>
          </div>
        </div>
      </section>
    </Pagina>
  );
}
