import { MapPin, Car, Navigation, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MAPA } from '@/config/negocio';

export const DIRECCION = 'Duraznos S/N, Santa Inés, Xochimilco, 16810, Ciudad de México';

/**
 * ComoLlegar — la parte de ubicación, dentro de /contacto.
 *
 * ── Por qué ya no es una página aparte ──────────────────────────────────
 *
 * Palabras del dueño: *«la sección de ubicación y contacto tiene que ser la misma, házla una
 * misma, para que no se vean tantísimas secciones, porque es mucho»*.
 *
 * Y separadas nunca tuvieron mucho sentido: quien busca la dirección y quien busca el teléfono
 * son **la misma persona con la misma intención** —ponerse en contacto o venir—, y obligarla a
 * elegir entre dos entradas del menú que suenan parecido es hacerle trabajo.
 *
 * ── Por qué NO hay un mapa incrustado ────────────────────────────────
 *
 * Porque la política de seguridad del sitio no lo permite, y abrirla para esto no compensa.
 * La CSP dice `frame-src 'none'` —así se incrusta Google Maps— e `img-src` solo admite este
 * dominio y Supabase, o sea que tampoco entran las teselas de un mapa tipo Leaflet.
 *
 * Incrustarlo obligaría a abrir la CSP a un tercero en TODAS las páginas del sitio para ganar
 * una comodidad que un botón resuelve igual: quien va a conducir hasta aquí acaba abriendo su
 * propia aplicación de mapas de todas formas.
 */
export default function ComoLlegar() {
  return (
    <div className="mx-auto max-w-7xl px-5 sm:px-8 pb-16">
      <div className="grid gap-6 lg:grid-cols-2">

        <div className="skeu-card rounded-2xl p-8">
          <MapPin size={22} className="text-[#C9A84C]/70" aria-hidden="true" />
          <h3 className="mt-5 text-[10px] font-light tracking-[0.3em] uppercase text-[#C9A84C]/70">
            La dirección
          </h3>
          <address className="mt-3 not-italic text-lg font-light leading-relaxed text-white/85">
            {DIRECCION}
          </address>

          {/* El medidor marca este `text-[#1a1408]` a 1.08:1 porque asume que todo texto va sobre
              el lienzo negro. Aquí no: `.skeu-gold-btn` pinta el degradado dorado de marca debajo,
              y el par real —casi negro sobre #C9A84C— pasa de 8:1. No se toca. */}
          <a
            href={MAPA}
            target="_blank"
            rel="noopener noreferrer"
            className="skeu-gold-btn mt-7 inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-xs font-medium tracking-[0.16em] uppercase text-[#1a1408]"
          >
            Abrir en Google Maps
            <ExternalLink size={13} aria-hidden="true" />
          </a>

          <p className="mt-4 text-xs font-light text-[color:var(--texto-3)]">
            Se abre en tu aplicación de mapas, con la ruta desde donde estés.
          </p>
        </div>

        <div className="space-y-6">
          <div className="skeu-card rounded-2xl p-8">
            <Car size={20} className="text-[#C9A84C]/70" aria-hidden="true" />
            <h3 className="mt-5 text-base font-light text-white/90">Llegando en coche</h3>
            <p className="mt-3 text-sm font-light leading-relaxed text-[color:var(--texto-3)]">
              El estacionamiento está dentro del recinto y es amplio. Los invitados entran
              con el coche: no hay que buscar sitio en la calle ni pagar valet.
            </p>
          </div>

          <div className="skeu-card rounded-2xl p-8">
            <Navigation size={20} className="text-[#C9A84C]/70" aria-hidden="true" />
            <h3 className="mt-5 text-base font-light text-white/90">¿Vienes a conocerlo?</h3>
            <p className="mt-3 text-sm font-light leading-relaxed text-[color:var(--texto-3)]">
              Avísanos antes de venir y te enseñamos los ocho espacios con calma. Un recinto
              se decide viéndolo, y así te aseguras de que haya alguien para atenderte.
            </p>
            <Link
              to="/cotizar"
              className="mt-5 inline-flex items-center gap-2 text-[11px] font-light tracking-[0.18em] uppercase text-[#C9A84C] underline underline-offset-4"
            >
              Agendar una visita
            </Link>
          </div>
        </div>
      </div>

      <p className="mt-10 text-sm font-light text-[color:var(--texto-3)]">
        ¿Dudas sobre horarios de acceso o el montaje?{' '}
        <Link to="/como-funciona" className="text-[#C9A84C] underline underline-offset-4">
          Mira cómo funciona
        </Link>
        .
      </p>
    </div>
  );
}
