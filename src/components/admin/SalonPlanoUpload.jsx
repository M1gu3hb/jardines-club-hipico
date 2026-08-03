import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Upload, Trash2, Image as ImageIcon } from "lucide-react";

/**
 * SalonPlanoUpload — sube el plano real de un salón, que es el lienzo del editor
 * de mesas (`MesaEditor` ya lo pinta de fondo y cae a la rejilla si no hay).
 *
 * Detalles que importan:
 *  - Va al bucket `planos`, NO a `sitio`. `integrations.Core.UploadFile` está
 *    cableado a `sitio`, así que aquí se usa `base44.storage` directo.
 *  - `planos` es público, 10 MB, solo imágenes y SIN SVG (un SVG puede llevar
 *    script). Se valida en el cliente para que el rechazo del bucket no llegue
 *    como un error genérico sin explicación.
 *  - Una fila por salón: si ya existe se hace `update`, nunca un segundo insert.
 *  - Se guardan `ancho`/`alto` reales de la imagen: el editor los usa como
 *    `aspectRatio`, y las mesas se posicionan en % sobre ese lienzo. Si la
 *    proporción no coincide con la del plano, las mesas se desplazan.
 */

const BUCKET = "planos";
const MAX_BYTES = 10 * 1024 * 1024;
const MIME_OK = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/** Lee ancho/alto reales del archivo antes de subirlo. */
function medirImagen(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ ancho: img.naturalWidth, alto: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ ancho: null, alto: null });
    };
    img.src = url;
  });
}

export default function SalonPlanoUpload({ salonId, salonNombre }) {
  const [plano, setPlano] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const cargar = useCallback(() => {
    if (!salonId) { setCargando(false); return; }
    setCargando(true);
    base44.entities.SalonPlano.filter({ salonId })
      .then((r) => setPlano(r[0] || null))
      .catch(() => setError("No se pudo leer el plano actual."))
      .finally(() => setCargando(false));
  }, [salonId]);
  useEffect(() => { cargar(); }, [cargar]);

  const subir = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";              // permite reintentar el mismo archivo
    if (!file) return;
    setError(""); setOk("");

    if (!MIME_OK.includes(file.type)) {
      setError("Formato no admitido. Usa JPG, PNG, WebP o AVIF (el SVG no se acepta).");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)} MB y el máximo son 10 MB.`);
      return;
    }

    setSubiendo(true);
    try {
      const { ancho, alto } = await medirImagen(file);
      const { path } = await base44.storage.upload(BUCKET, file, salonId);
      const url = base44.storage.publicUrl(BUCKET, path);

      const datos = { salonId, imagenPlanoUrl: url, ancho, alto };
      // Una fila por salón: si ya hay, se actualiza.
      const guardado = plano
        ? await base44.entities.SalonPlano.update(plano.id, datos)
        : await base44.entities.SalonPlano.create(datos);
      setPlano(guardado || { ...datos, id: plano?.id });
      setOk(plano ? "Plano reemplazado ✓" : "Plano subido ✓");
    } catch (err) {
      setError(err?.message || "No se pudo subir el plano.");
    } finally {
      setSubiendo(false);
    }
  };

  const quitar = async () => {
    if (!plano) return;
    setError(""); setOk("");
    setSubiendo(true);
    try {
      // Se borra la fila, no el objeto del bucket: el editor cae solo a la
      // rejilla placeholder. Dejar el archivo permite recuperarlo si fue un
      // error, y `planos` tiene el listado cerrado.
      await base44.entities.SalonPlano.delete(plano.id);
      setPlano(null);
      setOk("Plano quitado ✓");
    } catch (err) {
      setError(err?.message || "No se pudo quitar el plano.");
    } finally {
      setSubiendo(false);
    }
  };

  if (!salonId) {
    return (
      <p className="text-white/30 text-xs">
        Guarda el salón primero y vuelve a abrirlo para subir su plano.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-white/40 text-xs uppercase tracking-wider">
          Plano del salón{salonNombre ? ` · ${salonNombre}` : ""}
        </span>
        {cargando && <Loader2 size={12} className="animate-spin text-white/30" />}
      </div>

      {plano?.imagenPlanoUrl ? (
        <div className="flex items-start gap-4">
          <img
            src={plano.imagenPlanoUrl}
            alt={`Plano de ${salonNombre || "el salón"}`}
            className="w-40 h-28 object-cover border border-white/10 rounded"
          />
          <div className="flex-1 space-y-2">
            <p className="text-white/40 text-xs">
              {plano.ancho && plano.alto
                ? `${plano.ancho} × ${plano.alto} px`
                : "Sin medidas registradas"}
              {" · "}es el lienzo del editor de mesas
            </p>
            <div className="flex items-center gap-2">
              <label className="skeu-dark-btn px-3 py-1.5 text-xs cursor-pointer inline-flex items-center gap-1.5">
                {subiendo ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                Reemplazar
                <input type="file" accept={MIME_OK.join(",")} onChange={subir} disabled={subiendo} className="hidden" />
              </label>
              <button
                onClick={quitar}
                disabled={subiendo}
                className="px-3 py-1.5 text-xs text-white/30 hover:text-red-400 transition-colors inline-flex items-center gap-1.5 disabled:opacity-40"
              >
                <Trash2 size={11} /> Quitar
              </button>
            </div>
          </div>
        </div>
      ) : (
        !cargando && (
          <label className="flex items-center gap-2 px-4 py-3 border border-dashed border-white/10 text-white/40 hover:text-white/60 hover:border-white/20 text-xs cursor-pointer transition-colors">
            {subiendo ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />}
            {subiendo ? "Subiendo…" : "Subir plano (JPG, PNG, WebP o AVIF · máx. 10 MB)"}
            <input type="file" accept={MIME_OK.join(",")} onChange={subir} disabled={subiendo} className="hidden" />
          </label>
        )
      )}

      {error && <p className="text-red-400/90 text-xs">{error}</p>}
      {ok && <p className="text-green-400/80 text-xs">{ok}</p>}
    </div>
  );
}
