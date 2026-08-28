import { Link, useLocation } from 'react-router-dom';
import { MapPin, Phone, Mail, LogIn } from 'lucide-react';
import CtaFinal from './CtaFinal';
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
/**
 * El portal es OTRA aplicación, en otro origen.
 *
 * La dirección sale de `VITE_URL_PORTAL` para no escribirla a mano (regla R8). El respaldo
 * `/portal` no es decorativo: si la variable faltara, el enlace cae en la ruta vieja de este
 * mismo sitio, que la FASE 4 convirtió en un 301 hacia el portal. El peor caso es un salto de
 * más, no un enlace roto.
 */
function EnlacePortal() {
  const destino = import.meta.env.VITE_URL_PORTAL || '/portal';
  const esOtraApp = /^https?:[/][/]/.test(destino);
  const clases =
    'inline-flex items-center gap-2 text-[10px] font-light tracking-[0.2em] uppercase text-[color:var(--texto-3)] transition-colors hover:text-[#C9A84C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/60 rounded-sm';

  // Una URL absoluta es otra aplicación: hay que SALIR del enrutador, no navegar dentro de él.
  if (esOtraApp) {
    return (
      <a href={destino} className={clases}>
        <LogIn size={12} aria-hidden="true" />
        Portal de clientes
      </a>
    );
  }
  return (
    <Link to={destino} className={clases}>
      <LogIn size={12} aria-hidden="true" />
      Portal de clientes
    </Link>
  );
}

export default function PieDeSitio() {
  const { pathname } = useLocation();
  const anio = new Date().getFullYear();

  // EN LA PORTADA, LA FRANJA DE COTIZACIÓN NO SE REPITE.
  //
  // El pie la lleva en todas las páginas, y eso está bien: en cualquier otra ruta es la única
  // vez que aparece. Pero la portada YA tiene la suya a media página, justo antes de la
  // galería, y el dueño la aprobó ahí. Con las dos, el mismo titular —«¿Listo para cotizar tu
  // evento?»— salía dos veces en la misma pantalla larga.
  //
  // Repetir una llamada a la acción palabra por palabra no la refuerza: la gasta, y hace que
  // la página parezca mal armada. Se queda la de arriba, que llega cuando el visitante acaba
  // de leer cómo funciona y todavía tiene sitio para seguir mirando.
  // DÓNDE NO VA LA FRANJA DE COTIZACIÓN.
  //
  // En la PORTADA, porque ya tiene la suya a media página y el dueño la aprobó ahí: repetir el
  // mismo titular dos veces en la misma pantalla larga no refuerza, gasta.
  //
  // Y en `/cotizar`, por un motivo distinto y más evidente: preguntarle «¿listo para cotizar
  // tu evento?» a alguien que está rellenando el formulario de cotización no tiene sentido.
  // Palabras del dueño: *«ahí como que no cuadra, descuadra»*.
  const sinFranja = pathname === '/' || pathname === '/cotizar';
  const cotizar = rutaPorClave('cotizar');
  const enElMapa = RUTAS.filter((r) => r.indexable !== false && !r.coleccion && r.clave !== 'home');

  const telHref = `tel:${TELEFONO.replace(/[^\d+]/g, '')}`;
  const waHref = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
    'Hola, me interesa cotizar un evento en Jardines Club Hípico.',
  )}`;

  return (
    <footer className="relative mt-24 border-t border-[#C9A84C]/15 bg-[#080808]">
      {!sinFranja && <CtaFinal />}

      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-14">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr]">

          <div>
            <p className="text-[#F5E3A0] text-base font-light tracking-[0.26em] uppercase">Jardines</p>
            <p className="text-[color:var(--texto-3)] text-[10px] font-light tracking-[0.4em] uppercase">Club Hípico</p>
            <p className="mt-6 max-w-xs text-sm font-light leading-relaxed text-[color:var(--texto-3)]">
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
                    className="text-sm font-light text-[color:var(--texto-3)] transition-colors hover:text-[#C9A84C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/60 rounded-sm"
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
                  className="group flex items-start gap-3 text-[color:var(--texto-3)] transition-colors hover:text-white/80"
                >
                  {/* Los tres iconos de contacto van en oro hundido, no en oro pleno: forman una columna
                      que se repite, y a 8.66:1 la marca pesaria mas que la direccion o el telefono. */}
                  <MapPin size={14} className="mt-0.5 shrink-0 text-[color:var(--oro-hundido)]" aria-hidden="true" />
                  <span>{UBICACION}</span>
                </a>
              </li>
              <li>
                <a href={telHref} className="flex items-center gap-3 text-[color:var(--texto-3)] transition-colors hover:text-white/80">
                  <Phone size={14} className="shrink-0 text-[color:var(--oro-hundido)]" aria-hidden="true" />
                  <span>{TELEFONO}</span>
                </a>
              </li>
              <li>
                <a href={`mailto:${CORREO}`} className="flex items-center gap-3 text-[color:var(--texto-3)] transition-colors hover:text-white/80 break-all">
                  <Mail size={14} className="shrink-0 text-[color:var(--oro-hundido)]" aria-hidden="true" />
                  <span>{CORREO}</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/5 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10px] font-light tracking-[0.14em] text-[color:var(--texto-3)]">
            © {anio} Jardines Club Hípico · Xochimilco, Ciudad de México
          </p>

          {/* EL ACCESO AL PORTAL DE CLIENTES.
            *
            * Vivia dentro del menu de la portada, que se retiro al unificar la navegacion. Si no
            * se movia aqui, el portal se quedaba SIN NINGUNA PUERTA desde el sitio publico: un
            * cliente con evento contratado no tendria por donde entrar.
            *
            * Va en el pie y no en la barra a proposito. No es una seccion del sitio: es una
            * puerta de servicio para quien YA contrato, y en la barra competiria con las
            * catorce que si le interesan a quien esta decidiendo. */}
          <EnlacePortal />
        </div>
      </div>
    </footer>
  );
}
