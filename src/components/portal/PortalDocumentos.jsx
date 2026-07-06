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

  if (cargando) return <p className="text-white/25 text-sm py-10 text-center">Preparando tus documentos…</p>;

  return (
    <div className="max-w-xl mx-auto">
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
        {docs.length === 0 && (
          <div className="text-center py-10">
            <FileText size={26} className="text-[#C9A84C]/30 mx-auto mb-3" />
            <p className="text-white/40 text-sm">Aún no hay documentos por aquí.</p>
            <p className="text-white/25 text-xs mt-1">En cuanto tu coordinador suba tu cotización o contrato, los verás en este espacio.</p>
          </div>
        )}
      </div>
    </div>
  );
}
