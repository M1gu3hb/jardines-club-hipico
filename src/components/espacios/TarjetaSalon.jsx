import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, ArrowRight } from 'lucide-react';
import { rangoTexto, topeReal, ETIQUETA_TIPO, AJUSTE } from '@/lib/capacidad';
import Foto from '@/components/ui/Foto';
import { construyeRuta, rutaPorClave } from '@/rutas';

const SIN_FOTO = '/media/img/dGg8Xxh.jpg';

/**
 * El veredicto del comparador de `/espacios`, cuando el visitante ha dicho cuántos son.
 * Los colores no son decorativos: dorado es «adelante», ámbar es «se puede, con matices»,
 * gris es «este no», y azul marca que la pregunta no aplica (el hospedaje no tiene aforo de
 * evento). Y como el color solo no basta —hay quien no lo distingue—, cada uno lleva su texto.
 */
const ESTILO_AJUSTE = {
  [AJUSTE.IDEAL]: { texto: 'Le queda bien', clase: 'text-[#C9A84C] border-[#C9A84C]/40' },
  [AJUSTE.SE_ADAPTA]: { texto: 'Se adapta', clase: 'text-amber-200/80 border-amber-200/30' },
  // El gris de «este no» iba en blanco al 35% (3.14:1). Que el veredicto sea negativo no lo
  // vuelve secundario: es justo el que evita que alguien pida un espacio donde no cabe. El
  // token secundario es el escalón más tenue que aún se lee, así que conserva el papel apagado.
  [AJUSTE.NO_CABE]: { texto: 'No caben', clase: 'text-[color:var(--texto-3)] border-white/15' },
  [AJUSTE.NO_APLICA]: { texto: 'Hospedaje', clase: 'text-sky-200/70 border-sky-200/25' },
};

/**
 * TarjetaSalon — la tarjeta de un espacio, con el relieve del sitio original.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * POR QUÉ VOLVIÓ ESTE DISEÑO
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Porque el dueño lo pidió y porque tenía razón: *«las cards por salón se veían mejor antes…
 * con el marco dorado, "ver detalles", el número de personas así en chiquito»*.
 *
 * Lo que yo había puesto era una tarjeta plana con la capacidad en grande sobre la foto. El
 * razonamiento no era malo —quien busca recinto filtra por número de invitados— pero se comía
 * el argumento: **en una rejilla de ocho, si todas gritan un número, ninguna enseña un lugar**.
 * La foto es lo que vende un salón de eventos; el número es la comprobación que se hace
 * después, y para eso basta una placa pequeña.
 *
 * Lo que se recupera, pieza por pieza:
 *
 *   · El **marco dorado** y el degradado del fondo, que separan la tarjeta del fondo negro.
 *   · La **placa interior** alrededor de la foto — el detalle que hace que parezca montada y
 *     no pegada.
 *   · La **placa de capacidad** abajo a la izquierda, pequeña, con su icono.
 *   · El botón **«Ver detalles»** con el brillo que lo cruza, que es lo que dice que ahí se
 *     puede pulsar. La clase vive en `styles/theme.css` desde el sitio original.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * LO QUE **NO** VUELVE: EL OVERLAY
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * La tarjeta original abría una ventana encima (`SalonOverlay`). Esta es un enlace a la página
 * del espacio. No es un detalle: una ventana no tiene dirección propia, no se puede compartir
 * por WhatsApp, no vuelve con el botón de atrás y Google no la ve nunca. Ocho salones dentro de
 * un overlay son ocho cosas que el buscador no sabe que existen.
 *
 * Es la mitad del sentido del rediseño, así que el aspecto vuelve y el comportamiento no.
 *
 * ── Y la capacidad sale calculada, no del texto libre ───────────────────────
 *
 * El original pintaba `salon.capacidad`, una columna de texto escrita a mano. Aquí se usa
 * `rangoTexto()`, que lee los números reales y sabe distinguir el rango cómodo del tope. Así
 * la placa dice lo mismo que el comparador de `/espacios`, en vez de dos verdades distintas
 * sobre el mismo salón.
 */
