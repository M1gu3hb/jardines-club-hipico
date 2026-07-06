import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { FileText, Download, Loader2, FileSignature, ReceiptText, FileCheck2 } from "lucide-react";

const BUCKET = "clientes";

const ICONO = {
  contrato: FileSignature,
  cotizacion: ReceiptText,
  comprobante: FileCheck2,
  otro: FileText,
};

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
      <div className="space-y-3">
        {docs.map((d) => {
          const Icono = ICONO[d.tipo] || FileText;
          return (
            <div key={d.id} className="skeu-card skeu-card-hover flex items-center gap-4 px-4 py-4">
              <div className="w-12 h-12 rounded-xl bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center flex-shrink-0">
                <Icono size={20} className="text-[#C9A84C]/80" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white/85 text-sm font-medium truncate">{d.titulo}</p>
                <p className="text-white/30 text-xs capitalize mt-0.5">{d.tipo}</p>
              </div>
              <button onClick={() => abrir(d)} disabled={abriendo === d.id}
                className="skeu-dark-btn flex items-center gap-1.5 text-xs px-4 py-2 rounded-full flex-shrink-0 disabled:opacity-50">
                {abriendo === d.id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Ver
              </button>
            </div>
          );
        })}
        {docs.length === 0 && (
          <div className="text-center py-14">
            <div className="w-16 h-16 rounded-full bg-[#C9A84C]/8 border border-[#C9A84C]/15 flex items-center justify-center mx-auto mb-4">
              <FileText size={26} className="text-[#C9A84C]/40" />
            </div>
            <p className="text-white/45 text-sm">Aún no hay documentos por aquí.</p>
            <p className="text-white/25 text-xs mt-1.5 max-w-xs mx-auto">En cuanto tu coordinador suba tu cotización o contrato, lo verás en este espacio y te avisaremos.</p>
          </div>
        )}
      </div>
    </div>
  );
}
