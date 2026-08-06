import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import ProximamenteCartel from "./ProximamenteCartel";
import { HERO_TEMPORAL } from "@/config/heroTemporal";
import { isSoundEnabled, subscribeSoundEnabled } from "./soundSystem";

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

/**
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ TEMPORAL — video único del hero. Se apaga desde `src/config/heroTemporal`│
 * │ poniendo `activo: false`, y `HeroVideoBg` (arriba, intacto) vuelve solo.  │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * UN SOLO `<video>`, a pantalla completa, `object-fit: cover` — como el carrusel
 * de siempre. El archivo es vertical (576×1024) y el hero es apaisado, así que
 * en un PC se ve una franja horizontal del centro del cuadro: se recorta, y es
 * lo que se pidió («que se adaptara al fondo aunque se recorte un poco»).
 *
 * ANTES ESTABA AL REVÉS: `contain` para verlo entero, con una copia desenfocada
 * detrás rellenando los lados. Se veía como un reel centrado con marco oscuro
 * —correcto para «completo», pero no era lo buscado— así que se retiró la copia
 * y el centrado. Un solo elemento: un solo decodificador de video, también en
 * el móvil.
 */
function HeroVideoTemporal() {
  const { src, ajuste, opacidad, posicion, conAudio, volumen, umbralVisible } = HERO_TEMPORAL;
  const videoRef = useRef(null);
  const cajaRef = useRef(null);

  const [enPantalla, setEnPantalla] = useState(true);
  const [sonidoDelSitio, setSonidoDelSitio] = useState(isSoundEnabled);
  const [huboGesto, setHuboGesto] = useState(false);

  // ── 1) ARRANQUE: SIEMPRE SILENCIADO ───────────────────────────────────────
  // No es una preferencia, es la única forma de que reproduzca. Chrome, Safari y
  // Firefox bloquean el autoplay CON sonido, y lo que hacen al bloquearlo es
  // dejar el video pausado: un fotograma congelado de fondo. Silenciado siempre
  // arranca; el audio se enciende después, cuando el navegador ya lo permite.
  //
  // El atributo `autoPlay` tampoco basta cuando el elemento se monta con el
  // documento ya cargado —le pasa al carrusel de arriba, que por eso llama a
  // `play()` a mano—, y `muted` se fija por propiedad: sin eso iOS lo bloquea
  // aunque el atributo esté puesto.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    const p = v.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }, []);

  // ── 2) ¿SE ESTÁ VIENDO EL HERO? ───────────────────────────────────────────
  // Al salir de pantalla se calla. Se mide sobre el contenedor del video, no
  // sobre la ventana, para que valga igual si mañana el hero cambia de alto.
  useEffect(() => {
    const caja = cajaRef.current;
    if (!caja || typeof IntersectionObserver !== "function") return undefined;
    const obs = new IntersectionObserver(
      ([e]) => setEnPantalla(e.isIntersecting),
      { threshold: umbralVisible },
    );
    obs.observe(caja);
    return () => obs.disconnect();
  }, [umbralVisible]);

  // ── 3) EL BOTÓN DE SONIDO DEL SITIO MANDA ─────────────────────────────────
  // Ya existe uno, arriba a la derecha (`SoundToggle`), y hasta hoy solo
  // gobernaba los pitidos de la interfaz. Un video sonando mientras ese botón
  // dice «sonido desactivado» sería una contradicción que el visitante ve. De
  // paso, es el mecanismo para callarlo — que es lo que exige la WCAG 1.4.2
  // cuando algo suena solo durante más de tres segundos.
  // La limpieza se envuelve en vez de devolver `subscribeSoundEnabled` directo: lo que devuelve
  // es `() => _listeners.delete(fn)`, que da un booleano, y React espera que el destructor no
  // devuelva nada. Funcionaba igual, pero el typecheck lo cuenta — y la línea base no debe subir.
  useEffect(() => {
    const desuscribir = subscribeSoundEnabled((v) => setSonidoDelSitio(v));
    return () => { desuscribir(); };
  }, []);

  // ── 4) EL PRIMER GESTO DESBLOQUEA EL AUDIO ────────────────────────────────
  // Tras un toque, un clic o una tecla, el navegador ya deja quitar el silencio.
  // `once` en los tres: solo interesa el primero.
  useEffect(() => {
    if (huboGesto || typeof window === "undefined") return undefined;
    const marca = () => setHuboGesto(true);
    const eventos = ["pointerdown", "keydown", "touchstart", "wheel"];
    for (const ev of eventos) window.addEventListener(ev, marca, { once: true, passive: true });
    return () => { for (const ev of eventos) window.removeEventListener(ev, marca); };
  }, [huboGesto]);

  // ── 5) LA REGLA, EN UN SOLO SITIO ─────────────────────────────────────────
  // Suena si: el video lleva audio, el sitio tiene el sonido activado, y el hero
  // está a la vista. Cualquiera de las tres en falso, silencio.
  //
  // Y si el navegador RECHAZA reproducir con sonido, se vuelve a silenciar y se
  // reproduce igual. Esa rama es la que impide el peor resultado posible: un
  // hero con un fotograma congelado por haber insistido en el audio.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const debeSonar = conAudio && sonidoDelSitio && enPantalla;

    v.volume = volumen;
    v.muted = !debeSonar;

    const p = v.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => {
        v.muted = true;
        const p2 = v.play();
        if (p2 && typeof p2.catch === "function") p2.catch(() => {});
      });
    }
  }, [conAudio, sonidoDelSitio, enPantalla, volumen, huboGesto]);

  return (
    <div ref={cajaRef} style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#050505" }}>
      <video
        ref={videoRef}
        src={src}
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
        controls={false}
        disablePictureInPicture
        tabIndex={-1}
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: ajuste,
          // Qué parte del cuadro sobrevive al recorte. `center` deja la franja
          // del medio, que es donde está la acción de este video.
          objectPosition: posicion,
          opacity: opacidad,
          zIndex: 1,
          pointerEvents: "none",
        }}
      />
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
      {/* TEMPORAL: mientras `HERO_TEMPORAL.activo` sea `true` se ve el video de
          Style Contest 2026. Con `false`, vuelve `HeroVideoBg` —los dos videos
          de siempre— sin tocar una línea de su código. */}
      {HERO_TEMPORAL.activo ? <HeroVideoTemporal /> : <HeroVideoBg />}
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