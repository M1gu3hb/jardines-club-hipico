import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, Loader2, Trash2, Download, FileText, Send, Check, AlertTriangle } from "lucide-react";
import { DOCUMENTO_TIPOS, BUCKET_MIME, BUCKET_MAX_BYTES } from "@/lib/catalogos";
import { EsqueletoFilas } from "@/components/ui/Estado";

const BUCKET = "clientes";

/**
 * Traduce el fallo a algo que el dueño pueda accionar. Antes se enseñaba
 * `err.message` crudo: leer `violates check constraint "documentos_tipo_check"`
 * no le dice a nadie qué hacer.
 */
function mensajeDeError(e, accion) {
  const m = String(e?.message || "");
  if (/documentos_tipo_check|check constraint/i.test(m)) {
    return "Ese tipo de documento no lo admite la base. Es un fallo del panel, no tuyo: avisa a soporte.";
  }
  if (/mime|content type|not allowed/i.test(m)) {
    return `Ese formato no se admite. Usa PDF, JPG, PNG, WebP o AVIF (las fotos HEIC del iPhone hay que convertirlas).`;
  }
  if (/payload too large|exceeded the maximum|size/i.test(m)) {
    return "El archivo pesa demasiado. El máximo son 20 MB.";
  }
  if (/permission denied|42501|row-level security/i.test(m)) {
    return "Tu cuenta no tiene permiso para esto. Comprueba que entraste como administrador.";
  }
  if (/failed to fetch|networkerror|load failed/i.test(m)) {
    return "No hay conexión con el servidor. Reinténtalo en un momento.";
  }
  return `No se pudo ${accion}. Reinténtalo, y si sigue fallando avisa a soporte.`;
}

