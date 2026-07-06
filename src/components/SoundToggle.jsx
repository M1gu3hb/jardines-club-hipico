import { useState, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { isSoundEnabled, setSoundEnabled, subscribeSoundEnabled, playSound } from "./soundSystem";

/** Conserva el control de sonido del sitio (antes vivía en el Sidebar). */
export default function SoundToggle({ className = "" }) {
  const [soundOn, setSoundOn] = useState(isSoundEnabled);
  useEffect(() => subscribeSoundEnabled((v) => setSoundOn(v)), []);

  const toggle = () => {
    const next = !soundOn;
    setSoundEnabled(next);
    if (next) playSound("toggle");
  };

  return (
    <button
      onClick={toggle}
      title={soundOn ? "Desactivar sonidos" : "Activar sonidos"}
      aria-label={soundOn ? "Desactivar sonidos" : "Activar sonidos"}
      className={`text-[#C9A84C]/70 hover:text-[#C9A84C] transition-colors ${className}`}
    >
      {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
    </button>
  );
}
