import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { RUTAS_MENU, rutaPorClave } from '@/rutas';
import SoundToggle from '@/components/SoundToggle';

/**
 * BarraNavegacion — la navegación persistente del sitio.
 *
 * ── Por qué nace ────────────────────────────────────────────────────────────
 *
 * Hasta ahora el sitio era una sola página y el menú (`StaggeredMenu`) llevaba a ANCLAS de
 * esa página. En un sitio de varias páginas eso ya no vale: hace falta una navegación que
 * esté siempre, que diga dónde estás, y que funcione igual llegando desde Google a una
 * página interior que entrando por la portada.
 *
 * En la FASE 3 esta barra pasó a gobernar TAMBIÉN la portada, y el menú de anclas
 * (`StaggeredMenu`) se retiró de ella. Dos menús en el mismo sitio, con dos ideas distintas de
 * qué significa navegar, dejaban al visitante sin saber si estaba bajando o cambiando de
 * página. El componente sigue en el repositorio, sin usar, hasta que el dueño decida qué hacer
 * con él: es una pieza con carácter y retirarla del todo es decisión suya.
 *
 * ── Decisiones ──────────────────────────────────────────────────────────────
 *
 * · **Transparente arriba, sólida al bajar.** Sobre el hero, cualquier barra opaca le come
 *   los primeros 80 px al video, que es lo mejor que tiene el recinto. Al hacer scroll sí
 *   se vuelve legible, porque entonces compite con el contenido y tiene que ganar.
 *
 * · **El CTA no se esconde nunca**, ni en móvil. Es el único elemento que genera negocio;
 *   meterlo dentro del menú de hamburguesa lo entierra a dos toques de distancia.
 *
 * · **La ruta activa se marca con un subrayado dorado**, no solo con color: el dorado sobre
 *   negro no da contraste suficiente para que un cambio de tono se lea con seguridad.
 */
export default function BarraNavegacion() {
  const { pathname } = useLocation();
  const [abierto, setAbierto] = useState(false);
  const [bajado, setBajado] = useState(false);

  useEffect(() => {
    const alScroll = () => setBajado(window.scrollY > 24);
    alScroll();
    window.addEventListener('scroll', alScroll, { passive: true });
    return () => window.removeEventListener('scroll', alScroll);
  }, []);

  // Cambiar de ruta cierra el menú. Sin esto, tocar un enlace en móvil navega pero deja el
  // panel abierto encima de la página nueva, y parece que no pasó nada.
  useEffect(() => setAbierto(false), [pathname]);

  // Con el panel abierto se bloquea el scroll del fondo. Si no, el dedo arrastra la página
  // de debajo y al cerrar apareces en otro punto del documento sin haberlo pedido.
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const previo = document.body.style.overflow;
    document.body.style.overflow = abierto ? 'hidden' : previo;
    return () => { document.body.style.overflow = previo; };
  }, [abierto]);

  useEffect(() => {
    const alEscape = (e) => { if (e.key === 'Escape') setAbierto(false); };
    window.addEventListener('keydown', alEscape);
    return () => window.removeEventListener('keydown', alEscape);
  }, []);

  const esActiva = (ruta) => (ruta === '/' ? pathname === '/' : pathname.startsWith(ruta));
  const cotizar = rutaPorClave('cotizar');

  return (
    <header
      className={[
        'fixed top-0 inset-x-0 z-50 transition-all duration-500',
        bajado
          ? 'bg-[#0a0a0a]/85 backdrop-blur-xl border-b border-[#C9A84C]/15'
          : 'bg-transparent border-b border-transparent',
      ].join(' ')}
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className={`flex items-center justify-between transition-all duration-500 ${bajado ? 'h-16' : 'h-20'}`}>

          <Link
            to="/"
            className="group flex flex-col leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/60 rounded-sm"
            aria-label="Jardines Club Hípico, ir al inicio"
          >
            <span className="text-[#F5E3A0] text-sm sm:text-base font-light tracking-[0.28em] uppercase transition-colors group-hover:text-[#C9A84C]">
              Jardines
            </span>
            <span className="text-white/40 text-[9px] sm:text-[10px] font-light tracking-[0.42em] uppercase">
              Club Hípico
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1" aria-label="Navegación principal">
            {RUTAS_MENU.filter((r) => r.clave !== 'home').map((r) => (
              <Link
                key={r.clave}
                to={r.ruta}
                aria-current={esActiva(r.ruta) ? 'page' : undefined}
                className="group relative px-3 py-2 text-[11px] font-light tracking-[0.16em] uppercase text-white/55 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/60 rounded-sm"
              >
                {r.nombre}
                <span
                  className={[
                    'pointer-events-none absolute left-3 right-3 -bottom-px h-px bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent transition-transform duration-300 origin-left',
                    esActiva(r.ruta) ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100',
                  ].join(' ')}
                />
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {/* EL INTERRUPTOR DE SONIDO VIVE AQUI DESDE LA FASE 3.
              *
              * Estaba dentro del menu de la portada, que se retiro al unificar la navegacion.
              * Sin moverlo, el sitio seguiria haciendo sonidos —el formulario los hace— sin
              * ninguna forma de callarlos. Un sonido que no se puede apagar es peor que no
              * tener sonido, y ahora ademas se puede apagar desde cualquier pagina. */}
            <SoundToggle />

            {/* Visible SIEMPRE, también en móvil. Es el único elemento de la barra que genera
                negocio; meterlo dentro de la hamburguesa lo entierra a dos toques. En pantalla
                pequeña encoge, no desaparece. */}
            <Link
              to={cotizar.ruta}
              className="skeu-gold-btn inline-flex items-center rounded-full px-4 py-2 text-[10px] sm:px-5 sm:text-[11px] font-medium tracking-[0.14em] uppercase text-[#1a1408] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              Cotizar
            </Link>

            <button
              type="button"
              onClick={() => setAbierto((v) => !v)}
              aria-expanded={abierto}
              aria-controls="menu-movil"
              aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
              className="lg:hidden grid place-items-center h-10 w-10 rounded-full border border-[#C9A84C]/25 text-[#C9A84C] transition-colors hover:bg-[#C9A84C]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/60"
            >
              {abierto ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      <div
        id="menu-movil"
        hidden={!abierto}
        className="lg:hidden bg-[#0a0a0a]/97 backdrop-blur-xl border-t border-[#C9A84C]/15"
      >
        <nav className="mx-auto max-w-7xl px-5 py-6" aria-label="Navegación principal, móvil">
          <ul className="flex flex-col">
            {RUTAS_MENU.filter((r) => r.clave !== 'home').map((r, i) => (
              <li key={r.clave}>
                <Link
                  to={r.ruta}
                  aria-current={esActiva(r.ruta) ? 'page' : undefined}
                  className="flex items-baseline gap-4 py-3.5 border-b border-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/60 rounded-sm"
                >
                  <span className="text-[#C9A84C]/40 text-[10px] font-light tabular-nums w-5">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span
                    className={`text-lg font-light tracking-wide ${
                      esActiva(r.ruta) ? 'text-[#C9A84C]' : 'text-white/80'
                    }`}
                  >
                    {r.nombre}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <Link
            to={cotizar.ruta}
            className="skeu-gold-btn mt-6 flex items-center justify-center rounded-full px-6 py-3.5 text-xs font-medium tracking-[0.16em] uppercase text-[#1a1408]"
          >
            Cotizar mi evento
          </Link>
        </nav>
      </div>
    </header>
  );
}