export default function EventoDocumentos({ eventoId }) {
  const [docs, setDocs] = useState(null); // null = todavía no se sabe
  const [subiendo, setSubiendo] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("contrato");
  const [error, setError] = useState("");
  const [borrando, setBorrando] = useState("");
  const [avisando, setAvisando] = useState(null); // id del doc cuyo aviso se envía
  const [avisados, setAvisados] = useState({});   // id → correo al que se envió

  // Aviso al cliente por correo (plantilla dorada): "tu cotización está lista".
  const avisar = async (doc) => {
    setError("");
    setAvisando(doc.id);
    try {
      // Solo viaja el id: el servidor relee el documento, comprueba que pertenece
      // a este evento y toma de ahí el nombre. El navegador ya no dicta el
      // contenido del correo que sale hacia el cliente.
      const r = await base44.functions.correoCliente({
        tipo: "cotizacion",
        eventoId,
        documentoId: doc.id,
      });
      setAvisados((a) => ({ ...a, [doc.id]: r.enviadoA }));
    } catch (e) {
      console.error("[EventoDocumentos] avisar", e?.message);
      setError(mensajeDeError(e, "avisar al cliente"));
    } finally {
      setAvisando(null);
    }
  };

  const cargar = () =>
    base44.entities.Documento.filterEstricto({ eventoId }, "-created_date")
      .then(setDocs)
      .catch(() => {
        // Se deja `docs` como está: si la recarga tras subir un archivo falla, borrar la lista
        // haría creer que se perdieron los documentos que sí están.
        setError("No se pudieron cargar los documentos. Recarga la página.");
      });
  useEffect(() => { cargar(); }, [eventoId]);

  const subir = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";              // permite reintentar el mismo archivo
    if (!file) return;
    setError("");

    // Se comprueba ANTES de subir nada. El bucket rechaza lo que no esté en su
    // `allowed_mime_types`, así que sin esto el archivo sale hacia Storage solo para
    // que lo devuelvan con un mensaje que no dice qué formato hacía falta.
    if (file.type && !BUCKET_MIME[BUCKET].includes(file.type)) {
      setError(`«${file.name}» es ${file.type}, que no se admite. Usa PDF, JPG, PNG, WebP o AVIF.`);
      return;
    }
    if (file.size > BUCKET_MAX_BYTES[BUCKET]) {
      setError(`«${file.name}» pesa ${(file.size / 1024 / 1024).toFixed(1)} MB y el máximo son 20 MB.`);
      return;
    }

    setSubiendo(true);
    let subidoPath = null;
    try {
      // La carpeta debe ser el id del evento a secas: la política de Storage
      // autoriza al cliente comparando foldername(name)[1] contra eventos.id.
      // Con el prefijo "evento-" nunca coincidía y el cliente no podía abrir
      // sus propios documentos.
      const { path } = await base44.storage.upload(BUCKET, file, eventoId);
      subidoPath = path;
      await base44.entities.Documento.create({
        eventoId,
        titulo: titulo.trim() || file.name,
        tipo,
        archivoUrl: path,
      });

      // `create` del shim inserta sin `.select()`, así que no distingue "el INSERT falló"
      // de "cuajó y se perdió la respuesta" (J-02). Se confirma releyendo.
      const frescos = await base44.entities.Documento.filterEstricto({ eventoId }, "-created_date");
      if (!frescos.some((d) => d.archivoUrl === path)) {
        throw new Error("El archivo se subió pero no quedó registrado.");
      }
      subidoPath = null;              // ya está referenciado por una fila
      setTitulo("");
      setDocs(frescos);
    } catch (err) {
      console.error("[EventoDocumentos] subir", err?.message);
      // COMPENSACIÓN: si la fila no quedó, el archivo ya está en el bucket y nadie lo
      // referencia. Antes se quedaba ahí para siempre — y con el tipo "comprobante"
      // eso pasaba en CADA intento.
      if (subidoPath) {
        try {
          const { borrado } = await base44.storage.remove(BUCKET, subidoPath);
          // La Storage API responde 200 con lista vacía si una policy lo deniega.
          if (!borrado) console.error("[EventoDocumentos] huérfano no limpiado:", subidoPath);
        } catch (e2) {
          console.error("[EventoDocumentos] no se pudo limpiar el huérfano:", e2?.message);
        }
      }
      setError(mensajeDeError(err, "subir el documento"));
    } finally {
      setSubiendo(false);
    }
  };

  const descargar = async (doc) => {
    try {
      const url = await base44.storage.signedUrl(BUCKET, doc.archivoUrl, 3600);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("[EventoDocumentos] descargar", err?.message);
      setError(mensajeDeError(err, "abrir el documento"));
    }
  };

  /**
   * Borra el documento. Mismo criterio que `SalonPlanoUpload` (5A): **primero la fila, y el
   * archivo solo con confirmación negativa**.
   *
   * Antes hacía lo contrario y con dos fallos mudos: `storage.remove` dentro de un
   * `catch {}` vacío —que además nunca se ejecutaría, porque la Storage API responde 200
   * con lista vacía cuando una policy deniega— y `Documento.delete`, que devuelve
   * `{success:true}` pase lo que pase (J-02). Un borrado rechazado por RLS decía "listo"
   * y se llevaba el archivo por delante.
   */
  const borrar = async (doc) => {
    if (!confirm(`¿Eliminar «${doc.titulo}»? El archivo se borra y no se puede recuperar.`)) return;
    setError(""); setBorrando(doc.id);
    try {
      await base44.entities.Documento.delete(doc.id);

      // Confirmar que la fila se fue ANTES de tocar el bucket.
      const frescos = await base44.entities.Documento.filterEstricto({ eventoId }, "-created_date");
      if (frescos.some((d) => d.id === doc.id)) {
        throw new Error("La base no aceptó el borrado (¿permisos?). El documento sigue ahí.");
      }

      // Confirmado que no está: ahora sí el archivo.
      const { borrado } = await base44.storage.remove(BUCKET, doc.archivoUrl);
      setDocs(frescos);
      if (!borrado) {
        setError(
          "El documento se quitó de la lista, pero el archivo pudo quedarse en el almacenamiento. " +
          "Avisa a soporte con el nombre del documento.",
        );
      }
    } catch (err) {
      console.error("[EventoDocumentos] borrar", err?.message);
      setError(mensajeDeError(err, "eliminar el documento"));
      await cargar();               // la lista vuelve al estado REAL de la base
    } finally {
      setBorrando("");
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="bg-[#111] border border-white/5 p-5 mb-5">
        <p className="text-white/50 text-sm mb-3">Subir documento (PDF o imagen: contrato, cotización…)</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título (opcional)"
            className="bg-white/5 border border-white/10 text-white/70 text-sm px-4 py-2.5 outline-none focus:border-[#C9A84C]/40" />
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}
            className="bg-white/5 border border-white/10 text-white/70 text-sm px-4 py-2.5 outline-none focus:border-[#C9A84C]/40">
            {DOCUMENTO_TIPOS.map((t) => <option key={t} value={t} className="bg-[#111] capitalize">{t}</option>)}
          </select>
        </div>
        <label className="inline-flex items-center gap-2 border border-dashed border-white/20 hover:border-[#C9A84C]/40 px-4 py-2.5 cursor-pointer text-white/50 text-sm transition-all">
          {subiendo ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {subiendo ? "Subiendo…" : "Elegir archivo"}
          <input type="file" accept={BUCKET_MIME[BUCKET].join(",")} className="hidden" onChange={subir} disabled={subiendo} />
        </label>
        {error && (
          <p className="text-red-400/90 text-xs mt-2 border border-red-400/20 bg-red-400/5 px-3 py-2 rounded flex items-start gap-2">
            <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />{error}
          </p>
        )}
      </div>

      <div className="space-y-2">
        {docs === null && !error && <EsqueletoFilas filas={2} alto="h-14" />}
        {(docs || []).map((d) => (
          <div key={d.id} className="flex items-center gap-3 bg-[#111] border border-white/5 px-4 py-3">
            <FileText size={16} className="text-[#C9A84C]/60 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-white/75 text-sm truncate">{d.titulo}</p>
              <p className="text-white/25 text-xs capitalize">
                {d.tipo}
                {avisados[d.id] && <span className="text-green-400/70 normal-case"> · avisado a {avisados[d.id]}</span>}
              </p>
            </div>
            {avisados[d.id] ? (
              <span className="flex items-center gap-1 text-green-400/70 text-xs px-2"><Check size={13} /> Enviado</span>
            ) : (
              <button onClick={() => avisar(d)} disabled={!!avisando}
                title="Avisar al cliente por correo que este documento está listo"
                className="flex items-center gap-1.5 text-[#C9A84C]/80 hover:text-[#C9A84C] text-xs border border-[#C9A84C]/30 hover:border-[#C9A84C]/60 px-2.5 py-1.5 rounded-full transition-all disabled:opacity-50">
                {avisando === d.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Avisar
              </button>
            )}
            <button onClick={() => descargar(d)} className="text-white/30 hover:text-[#C9A84C] transition-colors p-1.5"><Download size={15} /></button>
            <button onClick={() => borrar(d)} disabled={!!borrando}
              className="text-white/30 hover:text-red-400 transition-colors p-1.5 disabled:opacity-40">
              {borrando === d.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
          </div>
        ))}
        {docs !== null && docs.length === 0 && <p className="text-white/20 text-sm py-6 text-center">Sin documentos.</p>}
      </div>
    </div>
  );
}
