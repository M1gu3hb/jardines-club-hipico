import { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';

/**
 * NumeroQueCuenta — el número sube desde cero al llegar a él.
 *
 * ── Por qué en un sitio de eventos ──────────────────────────────────────────
 *
 * Porque los números de aquí son argumentos: **8 espacios**, **17 amenidades**, **600
 * invitados**, **2 hectáreas**. Un número que sube atrae la vista al dato en vez de a la
 * decoración, que es lo contrario de lo que hace la mayoría de las animaciones.
 *
 * ── El número final está en el HTML desde el principio ──────────────────────
 *
 * Se pinta con `aria-label` y un `<span>` oculto a los lectores. Si el contador fuera la única
 * fuente del número, el prerender escribiría un cero y eso es lo que vería Google: «0
 * amenidades». Aquí la animación es una capa encima de un dato que ya está.
 *
 * ── Y no cuenta si no se ve ─────────────────────────────────────────────────
 *
 * `useInView` con `once` dispara al entrar en pantalla. Un contador que corre mientras está
 * fuera de la vista termina antes de que nadie lo mire: todo el coste, ninguno del efecto.
 */
export default function NumeroQueCuenta({ hasta, duracion = 1.4, className = '', sufijo = '' }) {
  const ref = useRef(null);
  const aLaVista = useInView(ref, { once: true, margin: '-60px' });
  const menosMovimiento = useReducedMotion();
  const [valor, setValor] = useState(0);

  useEffect(() => {
    if (!aLaVista || menosMovimiento) return undefined;

    let cuadro;
    const inicio = performance.now();

    const paso = (ahora) => {
      const t = Math.min((ahora - inicio) / (duracion * 1000), 1);
      // Desaceleración cúbica: arranca rápido y frena al final. Un contador lineal parece un
      // marcador de gasolinera; éste parece que se posa sobre la cifra.
      const suave = 1 - Math.pow(1 - t, 3);
      setValor(Math.round(suave * hasta));
      if (t < 1) cuadro = requestAnimationFrame(paso);
    };

    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, [aLaVista, hasta, duracion, menosMovimiento]);

  const mostrado = menosMovimiento ? hasta : valor;

  return (
    <span ref={ref} className={className}>
      {/* El valor real, siempre, para lectores de pantalla y para el buscador. */}
      <span className="sr-only">{hasta}{sufijo}</span>
      {/* `tabular-nums` fija el ancho de cada dígito: sin eso, el número se ensancha y se
          encoge mientras cuenta y arrastra al texto de al lado. */}
      <span aria-hidden="true" className="tabular-nums">{mostrado}{sufijo}</span>
    </span>
  );
}