export default function TarjetaSalon({ salon, indice = 0, ajuste = null, nota = null }) {
  const rango = rangoTexto(salon);
  const tope = topeReal(salon);
  const foto = salon.imagenPrincipal || SIN_FOTO;
  const insignia = ajuste ? ESTILO_AJUSTE[ajuste] : null;
  // El que no cabe NO se esconde: se apaga. Esconderlo dejaría al visitante sin saber que
  // existe, y un salón pequeño puede seguir sirviéndole para la despedida del día antes.
  const apagada = ajuste === AJUSTE.NO_CABE;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: Math.min(indice * 0.09, 0.4) }}
      whileHover={{ y: -4 }}
      className={`group relative h-full overflow-hidden rounded-[22px] ${
        apagada ? 'opacity-45 transition-opacity hover:opacity-90' : ''
      }`}
      style={{
        background: 'linear-gradient(160deg, #161310 0%, #0c0a08 50%, #060504 100%)',
        border: '1px solid rgba(201,168,76,0.28)',
        boxShadow:
          '0 1px 0 rgba(255,220,140,0.08) inset, 0 -1px 0 rgba(0,0,0,0.6) inset, 0 24px 50px -20px rgba(0,0,0,0.95), 0 10px 24px -12px rgba(0,0,0,0.7), 0 0 28px -10px rgba(201,168,76,0.25)',
        transition: 'transform .4s ease, box-shadow .4s ease, border-color .4s ease',
      }}
    >
      {/* Filo dorado de arriba */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[2px]"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(226,194,102,0.7), transparent)',
        }}
      />

      {/* EL ENLACE ENVUELVE LA TARJETA ENTERA.
          Así se puede pulsar en cualquier punto —incluida la foto— y sale UN solo destino en
          el árbol de accesibilidad, en vez de dos enlaces al mismo sitio que un lector de
          pantalla leería dos veces seguidas. */}
      <Link
        to={construyeRuta(rutaPorClave('espacio').ruta, salon.slug)}
        className="flex h-full flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]"
      >
        {/* La placa que enmarca la foto */}
        <div className="p-2.5">
          <div
            className="relative h-52 overflow-hidden rounded-[16px] sm:h-56"
            style={{
              boxShadow: '0 2px 6px rgba(0,0,0,0.8) inset, 0 0 0 1px rgba(201,168,76,0.2) inset',
            }}
          >
            <Foto
              url={foto}
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              claseContenedor="h-full w-full"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent"
            />
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C9A84C]/50 to-transparent"
            />

            {insignia && (
              <span
                className={`absolute left-3 top-3 rounded-full border bg-black/70 px-2.5 py-1 text-[9px] font-light tracking-[0.14em] uppercase backdrop-blur-sm ${insignia.clase}`}
              >
                {insignia.texto}
              </span>
            )}

            <span
              className="absolute right-3 top-3 rounded-full border border-white/15 bg-black/60 px-2.5 py-1 text-[9px] font-light tracking-[0.14em] uppercase text-white/60 backdrop-blur-sm"
            >
              {ETIQUETA_TIPO[salon.tipoEspacio] || 'Espacio'}
            </span>

            {/* La placa de capacidad: pequeña, abajo, como estaba */}
            {rango && (
              <div
                className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 backdrop-blur-md"
                style={{
                  background: 'linear-gradient(180deg, rgba(20,16,8,0.85), rgba(8,6,4,0.85))',
                  border: '1px solid rgba(201,168,76,0.4)',
                  boxShadow: '0 1px 0 rgba(255,220,140,0.1) inset, 0 4px 10px rgba(0,0,0,0.6)',
                }}
              >
                <Users size={11} className="text-[#C9A84C]" aria-hidden="true" />
                <span className="text-[10px] tracking-wider text-[#C9A84C]/90">
                  {rango}
                  {tope && tope !== salon.capacidadMax ? ` · hasta ${tope}` : ''}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="relative z-10 flex flex-1 flex-col px-6 pb-6 pt-3">
          <h3 className="mb-2 text-xl font-light tracking-wide text-white">{salon.nombre}</h3>
          <p className="mb-5 line-clamp-3 flex-1 text-sm leading-relaxed text-white/50">
            {salon.descripcion}
          </p>

          {nota && (
            <p className="mb-4 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-light leading-relaxed text-white/50">
              {nota}
            </p>
          )}

          <div
            aria-hidden="true"
            className="mb-4 h-px w-full bg-gradient-to-r from-transparent via-[#C9A84C]/25 to-transparent"
          />

          <span className="ver-detalles-cta relative inline-flex items-center gap-2 self-start overflow-hidden rounded-full px-4 py-2 text-xs font-medium tracking-[0.2em] uppercase text-[#C9A84C] transition-all duration-300 group-hover:gap-3"
            style={{
              background: 'linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)',
              border: '1px solid rgba(201,168,76,0.45)',
            }}
          >
            <span aria-hidden="true" className="ver-detalles-sheen" />
            <span className="relative z-10">Ver detalles</span>
            <ArrowRight size={14} aria-hidden="true" className="relative z-10" />
          </span>
        </div>
      </Link>

      {/* El resplandor al pasar por encima */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[22px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          boxShadow: '0 0 36px -6px rgba(201,168,76,0.35), 0 0 0 1px rgba(201,168,76,0.5) inset',
        }}
      />
    </motion.div>
  );
}
