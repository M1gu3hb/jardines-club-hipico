import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Play } from "lucide-react";

export const isVideo = (url) => /\.(mp4|webm|mov|ogg|m4v)(\?.*)?$/i.test(url || "");

function VideoPlayer({ url, autoPlay = false }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    return () => {
      if (ref.current) {
        ref.current.pause();
        ref.current.currentTime = 0;
      }
    };
  }, []);

  const toggle = (e) => {
    e.stopPropagation();
    if (!ref.current) return;
    if (playing) {
      ref.current.pause();
      setPlaying(false);
    } else {
      ref.current.play().then(() => setPlaying(true)).catch(() => {});
    }
  };

  return (
    <div className="relative flex items-center justify-center cursor-pointer" onClick={toggle}>
      <video
        ref={ref}
        src={url}
        loop
        playsInline
        controls={playing}
        className="max-h-[85vh] max-w-[80vw] object-contain"
      />
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/60 border border-white/20 flex items-center justify-center">
            <Play size={24} className="text-white ml-1" />
          </div>
        </div>
      )}
    </div>
  );
}

// General purpose full-screen media viewer (image + video carousel)
// items: [{url, titulo}]
// autoPlayVideos: true for salons (autoplay on navigate), false for gallery (click to play)
export default function MediaViewer({ items, startIdx = 0, onClose, autoPlayVideos = false }) {
  const [current, setCurrent] = useState(startIdx);

  const prev = useCallback(() => setCurrent(c => (c - 1 + items.length) % items.length), [items.length]);
  const next = useCallback(() => setCurrent(c => (c + 1) % items.length), [items.length]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, prev, next]);

  useEffect(() => {
    let startX = null;
    const onTouchStart = (e) => { startX = e.touches[0].clientX; };
    const onTouchEnd = (e) => {
      if (startX === null) return;
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) { diff > 0 ? next() : prev(); }
      startX = null;
    };
    window.addEventListener("touchstart", onTouchStart);
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [prev, next]);

  const item = items[current];
  const video = isVideo(item?.url);

  return (
    <motion.div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/97"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      {/* Blurred bg for images */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {!video && item?.url && (
          <img src={item.url} alt="" className="w-full h-full object-cover opacity-10 blur-2xl scale-110" />
        )}
      </div>

      {/* Close */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-5 right-5 z-10 w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 text-white/60 hover:text-white transition-colors"
      >
        <X size={18} />
      </button>

      {/* Nav */}
      {items.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-4 md:left-8 z-10 w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 text-white/50 hover:text-white transition-colors">
            <ChevronLeft size={22} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-4 md:right-8 z-10 w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 text-white/50 hover:text-white transition-colors">
            <ChevronRight size={22} />
          </button>
        </>
      )}

      {/* Media */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          className="relative z-10"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.22 }}
          onClick={(e) => e.stopPropagation()}
        >
          {video ? (
            <VideoPlayer key={`v-${current}`} url={item.url} autoPlay={autoPlayVideos} />
          ) : (
            <img
              src={item.url}
              alt={item.titulo || ""}
              className="max-h-[85vh] max-w-[80vw] object-contain"
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Dots */}
      {items.length > 1 && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
          <div className="flex gap-1.5">
            {items.map((_, i) => (
              <button key={i} onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
                className={`h-0.5 transition-all ${i === current ? "w-6 bg-[#C9A84C]" : "w-2 bg-white/20"}`} />
            ))}
          </div>
          <span className="text-white/30 text-xs tracking-widest">{current + 1} / {items.length}</span>
        </div>
      )}
    </motion.div>
  );
}