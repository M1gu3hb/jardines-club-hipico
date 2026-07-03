import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { isVideo } from "./MediaViewer";
import useLockBodyScroll from "../hooks/useLockBodyScroll";
import useBackButtonClose from "../hooks/useBackButtonClose";

function VideoPlayer({ url }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    return () => {
      if (ref.current) { ref.current.pause(); ref.current.currentTime = 0; }
    };
  }, []);

  const toggle = (e) => {
    e.stopPropagation();
    if (!ref.current) return;
    if (playing) { ref.current.pause(); setPlaying(false); }
    else { ref.current.play().then(() => setPlaying(true)).catch(() => {}); }
  };

  return (
    <div className="relative flex items-center justify-center cursor-pointer w-full" onClick={toggle}>
      <video
        ref={ref}
        src={url}
        loop
        playsInline
        controls={playing}
        className="w-full object-contain"
        style={{ maxHeight: "55vh" }}
      />
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-14 h-14 rounded-full bg-black/60 border border-white/20 flex items-center justify-center">
            <Play size={22} className="text-white ml-1" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ItemImageOverlay({ item, onClose }) {
  // Build media list: primary + extras
  const mediaList = (() => {
    const urls = [];
    if (item.imagenUrl) urls.push(item.imagenUrl);
    if (item.imagenesUrl && Array.isArray(item.imagenesUrl)) {
      item.imagenesUrl.forEach(u => { if (u && !urls.includes(u)) urls.push(u); });
    }
    return urls;
  })();

  const [current, setCurrent] = useState(0);

  useLockBodyScroll(true);
  useBackButtonClose(true, onClose);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const prev = () => setCurrent(c => (c - 1 + mediaList.length) % mediaList.length);
  const next = () => setCurrent(c => (c + 1) % mediaList.length);

  if (!item) return null;

  const currentUrl = mediaList[current];
  const video = isVideo(currentUrl);
  const hasMedia = mediaList.length > 0;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />
        <motion.div
          className="relative z-10 bg-[#0f0f0f] border border-[#C9A84C]/20 w-full overflow-hidden"
          style={{ width: "min(68vw, 720px)" }}
          initial={{ scale: 0.93, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.93, opacity: 0, y: 16 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
        >
          {hasMedia && (
            <div className="w-full bg-black flex items-center justify-center relative" style={{ minHeight: "280px", maxHeight: "55vh" }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={current}
                  className="w-full flex items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {video ? (
                    <VideoPlayer key={`v-${current}`} url={currentUrl} />
                  ) : (
                    <img
                      src={currentUrl}
                      alt={item.titulo}
                      loading="lazy"
                      className="w-full object-contain"
                      style={{ maxHeight: "55vh" }}
                    />
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Carousel nav */}
              {mediaList.length > 1 && (
                <>
                  <button onClick={prev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors z-10">
                    <ChevronLeft size={16} />
                  </button>
                  <button onClick={next}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors z-10">
                    <ChevronRight size={16} />
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                    {mediaList.map((_, i) => (
                      <button key={i} onClick={() => setCurrent(i)}
                        className={`h-0.5 transition-all ${i === current ? "w-5 bg-[#C9A84C]" : "w-2 bg-white/25"}`} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="px-7 py-6">
            <h3 className="text-white font-light text-lg mb-2">{item.titulo}</h3>
            {item.descripcion && (
              <p className="text-white/50 text-sm leading-relaxed">{item.descripcion}</p>
            )}
          </div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-black/60 border border-white/10 text-white/60 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}