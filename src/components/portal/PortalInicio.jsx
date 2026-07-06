import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import {
  Calendar, MapPin, Tag, CheckCircle2, Loader2, Sparkles,
  FileText, Clock, Music, LayoutGrid, ChevronRight, Heart,
} from "lucide-react";
import { estatusColor } from "@/components/admin/eventos/_ui";
import { fechaLarga, diasFaltantes, eventoYaPaso } from "@/lib/fechas";

/** Primer nombre del cliente para el saludo (o null si no hay). */
function primerNombre(evento) {
  const n = (evento.clienteNombre || "").trim();
  return n ? n.split(/\s+/)[0] : null;
}

function MensajeCuentaRegresiva({ dias }) {
  if (dias === null) return null;
  if (dias > 1) {
    return (
      <div className="flex items-baseline justify-center gap-2">
        <span
          className="font-thin leading-none"
          style={{
            fontSize: "clamp(3rem, 9vw, 4.5rem)",
            background: "linear-gradient(180deg, #F0D98A 0%, #C9A84C 55%, #A88532 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {dias}
        </span>
        <span className="text-white/50 text-sm tracking-wide">días para tu gran día</span>
      </div>
    );
  }
  if (dias === 1) return <p className="text-[#E6C870] text-2xl font-light">¡Mañana es tu gran día!</p>;
  if (dias === 0) return <p className="text-[#E6C870] text-2xl font-light">✨ ¡Hoy es el gran día! ✨</p>;
  return null;
}

export default function PortalInicio({ evento, salon, onConfirmado, onIr }) {
  const [confirmando, setConfirmando] = useState(false);
  const [avance, setAvance] = useState(null);

  const confirmado = !!evento.confirmadoCliente;
  const nombre = primerNombre(evento);
  const dias = diasFaltantes(evento.fechaEvento);
  const yaPaso = eventoYaPaso(evento);
  const fondo = salon?.imagenPrincipal || salon?.imagenes?.[0] || null;

  // Resumen del avance de SU planeación (todo filtrado por RLS a su evento).
  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const [docs, mesas, crono, musica] = await Promise.all([
          base44.entities.Documento.filter({ eventoId: evento.id }),
          base44.entities.Mesa.filter({ eventoId: evento.id }),
          base44.entities.Cronograma.filter({ eventoId: evento.id }),
          base44.entities.Musica.filter({ eventoId: evento.id }),
        ]);
        if (activo) setAvance({ docs: docs.length, mesas: mesas.length, crono: crono.length, musica: musica.length });
      } catch {
        if (activo) setAvance(null);
      }
    })();
    return () => { activo = false; };
  }, [evento.id]);

  const confirmar = async () => {
    setConfirmando(true);
    try {
      await base44.rpc("confirmar_evento", { evt: evento.id });
      onConfirmado?.();
    } finally {
      setConfirmando(false);
    }
  };

  const pasos = [
    { id: "cronograma", label: "Cronograma", icon: Clock, count: avance?.crono, hint: "momentos" },
    { id: "musica", label: "Música", icon: Music, count: avance?.musica, hint: "canciones" },
    { id: "mesas", label: "Mesas", icon: LayoutGrid, count: avance?.mesas, hint: "mesas" },
    { id: "documentos", label: "Documentos", icon: FileText, count: avance?.docs, hint: "archivos" },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      {/* ===== Hero del evento (con la foto real de su salón) ===== */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-3xl border border-[#C9A84C]/25 mb-6"
      >
        {fondo && (
          <div className="absolute inset-0">
            <img src={fondo} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(6,6,6,0.55) 0%, rgba(6,6,6,0.82) 55%, rgba(6,6,6,0.96) 100%)" }} />
          </div>
        )}
        {!fondo && <div className="absolute inset-0 bg-gradient-to-b from-[#141009] to-[#0a0a0a]" />}

        <div className="relative px-6 py-10 sm:px-10 sm:py-12 text-center">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.6 }}
            className="portal-eyebrow mb-3"
          >
            {nombre ? `Hola, ${nombre} · ` : ""}Bienvenido a tu evento
          </motion.p>
          <h2 className="text-white text-3xl sm:text-4xl font-thin leading-tight">{evento.nombreEvento}</h2>

          {evento.fechaEvento && (
            <p className="text-white/55 text-sm mt-3 tracking-wide">{fechaLarga(evento.fechaEvento)}</p>
          )}

          <div className="flex items-center justify-center gap-3 my-5">
            <div className="h-px w-14 bg-gradient-to-r from-transparent to-[#C9A84C]/50" />
            <span className={`text-xs px-3 py-1 rounded-full ${estatusColor(evento.estatus)}`}>{evento.estatus || "Apartado"}</span>
            <div className="h-px w-14 bg-gradient-to-l from-transparent to-[#C9A84C]/50" />
          </div>

          {!yaPaso && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.45, duration: 0.6 }}>
              <MensajeCuentaRegresiva dias={dias} />
            </motion.div>
          )}

          {yaPaso && (
            <div className="flex items-center justify-center gap-2 text-[#E6C870]/90 text-sm">
              <Heart size={15} fill="currentColor" />
              Gracias por celebrar con nosotros. Fue un honor ser parte de tu historia.
            </div>
          )}
        </div>
      </motion.div>

      {/* ===== Detalles ===== */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.6 }}
        className="skeu-card p-6 mb-6"
      >
        <p className="portal-eyebrow mb-4">Los detalles</p>
        <div className="space-y-1">
          {[
            { icon: Tag, label: "Tipo de evento", valor: evento.tipoEvento },
            { icon: Calendar, label: "Fecha", valor: fechaLarga(evento.fechaEvento) },
            { icon: MapPin, label: "Tu espacio", valor: salon?.nombre },
          ].map(({ icon: Icon, label, valor }) => (
            <div key={label} className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
              <Icon size={15} className="text-[#C9A84C]/60 flex-shrink-0" />
              <span className="text-white/30 text-[11px] uppercase tracking-wider w-28 flex-shrink-0">{label}</span>
              <span className="text-white/80 text-sm">{valor || "Por definir"}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ===== Tu avance (accesos directos) ===== */}
      {!yaPaso && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.6 }}
          className="mb-6"
        >
          <p className="portal-eyebrow mb-3 text-center">Prepara tu evento</p>
          <div className="grid grid-cols-2 gap-3">
            {pasos.map((p) => (
              <button
                key={p.id}
                onClick={() => onIr?.(p.id)}
                className="skeu-card skeu-card-hover p-4 text-left group"
              >
                <div className="flex items-center justify-between">
                  <p.icon size={17} className="text-[#C9A84C]/70" />
                  <ChevronRight size={14} className="text-white/20 group-hover:text-[#C9A84C]/70 transition-colors" />
                </div>
                <p className="text-white/80 text-sm mt-3">{p.label}</p>
                <p className="text-white/30 text-xs mt-0.5">
                  {avance === null ? "…" : p.count > 0 ? `${p.count} ${p.hint}` : "Empieza aquí"}
                </p>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* ===== Confirmación ===== */}
      {!yaPaso && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.6 }}
          className="text-center pb-4"
        >
          {confirmado ? (
            <div className="skeu-card px-6 py-5 inline-flex items-center gap-3">
              <CheckCircle2 size={20} className="text-[#E6C870]" />
              <div className="text-left">
                <p className="text-white/85 text-sm">Tu evento está confirmado</p>
                <p className="text-white/35 text-xs mt-0.5">Estamos preparando todo para recibirte.</p>
              </div>
            </div>
          ) : (
            <>
              <p className="text-white/40 text-sm mb-4">¿Todo se ve bien? Confírmanos y nos ponemos en marcha.</p>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={confirmar}
                disabled={confirmando}
                className="skeu-gold-btn inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full text-sm font-medium tracking-wide disabled:opacity-50"
              >
                {confirmando ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Confirmar mi evento
              </motion.button>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}
