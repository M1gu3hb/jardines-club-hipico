import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Check, Share2, Copy, ExternalLink, Users, Shirt, MessageSquare, Sparkles, RefreshCw } from "lucide-react";

const invitacionUrl = (token) => `${window.location.origin}/invitacion/${token}`;

/**
 * Traduce lo que puede responder `jardines.invitacion_guardar` (`sec_26`) a algo que el cliente
 * pueda leer. Un motivo por causa: mandar a "intentar de nuevo" algo que no va a funcionar
 * nunca es la forma de mentira que costó el P0.
 */
const MOTIVOS = {
  no_disponible: "No se encontró esta invitación, o no es de tu evento. Recarga la página.",
  demasiado_largo: "El mensaje o el código de vestimenta son demasiado largos. Acórtalos e inténtalo otra vez.",
  // Solo alcanzable si el evento se borra mientras se guarda (ver `sec_26`, `get diagnostics`).
  sin_efecto: "Este evento ya no está disponible. Recarga la página.",
};
const motivoRpc = (motivo) => {
  const e = new Error(MOTIVOS[motivo] || "No se pudo guardar. Inténtalo de nuevo.");
  /** @type {any} */ (e).motivo = motivo || "desconocido";
  return e;
};

/**
 * PostgREST responde `PGRST202` cuando la función no existe en el esquema expuesto. Aquí eso
 * no es un error del cliente ni de la red: es que **`sec_26` todavía no está aplicada**, que es
 * el estado de hoy. Decirlo con esas palabras evita que, el día que se aplique, un fallo
 * distinto se lea como "sigue sin haber permisos" y se concluya que la vía RPC no sirve.
 */
const noHabilitada = (e) =>
  e?.code === "PGRST202" || /Could not find the function|schema cache/i.test(e?.message || "");

/**
 * PortalInvitacion — el cliente crea y comparte su invitación digital y ve las
 * confirmaciones (RSVP) de sus invitados. La página pública vive en /invitacion/<token>.
 */
