import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, Loader2, Trash2, Download, FileText } from "lucide-react";

const BUCKET = "clientes";
const TIPOS = ["contrato", "cotizacion", "comprobante", "otro"];

export default function EventoDocumentos({ eventoId }) {
  const [docs, setDocs] = useState([]);
  const [subiendo, setSubiendo] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("contrato");
  const [error, setError] = useState("");

  const cargar = () => base44.entities.Documento.filter({ eventoId }, "-created_date").then(setDocs);
  useEffect(() => { cargar(); }, [eventoId]);

  const subir = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError("");
    setSubiendo(true);
    try {
      const { path } = await base44.storage.upload(BUCKET, file, `evento-${eventoId}`);
      await base44.entities.Documento.create({
        eventoId,
        titulo: titulo.trim() || file.name,
        tipo,
        archivoUrl: path,
      });
      setTitulo("");
      cargar();
    } catch (err) {
      setError("No se pudo subir: " + err.message);
    } finally {
      setSubiendo(false);
      e.target.value = "";
    }
  };

  const descargar = async (doc) => {
    try {
      const url = await base44.storage.signedUrl(BUCKET, doc.archivoUrl, 3600);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError("No se pudo abrir: " + err.message);
    }
  };

  const borrar = async (doc) => {
    if (!confirm("¿Eliminar este documento?")) return;
    try { await base44.storage.remove(BUCKET, doc.archivoUrl); } catch { /* el archivo pudo no existir */ }
    await base44.entities.Documento.delete(doc.id);
    cargar();
  };

  return (
    <div className="max-w-2xl">
      <div className="bg-[#111] border border-white/5 p-5 mb-5">
        <p className="text-white/50 text-sm mb-3">Subir documento (PDF de contrato, cotización, comprobante…)</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título (opcional)"
            className="bg-white/5 border border-white/10 text-white/70 text-sm px-4 py-2.5 outline-none focus:border-[#C9A84C]/40" />
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}
            className="bg-white/5 border border-white/10 text-white/70 text-sm px-4 py-2.5 outline-none focus:border-[#C9A84C]/40">
            {TIPOS.map((t) => <option key={t} value={t} className="bg-[#111] capitalize">{t}</option>)}
          </select>
        </div>
        <label className="inline-flex items-center gap-2 border border-dashed border-white/20 hover:border-[#C9A84C]/40 px-4 py-2.5 cursor-pointer text-white/50 text-sm transition-all">
          {subiendo ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {subiendo ? "Subiendo…" : "Elegir archivo"}
          <input type="file" accept=".pdf,image/*" className="hidden" onChange={subir} disabled={subiendo} />
        </label>
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      </div>

      <div className="space-y-2">
        {docs.map((d) => (
          <div key={d.id} className="flex items-center gap-3 bg-[#111] border border-white/5 px-4 py-3">
            <FileText size={16} className="text-[#C9A84C]/60 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-white/75 text-sm truncate">{d.titulo}</p>
              <p className="text-white/25 text-xs capitalize">{d.tipo}</p>
            </div>
            <button onClick={() => descargar(d)} className="text-white/30 hover:text-[#C9A84C] transition-colors p-1.5"><Download size={15} /></button>
            <button onClick={() => borrar(d)} className="text-white/30 hover:text-red-400 transition-colors p-1.5"><Trash2 size={14} /></button>
          </div>
        ))}
        {docs.length === 0 && <p className="text-white/20 text-sm py-6 text-center">Sin documentos.</p>}
      </div>
    </div>
  );
}
