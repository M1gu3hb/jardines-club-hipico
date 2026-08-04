import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { BUCKET_MIME, BUCKET_MAX_BYTES } from "@/lib/catalogos";
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
 *  - Una fila por salón, **garantizado por la base** desde `sec_24`
 *    (`salon_planos_salon_id_uniq`). Antes la regla vivía solo en este estado.
 *  - Se guarda también `imagenPlanoPath`: sin él no había forma de borrar el
 *    objeto anterior, y el bucket es público — cada reemplazo dejaba un huérfano
 *    descargable para siempre.
 *  - Se guardan `ancho`/`alto` reales: el editor los usa como `aspectRatio` y las
 *    mesas se posicionan en % sobre ese lienzo. Si la proporción no coincide, las
 *    mesas se desplazan.
 *
 * Nota sobre escrituras: el shim reporta éxito aunque RLS deje la operación en 0
 * filas (misma familia que el bug del folio). Aquí no se confía: cada escritura
 * se confirma releyendo. Ver `docs/BUGS_PENDING.md` J-02.
 */

const BUCKET = "planos";
const MAX_BYTES = BUCKET_MAX_BYTES.planos;
const MIME_OK = BUCKET_MIME.planos;

/**
 * Lee ancho/alto reales del archivo. Devuelve `null` si no se pudieron medir,
 * para que el llamador **no pise** unas medidas buenas con nulos: eso haría que
 * `MesaEditor` cayera a 1000×700 y desplazaría todas las mesas.
 */
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
      resolve(null);
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
    // Reset ANTES de leer. Sin esto, al pasar de un salón a otro se seguía
    // mostrando el plano del anterior durante el fetch — con los botones
    // activos — y "Reemplazar" reasignaba la fila del salón A al salón B.
    setPlano(null);
    setError("");
    setOk("");
    if (!salonId) { setCargando(false); return; }
    setCargando(true);
    // `filterEstricto`: con `filter`, un fallo de lectura devolvía `[]` y la
    // pantalla pintaba "Subir plano" aunque la fila existiera — que es
    // justamente lo que llevaba a crear una segunda.
    base44.entities.SalonPlano.filterEstricto({ salonId })
      .then((r) => setPlano(r[0] || null))
      .catch(() => setError("No se pudo leer el plano actual. Recarga antes de subir nada."))
      .finally(() => setCargando(false));
  }, [salonId]);
  useEffect(() => { cargar(); }, [cargar]);

  /**
   * Relee la fila del salón para **decidir**, así que usa `filterEstricto`: si la
   * lectura falla, lanza en vez de devolver `[]`.
   *
   * Devuelve tres estados, no dos. Con `filter` normal, "no hay fila" y "la
   * lectura falló" eran el mismo `[]`, y eso hacía que un fallo transitorio de
   * red **después de un guardado correcto** disparara el rollback y borrase del
   * bucket el archivo que la fila acababa de referenciar.
   *
   * @returns {Promise<{estado:"si"|"no"|"desconocido", fila:any}>}
   */
  const confirmar = async () => {
    try {
      const r = await base44.entities.SalonPlano.filterEstricto({ salonId });
      return { estado: r[0] ? "si" : "no", fila: r[0] || null };
    } catch {
      return { estado: "desconocido", fila: null };
    }
  };

  /**
   * Borra un objeto del bucket. **Solo se llama cuando se sabe qué pasó con la
   * fila**: borrar sin confirmación puede destruir el archivo de una escritura
   * que sí ocurrió. Un huérfano es mucho más barato que un plano roto.
   */
  const borrarObjeto = async (path) => {
    if (!path) return;
    try {
      const { borrado } = await base44.storage.remove(BUCKET, path);
      if (!borrado) {
        // La Storage API responde 200 con lista vacía si una policy lo deniega.
        console.error("[plano] el borrado no afectó a ningún objeto (¿permisos?):", path);
      }
    } catch (e) {
      console.error("[plano] no se pudo borrar el objeto:", path, e?.message);
    }
  };

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
    let subidoPath = null;
    try {
      const medidas = await medirImagen(file);
      const { path } = await base44.storage.upload(BUCKET, file, salonId);
      subidoPath = path;
      const url = base44.storage.publicUrl(BUCKET, path);

      // Solo se escriben medidas si se pudieron leer: nunca `null` sobre buenas.
      const datos = { salonId, imagenPlanoUrl: url, imagenPlanoPath: path };
      if (medidas) { datos.ancho = medidas.ancho; datos.alto = medidas.alto; }

      // Estado real, no el que tuviéramos en memoria: entre la carga y este
      // clic la fila pudo aparecer o desaparecer.
      const previo = await confirmar();
      if (previo.estado === "desconocido") {
        // Aún no se ha escrito nada, así que el objeto recién subido sí se puede
        // limpiar sin riesgo: no hay ninguna fila que lo referencie.
        throw new Error("No se pudo leer el plano actual. No se cambió nada; vuelve a intentarlo.");
      }
      const actual = previo.fila;
      const pathAnterior = actual?.imagenPlanoPath || null;

      if (actual) {
        await base44.entities.SalonPlano.update(actual.id, datos);
      } else {
        try {
          await base44.entities.SalonPlano.create(datos);
        } catch (errCreate) {
          // `salon_planos_salon_id_uniq` (sec_24): si otra pestaña la creó entre
          // la relectura y el insert, esto es un upsert, no un fallo.
          const yaExiste = /duplicate key|salon_planos_salon_id_uniq|23505/i.test(errCreate?.message || "");
          if (!yaExiste) throw errCreate;
          const reintento = await confirmar();
          if (reintento.estado !== "si") throw errCreate;
          await base44.entities.SalonPlano.update(reintento.fila.id, datos);
        }
      }

      // El shim devuelve éxito aunque RLS haya afectado 0 filas: se confirma.
      const post = await confirmar();

      if (post.estado === "desconocido") {
        // NO se borra nada. La escritura pudo cuajar perfectamente: si aquí se
        // hiciera rollback, se borraría del bucket el archivo que la fila acaba
        // de referenciar y el plano quedaría roto. Se avisa con honestidad.
        subidoPath = null;
        throw new Error(
          "No se pudo confirmar el guardado. Puede que sí se haya guardado: recarga y revisa el plano antes de reintentar.",
        );
      }
      if (post.estado === "no" || post.fila.imagenPlanoUrl !== url) {
        // Confirmado que NO quedó: aquí el rollback sí es correcto.
        throw new Error("La base no aceptó el cambio (¿permisos?). El plano no se guardó.");
      }

      if (pathAnterior && pathAnterior !== path) await borrarObjeto(pathAnterior);
      setPlano(post.fila);
      setOk(actual ? "Plano reemplazado ✓" : "Plano subido ✓");
      subidoPath = null;              // ya está referenciado por la fila
    } catch (err) {
      // Solo se limpia cuando se SABE que la fila no quedó (`subidoPath` sigue
      // puesto). Si no se pudo confirmar, se deja el huérfano a propósito.
      await borrarObjeto(subidoPath);
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
      const path = plano.imagenPlanoPath || null;
      await base44.entities.SalonPlano.delete(plano.id);

      // Confirmar: `delete` del shim devuelve `{success:true}` pase lo que pase.
      const post = await confirmar();

      if (post.estado === "desconocido") {
        // Mismo criterio que al subir: sin confirmación NO se borra el archivo.
        // Si la fila sigue viva y aquí se borrara el objeto, el plano quedaría
        // roto. Y no se limpia la UI, para no afirmar un borrado que no consta.
        throw new Error(
          "No se pudo confirmar el borrado. Recarga y revisa el plano antes de reintentar.",
        );
      }
      if (post.estado === "si") {
        throw new Error("La base no aceptó el borrado (¿permisos?). El plano sigue puesto.");
      }

      // Confirmado que la fila ya no está: ahora sí se borra el archivo.
      // Conservarlo no servía de nada —la fila era el único sitio donde vivía su
      // URL y el listado del bucket está cerrado— pero SÍ seguía descargable.
      await borrarObjeto(path);
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

  const tienePlano = !cargando && plano?.imagenPlanoUrl;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-white/40 text-xs uppercase tracking-wider">
          Plano del salón{salonNombre ? ` · ${salonNombre}` : ""}
        </span>
        {cargando && <Loader2 size={12} className="animate-spin text-white/30" />}
      </div>

      {cargando ? (
        <p className="text-white/25 text-xs">Cargando el plano…</p>
      ) : tienePlano ? (
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
        <label className="flex items-center gap-2 px-4 py-3 border border-dashed border-white/10 text-white/40 hover:text-white/60 hover:border-white/20 text-xs cursor-pointer transition-colors">
          {subiendo ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />}
          {subiendo ? "Subiendo…" : "Subir plano (JPG, PNG, WebP o AVIF · máx. 10 MB)"}
          <input type="file" accept={MIME_OK.join(",")} onChange={subir} disabled={subiendo} className="hidden" />
        </label>
      )}

      {error && <p className="text-red-400/90 text-xs">{error}</p>}
      {ok && <p className="text-green-400/80 text-xs">{ok}</p>}
    </div>
  );
}
