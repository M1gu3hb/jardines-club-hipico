import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { EsqueletoTarjetas, AvisoCargando } from '@/components/ui/Esqueleto';
import Pagina from '@/components/navegacion/Pagina';
import Foto from '@/components/ui/Foto';
import ArteDeEvento, { TelonDeCualquierEvento } from '@/components/eventos/ArteDeEvento';
import { REJILLA_CENTRADA, CELDA_CENTRADA, arranqueCentrado } from '@/lib/rejilla';
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
      acento="planeando?"
      entradilla={
        'Cada evento pide cosas distintas del mismo terreno: una boda necesita capilla y ' +
        'jardín, unos XV quieren pista y entrada, una posada de empresa quiere otra cosa. ' +
        'Los de abajo son los que más se piden — no son los únicos que se pueden hacer aquí.'
      }
    >
      <section className="mx-auto max-w-7xl px-5 sm:px-8 pb-14" aria-label="Tipos de evento">
        {isLoading && (
          <>
            <AvisoCargando que="los tipos de evento" />
            <EsqueletoTarjetas cuantas={6} columnas="sm:grid-cols-2 lg:grid-cols-3" />
          </>
        )}

        {!isLoading && (
          <ul className={REJILLA_CENTRADA}>
            {(tipos || []).map((t, i) => (
              <TarjetaTipo key={t.id} tipo={t} clase={arranqueCentrado(i, (tipos || []).length)} />
            ))}

            {/* ══════════════════════════════════════════════════════════════
              * EL TELÓN, A LO ANCHO DE LAS TRES COLUMNAS
              * ══════════════════════════════════════════════════════════════
              *
              * Lo pidió el dueño con esta forma exacta: *«pon otro que esté en horizontal, que
              * abarque los tres espacios, y que dé alusión a que puedes hacer aquí lo que se te
              * ocurra»*.
              *
              * Y la forma ES el argumento. Una tarjeta más, del mismo tamaño que las demás,
              * sería el tipo dieciséis: una casilla más de la misma lista. Rompiendo la rejilla
              * a lo ancho deja de ser un elemento de la lista y pasa a ser lo que se dice DE la
              * lista — que no la agota.
              *
              * No cuenta para el centrado a propósito: ocupa la fila entera, así que no puede
              * dejar hueco. Por eso `arranqueCentrado` se calcula solo sobre los tipos. */}
            <li className="sm:col-span-4 lg:col-span-6">
              <Link
                to="/cotizar"
                className="group relative flex min-h-[168px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-[#C9A84C]/20 bg-[#0b0a08] px-6 py-10 text-center transition-colors hover:border-[#C9A84C]/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/60"
              >
                <TelonDeCualquierEvento />
                <div className="relative">
                  <p className="text-[10px] font-light tracking-[0.3em] uppercase text-[#C9A84C]/75">
                    ¿No ves el tuyo aquí?
                  </p>
                  <h2 className="mt-3 max-w-2xl text-xl font-extralight leading-snug text-white/90 sm:text-2xl">
                    Los de arriba son los más pedidos, no los únicos. El recinto se ha usado
                    para formatos que no aparecen en ninguna lista.
                  </h2>
                  <p className="mx-auto mt-3 max-w-xl text-sm font-light leading-relaxed text-white/45">
                    Cuéntanos qué tienes en mente y te decimos qué espacio le queda mejor.
                  </p>
                  <span className="mt-5 inline-flex items-center gap-2 text-[10px] font-light tracking-[0.2em] uppercase text-[#C9A84C]/80 transition-colors group-hover:text-[#C9A84C]">
                    Cuéntanos tu idea
                    <ArrowRight size={13} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                </div>
              </Link>
            </li>
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
                    <Foto
                      url={s.imagenPrincipal || '/media/img/dGg8Xxh.jpg'}
                      sizes="(min-width: 1024px) 25vw, 50vw"
                      claseContenedor="h-full w-full"
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

function TarjetaTipo({ tipo, clase = '' }) {
  const tienePagina = Boolean(tipo.activo);
  const destino = tienePagina
    ? construyeRuta(rutaPorClave('evento').ruta, tipo.slug)
    : `/cotizar?evento=${encodeURIComponent(tipo.slug)}`;

  return (
    <li className={`${CELDA_CENTRADA} ${clase}`}>
      <Link
        to={destino}
        className="group skeu-card skeu-card-hover flex h-full flex-col overflow-hidden rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/60"
      >
        {/* MISMA REGLA QUE EN LA PORTADA: la foto manda, el dibujo es el suplente.
          *
          * Los dibujos estaban solo en el inicio y aquí —que ES la página dedicada a los
          * eventos— las seis tarjetas seguían siendo texto sobre negro. El dueño lo cazó:
          * *«las imágenes que pusiste a cada tipo de evento están perfectas, pero en la
          * sección de eventos no las pusiste»*.
          *
          * Aquí el recorte es 16/9 en vez de 16/10 porque estas tarjetas son más anchas; el
          * dibujo se adapta solo, que para eso lleva `preserveAspectRatio`. */}
        {tipo.imagenHero ? (
          <div className="aspect-[16/9] overflow-hidden bg-black/40">
            <Foto
              url={tipo.imagenHero}
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              claseContenedor="h-full w-full"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </div>
        ) : (
          <ArteDeEvento
            slug={tipo.slug}
            className="aspect-[16/9] w-full border-b border-white/5 bg-black/20"
          />
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
