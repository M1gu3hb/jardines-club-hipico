import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import MesaReglas from "./MesaReglas";
import MesaEditor from "./MesaEditor";

/** Sección de mesas en la ficha del evento (admin): reglas + editor. */
export default function EventoMesasAdmin({ eventoId, salonId }) {
  const [reglas, setReglas] = useState(null);

  useEffect(() => {
    base44.entities.EventoReglasMesas.filterEstricto({ eventoId })
      .then((r) => setReglas(r[0] || null))
      .catch(() => setReglas(null)); // MesaReglas, justo debajo, es quien enseña el fallo
  }, [eventoId]);

  return (
    <div>
      <MesaReglas eventoId={eventoId} onCambio={setReglas} />
      <MesaEditor eventoId={eventoId} salonId={salonId} reglas={reglas} editable />
    </div>
  );
}
