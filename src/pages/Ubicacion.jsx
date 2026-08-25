import { MapPin, Car, Navigation, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import Pagina from '@/components/navegacion/Pagina';
import { MAPA, TELEFONO } from '@/config/negocio';
import { urlAbsoluta } from '@/config/sitio';

const DIRECCION = 'Duraznos S/N, Santa Inés, Xochimilco, 16810, Ciudad de México';

/**
 * /ubicacion — cómo llegar.
 *
 * ── Por qué NO hay un mapa incrustado ───────────────────────────────────────
 *
 * Porque la política de seguridad del sitio no lo permite, y abrirla para esto no compensa.
 * La CSP actual dice `frame-src 'none'` (nada de iframes, que es como se incrusta Google
 * Maps) e `img-src` solo admite este dominio y Supabase (así que tampoco entran las teselas
 * de un mapa tipo Leaflet ni una imagen estática de Google).
 *
 * Incrustar el mapa obligaría a abrir la CSP a un tercero en TODAS las páginas del sitio —no
 * solo en esta— para ganar una comodidad que un botón resuelve igual de bien. Y quien va a
 * conducir hasta aquí acaba abriendo su propia aplicación de mapas de todas formas.
 *
 * Si algún día se decide incrustarlo, es una decisión de seguridad deliberada y se documenta,
 * no un `frame-src` que alguien aflojó de paso.
 *
 * ── El JSON-LD sí lleva las señas completas ─────────────────────────────────
 *
 * Es lo que alimenta la ficha del negocio en Google y el resultado en Maps, que para un
 * recinto físico vale más que casi cualquier otra señal de posicionamiento.
 */
export default function Ubicacion() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'EventVenue',
    name: 'Jardines Club Hípico',
    url: urlAbsoluta('/ubicacion'),
    telephone: TELEFONO,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Duraznos S/N',
      addressLocality: 'Santa Inés, Xochimilco',
      addressRegion: 'Ciudad de México',
      postalCode: '16810',
      addressCountry: 'MX',
    },
    hasMap: MAPA,
  };

  return (
    <Pagina
      clave="ubicacion"
      eyebrow="Xochimilco, CDMX"
      encabezado="Cómo llegar"
      entradilla="Al sur de la ciudad, con entrada de coches al recinto. Tus invitados no van a dar vueltas buscando dónde estacionarse."
      jsonLd={jsonLd}
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 pb-16">
        <div className="grid gap-6 lg:grid-cols-2">

          <div className="skeu-card rounded-2xl p-8">
            <MapPin size={22} className="text-[#C9A84C]/70" aria-hidden="true" />
            <h2 className="mt-5 text-[10px] font-light tracking-[0.3em] uppercase text-[#C9A84C]/70">
              La dirección
            </h2>
            <address className="mt-3 not-italic text-lg font-light leading-relaxed text-white/85">
              {DIRECCION}
            </address>

            <a
              href={MAPA}
              target="_blank"
              rel="noopener noreferrer"
              className="skeu-gold-btn mt-7 inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-xs font-medium tracking-[0.16em] uppercase text-[#1a1408]"
            >
              Abrir en Google Maps
              <ExternalLink size={13} aria-hidden="true" />
            </a>

            <p className="mt-4 text-xs font-light text-white/30">
              Se abre en tu aplicación de mapas, con la ruta desde donde estés.
            </p>
          </div>

          <div className="space-y-6">
            <div className="skeu-card rounded-2xl p-8">
              <Car size={20} className="text-[#C9A84C]/70" aria-hidden="true" />
              <h2 className="mt-5 text-base font-light text-white/90">Llegando en coche</h2>
              <p className="mt-3 text-sm font-light leading-relaxed text-white/45">
                El estacionamiento está dentro del recinto y es amplio. Los invitados entran
                con el coche: no hay que buscar sitio en la calle ni pagar valet.
              </p>
            </div>

            <div className="skeu-card rounded-2xl p-8">
              <Navigation size={20} className="text-[#C9A84C]/70" aria-hidden="true" />
              <h2 className="mt-5 text-base font-light text-white/90">¿Vienes a conocerlo?</h2>
              <p className="mt-3 text-sm font-light leading-relaxed text-white/45">
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

        <p className="mt-10 text-sm font-light text-white/40">
          ¿Dudas sobre horarios de acceso o el montaje?{' '}
          <Link to="/como-funciona" className="text-[#C9A84C] underline underline-offset-4">
            Mira cómo funciona
          </Link>
          .
        </p>
      </div>
    </Pagina>
  );
}
