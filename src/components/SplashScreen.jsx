import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { precargarVideoHero } from "@/lib/precargaHero";
import { LOGO } from "@/config/marca";

export default function SplashScreen({ logoUrl, onFinish }) {
  // El de la base manda; mientras no llega, el local. Nunca el círculo de siglas: ver `LOGO`.
  const logo = logoUrl || LOGO;
  const [visible, setVisible] = useState(true);

  // TEMPORAL — el video del hero se descarga AQUÍ, mientras el splash corre.
  // Sin esto la descarga empezaba cuando el hero montaba, o sea justo cuando el
  // video ya tenía que verse: el splash dura ~4 s de todas formas y ese hueco
  // estaba desaprovechado. No bloquea nada — si falla, el `<video>` descarga por
  // su cuenta igual que antes. Se apaga solo con `HERO_TEMPORAL.activo: false`.
  useEffect(() => { precargarVideoHero(); }, []);

  // EL RELEVO CON LA CORTINA DEL HTML.
  //
  // `index.html` pinta una cortina negra con el logotipo antes de que exista React (ver la
  // nota larga allí). Se retira AQUÍ, en el montaje: para este momento React ya ha pintado
  // este splash debajo —mismo fondo, mismo logotipo, misma posición— así que el cambio no se
  // ve. Quitarla antes dejaría asomar el hero; quitarla después taparía la animación.
  useEffect(() => {
    const cortina = typeof document !== 'undefined' && document.getElementById('cortina');
    if (cortina) cortina.remove();
  }, []);

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
            {logo ? (
              <motion.img
                src={logo}
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
              {/* ES UN `<p>`, NO UN `<h1>`, y ese cambio importa desde la FASE 3.
                *
                * Mientras el contenido de la portada vivía DENTRO de `{splashDone && ...}`, este
                * era el único encabezado del documento y no competía con nadie. Ahora la página
                * se pinta debajo del splash desde el primer byte, así que había DOS `<h1>` a la
                * vez: éste y el del hero, los dos diciendo «Jardines Club Hípico».
                *
                * Dos `<h1>` en un documento estropean dos cosas: un lector de pantalla anuncia
                * dos títulos de página distintos, y el buscador deja de tener claro de qué va.
                *
                * El splash es una animación de entrada: es decoración, no la estructura del
                * documento. `aria-hidden` lo saca además del árbol de accesibilidad, para que
                * quien navega con lector no oiga el nombre del sitio dos veces seguidas.
                *
                * Se conservan TODOS los estilos: visualmente no cambia nada. */}
              <p aria-hidden="true" style={{ color: "#ffffff", fontSize: "clamp(18px, 4vw, 24px)", fontWeight: 200, letterSpacing: "0.4em", textTransform: "uppercase", marginBottom: 12, textShadow: "0 0 40px rgba(255,255,255,0.1)" }}>
                Jardines Club Hípico
              </p>
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