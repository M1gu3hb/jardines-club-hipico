import { base44 } from "@/api/base44Client";
import { Users, Mail } from "lucide-react";
import { useCarga } from "@/lib/useCarga";
import { Estado, EsqueletoFilas } from "@/components/ui/Estado";

/** Confirmaciones de invitados (RSVP) de la invitación digital del cliente. */
export default function EventoRsvps({ evento }) {
  const { datos, cargando, error, recargar } = useCarga(
    () => base44.entities.Rsvp.filterEstricto({ eventoId: evento.id }, "-created_date"), [evento.id]);
  const rsvps = datos || [];

  const total = rsvps.reduce((a, r) => a + (Number(r.personas) || 1), 0);

  return (
    <div className="max-w-2xl">
      {!evento.invitacionActiva && (
        <p className="text-white/40 text-sm mb-4 flex items-center gap-2">
          <Mail size={14} className="text-[#C9A84C]/60" /> El cliente aún no activó su invitación digital (la crea desde su portal).
        </p>
      )}
      <div className="flex items-center justify-between mb-3">
        <p className="text-white/50 text-xs uppercase tracking-wider flex items-center gap-1.5"><Users size={13} /> Confirmados</p>
        {rsvps.length > 0 && <span className="text-[#C9A84C] text-sm">{total} personas · {rsvps.length} respuestas</span>}
      </div>
      <Estado
        cargando={cargando} error={error} onReintentar={recargar}
        vacio={rsvps.length === 0}
        mensajeVacio="Sin confirmaciones todavía."
        mensajeError="No se pudieron cargar las confirmaciones."
        esqueleto={<EsqueletoFilas filas={3} alto="h-14" />}
      >
      <div className="space-y-2">
        {rsvps.map((r) => (
          <div key={r.id} className="bg-[#111] border border-white/5 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-white/80 text-sm">{r.nombre}</span>
              <span className="text-white/40 text-xs">{r.personas} {Number(r.personas) === 1 ? "persona" : "personas"}</span>
            </div>
            {r.mensaje && <p className="text-white/45 text-xs mt-1 italic">"{r.mensaje}"</p>}
          </div>
        ))}
      </div>
      </Estado>
    </div>
  );
}
