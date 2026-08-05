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
      {/* ESTA FRASE TAPÓ EL P0 DURANTE MESES. Decía «El cliente aún no activó su invitación
          digital (la crea desde su portal)», que le echaba la culpa al cliente de algo que el
          cliente **no puede hacer**. Un aviso que atribuye una causa falsa es peor que ninguno:
          cierra la investigación.

          Y la primera corrección cambió una suposición por otra: colgaba de `invitacionActiva`
          y afirmaba EN DURO que «nunca ha llegado a guardar nada». El día que la invitación
          funcione, un cliente que active y luego **desactive** dispararía ese mismo texto —el
          mismo patrón, con el signo invertido—.

          Ahora el aviso deriva del hecho comprobable: **si hay token, alguna vez se guardó**.
          `invitacion_token` solo lo escribe esta función, así que su ausencia es prueba de que
          nunca cuajó, y su presencia es prueba de que sí. No hace falta suponer nada. */}
      {!evento.invitacionActiva && (
        evento.invitacionToken ? (
          // Se guardó alguna vez y ahora está apagada. No se afirma quién la apagó: no consta.
          <p className="text-white/40 text-sm mb-4 flex items-center gap-2">
            <Mail size={14} className="text-[#C9A84C]/60" />
            La invitación digital está desactivada. Se creó en algún momento; ahora no admite confirmaciones.
          </p>
        ) : (
          <div className="border border-amber-400/30 bg-amber-400/5 px-4 py-3 rounded mb-4">
            <p className="text-amber-300/90 text-sm flex items-start gap-2">
              <Mail size={14} className="text-amber-300/70 flex-shrink-0 mt-0.5" />
              <span>
                Esta invitación <strong>nunca se ha llegado a guardar</strong>: no tiene enlace.
                La pantalla existe en el portal del cliente, pero su cuenta no tiene permiso para
                escribirla, así que no es algo que él pueda arreglar.
              </span>
            </p>
            <p className="text-white/45 text-xs mt-1.5 pl-6">
              Está pendiente de una decisión tuya: habilitarla para el cliente, o pasar la
              activación al panel.
            </p>
          </div>
        )
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
