import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { MapPin, Users, Check, Loader2, AlertTriangle, ArrowLeft, Minus, Plus } from "lucide-react";

/**
 * Vista de acceso al escanear el QR de un invitado: /acceso/<token>.
 * Funciona para DOS tipos de usuario, sin panel:
 *  - ADMIN con sesión → RPCs `info_invitacion` / `registrar_acceso` (validan is_admin).
 *  - MESERO (staff) con el token guardado al abrir /staff/<staff_token> →
 *    RPCs `*_staff` que validan el staff_token del evento.
 * En ambos casos el cupo se valida en el servidor.
 */
export default function AccesoPage() {
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [personas, setPersonas] = useState(1);
  const [registrando, setRegistrando] = useState(false);
  const [resultado, setResultado] = useState(null);

  // staff_token guardado por StaffPage (si el mesero abrió su link primero).
  const staffToken = (() => { try { return localStorage.getItem("jch_staff_token"); } catch { return null; } })();

  const cargar = async () => {
    setCargando(true); setError(""); setResultado(null);
    try {
      // Preferimos el modo staff si hay token de meseros; si no, modo admin.
      const data = staffToken
        ? await base44.rpc("info_invitacion_staff", { p_staff: staffToken, p_token: token })
        : await base44.rpc("info_invitacion", { p_token: token });
      setInfo(data);
      const restante = Math.max(1, (data.max || 1) - (data.registradas || 0));
      setPersonas(Math.min(1, restante) || 1);
    } catch (e) {
      const msg = /no autorizado|autorizado/i.test(e.message || "")
        ? "Necesitas abrir primero el link de meseros, o entrar como administrador."
        : (e.message || "No se pudo leer la invitación.");
      setError(msg);
    } finally {
      setCargando(false);
    }
  };
  useEffect(() => { cargar(); }, [token]);

  const registrar = async () => {
    setRegistrando(true); setError("");
    try {
      const r = staffToken
        ? await base44.rpc("registrar_acceso_staff", { p_staff: staffToken, p_token: token, p_personas: Number(personas) })
        : await base44.rpc("registrar_acceso", { p_token: token, p_personas: Number(personas) });
      setResultado(r);
      await cargar();
    } catch (e) {
      setError(e.message?.includes("excede") ? "Excede el cupo disponible de esta mesa." : (e.message || "No se pudo registrar."));
    } finally {
      setRegistrando(false);
    }
  };

  const restante = info ? Math.max(0, (info.max || 0) - (info.registradas || 0)) : 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {cargando ? (
          <div className="flex justify-center py-16"><Loader2 size={28} className="text-[#C9A84C] animate-spin" /></div>
        ) : error && !info ? (
          <div className="text-center">
            <AlertTriangle size={32} className="text-red-400/70 mx-auto mb-4" />
            <p className="text-white/70">{error}</p>
          </div>
        ) : info ? (
          <div className="skeu-card p-6">
            <p className="portal-eyebrow text-center">{info.evento}</p>
            <h1 className="text-white text-2xl font-thin text-center mt-1">{info.invitado || "Invitado"}</h1>

            {/* La mesa en GRANDE: el mesero debe leerla de un vistazo en la puerta */}
            <div className="mt-5 text-center rounded-2xl border border-[#C9A84C]/30 bg-[#C9A84C]/[0.07] px-4 py-5">
              <p className="flex items-center justify-center gap-1.5 text-[#C9A84C]/70 text-[11px] uppercase tracking-[0.25em] mb-1">
                <MapPin size={12} /> Su mesa
              </p>
              <p
                className="font-thin leading-none"
                style={{
                  fontSize: "clamp(2rem, 8vw, 2.8rem)",
                  background: "linear-gradient(180deg, #F0D98A 0%, #C9A84C 55%, #A88532 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {info.mesa}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 mt-4 text-white/40 text-sm">
              <Users size={14} /> {info.registradas}/{info.max} registradas · quedan {restante}
            </div>

            {resultado && (
              <div className="mt-4 flex items-center justify-center gap-2 text-green-400/80 text-sm">
                <Check size={16} /> Registradas {resultado.registradas}/{resultado.max}
              </div>
            )}

            {restante > 0 ? (
              <div className="mt-6">
                <p className="text-white/40 text-xs uppercase tracking-wider text-center mb-3">¿Cuántas personas entran?</p>
                {/* Botones grandes: se usan de pie, con prisa y con el teléfono en una mano */}
                <div className="flex items-center justify-center gap-5">
                  <button onClick={() => setPersonas((p) => Math.max(1, p - 1))}
                    className="w-14 h-14 rounded-full border border-white/15 text-white/70 flex items-center justify-center active:scale-95 hover:border-[#C9A84C]/40 transition-all">
                    <Minus size={20} />
                  </button>
                  <span className="text-white text-4xl font-thin w-14 text-center tabular-nums">{personas}</span>
                  <button onClick={() => setPersonas((p) => Math.min(restante, p + 1))}
                    className="w-14 h-14 rounded-full border border-white/15 text-white/70 flex items-center justify-center active:scale-95 hover:border-[#C9A84C]/40 transition-all">
                    <Plus size={20} />
                  </button>
                </div>
                {error && <p className="text-red-400 text-xs text-center mt-3">{error}</p>}
                <button onClick={registrar} disabled={registrando}
                  className="skeu-gold-btn w-full mt-6 flex items-center justify-center gap-2 py-4 rounded-full text-sm font-medium disabled:opacity-50">
                  {registrando ? <Loader2 size={16} className="animate-spin" /> : <Check size={17} />} Registrar acceso
                </button>
              </div>
            ) : (
              <p className="mt-6 text-center text-white/50 text-sm">Esta invitación ya alcanzó su cupo.</p>
            )}
          </div>
        ) : null}

        <div className="text-center mt-6">
          <Link to="/" className="inline-flex items-center gap-1.5 text-white/25 hover:text-white/50 text-xs transition-colors">
            <ArrowLeft size={12} /> Salir
          </Link>
        </div>
      </div>
    </div>
  );
}
