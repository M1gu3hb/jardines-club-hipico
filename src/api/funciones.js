/**
 * funciones.js — LAS RUTAS SERVERLESS QUE **ESTA** APLICACIÓN TIENE DESPLEGADAS.
 *
 * Por qué existe (FASE 6, §5 del plan de cierre): el shim `base44Client.js` es el único
 * acceso a datos del proyecto y se comparte por copia entre los tres repos. Su núcleo
 * —entidades, RPC, storage, auth— es idéntico en los tres y así debe seguir: el §10 del plan
 * pone como riesgo número uno bifurcarlo, porque serían tres verdades sobre la misma base.
 *
 * Pero el bloque de `functions` NO es común: nombraba con `fetch` las cinco rutas de `api/`
 * del monolito, y cada aplicación solo tiene desplegadas las suyas. En las otras, esos
 * nombres viajaban en el bundle apuntando a rutas que allí dan 404.
 *
 * La salida es partirlo: el núcleo sigue idéntico y esta pieza es de cada app. `RUTAS`
 * declara lo que esta aplicación tiene, y un contrato comprueba que coincida con los
 * archivos reales de `api/`.
 *
 * UN NOMBRE DESCONOCIDO LANZA, no devuelve `{}`. La versión del monolito devolvía un objeto
 * vacío en silencio, que es la peor forma de fallar: quien llamaba creía haber enviado algo.
 */
import { supabase } from "./supabaseClient";

/** POST con la sesión actual. Cada ruta de `api/` vuelve a verificar el rol por su cuenta. */
async function postAutenticado(ruta, payload) {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  const res = await fetch(ruta, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token || ""}` },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
  return json;
}

/** Las rutas de `api/` que existen en el SITIO PÚBLICO. */
export const RUTAS = ["/api/solicitud"];

export const functions = {
  // El formulario público: la fila ya la creó la RPC `solicitud_crear`; esto solo dispara
  // el correo al dueño. Se llama en modo dispara-y-olvida, así que el error se traga arriba.
  async invoke(name, payload) {
    if (name === "gmailSolicitud" || name === "notificarNuevaSolicitud") {
      const body = (payload && payload.data) || payload || {};
      const res = await fetch("/api/solicitud", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`solicitud ${res.status}`);
      return res.json().catch(() => ({ ok: true }));
    }
    throw new Error(`El sitio público no tiene desplegada la función "${name}"`);
  },
};
