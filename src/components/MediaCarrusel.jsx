import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { isVideo } from "./MediaViewer";

/**
 * MediaCarrusel — carrusel de imágenes/videos con FLECHAS, SWIPE (touch) y puntitos.
 * Compartido por el sitio público (ServiceAmenityCard) y el portal (detalle de
 * amenidad). Los videos se reproducen con controles; las imágenes se cubren.
 */
export default function MediaCarrusel({ media = [], alt = "", aspecto = "16 / 10", className = "" }) {
  const [idx, setIdx] = useState(0);
  const touchX = useRef(null);

  const total = media.length;
  if (total === 0) return null;

  const ir = (n) => setIdx((total + n) % total);
  const actual = media[idx];
  const esVid = isVideo(actual);

  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) < 40) return; // tap, no swipe
    ir(dx < 0 ? idx + 1 : idx - 1);
  };

  return (
    <div className={className}>
      <div
        className="relative w-full overflow-hidden rounded-xl select-none"
        style={{
          aspectRatio: aspecto,
          boxShadow: "0 2px 6px rgba(0,0,0,0.85) inset, 0 0 0 1px rgba(201,168,76,0.22) inset",
          background: "#0a0805",
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {esVid ? (
          <video key={actual} src={actual} controls playsInline className="w-full h-full object-contain bg-black" />
        ) : (
          <img key={actual} src={actual} alt={alt} loading="lazy" className="w-full h-full object-cover" draggable={false} />
        )}

        {/* Flechas (solo si hay más de un medio) */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); ir(idx - 1); }}
              aria-label="Anterior"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-white/90 active:scale-95 transition-transform"
              style={{ background: "rgba(10,8,5,0.55)", backdropFilter: "blur(6px)", border: "1px solid rgba(201,168,76,0.35)" }}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); ir(idx + 1); }}
              aria-label="Siguiente"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-white/90 active:scale-95 transition-transform"
              style={{ background: "rgba(10,8,5,0.55)", backdropFilter: "blur(6px)", border: "1px solid rgba(201,168,76,0.35)" }}
            >
              <ChevronRight size={18} />
            </button>
            <span
              className="absolute bottom-2 right-2 text-[10px] text-white/80 px-2 py-0.5 rounded-full tabular-nums"
              style={{ background: "rgba(10,8,5,0.6)", backdropFilter: "blur(4px)" }}
            >
              {idx + 1}/{total}
            </span>
          </>
        )}
      </div>

      {/* Puntitos */}
      {total > 1 && (
        <div className="flex items-center gap-1.5 mt-3 justify-center">
          {media.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => { e.stopPropagation(); setIdx(i); }}
              className={`h-1 transition-all rounded-full ${i === idx ? "w-6 bg-[#C9A84C]" : "w-2.5 bg-white/25"}`}
              aria-label={`Ver media ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
