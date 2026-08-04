import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Trash2, Loader2, AlertTriangle, X } from "lucide-react";

/**
 * EventoEliminar — borrado irreversible de un evento.
 *
 * Lo único de todo el panel que destruye datos sin vuelta atrás, así que la pantalla está
 * construida para que sea difícil hacerlo por accidente y fácil entender qué se lleva:
 *
 *  - Se pide el INVENTARIO al servidor antes de enseñar nada. El dueño ve el tamaño de lo que
 *    va a destruir, no un "¿seguro?" genérico.
 *  - La confirmación es escribir el NOMBRE EXACTO. El servidor lo vuelve a comparar contra la
 *    fila: que el botón se habilite aquí no autoriza nada.
 *  - Se avisa de lo que NO se borra: la reseña del cliente sigue publicada, a propósito.
 *  - Si hay OTROS eventos con el mismo nombre, se dice y se enseña el discriminante. Escribir
 *    el nombre exacto no distingue entre homónimos: ese candado protege de borrar por accidente,
 *    no de borrar el equivocado.
 *  - Si el borrado se interrumpe, se enseña EXACTAMENTE qué quedó hecho. Un "no se pudo" a
 *    secas, después de haber borrado los archivos, deja al dueño sin saber si reintentar.
 */
const fechaLarga = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "medium" });
};

