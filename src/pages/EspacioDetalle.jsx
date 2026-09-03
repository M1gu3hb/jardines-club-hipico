import { useParams, Link } from 'react-router-dom';
import { Check, ArrowRight, ArrowLeft } from 'lucide-react';
import Pagina from '@/components/navegacion/Pagina';
import NoEncontrada from '@/pages/NoEncontrada';
import { useSalon, useSalones } from '@/lib/datos';
import { rangoTexto, topeReal, ETIQUETA_TIPO } from '@/lib/capacidad';
import { construyeRuta, rutaPorClave } from '@/rutas';
import { urlAbsoluta } from '@/config/sitio';
import { UBICACION } from '@/config/negocio';
import GaleriaEspacio from '@/components/espacios/GaleriaEspacio';
import Foto from '@/components/ui/Foto';

/**
 * /espacios/{slug} — la ficha de un espacio.
 *
 * ── Por qué esta página es la que más importa ───────────────────────────────
 *
 * Es la que se comparte por WhatsApp («mira este salón») y la que puede ganar búsquedas que
 * el sitio hoy no toca: «salón para 300 personas en Xochimilco», «jardín para boda con
 * capilla». Los directorios del sector no tienen una página dedicada a UN espacio concreto
 * de UN recinto; aquí sí se puede competir.
 *
 * Hasta el rediseño, cada espacio vivía dentro de un overlay de la portada: sin URL propia,
 * imposible de compartir e invisible para Google.
 *
 * ── El caso del slug que no existe ──────────────────────────────────────────
 *
 * Mientras la lista carga NO se puede decidir nada: `find` sobre `undefined` da `undefined`
 * igual que un slug inventado. Enseñar el 404 en ese instante haría parpadear «no existe»
 * en una página que sí existe, cada vez que alguien entra directo desde un enlace. Por eso
 * se espera a que la carga termine antes de juzgar.
 *
 * ── Y el caso que de verdad dolía: 404 PARA UNA URL QUE EXISTE ──────────────
 *
 * Esperar a que la carga termine no bastaba, porque la carga TERMINABA BIEN aunque la base
 * no hubiera contestado: `runQuery` devolvía `[]` ante el error, `isLoading` se apagaba,
 * `isError` no se encendía nunca y `find` no encontraba nada. Resultado: esta página —la que
 * se comparte por WhatsApp— respondía **«página no encontrada»** durante una caída, sobre un
 * enlace a un salón real. Quien lo recibe no entiende «vuelve luego»: entiende que el salón
 * ya no está, y no vuelve a abrirlo.
 *
 * Ahora la lista se lee en modo estricto (ver `src/lib/datos.js`), así que hay tres estados
 * distinguibles y el 404 se pinta **solo** cuando la lista llegó, llegó con espacios, y
 * ninguno es este slug.
 */
