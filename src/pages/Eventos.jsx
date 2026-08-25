import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Pagina from '@/components/navegacion/Pagina';
import { useTodosLosTipos, useSalones } from '@/lib/datos';
import { construyeRuta, rutaPorClave } from '@/rutas';
import { rangoTexto } from '@/lib/capacidad';

/**
 * /eventos — el desvío por intención.
 *
 * ── Dos formas de entrar, y esta es la que más gente usa ────────────────────
 *
 * Al recinto se llega por dos caminos distintos. Unos piensan «¿dónde?» y van a `/espacios`.
 * La mayoría piensa «¿me sirve para mi boda?» y llega aquí. Son dos preguntas diferentes y
 * mezclarlas obliga a todo el mundo a traducir su intención a la del otro.
 *
 * ── Por qué se enseñan tipos que todavía no tienen página ───────────────────
 *
 * Porque el hub no es contenido: es un desvío. Las seis filas de `tipos_evento` nacieron
 * apagadas —hoy su texto propio es de cero palabras— y publicar seis páginas parecidas sería
 * contenido duplicado.
 *
 * Pero esconderlas dejaría este hub en blanco y tiraría a la basura el dato más valioso que
 * trae una visita: A QUÉ VIENE. Así que el tipo sin página lleva al formulario con su tipo
 * ya puesto. El visitante llega al mismo sitio, y la solicitud llega con el contexto.
 *
 * El día que una fila tenga sus 350 palabras propias y sus fotos, se enciende en el panel y
 * su tarjeta empieza a llevar a su página sola, sin tocar este archivo.
 */
export default function Eventos() {
  const { data: tipos, isLoading } = useTodosLosTipos();
  const { data: salones } = useSalones();

  const destacados = (salones || []).filter((s) => s.tipoEspacio !== 'hospedaje').slice(0, 4);

  return (
    <Pagina
      clave="eventos"
      eyebrow="Empecemos por lo tuyo"
      encabezado="¿Qué estás planeando?"
      entradilla={
        'Cada evento pide cosas distintas del mismo terreno: una boda necesita capilla y ' +
        'jardín, unos XV quieren pista y entrada, una posada de empresa quiere otra cosa.'
      }
    >
      <section className="mx-auto max-w-7xl px-5 sm:px-8 pb-14" aria-label="Tipos de evento">
        {isLoading && <p className="py-16 text-center text-sm font-light text-white/35">Cargando…</p>}

        {!isLoading && (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(tipos || []).map((t) => (
              <TarjetaTipo key={t.id} tipo={t} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="donde" className="border-t border-white/5">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-16">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="donde" className="text-[10px] font-light tracking-[0.3em] uppercase text-[#C9A84C]/75">
              O empieza por el espacio
            </h2>
            <Link
              to="/espacios"
              className="inline-flex items-center gap-2 text-[10px] font-light tracking-[0.2em] uppercase text-white/45 transition-colors hover:text-[#C9A84C]"
            >
              Ver los ocho
              <ArrowRight size={12} aria-hidden="true" />
            </Link>
          </div>

          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {destacados.map((s) => (
              <li key={s.id}>
                <Link
                  to={construyeRuta(rutaPorClave('espacio').ruta, s.slug)}
                  className="group block overflow-hidden rounded-xl border border-white/5 transition-colors hover:border-[#C9A84C]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/60"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-black/40">
                    <img
                      src={s.imagenPrincipal || '/media/img/dGg8Xxh.jpg'}
                      alt=""
                      loading="lazy"
                      width="400"
                      height="300"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-sm font-light text-white/85 transition-colors group-hover:text-[#C9A84C]">
                      {s.nombre}
                    </p>
                    {rangoTexto(s) && (
                      <p className="mt-1 text-xs font-light text-white/35">{rangoTexto(s)} personas</p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </Pagina>
  );
}

function TarjetaTipo({ tipo }) {
  const tienePagina = Boolean(tipo.activo);
  const destino = tienePagina
    ? construyeRuta(rutaPorClave('evento').ruta, tipo.slug)
    : `/cotizar?evento=${encodeURIComponent(tipo.slug)}`;

  return (
    <li>
      <Link
        to={destino}
        className="group skeu-card skeu-card-hover flex h-full flex-col overflow-hidden rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/60"
      >
        {tipo.imagenHero && (
          <div className="aspect-[16/9] overflow-hidden bg-black/40">
            <img
              src={tipo.imagenHero}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </div>
        )}

        <div className="flex flex-1 flex-col p-6">
          <h2 className="text-xl font-light text-white/90 transition-colors group-hover:text-[#C9A84C]">
            {tipo.nombre}
          </h2>

          <p className="mt-2 flex-1 text-sm font-light leading-relaxed text-white/40">
            {tipo.descripcionCorta ||
              `Cuéntanos cómo lo imaginas y te decimos qué espacio le queda mejor.`}
          </p>

          <span className="mt-5 inline-flex items-center gap-2 text-[10px] font-light tracking-[0.2em] uppercase text-[#C9A84C]/70 transition-colors group-hover:text-[#C9A84C]">
            {tienePagina ? 'Ver cómo se hace aquí' : 'Cotizar este evento'}
            <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
          </span>
        </div>
      </Link>
    </li>
  );
}
