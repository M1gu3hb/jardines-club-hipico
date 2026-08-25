import { Link } from 'react-router-dom';
import Cabecera from '@/lib/Cabecera';
import { RUTAS_MENU } from '@/rutas';

/**
 * NoEncontrada — la página 404.
 *
 * ── El 404 de verdad no lo da esta página ───────────────────────────────────
 *
 * Lo da el servidor. Una aplicación de una sola página que reescribe TODO a `index.html`
 * devuelve **200 OK** con una pantalla que dice «no encontrado», y eso es peor que un error:
 * Google indexa esa URL como si fuera contenido válido, y acaba con cientos de direcciones
 * inventadas listadas como páginas buenas del sitio. Se llama «soft 404».
 *
 * Por eso el rediseño quitó el `rewrites` atrapatodo de `vercel.json` y prerenderiza cada
 * ruta real a su propio archivo. Lo que no existe como archivo cae en `404.html`, que Vercel
 * sirve **con estado 404**. Este componente es lo que se ve dentro de ese archivo, y también
 * lo que se ve al navegar a una ruta mala ya dentro de la aplicación.
 *
 * ── Por qué lleva enlaces ───────────────────────────────────────────────────
 *
 * Un 404 con un «volver al inicio» y nada más devuelve al visitante al principio del embudo.
 * Quien llega aquí venía siguiendo un enlace roto o una dirección vieja: enseñarle las
 * secciones reales lo recoloca donde quería estar, en vez de hacerle empezar de cero.
 */
export default function NoEncontrada() {
  return (
    <>
      {/* `noindex` aunque el servidor ya devuelva 404: si alguna vez esta pantalla se sirviera
          con 200 por un fallo de configuración, esto seguiría impidiendo que se indexara. */}
      <Cabecera
        titulo="Esta página no existe"
        descripcion="La dirección que buscas no está en el sitio."
        noindex
      />

      <section className="mx-auto max-w-3xl px-5 sm:px-8 pt-40 pb-28 text-center">
        <p className="text-[#C9A84C]/60 text-[10px] font-light tracking-[0.4em] uppercase">
          Error 404
        </p>

        <h1 className="mt-6 text-5xl sm:text-7xl font-extralight tracking-tight text-white/95 leading-none">
          Esta página<br />no existe
        </h1>

        <p className="mt-8 mx-auto max-w-md text-base font-light leading-relaxed text-white/45">
          Puede que el enlace esté roto o que la dirección haya cambiado. El recinto sigue
          donde estaba, eso sí.
        </p>

        <nav aria-label="Secciones del sitio" className="mt-14">
          <ul className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3">
            {RUTAS_MENU.map((r) => (
              <li key={r.clave}>
                <Link
                  to={r.ruta}
                  className="inline-block rounded-full border border-[#C9A84C]/20 px-4 py-2 text-[11px] font-light tracking-[0.14em] uppercase text-white/55 transition-colors hover:border-[#C9A84C]/50 hover:text-[#C9A84C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/60"
                >
                  {r.nombre}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <Link
          to="/cotizar"
          className="skeu-gold-btn mt-12 inline-flex rounded-full px-8 py-3.5 text-xs font-medium tracking-[0.16em] uppercase text-[#1a1408]"
        >
          Cotizar mi evento
        </Link>
      </section>
    </>
  );
}
