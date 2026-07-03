import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Overlay de frases contextuales sobre la animación 3D.
 *
 * Estrategia: este componente es totalmente INDEPENDIENTE del canvas/scroll
 * de ScrollAnimationSection. Lee el progreso por su cuenta calculándolo
 * sobre el contenedor padre (sectionRef), suscribiéndose al scroll global.
 * Por eso NO toca la lógica del canvas ni rompe el sticky.
 *
 * Cada caption tiene un `at` (0..1) — el punto del progreso donde aparece —
 * y una `span` opcional para controlar cuánto dura visible.
 */

const DEFAULT_CAPTIONS = [
  { at: 0.06, span: 0.16, eyebrow: "Montajes personalizados", title: "Cada evento, único" },
  { at: 0.28, span: 0.16, eyebrow: "Espacios elegantes", title: "Salón y jardines en Xochimilco" },
  { at: 0.50, span: 0.16, eyebrow: "Detalles que transforman", title: "Presentación impecable" },
  { at: 0.72, span: 0.16, eyebrow: "Decoración y montaje premium", title: "Ambientes memorables" },
  { at: 0.90, span: 0.10, eyebrow: "Listo para recibirte", title: "Tu evento, perfecto" },
];

export default function ScrollAnimationCaptions({ sectionRef, captions = DEFAULT_CAPTIONS }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!sectionRef?.current) return;

    let raf = 0;
    const onScroll = () => {
      const section = sectionRef.current;
      if (!section) return;
      const vh = window.innerHeight;
      const sectionTop = section.offsetTop;
      const sectionH = section.offsetHeight;
      const scrolled = window.scrollY - sectionTop;
      const scrollable = sectionH - vh;
      const p = Math.min(Math.max(scrolled / scrollable, 0), 1);

      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setProgress(p));
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [sectionRef]);

  // Caption activa: la más reciente cuyo rango [at, at+span] contiene progress
  const active = (() => {
    for (let i = captions.length - 1; i >= 0; i--) {
      const c = captions[i];
      if (progress >= c.at && progress <= c.at + (c.span ?? 0.15)) return { ...c, index: i };
    }
    return null;
  })();

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: "clamp(80px, 14vh, 140px)",
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 3,
        padding: "0 16px",
      }}
    >
      <AnimatePresence mode="wait">
        {active && (
          <motion.div
            key={active.index}
            initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -14, filter: "blur(6px)" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{
              maxWidth: 560,
              width: "100%",
              textAlign: "center",
              padding: "14px 22px",
              borderRadius: 18,
              background:
                "linear-gradient(180deg, rgba(20,16,8,0.55) 0%, rgba(8,6,4,0.55) 100%)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: "1px solid rgba(201,168,76,0.35)",
              boxShadow:
                "0 1px 0 rgba(255,220,140,0.12) inset, 0 -1px 2px rgba(0,0,0,0.5) inset, 0 18px 40px -16px rgba(0,0,0,0.8), 0 0 28px -8px rgba(201,168,76,0.25)",
            }}
          >
            {/* Highlight superior dorado */}
            <span
              style={{
                position: "absolute",
                left: 16,
                right: 16,
                top: 0,
                height: 1,
                background:
                  "linear-gradient(90deg, transparent, rgba(255,220,140,0.6), transparent)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  height: 1,
                  width: 22,
                  background: "linear-gradient(to right, transparent, rgba(201,168,76,0.6))",
                }}
              />
              <span
                style={{
                  color: "rgba(230,200,112,0.95)",
                  fontSize: "clamp(9px, 1.1vw, 11px)",
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                }}
              >
                {active.eyebrow}
              </span>
              <span
                style={{
                  height: 1,
                  width: 22,
                  background: "linear-gradient(to left, transparent, rgba(201,168,76,0.6))",
                }}
              />
            </div>
            <p
              style={{
                color: "rgba(255,255,255,0.92)",
                fontSize: "clamp(16px, 2.4vw, 22px)",
                fontWeight: 300,
                letterSpacing: "0.02em",
                lineHeight: 1.25,
                margin: 0,
                textShadow: "0 1px 2px rgba(0,0,0,0.7)",
              }}
            >
              {active.title}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}