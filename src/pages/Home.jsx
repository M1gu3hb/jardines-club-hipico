import { useState, useEffect } from "react";
import SplashScreen from "../components/SplashScreen";
import BandaClasesDeBaile from '@/components/anuncios/BandaClasesDeBaile';
import InformacionDeServicios from '@/components/avisos/InformacionDeServicios';
import HeroSection from "../components/HeroSection";
import CtaCotizacion from "../components/CtaCotizacion";
import FormularioModal from "../components/FormularioModal";
import ContactoSection from "../components/ContactoSection";
import ScrollAnimationSection from "../components/ScrollAnimationSection";
import Confianza from "../components/Confianza";
import ComoFunciona from "../components/ComoFunciona";
import FaqSection from "../components/FaqSection";
import { WHATSAPP } from "@/config/negocio";
import { precargarVideoHero } from "@/lib/precargaHero";
import { useConfigSitio } from "@/lib/datos";
import Cabecera from "@/lib/Cabecera";
import { rutaPorClave } from "@/rutas";
import { urlAbsoluta } from "@/config/sitio";
import QueEstasPlaneando from "../components/home/QueEstasPlaneando";
import EspaciosDestacados from "../components/home/EspaciosDestacados";
import Diferenciadores from "../components/home/Diferenciadores";
import BloqueAvisos from "../components/home/BloqueAvisos";
import ServiciosYAmenidades from "../components/home/ServiciosYAmenidades";
import GaleriaAsomo from "../components/home/GaleriaAsomo";
import VerTodo from "../components/home/VerTodo";

