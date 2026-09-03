import { Link } from 'react-router-dom';
import { ShieldCheck, FileText, Target, Database, KeyRound, RefreshCw } from 'lucide-react';
import Pagina from '@/components/navegacion/Pagina';
import BloqueTexto from '@/components/navegacion/BloqueTexto';
import {
  RESPONSABLE, QUE_RECABAMOS, PARA_QUE, DONDE_VIVEN, TUS_DERECHOS, CAMBIOS, ACTUALIZADO,
} from '@/data/textos-aviso-privacidad';

/**
 * /aviso-de-privacidad — el documento que el formulario obligaba a aceptar y que no existía.
 *
 * ── El bug, medido ──────────────────────────────────────────────────────────
 *
 * `FormularioModal` no habilita «Enviar solicitud» hasta marcar «Acepto el aviso de privacidad».
 * Esa casilla llevaba desde siempre sin nada detrás: `/aviso-de-privacidad` devolvía **404** en
 * producción (comprobado el 2026-09-03 con una petición real, no leyendo el enrutador), la
 * etiqueta no era un enlace y el pie del sitio no lo mencionaba.
 *
 * Pedir un consentimiento informado sobre un documento que nadie puede leer es, además de
 * exposición legal, la forma más rápida de perder a la persona que sí se detiene a leer antes de
 * dar su teléfono. Y ésa suele ser la que llega decidida.
 *
 * ── Por qué esta página no lleva `noindex` ──────────────────────────────────
 *
 * `/cotizar` sí lo lleva: nadie busca «formulario de cotización» y sería contenido delgado. Un
 * aviso de privacidad es lo contrario — es una de las páginas que un buscador espera encontrar
 * en un sitio que pide datos, y su ausencia se nota. Va en el sitemap, con prioridad baja.
 *
 * ── Por qué es prosa y no una lista de artículos ────────────────────────────
 *
 * Porque la ley pide que sea COMPRENSIBLE, y el aviso de privacidad de plantilla —tres pantallas
 * de mayúsculas y referencias cruzadas a fracciones— cumple la letra y falla el propósito. Aquí
 * se dice, en el mismo tono que el resto del sitio, qué se pide, para qué, dónde acaba y cómo se
 * borra. El texto vive en `src/data/textos-aviso-privacidad.js` y ahí está anotado de dónde sale
 * cada afirmación.
 */
export default function AvisoPrivacidad() {
  return (
    <Pagina
      clave="aviso-de-privacidad"
      eyebrow="Tus datos"
      encabezado="Aviso de privacidad"
      acento="privacidad"
      entradilla="Qué te pedimos, para qué lo usamos, dónde se guarda y cómo pides que lo borremos. Sin letra chica."
    >
      <BloqueTexto
        id="responsable"
        eyebrow={<ShieldCheck size={12} />}
        titulo="Quién trata tus datos"
        texto={RESPONSABLE}
      />

      <BloqueTexto
        id="que-recabamos"
        eyebrow={<FileText size={12} />}
        titulo="Qué datos recabamos"
        texto={QUE_RECABAMOS}
      />

      <BloqueTexto
        id="para-que"
        eyebrow={<Target size={12} />}
        titulo="Para qué los usamos"
        texto={PARA_QUE}
      />

      <BloqueTexto
        id="donde-viven"
        eyebrow={<Database size={12} />}
        titulo="Dónde se guardan y cuánto tiempo"
        texto={DONDE_VIVEN}
      />

      <BloqueTexto
        id="derechos"
        eyebrow={<KeyRound size={12} />}
        titulo="Tus derechos, y cómo ejercerlos"
        texto={TUS_DERECHOS}
      />

      <BloqueTexto
        id="cambios"
        eyebrow={<RefreshCw size={12} />}
        titulo="Si esto cambia"
        texto={CAMBIOS}
      >
        {/* La fecha no es adorno: un aviso de privacidad sin fecha no permite saber si lo que
            aceptaste hace un año es lo que dice hoy. */}
        <p className="mt-8 text-xs font-light tracking-wide text-[color:var(--texto-3)]">
          Última actualización: {ACTUALIZADO}.
        </p>
        <p className="mt-3 text-sm font-light text-[color:var(--texto-3)]">
          ¿Listo para contarnos tu evento?{' '}
          <Link to="/cotizar" className="text-[#C9A84C]/85 underline underline-offset-4 hover:text-[#C9A84C]">
            Pide tu cotización
          </Link>
          .
        </p>
      </BloqueTexto>
    </Pagina>
  );
}
