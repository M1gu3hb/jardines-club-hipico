/* ══════════════════════════════════════════════════════════════════════════════
 * APARCADA — no está enrutada. 2026-08-25.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * El dueño la retiró del sitio: *«la de nosotros quítala, porque pusiste mucha información
 * que sí es, pero como que no me gusta que esto esté en línea. Ya después yo te diré si la
 * agregas y cómo, y te diré bien, bien, bien, cómo la vendemos»*.
 *
 * NO SE BORRA el archivo porque la decisión no es «esto está mal» sino «esto lo cuento yo,
 * cuando toque». Son ~570 palabras salidas de la entrevista —el club ecuestre, el picadero,
 * el negocio familiar— y volver a redactarlas costaría lo mismo que la primera vez.
 *
 * `/nosotros` responde hoy con un 301 a la portada (`vercel.json`), así que ningún enlace
 * viejo se cae. Para revivirla: devolver su entrada a `src/rutas.js` y a `ArbolDeRutas.jsx`,
 * y quitar esa redirección.
 *
 * Ojo: al no estar enrutada, ni el `lint` ni los contratos la recorren. Si algo de lo que
 * importa cambia de nombre, este archivo se entera el día que se reactive.
 * ══════════════════════════════════════════════════════════════════════════════ */
import { Link } from 'react-router-dom';
import Pagina from '@/components/navegacion/Pagina';
import BloqueTexto from '@/components/navegacion/BloqueTexto';
import { ENTRADILLA, BLOQUES } from '@/data/textos-nosotros';
import { urlAbsoluta } from '@/config/sitio';
import { useSalones } from '@/lib/datos';
import { medidasDe } from '@/lib/medidas';
import PistaQueSeDibuja from '@/components/animacion/PistaQueSeDibuja';

/**
 * /nosotros — la página que NO EXISTÍA, y que la entrevista al dueño desbloqueó.
 *
 * ── Qué cambió ──────────────────────────────────────────────────────────────
 *
 * Hasta el 2026-08-24 esta página llevaba un aviso que decía, con todas sus letras, que estaba
 * a medias: no había ni un párrafo de historia real en ningún sitio y no se iba a inventar una.
 *
 * Ahora hay unas 570 palabras que solo puede contar quien conoce el lugar: **esto era un club
 * ecuestre**, el papá del dueño daba las clases de equitación, y las huellas siguen ahí — el
 * campo ovalado era la pista, el Salón Encanto era el picadero y las veinticinco caballerizas
 * siguen en pie como bodega.
 *
 * ── Por qué esta página vale más de lo que parece ───────────────────────────
 *
 * Porque explica el nombre. Hay gente que pregunta si dan shows de caballos, por el logo y por
 * el nombre, y hasta hoy nada en el sitio contestaba eso. Una duda contestada es una
 * conversación menos por WhatsApp — y de paso, es contenido que ningún directorio del sector
 * puede copiar, porque no lo sabe.
 *
 * ── Lo que le falta, dicho ──────────────────────────────────────────────────
 *
 * **Fotografías.** Una página que habla de caballerizas, de un picadero y de un campo ovalado
 * pide verlos, y las 69 fotos de la galería siguen sin etiquetar. Aun así entra en el sitemap:
 * esconder una página que contesta una duda real —«¿dan shows de caballos?»— por no tener foto
 * sería cambiar un problema por otro peor.
 *
 * Y le falta **el año**. El dueño no lo sabe, así que no se publica ninguno.
 */