export default function PortalInvitacion({ evento }) {
  const [form, setForm] = useState({
    invitacionActiva: !!evento.invitacionActiva,
    invitacionMensaje: evento.invitacionMensaje || "",
    invitacionDressCode: evento.invitacionDressCode || "",
    invitacionToken: evento.invitacionToken || null,
  });
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState("");
  const [rsvps, setRsvps] = useState([]);
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setOk(false); setError(""); };

  const cargarRsvps = useCallback(() => {
    base44.entities.Rsvp.filter({ eventoId: evento.id }, "-created_date").then(setRsvps).catch(() => {});
  }, [evento.id]);
  useEffect(() => { cargarRsvps(); }, [cargarRsvps]);

  const guardar = async (activar, rotar = false) => {
    setGuardando(true);
    // `setOk(false)` al empezar y el ✓ excluye el error: sin esto, un guardado bueno seguido de
    // uno fallido deja «Guardado ✓» y el mensaje de error juntos. Hoy es inalcanzable —nunca
    // hay un guardado bueno— y se activa el dia en que la escritura funcione, que es el dia en
    // que importa. Misma forma que `EventoDatos` y `MesaReglas`.
    setOk(false);
    setError("");
    try {
      // EL TOKEN YA NO SE GENERA AQUÍ (fase B.5). Lo emite `sec_26` con
      // `jardines_private.token_seguro()`, el mismo generador que usa el token de staff desde
      // `sec_04`. Tres motivos, y el tercero es el que faltaba:
      //   · no hay forma que validar, así que no puede volver a pasar lo de T.1 —una regex que
      //     no casaba con el generador y habría rechazado el 100 % de los tokens—;
      //   · el cliente ya no elige su propio token (43 letras «A» pasaban la validación de
      //     forma y no tienen entropía ninguna);
      //   · y **se puede rotar**. El `coalesce` de T.2 arregló las dos pestañas pero cerró la
      //     única salida que había si a alguien se le filtra el enlace: desactivar bloquea,
      //     pero reactivar revivía el mismo enlace. Ahora rotar es un parámetro.
      const patch = {
        invitacionActiva: activar !== undefined ? activar : !!form.invitacionActiva,
        invitacionMensaje: form.invitacionMensaje || null,
        invitacionDressCode: form.invitacionDressCode || null,
      };
      // POR LA RPC, NO POR `entities.Evento`. Este es el P0 del bloque de cierre y su arreglo
      // tiene dos mitades; la primera versión solo hizo una.
      //
      //   1. Que deje de mentir. `update` devolvía el parche que se le pasaba cuando RLS dejaba
      //      el UPDATE en cero filas, así que durante meses el cliente escribió su mensaje, leyó
      //      «Guardado ✓», recibió la tarjeta «Comparte tu invitación» y mandó por WhatsApp un
      //      enlace que a sus invitados les decía «Esta invitación no está disponible por
      //      ahora». Comprobado: `count(invitacion_token)` = 0 en producción, ni una vez.
      //
      //   2. Que **pueda funcionar**. `eventos_upd` exige `is_admin()` y el portal es rol
      //      `cliente`, así que CUALQUIER camino por `entities.Evento` seguirá tocando cero
      //      filas por muy estricto que sea. `sec_26` existe justamente para eso — y estaba
      //      escrita, ensayada y **sin que nadie la llamara**. Una pieza correcta que nadie
      //      invoca es indistinguible de una que no existe, salvo porque parece resuelta.
      //
      // Hoy `sec_26` NO está aplicada, así que esta llamada falla. Falla **legiblemente** y con
      // un motivo propio (ver `MOTIVOS` / `noHabilitada`): sin eso, el día que el dueño la apruebe y algo
      // no funcione, el mensaje de "permisos" apuntaría al sitio equivocado.
      //
      // No hay respaldo a `updateEstricto` a propósito. Un respaldo que tampoco puede funcionar
      // solo sirve para volver a confundir la causa, que es el error que este bloque persigue.
      const r = await base44.rpc("invitacion_guardar", {
        p_evento_id: evento.id,
        p_activa: patch.invitacionActiva,
        p_mensaje: patch.invitacionMensaje,
        p_dress_code: patch.invitacionDressCode,
        p_rotar: rotar,
      });
      if (!r?.ok) throw motivoRpc(r?.motivo);
      // El token que vale es el que DEVUELVE la base, no el que se mandó. `sec_26` conserva con
      // `coalesce` el token que ya hubiera, así que si otra pestaña activó primero, esta se
      // recompone sola con el bueno en vez de repartir uno distinto. Sin ese `coalesce` —como
      // estaba— dos pestañas bastaban para dejar muertos los enlaces ya repartidos.
      // El token SIEMPRE sale de la respuesta: el navegador ya no tiene ninguno propio con el
      // que rellenar el hueco, que es justo lo que impide repartir dos enlaces distintos.
      setForm((f) => ({ ...f, ...patch, invitacionToken: r.token || null }));
      setOk(true);
    } catch (e) {
      // Tres causas distintas, tres mensajes distintos. "Intenta de nuevo" ante algo que no
      // puede funcionar manda al cliente a repetir para siempre; y confundir "todavía no está
      // habilitado" con "no tienes permiso" es lo que haría descartar la vía correcta.
      setError(
        noHabilitada(e)
          ? "Esta función todavía no está habilitada. Avísale a Jardines: está pendiente de " +
            "activarse, no es algo que puedas resolver desde aquí."
          : e?.message || "No se pudo guardar. Inténtalo de nuevo.",
      );
    } finally {
      setGuardando(false);
    }
  };

  const copiar = () => {
    navigator.clipboard?.writeText(invitacionUrl(form.invitacionToken)).then(() => {
      setCopiado(true); setTimeout(() => setCopiado(false), 2000);
    }).catch(() => {});
  };
  const compartir = () => {
    const msg = `¡Estás invitad@ a ${evento.nombreEvento}! Confirma tu asistencia aquí: ${invitacionUrl(form.invitacionToken)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  const totalConfirmados = rsvps.reduce((a, r) => a + (Number(r.personas) || 1), 0);
  const activa = form.invitacionActiva && form.invitacionToken;

  return (
    <div className="max-w-xl mx-auto">
      {/* Configuración */}
      <div className="skeu-card p-5 mb-5 space-y-4">
        <p className="text-white/80 text-sm flex items-start gap-2.5 leading-relaxed">
          <Sparkles size={16} className="text-[#E6C870] flex-shrink-0 mt-0.5" />
          <span>Crea una <span className="text-[#E6C870]">invitación digital</span> para compartir con tus invitados por WhatsApp. Ellos confirman su asistencia y tú ves quién viene.</span>
        </p>

        <div>
          <label className="text-white/40 text-xs uppercase tracking-wider mb-1.5 block flex items-center gap-1.5"><MessageSquare size={12} /> Mensaje para tus invitados</label>
          <textarea value={form.invitacionMensaje} onChange={(e) => set("invitacionMensaje", e.target.value)} rows={2}
            placeholder="Ej. Con mucho cariño te esperamos para celebrar juntos…"
            className="w-full bg-white/5 border border-white/10 rounded-xl text-white/80 text-sm px-4 py-2.5 outline-none focus:border-[#C9A84C]/40 resize-none" />
        </div>
        <div>
          <label className="text-white/40 text-xs uppercase tracking-wider mb-1.5 block flex items-center gap-1.5"><Shirt size={12} /> Código de vestimenta (opcional)</label>
          <input value={form.invitacionDressCode} onChange={(e) => set("invitacionDressCode", e.target.value)}
            placeholder="Ej. Formal, colores pastel…"
            className="w-full bg-white/5 border border-white/10 rounded-xl text-white/80 text-sm px-4 py-2.5 outline-none focus:border-[#C9A84C]/40" />
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => guardar(true)} disabled={guardando}
            className="skeu-gold-btn flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium disabled:opacity-50">
            {guardando ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />}
            {activa ? "Guardar cambios" : "Crear y activar invitación"}
          </button>
          {ok && !error && <span className="text-green-400/80 text-xs">Guardado ✓</span>}
          {error && <span className="text-red-400/90 text-xs">{error}</span>}
        </div>
      </div>

      {/* Compartir */}
      {activa && (
        <div className="skeu-card border-[#C9A84C]/30 p-5 mb-5">
          <p className="portal-eyebrow mb-3">Comparte tu invitación</p>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-2.5 rounded-lg mb-3">
            <span className="flex-1 text-white/60 text-xs truncate">{invitacionUrl(form.invitacionToken)}</span>
            <button onClick={copiar} className="text-[#C9A84C]/70 hover:text-[#C9A84C] flex-shrink-0" title="Copiar">
              {copiado ? <span className="text-green-400/80 text-xs">¡Copiado!</span> : <Copy size={15} />}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={compartir} className="flex items-center gap-2 border border-[#25D366]/40 text-[#25D366] px-4 py-2 text-sm rounded-full hover:bg-[#25D366]/10 transition-all">
              <Share2 size={14} /> Compartir por WhatsApp
            </button>
            <a href={invitacionUrl(form.invitacionToken)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 border border-white/10 text-white/50 px-4 py-2 text-sm rounded-full hover:text-white/80 transition-all">
              <ExternalLink size={14} /> Ver invitación
            </a>
            {/* ROTAR. Es la salida para un enlace filtrado —lo reenvían a un grupo equivocado, lo
                publican— y hasta ahora no existía ninguna: desactivar bloquea, pero reactivar
                revivía el mismo enlace. Con confirmación, porque rompe a propósito lo ya
                repartido: eso es exactamente lo que hace y hay que decirlo antes, no después. */}
            <button
              onClick={() => {
                if (!confirm(
                  "Se generará un enlace NUEVO para tu invitación.\n\n" +
                  "Los enlaces que ya hayas compartido dejarán de funcionar y tendrás que volver " +
                  "a mandar el nuevo a tus invitados. Las confirmaciones que ya recibiste se conservan.\n\n" +
                  "¿Generar un enlace nuevo?",
                )) return;
                guardar(true, true);
              }}
              disabled={guardando}
              className="flex items-center gap-2 border border-white/10 text-white/50 px-4 py-2 text-sm rounded-full hover:text-white/80 transition-all disabled:opacity-50"
            >
              <RefreshCw size={14} /> Generar enlace nuevo
            </button>
            <button onClick={() => guardar(false)} className="text-white/30 hover:text-white/60 px-3 py-2 text-xs ml-auto">Desactivar</button>
          </div>
        </div>
      )}

      {/* Confirmaciones (RSVP) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="portal-eyebrow flex items-center gap-1.5"><Users size={12} /> Confirmados</p>
          {rsvps.length > 0 && <span className="text-[#E6C870] text-sm">{totalConfirmados} personas · {rsvps.length} respuestas</span>}
        </div>
        <div className="space-y-2">
          {rsvps.map((r) => (
            <div key={r.id} className="skeu-card px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-white/85 text-sm">{r.nombre}</span>
                <span className="text-white/40 text-xs">{r.personas} {Number(r.personas) === 1 ? "persona" : "personas"}</span>
              </div>
              {r.mensaje && <p className="text-white/45 text-xs mt-1 italic">"{r.mensaje}"</p>}
            </div>
          ))}
          {rsvps.length === 0 && <p className="text-white/25 text-sm py-6 text-center">Aún no hay confirmaciones. Comparte tu invitación para empezar a recibirlas.</p>}
        </div>
      </div>
    </div>
  );
}
