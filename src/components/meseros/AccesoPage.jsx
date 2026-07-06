import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { MapPin, Users, Check, Loader2, AlertTriangle, ArrowLeft, Minus, Plus } from "lucide-react";

/**
 * Vista de acceso (meseros). Se abre al escanear el QR: /acceso/<token>.
 * Protegida por <RequireAdmin> (los meseros usan la sesión del panel). Los RPCs
 * `info_invitacion` y `registrar_acceso` validan admin + cupo en el servidor.
 */
export default function AccesoPage() {
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);
  const [personas, setPersonas] = useState(1);
  const [registrando, setRegistrando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const cargar = async () => {
    setCargando(true); setError(""); setResultado(null);
    try {
      const data = await base44.rpc("info_invitacion", { p_token: token });
      setInfo(data);
      const restante = Math.max(1, (data.max || 1) - (data.registradas || 0));
      setPersonas(Math.min(1, restante) || 1);
    } catch (e) {
      setError(e.message || "No se pudo leer la invitación.");
    } finally {
      setCargando(false);
    }
  };
  useEffect(() => { cargar(); }, [token]);

  const registrar = async () => {
    setRegistrando(true); setError("");
    try {
      const r = await base44.rpc("registrar_acceso", { p_token: token, p_personas: Number(personas) });
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
          <div className="bg-[#111] border border-[#C9A84C]/20 p-6">
            <p className="text-[#C9A84C]/60 text-xs uppercase tracking-[0.2em] text-center">{info.evento}</p>
            <h1 className="text-white text-2xl font-thin text-center mt-1">{info.invitado || "Invitado"}</h1>

            <div className="flex items-center justify-center gap-2 mt-4 text-white/70">
              <MapPin size={16} className="text-[#C9A84C]/70" />
              <span className="text-lg">{info.mesa}</span>
            </div>

            <div className="flex items-center justify-center gap-2 mt-2 text-white/40 text-sm">
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
                <div className="flex items-center justify-center gap-4">
                  <button onClick={() => setPersonas((p) => Math.max(1, p - 1))} className="w-10 h-10 border border-white/15 text-white/60 flex items-center justify-center hover:border-[#C9A84C]/40"><Minus size={16} /></button>
                  <span className="text-white text-3xl font-thin w-12 text-center">{personas}</span>
                  <button onClick={() => setPersonas((p) => Math.min(restante, p + 1))} className="w-10 h-10 border border-white/15 text-white/60 flex items-center justify-center hover:border-[#C9A84C]/40"><Plus size={16} /></button>
                </div>
                {error && <p className="text-red-400 text-xs text-center mt-3">{error}</p>}
                <button onClick={registrar} disabled={registrando}
                  className="w-full mt-5 flex items-center justify-center gap-2 bg-[#C9A84C] text-[#0a0a0a] py-3 text-sm font-medium hover:bg-[#d4b558] transition-all disabled:opacity-50">
                  {registrando ? <Loader2 size={14} className="animate-spin" /> : <Check size={16} />} Registrar acceso
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
