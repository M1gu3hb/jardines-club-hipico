import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { EsqueletoTexto, AvisoCargando } from '@/components/ui/Esqueleto';
import InformacionDeServicios from '@/components/avisos/InformacionDeServicios';
import Condiciones from '@/components/avisos/Condiciones';
import Pagina from '@/components/navegacion/Pagina';
import { useConfigSitio, useAnuncios } from '@/lib/datos';

/**
 * /avisos — el tablero de novedades del recinto.
 *
 * ── Por qué existe una página entera para esto ──────────────────────────────
 *
 * Porque un negocio que solo tiene páginas de catálogo parece congelado. Un aviso reciente
 * —una fecha nueva, un servicio que se abre, un cambio de horario— dice que alguien está
 * detrás, y eso pesa cuando alguien está decidiendo a quién confiarle su boda.
 *
 * ── Lo que NO hace, y es lo que la mantiene honesta ─────────────────────────
 *
 * No filtra por `activo` ni por vigencia. **No hace falta**: el filtro vive en la política de
 * lectura de la base (`sec_33` y `sec_34`), así que un borrador o un aviso caducado ni
 * siquiera llegan hasta aquí. No es que se descarten al pintarlos: es que `anon` no puede
 * leerlos, ni consultando la tabla a mano.
 *
 * Eso quita de en medio el fallo clásico: olvidar el filtro en una de las dos pantallas que
 * leen lo mismo y publicar un borrador sin enterarse.
 *
 * ── Y cuando no hay nada ────────────────────────────────────────────────────
 *
 * La página lo dice con naturalidad y ofrece a dónde ir. Lo que NO hace es fingir que hay
 * contenido. Y `rutas.js` la marca con `soloSiHay: 'anuncios'`, así que mientras esté vacía
 * tampoco entra en el `sitemap.xml`: existe, pero no se anuncia.
 */
export default function Avisos() {
  const { data: anuncios, isLoading, isError } = useAnuncios();
  const { data: config, isLoading: cargaConfig } = useConfigSitio();
  const hay = (anuncios || []).length > 0;
  const hayInformacion = Boolean((config?.informacionServicios || '').trim());

  return (
    <Pagina
      clave="avisos"
      eyebrow="Lo que está pasando"
      encabezado="Avisos"
      entradilla="Novedades del recinto, fechas que conviene tener a mano y lo que vamos abriendo."
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8 pb-20">
        {isLoading && (
          <>
            <AvisoCargando que="los avisos" />
            <EsqueletoTexto lineas={4} className="py-10" />
          </>
        )}

        {isError && (
          <p className="py-20 text-center text-sm font-light text-white/50">
            No pudimos cargar los avisos ahora mismo.
          </p>
        )}

        {/* LA CONTRADICCIÓN QUE HABÍA AQUÍ.
          *
          * Esta página decía «ahora mismo no hay avisos» y tres centímetros más abajo enseñaba
          * un aviso: la información de servicios. El dueño lo cazó de inmediato: *«te estás
          * contradiciendo… cuando el aviso es eso»*.
          *
          * El cartel de vacío solo tiene sentido si la página está VACÍA DE VERDAD. Mientras
          * haya información de servicios publicada, no lo está — así que el cartel solo aparece
          * cuando no hay ni anuncios ni información. */}
        {!isLoading && !isError && !hay && !hayInformacion && <SinAvisos />}

        {hay && (
          <div className="space-y-8">
            {anuncios.map((a, i) => (
              <Aviso key={a.id} aviso={a} invertido={i % 2 === 1} />
            ))}
          </div>
        )}
      </div>

      {/* LOS AVISOS QUE SIEMPRE ESTUVIERON.
        *
        * La tabla `anuncios` es para novedades con fecha âuna apertura, un eventoâ y hoy estÃ¡
        * vacÃ­a. Pero el sitio TENÃA avisos desde siempre, en otro sitio y con otro nombre:
        * `config_sitio.informacion_servicios`. Al rehacer la portada se perdieron.
        *
        * Van aquÃ­ porque es literalmente su pÃ¡gina, y asÃ­ `/avisos` deja de poder salir vacÃ­a. */}
      <InformacionDeServicios texto={config?.informacionServicios} cargando={cargaConfig} />

      <Condiciones />

    </Pagina>
  );
}

