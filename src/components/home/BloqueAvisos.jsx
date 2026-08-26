import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useAnuncios } from '@/lib/datos';
import Foto from '@/components/ui/Foto';

/**
 * BloqueAvisos — las novedades, en la portada.
 *
 * ── DESAPARECE SI NO HAY NADA, y eso es la mitad del diseño ─────────────────
 *
 * Una sección de avisos vacía en la portada es peor que no tenerla: deja un hueco con un
 * título y un mensaje de «no hay nada por ahora», que le dice al visitante que el negocio está
 * parado. Aquí, si no hay ningún anuncio publicado, la sección no existe en el documento.
 *
 * Y no hace falta filtrar nada para conseguirlo: **la política de lectura de la base ya solo
 * devuelve lo publicado y vigente** (`sec_33` y `sec_34`). Si la lista viene vacía es porque de
 * verdad no hay nada que enseñar.
 *
 * ── Solo los destacados ─────────────────────────────────────────────────────
 *
 * La portada enseña los marcados como destacados; el resto vive en `/avisos`. Sin esa
 * distinción, el quinto aviso del mes empujaría el resto de la portada hacia abajo.
 */
export default function BloqueAvisos() {
  const { data: anuncios } = useAnuncios();
  const destacados = (anuncios || []).filter((a) => a.destacado).slice(0, 2);

  if (destacados.length === 0) return null;

  return (
    <section
      aria-labelledby="avisos-portada"
      className="w-full border-y border-[#C9A84C]/10 bg-[#0c0b08] px-4 py-14 sm:px-6"
    >
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-8 flex items-baseline justify-between gap-4">
          <h2
            id="avisos-portada"
            className="text-[10px] font-light tracking-[0.3em] uppercase text-[#C9A84C]/75"
          >
            Novedades
          </h2>
          <Link
            to="/avisos"
            className="inline-flex items-center gap-2 text-[10px] font-light tracking-[0.2em] uppercase text-white/45 transition-colors hover:text-[#C9A84C]"
          >
            Ver todos
            <ArrowRight size={12} aria-hidden="true" />
          </Link>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2">
          {destacados.map((a, i) => (
            <motion.li
              key={a.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <Link
                to="/avisos"
                className="group skeu-card skeu-card-hover flex h-full gap-5 overflow-hidden rounded-2xl p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/60"
              >
                {a.imagenUrl && (
                  <Foto
                    url={a.imagenUrl}
                    sizes="112px"
                    claseContenedor="h-24 w-24 shrink-0 rounded-xl sm:h-28 sm:w-28"
                    className="h-full w-full object-cover"
                  />
                )}
                <span className="min-w-0 self-center">
                  <span className="block text-lg font-light text-white/90 transition-colors group-hover:text-[#C9A84C]">
                    {a.titulo}
                  </span>
                  {a.resumen && (
                    <span className="mt-1.5 block line-clamp-3 text-sm font-light leading-relaxed text-white/40">
                      {a.resumen}
                    </span>
                  )}
                </span>
              </Link>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
