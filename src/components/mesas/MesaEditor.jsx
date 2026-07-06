import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Circle, Square, X, Users, Loader2 } from "lucide-react";

/**
 * Editor de mesas estilo POS sobre un lienzo (plano placeholder).
 *
 * Props:
 *  - eventoId
 *  - salonId       (para cargar el plano real cuando exista)
 *  - reglas        (evento_reglas_mesas: formasPermitidas, opcionesPersonas, capacidadLibre)
 *  - editable      (admin siempre; cliente según client_can_edit — RLS lo respalda)
 *
 * NOTA: cuando exista el plano real del salón, `plano.imagenPlanoUrl` se pintará como fondo
 * del lienzo (ver más abajo). Hoy se usa un fondo placeholder de rejilla.
 */
export default function MesaEditor({ eventoId, salonId, reglas, editable = false }) {
  const [mesas, setMesas] = useState([]);
  const [plano, setPlano] = useState(null);
  const [sel, setSel] = useState(null); // mesa seleccionada
  const [cargando, setCargando] = useState(true);
  const lienzoRef = useRef(null);
  const dragRef = useRef(null);

  const formas = reglas?.formasPermitidas?.length ? reglas.formasPermitidas : ["redonda", "cuadrada"];
  const opciones = reglas?.opcionesPersonas?.length ? reglas.opcionesPersonas : [8, 10, 12];
  const libre = !!reglas?.capacidadLibre;

  const cargar = useCallback(async () => {
    const ms = await base44.entities.Mesa.filter({ eventoId }, "orden");
    setMesas(ms);
    setCargando(false);
  }, [eventoId]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    if (salonId) base44.entities.SalonPlano.filter({ salonId }).then((r) => setPlano(r[0] || null));
  }, [salonId]);

  const anchoRatio = plano?.ancho || 1000;
  const altoRatio = plano?.alto || 700;

  const agregar = async () => {
    const nueva = await base44.entities.Mesa.create({
      eventoId,
      nombre: `Mesa ${mesas.length + 1}`,
      forma: formas[0],
      capacidad: libre ? 8 : opciones[0],
      posX: 20 + ((mesas.length * 12) % 60),
      posY: 20 + ((mesas.length * 9) % 55),
      rotacion: 0,
      orden: mesas.length + 1,
    });
    await cargar();
    setSel(nueva);
  };

  const patch = async (id, campos) => {
    setMesas((ms) => ms.map((m) => (m.id === id ? { ...m, ...campos } : m)));
    setSel((s) => (s && s.id === id ? { ...s, ...campos } : s));
    await base44.entities.Mesa.update(id, campos);
  };

  const borrar = async (id) => {
    await base44.entities.Mesa.delete(id);
    setSel(null);
    cargar();
  };

  // --- Arrastre (pointer events) ---
  const onPointerDown = (e, mesa) => {
    setSel(mesa);
    if (!editable) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { id: mesa.id, moved: false };
  };

  const onPointerMove = (e) => {
    const drag = dragRef.current;
    if (!drag || !lienzoRef.current) return;
    const rect = lienzoRef.current.getBoundingClientRect();
    const x = Math.min(97, Math.max(3, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(96, Math.max(4, ((e.clientY - rect.top) / rect.height) * 100));
    drag.moved = true;
    drag.last = { posX: x, posY: y };
    setMesas((ms) => ms.map((m) => (m.id === drag.id ? { ...m, posX: x, posY: y } : m)));
  };

  const onPointerUp = async () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.moved && drag.last) {
      await base44.entities.Mesa.update(drag.id, drag.last);
      setSel((s) => (s && s.id === drag.id ? { ...s, ...drag.last } : s));
    }
  };

  const tamano = (cap) => Math.min(88, 44 + Number(cap || 8) * 2.4);

  if (cargando) return <p className="text-white/25 text-sm py-10 text-center">Cargando mesas…</p>;

  return (
    <div>
      {editable && (
        <div className="flex items-center justify-between mb-3">
          <p className="text-white/40 text-xs">{mesas.length} mesa(s) · {mesas.reduce((a, m) => a + Number(m.capacidad || 0), 0)} lugares</p>
          <button onClick={agregar} className="flex items-center gap-2 bg-[#C9A84C] text-[#0a0a0a] px-4 py-2 text-sm font-medium hover:bg-[#d4b558] transition-all">
            <Plus size={14} /> Agregar mesa
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_260px] gap-4">
        {/* Lienzo */}
        <div
          ref={lienzoRef}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="relative w-full bg-[#0d0d0d] border border-white/10 overflow-hidden select-none touch-none"
          style={{
            aspectRatio: `${anchoRatio} / ${altoRatio}`,
            // Fondo placeholder (rejilla). Cuando exista el plano real, reemplazar por:
            //   backgroundImage: `url(${plano.imagenPlanoUrl})`, backgroundSize: 'cover'
            backgroundImage: plano?.imagenPlanoUrl
              ? `url(${plano.imagenPlanoUrl})`
              : "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: plano?.imagenPlanoUrl ? "cover" : "40px 40px",
          }}
        >
          {!plano?.imagenPlanoUrl && (
            <span className="absolute inset-0 flex items-center justify-center text-white/10 text-sm pointer-events-none">
              Plano pendiente
            </span>
          )}

          {mesas.map((m) => {
            const size = tamano(m.capacidad);
            const activa = sel?.id === m.id;
            return (
              <div
                key={m.id}
                onPointerDown={(e) => onPointerDown(e, m)}
                className={`absolute flex flex-col items-center justify-center text-center ${editable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
                style={{
                  left: `${m.posX}%`, top: `${m.posY}%`, width: size, height: size,
                  transform: `translate(-50%,-50%) rotate(${m.rotacion || 0}deg)`,
                  borderRadius: m.forma === "cuadrada" ? "10px" : "50%",
                  background: activa ? "rgba(201,168,76,0.22)" : "rgba(201,168,76,0.10)",
                  border: `2px solid ${activa ? "#E6C870" : "rgba(201,168,76,0.45)"}`,
                }}
              >
                <span className="text-white/85 text-[11px] leading-tight px-1 truncate max-w-full">{m.nombre}</span>
                <span className="text-[#C9A84C]/80 text-[10px]">{m.capacidad}p</span>
              </div>
            );
          })}
        </div>

        {/* Panel de la mesa seleccionada */}
        <div className="min-w-0">
          {sel ? (
            <MesaPanel
              key={sel.id}
              mesa={sel}
              editable={editable}
              formas={formas}
              opciones={opciones}
              libre={libre}
              onPatch={patch}
              onBorrar={borrar}
              onCerrar={() => setSel(null)}
            />
          ) : (
            <div className="bg-[#111] border border-white/5 p-5 text-center">
              <p className="text-white/25 text-sm">{mesas.length ? "Toca una mesa para editarla." : "Aún no hay mesas."}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MesaPanel({ mesa, editable, formas, opciones, libre, onPatch, onBorrar, onCerrar }) {
  const [invitados, setInvitados] = useState([]);
  const [nuevo, setNuevo] = useState("");
  const [cargandoInv, setCargandoInv] = useState(true);
  // Nombre con estado local: se guarda al salir del campo (blur/Enter), no en cada tecla,
  // para no disparar un UPDATE a Supabase por caracter escrito.
  const [nombre, setNombre] = useState(mesa.nombre || "");
  const guardarNombre = () => {
    const limpio = nombre.trim() || mesa.nombre || "Mesa";
    if (limpio !== mesa.nombre) onPatch(mesa.id, { nombre: limpio });
  };

  const cargarInv = useCallback(() => {
    base44.entities.Invitado.filter({ mesaId: mesa.id }).then(setInvitados).finally(() => setCargandoInv(false));
  }, [mesa.id]);
  useEffect(() => { cargarInv(); }, [cargarInv]);

  const addInvitado = async () => {
    if (!nuevo.trim() || invitados.length >= Number(mesa.capacidad || 0)) return;
    await base44.entities.Invitado.create({ mesaId: mesa.id, nombre: nuevo.trim() });
    setNuevo("");
    cargarInv();
  };
  const delInvitado = async (id) => { await base44.entities.Invitado.delete(id); cargarInv(); };

  return (
    <div className="bg-[#111] border border-[#C9A84C]/20 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-white/70 text-xs uppercase tracking-wider">Mesa</p>
        <button onClick={onCerrar} className="text-white/30 hover:text-white/60"><X size={14} /></button>
      </div>

      <div>
        <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Nombre</label>
        <input
          value={nombre}
          disabled={!editable}
          onChange={(e) => setNombre(e.target.value)}
          onBlur={guardarNombre}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className="w-full bg-white/5 border border-white/10 text-white/70 text-sm px-3 py-2 outline-none focus:border-[#C9A84C]/40 disabled:opacity-60"
        />
      </div>

      <div>
        <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Forma</label>
        <div className="flex gap-2">
          {formas.includes("redonda") && (
            <button disabled={!editable} onClick={() => onPatch(mesa.id, { forma: "redonda" })}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs border transition-all ${mesa.forma === "redonda" ? "border-[#C9A84C] text-[#C9A84C]" : "border-white/10 text-white/40"} disabled:opacity-50`}>
              <Circle size={13} /> Redonda
            </button>
          )}
          {formas.includes("cuadrada") && (
            <button disabled={!editable} onClick={() => onPatch(mesa.id, { forma: "cuadrada" })}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs border transition-all ${mesa.forma === "cuadrada" ? "border-[#C9A84C] text-[#C9A84C]" : "border-white/10 text-white/40"} disabled:opacity-50`}>
              <Square size={13} /> Cuadrada
            </button>
          )}
        </div>
      </div>

      <div>
        <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Capacidad</label>
        {libre ? (
          <input type="number" min="1" disabled={!editable} value={mesa.capacidad || ""}
            onChange={(e) => onPatch(mesa.id, { capacidad: Number(e.target.value) })}
            className="w-full bg-white/5 border border-white/10 text-white/70 text-sm px-3 py-2 outline-none focus:border-[#C9A84C]/40 disabled:opacity-60" />
        ) : (
          <select disabled={!editable} value={mesa.capacidad || opciones[0]} onChange={(e) => onPatch(mesa.id, { capacidad: Number(e.target.value) })}
            className="w-full bg-white/5 border border-white/10 text-white/70 text-sm px-3 py-2 outline-none focus:border-[#C9A84C]/40 disabled:opacity-60">
            {opciones.map((o) => <option key={o} value={o} className="bg-[#111]">{o} personas</option>)}
          </select>
        )}
      </div>

      {/* Invitados */}
      <div className="border-t border-white/5 pt-3">
        <p className="text-white/40 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Users size={12} /> Invitados {cargandoInv ? "" : `(${invitados.length}/${mesa.capacidad})`}
        </p>
        {editable && (
          <div className="flex gap-2 mb-2">
            <input value={nuevo} onChange={(e) => setNuevo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addInvitado()}
              placeholder={invitados.length >= Number(mesa.capacidad || 0) ? "Mesa llena" : "Nombre del invitado"}
              disabled={invitados.length >= Number(mesa.capacidad || 0)}
              className="flex-1 bg-white/5 border border-white/10 text-white/70 text-xs px-3 py-2 outline-none focus:border-[#C9A84C]/40 disabled:opacity-50" />
            <button onClick={addInvitado} className="px-3 border border-white/10 text-white/40 hover:text-white/60 text-sm">+</button>
          </div>
        )}
        <div className="space-y-1 max-h-40 overflow-auto">
          {invitados.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between bg-white/5 px-2.5 py-1.5">
              <span className="text-white/60 text-xs truncate">{inv.nombre}</span>
              {editable && <button onClick={() => delInvitado(inv.id)} className="text-white/25 hover:text-red-400"><X size={11} /></button>}
            </div>
          ))}
          {!cargandoInv && invitados.length === 0 && <p className="text-white/15 text-xs">Sin invitados asignados.</p>}
        </div>
      </div>

      {editable && (
        <button onClick={() => onBorrar(mesa.id)} className="flex items-center gap-1.5 text-red-400/70 hover:text-red-400 text-xs transition-colors">
          <Trash2 size={13} /> Eliminar mesa
        </button>
      )}
    </div>
  );
}
