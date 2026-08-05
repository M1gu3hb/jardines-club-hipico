import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { MESA_FORMAS } from "@/lib/catalogos";
import { Loader2, Check, X } from "lucide-react";
import { Toggle } from "@/components/admin/eventos/_ui";
import { Estado, EsqueletoTexto } from "@/components/ui/Estado";

/**
 * Editor de reglas de mesas del evento (solo admin). Controla el motor del editor:
 * formas permitidas, opciones de capacidad, capacidad libre y si el cliente puede editar.
 * Llama onCambio(reglas) al guardar para refrescar el editor.
 */
export default function MesaReglas({ eventoId, onCambio }) {
  const [reglas, setReglas] = useState(null);
  const [nuevaOpcion, setNuevaOpcion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);
  const [errorCarga, setErrorCarga] = useState(null);
  const [errorGuardar, setErrorGuardar] = useState("");

  const cargar = () =>
    base44.entities.EventoReglasMesas.filterEstricto({ eventoId })
      .then((r) => {
        setErrorCarga(null);
        setReglas(r[0] || {
          eventoId, formasPermitidas: MESA_FORMAS, opcionesPersonas: [8, 10, 12], capacidadLibre: false, clientePuedeEditar: false,
        });
      })
      .catch((e) => setErrorCarga(e || new Error("Falló la lectura")));
  useEffect(() => { cargar(); }, [eventoId]);

  if (errorCarga) {
    return <Estado error={errorCarga} onReintentar={cargar}
      mensajeError="No se pudieron cargar las reglas de mesas." />;
  }
  if (!reglas) return <EsqueletoTexto lineas={4} />;

  const set = (k, v) => { setReglas((r) => ({ ...r, [k]: v })); setOk(false); };
  const toggleForma = (f) => {
    const actuales = reglas.formasPermitidas || [];
    const next = actuales.includes(f) ? actuales.filter((x) => x !== f) : [...actuales, f];
    set("formasPermitidas", next.length ? next : actuales); // no permitir dejar 0 formas
  };
  const addOpcion = () => {
    const n = Number(nuevaOpcion);
    if (!n || (reglas.opcionesPersonas || []).includes(n)) return;
    set("opcionesPersonas", [...(reglas.opcionesPersonas || []), n].sort((a, b) => a - b));
    setNuevaOpcion("");
  };
  const delOpcion = (n) => set("opcionesPersonas", (reglas.opcionesPersonas || []).filter((x) => x !== n));

  const guardar = async () => {
    setGuardando(true);
    setErrorGuardar("");
    const datos = {
      eventoId,
      formasPermitidas: reglas.formasPermitidas,
      opcionesPersonas: reglas.opcionesPersonas,
      capacidadLibre: !!reglas.capacidadLibre,
      clientePuedeEditar: !!reglas.clientePuedeEditar,
    };
    // `updateEstricto` + `catch`. Esta pantalla afirmaba «Guardado.» sin mirar: con `update`,
    // una escritura de cero filas devuelve el propio `datos` y `setReglas` repintaba las reglas
    // nuevas sobre unas que la base no había cambiado. Y estas reglas GOBIERNAN lo que el
    // cliente puede hacer con sus mesas (`clientePuedeEditar`), así que una falsa confirmación
    // aquí es un permiso que el dueño cree haber quitado y sigue puesto.
    //
    // `create` no necesita la variante estricta: un INSERT denegado por RLS **sí** devuelve
    // error (42501) y el shim lo relanza. El agujero silencioso es de `update` y `delete`.
    try {
      let guardado;
      if (reglas.id) guardado = await base44.entities.EventoReglasMesas.updateEstricto(reglas.id, datos);
      else guardado = await base44.entities.EventoReglasMesas.create(datos);
      setReglas((r) => ({ ...r, ...datos, id: guardado?.id || r.id }));
      setOk(true);
      onCambio?.({ ...datos, id: guardado?.id || reglas.id });
    } catch (e) {
      console.error("[MesaReglas] guardar", e?.message);
      setErrorGuardar(
        e?.code === "escritura_sin_efecto"
          ? "No se guardaron: la base no modificó ninguna fila. Recarga la página y vuelve a intentarlo."
          : "No se pudieron guardar las reglas. Revisa la conexión e inténtalo otra vez.",
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="bg-[#111] border border-white/5 p-5 mb-5 space-y-4">
      <p className="text-white/60 text-sm uppercase tracking-wider">Reglas de mesas</p>

      <div>
        <label className="text-white/30 text-xs uppercase tracking-wider mb-2 block">Formas permitidas</label>
        <div className="flex gap-2">
          {MESA_FORMAS.map((f) => (
            <button key={f} onClick={() => toggleForma(f)}
              className={`px-3 py-2 text-xs capitalize border transition-all ${(reglas.formasPermitidas || []).includes(f) ? "border-[#C9A84C] text-[#C9A84C]" : "border-white/10 text-white/40"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-white/30 text-xs uppercase tracking-wider mb-2 block">Opciones de capacidad</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {(reglas.opcionesPersonas || []).map((n) => (
            <span key={n} className="flex items-center gap-1.5 bg-white/5 border border-white/10 text-white/60 text-xs px-2.5 py-1.5">
              {n}p <button onClick={() => delOpcion(n)} className="text-white/30 hover:text-red-400"><X size={10} /></button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="number" value={nuevaOpcion} onChange={(e) => setNuevaOpcion(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addOpcion()}
            placeholder="Ej. 6" className="w-24 bg-white/5 border border-white/10 text-white/70 text-sm px-3 py-2 outline-none focus:border-[#C9A84C]/40" />
          <button onClick={addOpcion} className="px-3 border border-white/10 text-white/40 hover:text-white/60 text-sm">Agregar</button>
        </div>
      </div>

      <Toggle label="Capacidad libre" hint="Permite escribir cualquier número en vez de las opciones fijas." checked={!!reglas.capacidadLibre} onChange={(v) => set("capacidadLibre", v)} />
      <Toggle label="El cliente puede editar sus mesas" hint="Si está apagado, el cliente solo ve la distribución." checked={!!reglas.clientePuedeEditar} onChange={(v) => set("clientePuedeEditar", v)} />

      <div className="flex items-center gap-3">
        <button onClick={guardar} disabled={guardando}
          className="flex items-center gap-2 bg-[#C9A84C] text-[#0a0a0a] px-5 py-2 text-sm font-medium hover:bg-[#d4b558] transition-all disabled:opacity-50">
          {guardando ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Guardar reglas
        </button>
        {ok && !errorGuardar && <span className="text-green-400/80 text-xs">Guardado.</span>}
        {errorGuardar && <span className="text-red-400/90 text-xs">{errorGuardar}</span>}
      </div>
    </div>
  );
}
