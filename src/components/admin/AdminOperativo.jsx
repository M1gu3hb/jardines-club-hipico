import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, ShieldCheck, ShieldAlert, Users, Check, AlertTriangle } from "lucide-react";

/**
 * AdminOperativo — asigna personal del salón a eventos.
 *
 * LO QUE HAY QUE ENTENDER ANTES DE TOCAR ESTA PANTALLA
 *
 * El permiso lo resuelve `jardines_private.operativo_eventos_permitidos()`
 * (`sec_14`), y es un **OR**:
 *
 *     evento activo  Y  es personal  Y  ( asignación vigente  OR  acceso_global )
 *
 * De ahí las dos reglas de esta UI:
 *
 *  1. **Asignar es aditivo y seguro.** No restringe a nadie: quien tiene
 *     `acceso_global` sigue viendo todos los eventos activos aunque se le
 *     asignen unos pocos.
 *  2. **El peligro es el inverso.** Apagar `acceso_global` a alguien **sin
 *     asignaciones vigentes** lo deja en **0 eventos** al instante, porque desde
 *     `sec_14` el sistema es fail-closed. Hoy los operativos existentes tienen
 *     `acceso_global = true` y **0 asignaciones**, así que un toggle ingenuo
 *     dejaría al personal sin acceso en pleno evento. Por eso apagarlo está
 *     **bloqueado** hasta que la persona tenga al menos una asignación vigente.
 *
 * Revocar es poner `revocada_at`, nunca `DELETE`: la tabla conserva historial.
 *
 * Abrir esta pantalla **no cambia el estado de nadie**: solo lee.
 */

/** Estado efectivo de una persona, con la misma lógica del OR de la base. */
function estadoEfectivo(persona, nAsignaciones) {
  if (!persona.activo) {
    return { clave: "inactivo", texto: "Inactivo — no ve ningún evento", tono: "text-white/30" };
  }
  if (persona.accesoGlobal) {
    return { clave: "global", texto: "Ve TODOS los eventos activos", tono: "text-[#C9A84C]" };
  }
  if (nAsignaciones > 0) {
    return {
      clave: "asignado",
      texto: `Ve ${nAsignaciones} evento${nAsignaciones === 1 ? "" : "s"} asignado${nAsignaciones === 1 ? "" : "s"}`,
      tono: "text-green-400/80",
    };
  }
  return { clave: "sin-acceso", texto: "SIN ACCESO — 0 eventos", tono: "text-red-400/90" };
}

