import { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import StaggeredMenu from '@/components/StaggeredMenu';
import SoundToggle from '@/components/SoundToggle';
import { RUTAS_MENU, rutaPorClave } from '@/rutas';
import BarraSuperior from './BarraSuperior';
import { useConfigSitio } from '@/lib/datos';

/**
 * MenuDelSitio — el menú de siempre, ahora gobernando el sitio entero.
 *
 * ── Por qué vuelve `StaggeredMenu` ──────────────────────────────────────────
 *
 * Porque el dueño lo pidió, y tiene razón. Durante la FASE 3 lo sustituí por una barra
 * horizontal con el argumento de que una navegación visible descubre secciones que un menú
 * escondido no. El argumento sigue siendo cierto **y aun así estaba equivocado**: la animación
 * lateral es parte del carácter del sitio, y un recinto de eventos se vende por cómo se siente.
 * Cambiar eso por una barra genérica era ganar una discusión de usabilidad y perder el sitio.
 *
 * Lo que sí se conserva del intento anterior es lo que resolvía problemas de verdad:
 *
 * · **El CTA vive fuera del menú**, en la cabecera, visible sin abrir nada. Es el único
 *   elemento que genera negocio y esconderlo tras un clic lo entierra.
 * · **El interruptor de sonido también**, porque el sitio hace sonidos y tiene que poder
 *   callarse desde cualquier página.
 * · **Los items salen de `rutas.js`**, no de una lista escrita a mano. Antes eran anclas de la
 *   portada; ahora son las rutas del sitio, y una ruta nueva aparece aquí sola.
 *
 * ── Los dos items que NO son rutas del sitio ────────────────────────────────
 *
 * `Clases de baile` y `Portal de clientes` van al final y marcados con `esRuta`, que es lo que
 * `StaggeredMenu` usa para pintarlos distintos. El portal es **otra aplicación en otro
 * origen**: hay que salir del enrutador, no navegar dentro de él.
 */
export default function MenuDelSitio() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { data: config } = useConfigSitio();
  const cotizar = rutaPorClave('cotizar');

  const items = useMemo(() => {
    // INICIO ABRE EL MENÚ, Y NO SALE DE `RUTAS_MENU`.
    //
    // La portada está marcada `menu: false` en `rutas.js` —el logotipo ya lleva a ella— y por
    // eso faltaba. Pero el dueño la quiere explícita, y tiene razón: el logotipo es una
    // convención que mucha gente no conoce, y quien abre un menú buscando «cómo vuelvo al
    // principio» necesita leerlo, no deducirlo. Cuesta una línea y quita una duda.
    const inicio = {
      id: 'home',
      label: 'Inicio',
      link: '/',
      ariaLabel: 'Ir al inicio',
      esRuta: false,
    };

    const delSitio = RUTAS_MENU
      // `avisos` sale de aqui y se anade al final del todo, por debajo del portal: es lo que
      // pidio el dueno, dos veces y con enfasis. Ver la nota en `rutas.js`.
      .filter((r) => r.clave !== 'home' && r.clave !== 'avisos')
      .map((r) => ({
        id: r.clave,
        label: r.nombre,
        link: r.ruta,
        ariaLabel: `Ir a ${r.nombre}`,
        esRuta: false,
      }));

    return [inicio].concat(delSitio).concat([{
      // OTRA APLICACIÓN, en otro origen. La dirección sale de `VITE_URL_PORTAL` para no
      // escribirla a mano (regla R8). El respaldo `/portal` no es decorativo: si faltara la
      // variable, cae en la ruta vieja de este mismo sitio, que es un 301 hacia el portal. El
      // peor caso es un salto de más, no un enlace roto.
      id: 'portal',
      label: 'Portal de clientes',
      link: import.meta.env.VITE_URL_PORTAL || '/portal',
      ariaLabel: 'Entrar al portal de clientes',
      esRuta: true,
    }]).concat(
      // Y por debajo del portal, lo ultimo: los avisos. Solo si la ruta existe —lleva
      // `soloSiHay: 'anuncios'`, asi que desaparece del menu cuando no hay ninguno publicado,
      // en vez de llevar a una pagina vacia.
      // AVISOS, LO ÚLTIMO DE TODO Y EN PEQUEÑO.
      //
      // Va con `esRuta: true`, que es el estilo discreto del portal — no porque sea otra
      // aplicación, sino porque el dueño lo quiere abajo del todo y con el mismo peso visual:
      // *«los avisos van hasta hasta abajo, ni siquiera abajo de portal de clientes»*.
      //
      // En tamaño de titular competía con Espacios y Eventos, que son las que venden. Aquí
      // está disponible para quien la busque y no le quita sitio a nadie.
      RUTAS_MENU.filter((r) => r.clave === 'avisos').map((r) => ({
        id: r.clave,
        label: r.nombre,
        link: r.ruta,
        ariaLabel: `Ir a ${r.nombre}`,
        esRuta: true,
      })),
    );
  }, []);

  /**
   * Qué item se marca como activo.
   *
   * Se compara por PREFIJO y no por igualdad, porque estando en
   * `/espacios/salon-encanto` el item que tiene que verse activo es «Espacios». Con igualdad
   * exacta, toda ficha dejaría el menú sin ningún item marcado y el visitante sin saber dónde
   * está.
   */
  const activo = items.find((i) => !i.esRuta && i.link !== '/' && pathname.startsWith(i.link))?.id
    || (pathname === '/' ? 'home' : null);

  const alPulsar = (item) => {
    // Una URL absoluta es otra aplicación: hay que SALIR del enrutador. Con `navigate()` el
    // enrutador la trataría como ruta interna y el cliente acabaría en un 404 de este sitio.
    if (/^https?:[/][/]/.test(item.link)) {
      window.location.href = item.link;
      return;
    }
    navigate(item.link);
  };

  return (
    <StaggeredMenu
      items={items}
      logoUrl={config?.logoUrl}
      navegacion={<BarraSuperior />}
      activeId={activo}
      onItemClick={alPulsar}
      headerExtra={
        <div className="flex items-center gap-2 sm:gap-3">
          <SoundToggle />
          {/* Exento: el medidor lo compara contra el fondo #0a0a0a, pero este tinte va sobre el
              degradado dorado de .skeu-gold-btn; el par real no baja de 5.3:1. */}
          <Link
            to={cotizar.ruta}
            className="skeu-gold-btn inline-flex items-center rounded-full px-4 py-2 text-[10px] sm:px-5 sm:text-[11px] font-medium tracking-[0.14em] uppercase text-[#1a1408] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            Cotizar
          </Link>
        </div>
      }
    />
  );
}
