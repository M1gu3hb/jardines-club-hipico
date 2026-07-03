/**
 * ScrollHint — indicador premium "Desliza para descubrir"
 *
 * Props:
 *   visible: boolean — controla fade in/out (con delay interno en mobile)
 */
export default function ScrollHint({ visible = true }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: "clamp(28px, 5vh, 52px)",
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        pointerEvents: "none",
        zIndex: 10,
        opacity: visible ? 1 : 0,
        transition: "opacity 1.1s ease",
      }}
    >
      <style>{`
        @keyframes fingerSlide {
          0%   { transform: translateY(0px);   opacity: 1; }
          40%  { transform: translateY(10px);  opacity: 0.6; }
          60%  { transform: translateY(10px);  opacity: 0.6; }
          100% { transform: translateY(0px);   opacity: 1; }
        }
        @keyframes dotTrail {
          0%   { transform: translateY(0);    opacity: 0.9; }
          55%  { transform: translateY(20px); opacity: 0.08; }
          56%  { transform: translateY(0);    opacity: 0; }
          80%  { transform: translateY(0);    opacity: 0; }
          100% { transform: translateY(0);    opacity: 0.9; }
        }
        @keyframes arrowPulse {
          0%, 100% { transform: translateY(0);   opacity: 0.5; }
          50%       { transform: translateY(5px); opacity: 1;   }
        }
        @keyframes hintGlow {
          0%, 100% { opacity: 0.7; }
          50%       { opacity: 1;   }
        }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>

        {/* ── Ícono de dedo / swipe (SVG minimalista) ── */}
        <div style={{ animation: "fingerSlide 2s ease-in-out infinite" }}>
          <svg width="26" height="36" viewBox="0 0 26 36" fill="none">
            {/* Cuerpo del dedo */}
            <rect x="9" y="10" width="8" height="16" rx="4"
              fill="none"
              stroke="rgba(201,168,76,0.7)"
              strokeWidth="1.2"
            />
            {/* Línea de la uña */}
            <line x1="13" y1="13" x2="13" y2="15"
              stroke="rgba(201,168,76,0.4)"
              strokeWidth="1"
              strokeLinecap="round"
            />
            {/* Flecha hacia abajo debajo del dedo */}
            <path d="M10 29L13 33L16 29"
              stroke="rgba(201,168,76,0.55)"
              strokeWidth="1.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Línea de movimiento */}
            <line x1="13" y1="26" x2="13" y2="29"
              stroke="rgba(201,168,76,0.35)"
              strokeWidth="1"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* ── Texto con líneas decorativas ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, animation: "hintGlow 2.5s ease-in-out infinite" }}>
          <div style={{
            height: 1,
            width: "clamp(14px, 2.5vw, 24px)",
            background: "linear-gradient(to right, transparent, rgba(201,168,76,0.5))",
          }} />
          <span style={{
            color: "rgba(255,248,220,0.85)",
            fontSize: "clamp(9px, 1vw, 11px)",
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            fontWeight: 300,
            fontFamily: "inherit",
            whiteSpace: "nowrap",
          }}>
            Desliza para descubrir
          </span>
          <div style={{
            height: 1,
            width: "clamp(14px, 2.5vw, 24px)",
            background: "linear-gradient(to left, transparent, rgba(201,168,76,0.5))",
          }} />
        </div>

        {/* ── Track tipo mouse — solo en desktop (oculto en móvil vía media size) ── */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
        }}>
          {/* Track oval */}
          <div style={{
            width: 20,
            height: 32,
            borderRadius: 10,
            border: "1px solid rgba(201,168,76,0.35)",
            boxShadow: "0 0 6px rgba(201,168,76,0.1)",
            display: "flex",
            justifyContent: "center",
            paddingTop: 4,
            position: "relative",
          }}>
            <div style={{
              width: 3,
              height: 3,
              borderRadius: "50%",
              background: "rgba(201,168,76,0.8)",
              boxShadow: "0 0 5px rgba(201,168,76,0.5)",
              animation: "dotTrail 1.9s ease infinite",
            }} />
          </div>

          {/* Chevron */}
          <svg width="12" height="8" viewBox="0 0 12 8" fill="none"
            style={{ animation: "arrowPulse 1.9s ease infinite" }}>
            <path d="M1 1L6 6.5L11 1"
              stroke="rgba(201,168,76,0.6)"
              strokeWidth="1.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

      </div>
    </div>
  );
}