export default function Home() {
  // AQUÍ VIVÍA EL AUTO-REDIRECT AL PORTAL. Se retiró en la FASE 1 de la separación
  // (`docs/PLAN-INDEPENDIZACION.md` §3, acoplamiento A7).
  //
  // Empujaba al portal a cualquier visitante con sesión de cliente, y era una trampa: quien
  // quería ver la web pública no podía. Con él se va el ÚNICO uso de `@/api/authContext` en la
  // web, así que el sitio público deja de arrastrar código de autenticación — es el mayor
  // recorte de superficie del plan.
  //
  // Al portal se entra por el menú («Portal de clientes»), como a cualquier otra ruta.

  // EL SPLASH SE VE UNA VEZ Y YA.
  //
  // Palabras del dueño: «cada que regreso me sale el splash, a cada ratito. El splash es nada
  // más cuando entra, una vez nada más». Y tiene razón: una presentación que se repite deja de
  // presentar y pasa a estorbar — son tres segundos entre el visitante y lo que vino a ver,
  // cobrados otra vez en cada vuelta al inicio.
  //
  // Se recuerda en `sessionStorage` y no en `localStorage` a propósito: dura lo que dura la
  // visita. Quien vuelva mañana es, a efectos de esto, alguien que llega de nuevo.
  const [splashDone, setSplashDone] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.sessionStorage.getItem('jch:splash') === 'visto';
    } catch {
      // Navegación privada o almacenamiento bloqueado. Se enseña el splash: molesta menos que
      // reventar la portada por no poder escribir una marca.
      return false;
    }
  });
  const [tiempoAgotado, setTiempoAgotado] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [preselectedSalon, setPreselectedSalon] = useState("");

  // LAS LECTURAS PASAN POR LA CACHE COMPARTIDA, no por un `useEffect` propio.
  //
  // Dos motivos, y el segundo es el que obligó al cambio:
  //
  // 1. Estos mismos datos los quieren `/espacios`, `/galeria` y el formulario. Con un
  //    `useEffect` aquí, ir a la portada y volver los pedía otra vez cada vez.
  // 2. **Un `useEffect` NO CORRE EN EL PRERENDER.** El HTML del build salía con la portada
  //    montada pero sin un solo salón dentro, que es justo lo que el prerender existe para
  //    evitar. Con la caché, el guion siembra los datos y el render los encuentra ya puestos.
  const { data: config, isSuccess: configListo } = useConfigSitio();

  const configLoaded = configListo || tiempoAgotado;

  useEffect(() => {
    // TEMPORAL — la descarga del video del hero arranca AQUÍ, en el montaje, no
    // en el splash: el splash no aparece hasta que llega `ConfigSitio`, y esos
    // segundos también sirven para descargar. Es idempotente, así que la llamada
    // del splash no vuelve a descargar nada. Ver `src/config/heroTemporal.js`.
    precargarVideoHero();
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
    if (configLoaded) return undefined;
    const t = setTimeout(() => setTiempoAgotado(true), 2500);
    return () => clearTimeout(t);
  }, [configLoaded]);

  const openForm = (salon) => {
    setPreselectedSalon(salon || "");
    setModalOpen(true);
  };

  const def = rutaPorClave('home');

  return (
    <>
      {/* La portada tenía su `<head>` sólo en `index.html`, sin `canonical`. Al pasar por aquí
          gana el suyo propio y, sobre todo, gana el mismo tratamiento que el resto: una sola
          etiqueta de cada cosa, sin heredar nada por accidente. */}
      <Cabecera
        titulo={def.titulo}
        descripcion={def.descripcion}
        ruta="/"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'EventVenue',
          name: 'Jardines Club Hípico',
          url: urlAbsoluta('/'),
          description: def.descripcion,
          address: {
            '@type': 'PostalAddress',
            streetAddress: 'Duraznos S/N',
            addressLocality: 'Santa Inés, Xochimilco',
            addressRegion: 'Ciudad de México',
            postalCode: '16810',
            addressCountry: 'MX',
          },
        }}
      />

      {!splashDone && configLoaded && (
        <SplashScreen logoUrl={config?.logoUrl} onFinish={() => {
            setSplashDone(true);
            try {
              window.sessionStorage.setItem('jch:splash', 'visto');
            } catch {
              /* Sin almacenamiento se repetirá; no es motivo para romper nada. */
            }
          }} />
      )}

      {/* EL CONTENIDO SE PINTA SIEMPRE, TAMBIEN DEBAJO DEL SPLASH.
         *
         * Antes iba dentro de `{splashDone && (...)}`, asi que hasta que la animacion
         * terminaba NO EXISTIA NADA en el documento. Para el visitante daba igual —el splash
         * es `fixed inset-0 z-[9999]` y lo tapa todo—, pero para quien NO ejecuta JavaScript
         * la portada del sitio estaba literalmente en blanco:
         *
         *   · la vista previa de WhatsApp, Facebook y X, que no ejecutan nada
         *   · el prerender del build, que se encontraba una pagina vacia
         *
         * O sea que la pagina que mas se comparte de un recinto de eventos se compartia sin
         * nada. Ahora el splash se superpone —tapa igual, la animacion no cambia, N1 intacto—
         * y debajo hay un documento completo desde el primer byte. */}
      <div className="w-full">
          {/* LA PORTADA YA NO ES EL SITIO: ES SU PUERTA.
            *
            * Antes esta página era todo. Cada sección traía el catálogo entero y los salones se
            * abrían en un overlay sin dirección propia: imposible de compartir e invisible para
            * Google. Ahora cada sección enseña una muestra y manda a la página que tiene el
            * asunto completo, que es lo que pedía el encargo — menos información por camino y
            * mucha más disponible en total.
            *
            * El menú de anclas (`StaggeredMenu`) se retiró de aquí: la barra del sitio, que
            * gobierna las otras catorce direcciones, gobierna también ésta. Dos menús con dos
            * ideas distintas de qué es navegar era peor que perder una animación.
            *
            * El HERO no se toca (N1): los videos, la intro y la dirección artística siguen
            * exactamente como estaban. */}
          <div className="w-full min-w-0">
            <HeroSection
              onFormClick={() => openForm("")}
              logoUrl={config?.logoUrl}
            />

            {/* El anuncio de la academia, en franja fina. Va justo aquí por orden del
                dueño: después del hero y antes de las cifras. Ver `BandaClasesDeBaile`. */}
            <BandaClasesDeBaile />

            {/* LAS CIFRAS, PEGADAS AL HERO.
              *
              * Orden del dueño: *«lo de más de treinta años de experiencia, más de quinientos
              * eventos realizados, ocho espacios únicos y lo de Google, eso va justo abajo del
              * hero, arriba de los ocho espacios»*.
              *
              * Y es el sitio correcto. Quien acaba de leer la promesa del hero se pregunta lo
              * mismo siempre: «¿y estos quiénes son?». Treinta años y quinientos eventos lo
              * contestan en dos segundos, ANTES de pedirle que mire nada. Enterradas después
              * del catálogo llegaban cuando la duda ya le había hecho cerrar la pestaña. */}
            <Confianza />

            {/* EL LUGAR PRIMERO, Y LUEGO EL TIPO DE EVENTO.
              *
              * Aquí había el argumento contrario —que casi nadie llega pensando «¿dónde?» sino
              * «¿me sirve para mi boda?»— y el dueño lo corrigió: *«en el inicio me gustaría
              * que los espacios se vieran antes que los tipos de evento»*.
              *
              * Manda él, y además tiene razón sobre este negocio concreto: lo que hace distinto
              * a Jardines no es tener una página de bodas —eso lo tiene cualquiera— sino tener
              * OCHO espacios en dos hectáreas. Enseñar eso primero es enseñar el argumento, y
              * los tipos de evento se entienden mejor cuando ya se sabe dónde caben. */}
            <EspaciosDestacados />

            <QueEstasPlaneando />

            <Diferenciadores />

            <ScrollAnimationSection />

            {/* DOS INVITACIONES, no dos listas.
              *
              * Aquí había cuatro tarjetas de cada cosa y un «ver todos» que desplegaba el resto
              * ahí mismo. El dueño: «no tienen el protagonismo que deberían, cada uno tiene a
              * veces más de una imagen». Y es literal: «Montajes» tiene catorce fotos y se
              * enseñaba con una, del tamaño del trampolín.
              *
              * Desplegar treinta elementos dentro de la portada es lo peor de las dos opciones:
              * ni caben bien ahí, ni llegan a su página, donde sí tendrían sitio para lucirse. */}
            <ServiciosYAmenidades />

            <section id="como-funciona">
              <ComoFunciona />
              <div className="pb-16">
                <VerTodo a="/como-funciona">Cómo se aparta una fecha</VerTodo>
              </div>
            </section>

            <CtaCotizacion onOpenForm={openForm} />

            {/* Un corte limpio dice «esto es todo»; uno difuminado dice «hay más». */}
            <GaleriaAsomo />

            <section id="faq">
              <FaqSection />
              <div className="pb-16">
                <VerTodo a="/preguntas-frecuentes">Todas las preguntas frecuentes</VerTodo>
              </div>
            </section>

            <ContactoSection telefono={config?.telefonoContacto} correo={config?.correoAdmin} ubicacionTexto={config?.ubicacionTexto} ubicacionLinkMapa={config?.ubicacionLinkMapa} whatsappNumero={config?.whatsappNumero} />

            {/* LOS AVISOS VAN HASTA ABAJO, y lo pidió el dueño así.
              *
              * Tiene sentido: un aviso es una novedad, no la razón por la que alguien entró.
              * Puesto arriba interrumpe a quien viene a ver si su boda cabe; puesto al final lo
              * encuentra quien ya leyó todo y sigue interesado.
              *
              * Y desaparece del documento si no hay ninguno publicado: una sección de avisos
              * vacía dice que el negocio está parado. */}
            <BloqueAvisos />

            {/* Y debajo de todo, los avisos de siempre. El dueÃ±o los quiere "hasta hasta
                abajo": son condiciones de trabajo, no argumento de venta. */}
            <InformacionDeServicios texto={config?.informacionServicios} />
          </div>

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

      {/* Aquí viajaba también `correoAdmin`, y el formulario NUNCA lo aceptó: era un no-op
          silencioso. El correo del administrador lo resuelve `api/solicitud.js` en el servidor,
          que es donde tiene que estar — el navegador no necesita saberlo. */}
      <FormularioModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        preselectedSalon={preselectedSalon}
        whatsappNumero={config?.whatsappNumero}
      />

    </>
  );
}