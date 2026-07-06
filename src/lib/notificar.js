/**
 * notificar.js — Notifica al dueño la actividad del portal por DOS canales:
 *  1. Dashboard: fila en `jardines.notificaciones` (RLS: el cliente solo puede
 *     crear notificaciones de SU evento; solo el admin las lee).
 *  2. Correo: POST /api/notificar (serverless con Gmail; valida la sesión).
 *
 * Siempre es "fire-and-forget": si algo falla, NUNCA rompe la acción del
 * cliente (confirmar, reseñar, agregar interés). Los errores solo se loguean.
 */
import { base44 } from "@/api/base44Client";
import { supabase } from "@/api/supabaseClient";

export async function notificarDueno({ eventoId, tipo = "info", titulo, detalle = "", correo = true }) {
  // 1) Dashboard
  try {
    await base44.entities.Notificacion.create({ eventoId, tipo, titulo, detalle });
  } catch (e) {
    console.error("[notificar] dashboard:", e.message);
  }
  // 2) Correo (opcional — la actividad ligera NO manda correo, solo dashboard)
  if (!correo) return;
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) {
      fetch("/api/notificar", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ titulo, detalle }),
      }).catch(() => {});
    }
  } catch { /* sin sesión no hay correo; el dashboard ya quedó */ }
}

/**
 * Actividad ligera del cliente (visitas, revisó documentos, música, quitó de su
 * lista…). Va SOLO al dashboard (sin correo) y se de-duplica por sesión del
 * navegador para no llenar de ruido (una vez por clave por sesión).
 */
export function registrarActividad({ eventoId, clave, tipo = "actividad", titulo, detalle = "" }) {
  try {
    const k = `jch_act_${eventoId}_${clave}`;
    if (sessionStorage.getItem(k) === "1") return;
    sessionStorage.setItem(k, "1");
  } catch { /* sin storage: registrar de todos modos */ }
  notificarDueno({ eventoId, tipo, titulo, detalle, correo: false });
}
