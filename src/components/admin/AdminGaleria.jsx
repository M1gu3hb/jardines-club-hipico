import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, Trash2, Loader2, Plus, Play, Link } from "lucide-react";
import { isVideo } from "../MediaViewer";

export default function AdminGaleria() {
  const [galeria, setGaleria] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTitulo, setVideoTitulo] = useState("");
  const [addingUrl, setAddingUrl] = useState(false);

  const load = () => base44.entities.Galeria.list("-orden").then(setGaleria);
  useEffect(() => { load(); }, []);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Galeria.create({ imagenUrl: file_url, titulo: file.name.split(".")[0], orden: Date.now() });
    }
    setUploading(false);
    load();
  };

  const handleAddUrl = async () => {
    if (!videoUrl.trim()) return;
    await base44.entities.Galeria.create({ imagenUrl: videoUrl.trim(), titulo: videoTitulo || "Elemento", orden: Date.now() });
    setVideoUrl("");
    setVideoTitulo("");
    setAddingUrl(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este elemento?")) return;
    await base44.entities.Galeria.delete(id);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white text-2xl font-thin">Galería</h2>
          <p className="text-white/30 text-sm mt-1">Fotos y videos de eventos para el sitio público.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setAddingUrl(v => !v)}
            className="flex items-center gap-2 border border-[#C9A84C]/40 text-[#C9A84C] px-4 py-2.5 text-sm hover:bg-[#C9A84C]/10 transition-all"
          >
            <Link size={14} /> URL de video
          </button>
          <label className="flex items-center gap-2 bg-[#C9A84C] text-[#0a0a0a] px-5 py-2.5 text-sm font-medium hover:bg-[#d4b558] transition-all cursor-pointer">
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Subir fotos
            <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleUpload} />
          </label>
        </div>
      </div>

      {addingUrl && (
        <div className="bg-[#111] border border-[#C9A84C]/20 p-4 mb-4 space-y-3">
          <p className="text-white/40 text-xs uppercase tracking-wider">Agregar video por URL</p>
          <input
            value={videoTitulo}
            onChange={e => setVideoTitulo(e.target.value)}
            placeholder="Título (opcional)"
            className="w-full bg-white/5 border border-white/10 text-white/80 text-sm px-3 py-2 outline-none focus:border-[#C9A84C]/40"
          />
          <input
            value={videoUrl}
            onChange={e => setVideoUrl(e.target.value)}
            placeholder="URL del video (.mp4, .webm...)"
            className="w-full bg-white/5 border border-white/10 text-white/80 text-sm px-3 py-2 outline-none focus:border-[#C9A84C]/40"
          />
          <div className="flex gap-2">
            <button onClick={handleAddUrl} disabled={!videoUrl.trim()}
              className="bg-[#C9A84C] text-black px-4 py-2 text-xs font-medium hover:bg-[#d4b558] disabled:opacity-40">
              Agregar
            </button>
            <button onClick={() => setAddingUrl(false)} className="border border-white/10 text-white/40 px-4 py-2 text-xs hover:text-white/60">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {galeria.map((item) => (
          <div key={item.id} className="group relative aspect-square">
            {isVideo(item.imagenUrl) ? (
              <div className="w-full h-full bg-[#111] flex items-center justify-center relative overflow-hidden">
                <video src={item.imagenUrl} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Play size={20} className="text-white/60" />
                </div>
              </div>
            ) : (
              <img src={item.imagenUrl} alt={item.titulo} className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button onClick={() => handleDelete(item.id)} className="bg-red-500/80 hover:bg-red-500 p-2 rounded">
                <Trash2 size={14} className="text-white" />
              </button>
            </div>
            <p className="text-white/30 text-xs mt-1 truncate">{item.titulo}</p>
          </div>
        ))}
        {!uploading && galeria.length === 0 && (
          <div className="col-span-full text-center py-16">
            <p className="text-white/20 text-sm">Aún no hay elementos en la galería.</p>
          </div>
        )}
      </div>
    </div>
  );
}