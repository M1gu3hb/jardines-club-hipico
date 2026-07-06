import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Star, Loader2, CheckCircle2, ClipboardCheck, ExternalLink } from "lucide-react";
import { GOOGLE_RESENA_URL } from "@/config/portal";
import { notificarDueno } from "@/lib/notificar";

export default function PortalResena({ evento }) {
  const [estrellas, setEstrellas] = useState(5);
  const [hover, setHover] = useState(0);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");
  const [copiado, setCopiado] = useState(false);

  const autor = evento.clienteNombre || evento.nombreEvento || "Cliente";

  const abrirGoogle = () => {
    navigator.clipboard?.writeText(texto).then(() => setCopiado(true)).catch(() => {});
    window.open(GOOGLE_RESENA_URL, "_blank", "noopener,noreferrer");
  };

  const enviar = async () => {
    if (!texto.trim()) { setError("Escribe unas palabras sobre tu evento."); return; }
    setError("");
    setEnviando(true);
    // Abrir Google + copiar dentro del gesto del usuario (evita bloqueo de popup).
    abrirGoogle();
    try {
      await base44.entities.Resena.create({
        eventoId: evento.id,
        autor,
        texto: texto.trim(),
        estrellas,
        evento: evento.tipoEvento || evento.nombreEvento || null,
        // `aprobada` la fuerza a false el trigger de moderación (la revisa el admin).
      });
      setEnviado(true);
      // Avisar al dueño (dashboard + correo) que hay reseña por moderar.
      notificarDueno({
        eventoId: evento.id,
        tipo: "resena",
        titulo: `⭐ Nueva reseña de ${autor} (${estrellas}★)`,
        detalle: `"${texto.trim().slice(0, 180)}" — pendiente de aprobar en el panel para aparecer en el sitio.`,
      });
    } catch (e) {
      setError("No se pudo guardar tu reseña: " + e.message);
    } finally {
      setEnviando(false);
    }
  };

  if (enviado) {
    return (
      <div className="max-w-md mx-auto text-center">
        <CheckCircle2 size={40} className="text-[#C9A84C] mx-auto mb-4" />
        <h2 className="text-white text-2xl font-thin">¡Gracias por tu reseña!</h2>
        <p className="text-white/50 text-sm mt-3 leading-relaxed">
          {copiado ? "Copiamos tu reseña al portapapeles. " : ""}
          En la pestaña de Google solo <span className="text-[#C9A84C]">pega</span> el texto, elige tus estrellas
          y presiona <span className="text-[#C9A84C]">Publicar</span>. (Google no permite publicarla
          automáticamente por nosotros.)
        </p>
        <button onClick={abrirGoogle}
          className="mt-6 inline-flex items-center gap-2 border border-[#C9A84C]/40 text-[#C9A84C] px-5 py-2.5 text-sm hover:bg-[#C9A84C]/10 transition-all">
          <ExternalLink size={15} /> Abrir Google de nuevo
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="h-px w-10 bg-gradient-to-r from-transparent to-[#C9A84C]/50" />
          <h2 className="text-white text-2xl font-thin">¿Cómo estuvo tu evento?</h2>
          <div className="h-px w-10 bg-gradient-to-l from-transparent to-[#C9A84C]/50" />
        </div>
        <p className="text-white/40 text-sm">Fue un honor recibirte. Cuéntanos cómo lo viviste: tu reseña ilumina el camino de quienes vienen.</p>
      </div>

      <div className="skeu-card p-6">
        <div className="flex justify-center gap-2.5 mb-5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setEstrellas(n)}
              className="transition-transform hover:scale-110 active:scale-95"
              aria-label={`${n} estrellas`}
            >
              <Star size={32} className={(hover || estrellas) >= n ? "text-[#E6C870]" : "text-white/15"}
                fill={(hover || estrellas) >= n ? "#E6C870" : "transparent"} />
            </button>
          ))}
        </div>

        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={5}
          placeholder="Cuéntanos tu experiencia en Jardines Club Hípico…"
          className="w-full bg-white/5 border border-white/10 rounded-xl text-white/80 text-sm px-4 py-3 outline-none focus:border-[#C9A84C]/40 resize-none" />

        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}

        <button onClick={enviar} disabled={enviando}
          className="skeu-gold-btn w-full mt-4 flex items-center justify-center gap-2 py-3.5 rounded-full text-sm font-medium disabled:opacity-50">
          {enviando ? <Loader2 size={15} className="animate-spin" /> : <ClipboardCheck size={16} />}
          Guardar y publicar en Google
        </button>
        <p className="text-white/25 text-xs text-center mt-3">
          Al enviar, copiamos tu reseña y abrimos Google para que solo la pegues y publiques.
        </p>
      </div>
    </div>
  );
}
