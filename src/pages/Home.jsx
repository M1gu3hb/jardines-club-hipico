import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import SplashScreen from "../components/SplashScreen";
import StaggeredMenu from "../components/StaggeredMenu";
import SoundToggle from "../components/SoundToggle";
import { playSound } from "../components/soundSystem";
import HeroSection from "../components/HeroSection";
import SalonesSection from "../components/SalonesSection";
import ServiciosAmenidades from "../components/ServiciosAmenidades";
import GaleriaSection from "../components/GaleriaSection";
import CtaCotizacion from "../components/CtaCotizacion";
import FormularioModal from "../components/FormularioModal";
import ContactoSection from "../components/ContactoSection";
import NoIncluyeSection from "../components/NoIncluyeSection";
import ScrollAnimationSection from "../components/ScrollAnimationSection";
import ProximamenteModal from "../components/ProximamenteModal";
import Confianza from "../components/Confianza";
import ComoFunciona from "../components/ComoFunciona";
import FaqSection from "../components/FaqSection";
import { WHATSAPP } from "@/config/negocio";
import { precargarVideoHero } from "@/lib/precargaHero";

// Orden = orden real del <main> de abajo. `como-funciona` y `faq` existen en el
// DOM desde hace tiempo pero faltaban aquí: eran dos secciones de conversión
// inalcanzables desde el menú, y el indicador de sección activa se quedaba
// pegado al pasar por ellas porque el observer no las miraba.
const SECTIONS = [
  "inicio", "salones", "servicios", "amenidades", "como-funciona",
  "galeria", "faq", "contacto", "no-incluye",
];

const MENU_ITEMS = [
  { id: "inicio", label: "Inicio" },
  { id: "salones", label: "Salones" },
  { id: "servicios", label: "Servicios" },
  { id: "amenidades", label: "Amenidades" },
  { id: "como-funciona", label: "Cómo funciona" },
  { id: "galeria", label: "Galería" },
  { id: "faq", label: "Preguntas" },
  { id: "contacto", label: "Contacto" },
  { id: "no-incluye", label: "Avisos" },
]
  // `esRuta: false` no es adorno: iguala la forma de los dos lados del `concat` de abajo,
  // que es lo que TypeScript comprueba. Y es cierto — estos items son anclas, no rutas.
  .map((i) => ({ ...i, link: `#${i.id}`, ariaLabel: `Ir a ${i.label}`, esRuta: false }))
  // Acceso al portal de clientes: SOLO dentro del menú (no visible en la página).
  //
  // DESDE LA FASE 4 EL PORTAL ES OTRA APLICACIÓN, en otro origen. La URL sale de
  // `VITE_URL_PORTAL` para que no quede escrita a mano en el código (regla R8).
  //
  // El respaldo `/portal` no es decorativo: si la variable faltara, el enlace cae en la
  // ruta vieja de este mismo sitio, que la FASE 4 convirtió en un 301 hacia el portal.
  // O sea que el peor caso es un salto de más, no un enlace roto.
  .concat([{
    id: "portal",
    label: "Portal de clientes",
    link: import.meta.env.VITE_URL_PORTAL || "/portal",
    ariaLabel: "Entrar al portal de clientes",
    esRuta: true,
  }]);

