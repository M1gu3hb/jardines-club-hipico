import { Link } from 'react-router-dom';
import Pagina from '@/components/navegacion/Pagina';
import BloqueTexto from '@/components/navegacion/BloqueTexto';
import { ENTRADILLA, BLOQUES } from '@/data/textos-nosotros';
import { urlAbsoluta } from '@/config/sitio';

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

        <div className="mt-6 divide-y divide-white/5">
          {BLOQUES.map((b) => (
            <BloqueTexto key={b.id} id={b.id} titulo={b.titulo} texto={b.texto} />
          ))}
        </div>

        {/* El hueco que queda, dicho en vez de tapado. Falta el AÑO: el dueño no lo sabe, y
            poner uno aproximado en una página de historia es la mentira más fácil de detectar
            y la más cara — la lee él y ve que no es su negocio. */}
        <p className="mt-12 border-t border-white/5 pt-8 text-sm font-light leading-relaxed text-white/30">
          Nos falta un dato para esta página: el año exacto en que empezó todo. Ni el dueño lo
          tiene claro — «tiene muchísimos años», dice — y preferimos dejar el hueco antes que
          inventar una fecha.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
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