export default function AdminOperativo() {
  const [personal, setPersonal] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [asigs, setAsigs] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true); setError("");
    try {
      // `filterEstricto`, no `filter`: con `filter` un fallo de RLS o de red se
      // presentaba como "No hay personal operativo dado de alta" — vacío
      // indistinguible de fallo, en la pantalla que decide quién puede trabajar.
      const [p, e, a] = await Promise.all([
        base44.entities.OperativoPersonal.filterEstricto(null),
        base44.entities.Evento.filterEstricto({ operativoActivo: true }),
        base44.asignaciones.listar(),
      ]);
      setPersonal(p); setEventos(e); setAsigs(a);
    } catch (err) {
      setError(err?.message || "No se pudo cargar el operativo.");
    } finally {
      setCargando(false);
    }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  // El OR de `sec_14` exige `e.operativo_activo = true` ANTES del OR, así que una
  // asignación vigente a un evento inactivo **no da acceso a nada**. Contarlas
  // rompía las tres cosas que esta pantalla existe para hacer: el bloqueo se
  // saltaba, el "estado efectivo" nunca podía decir "sin acceso", y el aviso al
  // revocar no disparaba. Nada en `src/` ni en `api/` escribe `operativo_activo`
  // (se apaga a mano al terminar el evento) y las asignaciones no se revocan
  // solas, así que el caso se produce solo en cuanto se cierra el primer evento.
  const idsActivos = new Set(eventos.map((e) => e.id));
  const vigentesDe = (personalId) =>
    asigs.filter((a) => a.personalId === personalId && idsActivos.has(a.eventoId));
  /** Vigentes pero a eventos ya inactivos: no dan acceso, y son invisibles si no se listan. */
  const inertesDe = (personalId) =>
    asigs.filter((a) => a.personalId === personalId && !idsActivos.has(a.eventoId));
  const tieneAsignado = (personalId, eventoId) =>
    asigs.some((a) => a.personalId === personalId && a.eventoId === eventoId);

  const alternarAsignacion = async (persona, evento) => {
    const asignado = tieneAsignado(persona.id, evento.id);
    setOcupado(`${persona.id}:${evento.id}`); setError(""); setAviso("");
    try {
      if (asignado) {
        // Revocar puede dejar a alguien en 0: se avisa, no se bloquea — quitar
        // una asignación es una acción deliberada sobre esa persona.
        const quedan = vigentesDe(persona.id).length - 1;
        await base44.asignaciones.revocar(persona.id, evento.id);
        if (quedan === 0 && !persona.accesoGlobal && persona.activo) {
          setAviso(`⚠ ${persona.nombre} se queda con 0 eventos: ya no verá nada hasta que le asignes otro o le des acceso a todos.`);
        }
      } else {
        await base44.asignaciones.asignar(persona.id, evento.id);
      }
      // Releer: el shim no distingue "0 filas por RLS" de éxito.
      const frescas = await base44.asignaciones.listar();
      const ahora = frescas.some((a) => a.personalId === persona.id && a.eventoId === evento.id);
      if (ahora === asignado) {
        setError("La base no aceptó el cambio (¿permisos?). Nada se modificó.");
        return;                       // no se pisa el estado con algo no confirmado
      }
      setAsigs(frescas);
    } catch (err) {
      setError(err?.message || "No se pudo cambiar la asignación.");
    } finally {
      setOcupado("");
    }
  };

  /** ¿Hay alguna operación en vuelo para esta persona? (chip o botón global) */
  const ocupadaPersona = (personalId) =>
    ocupado === `g:${personalId}` || ocupado.startsWith(`${personalId}:`);

  const alternarGlobal = async (persona) => {
    const vigentes = vigentesDe(persona.id).length;
    // GUARDARRAÍL: apagar `acceso_global` sin asignaciones deja a la persona en 0.
    if (persona.accesoGlobal && vigentes === 0) {
      setError(
        `No se puede quitar el acceso a todos los eventos de ${persona.nombre}: se quedaría con 0 eventos ` +
        `y no podría trabajar. Asígnale primero al menos un evento.`
      );
      return;
    }
    setOcupado(`g:${persona.id}`); setError(""); setAviso("");
    try {
      const nuevo = !persona.accesoGlobal;
      await base44.entities.OperativoPersonal.update(persona.id, { accesoGlobal: nuevo });
      // Estricto y ANTES de tocar el estado: si la relectura fallara con `list`,
      // `frescas` sería `[]` y la lista entera desaparecería de la pantalla.
      const frescas = await base44.entities.OperativoPersonal.filterEstricto(null);
      const guardada = frescas.find((x) => x.id === persona.id);
      if (!guardada || guardada.accesoGlobal !== nuevo) {
        setError("La base no aceptó el cambio (¿permisos?). Nada se modificó.");
        return;
      }
      setPersonal(frescas);
      if (!nuevo) {
        setAviso(`${persona.nombre} pasa a ver solo sus ${vigentes} evento${vigentes === 1 ? "" : "s"} asignado${vigentes === 1 ? "" : "s"}.`);
      }
    } catch (err) {
      setError(err?.message || "No se pudo cambiar el acceso.");
    } finally {
      setOcupado("");
    }
  };

  if (cargando) {
    return <div className="flex items-center gap-2 text-white/40 text-sm"><Loader2 size={14} className="animate-spin" /> Cargando operativo…</div>;
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h3 className="text-white/80 text-sm flex items-center gap-2"><Users size={14} /> Personal y eventos</h3>
        <p className="text-white/30 text-xs mt-1">
          Quien tiene <span className="text-[#C9A84C]">acceso a todos</span> ve cualquier evento activo.
          Los demás solo ven los eventos que les asignes aquí.
        </p>
      </div>

      {error && (
        <p className="text-red-400/90 text-xs border border-red-400/20 bg-red-400/5 px-3 py-2 rounded flex items-start gap-2">
          <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />{error}
        </p>
      )}
      {aviso && <p className="text-[#C9A84C] text-xs">{aviso}</p>}

      {eventos.length === 0 && (
        <p className="text-white/30 text-xs">
          No hay eventos con el operativo activo, así que no hay nada que asignar.
          <br />
          <span className="text-white/20">
            El interruptor <code>operativo_activo</code> todavía no se maneja desde el panel: hoy se
            enciende y se apaga directamente en la base (Supabase Studio o SQL).
          </span>
        </p>
      )}

      {personal.length === 0 && <p className="text-white/30 text-xs">No hay personal operativo dado de alta.</p>}

      {personal.map((p) => {
        const vigentes = vigentesDe(p.id);
        const est = estadoEfectivo(p, vigentes.length);
        const bloqueado = p.accesoGlobal && vigentes.length === 0;
        return (
          <div key={p.id} className="skeu-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-white/80 text-sm">
                  {p.nombre} <span className="text-white/30 text-xs">· {p.usuario} · {p.rol}</span>
                </p>
                <p className={`text-xs mt-0.5 flex items-center gap-1.5 ${est.tono}`}>
                  {est.clave === "global" ? <ShieldCheck size={12} /> : est.clave === "sin-acceso" ? <ShieldAlert size={12} /> : null}
                  {est.texto}
                </p>
              </div>
              <button
                onClick={() => alternarGlobal(p)}
                // Bloqueado también mientras hay una revocación de chip en vuelo:
                // si no, revocar la última asignación y pulsar "Acceso a todos"
                // antes de que termine saltaba el guard con datos viejos.
                disabled={ocupadaPersona(p.id) || !p.activo}
                title={bloqueado
                  ? "Asígnale al menos un evento antes de quitarle el acceso a todos"
                  : "Acceso a todos los eventos activos"}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all flex-shrink-0 disabled:opacity-40 ${
                  p.accesoGlobal
                    ? "border-[#C9A84C]/50 text-[#C9A84C] hover:bg-[#C9A84C]/10"
                    : "border-white/10 text-white/40 hover:text-white/60"
                }`}
              >
                {ocupado === `g:${p.id}` ? <Loader2 size={11} className="animate-spin" /> : null}
                {p.accesoGlobal ? "Acceso a todos" : "Solo asignados"}
              </button>
            </div>

            {bloqueado && (
              <p className="text-white/25 text-[11px]">
                Para pasarlo a "solo asignados", primero asígnale al menos un evento: si no, se quedaría sin acceso.
              </p>
            )}

            {/* Asignaciones a eventos ya inactivos. NO dan acceso (el OR de la
                base exige el evento activo), y si no se listaran serían
                invisibles e irrevocables desde aquí, porque los chips de arriba
                solo se pintan para eventos activos. */}
            {inertesDe(p.id).length > 0 && (
              <div className="pt-1 space-y-1.5">
                <p className="text-white/25 text-[11px]">
                  Asignaciones a eventos ya cerrados — <strong>no dan acceso</strong>:
                </p>
                <div className="flex flex-wrap gap-2">
                  {inertesDe(p.id).map((a) => {
                    const busy = ocupado === `${p.id}:${a.eventoId}`;
                    return (
                      <button
                        key={a.eventoId}
                        onClick={() => alternarAsignacion(p, { id: a.eventoId, nombreEvento: "evento cerrado" })}
                        disabled={busy}
                        title="Revocar esta asignación"
                        className="text-[11px] px-2.5 py-1 rounded-full border border-white/10 text-white/25 hover:text-red-400/80 hover:border-red-400/30 transition-all flex items-center gap-1.5 disabled:opacity-40"
                      >
                        {busy ? <Loader2 size={9} className="animate-spin" /> : null}
                        evento cerrado · revocar
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {eventos.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {eventos.map((ev) => {
                  const on = tieneAsignado(p.id, ev.id);
                  const busy = ocupado === `${p.id}:${ev.id}`;
                  return (
                    <button
                      key={ev.id}
                      onClick={() => alternarAsignacion(p, ev)}
                      disabled={busy}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 disabled:opacity-40 ${
                        on ? "border-green-400/40 text-green-400/90 bg-green-400/5" : "border-white/10 text-white/35 hover:text-white/60"
                      }`}
                    >
                      {busy ? <Loader2 size={10} className="animate-spin" /> : on ? <Check size={10} /> : null}
                      {ev.nombreEvento}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
