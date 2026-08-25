import { Link } from 'react-router-dom';
import Pagina from '@/components/navegacion/Pagina';
import BloqueTexto from '@/components/navegacion/BloqueTexto';
import { useServicios, useAmenidades, useAlimentos } from '@/lib/datos';
import { reparte } from '@/lib/servicios';
import { QUE_INCLUYE, COMO_SE_COBRA, ALIMENTOS, EXTRAS } from '@/data/textos-servicios';

const SIN_FOTO = '/media/img/dGg8Xxh.jpg';

/**
 * /servicios — UNA página, no cinco.
 *
 * ── Por qué una sola ────────────────────────────────────────────────────────
 *
 * Porque el catálogo que hay en la base no da para cinco. Sumando TODO el texto de servicios
 * salen unas 280 palabras; repartidas en cinco páginas serían 56 por página. Eso no es una
 * página: es un titular con relleno, y es contenido delgado.
 *
 * ── Lo que cambió con la entrevista al dueño ────────────────────────────────
 *
 * Esta página prometía «alimentos y bebidas» apoyándose en tres registros de la base **con la
 * descripción vacía**. Ahora tiene cuatro bloques de prosa que antes no existían en ninguna
 * parte del sitio, y el más importante no es el de alimentos: es **qué incluye la renta**, que
 * es lo que más se pregunta y lo que nunca estaba escrito.
 *
 * ── El orden: primero lo que ya está pagado ─────────────────────────────────
 *
 * Va antes «qué incluye» que el catálogo de lo contratable. Enseñar primero lo que se puede
 * comprar y después lo que ya viene incluido deja al visitante con la sensación de que todo es
 * extra — que es justo lo contrario de lo que pasa aquí.
 *
 * ── De dónde salen los bloques y de dónde las tarjetas ──────────────────────
 *
 * La prosa vive en `src/data/textos-servicios.js`: es la explicación del negocio, no una ficha.
 * Las tarjetas salen de las DOS tablas a la vez, repartidas por lo que cada fila es y no por
 * la tabla en la que nació — `servicios` y `amenidades` están cruzadas en producción. El
 * porqué está en `src/lib/servicios.js`.
 */
export default function Servicios() {
  const { data: servicios, isLoading: cargaS } = useServicios();
  const { data: amenidades, isLoading: cargaA } = useAmenidades();
  const { data: alimentos } = useAlimentos();

  const cargando = cargaS || cargaA;
  const { familias } = reparte(servicios || [], amenidades || []);

  // «Sin alimentos» es una opción del formulario, no un menú. En una página que enumera lo que
  // se puede contratar, enseñarla como si fuera un platillo más no tiene ningún sentido.
  const menus = (alimentos || [])
    .map((m) => m.nombre || m.titulo)
    .filter((n) => n && !/^sin alimentos$/i.test(n));

  const familiaAlimentos = familias.find((f) => f.clave === 'alimentos');
  const resto = familias.filter((f) => f.clave !== 'alimentos');

  return (
    <Pagina
      clave="servicios"
      eyebrow="Todo dentro del recinto"
      encabezado="Qué se puede contratar"
      entradilla={
        'Y, antes que eso, qué viene ya incluido con la renta. Es lo que más se pregunta y ' +
        'hasta hoy no estaba escrito en ninguna parte.'
      }
    >
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
          {familiaAlimentos && (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {familiaAlimentos.items.map((s) => (
                <TarjetaServicio key={s.id} servicio={s} />
              ))}
            </ul>
          )}
        </BloqueTexto>
        <BloqueTexto id="extras" titulo="Lo que se suma aparte" texto={EXTRAS} />
      </div>

      <section aria-labelledby="catalogo" className="border-t border-white/5">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-14">
          <h2 id="catalogo" className="text-2xl sm:text-4xl font-extralight tracking-tight text-white/95">
            El catálogo
          </h2>
          <p className="mt-4 max-w-2xl text-base font-light leading-relaxed text-white/50">
            Todo esto va aparte de la renta y tiene precio fijo. No hace falta contratarlo aquí:
            si ya tienes tus proveedores, también se puede hablar.
          </p>

          {cargando && <p className="py-16 text-center text-sm font-light text-white/35">Cargando…</p>}

          {!cargando && familias.length === 0 && (
            <p className="py-16 text-center text-sm font-light text-white/50">
              No pudimos cargar el catálogo ahora mismo.{' '}
              <Link to="/contacto" className="text-[#C9A84C] underline underline-offset-4">Escríbenos</Link>{' '}
              y te lo contamos.
            </p>
          )}

          <div className="mt-12 space-y-16">
            {resto.map((f) => (
              <section key={f.clave} aria-labelledby={`f-${f.clave}`}>
                <div className="flex items-center gap-4">
                  <span className="h-px w-10 bg-gradient-to-r from-[#C9A84C]/60 to-transparent" />
                  <h3
                    id={`f-${f.clave}`}
                    className="text-[10px] font-light tracking-[0.3em] uppercase text-[#C9A84C]/75"
                  >
                    {f.nombre}
                  </h3>
                </div>

                {f.entradilla && (
                  <p className="mt-4 max-w-2xl text-base font-light leading-relaxed text-white/50">
                    {f.entradilla}
                  </p>
                )}

                <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {f.items.map((s) => (
                    <TarjetaServicio key={s.id} servicio={s} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/5">
        <div className="mx-auto max-w-3xl px-5 sm:px-8 py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-extralight text-white/90">
            ¿No ves lo que buscas?
          </h2>
          <p className="mt-4 text-sm font-light leading-relaxed text-white/45">
            Trabajamos con muchos proveedores y casi todo se puede conseguir. Dinos cómo
            imaginas tu evento y te decimos si se puede.
          </p>
          <Link
            to="/cotizar"
            className="skeu-gold-btn mt-8 inline-flex rounded-full px-8 py-3.5 text-xs font-medium tracking-[0.16em] uppercase text-[#1a1408]"
          >
            Preguntar por mi evento
          </Link>
        </div>
      </section>
    </Pagina>
  );
}

function TarjetaServicio({ servicio }) {
  const titulo = servicio.titulo || servicio.nombre;
  const fotos = Array.isArray(servicio.imagenes) ? servicio.imagenes : [];
  const portada = servicio.imagenUrl || servicio.imagen || servicio.imagenPrincipal || fotos[0] || SIN_FOTO;

  return (
    <li className="skeu-card skeu-card-hover group overflow-hidden rounded-2xl">
      <div className="relative aspect-[3/2] overflow-hidden bg-black/40">
        <img
          src={portada}
          alt=""
          loading="lazy"
          width="480"
          height="320"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        {fotos.length > 1 && (
          <span className="absolute bottom-3 right-3 rounded-full border border-white/15 bg-black/60 px-2.5 py-1 text-[9px] font-light tracking-wider text-white/60 backdrop-blur-sm">
            {fotos.length} fotos
          </span>
        )}
      </div>

      <div className="p-5">
        <h4 className="text-base font-light text-white/90">{titulo}</h4>
        {servicio.descripcion && (
          <p className="mt-2 text-sm font-light leading-relaxed text-white/40">{servicio.descripcion}</p>
        )}
      </div>
    </li>
  );
}
