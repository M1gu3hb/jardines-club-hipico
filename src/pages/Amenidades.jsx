import { Link } from 'react-router-dom';
import { Car, Trees, Wifi, ShieldCheck } from 'lucide-react';
import Pagina from '@/components/navegacion/Pagina';
import { useServicios, useAmenidades } from '@/lib/datos';
import { reparte } from '@/lib/servicios';

/**
 * /amenidades — lo que el recinto ES, no lo que se contrata.
 *
 * ── La diferencia, que no es una sutileza ───────────────────────────────────
 *
 * Una amenidad ya está ahí y no se cobra aparte: el estacionamiento, los jardines, los
 * sanitarios, el bar. Un servicio se contrata: el mago, los inflables, la pantalla led.
 *
 * Quien pregunta «¿tienen estacionamiento?» no está comprando: está descartando lugares. Si
 * no encuentra la respuesta, descarta. Por eso esto merece página propia y por eso no se
 * mezcla con el catálogo de lo contratable.
 *
 * ── De dónde salen las filas ────────────────────────────────────────────────
 *
 * De la tabla `servicios`, no de la tabla `amenidades`. Suena al revés y no lo es: las dos
 * tablas están cruzadas en producción. `amenidades` guarda inflables y magos. El reparto y su
 * porqué están en `src/lib/servicios.js`.
 */
export default function Amenidades() {
  const { data: servicios, isLoading: cargaS } = useServicios();
  const { data: atracciones, isLoading: cargaA } = useAmenidades();
  const { amenidades } = reparte(servicios || [], atracciones || []);

  return (
    <Pagina
      clave="amenidades"
      eyebrow="Lo que ya está aquí"
      encabezado="Lo que tus invitados encuentran al llegar"
      entradilla={
        'Esto no se contrata ni se cobra aparte: viene con el recinto. Son las cosas que ' +
        'nadie menciona en la invitación y que todo el mundo agradece.'
      }
    >
      <section className="mx-auto max-w-7xl px-5 sm:px-8 pb-8">
        {/* La narrativa antes de la lista. El encargo pide contar la experiencia del
            invitado en vez de soltar una fila de palomitas verdes, y tiene razón: una lista
            de checks se lee en dos segundos y no se recuerda ninguno. */}
        <div className="max-w-3xl space-y-5 text-base font-light leading-[1.85] text-white/55">
          <p>
            El coche entra al recinto. No hay que buscar sitio en la calle, ni pagar a un
            valet, ni caminar tres cuadras con los tacones puestos y el regalo en la mano.
          </p>
          <p>
            Dentro, el terreno es de jardines de verdad: árboles grandes, vegetación
            ornamental y sombra. Los invitados se reparten solos, los niños corren sin que
            nadie los vigile de cerca y las fotos salen bien a cualquier hora del día.
          </p>
          <p>
            Los sanitarios están limpios y son amplios, que es una de esas cosas de las que
            nadie presume y por las que todo el mundo juzga un lugar. El área de bar queda a
            mano sin quedar en medio. Y hay seguridad durante todo el evento.
          </p>
        </div>
      </section>

      <section aria-label="Amenidades del recinto" className="mx-auto max-w-7xl px-5 sm:px-8 py-10">
        {(cargaS || cargaA) && (
          <p className="py-12 text-center text-sm font-light text-white/35">Cargando…</p>
        )}

        {!cargaS && amenidades.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2">
            {amenidades.map((a) => (
              <li key={a.id} className="skeu-card rounded-2xl p-6">
                <h2 className="text-lg font-light text-white/90">{a.titulo || a.nombre}</h2>
                {a.descripcion && (
                  <p className="mt-2.5 text-sm font-light leading-relaxed text-white/45">
                    {a.descripcion}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Los cuatro diferenciadores del recinto. No salen de la base porque no son filas de
          ninguna tabla: son hechos del lugar, y los cuatro están verificados. */}
      <section aria-labelledby="distintivo" className="border-t border-white/5">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-16">
          <h2 id="distintivo" className="text-[10px] font-light tracking-[0.3em] uppercase text-[#C9A84C]/75">
            Lo que no tiene un salón normal
          </h2>

          <ul className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <Distintivo icono={Car} titulo="Estacionamiento dentro">
              Los invitados entran con el coche al recinto. Ni valet ni calle.
            </Distintivo>
            <Distintivo icono={Trees} titulo="Jardines de verdad">
              Árboles grandes y vegetación ornamental, no un patio con macetas.
            </Distintivo>
            <Distintivo icono={ShieldCheck} titulo="Seguridad privada">
              Durante todo el evento, sin contratarla aparte.
            </Distintivo>
            <Distintivo icono={Wifi} titulo="Todo en un terreno">
              Ceremonia, fiesta, área infantil y hospedaje sin mover a nadie de sitio.
            </Distintivo>
          </ul>

          <p className="mt-12 text-sm font-light text-white/45">
            ¿Te interesa cómo se reparte todo eso entre los ocho espacios?{' '}
            <Link to="/espacios" className="text-[#C9A84C] underline underline-offset-4">
              Míralos uno por uno
            </Link>
            .
          </p>
        </div>
      </section>
    </Pagina>
  );
}

function Distintivo({ icono: Icono, titulo, children }) {
  return (
    <li>
      <Icono size={20} className="text-[#C9A84C]/70" aria-hidden="true" />
      <h3 className="mt-4 text-base font-light text-white/85">{titulo}</h3>
      <p className="mt-2 text-sm font-light leading-relaxed text-white/40">{children}</p>
    </li>
  );
}