export default function Home() {
  const navigate = useNavigate();
  // AQUÍ VIVÍA EL AUTO-REDIRECT AL PORTAL. Se retiró en la FASE 1 de la separación
  // (`docs/PLAN-INDEPENDIZACION.md` §3, acoplamiento A7).
  //
  // Empujaba al portal a cualquier visitante con sesión de cliente, y era una trampa: quien
  // quería ver la web pública no podía. Con él se va el ÚNICO uso de `@/api/authContext` en la
  // web, así que el sitio público deja de arrastrar código de autenticación — es el mayor
  // recorte de superficie del plan.
  //
  // Al portal se entra por el menú («Portal de clientes»), como a cualquier otra ruta.

  const [splashDone, setSplashDone] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [config, setConfig] = useState(null);
  const [salones, setSalones] = useState([]);
  const [galeria, setGaleria] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [preselectedSalon, setPreselectedSalon] = useState("");
  const [activeSection, setActiveSection] = useState("inicio");
  const [proximamenteOpen, setProximamenteOpen] = useState(false);

  useEffect(() => {
    // TEMPORAL — la descarga del video del hero arranca AQUÍ, en el montaje, no
    // en el splash: el splash no aparece hasta que llega `ConfigSitio`, y esos
    // segundos también sirven para descargar. Es idempotente, así que la llamada
    // del splash no vuelve a descargar nada. Ver `src/config/heroTemporal.js`.
    precargarVideoHero();

    Promise.all([
      base44.entities.ConfigSitio.list().then((d) => { setConfig(d[0] || {}); setConfigLoaded(true); }),
      base44.entities.Salon.filter({ activo: true }, "orden").then(setSalones),
      base44.entities.Galeria.list().then(setGaleria),
    ]);
  }, []);

  /**
   * EL SITIO ARRANCA AUNQUE LA BASE NO CONTESTE.
   *
   * El splash solo se monta con `configLoaded`, y `splashDone` solo lo pone el splash al terminar.
   * Así que `configLoaded` gobernaba **todo** el render: si la petición de `ConfigSitio` no se
   * resolvía nunca —y `fetch` no tiene tiempo límite propio, así que un socket colgado se queda
   * colgado— el visitante se quedaba mirando un rectángulo negro indefinidamente. No un error, no
   * un spinner: nada. Los otros dos caminos (error de PostgREST, red caída) sí resuelven, porque
   * `list()` se traga el fallo y devuelve `[]`; el que mata es el que no resuelve.
   *
   * A los 2.5 s se sigue adelante con lo que haya. Eso ya no miente, porque los respaldos dejaron
   * de inventar: sin `config`, el contacto sale de `src/config/negocio.js` —los datos verificados
   * del negocio— y los salones dicen que la lista no cargó en vez de enseñar cinco inventados.
   */
  useEffect(() => {
    if (configLoaded) return;
    const t = setTimeout(() => setConfigLoaded(true), 2500);
    return () => clearTimeout(t);
  }, [configLoaded]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { threshold: 0.3 }
    );
    SECTIONS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [splashDone]);

  const openForm = (salon) => {
    setPreselectedSalon(salon || "");
    setModalOpen(true);
  };

  const scrollToSection = (item) => {
    playSound("click");
    // El item "Portal de clientes" navega a la ruta del portal.
    //
    // El `removeItem` de abajo alimentaba al auto-redirect que se retiró con A7, así que hoy no
    // lo lee nadie: `jch_ver_sitio` solo lo escribe `PortalShell` («Ver sitio»). Se conserva
    // porque R4 prohíbe retirar nada del repo actual antes de que el portal esté desplegado y
    // validado; se decide qué hacer con él cuando `PortalShell` se mude en la FASE 2.
    if (item.esRuta) {
      try { sessionStorage.removeItem("jch_ver_sitio"); } catch { /* sin storage */ }
      // Una URL absoluta es OTRA aplicación: hay que salir del router, no navegar dentro.
      // El `#entrar=` de un enlace viejo sobrevive al salto: el fragmento no viaja al
      // servidor y el navegador lo arrastra al destino.
      if (/^https?:[/][/]/.test(item.link)) { window.location.href = item.link; return; }
      navigate(item.link);
      return;
    }
    const el = document.getElementById(item.id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      {!splashDone && configLoaded && (
        <SplashScreen logoUrl={config?.logoUrl} onFinish={() => setSplashDone(true)} />
      )}

      {splashDone && (
        <div className="min-h-screen bg-[#0a0a0a]">
          <StaggeredMenu
            items={MENU_ITEMS}
            logoUrl={config?.logoUrl}
            activeId={activeSection}
            onItemClick={scrollToSection}
            headerExtra={<SoundToggle />}
          />

          {/* Main content — NO overflow-x:hidden aquí (rompería sticky de la animación). El recorte horizontal se controla en html/body desde el Layout. El menú (StaggeredMenu) es un overlay fijo, por eso ya no hay margen de sidebar. */}
          <main className="w-full min-w-0">
            <HeroSection
              onFormClick={() => openForm("")}
              logoUrl={config?.logoUrl}
              proximamenteActivo={config?.proximamenteActivo !== false}
              proximamenteTexto={config?.proximamenteTextoBoton}
              proximamenteImagenUrl={config?.proximamenteImagenUrl}
              proximamenteTitulo={config?.proximamenteTitulo}
              proximamenteDescripcion={config?.proximamenteDescripcion}
              onProximamenteClick={() => setProximamenteOpen(true)}
            />
            <Confianza />
            <SalonesSection salones={salones} onSelectSalon={openForm} />
            <ScrollAnimationSection />
            <ServiciosAmenidades />
            <ComoFunciona />
            <CtaCotizacion onOpenForm={openForm} />
            <GaleriaSection galeria={galeria} />
            <FaqSection />
            <ContactoSection telefono={config?.telefonoContacto} correo={config?.correoAdmin} ubicacionTexto={config?.ubicacionTexto} ubicacionLinkMapa={config?.ubicacionLinkMapa} whatsappNumero={config?.whatsappNumero} />
            <NoIncluyeSection texto={config?.informacionServicios} />

            {/* Footer (el acceso al portal de clientes vive en el MENÚ, no aquí) */}
            <footer className="bg-[#080808] border-t border-white/5 py-8 px-6 text-center">
              <p className="text-white/20 text-xs tracking-widest uppercase">
                © {new Date().getFullYear()} Jardines Club Hípico · Ciudad de México
              </p>
            </footer>
          </main>

          {/* Sticky WhatsApp button (móvil y escritorio) */}
          <div className="fixed bottom-5 right-5 z-50">
            <a
              href={`https://wa.me/${config?.whatsappNumero || WHATSAPP}?text=Hola,%20me%20gustar%C3%ADa%20cotizar%20un%20evento%20en%20Jardines%20Club%20H%C3%ADpico`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-14 h-14 rounded-full bg-[#25D366] flex items-center justify-center shadow-2xl shadow-green-900/40"
            >
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </a>
          </div>
        </div>
      )}

      <FormularioModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        preselectedSalon={preselectedSalon}
        correoAdmin={config?.correoAdmin}
        whatsappNumero={config?.whatsappNumero}
      />

      <ProximamenteModal
        open={proximamenteOpen}
        onClose={() => setProximamenteOpen(false)}
        imagenUrl={config?.proximamenteImagenUrl}
        titulo={config?.proximamenteTitulo}
        descripcion={config?.proximamenteDescripcion}
      />
    </>
  );
}