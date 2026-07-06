import { useEffect, useState } from "react";

/**
 * Celebracion — estallido de chispas doradas para los momentos que importan
 * (confirmar el evento, agregar algo a tu lista). CSS puro sobre transform/opacity
 * (compositor-friendly), se autodestruye al terminar. Respeta reduced-motion.
 *
 * Uso: <Celebracion activo={estallar} onFin={() => setEstallar(false)} />
 */
const CHISPAS = 18;

export default function Celebracion({ activo, onFin, tam = 220 }) {
  const [particulas, setParticulas] = useState(null);

  useEffect(() => {
    if (!activo) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onFin?.();
      return;
    }
    const nuevas = Array.from({ length: CHISPAS }, (_, i) => {
      const ang = (i / CHISPAS) * Math.PI * 2 + Math.random() * 0.5;
      const dist = tam * (0.45 + Math.random() * 0.55);
      return {
        id: i,
        dx: Math.cos(ang) * dist,
        dy: Math.sin(ang) * dist - tam * 0.15,
        rot: Math.random() * 360,
        dur: 0.7 + Math.random() * 0.5,
        delay: Math.random() * 0.12,
        forma: i % 3, // 0 punto, 1 rombo, 2 línea
        color: ["#F0D98A", "#E2C266", "#C9A84C"][i % 3],
      };
    });
    setParticulas(nuevas);
    const t = setTimeout(() => { setParticulas(null); onFin?.(); }, 1400);
    return () => clearTimeout(t);
  }, [activo]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!particulas) return null;

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-visible" aria-hidden="true">
      {particulas.map((p) => (
        <span
          key={p.id}
          className="jch-chispa"
          style={{
            "--dx": `${p.dx}px`,
            "--dy": `${p.dy}px`,
            "--rot": `${p.rot}deg`,
            background: p.color,
            width: p.forma === 2 ? 2 : 6,
            height: p.forma === 2 ? 12 : 6,
            borderRadius: p.forma === 1 ? 1 : "50%",
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
