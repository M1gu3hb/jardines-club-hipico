import { useParams, Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Pagina from '@/components/navegacion/Pagina';
import Acordeon from '@/components/navegacion/Acordeon';
import TextoQueAparece from '@/components/animacion/TextoQueAparece';
import RecomendadosDelEvento from '@/components/eventos/RecomendadosDelEvento';
import { motion } from 'framer-motion';
import NoEncontrada from '@/pages/NoEncontrada';
import { useTipoEvento, useSalones } from '@/lib/datos';
import { construyeRuta, rutaPorClave } from '@/rutas';
import { urlAbsoluta } from '@/config/sitio';
import GaleriaEspacio from '@/components/espacios/GaleriaEspacio';

/**
 * /eventos/{slug} — la página de un tipo de evento.
 *
 * ── Es la plantilla más valiosa y hoy no la usa nadie ───────────────────────
 *
 * Estas son las páginas que capturan «salón para boda en Xochimilco», que es como busca la
 * gente de verdad. Nadie busca «Salón de los Espejos» sin conocerlo ya.
 *
 * Y hoy **ninguna se publica**, porque las seis filas de `tipos_evento` nacieron apagadas:
 * su contenido propio es de cero palabras. `useTipoEvento` solo devuelve las activas, así que
 * mientras tanto cualquier slug cae en el 404, que es lo correcto — mejor un 404 honesto que
 * una página con el texto de otra y las palabras cambiadas.
 *
 * La plantilla se construye ahora igualmente, porque el día que el dueño entregue el texto de
 * bodas y sus fotos, encender la fila en el panel publica la página entera. Sin tocar código
 * y sin esperar a nadie.
 *
 * ── La caída y el 404 no son lo mismo, y hasta ahora se veían igual ─────────
 *
 * `isError` no se encendía jamás —`runQuery` devolvía `[]` ante el error, ver
 * `src/lib/datos.js`—, así que una caída de la base terminaba aquí abajo, en `if (!tipo)`, y
 * esta página contestaba «no encontrada» a una dirección que sí existe. La lectura de tipos
 * ya es estricta, así que el aviso de abajo por fin puede aparecer.
 *
 * Y AQUÍ NO SE MIRA SI LA LISTA VINO VACÍA, al revés que en la ficha de espacio. La asimetría
 * es a propósito: cero espacios activos es imposible —son ocho— pero cero tipos de evento
 * activos es el estado NORMAL de esta tabla mientras no haya contenido propio, y en ese caso
 * el 404 es la respuesta correcta y no un síntoma de nada.
 */
export default function EventoDetalle() {
  const { slug } = useParams();
  const { data: tipo, isLoading, isError } = useTipoEvento(slug);
  const { data: salones } = useSalones();

  if (isLoading) {
    return <div className="min-h-[60vh] grid place-items-center text-sm font-light text-white/30">Cargando…</div>;
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-2xl px-5 pt-40 pb-24 text-center">
        <p className="text-sm font-light text-white/50">
          No pudimos cargar esta página ahora mismo.{' '}
          <Link to="/eventos" className="text-[#C9A84C] underline underline-offset-4">Ver los tipos de evento</Link>.
        </p>
      </div>
    );
  }

  if (!tipo) return <NoEncontrada />;

  const preguntas = Array.isArray(tipo.preguntas) ? tipo.preguntas : [];
  const galeria = Array.isArray(tipo.galeria) ? tipo.galeria : [];
  const slugsRecomendados = Array.isArray(tipo.espaciosRecomendados) ? tipo.espaciosRecomendados : [];

  // Se respeta el ORDEN de la lista guardada, no el de la tabla de salones: ese orden es un
  // criterio comercial —cuál se ofrece primero para este evento— y reordenarlo lo perdería.
  const recomendados = slugsRecomendados
    .map((s) => (salones || []).find((x) => x.slug === s))
    .filter(Boolean);

  /**
   * La imagen para compartir, cuando el tipo de evento no tiene la suya.
   *
   * Todavía no hay fotografías etiquetadas por tipo de evento —las 69 de la galería están sin
   * etiquetar— así que estas páginas no tienen foto propia. Sin ninguna, el enlace compartido
   * por WhatsApp sale como una línea de texto gris, que en la práctica es no compartirlo.
   *
   * Se usa la del PRIMER espacio recomendado. No es una foto de una boda: es una foto del
   * lugar donde se hacen, y la página la presenta como lo que es, un espacio. Enseñar el
   * recinto de verdad es honesto; buscar una foto de boda de banco de imágenes no lo sería.
   */
  const imagenCompartir = tipo.ogImage || tipo.imagenHero || recomendados[0]?.imagenPrincipal;

  const jsonLd = preguntas.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: preguntas.map((p) => ({
          '@type': 'Question',
          name: p.pregunta,
          acceptedAnswer: { '@type': 'Answer', text: p.respuesta },
        })),
      }
    : {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: tipo.nombre,
        url: urlAbsoluta(construyeRuta(rutaPorClave('evento').ruta, tipo.slug)),
      };

  return (
    <Pagina
      clave="evento"
      slug={tipo.slug}
      nombreFinal={tipo.nombre}
      titulo={tipo.seoTitle || `${tipo.nombre} en Xochimilco · Jardines Club Hípico`}
      descripcion={tipo.seoDescription || tipo.descripcionCorta}
      imagen={imagenCompartir}
      jsonLd={jsonLd}
      eyebrow="Tu evento, aquí"
      encabezado={tipo.nombre}
      entradilla={tipo.descripcionCorta}
    >
      {(tipo.imagenHero || galeria.length > 0) && (
        <GaleriaEspacio principal={tipo.imagenHero} imagenes={galeria} nombre={tipo.nombre} />
      )}

      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-14">
        <div className="grid gap-14 lg:grid-cols-[1.6fr_1fr]">
          <div className="min-w-0">
            {tipo.descripcionLarga && (
              <div className="space-y-5 text-base font-light leading-[1.85] text-white/60">
                {/* CADA PÁRRAFO ENTRA AL LLEGAR A ÉL.
                  *
                  * El dueño no quiso que se recortara el texto —«no la resumas»— pero sí que
                  * dejara de ser un muro plano. Un bloque de tres mil caracteres, todo del
                  * mismo color y apareciendo de golpe, se lee como un contrato.
                  *
                  * Entrando de uno en uno, la vista tiene dónde descansar y el texto marca un
                  * ritmo. No se acorta ni una palabra: se le da tiempo.
                  *
                  * El desfase se topa: sin tope, el párrafo doce tardaría cuatro segundos en
                  * aparecer y el visitante ya habría pasado de largo. */}
                {tipo.descripcionLarga.split(/\n\s*\n/).map((p, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.55, delay: Math.min(i * 0.05, 0.3) }}
                  >
                    {p.trim()}
                  </motion.p>
                ))}
              </div>
            )}

            {preguntas.length > 0 && (
              <section aria-labelledby="dudas" className="mt-14">
                {/* PLEGADAS, COMO EN `/preguntas-frecuentes`.
                  *
                  * Estaban todas abiertas: seis respuestas largas seguidas que empujaban el
                  * resto de la página hacia abajo y que casi nadie leía enteras. El dueño ya
                  * lo había pedido para las preguntas generales —«tener todas abiertas se
                  * siente muy invasivo»— y aquí aplica igual.
                  *
                  * `Acordeon` usa `<details>`, así que **el texto sigue en el HTML** aunque
                  * esté cerrado: Google lo lee y el buscador del navegador lo encuentra. Esa
                  * es la razón de usar `<details>` y no un panel montado con JavaScript. */}
                <TextoQueAparece
                  como="h2"
                  texto="Lo que más nos preguntan"
                  resalta="preguntan"
                  className="block text-2xl font-extralight tracking-tight text-white/95 sm:text-3xl"
                />
                <div className="mt-6 divide-y divide-white/5 border-y border-white/5">
                  {preguntas.map((p, i) => (
                    <Acordeon key={i} pregunta={p.pregunta} respuesta={p.respuesta} />
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="skeu-card rounded-2xl p-6">
              <p className="text-sm font-light leading-relaxed text-white/55">
                Dinos la fecha y cuántos son, y te decimos si está libre y cuánto sale.
              </p>
              <Link
                to={`/cotizar?evento=${encodeURIComponent(tipo.slug)}`}
                className="skeu-gold-btn mt-5 flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-xs font-medium tracking-[0.16em] uppercase text-[#1a1408]"
              >
                Cotizar {tipo.nombre.toLowerCase()}
                <ArrowRight size={13} aria-hidden="true" />
              </Link>
            </div>
          </aside>
        </div>
      </div>

      {/* LAS RECOMENDACIONES, A LO ANCHO Y NO EN LA COLUMNA ESTRECHA.
        *
        * «Dónde se hace» vivía en la barra lateral, con miniaturas de 56 px. El dueño lo dijo:
        * *«esa parte de los salones hazla más grande, está muy chiquito ese recuadro»*.
        *
        * Y tiene razón de fondo, no solo de tamaño: **es la parte que convierte**. Quien ha
        * leído hasta aquí ya sabe que su evento cabe; lo que le falta es VER dónde y con qué.
        * Enseñarlo en miniaturas de dos centímetros era enterrar el argumento en el margen.
        *
        * Ahora son dos bloques a todo el ancho, con fotografía de verdad, debajo del texto —
        * que es donde llega quien terminó de leer. */}
      <RecomendadosDelEvento tipo={tipo} espacios={recomendados} />
    </Pagina>
  );
}
