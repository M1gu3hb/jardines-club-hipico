import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/api/authContext";
import { Plus, Loader2, Check, Search, Calendar, User, DoorOpen, KeyRound, AlertTriangle, Inbox } from "lucide-react";
import { Field, ESTATUS, estatusColor } from "./_ui";
import { MESA_FORMAS } from "@/lib/catalogos";
import EventoFicha from "./EventoFicha";
import { useCarga } from "@/lib/useCarga";
import { Estado, EsqueletoFilas } from "@/components/ui/Estado";
import { nuevoId } from "@/lib/tokenSeguro";
// LAS MISMAS reglas que aplica `api/crear-usuario-evento.js`, importadas del mismo archivo.
// Duplicarlas es lo que hizo que divergieran: el formulario pedía 6 caracteres de contraseña
// y el servidor exigía 8, así que una de 6 o 7 pasaba aquí y moría allá con un 400 opaco.
import { validarCredenciales, AYUDA_USUARIO, AYUDA_PASSWORD } from "../../../../api/_lib/reglas-credenciales.js";
import { solicitudAEvento, ESTATUS_TRAS_CONVERTIR } from "@/lib/solicitudAEvento";

const FORM_VACIO = {
  nombreEvento: "", tipoEvento: "", fechaEvento: "", salonId: "",
  clienteNombre: "", clienteEmail: "", clienteTelefono: "", notas: "",
  usuario: "", password: "",
};

