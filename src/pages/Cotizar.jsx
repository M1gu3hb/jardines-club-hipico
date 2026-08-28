import { useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { MessageCircle, Phone, Clock, ShieldCheck } from 'lucide-react';
import Pagina from '@/components/navegacion/Pagina';
import FormularioModal from '@/components/FormularioModal';
import { useSalones, useConfigSitio } from '@/lib/datos';
import { WHATSAPP, TELEFONO } from '@/config/negocio';

/**
 * /cotizar — el formulario, con su contexto alrededor.
 *
 * ── Por qué se reutiliza el modal en vez de escribir un formulario de página ─
 *
 * Porque `FormularioModal` **es el camino que da de comer**: valida, llama a la RPC
 * `solicitud_crear`, recibe el folio que genera el servidor y dispara el correo. Está probado
 * y funciona. Reescribirlo para que se vea mejor en una página sería arriesgar el único flujo
 * de ingresos del sitio a cambio de estética.
 *
 * Así que la página aporta lo que al modal le falta —el contexto de por qué merece la pena
 * rellenarlo, y las vías alternativas para quien no quiere formularios— y el modal sigue
 * siendo el mismo componente, sin tocar una línea.
 *
 * ── El espacio y el tipo de evento viajan en la URL ─────────────────────────
 *
 * `?espacio=salon-encanto` o `?evento=bodas`. Quien llega desde la ficha de un espacio no
 * tiene que volver a elegirlo, y la solicitud llega al correo con el contexto ya puesto — que
 * es justo lo que convierte «me interesa» en «vi el Salón Encanto, somos 230, en octubre».
 *
 * El formulario espera el NOMBRE del salón, no su slug, así que aquí se traduce.
 */
export default function Cotizar() {
  const [params] = useSearchParams();
  const { data: salones } = useSalones();
  const { data: config } = useConfigSitio();

  const slugEspacio = params.get('espacio');
  const slugEvento = params.get('evento');

  const nombreEspacio = useMemo(() => {
    if (!slugEspacio || !salones) return '';
    return salones.find((s) => s.slug === slugEspacio)?.nombre || '';
  }, [slugEspacio, salones]);

  const waHref = `https://wa.me/${config?.whatsappNumero || WHATSAPP}?text=${encodeURIComponent(
    nombreEspacio
      ? `Hola, vi ${nombreEspacio} en su sitio y me interesa cotizar un evento.`
      : 'Hola, me interesa cotizar un evento en Jardines Club Hípico.',
  )}`;

  return (
    <Pagina
      clave="cotizar"
      eyebrow="Sin compromiso"
      encabezado="Cuéntanos qué estás planeando"
      acento="planeando"
      entradilla={
        nombreEspacio
          ? `Te interesa ${nombreEspacio}. Dinos la fecha y cuántos son, y te decimos si está libre.`
          : 'Cuantos más datos nos des, más exacta será la respuesta. Nada de esto te compromete a nada.'
      }
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 pb-20">
        {/* EL FORMULARIO ES LA PÁGINA, NO UNA VENTANA ENCIMA DE ELLA.
          *
          * Antes esta página existía, sí, pero solo para abrir un modal: el contenido de
          * debajo quedaba tapado por un fondo oscuro y el formulario, dentro de una caja
          * estrecha con su propia barra de desplazamiento.
          *
          * El dueño pidió lo contrario: *«que sea tal cual un formulario así en grande, una
          * página con todas las preguntas… pero igual por pasos»*. Y tiene sentido: quien
          * llega aquí YA decidió cotizar. Ponerle una ventana delante es meter una puerta
          * donde ya no hace falta ninguna.
          *
          * Los pasos se conservan. Lo que se va es el marco. */}
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">

          <div>
            <FormularioModal
              enPagina
              open
              onClose={() => {}}
              preselectedSalon={nombreEspacio}
              whatsappNumero={config?.whatsappNumero || WHATSAPP}
              tipoEventoSugerido={slugEvento || undefined}
            />
          </div>

          <div className="space-y-10">

          <div className="skeu-card rounded-2xl p-8">
            <h2 className="text-xl font-light text-white/90">Qué pasa cuando lo envías</h2>

            <ol className="mt-6 space-y-6">
              <Paso n="01" titulo="Te contestamos con una propuesta">
                No una plantilla: los espacios que le quedan bien a tu número de invitados, con
                lo que incluye cada uno.
              </Paso>
              <Paso n="02" titulo="Te invitamos a ver el lugar">
                Un recinto se decide viéndolo. Las fotos ayudan, pero caminar el jardín es otra
                cosa.
              </Paso>
              <Paso n="03" titulo="Apartas tu fecha">
                Solo cuando estés seguro. Hasta entonces no hay nada firmado.
              </Paso>
            </ol>


            <ul className="mt-8 space-y-3 border-t border-white/5 pt-6">
              <Garantia icono={Clock}>Contestamos el mismo día en horario de oficina.</Garantia>
              <Garantia icono={ShieldCheck}>
                Tus datos se usan para responderte y nada más. No se comparten.
              </Garantia>
            </ul>
          </div>

          <aside>
            <div className="skeu-card rounded-2xl p-7">
              <h2 className="text-[10px] font-light tracking-[0.3em] uppercase text-[#C9A84C]/75">
                ¿Prefieres hablar?
              </h2>
              <p className="mt-3 text-sm font-light leading-relaxed text-[color:var(--texto-3)]">
                Hay quien no quiere llenar formularios, y se entiende. Escríbenos o llámanos
                directo.
              </p>

              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="skeu-dark-btn mt-5 flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-xs font-medium tracking-[0.14em] uppercase"
              >
                <MessageCircle size={14} aria-hidden="true" />
                WhatsApp
              </a>

              <a
                href={`tel:${TELEFONO.replace(/[^\d+]/g, '')}`}
                className="mt-3 flex items-center justify-center gap-2 rounded-full border border-white/10 px-6 py-3.5 text-xs font-light tracking-[0.14em] uppercase text-white/60 transition-colors hover:border-[#C9A84C]/30 hover:text-white"
              >
                <Phone size={14} aria-hidden="true" />
                {TELEFONO}
              </a>
            </div>

            <p className="mt-6 px-2 text-xs font-light leading-relaxed text-white/30">
              ¿Todavía no sabes qué espacio quieres?{' '}
              <Link to="/espacios" className="text-[#C9A84C]/80 underline underline-offset-4">
                Míralos primero
              </Link>{' '}
              — el formulario te espera.
            </p>
          </aside>
          </div>
        </div>
      </div>
    </Pagina>
  );
}

function Paso({ n, titulo, children }) {
  return (
    <li className="flex gap-5">
      <span className="text-[#C9A84C]/40 text-xs font-light tabular-nums pt-1">{n}</span>
      <span>
        <span className="block text-sm font-normal text-white/85">{titulo}</span>
        <span className="mt-1.5 block text-sm font-light leading-relaxed text-[color:var(--texto-3)]">
          {children}
        </span>
      </span>
    </li>
  );
}

function Garantia({ icono: Icono, children }) {
  return (
    <li className="flex items-start gap-3 text-xs font-light leading-relaxed text-white/40">
      <Icono size={13} className="mt-0.5 shrink-0 text-[#C9A84C]/50" aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}
