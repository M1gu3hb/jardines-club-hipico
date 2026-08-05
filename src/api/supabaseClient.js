import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // ANTES aquí solo había un `console.error` y el comentario «no romper el build; avisar en
  // runtime». No avisaba en runtime: `createClient(undefined, undefined)` LANZA
  // («supabaseUrl is required») en la carga del módulo, antes de que React monte nada. El
  // visitante veía un rectángulo negro, y el aviso quedaba en una consola que nadie abre.
  //
  // Una variable de entorno que falta es un error de despliegue, no una condición de uso: tiene
  // que verse. Se pinta un mensaje en `#root` a mano —sin React, que aún no existe— y DESPUÉS se
  // deja subir el fallo, para que no se confunda con «la base está caída».
  console.error("[supabase] Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY");
  const root = typeof document !== "undefined" && document.getElementById("root");
  if (root) {
    root.innerHTML = "";
    const caja = document.createElement("div");
    caja.setAttribute("role", "alert");
    caja.style.cssText =
      "min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;" +
      "background:#0a0a0a;color:#fff;font-family:system-ui,sans-serif;text-align:center;line-height:1.6";
    const dentro = document.createElement("div");
    dentro.style.cssText = "max-width:32rem";
    const h = document.createElement("p");
    h.style.cssText = "color:#C9A84C;font-size:18px;margin:0 0 10px";
    h.textContent = "El sitio no está configurado.";
    const p = document.createElement("p");
    p.style.cssText = "color:rgba(255,255,255,.55);font-size:14px;margin:0";
    p.textContent =
      "Faltan las variables de entorno de la base de datos en este despliegue. " +
      "No es un problema de tu conexión.";
    dentro.append(h, p);
    caja.append(dentro);
    root.append(caja);
  }
}

// Todo Jardines vive en el schema `jardines` (proyecto compartido con otro sitio).
export const supabase = createClient(url, anonKey, {
  db: { schema: "jardines" },
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});
