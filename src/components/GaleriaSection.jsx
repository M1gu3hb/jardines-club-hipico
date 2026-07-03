import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play } from "lucide-react";
import MediaViewer, { isVideo } from "./MediaViewer";

const placeholders = [
  { url: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80", titulo: "Evento 1" },
  { url: "https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=800&q=80", titulo: "Evento 2" },
  { url: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=80", titulo: "Evento 3" },
  { url: "https://images.unsplash.com/photo-1470509037663-253d2d33012c?w=800&q=80", titulo: "Evento 4" },
  { url: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80", titulo: "Evento 5" },
  { url: "https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=800&q=80", titulo: "Evento 6" },
  { url: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&q=80", titulo: "Evento 7" },
  { url: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&q=80", titulo: "Evento 8" },
];

// Desktop span pattern (4 columns)
function getDesktopSpan(i) {
  const pattern = i % 7;
  if (pattern === 0) return "col-span-2 row-span-2";
  if (pattern === 3) return "col-span-2 row-span-1";
  if (pattern === 6) return "col-span-1 row-span-2";
  return "col-span-1 row-span-1";
}

// Tablet span pattern (2 columns) — alternates tall/wide
function getTabletSpan(i) {
  const pattern = i % 5;
  if (pattern === 0) return "col-span-2 row-span-1"; // wide
  if (pattern === 2) return "col-span-1 row-span-2"; // tall
  if (pattern === 4) return "col-span-1 row-span-2"; // tall
  return "col-span-1 row-span-1";
}

// Mobile uses a 2-column masonry-like pattern with varied heights
function getMobileSpan(i) {
  const pattern = i % 6;
  if (pattern === 0) return "col-span-2"; // full width
  if (pattern === 3) return "col-span-2"; // full width
  return "col-span-1";
}

// LazyImage: shows skeleton → fade-in on load
function LazyImage({ src, alt, className, style }) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} style={{ position: "relative", overflow: "hidden", ...style }}>
      {/* Skeleton shimmer */}
      {!loaded && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(110deg, #111 30%, #1a1a1a 50%, #111 70%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.6s infinite",
          }}
        />
      )}
      {inView && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.5s ease",
          }}
        />
      )}
    </div>
  );
}

function GalleryThumbnail({ item, onClick }) {
  const video = isVideo(item.url);

  return (
    <div
      className="relative w-full h-full bg-[#0f0f0f] cursor-pointer overflow-hidden group rounded-xl"
      onClick={onClick}
      style={{ minHeight: 0 }}
    >
      {video ? (
        <>
          <video
            src={item.url}
            muted
            playsInline
            preload="metadata"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-black/70 border border-white/30 flex items-center justify-center backdrop-blur-sm">
              <Play size={18} className="text-white ml-0.5" />
            </div>
          </div>
        </>
      ) : (
        <LazyImage
          src={item.url}
          alt={item.titulo}
          className="w-full h-full"
          style={{ borderRadius: "0.75rem" }}
        />
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
      <div className="absolute inset-0 flex items-end justify-start p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <span className="text-white text-[10px] tracking-[0.25em] uppercase">
          {video ? "▶ Reproducir" : "Ver imagen"}
        </span>
      </div>
    </div>
  );
}

export default function GaleriaSection({ galeria }) {
  const [lightboxIdx, setLightboxIdx] = useState(null);

  const images = (galeria && galeria.length > 0)
    ? galeria.map(g => ({ url: g.imagenUrl, titulo: g.titulo }))
    : placeholders;

  return (
    <section id="galeria" className="py-20 px-4 md:px-6 bg-[#0a0a0a]">
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-12 md:mb-16"
        >
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="h-px w-12 bg-[#C9A84C]/40" />
            <span className="text-[#C9A84C]/60 text-xs tracking-[0.3em] uppercase">Nuestros Eventos</span>
            <div className="h-px w-12 bg-[#C9A84C]/40" />
          </div>
          <h2 className="text-4xl md:text-5xl font-thin text-white">Galería</h2>
        </motion.div>

        {/* MOBILE layout (< 640px): 2-column with full-width accents */}
        <div className="grid sm:hidden gap-2"
          style={{ gridTemplateColumns: "repeat(2, 1fr)", gridAutoRows: "180px" }}>
          {images.map((img, i) => {
            const span = getMobileSpan(i);
            const isFullWidth = span === "col-span-2";
            return (
              <div
                key={i}
                className={`${span} relative rounded-xl overflow-hidden cursor-pointer shadow-md shadow-black/40`}
                style={{ height: isFullWidth ? 200 : 180 }}
                onClick={() => setLightboxIdx(i)}
              >
                <GalleryThumbnail item={img} onClick={() => setLightboxIdx(i)} />
              </div>
            );
          })}
        </div>

        {/* TABLET layout (640px–1023px): 2 columns, varied heights */}
        <div className="hidden sm:grid lg:hidden gap-3"
          style={{ gridTemplateColumns: "repeat(2, 1fr)", gridAutoRows: "220px" }}>
          {images.map((img, i) => (
            <div
              key={i}
              className={`${getTabletSpan(i)} relative rounded-xl overflow-hidden cursor-pointer shadow-md shadow-black/40`}
              onClick={() => setLightboxIdx(i)}
            >
              <GalleryThumbnail item={img} onClick={() => setLightboxIdx(i)} />
            </div>
          ))}
        </div>

        {/* DESKTOP layout (≥ 1024px): 4 columns masonry */}
        <div className="hidden lg:grid gap-3"
          style={{ gridTemplateColumns: "repeat(4, 1fr)", gridAutoRows: "210px" }}>
          {images.map((img, i) => (
            <div
              key={i}
              className={`${getDesktopSpan(i)} relative rounded-xl overflow-hidden cursor-pointer shadow-lg shadow-black/50 hover:shadow-2xl hover:shadow-black/70 hover:-translate-y-1 transition-all duration-300`}
              onClick={() => setLightboxIdx(i)}
            >
              <GalleryThumbnail item={img} onClick={() => setLightboxIdx(i)} />
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {lightboxIdx !== null && (
          <MediaViewer
            items={images}
            startIdx={lightboxIdx}
            onClose={() => setLightboxIdx(null)}
            autoPlayVideos={false}
          />
        )}
      </AnimatePresence>
    </section>
  );
}