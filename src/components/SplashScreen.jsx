import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function SplashScreen({ logoUrl, onFinish }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onFinish, 800);
    }, 3400);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          style={{ backgroundColor: "#050505" }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          {/* Ambient glow background */}
          <div style={{
            position: "absolute", inset: 0,
            background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(201,168,76,0.07) 0%, transparent 70%)",
            pointerEvents: "none"
          }} />

          {/* Subtle grid texture */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "linear-gradient(rgba(201,168,76,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.03) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            pointerEvents: "none"
          }} />

          {/* Outer ring — pulse */}
          <motion.div
            style={{ position: "absolute", width: 420, height: 420, borderRadius: "50%", border: "1px solid rgba(201,168,76,0.08)" }}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1.6, opacity: 0 }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.div
            style={{ position: "absolute", width: 320, height: 320, borderRadius: "50%", border: "1px solid rgba(201,168,76,0.12)" }}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1.4, opacity: 0 }}
            transition={{ duration: 3, delay: 0.7, repeat: Infinity, ease: "easeOut" }}
          />



          {/* Main content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28, position: "relative" }}
          >
            {/* Logo */}
            {logoUrl ? (
              <motion.img
                src={logoUrl}
                alt="Jardines Club Hípico"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                style={{ width: 180, height: "auto", objectFit: "contain", filter: "drop-shadow(0 0 20px rgba(201,168,76,0.5)) drop-shadow(0 0 50px rgba(201,168,76,0.2)) drop-shadow(0 0 80px rgba(201,168,76,0.1))" }}
              />
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1 }}
                style={{ width: 90, height: 90, borderRadius: "50%", border: "1.5px solid rgba(201,168,76,0.6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 40px rgba(201,168,76,0.2), inset 0 0 20px rgba(201,168,76,0.05)" }}
              >
                <span style={{ color: "#C9A84C", fontSize: 26, fontWeight: 200, letterSpacing: "0.1em" }}>JCH</span>
              </motion.div>
            )}

            {/* Text */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.9, ease: "easeOut" }}
              style={{ textAlign: "center" }}
            >
              <h1 style={{ color: "#ffffff", fontSize: "clamp(18px, 4vw, 24px)", fontWeight: 200, letterSpacing: "0.4em", textTransform: "uppercase", marginBottom: 12, textShadow: "0 0 40px rgba(255,255,255,0.1)" }}>
                Jardines Club Hípico
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center" }}>
                <div style={{ height: 1, width: 40, background: "linear-gradient(to right, transparent, rgba(201,168,76,0.7))" }} />
                <span style={{ color: "rgba(201,168,76,0.7)", fontSize: 10, letterSpacing: "0.35em", textTransform: "uppercase" }}>Salón de Eventos</span>
                <div style={{ height: 1, width: 40, background: "linear-gradient(to left, transparent, rgba(201,168,76,0.7))" }} />
              </div>
            </motion.div>
          </motion.div>

          {/* Bottom loading bar */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: 0.9, duration: 2.2, ease: "easeInOut" }}
            style={{
              position: "absolute", bottom: 48,
              width: 120, height: 1,
              background: "linear-gradient(to right, transparent, rgba(201,168,76,0.8), transparent)",
              transformOrigin: "center"
            }}
          />

          {/* Bottom tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 0.8 }}
            style={{ position: "absolute", bottom: 24, color: "rgba(255,255,255,0.15)", fontSize: 9, letterSpacing: "0.4em", textTransform: "uppercase" }}
          >
            Momentos Únicos e Inolvidables
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}