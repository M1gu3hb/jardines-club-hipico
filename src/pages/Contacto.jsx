import { Link } from 'react-router-dom';
import { MessageCircle, Phone, Mail, MapPin } from 'lucide-react';
import Pagina from '@/components/navegacion/Pagina';
import ComoLlegar from '@/components/contacto/ComoLlegar';
import { useConfigSitio } from '@/lib/datos';
import { WHATSAPP, TELEFONO, CORREO, UBICACION, MAPA } from '@/config/negocio';
import { urlAbsoluta } from '@/config/sitio';

/**
 * /contacto — las cuatro vías, sin jerarquía impuesta.
 *
 * ── Por qué no se empuja solo el formulario ─────────────────────────────────
 *
 * Porque el formulario es la vía que MÁS conviene al negocio —llega ordenada, con folio y al
 * correo— pero no siempre es la que conviene a quien pregunta. Alguien que solo quiere saber
 * si el 14 de febrero está libre no va a rellenar seis campos: va a escribir por WhatsApp o
 * no va a escribir. Esconder ese botón no convierte a esa persona en un formulario; la
 * convierte en una visita que se fue.
 *
 * ── La base manda sobre el archivo ──────────────────────────────────────────
 *
 * Los datos salen de `config_sitio` si ha cargado, y si no de `config/negocio.js`. Ese
 * respaldo no contradice la regla de «sin fallback estático»: el teléfono del negocio no es
 * contenido editorial, es un hecho, y hasta el 2026-08-05 estaba escrito a mano en seis
 * sitios con un número EQUIVOCADO. El respaldo dice la verdad en vez de inventarla.
 */
export default function Contacto() {
  const { data: config } = useConfigSitio();

  const whatsapp = config?.whatsappNumero || WHATSAPP;
  const telefono = config?.telefonoContacto || TELEFONO;
  const correo = config?.correoAdmin || CORREO;

  const waHref = `https://wa.me/${whatsapp}?text=${encodeURIComponent(
    'Hola, me interesa cotizar un evento en Jardines Club Hípico.',
  )}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'EventVenue',
    name: 'Jardines Club Hípico',
    url: urlAbsoluta('/contacto'),
    telephone: telefono,
    email: correo,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Duraznos S/N',
      addressLocality: 'Santa Inés, Xochimilco',
      addressRegion: 'Ciudad de México',
      postalCode: '16810',
      addressCountry: 'MX',
    },
  };

  return (
    <Pagina
      clave="contacto"
      eyebrow="Estamos del otro lado"
      encabezado="Hablemos"
      entradilla="Elige por dónde te resulte más cómodo. Contestamos el mismo día en horario de oficina."
      jsonLd={jsonLd}
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 pb-16">
        <ul className="grid gap-4 sm:grid-cols-2">
          <Via
            href={waHref}
            externo
            icono={MessageCircle}
            titulo="WhatsApp"
            valor={telefono}
            nota="Lo más rápido. Para dudas sueltas, disponibilidad de una fecha o mandar fotos."
            destacado
          />
          <Via
            href={`tel:${telefono.replace(/[^\d+]/g, '')}`}
            icono={Phone}
            titulo="Teléfono"
            valor={telefono}
            nota="Si prefieres explicarlo hablando. A veces es más fácil que escribirlo."
          />
          <Via
            href={`mailto:${correo}`}
            icono={Mail}
            titulo="Correo"
            valor={correo}
            nota="Para mandar documentos, listas o cotizaciones de otros proveedores."
          />
          <Via
            href={MAPA}
            externo
            icono={MapPin}
            titulo="Visítanos"
            valor={UBICACION}
            nota="Avísanos antes y te enseñamos los ocho espacios con calma."
          />
        </ul>

        <div className="skeu-card mt-10 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-light text-white/90">
            ¿Ya sabes qué evento quieres hacer?
          </h2>
          <p className="mt-3 mx-auto max-w-lg text-sm font-light leading-relaxed text-white/45">
            El formulario nos deja prepararte una propuesta antes de contestarte, con los
            espacios que le quedan bien a tu número de invitados. Es un minuto.
          </p>
          <Link
            to="/cotizar"
            className="skeu-gold-btn mt-7 inline-flex rounded-full px-8 py-3.5 text-xs font-medium tracking-[0.16em] uppercase text-[#1a1408]"
          >
            Cotizar mi evento
          </Link>
        </div>
      </div>

      {/* LA UBICACION VIVE AQUI DESDE 2026-08-25.
        *
        * Era `/ubicacion`, una pagina propia. El dueno pidio fundirlas y la ruta vieja quedo
        * como redireccion 301 en `vercel.json` —no como salto de cliente— porque un 301 es
        * lo unico que traslada a Google las senales que la direccion ya tuviera. */}
      <section aria-labelledby="como-llegar" className="border-t border-white/5">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 pt-16">
          <div className="flex items-center gap-4">
            <span className="h-px w-10 bg-gradient-to-r from-[#C9A84C]/60 to-transparent" />
            <span className="text-[10px] font-light tracking-[0.32em] uppercase text-[#C9A84C]/75">
              Donde estamos
            </span>
          </div>
          <h2
            id="como-llegar"
            className="mt-5 text-2xl sm:text-4xl font-extralight tracking-tight text-white/95"
          >
            Cómo llegar
          </h2>
          <p className="mt-4 max-w-2xl text-base font-light leading-relaxed text-white/50">
            Estamos en Xochimilco, con estacionamiento dentro del recinto.
          </p>
        </div>
        <ComoLlegar />
      </section>

    </Pagina>
  );
}

function Via({ href, icono: Icono, titulo, valor, nota, externo = false, destacado = false }) {
  return (
    <li>
      <a
        href={href}
        {...(externo ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        className={[
          'skeu-card skeu-card-hover group flex h-full flex-col rounded-2xl p-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/60',
          destacado ? 'border-[#C9A84C]/25' : '',
        ].join(' ')}
      >
        <Icono
          size={20}
          className={destacado ? 'text-[#C9A84C]' : 'text-[#C9A84C]/60'}
          aria-hidden="true"
        />
        <h2 className="mt-5 text-[10px] font-light tracking-[0.28em] uppercase text-white/40">
          {titulo}
        </h2>
        <p className="mt-1.5 break-words text-lg font-light text-white/90 transition-colors group-hover:text-[#C9A84C]">
          {valor}
        </p>
        <p className="mt-3 text-sm font-light leading-relaxed text-white/40">{nota}</p>
      </a>
    </li>
  );
}
