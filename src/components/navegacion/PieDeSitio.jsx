import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, MessageCircle } from 'lucide-react';
import { RUTAS, rutaPorClave } from '@/rutas';
import { WHATSAPP, TELEFONO, CORREO, UBICACION, MAPA } from '@/config/negocio';

/**
 * PieDeSitio — el mapa del sitio, y la última oportunidad de convertir.
 *
 * ── Por qué el pie lleva TODAS las rutas ────────────────────────────────────
 *
 * Porque es la red de seguridad de la navegación. Quien llega al final de una página ya
 * decidió que le interesa; lo peor que puede pasar es que no encuentre a dónde ir después.
 *
 * Y hay un motivo técnico además del humano: los enlaces del pie aparecen en TODAS las
 * páginas, así que cada página nueva queda enlazada desde todo el sitio desde el primer día.
 * Una página a la que no apunta nadie es una página que Google tarda semanas en descubrir,
 * o no descubre.
 *
 * ── Lo que NO va aquí ───────────────────────────────────────────────────────
 *
 * Las rutas con `indexable: false`. No por ocultarlas —`/cotizar` está en la barra de arriba
 * en todo momento— sino porque el pie es el mapa de lo que el sitio ofrece como contenido, y
 * un formulario no es contenido. `/nosotros` tampoco, mientras siga sin un párrafo escrito:
 * enlazar a una página vacía desde las veinte páginas del sitio es multiplicar el problema.
 */
export default function PieDeSitio() {
  const anio = new Date().getFullYear();
  const cotizar = rutaPorClave('cotizar');
  const enElMapa = RUTAS.filter((r) => r.indexable !== false && !r.coleccion && r.clave !== 'home');

  const telHref = `tel:${TELEFONO.replace(/[^\d+]/g, '')}`;
  const waHref = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
    'Hola, me interesa cotizar un evento en Jardines Club Hípico.',
  )}`;

  return (
    <footer className="relative mt-24 border-t border-[#C9A84C]/15 bg-[#080808]">
      {/* Franja de conversión. Va ANTES del mapa del sitio a propósito: quien llega hasta
          aquí ya leyó la página, y el paso siguiente tiene que estar antes que el índice. */}
      <div className="border-b border-white/5">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-14 sm:py-16 text-center">
          <p className="portal-eyebrow text-[#C9A84C]/70 text-[10px] tracking-[0.35em] uppercase">
            El siguiente paso
          </p>
          <h2 className="mt-4 text-2xl sm:text-4xl font-extralight text-white/95 tracking-tight">
            Cuéntanos qué estás planeando
          </h2>
          <p className="mt-4 mx-auto max-w-xl text-sm font-light leading-relaxed text-white/45">
            Te decimos qué espacio le queda mejor a tu evento, si tu fecha está libre y
            cuánto costaría. Sin compromiso.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to={cotizar.ruta}
              className="skeu-gold-btn w-full sm:w-auto rounded-full px-8 py-3.5 text-xs font-medium tracking-[0.16em] uppercase text-[#1a1408]"
            >
              Cotizar mi evento
            </Link>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="skeu-dark-btn w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-8 py-3.5 text-xs font-medium tracking-[0.16em] uppercase"
            >
              <MessageCircle size={14} aria-hidden="true" />
              WhatsApp
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-14">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr]">

          <div>
            <p className="text-[#F5E3A0] text-base font-light tracking-[0.26em] uppercase">Jardines</p>
            <p className="text-white/35 text-[10px] font-light tracking-[0.4em] uppercase">Club Hípico</p>
            <p className="mt-6 max-w-xs text-sm font-light leading-relaxed text-white/40">
              Ocho espacios en un mismo recinto de Xochimilco: jardines, salones, capilla,
              área infantil y estancias para hospedaje.
            </p>
          </div>

          <nav aria-label="Mapa del sitio">
            <h2 className="text-[10px] font-light tracking-[0.28em] uppercase text-[#C9A84C]/70">
              El sitio
            </h2>
            <ul className="mt-5 space-y-2.5">
              {enElMapa.map((r) => (
                <li key={r.clave}>
                  <Link
                    to={r.ruta}
                    className="text-sm font-light text-white/45 transition-colors hover:text-[#C9A84C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/60 rounded-sm"
                  >
                    {r.nombre}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="text-[10px] font-light tracking-[0.28em] uppercase text-[#C9A84C]/70">
              Contacto
            </h2>
            <ul className="mt-5 space-y-3.5 text-sm font-light">
              <li>
                <a
                  href={MAPA}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-3 text-white/45 transition-colors hover:text-white/80"
                >
                  <MapPin size={14} className="mt-0.5 shrink-0 text-[#C9A84C]/60" aria-hidden="true" />
                  <span>{UBICACION}</span>
                </a>
              </li>
              <li>
                <a href={telHref} className="flex items-center gap-3 text-white/45 transition-colors hover:text-white/80">
                  <Phone size={14} className="shrink-0 text-[#C9A84C]/60" aria-hidden="true" />
                  <span>{TELEFONO}</span>
                </a>
              </li>
              <li>
                <a href={`mailto:${CORREO}`} className="flex items-center gap-3 text-white/45 transition-colors hover:text-white/80 break-all">
                  <Mail size={14} className="shrink-0 text-[#C9A84C]/60" aria-hidden="true" />
                  <span>{CORREO}</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-white/5 pt-6">
          <p className="text-[10px] font-light tracking-[0.14em] text-white/25">
            © {anio} Jardines Club Hípico · Xochimilco, Ciudad de México
          </p>
        </div>
      </div>
    </footer>
  );
}
