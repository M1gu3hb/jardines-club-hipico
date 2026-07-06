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

export async function notificarDueno({ eventoId, tipo = "info", titulo, detalle = "" }) {
  // 1) Dashboard
  try {
    await base44.entities.Notificacion.create({ eventoId, tipo, titulo, detalle });
  } catch (e) {
    console.error("[notificar] dashboard:", e.message);
  }
  // 2) Correo (no esperamos el resultado para no frenar la UI)
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
