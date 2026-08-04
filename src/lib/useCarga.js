import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useCarga — una lectura con sus TRES estados de verdad: cargando, listo y falló.
 *
 * POR QUÉ EXISTE
 *   Casi todas las pantallas hacían `Entidad.list().then(setX)` con `useState([])`. Eso deja
 *   un solo estado observable —el array— para tres situaciones que no se parecen en nada:
 *
 *     - todavía no ha llegado    → el usuario ve "No hay eventos"
 *     - de verdad no hay nada    → el usuario ve "No hay eventos"
 *     - la lectura se cayó       → el usuario ve "No hay eventos"
 *
 *   Y en el último caso es mentira. El shim (`runQuery`) devuelve `[]` cuando la consulta
 *   falla, así que un corte de red, una policy de RLS mal puesta o un 42703 se presentan como
 *   "aquí no hay nada". El dueño concluye que se le borraron los datos; el cliente concluye
 *   que su portal está vacío. Por eso las lecturas de esta capa usan `listEstricto` /
 *   `filterEstricto`, que **lanzan**, y este hook las separa.
 *
 * CÓMO SE USA
 *     const { datos, cargando, error, recargar } = useCarga(
 *       () => base44.entities.Salon.listEstricto("orden"), []);
 *
 *   `datos` es `null` hasta que se sabe algo. `cargando` solo es cierto mientras no hay ni
 *   datos ni error. `recargar()` vuelve a intentarlo sin desmontar nada.
 *
 * ORDEN DE LLEGADA
 *   Cada ejecución lleva un número de turno. Si `recargar()` se dispara dos veces y la primera
 *   respuesta llega la última, se descarta: pintar la vieja encima de la nueva sería peor que
 *   no recargar. Lo mismo si el componente ya se desmontó.
 */
export function useCarga(cargar, deps = []) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [refresco, setRefresco] = useState(0);

  const turno = useRef(0);
  const vivo = useRef(true);
  useEffect(() => {
    vivo.current = true;
    return () => { vivo.current = false; };
  }, []);

  // `cargar` se recrea en cada render (es una flecha en el cuerpo del componente), así que la
  // dependencia real son las `deps` que declara quien llama, no la función. Se guarda en una
  // ref para que el efecto dependa SOLO de `deps`: si dependiera de `cargar`, cada render
  // dispararía una lectura nueva y el hook se convertiría en un bucle.
  const fnRef = useRef(cargar);
  fnRef.current = cargar;
  const fn = useCallback(() => fnRef.current(), deps);

  useEffect(() => {
    const mio = ++turno.current;
    let cancelado = false;
    Promise.resolve()
      .then(fn)
      .then((r) => {
        if (cancelado || !vivo.current || mio !== turno.current) return;
        setError(null);
        setDatos(r);
      })
      .catch((e) => {
        if (cancelado || !vivo.current || mio !== turno.current) return;
        console.error("[useCarga]", e?.message || e);
        setError(e || new Error("Falló la lectura"));
      });
    return () => { cancelado = true; };
  }, [fn, refresco]);

  const recargar = useCallback(() => {
    // No se borran los datos: durante un reintento se sigue viendo lo último bueno en vez de
    // parpadear a esqueleto. Sí se limpia el error, que es lo que se está reintentando.
    setError(null);
    setRefresco((n) => n + 1);
  }, []);

  return { datos, cargando: datos === null && error === null, error, recargar };
}