/**
 * Un aviso, a lo grande.
 *
 * La composición alterna el lado de la imagen. No es un capricho: una columna de tarjetas
 * idénticas hace que el ojo deje de mirarlas a partir de la tercera, y aquí cada aviso es una
 * cosa distinta que merece leerse.
 */
function Aviso({ aviso, invertido }) {
  const fecha = aviso.desde ? new Date(aviso.desde) : null;

  return (
    <article
      className={[
        'skeu-card overflow-hidden rounded-3xl',
        aviso.imagenUrl ? 'grid lg:grid-cols-2' : '',
        aviso.destacado ? 'ring-1 ring-[#C9A84C]/25' : '',
      ].join(' ')}
    >
      {aviso.imagenUrl && (
        <div className={`relative aspect-[16/10] lg:aspect-auto lg:min-h-[22rem] bg-black/40 ${invertido ? 'lg:order-2' : ''}`}>
          <img
            src={aviso.imagenUrl}
            alt={aviso.titulo}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-black/40" />
        </div>
      )}

      <div className="flex flex-col justify-center p-8 sm:p-12">
        {aviso.destacado && (
          <span className="mb-4 inline-flex w-fit rounded-full border border-[#C9A84C]/40 px-3 py-1 text-[9px] font-light tracking-[0.2em] uppercase text-[#C9A84C]">
            Destacado
          </span>
        )}

        <h2 className="text-2xl sm:text-4xl font-extralight leading-tight tracking-tight text-white/95">
          {aviso.titulo}
        </h2>

        {aviso.resumen && (
          <p className="mt-4 text-base font-light leading-relaxed text-white/55">{aviso.resumen}</p>
        )}

        {aviso.cuerpo && (
          <div className="mt-5 space-y-3 text-sm font-light leading-[1.8] text-white/45">
            {aviso.cuerpo.split(/\n\s*\n/).map((p, i) => (
              <p key={i}>{p.trim()}</p>
            ))}
          </div>
        )}

        {fecha && (
          <p className="mt-6 flex items-center gap-2 text-xs font-light text-white/35">
            <CalendarDays size={13} className="text-[#C9A84C]/50" aria-hidden="true" />
            {fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        )}

        {aviso.enlaceUrl && aviso.enlaceTexto && (
          <EnlaceDelAviso url={aviso.enlaceUrl} texto={aviso.enlaceTexto} />
        )}
      </div>
    </article>
  );
}

/**
 * El enlace de un aviso puede apuntar dentro o fuera del sitio, y se tratan distinto.
 *
 * Uno interno tiene que usar el enrutador —si no, recarga la página entera y se pierde la
 * navegación—, y uno externo necesita `rel="noopener noreferrer"`, porque el destino lo
 * escribe quien carga el aviso desde el panel y no hay motivo para darle acceso a
 * `window.opener`.
 */
function EnlaceDelAviso({ url, texto }) {
  const interno = url.startsWith('/');
  const clases =
    'skeu-gold-btn mt-7 inline-flex w-fit items-center gap-2 rounded-full px-7 py-3.5 text-xs font-medium tracking-[0.16em] uppercase text-[#1a1408]';

  if (interno) {
    return (
      <Link to={url} className={clases}>
        {texto}
        <ArrowRight size={13} aria-hidden="true" />
      </Link>
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={clases}>
      {texto}
      <ArrowRight size={13} aria-hidden="true" />
    </a>
  );
}

function SinAvisos() {
  return (
    <div className="rounded-3xl border border-dashed border-white/10 px-8 py-20 text-center">
      <p className="text-lg font-light text-white/55">Ahora mismo no hay avisos.</p>
      <p className="mt-3 mx-auto max-w-md text-sm font-light leading-relaxed text-white/35">
        Cuando abramos algo nuevo o haya fechas que convenga tener a mano, aparecerá aquí.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          to="/espacios"
          className="skeu-dark-btn rounded-full px-7 py-3.5 text-xs font-medium tracking-[0.16em] uppercase"
        >
          Ver los espacios
        </Link>
        <Link
          to="/cotizar"
          className="skeu-gold-btn rounded-full px-7 py-3.5 text-xs font-medium tracking-[0.16em] uppercase text-[#1a1408]"
        >
          Cotizar mi evento
        </Link>
      </div>
    </div>
  );
}
