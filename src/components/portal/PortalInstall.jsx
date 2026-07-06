import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Share } from "lucide-react";

/**
 * PortalInstall — invita a instalar el portal como app ("Agrega tu evento a tu
 * pantalla"). En Android/Chrome usa el prompt nativo (beforeinstallprompt); en
 * iOS/Safari (que no lo soporta) muestra la instrucción de "Compartir → Añadir a
 * inicio". Apunta el manifest al del portal (start_url /portal, nombre "Mi evento").
 */
function esStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}
function esIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

export default function PortalInstall() {
  const [prompt, setPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [modoIOS, setModoIOS] = useState(false);

  useEffect(() => {
    if (esStandalone()) return; // ya instalada
    try {
      if (localStorage.getItem("jch_install_off") === "1") return;
    } catch { /* sin storage */ }

    // Apuntar el manifest al del portal para que instale "Mi evento".
    const link = document.querySelector('link[rel="manifest"]');
    const original = link?.getAttribute("href");
    if (link) link.setAttribute("href", "/manifest.webmanifest");

    const onPrompt = (e) => { e.preventDefault(); setPrompt(e); setVisible(true); };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS no dispara beforeinstallprompt: mostrar la instrucción manual.
    if (esIOS()) { setModoIOS(true); setVisible(true); }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      if (link && original) link.setAttribute("href", original);
    };
  }, []);

  const instalar = async () => {
    if (!prompt) return;
    prompt.prompt();
    await prompt.userChoice.catch(() => {});
    setPrompt(null);
    setVisible(false);
  };
  const cerrar = () => {
    setVisible(false);
    try { localStorage.setItem("jch_install_off", "1"); } catch { /* sin storage */ }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="glass-panel fixed bottom-28 inset-x-4 z-40 rounded-2xl px-4 py-3.5 flex items-center gap-3 max-w-md mx-auto"
        >
          <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/12 border border-[#C9A84C]/30 flex items-center justify-center flex-shrink-0">
            <Download size={18} className="text-[#E6C870]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white/85 text-sm font-medium">Agrega tu evento a tu pantalla</p>
            {modoIOS ? (
              <p className="text-white/45 text-xs flex items-center gap-1 flex-wrap">
                Toca <Share size={11} className="inline" /> Compartir y luego "Añadir a inicio".
              </p>
            ) : (
              <p className="text-white/45 text-xs">Ábrelo como app, sin buscar el link cada vez.</p>
            )}
          </div>
          {!modoIOS && prompt && (
            <button onClick={instalar} className="skeu-gold-btn text-xs px-4 py-2 rounded-full flex-shrink-0">Instalar</button>
          )}
          <button onClick={cerrar} aria-label="Cerrar" className="text-white/25 hover:text-white/60 flex-shrink-0"><X size={16} /></button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