export default function Nosotros() {
  const { data: salones } = useSalones();

  // Las fotos salen de los ESPACIOS, no de la galería suelta. De un espacio se sabe qué
  // enseña; de las 69 de la galería no, porque siguen sin etiquetar, y poner una al azar bajo
  // un párrafo que habla del picadero sería afirmar que eso es el picadero sin saberlo.
  //
  // Se eligen los que la historia menciona, en el orden en que los menciona: el Salón Encanto
  // (era el picadero), el de los Espejos (trae el Campo Grande) y los Jardines (el terreno).
  const MENCIONADOS = ['salon-encanto', 'salon-de-los-espejos', 'jardines'];
  const fotos = MENCIONADOS
    .map((slug) => (salones || []).find((x) => x.slug === slug))
    .filter((x) => x && x.imagenPrincipal);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'Nosotros · Jardines Club Hípico',
    url: urlAbsoluta('/nosotros'),
    about: {
      '@type': 'EventVenue',
      name: 'Jardines Club Hípico',
      description:
        'Recinto de eventos en Santa Inés, Xochimilco. Antes fue un club ecuestre donde se ' +
        'daban clases de equitación; de ahí viene el nombre.',
    },
  };

  return (
    <Pagina
      clave="nosotros"
      eyebrow="Xochimilco, Ciudad de México"
      encabezado="Antes aquí había caballos"
      entradilla="Y de eso viene el nombre. La historia explica el terreno que hoy ves, si sabes qué estás mirando."
      titulo="Nosotros: de club ecuestre a salón de eventos"
      descripcion={
        'Jardines Club Hípico fue un club ecuestre donde se daban clases de equitación. ' +
        'Un negocio familiar de más de dos hectáreas en Xochimilco, CDMX.'
      }
      jsonLd={jsonLd}
    >
      <article className="mx-auto max-w-4xl px-5 sm:px-8 pb-16">
        <div className="max-w-3xl space-y-4 text-lg font-light leading-[1.8] text-white/65">
          {ENTRADILLA.split(/\n\s*\n/).map((p, i) => (
            <p key={i}>{p.trim()}</p>
          ))}
        </div>

        {/* Una foto entre bloques rompe el muro de texto y enseña el sitio del que se está
            hablando. Va con pie que la nombra: sin pie es decoración; con pie es información. */}
        <div className="mt-6 divide-y divide-white/5">
          {BLOQUES.map((b, i) => (
            <div key={b.id}>
              <BloqueTexto id={b.id} titulo={b.titulo} texto={b.texto} />

              {/* EL PLANO DEL CLUB, justo debajo del párrafo que lo cuenta.
                *
                * No es un adorno: es la planta real del terreno. La pista ovalada donde se daba
                * equitación, el picadero redondo que hoy ocupa el Salón Encanto, y el tubo del
                * centro al que se ataba la cuerda. Se dibuja solo al llegar a él.
                *
                * Va únicamente en el bloque de las huellas, que es donde el texto habla de esas
                * dos formas. En otro sitio sería decoración. */}
              {b.id === 'las-huellas' && (
                <div className="pb-12">
                  <PistaQueSeDibuja className="mx-auto w-full max-w-lg" />
                  <p className="mt-3 text-center text-[10px] font-light tracking-[0.2em] uppercase text-white/25">
                    La pista, el picadero y el tubo del centro
                  </p>
                </div>
              )}

              {fotos[i] && <FotoDelRecinto salon={fotos[i]} />}
            </div>
          ))}
        </div>

        {/* AQUÍ HABÍA UN AVISO DICIENDO QUE NO SABEMOS EL AÑO. Se retiró el 2026-08-25 a
            petición del dueño, y con razón.
            *
            * No publicar un dato que no se tiene es correcto. **Anunciar que no lo tienes es
            * otra cosa**: en la página que cuenta la historia del negocio, decir «ni el dueño
            * sabe cuándo empezó» suena a que nadie se acuerda de su propio origen. Resta en vez
            * de sumar honestidad.
            *
            * La fecha sigue sin publicarse. Simplemente ya no se menciona su ausencia, que es
            * lo que hace cualquier negocio con historia y sin archivo. */}

        <div className="mt-12 flex flex-col gap-3 border-t border-white/5 pt-10 sm:flex-row">
          <Link
            to="/espacios"
            className="skeu-gold-btn rounded-full px-7 py-3.5 text-center text-xs font-medium tracking-[0.16em] uppercase text-[#1a1408]"
          >
            Ver dónde estaba todo eso
          </Link>
          <Link
            to="/cotizar"
            className="skeu-dark-btn rounded-full px-7 py-3.5 text-center text-xs font-medium tracking-[0.16em] uppercase"
          >
            Agendar una visita
          </Link>
        </div>
      </article>
    </Pagina>
  );
}

/**
 * Una foto del recinto, con su nombre.
 *
 * El pie no es un adorno: sin él, la imagen bajo un párrafo que habla del picadero se lee como
 * «esto es el picadero», y no lo es — es el salón que ocupa hoy ese lugar. Nombrarla convierte
 * una insinuación falsa en un dato cierto.
 */
function FotoDelRecinto({ salon }) {
  const med = medidasDe(salon.imagenPrincipal);

  return (
    <figure className="pb-12">
      <div className="overflow-hidden rounded-2xl bg-black/40">
        <img
          src={salon.imagenPrincipal}
          alt={salon.nombre}
          loading="lazy"
          width={med ? med.ancho : undefined}
          height={med ? med.alto : undefined}
          className="w-full object-cover transition-transform duration-700 hover:scale-[1.02]"
        />
      </div>
      <figcaption className="mt-3 text-[10px] font-light tracking-[0.2em] uppercase text-white/30">
        {salon.nombre}
      </figcaption>
    </figure>
  );
}