export default function EventoEliminar({ evento, onBorrado }) {
  const [abierto, setAbierto] = useState(false);
  const [inv, setInv] = useState(null);
  const [cuenta, setCuenta] = useState(null);
  const [homonimos, setHomonimos] = useState(0);
  const [creadoEl, setCreadoEl] = useState("");
  const [cargando, setCargando] = useState(false);
  const [texto, setTexto] = useState("");
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState("");
  const [parcial, setParcial] = useState("");

  useEffect(() => {
    if (!abierto) return;
    setCargando(true); setError(""); setInv(null); setCuenta(null); setParcial(""); setTexto("");
    setHomonimos(0); setCreadoEl("");
    base44.functions
      .eliminarEvento({ eventoId: evento.id, soloInventario: true })
      .then((r) => {
        setInv(r.inventario); setCuenta(r.cuentaCliente);
        setHomonimos(r.homonimos || 0); setCreadoEl(r.creadoEl || "");
      })
      .catch((e) => setError(e?.message || "No se pudo consultar qué contiene este evento."))
      .finally(() => setCargando(false));
  }, [abierto, evento.id]);

  const coincide = texto.trim() === String(evento.nombreEvento || "").trim();

  const borrar = async () => {
    if (!coincide || borrando) return;
    setBorrando(true); setError(""); setParcial("");
    try {
      const r = await base44.functions.eliminarEvento({
        eventoId: evento.id,
        confirmacion: texto.trim(),
      });
      if (r.parcial) {
        // El evento SÍ se borró, pero algo quedó colgando. No se cierra el diálogo sin que
        // el dueño lo lea.
        setParcial(r.aviso || "El evento se borró, pero algo quedó pendiente.");
        return;
      }
      setAbierto(false);
      onBorrado?.();
    } catch (e) {
      setError(e?.message || "No se pudo eliminar el evento.");
    } finally {
      setBorrando(false);
    }
  };

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="flex items-center gap-2 text-red-400/60 hover:text-red-400 text-xs border border-red-400/20 hover:border-red-400/50 px-3 py-2 rounded transition-all"
      >
        <Trash2 size={13} /> Eliminar este evento
      </button>
    );
  }

  const filas = inv
    ? [
        ["Documentos", inv.documentos, "se borran del almacenamiento"],
        ["Mesas", inv.mesas, ""],
        ["Invitados", inv.invitados, ""],
        ["Invitaciones", inv.invitaciones, ""],
        ["Confirmaciones (RSVP)", inv.rsvps, ""],
        ["Cronograma", inv.cronograma, ""],
        ["Música", inv.musica, ""],
        ["Items contratados", inv.items, ""],
        ["Avisos del portal", inv.notificaciones, ""],
        ["Ubicaciones del operativo", inv.ubicaciones, ""],
      ].filter(([, n]) => n > 0)
    : [];

  return (
    <div className="border border-red-400/40 bg-red-400/5 rounded p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-red-300 text-sm font-medium flex items-center gap-2">
          <AlertTriangle size={15} /> Eliminar «{evento.nombreEvento}»
        </p>
        <button onClick={() => setAbierto(false)} disabled={borrando}
          className="text-white/30 hover:text-white/60 disabled:opacity-40"><X size={15} /></button>
      </div>

      <p className="text-white/50 text-xs leading-relaxed">
        Esto <strong className="text-red-300">no se puede deshacer</strong>. Se borran el evento,
        todos sus datos, sus archivos y la cuenta con la que entra el cliente a su portal.
      </p>

      {cargando && (
        <p className="text-white/40 text-xs flex items-center gap-2">
          <Loader2 size={12} className="animate-spin" /> Comprobando qué contiene este evento…
        </p>
      )}

      {inv && homonimos > 0 && (
        <div className="border border-amber-400/40 bg-amber-400/5 px-3 py-2.5 rounded space-y-1">
          <p className="text-amber-300 text-xs font-medium flex items-center gap-2">
            <AlertTriangle size={13} /> Hay {homonimos} evento{homonimos > 1 ? "s más" : " más"} con
            este mismo nombre
          </p>
          <p className="text-white/50 text-xs leading-relaxed">
            Escribir el nombre no distingue entre ellos. Estás a punto de borrar concretamente{" "}
            <strong className="text-white/75">el creado el {fechaLarga(creadoEl) || "—"}</strong>, que{" "}
            {cuenta
              ? <>tiene la cuenta de portal <strong className="text-white/75">«{cuenta}»</strong></>
              : <strong className="text-white/75">no tiene cuenta de portal</strong>}
            . Comprueba que es el que sobra antes de continuar.
          </p>
        </div>
      )}

      {inv && (
        <div className="space-y-2">
          <p className="text-white/40 text-xs uppercase tracking-wider">Se va a borrar</p>
          {filas.length === 0 ? (
            <p className="text-white/35 text-xs">Este evento no tiene datos cargados todavía.</p>
          ) : (
            <ul className="space-y-1">
              {filas.map(([etiqueta, n, nota]) => (
                <li key={etiqueta} className="text-white/60 text-xs flex items-baseline gap-2">
                  <span className="text-red-300/90 tabular-nums font-medium">{n}</span>
                  <span>{etiqueta}</span>
                  {nota && <span className="text-white/25">· {nota}</span>}
                </li>
              ))}
            </ul>
          )}
          {cuenta && (
            <p className="text-white/60 text-xs">
              <span className="text-red-300/90">1</span> cuenta de cliente
              <span className="text-white/35"> · «{cuenta}» dejará de poder entrar</span>
            </p>
          )}
          {inv.resenas > 0 && (
            <p className="text-[#C9A84C]/80 text-xs border border-[#C9A84C]/25 bg-[#C9A84C]/5 px-3 py-2 rounded mt-2">
              La reseña de este cliente <strong>NO se borra</strong> y seguirá publicada en el
              sitio. Es prueba social del salón, no parte del registro del evento.
            </p>
          )}
        </div>
      )}

      {inv && (
        <div className="space-y-2">
          <label className="text-white/50 text-xs block">
            Para confirmar, escribe el nombre exacto del evento:
            <span className="text-white/30"> {evento.nombreEvento}</span>
          </label>
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            disabled={borrando}
            placeholder={evento.nombreEvento}
            className="w-full bg-white/5 border border-white/10 text-white/80 text-sm px-4 py-2.5 outline-none focus:border-red-400/50 disabled:opacity-50"
          />
        </div>
      )}

      {error && (
        <p className="text-red-400/90 text-xs border border-red-400/20 bg-red-400/10 px-3 py-2 rounded flex items-start gap-2">
          <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />{error}
        </p>
      )}
      {parcial && (
        <div className="border border-amber-400/40 bg-amber-400/5 px-3 py-2 rounded">
          <p className="text-amber-300 text-xs font-medium">El evento se borró, pero queda algo pendiente</p>
          <p className="text-white/50 text-xs mt-1 leading-relaxed">{parcial}</p>
          <button onClick={() => { setAbierto(false); onBorrado?.(); }}
            className="text-amber-300/80 hover:text-amber-300 text-xs mt-2">Entendido</button>
        </div>
      )}

      {!parcial && (
        <div className="flex items-center gap-3">
          <button
            onClick={borrar}
            disabled={!coincide || borrando || !inv}
            title={coincide ? "Eliminar definitivamente" : "Escribe el nombre exacto para habilitar"}
            className="flex items-center gap-2 bg-red-500/80 hover:bg-red-500 text-white px-5 py-2.5 text-sm font-medium rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {borrando ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            Eliminar definitivamente
          </button>
          <button onClick={() => setAbierto(false)} disabled={borrando}
            className="text-white/40 hover:text-white/60 text-sm disabled:opacity-40">Cancelar</button>
        </div>
      )}
    </div>
  );
}
