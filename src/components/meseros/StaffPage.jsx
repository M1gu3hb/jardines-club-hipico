import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, AlertTriangle, RefreshCw, Users, QrCode, MapPin } from "lucide-react";
import { mensajePuerta } from "@/lib/erroresPuerta";

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
      // Por CÓDIGO, no por frase: el servidor manda «no disponible» a propósito y la rama que
      // buscaba «autorizado» era inalcanzable. Ver `src/lib/erroresPuerta.js`.
      setError(mensajePuerta(e, "staff"));
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
        <div>
          <AlertTriangle size={32} className="text-red-400/70 mx-auto mb-4" />
          <p className="text-white/70 max-w-xs">{error}</p>
          {/* En la puerta, con invitados esperando, la pantalla de error no puede ser un
              callejón: la red del salón se cae y vuelve, y el mesero no tiene por qué saber
              que hay que arrastrar hacia abajo para recargar. */}
          <button
            type="button"
            onClick={() => { setCargando(true); cargar(); }}
            className="mt-6 inline-flex items-center gap-2 border border-[#C9A84C]/40 text-[#C9A84C] px-6 py-2.5 text-xs tracking-[0.2em] uppercase hover:bg-[#C9A84C]/10 transition-colors"
          >
            <RefreshCw size={13} /> Reintentar
          </button>
        </div>
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

        {/* EL CONTADOR PODÍA MENTIR, Y EN EL PEOR SITIO (B.1).
            `registrar_acceso_staff` —el único camino de registro que existe— escribe
            `invitaciones.personas_registradas`. Este tablero leía `mesas.ocupadas`, que **no la
            escribe nadie**: su único escritor, `registrar_llegada_mesa`, lleva meses sin
            llamador. Rosa escanea 40 QR, registra 95 personas, cada pantalla le dice
            «Registradas 8/8 ✓», y el tablero de la puerta sigue en 0/120 con las 15 mesas en
            0/8. Y el admin, en la misma hora, ve el número real porque su pantalla lo suma de la
            otra tabla.

            LA FUENTE ÚNICA ES `invitaciones.personas_registradas` (respaldada por `accesos`,
            que guarda una fila por escaneo). Se elige esa y no `mesas.ocupadas` por tres motivos:
            es la que el único camino de escritura real ya llena; es la que el panel del dueño ya
            suma, así que las dos pantallas coinciden sin tocar la suya; y `accesos` es el libro
            mayor —una fila por escaneo—, mientras que `ocupadas` es un contador desnormalizado
            que además el cliente puede escribir desde el navegador (ver fase E).

            El arreglo es de servidor: `progreso_mesas_staff` suma de ahí desde `sec_27`, APLICADA
            el 2026-08-05. El aviso de abajo se apaga SOLO —cuelga de `fuente`, un campo que solo
            devuelve la función nueva—, así que hoy no se ve. Se deja puesto a propósito: es lo
            que volvería a avisar si alguien restaurara la función vieja, y no hay que acordarse
            de nada para que funcione en ninguna de las dos direcciones. */}
        {mesas.length > 0 && (
          <>
            {data.fuente !== "invitaciones" && (
              <div className="skeu-card border-amber-400/30 px-5 py-3.5 mb-3">
                <p className="text-amber-300/90 text-sm">
                  Este avance <strong>puede no reflejar lo que ya registraste</strong>.
                </p>
                <p className="text-white/50 text-xs mt-1">
                  Los registros de cada QR sí se están guardando —lo que ves al escanear es
                  correcto—, pero este resumen todavía lee de otro sitio. Guíate por la pantalla
                  de cada invitación.
                </p>
              </div>
            )}
            <div className="skeu-card px-5 py-4 mb-4 flex items-center justify-between">
              <span className="text-white/50 text-sm">Total en el evento</span>
              <span className="text-[#E6C870] text-lg font-light tabular-nums">{data.totalReg}/{data.totalCap}</span>
            </div>
          </>
        )}

        <div className="space-y-2.5">
          {mesas.map((m) => {
            // `Math.min(100, …)` hacía que 20/10 se pintara IDÉNTICO a 10/10, así que la única
            // señal de que una mesa está sobrevendida quedaba invisible justo donde hay que
            // verla: en la puerta. Ahora la barra se satura pero el exceso se dice aparte y en
            // rojo — si no se puede enseñar, no hay forma de descubrirlo.
            const pct = m.capacidad ? Math.min(100, (m.registradas / m.capacidad) * 100) : 0;
            const excedida = m.capacidad > 0 && m.registradas > m.capacidad;
            const lleno = m.registradas >= m.capacidad;
            return (
              <div key={m.id} className="skeu-card px-4 py-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/85 text-sm flex items-center gap-1.5"><MapPin size={13} className="text-[#C9A84C]/60" /> {m.nombre}</span>
                  <span className={`text-sm tabular-nums ${excedida ? "text-red-400" : lleno ? "text-green-400/80" : "text-[#E6C870]"}`}>
                    {m.registradas}/{m.capacidad}
                    {excedida && <span className="ml-1.5 text-red-400 text-xs">· {m.registradas - m.capacidad} de más</span>}
                  </span>
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
