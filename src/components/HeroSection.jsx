import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import ProximamenteCartel from "./ProximamenteCartel";

const VIDEOS = [
  { src: "/media/img/NBa3E9g.mp4", maxTime: null },
  { src: "/media/img/uykWsK9.mp4", maxTime: 3.5 },
];

function HeroVideoBg() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [visible, setVisible] = useState([true, false]);
  const videoRefs = [useRef(null), useRef(null)];
  const lockRef = useRef(false);

  const switchTo = (toIdx) => {
    if (lockRef.current) return;
    lockRef.current = true;

    const fromIdx = toIdx === 0 ? 1 : 0;
    const nextVid = videoRefs[toIdx].current;

    if (nextVid) {
      nextVid.currentTime = 0;
      nextVid.play().catch(() => {});
    }

    setVisible([toIdx === 0, toIdx === 1]);
    setActiveIdx(toIdx);

    setTimeout(() => {
      const prevVid = videoRefs[fromIdx].current;
      if (prevVid) { prevVid.pause(); prevVid.currentTime = 0; }
      lockRef.current = false;
    }, 700);
  };

  useEffect(() => {
    const v = videoRefs[0].current;
    if (v) v.play().catch(() => {});
  }, []);

  const handleTimeUpdate = (i, e) => {
    if (i !== activeIdx || lockRef.current) return;
    const { maxTime } = VIDEOS[i];
    if (maxTime !== null && e.target.currentTime >= maxTime) {
      switchTo((i + 1) % VIDEOS.length);
    }
  };

  const handleEnded = (i) => {
    if (i !== activeIdx || lockRef.current) return;
    switchTo((i + 1) % VIDEOS.length);
  };

  const videoStyle = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center center",
    transform: "scale(1.08)",
  };

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#050505" }}>
      {VIDEOS.map(({ src }, i) => (
        <video
          key={src}
          ref={videoRefs[i]}
          src={src}
          muted
          playsInline
          preload="auto"
          onTimeUpdate={(e) => handleTimeUpdate(i, e)}
          onEnded={() => handleEnded(i)}
          style={{
            ...videoStyle,
            opacity: visible[i] ? 0.72 : 0,
            transition: "opacity 0.6s ease-in-out",
            zIndex: visible[i] ? 1 : 0,
          }}
        />
      ))}
    </div>
  );
}

export default function HeroSection({
  onFormClick,
  logoUrl,
  proximamenteActivo,
  proximamenteTexto,
  proximamenteImagenUrl,
  proximamenteTitulo,
  proximamenteDescripcion,
  onProximamenteClick,
}) {
  const showAnuncio = proximamenteActivo && !!onProximamenteClick;

  return (
    <section
      id="inicio"
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#050505] py-20 md:py-24"
    >
      <HeroVideoBg />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-black/80" style={{ zIndex: 2 }} />
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" style={{ zIndex: 2 }} />
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#C9A84C]/60 to-transparent" style={{ zIndex: 3 }} />

      <div className="relative text-center px-4 sm:px-6 max-w-4xl mx-auto w-full" style={{ zIndex: 10 }}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Eyebrow con ubicación clara */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex items-center justify-center gap-3 sm:gap-4 mb-7 sm:mb-8 flex-wrap"
          >
            <div className="h-px w-12 sm:w-20 bg-gradient-to-r from-transparent to-[#C9A84C]/70" />
            <span className="inline-flex items-center gap-1.5 text-[#C9A84C]/85 text-[10px] sm:text-xs tracking-[0.32em] sm:tracking-[0.4em] uppercase font-light">
              <MapPin size={11} className="text-[#C9A84C]/70" />
              Xochimilco · CDMX
            </span>
            <div className="h-px w-12 sm:w-20 bg-gradient-to-l from-transparent to-[#C9A84C]/70" />
          </motion.div>

          {logoUrl && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex justify-center mb-6 sm:mb-8"
            >
              <img src={logoUrl} alt="Jardines Club Hípico" className="h-20 sm:h-24 md:h-32 w-auto object-contain drop-shadow-2xl" style={{ maxWidth: "260px" }} />
            </motion.div>
          )}

          {/* Marca */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-thin text-white tracking-tight leading-[0.95] mb-3 sm:mb-4 drop-shadow-2xl">
            Jardines
            <br />
            <span className="text-[#C9A84C] font-extralight">Club Hípico</span>
          </h1>

          {/* Mensaje principal: el diferenciador — todo en un solo lugar */}
          <p className="text-white text-lg sm:text-xl md:text-2xl font-light tracking-wide mt-5 sm:mt-7 max-w-2xl mx-auto leading-snug drop-shadow-lg">
            Todo tu evento en un solo lugar:{" "}
            <span className="text-[#E6C870]">8 espacios, capilla, hospedaje y área infantil</span>{" "}
            al sur de la Ciudad de México.
          </p>

          {/* Frase secundaria: tipos de evento + rango de capacidad */}
          <p className="text-white/55 text-xs sm:text-sm md:text-base font-light tracking-[0.26em] uppercase mt-3 sm:mt-4 mb-9 sm:mb-12">
            Bodas · XV años · Corporativos · Infantiles · De 30 a 600 personas
          </p>

          <div className="flex flex-col items-center gap-4">
            <motion.button
              onClick={onFormClick}
              className="skeu-gold-btn group relative inline-flex items-center gap-3 font-medium text-sm tracking-[0.2em] uppercase px-10 sm:px-12 py-4 sm:py-5 rounded-full"
              whileTap={{ scale: 0.97 }}
            >
              <span>Cotiza tu Evento</span>
              <svg className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </motion.button>
          </div>

          {/* Cartel/anuncio "Próximamente" — reemplaza al antiguo botón.
              Si está activo, el bloque de confianza va DEBAJO del cartel
              (en variante compact) para no aplastarse. Si no, va en su
              posición amplia original. */}
          {showAnuncio && (
            <div className="mt-8 sm:mt-10 px-2 sm:px-0">
              <ProximamenteCartel
                imagenUrl={proximamenteImagenUrl}
                titulo={proximamenteTitulo}
                descripcion={proximamenteDescripcion}
                textoEtiqueta={proximamenteTexto}
                onClick={onProximamenteClick}
              />
            </div>
          )}
        </motion.div>
      </div>

    </section>
  );
}