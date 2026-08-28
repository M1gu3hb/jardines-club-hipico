import { Link } from 'react-router-dom';
import { Car, Trees, ShieldCheck, Bath } from 'lucide-react';
import { EsqueletoTarjetas, AvisoCargando } from '@/components/ui/Esqueleto';
import Pagina from '@/components/navegacion/Pagina';
import { Catalogo } from '@/components/catalogo/Ficha';
import { useServicios, useAmenidades } from '@/lib/datos';
import { reparte } from '@/lib/servicios';

/**
 * /amenidades — lo que le sumas a tu evento.
 *
 * ── El vocabulario es el del negocio, no el mío ─────────────────────────────
 *
 * Aquí «amenidad» significa lo que el dueño llama amenidad: las **atracciones**. Inflables,
 * cámara 360, mago, pista pixel led, auto clásico, chinelos. Es lo que dice él por WhatsApp y
 * es lo que busca quien llega a la web después de esa conversación.
 *
 * Una versión anterior de esta página mandaba las atracciones a `/servicios` y dejaba aquí solo
 * las características del recinto, con el argumento de que una página llamada «amenidades» no
 * debería ser una lista de inflables. Era más correcto en abstracto y peor en la práctica.
 *
 * ── Y al final, lo que NO se contrata ───────────────────────────────────────
 *
 * El estacionamiento, los sanitarios, los jardines y el bar cierran la página como contraste:
 * **esto lo sumas tú, esto ya viene**. Así, además, quien busca «¿tienen estacionamiento?» lo
 * encuentra donde lo va a buscar.
 *
 * ── La jerarquía la ponen las fotos ─────────────────────────────────────────
 *
 * Lo que tiene tres fotos o más abre en pieza ancha; lo demás va en rejilla. No hay lista de
 * destacados que mantener: quien sube siete fotos de la mesa de dulces está diciendo que
 * importa, y la página le hace caso sola.
 */
export default function Amenidades() {
  const { data: servicios, isLoading: cargaS } = useServicios();
  const { data: atracciones, isLoading: cargaA } = useAmenidades();
  const { amenidades, delRecinto } = reparte(servicios || [], atracciones || []);

  const cargando = cargaS || cargaA;

  return (
    <Pagina
      clave="amenidades"
      eyebrow="Lo que le sumas a tu evento"
      encabezado={cargando ? 'Amenidades' : `${amenidades.length} amenidades`}
      entradilla={
        'Inflables, cámara 360, pista pixel led, un mago, un auto clásico para las fotos. ' +
        'Todo se contrata aparte de la renta y tiene precio fijo — eliges solo lo que quieras.'
      }
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 pb-8">
        {cargando && <p className="py-20 text-center text-sm font-light text-white/35">Cargando…</p>}

        {!cargando && amenidades.length === 0 && (
          <p className="py-20 text-center text-sm font-light text-white/50">
            No pudimos cargar las amenidades ahora mismo.{' '}
            <Link to="/contacto" className="text-[#C9A84C] underline underline-offset-4">
              Escríbenos
            </Link>{' '}
            y te las contamos una por una.
          </p>
        )}

        {cargando && (
          <>
            <AvisoCargando que="las amenidades" />
            <EsqueletoTarjetas cuantas={6} columnas="sm:grid-cols-2 lg:grid-cols-3" />
          </>
        )}
        <Catalogo items={amenidades} id="catalogo" />
      </div>

      {/* EL CONTRASTE. Va al final a propósito: después de ver todo lo que se puede sumar,
          enterarse de que hay cosas que ya vienen se lee como una buena noticia. Puesto arriba
          sería una lista de obviedades antes de lo interesante. */}
      <section aria-labelledby="ya-viene" className="border-t border-white/5 bg-[#080808]">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-16">
          <div className="flex items-center gap-4">
            <span className="h-px w-10 bg-gradient-to-r from-[#C9A84C]/60 to-transparent" />
            <span className="text-[10px] font-light tracking-[0.32em] uppercase text-[#C9A84C]/75">
              Sin contratar nada
            </span>
          </div>

          <h2 id="ya-viene" className="mt-5 text-2xl sm:text-4xl font-extralight tracking-tight text-white/95">
            Y esto ya está aquí
          </h2>
          <p className="mt-5 max-w-2xl text-base font-light leading-relaxed text-white/50">
            Viene con el recinto. No se cotiza, no se suma y no hay que pedirlo.
          </p>

          <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <YaViene icono={Car} titulo="Estacionamiento dentro">
              Los invitados entran con el coche al recinto. Ni valet ni buscar sitio en la calle.
            </YaViene>
            <YaViene icono={Trees} titulo="Jardines de verdad">
              Áreas verdes y vegetación ornamental que dan marco a las fotos y a todo el evento.
            </YaViene>
            <YaViene icono={Bath} titulo="Sanitarios amplios">
              Limpios y bien cuidados. Nadie presume de esto y todo el mundo juzga un lugar por ello.
            </YaViene>
            <YaViene icono={ShieldCheck} titulo="Seguridad privada">
              Durante todo el evento, y el recinto es cerrado con solo dos accesos.
            </YaViene>
          </ul>

          {delRecinto.length > 0 && (
            <div className="mt-12">
              <Catalogo items={delRecinto} />
            </div>
          )}
        </div>
      </section>

      <section className="border-t border-white/5">
        <div className="mx-auto max-w-3xl px-5 sm:px-8 py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-extralight text-white/90">
            ¿Y lo que hace que el evento salga?
          </h2>
          <p className="mt-4 text-sm font-light leading-relaxed text-[color:var(--texto-3)]">
            El montaje, la coordinación, los alimentos y todo lo que incluye la renta están en
            la otra página.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/servicios"
              className="skeu-dark-btn w-full sm:w-auto rounded-full px-7 py-3.5 text-xs font-medium tracking-[0.16em] uppercase"
            >
              Ver los servicios
            </Link>
            <Link
              to="/cotizar"
              className="skeu-gold-btn w-full sm:w-auto rounded-full px-7 py-3.5 text-xs font-medium tracking-[0.16em] uppercase text-[#1a1408]"
            >
              Cotizar mi evento
            </Link>
          </div>
        </div>
      </section>
    </Pagina>
  );
}

function YaViene({ icono: Icono, titulo, children }) {
  return (
    <li>
      <Icono size={20} className="text-[#C9A84C]/70" aria-hidden="true" />
      <h3 className="mt-4 text-base font-light text-white/85">{titulo}</h3>
      <p className="mt-2 text-sm font-light leading-relaxed text-white/40">{children}</p>
    </li>
  );
}
