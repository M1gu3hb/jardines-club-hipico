import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { isVideo } from "./MediaViewer";

// ── Lazy image con skeleton premium ──────────────────────────────────────────
function LazyImg({ src, alt = "", priority = false, className = "", style = {} }) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(priority);
  const ref = useRef(null);

  useEffect(() => {
    if (priority) { setInView(true); return; }
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { rootMargin: "200px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [priority]);

  return (
    <div ref={ref} className={className} style={{ position: "relative", overflow: "hidden", background: "#111", ...style }}>
      {/* Skeleton shimmer */}
      {!loaded && (
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(110deg, #111 30%, #1c1a14 50%, #111 70%)",
          backgroundSize: "200% 100%",
          animation: "salonShimmer 1.5s linear infinite",
        }} />
      )}
      {inView && (
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setLoaded(true)}
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover",
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.45s ease",
          }}
        />
      )}
    </div>
  );
}

// ── Lightbox full-screen ─────────────────────────────────────────────────────
function Lightbox({ items, startIdx, onClose }) {
  const [idx, setIdx] = useState(startIdx);
  const totalItems = items.length;
  const prev = useCallback(() => setIdx(i => (i - 1 + totalItems) % totalItems), [totalItems]);
  const next = useCallback(() => setIdx(i => (i + 1) % totalItems), [totalItems]);

  // Touch swipe
  const touchStart = useRef(null);
  const onTouchStart = (e) => { touchStart.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStart.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(dx) > 40) dx < 0 ? next() : prev();
    touchStart.current = null;
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, prev, next]);

  const current = items[idx];
  const isVid = isVideo(current);

  return (
    <motion.div
      className="fixed inset-0 z-[400] flex flex-col"
      style={{ background: "rgba(5,5,5,0.97)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ height: 1, width: 20, background: "rgba(201,168,76,0.4)" }} />
          <span style={{ color: "rgba(201,168,76,0.6)", fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase" }}>
            {idx + 1} / {totalItems}
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center"
          style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
        >
          <X size={15} />
        </button>
      </div>

      {/* Media area */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden px-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            className="w-full h-full flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.3 }}
          >
            {isVid ? (
              <video
                src={current}
                controls
                autoPlay
                playsInline
                className="max-w-full max-h-full"
                style={{ maxHeight: "calc(100vh - 120px)", borderRadius: 4 }}
              />
            ) : (
              <img
                src={current}
                alt=""
                className="max-w-full max-h-full"
                style={{ maxHeight: "calc(100vh - 120px)", objectFit: "contain", borderRadius: 4 }}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Nav arrows */}
        {totalItems > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center transition-all"
              style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", borderRadius: 2 }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center transition-all"
              style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", borderRadius: 2 }}
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}
      </div>

      {/* Dot nav */}
      {totalItems > 1 && (
        <div className="flex justify-center gap-1.5 py-3 flex-shrink-0">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              style={{
                height: 2,
                width: i === idx ? 20 : 10,
                background: i === idx ? "rgba(201,168,76,0.9)" : "rgba(255,255,255,0.2)",
                transition: "all 0.3s ease",
                border: "none",
                cursor: "pointer",
                padding: 0,
                borderRadius: 1,
              }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── Thumbnail con skeleton ────────────────────────────────────────────────────
function Thumb({ url, idx, active, onClick, priority = false }) {
  const vid = isVideo(url);
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(priority);
  const ref = useRef(null);

  useEffect(() => {
    if (priority) { setInView(true); return; }
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { rootMargin: "400px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [priority]);

  return (
    <button
      ref={ref}
      onClick={onClick}
      style={{
        position: "relative", overflow: "hidden",
        display: "block",
        width: "100%", height: "100%",
        background: "#111",
        border: active ? "1.5px solid rgba(201,168,76,0.7)" : "1.5px solid transparent",
        padding: 0, cursor: "pointer",
        transition: "border-color 0.25s",
        borderRadius: 4,
      }}
      className="group"
    >
      {/* skeleton */}
      {!loaded && !vid && (
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(110deg, #111 30%, #1c1a14 50%, #111 70%)",
          backgroundSize: "200% 100%",
          animation: "salonShimmer 1.5s linear infinite",
          borderRadius: 3,
        }} />
      )}

      {inView && (
        vid ? (
          <>
            <video src={url} muted playsInline preload="metadata"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.3)" }}>
              <Play size={12} color="rgba(255,255,255,0.8)" />
            </div>
          </>
        ) : (
          <img
            src={url} alt=""
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            onLoad={() => setLoaded(true)}
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%",
              objectFit: "cover", opacity: loaded ? 1 : 0,
              transition: "opacity 0.35s ease, transform 0.3s ease",
            }}
            className="group-hover:scale-105"
          />
        )
      )}

      {/* hover overlay */}
      <div style={{
        position: "absolute", inset: 0, background: "rgba(0,0,0,0)",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "background 0.2s",
        borderRadius: 3,
      }} className="group-hover:!bg-black/30">
        <ZoomIn size={14} color="rgba(255,255,255,0)" className="group-hover:!text-white/70 transition-all" />
      </div>
    </button>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function SalonGallery({ galeria, heroIdx, onThumbClick }) {
  const [lightboxIdx, setLightboxIdx] = useState(null);

  if (!galeria || galeria.length <= 1) return null;

  // Layout: primera imagen grande + resto en grid
  const thumbs = galeria;

  return (
    <>
      <style>{`
        @keyframes salonShimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{ height: 1, width: 24, background: "rgba(201,168,76,0.3)" }} />
          <span style={{ color: "rgba(201,168,76,0.5)", fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase" }}>
            Galería · {galeria.length} fotos
          </span>
        </div>

        {/* Grid responsivo: 3 cols, primera imagen destacada */}
        <div className="salon-gallery-grid" style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gridAutoRows: "120px",
          gap: 5,
        }}>
          {thumbs.map((url, i) => (
            <div
              key={i}
              style={{
                gridColumn: (i === 0 && thumbs.length >= 4) ? "span 2" : "span 1",
                gridRow: (i === 0 && thumbs.length >= 4) ? "span 2" : "span 1",
              }}
            >
              <Thumb
                url={url}
                idx={i}
                active={i === heroIdx}
                priority={i < 4}
                onClick={() => {
                  onThumbClick(i);
                  setLightboxIdx(i);
                }}
              />
            </div>
          ))}
        </div>

        <style>{`
          @media (max-width: 540px) {
            .salon-gallery-grid { grid-template-columns: repeat(2, 1fr) !important; grid-auto-rows: 110px !important; }
            .salon-gallery-grid > div:first-child { grid-column: span 2 !important; grid-row: span 1 !important; }
          }
        `}</style>
      </div>

      <AnimatePresence>
        {lightboxIdx !== null && (
          <Lightbox
            items={galeria}
            startIdx={lightboxIdx}
            onClose={() => setLightboxIdx(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}