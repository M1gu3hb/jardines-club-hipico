import { useEffect, useRef, useState } from "react";
import ScrollHint from "./ScrollHint";
import ScrollAnimationCaptions from "./ScrollAnimationCaptions";

const TOTAL_FRAMES = 241;

// Frames auto-hospedados en /public/media/frames (migrados desde Base44).
function getFrameUrl(n) {
  return `/media/frames/frame-${String(n).padStart(3, "0")}.jpg`;
}

// Altura real del viewport en móvil (evita el bug de 100vh con barras del navegador)
function getVH() {
  return window.innerHeight;
}

export default function ScrollAnimationSection() {
  const sectionRef = useRef(null);
  const canvasRef = useRef(null);
  const stickyRef = useRef(null);
  const imagesRef = useRef({});
  const currentFrameRef = useRef(1);
  const rafRef = useRef(null);
  const vhRef = useRef(getVH());
  const [ready, setReady] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const [showHint, setShowHint] = useState(true);

  // Actualizar vhRef y altura sticky al resize (crítico en móvil)
  useEffect(() => {
    const onResize = () => {
      vhRef.current = getVH();
      if (stickyRef.current) {
        stickyRef.current.style.height = `${vhRef.current}px`;
      }
      if (sectionRef.current) {
        const scrollHeight = TOTAL_FRAMES * 10;
        sectionRef.current.style.height = `${vhRef.current + scrollHeight}px`;
      }
      drawFrame(currentFrameRef.current);
    };
    window.addEventListener("resize", onResize);
    // También en orientationchange
    window.addEventListener("orientationchange", () => setTimeout(onResize, 150));
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  // Preload images progressively
  useEffect(() => {
    let cancelled = false;
    const loadImage = (n) => new Promise((resolve) => {
      if (imagesRef.current[n]) { resolve(); return; }
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => { if (!cancelled) { imagesRef.current[n] = img; setLoadedCount((c) => c + 1); } resolve(); };
      img.onerror = () => resolve();
      img.src = getFrameUrl(n);
    });
    const loadBatch = async (start, end) => {
      const p = []; for (let i = start; i <= end; i++) p.push(loadImage(i)); await Promise.all(p);
    };
    loadBatch(1, 20).then(() => { if (!cancelled) setReady(true); loadBatch(21, TOTAL_FRAMES); });
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) { loadBatch(21, TOTAL_FRAMES); observer.disconnect(); }
    }, { rootMargin: "400px" });
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => { cancelled = true; observer.disconnect(); };
  }, []);

  // Draw current frame on canvas
  const drawFrame = (n) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = imagesRef.current[n];
    if (!img) {
      for (let i = n - 1; i >= 1; i--) { if (imagesRef.current[i]) { drawFrame(i); return; } }
      return;
    }
    const ctx = canvas.getContext("2d");
    const cw = canvas.width, ch = canvas.height;
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const scale = Math.min(cw / iw, ch / ih);
    const dw = iw * scale, dh = ih * scale;
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
  };

  // Scroll handler — usa scrollY + offsetTop para mayor precisión en móvil
  useEffect(() => {
    if (!ready) return;
    const handleScroll = () => {
      const section = sectionRef.current;
      if (!section) return;
      const vh = vhRef.current;
      const sectionTop = section.offsetTop;
      const sectionH = section.offsetHeight;
      const scrolled = window.scrollY - sectionTop;
      const scrollable = sectionH - vh;
      const progress = Math.min(Math.max(scrolled / scrollable, 0), 1);
      // Mantener hint visible en el primer tramo (≈30 frames), luego fade suave
      setShowHint(progress < 0.12);
      const frameIndex = Math.round(1 + progress * (TOTAL_FRAMES - 1));
      if (frameIndex !== currentFrameRef.current) {
        currentFrameRef.current = frameIndex;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => drawFrame(frameIndex));
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    drawFrame(1);
    handleScroll();
    return () => { window.removeEventListener("scroll", handleScroll); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [ready]);

  // Resize canvas
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
      drawFrame(currentFrameRef.current);
    };
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [ready]);

  const vh = vhRef.current;
  const scrollHeight = TOTAL_FRAMES * 10;

  return (
    <div
      ref={sectionRef}
      style={{
        height: `${vh + scrollHeight}px`,
        position: "relative",
        width: "100%",
        /* Sin overflow: hidden aquí — eso rompería el sticky interno. */
      }}
    >
      {/* Sticky canvas wrapper — usa window.innerHeight real, no 100vh.
          IMPORTANTE: ningún ancestro debe tener overflow:hidden ni transform. */}
      <div
        ref={stickyRef}
        style={{
          position: "sticky",
          top: 0,
          height: `${vh}px`,
          width: "100%",
          backgroundColor: "#050505",
          overflow: "hidden",
        }}
      >
        {/* Canvas */}
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "100%", display: "block" }}
        />

        {/* Fallback image while loading */}
        {!ready && (
          <img src={getFrameUrl(1)} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", backgroundColor: "#050505" }} />
        )}

        {/* ── Iluminación lateral premium — glow dorado/oscuro ── */}
        {/* Borde izquierdo — más delgado en móvil */}
        <div style={{
          position: "absolute", top: 0, left: 0,
          width: "clamp(4px, 6%, 18%)",
          height: "100%",
          background: "linear-gradient(to right, #050505 0%, rgba(5,5,5,0.85) 30%, rgba(201,168,76,0.04) 70%, transparent 100%)",
          pointerEvents: "none", zIndex: 2,
        }} />
        {/* Borde derecho — más delgado en móvil */}
        <div style={{
          position: "absolute", top: 0, right: 0,
          width: "clamp(4px, 6%, 18%)",
          height: "100%",
          background: "linear-gradient(to left, #050505 0%, rgba(5,5,5,0.85) 30%, rgba(201,168,76,0.04) 70%, transparent 100%)",
          pointerEvents: "none", zIndex: 2,
        }} />
        {/* Viñeta radial suave */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 70% 55% at 50% 50%, transparent 50%, rgba(5,5,5,0.5) 100%)",
          pointerEvents: "none", zIndex: 1,
        }} />

        {/* Label superior */}
        <div style={{ position: "absolute", top: "clamp(24px,5vh,48px)", left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, pointerEvents: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ height: 1, width: 32, background: "linear-gradient(to right, transparent, rgba(201,168,76,0.6))" }} />
            <span style={{ color: "rgba(201,168,76,0.7)", fontSize: "clamp(9px,1.2vw,11px)", letterSpacing: "0.35em", textTransform: "uppercase", fontWeight: 300 }}>
              Cada detalle toma forma
            </span>
            <div style={{ height: 1, width: 32, background: "linear-gradient(to left, transparent, rgba(201,168,76,0.6))" }} />
          </div>
        </div>

        {/* Captions contextuales (texto flotante con el contexto comercial
            de la animación). NO toca el canvas ni el scroll; lee progreso
            del sectionRef de forma independiente. */}
        <ScrollAnimationCaptions sectionRef={sectionRef} />

        {/* Scroll hint premium */}
        <ScrollHint visible={loadedCount >= 5 && showHint} />
      </div>
    </div>
  );
}
