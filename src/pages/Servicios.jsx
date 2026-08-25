import { Link } from 'react-router-dom';
import Pagina from '@/components/navegacion/Pagina';
import { useServicios, useAmenidades, useAlimentos } from '@/lib/datos';
import { reparte } from '@/lib/servicios';

const SIN_FOTO = '/media/img/dGg8Xxh.jpg';

/**
 * /servicios — UNA página, no cinco.
 *
 * ── Por qué una sola ────────────────────────────────────────────────────────
 *
 * Porque el contenido que existe no da para cinco. Sumando TODO el texto de servicios de la
 * base salen unas 280 palabras; repartidas en cinco páginas serían 56 por página. Eso no es
 * una página: es un titular con relleno, y es exactamente el «contenido SEO basura» que el
 * encargo prohíbe y que Google trata como contenido delgado.
 *
 * Se parten en cinco el día que cada familia tenga texto propio de verdad. La primera
 * candidata es Alimentos y bebidas, que es la que más se pregunta.
 *
 * ── De dónde sale cada bloque ───────────────────────────────────────────────
 *
 * De las DOS tablas a la vez, repartido por lo que cada fila es. Las tablas `servicios` y
 * `amenidades` están cruzadas en producción; el porqué y el reparto están en
 * `src/lib/servicios.js`, que es donde vive esa decisión.
 */
export default function Servicios() {
  const { data: servicios, isLoading: cargaS } = useServicios();
  const { data: amenidades, isLoading: cargaA } = useAmenidades();
  const { data: alimentos } = useAlimentos();

  const cargando = cargaS || cargaA;
  const { familias } = reparte(servicios || [], amenidades || []);

  // Los menús viven en su propia tabla y no pasan por el reparto: no son «servicios» con
  // título y foto, son la carta. Se inyectan dentro de su familia como una lista aparte.
  const menus = (alimentos || []).filter((m) => m.nombre || m.titulo);

  return (
    <Pagina
      clave="servicios"
      eyebrow="Todo dentro del recinto"
      encabezado="Qué se puede contratar"
      entradilla={
        'Desde el menú hasta el mago. No hace falta traer proveedores de fuera para nada de ' +
        'esto, aunque si ya tienes los tuyos, también se puede hablar.'
      }
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 pb-10">
        {cargando && <p className="py-16 text-center text-sm font-light text-white/35">Cargando los servicios…</p>}

        {!cargando && familias.length === 0 && (
          <p className="py-16 text-center text-sm font-light text-white/50">
            No pudimos cargar los servicios ahora mismo.{' '}
            <Link to="/contacto" className="text-[#C9A84C] underline underline-offset-4">Escríbenos</Link>{' '}
            y te los contamos uno por uno.
          </p>
        )}

        <div className="space-y-20">
          {familias.map((f) => (
            <section key={f.clave} aria-labelledby={`f-${f.clave}`}>
              <div className="flex items-center gap-4">
                <span className="h-px w-10 bg-gradient-to-r from-[#C9A84C]/60 to-transparent" />
                <h2
                  id={`f-${f.clave}`}
                  className="text-[10px] font-light tracking-[0.3em] uppercase text-[#C9A84C]/75"
                >
                  {f.nombre}
                </h2>
              </div>

              {f.entradilla && (
                <p className="mt-4 max-w-2xl text-base font-light leading-relaxed text-white/50">
                  {f.entradilla}
                </p>
              )}

              {f.clave === 'alimentos' && menus.length > 0 && (
                <ul className="mt-6 flex flex-wrap gap-2">
                  {menus.map((m) => (
                    <li
                      key={m.id}
                      className="rounded-full border border-[#C9A84C]/25 px-4 py-1.5 text-xs font-light text-white/65"
                    >
                      {m.nombre || m.titulo}
                    </li>
                  ))}
                </ul>
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

      <section className="border-t border-white/5">
        <div className="mx-auto max-w-3xl px-5 sm:px-8 py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-extralight text-white/90">
            ¿No ves lo que buscas?
          </h2>
          <p className="mt-4 text-sm font-light leading-relaxed text-white/45">
            Trabajamos con muchos proveedores y casi todo se puede conseguir. Dinos qué
            necesitas y te decimos si se puede y cuánto sale.
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
  const foto = servicio.imagenUrl || servicio.imagen || servicio.imagenPrincipal;
  const fotos = Array.isArray(servicio.imagenes) ? servicio.imagenes : [];
  const portada = foto || fotos[0] || SIN_FOTO;

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
        <h3 className="text-base font-light text-white/90">{titulo}</h3>
        {servicio.descripcion && (
          <p className="mt-2 text-sm font-light leading-relaxed text-white/40">
            {servicio.descripcion}
          </p>
        )}
      </div>
    </li>
  );
}
