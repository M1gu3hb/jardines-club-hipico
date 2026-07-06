import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, AlertTriangle, RefreshCw, Users, QrCode, MapPin } from "lucide-react";

/**
 * StaffPage — vista de MESEROS por evento. Se abre con el link de staff
 * (/staff/<staff_token>) que comparte el admin. NO da acceso al panel: solo
 * muestra el avance de mesas en vivo y guarda el token para que, al escanear
 * los QR de invitados (/acceso/<token>), la app sepa que es staff autorizado.
 */
export default function StaffPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setError("");
    try {
      const d = await base44.rpc("progreso_mesas_staff", { p_staff: token });
      setData(d);
      // Guardar el token para el registro por QR (mismo navegador).
      try { localStorage.setItem("jch_staff_token", token); } catch { /* sin storage */ }
    } catch (e) {
      setError(e.message?.includes("autorizado") ? "Este link de meseros no es válido o fue renovado. Pídele al organizador el link actualizado." : (e.message || "No se pudo cargar."));
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => { cargar(); }, [cargar]);

  if (cargando) {
    return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center"><Loader2 size={28} className="text-[#C9A84C] animate-spin" /></div>;
  }
  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 text-center">
        <div><AlertTriangle size={32} className="text-red-400/70 mx-auto mb-4" /><p className="text-white/70 max-w-xs">{error}</p></div>
      </div>
    );
  }

  const mesas = data?.mesas || [];

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-10">
      <header className="glass-panel sticky top-0 z-40 border-x-0 border-t-0 px-5 py-3">
        <p className="portal-eyebrow">Jardines Club Hípico · Meseros</p>
        <p className="text-white/85 text-sm font-light">{data?.evento}</p>
      </header>

      <div className="px-5 py-6 max-w-lg mx-auto">
        {/* Instrucciones */}
        <div className="skeu-card p-5 mb-6">
          <p className="text-white/80 text-sm flex items-start gap-2.5 leading-relaxed">
            <QrCode size={17} className="text-[#E6C870] flex-shrink-0 mt-0.5" />
            <span>
              <span className="text-[#E6C870] font-medium">Cómo registrar invitados:</span>{" "}
              <span className="text-white/55">Ten esta página abierta y escanea con la cámara de tu teléfono el QR de cada invitado. Verás su mesa y cuántas personas puedes registrar.</span>
            </span>
          </p>
        </div>

        {/* Avance por mesa */}
        <div className="flex items-center justify-between mb-3">
          <p className="portal-eyebrow flex items-center gap-1.5"><Users size={12} /> Avance de mesas</p>
          <button onClick={cargar} className="flex items-center gap-1.5 text-[#C9A84C]/70 hover:text-[#C9A84C] text-xs transition-colors">
            <RefreshCw size={13} /> Actualizar
          </button>
        </div>

        {mesas.length > 0 && (
          <div className="skeu-card px-5 py-4 mb-4 flex items-center justify-between">
            <span className="text-white/50 text-sm">Total en el evento</span>
            <span className="text-[#E6C870] text-lg font-light tabular-nums">{data.totalReg}/{data.totalCap}</span>
          </div>
        )}

        <div className="space-y-2.5">
          {mesas.map((m) => {
            const pct = m.capacidad ? Math.min(100, (m.registradas / m.capacidad) * 100) : 0;
            const lleno = m.registradas >= m.capacidad;
            return (
              <div key={m.id} className="skeu-card px-4 py-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/85 text-sm flex items-center gap-1.5"><MapPin size={13} className="text-[#C9A84C]/60" /> {m.nombre}</span>
                  <span className={`text-sm tabular-nums ${lleno ? "text-green-400/80" : "text-[#E6C870]"}`}>{m.registradas}/{m.capacidad}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: lleno ? "rgba(74,222,128,0.7)" : "linear-gradient(90deg,#A88532,#E6C870)" }} />
                </div>
              </div>
            );
          })}
          {mesas.length === 0 && <p className="text-white/25 text-sm py-8 text-center">Este evento aún no tiene mesas con invitaciones.</p>}
        </div>
      </div>
    </div>
  );
}
