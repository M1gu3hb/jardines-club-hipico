import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { FileText, Download, Loader2 } from "lucide-react";

const BUCKET = "clientes";

export default function PortalDocumentos({ eventoId }) {
  const [docs, setDocs] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [abriendo, setAbriendo] = useState(null);

  useEffect(() => {
    base44.entities.Documento.filter({ eventoId }, "-created_date")
      .then(setDocs)
      .finally(() => setCargando(false));
  }, [eventoId]);

  const abrir = async (doc) => {
    setAbriendo(doc.id);
    try {
      const url = await base44.storage.signedUrl(BUCKET, doc.archivoUrl, 3600);
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setAbriendo(null);
    }
  };

  if (cargando) return <p className="text-white/25 text-sm py-10 text-center">Cargando…</p>;

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-white text-xl font-thin mb-1">Documentos</h2>
      <p className="text-white/30 text-sm mb-6">Cotizaciones, contratos y comprobantes de tu evento.</p>
      <div className="space-y-2">
        {docs.map((d) => (
          <div key={d.id} className="flex items-center gap-3 skeu-card px-4 py-3.5">
            <FileText size={18} className="text-[#C9A84C]/60 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-white/80 text-sm truncate">{d.titulo}</p>
              <p className="text-white/25 text-xs capitalize">{d.tipo}</p>
            </div>
            <button onClick={() => abrir(d)} disabled={abriendo === d.id}
              className="flex items-center gap-1.5 text-[#C9A84C] text-xs border border-[#C9A84C]/30 px-3 py-1.5 hover:bg-[#C9A84C]/10 transition-all disabled:opacity-50">
              {abriendo === d.id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Ver
            </button>
          </div>
        ))}
        {docs.length === 0 && <p className="text-white/20 text-sm py-8 text-center">Aún no hay documentos disponibles.</p>}
      </div>
    </div>
  );
}
