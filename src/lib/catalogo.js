/**
 * catalogo.js — Pool de cosas que el cliente puede AGREGAR a su evento.
 *
 * Solo add-ons reales (amenidades tipo pista pixel, cámara 360, mesa de dulces…),
 * NO los servicios estándar/incluidos (seguridad, jardines, coordinación…). El admin
 * decide con el flag `portal_sugerible` (amenidades: true por defecto; servicios: false).
 */
import { base44 } from "@/api/base44Client";

export async function poolSugerible() {
  const [amenidades, servicios] = await Promise.all([
    base44.entities.AmenidadItem.filter({ activo: true }, "orden"),
    base44.entities.ServicioItem.filter({ activo: true }, "orden"),
  ]);
  const pool = [
    ...amenidades
      .filter((a) => a.portalSugerible !== false)
      .map((a) => ({ ...a, origen: "amenidad" })),
    ...servicios
      .filter((s) => s.portalSugerible === true)
      .map((s) => ({ ...s, titulo: s.titulo || s.nombre, origen: "servicio" })),
  ];
  return pool;
}