export default function EspacioDetalle() {
  const { slug } = useParams();
  const { data: salon, isLoading, isError, listaVacia } = useSalon(slug);
  const { data: todos } = useSalones();

  if (isLoading) {
    return <div className="min-h-[60vh] grid place-items-center text-sm font-light text-white/30">Cargando…</div>;
  }

  // «No pudimos cargar» ANTES que el 404, y `listaVacia` cuenta como no haber cargado.
  //
  // Cero espacios no es una respuesta posible de este recinto: son ocho y están activos. Si la
  // lista llega vacía sin error —una política de lectura que se cierra de más—, lo que está
  // roto es el sitio entero, no este slug, y decirle a quien abrió el enlace que su salón no
  // existe sería la peor de las dos mentiras disponibles.
  if (isError || listaVacia) {
    return (
      <div className="mx-auto max-w-2xl px-5 pt-40 pb-24 text-center">
        <p className="text-sm font-light text-white/50">
          No pudimos cargar este espacio ahora mismo.{' '}
          <Link to="/espacios" className="text-[#C9A84C] underline underline-offset-4">Ver todos los espacios</Link>.
        </p>
      </div>
    );
  }

  if (!salon) return <NoEncontrada />;

  const rango = rangoTexto(salon);
  const tope = topeReal(salon);
  const caracteristicas = Array.isArray(salon.caracteristicas) ? salon.caracteristicas : [];
  const datosRapidos = Array.isArray(salon.datosRapidos) ? salon.datosRapidos : [];
  const preguntas = Array.isArray(salon.preguntas) ? salon.preguntas : [];
  const imagenes = Array.isArray(salon.imagenes) ? salon.imagenes : [];
  const otros = (todos || []).filter((s) => s.slug !== salon.slug).slice(0, 3);

  const descripcion =
    salon.seoDescription ||
    (salon.descripcion
      ? `${salon.descripcion} ${rango ? `Para ${rango} personas.` : ''} En Xochimilco, CDMX.`.trim()
      : undefined);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'EventVenue',
    name: `${salon.nombre} · Jardines Club Hípico`,
    description: salon.descripcionLarga || salon.descripcion || undefined,
    url: urlAbsoluta(construyeRuta(rutaPorClave('espacio').ruta, salon.slug)),
    image: salon.imagenPrincipal ? urlAbsoluta(salon.imagenPrincipal) : undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Duraznos S/N',
      addressLocality: 'Xochimilco',
      addressRegion: 'CDMX',
      postalCode: '16810',
      addressCountry: 'MX',
    },
    // El aforo publicado es el REAL, no el recomendado: es el dato que responde «¿caben?».
    ...(tope ? { maximumAttendeeCapacity: tope } : {}),
    containedInPlace: { '@type': 'Place', name: 'Jardines Club Hípico' },
  };

  return (
    <Pagina
      clave="espacio"
      slug={salon.slug}
      nombreFinal={salon.nombre}
      titulo={salon.seoTitle || `${salon.nombre} · Jardines Club Hípico, Xochimilco`}
      descripcion={descripcion}
      imagen={salon.ogImage || salon.imagenPrincipal}
      jsonLd={jsonLd}
    >
      <article>
        <header className="mx-auto max-w-7xl px-5 sm:px-8 pt-8 pb-10 sm:pt-12">
          <div className="flex items-center gap-4">
            <span className="h-px w-10 bg-gradient-to-r from-[#C9A84C]/60 to-transparent" />
            <span className="text-[#C9A84C]/75 text-[10px] font-light tracking-[0.32em] uppercase">
              {ETIQUETA_TIPO[salon.tipoEspacio] || 'Espacio'}
            </span>
          </div>

          <div className="mt-5 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extralight tracking-tight text-white/95 leading-[0.95]">
              {salon.nombre}
            </h1>

            {rango && (
              <div className="shrink-0 lg:text-right">
                <p className="text-[10px] font-light tracking-[0.28em] uppercase text-white/35">
                  Recomendado para
                </p>
                <p className="mt-1.5 text-3xl sm:text-4xl font-extralight text-[#C9A84C] leading-none">
                  {rango}
                  <span className="ml-2 text-xs font-light tracking-[0.16em] uppercase text-white/40">
                    personas
                  </span>
                </p>
                {tope && tope !== salon.capacidadMax && (
                  <p className="mt-2 text-xs font-light text-white/40">
                    Caben hasta <span className="text-white/70">{tope}</span> si hace falta.
                  </p>
                )}
              </div>
            )}
          </div>

          {salon.descripcion && (
            <p className="mt-7 max-w-2xl text-base sm:text-lg font-light leading-relaxed text-white/55">
              {salon.descripcion}
            </p>
          )}
        </header>

        <GaleriaEspacio
          principal={salon.imagenPrincipal}
          imagenes={imagenes}
          nombre={salon.nombre}
        />

        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-14">
          <div className="grid gap-14 lg:grid-cols-[1.6fr_1fr]">

            <div className="min-w-0">
              {salon.descripcionLarga && (
                <section aria-labelledby="sobre">
                  <h2 id="sobre" className="text-[10px] font-light tracking-[0.3em] uppercase text-[#C9A84C]/70">
                    Sobre este espacio
                  </h2>
                  <div className="mt-5 space-y-4 text-base font-light leading-[1.85] text-white/60">
                    {salon.descripcionLarga.split(/\n\s*\n/).map((p, i) => (
                      <p key={i}>{p.trim()}</p>
                    ))}
                  </div>
                </section>
              )}

              {caracteristicas.length > 0 && (
                <section aria-labelledby="incluye" className="mt-14">
                  <h2 id="incluye" className="text-[10px] font-light tracking-[0.3em] uppercase text-[#C9A84C]/70">
                    Lo que tiene
                  </h2>
                  <ul className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                    {caracteristicas.map((c, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm font-light text-white/55">
                        <Check size={14} className="mt-1 shrink-0 text-[#C9A84C]/60" aria-hidden="true" />
                        <span>{typeof c === 'string' ? c : c?.texto || c?.nombre}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {preguntas.length > 0 && (
                <section aria-labelledby="dudas" className="mt-14">
                  <h2 id="dudas" className="text-[10px] font-light tracking-[0.3em] uppercase text-[#C9A84C]/70">
                    Dudas sobre este espacio
                  </h2>
                  <dl className="mt-5 divide-y divide-white/5 border-y border-white/5">
                    {preguntas.map((p, i) => (
                      <div key={i} className="py-5">
                        <dt className="text-sm font-normal text-white/85">{p.pregunta}</dt>
                        <dd className="mt-2 text-sm font-light leading-relaxed text-[color:var(--texto-3)]">{p.respuesta}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}
            </div>

            <aside className="lg:sticky lg:top-24 lg:self-start">
              {datosRapidos.length > 0 && (
                <dl className="skeu-card rounded-2xl p-6">
                  <h2 className="text-[10px] font-light tracking-[0.3em] uppercase text-[#C9A84C]/70">
                    De un vistazo
                  </h2>
                  <div className="mt-4 divide-y divide-white/5">
                    {datosRapidos.map((d, i) => (
                      <div key={i} className="flex items-baseline justify-between gap-4 py-2.5">
                        <dt className="text-xs font-light text-white/40">{d.etiqueta}</dt>
                        <dd className="text-sm font-light text-white/80 text-right">{d.valor}</dd>
                      </div>
                    ))}
                  </div>
                </dl>
              )}

              <div className="skeu-card mt-5 rounded-2xl p-6">
                <p className="text-sm font-light leading-relaxed text-white/55">
                  ¿Te sirve <span className="text-white/85">{salon.nombre}</span> para tu evento?
                  Dinos la fecha y cuántos son, y te decimos si está libre.
                </p>

                {/* El espacio viaja en la URL: quien llegue al formulario desde aquí ya no
                    tiene que volver a elegirlo, y la solicitud llega con el contexto puesto. */}
                <Link
                  to={`/cotizar?espacio=${encodeURIComponent(salon.slug)}`}
                  className="skeu-gold-btn mt-5 flex items-center justify-center rounded-full px-6 py-3.5 text-xs font-medium tracking-[0.16em] uppercase text-[#1a1408]"
                >
                  Cotizar este espacio
                </Link>

                <p className="mt-4 text-[11px] font-light leading-relaxed text-white/30">
                  {UBICACION}
                </p>
              </div>
            </aside>
          </div>
        </div>

        {otros.length > 0 && (
          <section aria-labelledby="otros" className="border-t border-white/5">
            <div className="mx-auto max-w-7xl px-5 sm:px-8 py-14">
              <div className="flex items-baseline justify-between gap-4">
                <h2 id="otros" className="text-[10px] font-light tracking-[0.3em] uppercase text-[#C9A84C]/70">
                  Otros espacios
                </h2>
                <Link
                  to="/espacios"
                  className="inline-flex items-center gap-2 text-[10px] font-light tracking-[0.2em] uppercase text-[color:var(--texto-3)] transition-colors hover:text-[#C9A84C]"
                >
                  Ver los ocho
                  <ArrowRight size={12} aria-hidden="true" />
                </Link>
              </div>

              <ul className="mt-6 grid gap-4 sm:grid-cols-3">
                {otros.map((o) => (
                  <li key={o.id}>
                    <Link
                      to={construyeRuta(rutaPorClave('espacio').ruta, o.slug)}
                      className="group flex items-center gap-4 rounded-xl border border-white/5 p-3 transition-colors hover:border-[#C9A84C]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/60"
                    >
                      <Foto
                        url={o.imagenPrincipal || '/media/img/dGg8Xxh.jpg'}
                        sizes="64px"
                        claseContenedor="h-16 w-16 shrink-0 rounded-lg"
                        className="h-full w-full object-cover"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-light text-white/80 transition-colors group-hover:text-[#C9A84C]">
                          {o.nombre}
                        </span>
                        {rangoTexto(o) && (
                          <span className="block text-xs font-light text-white/35">
                            {rangoTexto(o)} personas
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>

              <Link
                to="/espacios"
                className="mt-8 inline-flex items-center gap-2 text-xs font-light tracking-[0.16em] uppercase text-white/40 transition-colors hover:text-white/75"
              >
                <ArrowLeft size={13} aria-hidden="true" />
                Volver a los espacios
              </Link>
            </div>
          </section>
        )}
      </article>
    </Pagina>
  );
}
