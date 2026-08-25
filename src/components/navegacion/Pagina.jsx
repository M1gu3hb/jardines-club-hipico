import { motion } from 'framer-motion';
import Cabecera from '@/lib/Cabecera';
import Migas from './Migas';
import { rutaPorClave, construyeRuta } from '@/rutas';
import TextoQueAparece from '@/components/animacion/TextoQueAparece';

/**
 * Pagina — el envoltorio que comparten todas las páginas interiores.
 *
 * Reúne en un solo sitio las cuatro cosas que TODA página necesita y que, repetidas a mano
 * página por página, se acabarían olvidando en alguna: el `<head>` propio, las migas, el
 * encabezado y el ancho de lectura.
 *
 * La que más se olvida es el `<head>`. Una página sin `title` ni `description` propios no
 * está rota —se ve perfecta— pero en resultados de búsqueda sale con el título de la portada
 * y compitiendo consigo misma. Al pasar por aquí, eso no puede ocurrir sin querer.
 *
 * `titulo` y `descripcion` caen a los de `rutas.js` si la página no los pasa. Las fichas de
 * espacio y de evento sí los pasan, porque los suyos salen de la base.
 *
 * Las props van declaradas con sus opcionales marcadas: sin esto, TypeScript deduce que TODAS
 * son obligatorias por estar desestructuradas, y cada página que no pase `slug` —o sea, casi
 * todas— sale como un error de tipos. Eran nueve errores del mismo origen.
 *
 * @param {Object} props
 * @param {string}  props.clave          Clave de la ruta en `rutas.js`.
 * @param {string}  [props.slug]         Para rutas dinámicas: sustituye a `:slug`.
 * @param {string}  [props.nombreFinal]  Nombre real de la ficha, para la última miga.
 * @param {string}  [props.titulo]
 * @param {string}  [props.descripcion]
 * @param {string}  [props.imagen]       Para `og:image`. Relativa o absoluta.
 * @param {Object}  [props.jsonLd]       Datos estructurados de esta página.
 * @param {string}  [props.eyebrow]      El sobretítulo pequeño del encabezado.
 * @param {string}  [props.encabezado]   Si falta, no se pinta cabecera y manda la página.
 * @param {string}  [props.entradilla]
 * @param {any}     [props.children]
 * @param {string}  [props.acento] Trozo del titular que se pinta en serif dorada.
 */
export default function Pagina({
  clave,
  slug,
  nombreFinal,
  titulo,
  descripcion,
  imagen,
  jsonLd,
  eyebrow,
  encabezado,
  entradilla,
  children,
  // El trozo del titular que se pinta en serif dorada. Ver `TextoQueAparece`.
  acento = '',
}) {
  const def = rutaPorClave(clave);
  const ruta = slug ? construyeRuta(def.ruta, slug) : def.ruta;

  return (
    <>
      <Cabecera
        titulo={titulo || def.titulo || def.nombre}
        descripcion={descripcion || def.descripcion}
        ruta={ruta}
        imagen={imagen}
        noindex={def.indexable === false}
        jsonLd={jsonLd}
      />

      <Migas clave={clave} nombreFinal={nombreFinal} />

      {encabezado && (
        <header className="mx-auto max-w-7xl px-5 sm:px-8 pt-8 pb-12 sm:pt-12 sm:pb-16">
          {eyebrow && (
            <div className="flex items-center gap-4">
              <span className="h-px w-10 bg-gradient-to-r from-[#C9A84C]/60 to-transparent" />
              <span className="text-[#C9A84C]/75 text-[10px] font-light tracking-[0.32em] uppercase">
                {eyebrow}
              </span>
            </div>
          )}

          {/* El salto de escala entre el `eyebrow` y el título es lo que crea jerarquía sin
              tener que gritar con negritas: 10 px frente a 60. */}
          {/* El título entra palabra por palabra. El texto está en el HTML desde el primer
              render —solo cambia su opacidad y su posición—, así que el prerender lo escribe
              entero y Google lo lee igual. Ver `TextoQueAparece`. */}
          <TextoQueAparece
            como="h1"
            texto={encabezado}
            resalta={acento}
            className="mt-5 block text-4xl sm:text-6xl lg:text-7xl font-extralight tracking-tight text-white/95 leading-[0.95]"
          />

          {entradilla && (
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-7 max-w-2xl text-base sm:text-lg font-light leading-relaxed text-white/50"
            >
              {entradilla}
            </motion.p>
          )}
        </header>
      )}

      {children}
    </>
  );
}
