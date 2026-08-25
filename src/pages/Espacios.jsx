import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search } from 'lucide-react';
import { EsqueletoTarjetas, AvisoCargando } from '@/components/ui/Esqueleto';
import Pagina from '@/components/navegacion/Pagina';
import TarjetaSalon from '@/components/espacios/TarjetaSalon';
import { useSalones } from '@/lib/datos';
import { ordenaPorAjuste } from '@/lib/capacidad';
import { construyeRuta, rutaPorClave } from '@/rutas';

const SIN_FOTO = '/media/img/dGg8Xxh.jpg';

/**
 * /espacios — el hub, y el comparador.
 *
 * ── Lo primero es la capacidad, no la prosa ─────────────────────────────────
 *
 * Quien busca recinto filtra por número de invitados antes que por nada. Si tiene que leer
 * tres párrafos para saber si caben sus 300 personas, se va. Por eso el número va grande y
 * arriba en cada tarjeta, y por eso el selector es lo primero de la página.
 *
 * ── El selector NO descarta por abajo ───────────────────────────────────────
 *
 * Ver `src/lib/capacidad.js`. Resumido: el mínimo guardado es una recomendación estética, no
 * un mínimo de renta. Un espacio por debajo de su mínimo sale igual, marcado como «se
 * adapta», porque el negocio esas rentas las acepta y las resuelve con montaje lounge.
 */
export default function Espacios() {
  const { data: salones, isLoading, isError } = useSalones();
  const [personas, setPersonas] = useState('');

  const num = Number.parseInt(personas, 10) || 0;
  const evaluados = ordenaPorAjuste(salones || [], num);
  const conAjuste = num > 0;

  const jsonLd = salones?.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Espacios de Jardines Club Hípico',
        itemListElement: salones.map((s, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: s.nombre,
          url: construyeRuta(rutaPorClave('espacio').ruta, s.slug),
        })),
      }
    : null;

  return (
    <Pagina
      clave="espacios"
      eyebrow="Ocho espacios, un recinto"
      encabezado="Encuentra dónde cabe tu evento"
      entradilla={
        'Jardines al aire libre, salones cerrados, una capilla, un área infantil y estancias ' +
        'para quien se queda a dormir. Todos dentro del mismo terreno, en Xochimilco.'
      }
      jsonLd={jsonLd}
    >
      <section className="mx-auto max-w-7xl px-5 sm:px-8" aria-labelledby="selector">
        <div className="skeu-card rounded-2xl p-6 sm:p-8">
          <h2 id="selector" className="text-sm font-light tracking-[0.18em] uppercase text-[#C9A84C]/80">
            ¿Cuántos invitados esperas?
          </h2>
          <p className="mt-2 text-sm font-light text-white/40">
            Escribe un número aproximado y te ordenamos los espacios. No hace falta que sea exacto.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="relative">
              <Users
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#C9A84C]/50"
                aria-hidden="true"
              />
              <input
                type="number"
                inputMode="numeric"
                min="1"
                max="2000"
                value={personas}
                onChange={(e) => setPersonas(e.target.value)}
                placeholder="Por ejemplo, 250"
                aria-label="Número de invitados"
                className="w-56 rounded-full border border-[#C9A84C]/25 bg-black/40 py-3 pl-11 pr-4 text-sm font-light text-white placeholder:text-white/25 focus:border-[#C9A84C]/60 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/30"
              />
            </div>

            {conAjuste && (
              <button
                type="button"
                onClick={() => setPersonas('')}
                className="text-[11px] font-light tracking-[0.14em] uppercase text-white/40 underline underline-offset-4 transition-colors hover:text-white/70"
              >
                Quitar filtro
              </button>
            )}
          </div>

          {/* Esta línea es la traducción a lenguaje humano de la regla de negocio, y va aquí
              porque es justo donde alguien podría pensar que su evento «es muy chico». */}
          <p className="mt-5 flex items-start gap-2 text-xs font-light leading-relaxed text-white/35">
            <Search size={13} className="mt-0.5 shrink-0 text-[#C9A84C]/40" aria-hidden="true" />
            <span>
              No hay mínimo de renta. Si tu grupo es más pequeño que el recomendado, el espacio
              se adapta con salas lounge para que no se sienta vacío.
            </span>
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 sm:px-8 py-14" aria-label="Listado de espacios">
        {isLoading && (
          <>
            <AvisoCargando que="los espacios" />
            <EsqueletoTarjetas cuantas={6} columnas="sm:grid-cols-2 lg:grid-cols-3" />
          </>
        )}

        {isError && (
          <p className="py-16 text-center text-sm font-light text-white/50">
            No pudimos cargar los espacios ahora mismo.{' '}
            <Link to="/contacto" className="text-[#C9A84C] underline underline-offset-4">
              Escríbenos y te los contamos
            </Link>
            .
          </p>
        )}

        {!isLoading && !isError && (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {evaluados.map(({ salon, ajuste, nota }, i) => (
              <li key={salon.id}>
                <TarjetaSalon
                  salon={salon}
                  indice={i}
                  ajuste={conAjuste ? ajuste : null}
                  nota={conAjuste ? nota : null}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </Pagina>
  );
}