export default function AdminEventos({ prefill = null, onPrefillConsumido = null }) {
  const { perfil } = useAuth();
  const [abierto, setAbierto] = useState(null); // evento seleccionado (ficha)
  const [creando, setCreando] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [campoMal, setCampoMal] = useState("");
  const [aviso, setAviso] = useState("");
  const [eventoId, setEventoId] = useState("");
  // De qué solicitud sale este alta, y qué hay que enseñarle al admin de la traducción.
  const [origen, setOrigen] = useState(null);      // la solicitud entera, o null
  const [avisosPrefill, setAvisosPrefill] = useState([]);
  const [cerrarSolicitud, setCerrarSolicitud] = useState("");
  const [filtro, setFiltro] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");

  // Las dos lecturas van juntas: la lista no se puede pintar sin los salones (cada fila
  // enseña el suyo), así que comparten estado de carga y de error.
  const { datos, cargando, error: errorCarga, recargar } = useCarga(
    () => Promise.all([
      base44.entities.Evento.listEstricto("-created_date"),
      base44.entities.Salon.listEstricto("orden"),
    ]).then(([evs, sals]) => ({ evs, sals })),
    [],
  );
  const eventos = datos?.evs || [];
  const salones = datos?.sals || [];
  const cargar = recargar;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const salonNombre = (id) => salones.find((s) => s.id === id)?.nombre || "—";

  /**
   * El id se fija AQUÍ, una sola vez por formulario abierto — no en cada clic.
   *
   * Antes lo generaba el shim dentro de `create()`, así que cada reintento era, para el
   * sistema, un evento que jamás había visto: se creaba otra fila, y la clave de
   * idempotencia del alta de usuario (`${eventoId}:${usuario}`) nunca podía coincidir con
   * la del intento anterior. El dueño le dio cuatro veces y quedaron cuatro eventos.
   *
   * Con el id fijo, el segundo INSERT choca con la clave primaria: el reintento es
   * idempotente **por construcción**, sin lógica nueva que mantener.
   *
   * Se prefirió esto a mover las tres escrituras a un endpoint con compensación (como
   * `api/crear-admin.js`): resuelve el mismo fondo con una superficie mucho menor, no añade
   * una ruta nueva con `service_role` justo antes de la validación humana, y deja el
   * reintento seguro incluso si el fallo ocurre entre las escrituras 1 y 3.
   */
  const abrirCrear = (desdeSolicitud = null, salonesDisponibles = salones) => {
    setError(""); setAviso(""); setCampoMal("");
    // El prellenado sale de `solicitudAEvento`, que es pura y NO copia lo que no puede
    // comprobar: el salón se resuelve por nombre contra los salones reales, la fecha solo si
    // es una fecha, el correo solo si tiene forma de correo, y las credenciales nunca. Lo que
    // no se pudo trasladar sale como aviso, arriba del formulario, para que el admin lo vea
    // ANTES de guardar. Es una ayuda para no volver a teclear, no un automatismo.
    if (desdeSolicitud) {
      const { form: prelleno, avisos } = solicitudAEvento(desdeSolicitud, salonesDisponibles);
      setForm({ ...FORM_VACIO, ...prelleno });
      setOrigen(desdeSolicitud);
      setAvisosPrefill(avisos);
      setCerrarSolicitud("");
    } else {
      setForm(FORM_VACIO);
      setOrigen(null);
      setAvisosPrefill([]);
      setCerrarSolicitud("");
    }
    try {
      setEventoId(nuevoId());
      setCreando(true);
    } catch (e) {
      setError(e?.message || "No se pudo preparar el formulario.");
    }
  };

  // El salto desde Solicitudes. Se espera a tener los salones cargados: sin ellos el salón no
  // se puede resolver y se propondría "sin asignar" para uno que sí casa.
  useEffect(() => {
    if (!prefill || cargando) return;
    abrirCrear(prefill, salones);
    onPrefillConsumido?.();
    // Solo al llegar un prefill nuevo; `abrirCrear` se recrea en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill, cargando]);

  const crear = async () => {
    setError(""); setAviso(""); setCampoMal("");
    if (!form.nombreEvento.trim()) {
      setCampoMal("nombreEvento");
      setError("Falta el nombre del evento.");
      return;
    }
    // MISMA validación que el servidor, importada del mismo archivo, y ANTES de escribir
    // nada. Así el error sale con el campo señalado en vez de dejar un evento a medias.
    const v = validarCredenciales({ usuario: form.usuario.trim(), password: form.password, nombre: form.clienteNombre });
    if (!v.ok) { setCampoMal(v.campo); setError(v.mensaje); return; }

    setGuardando(true);
    let evento;
    try {
      // 1) Crear la fila del evento, con el id fijado al abrir el formulario.
      evento = await base44.entities.Evento.create({
        id: eventoId,
        nombreEvento: form.nombreEvento.trim(),
        tipoEvento: form.tipoEvento || null,
        fechaEvento: form.fechaEvento || null,
        salonId: form.salonId || null,
        clienteNombre: form.clienteNombre || null,
        clienteEmail: form.clienteEmail || null,
        clienteTelefono: form.clienteTelefono || null,
        estatus: "Apartado",
        portalActivo: false,
        notas: form.notas || null,
        // Trazabilidad: qué administrador creó este evento.
        creadoPor: perfil?.nombre || null,
        // Y de qué solicitud salió (`sec_25`). Sin esto la conversión queda huérfana: no se
        // podría ver desde la solicitud que ya se convirtió, y se podría convertir tres veces.
        solicitudId: origen?.id || null,
      });
      // 2) Reglas de mesas por defecto.
      await base44.entities.EventoReglasMesas.create({
        eventoId: evento.id,
        formasPermitidas: MESA_FORMAS,
        opcionesPersonas: [8, 10, 12],
        capacidadLibre: false,
        clientePuedeEditar: false,
      });
      // 3) Crear el usuario de Auth del cliente (server-side).
      await base44.functions.crearUsuarioEvento({
        usuario: form.usuario.trim(),
        password: form.password,
        eventoId: evento.id,
        nombre: form.clienteNombre || form.nombreEvento,
      });
      // Confirmar releyendo: `create` del shim inserta sin `.select()`, así que no distingue
      // "el INSERT falló" de "cuajó y se perdió la respuesta" (J-02).
      const guardado = (await base44.entities.Evento.filterEstricto({ id: eventoId }))[0];
      if (!guardado || !guardado.usuario) {
        throw new Error("El evento se guardó, pero no se pudo confirmar que quedaran las credenciales.");
      }
      // El estatus de la solicitud: se PROPONE, no se impone. Si el admin no eligió nada, la
      // solicitud se queda como estaba — convertirla no decide por él en qué punto del embudo
      // está. Y si esto falla, el evento YA está creado y bien: se avisa, no se revierte.
      if (origen?.id && cerrarSolicitud) {
        try {
          await base44.entities.SolicitudEvento.update(origen.id, { estatus: cerrarSolicitud });
        } catch (e2) {
          setAviso(
            `El evento se creó correctamente, pero no se pudo cambiar el estatus de la solicitud ` +
            `${origen.folio || ""} a «${cerrarSolicitud}»: ${e2?.message || "error desconocido"}. ` +
            `Cámbialo a mano desde Solicitudes.`,
          );
        }
      }
      setCreando(false);
      setOrigen(null); setAvisosPrefill([]); setCerrarSolicitud("");
      await cargar();
    } catch (e) {
      // Si el evento QUEDÓ creado, el formulario se cierra: dejarlo abierto con un aviso en
      // ámbar pequeño es justo lo que llevó al dueño a pulsar "Crear evento" cuatro veces.
      // Ahora se cierra, se recarga la lista —donde el evento aparece marcado como
      // incompleto— y el aviso es de bloque, no una línea suelta.
      const mensaje = e?.message || "Error desconocido";
      // ÚLTIMO FALSO NEGATIVO DE ESTA PANTALLA, y el que quedaba después de 8A.
      //
      // Con el id fijo, si el primer INSERT cuajó y se perdió la respuesta, el reintento choca
      // con la clave primaria — que es justamente lo que 8A busca — pero `evento` sigue sin
      // asignarse, así que se caía en la rama de abajo y el mensaje decía "No se pudo crear el
      // evento". Es mentira: sí se creó. Y es exactamente el error que hizo que el dueño
      // pulsara cuatro veces.
      //
      // No se deduce del texto del error: se RELEE la fila. Si está, el alta ocurrió.
      let yaExistia = null;
      if (!evento) {
        try {
          yaExistia = (await base44.entities.Evento.filterEstricto({ id: eventoId }))[0] || null;
        } catch { /* si no se puede releer, se cae a la rama honesta de abajo */ }
      }
      if (yaExistia) {
        setCreando(false);
        await cargar();
        setAviso(
          `El evento «${yaExistia.nombreEvento || form.nombreEvento.trim()}» YA ESTABA CREADO — el ` +
          `intento anterior sí funcionó aunque no lo pareciera. NO lo crees otra vez. ` +
          (yaExistia.usuario
            ? `Tiene sus credenciales («${yaExistia.usuario}»): está completo.`
            : `Le faltan las credenciales: ábrelo en la lista (sale marcado como "sin ` +
              `credenciales") y termínalo desde su pestaña Datos.`),
        );
      } else if (evento) {
        setCreando(false);
        await cargar();
        setAviso(
          `El evento «${form.nombreEvento.trim()}» SÍ se creó, pero se quedó sin credenciales de acceso: ` +
          `${mensaje} — NO vuelvas a crearlo. Ábrelo en la lista de abajo (sale marcado como ` +
          `"sin credenciales") y termínalo desde su pestaña Datos.`,
        );
      } else {
        setError("No se pudo crear el evento: " + mensaje);
      }
    } finally {
      setGuardando(false);
    }
  };

  if (abierto) {
    return (
      <EventoFicha
        evento={abierto}
        salones={salones}
        onVolver={() => { setAbierto(null); cargar(); }}
        onActualizado={(ev) => { setAbierto(ev); cargar(); }}
        onBorrado={() => { setAbierto(null); cargar(); }}
      />
    );
  }

  // NOMBRES REPETIDOS. Un doble clic en "Crear evento" deja filas gemelas: mismo nombre, mismo
  // cliente, misma fecha, mismo salón, mismo creador. En la lista se pintan IDÉNTICAS, y como el
  // borrado se confirma escribiendo el nombre, nada distingue la que sobra de la buena. Se marcan
  // con lo único que las separa: la hora de alta y si tienen acceso de portal.
  // Se cuenta sobre `eventos` (todos), no sobre `lista`: un filtro puede esconder a la gemela y
  // entonces la marca desaparecería justo cuando más falta hace.
  const vecesPorNombre = eventos.reduce((acc, e) => {
    const k = (e.nombreEvento || "").trim().toLowerCase();
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const repetido = (e) => (vecesPorNombre[(e.nombreEvento || "").trim().toLowerCase()] || 0) > 1;
  const altaCorta = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? ""
      : d.toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const lista = eventos
    .filter((e) => filtro === "Todos" || e.estatus === filtro)
    .filter((e) => {
      const q = busqueda.trim().toLowerCase();
      if (!q) return true;
      return [e.nombreEvento, e.clienteNombre, e.usuario, e.tipoEvento].some((v) => (v || "").toLowerCase().includes(q));
    });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white text-2xl font-thin">Eventos</h2>
          <p className="text-white/30 text-sm mt-1">Todos los eventos y sus portales de cliente.</p>
        </div>
        <button onClick={() => abrirCrear()}
          className="flex items-center gap-2 bg-[#C9A84C] text-[#0a0a0a] px-5 py-2.5 text-sm font-medium hover:bg-[#d4b558] transition-all">
          <Plus size={14} /> Nuevo evento
        </button>
      </div>

      {/* El evento quedó a medias. Va FUERA del formulario y con peso visual: en ámbar
          pequeño dentro de un formulario abierto, el dueño lo leyó como "falló" y volvió a
          pulsar Crear — cuatro veces. */}
      {aviso && (
        <div className="border border-amber-400/40 bg-amber-400/5 px-4 py-3 mb-5 rounded flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-amber-300 text-sm font-medium">El evento sí se creó — no lo crees otra vez</p>
            <p className="text-white/50 text-xs mt-1 leading-relaxed">{aviso}</p>
          </div>
          <button onClick={() => setAviso("")} className="ml-auto text-white/25 hover:text-white/50 text-xs flex-shrink-0">Entendido</button>
        </div>
      )}

      {creando && (
        <div className="bg-[#111] border border-[#C9A84C]/20 p-6 mb-6">
          <h3 className="text-white/70 text-sm mb-5 uppercase tracking-wider">
            {origen ? "Nuevo evento — desde una solicitud" : "Nuevo evento"}
          </h3>

          {origen && (
            <div className="border border-[#C9A84C]/25 bg-[#C9A84C]/5 px-4 py-3 mb-5 rounded space-y-2">
              <p className="text-[#E6C870] text-xs font-medium flex items-center gap-2">
                <Inbox size={13} /> Viene de la solicitud {origen.folio || "(sin folio)"}
                {origen.nombreCompleto ? ` · ${origen.nombreCompleto}` : ""}
              </p>
              <p className="text-white/45 text-xs leading-relaxed">
                Los campos están rellenados con lo que escribió el cliente. <strong className="text-white/70">
                Revísalos y corrige lo que haga falta antes de guardar</strong> — lo escribió él, no tú.
                El usuario y la contraseña los pones tú: no se derivan de sus datos.
              </p>
              {avisosPrefill.length > 0 && (
                <ul className="space-y-1 pt-1">
                  {avisosPrefill.map((a, i) => (
                    <li key={i} className="text-amber-300/85 text-xs flex items-start gap-2">
                      <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />{a}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="space-y-4">
            <Field label="Nombre del evento *" value={form.nombreEvento} onChange={(v) => set("nombreEvento", v)} placeholder="Boda Ana & Luis" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipo de evento" value={form.tipoEvento} onChange={(v) => set("tipoEvento", v)} placeholder="Boda, XV, corporativo…" />
              <Field label="Fecha" value={form.fechaEvento} onChange={(v) => set("fechaEvento", v)} type="date" />
            </div>
            <div>
              <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">Salón</label>
              <select value={form.salonId} onChange={(e) => set("salonId", e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white/70 text-sm px-4 py-3 outline-none focus:border-[#C9A84C]/40">
                <option value="" className="bg-[#111]">— Sin asignar —</option>
                {salones.map((s) => <option key={s.id} value={s.id} className="bg-[#111]">{s.nombre}</option>)}
              </select>
            </div>

            <div className="border-t border-white/5 pt-4">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Datos de contacto del cliente (informativos)</p>
              <div className="space-y-3">
                <Field label="Nombre del cliente" value={form.clienteNombre} onChange={(v) => set("clienteNombre", v)} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Correo (contacto)" value={form.clienteEmail} onChange={(v) => set("clienteEmail", v)} type="email" />
                  <Field label="Teléfono" value={form.clienteTelefono} onChange={(v) => set("clienteTelefono", v)} />
                </div>
              </div>
            </div>

            {(origen || form.notas) && (
              <div className="border-t border-white/5 pt-4">
                <label className="text-white/30 text-xs uppercase tracking-wider mb-1.5 block">
                  Notas internas (lo que el cliente pidió y no tiene campo propio)
                </label>
                <textarea value={form.notas || ""} onChange={(e) => set("notas", e.target.value)} rows={6}
                  className="w-full bg-white/5 border border-white/10 text-white/70 text-xs px-4 py-3 outline-none focus:border-[#C9A84C]/40 font-mono leading-relaxed" />
              </div>
            )}

            <div className="border-t border-white/5 pt-4">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Acceso al portal (usuario + contraseña)</p>
              <p className="text-white/25 text-xs mb-3">El cliente entra SOLO con estos datos (sin correo). Anótalos: la contraseña no se puede recuperar después.</p>
              <div className="grid grid-cols-2 gap-3">
                <div className={campoMal === "usuario" ? "ring-1 ring-red-400/50 rounded" : ""}>
                  <Field label="Usuario *" value={form.usuario} onChange={(v) => { set("usuario", v); setCampoMal(""); }} placeholder="ana-luis" />
                  <p className="text-white/25 text-[11px] mt-1">{AYUDA_USUARIO}</p>
                </div>
                <div className={campoMal === "password" ? "ring-1 ring-red-400/50 rounded" : ""}>
                  <Field label="Contraseña *" value={form.password} onChange={(v) => { set("password", v); setCampoMal(""); }} />
                  <p className="text-white/25 text-[11px] mt-1">{AYUDA_PASSWORD}</p>
                </div>
              </div>
            </div>

            {origen && (
              <div className="border-t border-white/5 pt-4">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-1">
                  Al guardar, la solicitud {origen.folio || ""} pasa a…
                </p>
                <p className="text-white/25 text-xs mb-3">
                  Es una propuesta. Si lo dejas en «no cambiarlo», la solicitud se queda como está
                  ({origen.estatus || "Nueva"}).
                </p>
                <select
                  value={cerrarSolicitud}
                  onChange={(e) => setCerrarSolicitud(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white/70 text-sm px-4 py-3 outline-none focus:border-[#C9A84C]/40"
                >
                  <option value="" className="bg-[#111]">— No cambiarlo —</option>
                  {ESTATUS_TRAS_CONVERTIR.map((e) => (
                    <option key={e} value={e} className="bg-[#111]">{e}</option>
                  ))}
                </select>
              </div>
            )}

            {error && (
              <p className="text-red-400/90 text-xs border border-red-400/20 bg-red-400/5 px-3 py-2 rounded flex items-start gap-2">
                <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />{error}
              </p>
            )}
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={crear} disabled={guardando}
              className="flex items-center gap-2 bg-[#C9A84C] text-[#0a0a0a] px-6 py-2.5 text-sm font-medium hover:bg-[#d4b558] transition-all disabled:opacity-50">
              {guardando ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Crear evento
            </button>
            <button onClick={() => setCreando(false)} className="px-6 py-2.5 border border-white/10 text-white/40 hover:text-white/60 text-sm transition-all">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar evento, cliente o usuario…"
            className="w-full bg-white/5 border border-white/10 text-white/70 text-sm pl-9 pr-4 py-2.5 outline-none focus:border-[#C9A84C]/40" />
        </div>
        {["Todos", ...ESTATUS].map((s) => (
          <button key={s} onClick={() => setFiltro(s)}
            className={`px-3.5 py-2 text-xs rounded-full transition-all ${filtro === s ? "bg-[#C9A84C]/15 text-[#C9A84C] border border-[#C9A84C]/40" : "text-white/30 hover:text-white/60 border border-white/10"}`}>
            {s}
          </button>
        ))}
      </div>

      <Estado
        cargando={cargando} error={errorCarga} onReintentar={recargar}
        vacio={lista.length === 0}
        mensajeVacio={eventos.length === 0 ? "Todavía no hay eventos. Crea el primero." : "No hay eventos que coincidan."}
        mensajeError="No se pudieron cargar los eventos."
        esqueleto={<EsqueletoFilas filas={4} alto="h-[74px]" />}
      >
      <div className="space-y-2.5">
        {lista.map((e) => (
          <button key={e.id} onClick={() => setAbierto(e)}
            className="skeu-card skeu-card-hover w-full flex items-center gap-4 px-5 py-4 text-left">
            <div className="w-10 h-10 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center flex-shrink-0">
              <Calendar size={16} className="text-[#C9A84C]/70" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/90 text-sm font-medium truncate flex items-center gap-2">
                {e.nombreEvento}
                {repetido(e) && (
                  <span className="text-amber-300/80 bg-amber-400/10 border border-amber-400/25 text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 font-normal">
                    nombre repetido
                  </span>
                )}
              </p>
              <div className="flex items-center gap-3 mt-1 text-white/35 text-xs">
                <span>{e.fechaEvento || "sin fecha"}</span>
                <span className="flex items-center gap-1 truncate"><User size={11} />{e.clienteNombre || e.usuario || "—"}</span>
                <span className="truncate hidden sm:inline">{salonNombre(e.salonId)}</span>
                {e.creadoPor && <span className="text-[#C9A84C]/50 truncate hidden md:inline">· creado por {e.creadoPor}</span>}
                {repetido(e) && (
                  <span className="text-amber-300/60 truncate">
                    · alta {altaCorta(e.createdAt) || "—"} · {e.usuario ? `acceso «${e.usuario}»` : "sin acceso"}
                  </span>
                )}
              </div>
            </div>
            {/* Un evento sin `usuario` quedó a medias: se ve en la lista, no solo en un
                aviso que desaparece al recargar. */}
            {!e.usuario && (
              <span className="flex items-center gap-1 text-amber-400/80 text-xs flex-shrink-0 border border-amber-400/25 bg-amber-400/5 px-2 py-0.5 rounded-full">
                <KeyRound size={11} /> Sin credenciales
              </span>
            )}
            {e.portalActivo && <span className="flex items-center gap-1 text-green-400/70 text-xs flex-shrink-0"><DoorOpen size={12} /> Portal</span>}
            <span className={`text-xs px-2.5 py-1 rounded-full flex-shrink-0 ${estatusColor(e.estatus)}`}>{e.estatus || "Apartado"}</span>
          </button>
        ))}
      </div>
      </Estado>
    </div>
  );
}
