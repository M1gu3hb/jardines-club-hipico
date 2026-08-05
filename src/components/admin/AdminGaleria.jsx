import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Trash2, Loader2, Plus, Play, Link, AlertTriangle } from "lucide-react";
import { isVideo } from "../MediaViewer";
import { useCarga } from "@/lib/useCarga";
import { Estado, EsqueletoTarjetas } from "@/components/ui/Estado";
import { BUCKET_MIME } from "@/lib/catalogos";

/**
 * El siguiente `orden` de la galería.
 *
 * ANTES ERA `Date.now()`. `jardines.galeria.orden` es `integer` (int4, máximo 2 147 483 647) y
 * `Date.now()` va por 1.75×10¹², ochocientas veces por encima. Comprobado ejecutándolo contra la
 * base: `22003 integer out of range`. **Ninguna subida a la galería ha funcionado nunca** desde
 * que el sitio pasó a Supabase; las 69 filas que hay son las del seed, con orden 1…69.
 *
 * Y como `handleUpload` no tenía `catch`, el `throw` se llevaba por delante el
 * `setUploading(false)` de la línea siguiente: spinner eterno, ni un mensaje.
 *
 * La lista se pide por `-orden`, así que lo nuevo va arriba con el máximo + 1.
 */
const siguienteOrden = (galeria) =>
  galeria.reduce((max, g) => Math.max(max, Number(g.orden) || 0), 0) + 1;

export default function AdminGaleria() {
  const [uploading, setUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTitulo, setVideoTitulo] = useState("");
  const [addingUrl, setAddingUrl] = useState(false);
  const [errorAccion, setErrorAccion] = useState("");

  const { datos, cargando, error, recargar } = useCarga(
    () => base44.entities.Galeria.listEstricto("-orden"), []);
  const galeria = datos || [];
  const load = recargar;

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setErrorAccion("");
    setUploading(true);
    let orden = siguienteOrden(galeria);
    try {
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        await base44.entities.Galeria.create({ imagenUrl: file_url, titulo: file.name.split(".")[0], orden });
        orden += 1;
      }
    } catch (err) {
      setErrorAccion(`No se pudo subir: ${err?.message || "error desconocido"}`);
    } finally {
      // En `finally`: si algo falla a la mitad, el spinner se apaga igual y lo que SÍ subió se ve.
      setUploading(false);
      load();
    }
  };

  const handleAddUrl = async () => {
    if (!videoUrl.trim()) return;
    setErrorAccion("");
    try {
      await base44.entities.Galeria.create({
        imagenUrl: videoUrl.trim(), titulo: videoTitulo || "Elemento", orden: siguienteOrden(galeria),
      });
      setVideoUrl("");
      setVideoTitulo("");
      setAddingUrl(false);
    } catch (err) {
      setErrorAccion(`No se pudo agregar: ${err?.message || "error desconocido"}`);
    }
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este elemento?")) return;
    setErrorAccion("");
    try {
      await base44.entities.Galeria.deleteEstricto(id);
    } catch (err) {
      setErrorAccion(`No se pudo eliminar: ${err?.message || "error desconocido"}`);
    }
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
            {/* `accept` derivado del bucket, no escrito a mano. Decía `image/*,video/*`, e
                `image/*` incluye HEIC —lo que sale de un iPhone—, SVG y BMP, que `sitio` no
                admite: el selector dejaba elegir justo lo que Storage iba a rechazar. */}
            <input type="file" accept={BUCKET_MIME.sitio.join(",")} multiple className="hidden" onChange={handleUpload} />
          </label>
        </div>
      </div>

      {errorAccion && (
        <p className="text-red-400/90 text-xs border border-red-400/20 bg-red-400/5 px-3 py-2 rounded flex items-start gap-2 mb-4">
          <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />{errorAccion}
        </p>
      )}

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

      <Estado
        cargando={cargando} error={error} onReintentar={recargar}
        vacio={!uploading && galeria.length === 0}
        mensajeVacio="Aún no hay elementos en la galería."
        mensajeError="No se pudo cargar la galería."
        esqueleto={<EsqueletoTarjetas n={8} alto="aspect-square h-auto" columnas="grid-cols-2 md:grid-cols-3 lg:grid-cols-4" />}
      >
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
      </div>
      </Estado>
    </div>
  );
}