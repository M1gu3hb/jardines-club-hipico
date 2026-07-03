import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronRight, Volume2, VolumeX } from "lucide-react";
import { isSoundEnabled, setSoundEnabled, subscribeSoundEnabled, playSound } from "./soundSystem";

const navItems = [
  { id: "inicio", label: "Inicio" },
  { id: "salones", label: "Salones" },
  { id: "servicios", label: "Servicios" },
  { id: "amenidades", label: "Amenidades" },
  { id: "galeria", label: "Galería" },
  { id: "contacto", label: "Contacto" },
  { id: "no-incluye", label: "Avisos / No Incluye" },
];

export default function Sidebar({ logoUrl, activeSection }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled);

  useEffect(() => {
    return subscribeSoundEnabled(val => setSoundOn(val));
  }, []);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundEnabled(next);
    if (next) playSound("toggle");
  };

  const scrollTo = (id) => {
    playSound("click");
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileOpen(false);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 220 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="hidden md:flex flex-col fixed left-0 top-0 h-full z-50 bg-[#080808] border-r border-[#C9A84C]/10 overflow-hidden"
      >
        {/* Logo area */}
        <div className="flex items-center justify-between px-4 pt-6 pb-5 border-b border-[#C9A84C]/10 min-h-[80px]">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-3 overflow-hidden"
            >
              {logoUrl ? (
                <img src={logoUrl} alt="JCH" className="h-9 w-auto object-contain flex-shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full border border-[#C9A84C]/60 flex items-center justify-center flex-shrink-0">
                  <span className="text-[#C9A84C] text-xs font-medium">JCH</span>
                </div>
              )}
              <span className="text-white/80 text-xs font-light tracking-wider whitespace-nowrap">
                Jardines Club<br/>Hípico
              </span>
            </motion.div>
          )}
          {collapsed && logoUrl && (
            <img src={logoUrl} alt="JCH" className="h-8 w-auto mx-auto" />
          )}
          {collapsed && !logoUrl && (
            <div className="w-8 h-8 rounded-full border border-[#C9A84C]/60 flex items-center justify-center mx-auto">
              <span className="text-[#C9A84C] text-xs">J</span>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-6 px-2 space-y-1">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? "bg-[#C9A84C]/15 text-[#C9A84C]"
                    : "text-white/40 hover:text-white/80 hover:bg-white/5"
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all ${isActive ? "bg-[#C9A84C]" : "bg-white/20 group-hover:bg-white/40"}`} />
                {!collapsed && (
                  <span className="text-xs tracking-wide font-light whitespace-nowrap">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sound toggle */}
        <button
          onClick={toggleSound}
          title={soundOn ? "Desactivar sonidos" : "Activar sonidos"}
          className="flex items-center justify-center gap-2 px-4 py-3 border-t border-[#C9A84C]/10 text-white/25 hover:text-[#C9A84C]/60 transition-colors"
        >
          {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
          {!collapsed && <span className="text-[10px] tracking-widest uppercase font-light">{soundOn ? "Sonido" : "Mudo"}</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center p-4 border-t border-[#C9A84C]/10 text-white/30 hover:text-[#C9A84C]/70 transition-colors"
        >
          <motion.div animate={{ rotate: collapsed ? 0 : 180 }}>
            <ChevronRight size={16} />
          </motion.div>
        </button>
      </motion.aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#080808]/95 backdrop-blur-md border-b border-[#C9A84C]/10 flex items-center justify-between px-5 h-14">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="JCH" className="h-7 w-auto object-contain" />
          ) : (
            <div className="w-7 h-7 rounded-full border border-[#C9A84C]/60 flex items-center justify-center">
              <span className="text-[#C9A84C] text-xs">JCH</span>
            </div>
          )}
          <span className="text-white/70 text-xs tracking-wider font-light">Jardines Club Hípico</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="text-[#C9A84C]/80 hover:text-[#C9A84C]"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="md:hidden fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              className="md:hidden fixed top-0 left-0 bottom-0 z-[70] w-72 bg-[#080808] border-r border-[#C9A84C]/10 flex flex-col"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="flex items-center justify-between px-5 py-5 border-b border-[#C9A84C]/10">
                <div className="flex items-center gap-3">
                  {logoUrl ? (
                    <img src={logoUrl} alt="JCH" className="h-9 w-auto" />
                  ) : (
                    <div className="w-9 h-9 rounded-full border border-[#C9A84C]/60 flex items-center justify-center">
                      <span className="text-[#C9A84C] text-xs">JCH</span>
                    </div>
                  )}
                  <div>
                    <p className="text-white/80 text-sm font-light tracking-wider">Jardines Club Hípico</p>
                    <p className="text-[#C9A84C]/60 text-xs">Salón de Eventos</p>
                  </div>
                </div>
                <button onClick={() => setMobileOpen(false)} className="text-white/40 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              <nav className="flex-1 py-6 px-3 space-y-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollTo(item.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all text-sm font-light tracking-wide"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-[#C9A84C]/40" />
                    {item.label}
                  </button>
                ))}
              </nav>
              {/* Sound toggle mobile */}
              <button
                onClick={toggleSound}
                className="flex items-center gap-3 px-5 py-4 border-t border-[#C9A84C]/10 text-white/30 hover:text-white/60 transition-colors text-sm"
              >
                {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
                <span className="text-xs tracking-widest uppercase font-light">{soundOn ? "Sonido activado" : "Sonido desactivado"}</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}