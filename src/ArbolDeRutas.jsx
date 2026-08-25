import { Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { RUTAS } from '@/rutas';
import Layout from '@/Layout';
import Home from '@/pages/Home';
import NoEncontrada from '@/pages/NoEncontrada';

/**
 * ArbolDeRutas — el árbol de la aplicación SIN el enrutador.
 *
 * ── El nombre del archivo no es capricho ────────────────────────────────────
 *
 * Se llamaba `Rutas.jsx`, y a un archivo de distancia estaba `rutas.js` con los datos de las
 * rutas. Dos módulos que solo se diferencian en una mayúscula: Windows los resuelve como el
 * MISMO archivo y Linux como dos distintos. O sea que `@/Rutas` funcionaba aquí y habría
 * fallado en el despliegue, que corre sobre Linux. Lo cazó el build; no hay que volver a
 * ponerse en esa situación.
 *
 * ── Por qué está separado de `App.jsx` ──────────────────────────────────────
 *
 * Porque hay dos entradas y cada una trae su propio enrutador: el navegador usa
 * `BrowserRouter` (lee la barra de direcciones) y el prerender usa `StaticRouter` (recibe la
 * ruta como argumento). Todo lo de dentro es idéntico.
 *
 * Si cada entrada montara su propio árbol, el HTML del build y lo que ve el visitante podrían
 * separarse sin que nada avisara. Y ese fallo es especialmente feo, porque lo que se rompe es
 * justo lo que solo ve Google.
 *
 * @param {Object} props
 * @param {Record<string, any>} props.paginas Clave de ruta → componente ya resuelto.
 */
export default function ArbolDeRutas({ paginas }) {
  return (
    <Layout>
      <Suspense fallback={<Cargando />}>
        <Routes>
          <Route path="/" element={<Home />} />

          {RUTAS.filter((r) => r.clave !== 'home').map((r) => {
            const Pagina = paginas[r.clave];
            if (!Pagina) return null;
            return <Route key={r.clave} path={r.ruta} element={<Pagina />} />;
          })}

          <Route path="*" element={<NoEncontrada />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

/**
 * Lo que se ve mientras llega el trozo de una página.
 *
 * Sobrio y del color del fondo a propósito: un esqueleto animado llamaría la atención sobre
 * la espera en vez de sobre el contenido, y en una conexión decente esto dura menos de lo que
 * tarda el ojo en enfocarlo.
 */
export const Cargando = () => (
  <div className="min-h-[60vh] grid place-items-center" role="status" aria-live="polite">
    <span className="sr-only">Cargando</span>
    <span className="h-1 w-16 rounded-full bg-gradient-to-r from-transparent via-[#C9A84C]/50 to-transparent animate-pulse" />
  </div>
);
