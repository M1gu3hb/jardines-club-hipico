import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import SplashScreen from "../components/SplashScreen";
import Sidebar from "../components/Sidebar";
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

const SECTIONS = ["inicio", "salones", "servicios", "amenidades", "galeria", "contacto", "no-incluye"];

export default function Home() {
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
    Promise.all([
      base44.entities.ConfigSitio.list().then((d) => { setConfig(d[0] || {}); setConfigLoaded(true); }),
      base44.entities.Salon.filter({ activo: true }, "orden").then(setSalones),
      base44.entities.Galeria.list("-orden").then(setGaleria),
    ]);
  }, []);

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

  return (
    <>
      {!splashDone && configLoaded && (
        <SplashScreen logoUrl={config?.logoUrl} onFinish={() => setSplashDone(true)} />
      )}

      {splashDone && (
        <div className="flex min-h-screen bg-[#0a0a0a]">
          <Sidebar logoUrl={config?.logoUrl} activeSection={activeSection} />

          {/* Main content — NO overflow-x:hidden aquí (rompería sticky de la animación). El recorte horizontal se controla en html/body desde el Layout. */}
          <main className="flex-1 md:ml-[220px] pt-14 md:pt-0 transition-all duration-300 w-full min-w-0">
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
            <SalonesSection salones={salones} onSelectSalon={openForm} />
            <ScrollAnimationSection />
            <ServiciosAmenidades />
            <CtaCotizacion onOpenForm={openForm} />
            <GaleriaSection galeria={galeria} />
            <ContactoSection telefono={config?.telefonoContacto} correo={config?.correoAdmin} ubicacionTexto={config?.ubicacionTexto} ubicacionLinkMapa={config?.ubicacionLinkMapa} whatsappNumero={config?.whatsappNumero} />
            <NoIncluyeSection texto={config?.informacionServicios} />

            {/* Footer */}
            <footer className="bg-[#080808] border-t border-white/5 py-8 px-6 text-center">
              <p className="text-white/20 text-xs tracking-widest uppercase">
                © {new Date().getFullYear()} Jardines Club Hípico · Ciudad de México
              </p>
            </footer>
          </main>

          {/* Sticky WhatsApp mobile button */}
          <div className="md:hidden fixed bottom-5 right-5 z-50">
            <a
              href={`https://wa.me/${config?.whatsappNumero || "525548663656"}?text=Hola,%20me%20gustar%C3%ADa%20cotizar%20un%20evento%20en%20Jardines%20Club%20H%C3%ADpico`}
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