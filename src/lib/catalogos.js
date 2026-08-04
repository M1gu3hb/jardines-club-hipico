/**
 * catalogos.js — TODA lista cerrada que sea espejo de una restricción de la base.
 *
 * POR QUÉ EXISTE
 *   Van dos bugs del mismo patrón, y los dos costaron meses de función invisible:
 *
 *     1. `AdminSolicitudes` ofrecía "En revisión", "Confirmada", "Cancelada" y el CHECK
 *        admitía otros cinco. Solo coincidía "Nueva", así que CUALQUIER cambio de estatus
 *        moría con un 23514. (Bloque 7A.)
 *     2. `EventoDocumentos` ofrecía "comprobante" y el CHECK admite tres tipos sin él.
 *        Toda subida marcada así fallaba. `jardines.documentos` tenía 0 filas: nunca
 *        funcionó desde el día uno.
 *
 *   En los dos casos la lista vivía dentro del componente que la usaba, y nadie la cruzó
 *   nunca contra la base. Mientras cada pantalla declare la suya, el tercer caso es cuestión
 *   de tiempo.
 *
 * LA REGLA
 *   Si una lista de opciones es espejo de un CHECK, un enum, un FK o una configuración de
 *   Storage, **vive aquí y solo aquí**, con el nombre exacto de la restricción que refleja.
 *   Un contrato de `scripts/test-contratos-api.mjs` impide que un componente vuelva a
 *   declarar la suya.
 *
 * QUÉ COMPRUEBA EL CONTRATO, Y QUÉ NO
 *   Cada bloque de abajo declara su restricción en una línea `RESTRICCION: [...]`, y un
 *   contrato compara esa línea con el array de al lado. Eso atrapa el fallo real —añadir un
 *   valor a la lista sin que exista en la base—, pero **no** consulta Postgres: si alguien
 *   edita las DOS a la vez, el contrato pasa. Por eso la línea `RESTRICCION` es lo que hay
 *   que cotejar contra producción al revisar el diff, y por eso está escrita literal.
 *   `SOLICITUD_ESTATUS` sí se cruza además contra `sec_07`, que es la única de estas
 *   restricciones que vive en una migración del repo.
 *
 * PARA AÑADIR UN VALOR
 *   Primero la migración que lo mete en la restricción, y **después** esta lista. Al revés
 *   es exactamente cómo se produjeron los dos bugs de arriba.
 *
 * QUÉ NO VA AQUÍ
 *   Listas que no son espejo de nada: `TIPOS_EVENTO` del formulario público escribe en una
 *   columna de texto libre (`solicitudes.tipo_evento`, solo acotada en longitud), así que no
 *   puede divergir de ninguna restricción y se queda donde está.
 *
 * Las credenciales tienen su propio módulo porque las comparten cliente y servidor:
 * `api/_lib/reglas-credenciales.js`.
 */

/**
 * Espejo de `documentos_tipo_check`:
 *   RESTRICCION: ['cotizacion','contrato','otro']
 * "comprobante" NO está: se ofrecía y la base lo rechazaba con 23514.
 */
export const DOCUMENTO_TIPOS = ["contrato", "cotizacion", "otro"];

/**
 * Espejo de `eventos_estatus_check`:
 *   RESTRICCION: ['Apartado','Confirmado','Realizado','Cancelado']
 */
export const EVENTO_ESTATUS = ["Apartado", "Confirmado", "Realizado", "Cancelado"];

/**
 * Espejo de `solicitudes_estatus_valido`:
 *   RESTRICCION: ['Nueva','En proceso','Cotizada','Cerrada','Descartada']
 */
export const SOLICITUD_ESTATUS = ["Nueva", "En proceso", "Cotizada", "Cerrada", "Descartada"];

/**
 * Espejo de `mesas_forma_check`:
 *   RESTRICCION: ['redonda','cuadrada']
 */
export const MESA_FORMAS = ["redonda", "cuadrada"];

/**
 * Espejo de `musica_tipo_check`:
 *   RESTRICCION: ['poner','no_poner']
 */
export const MUSICA_TIPOS = ["poner", "no_poner"];

/**
 * Espejo de `storage.buckets.allowed_mime_types`. Storage rechaza lo que no esté en la lista,
 * así que un `accept` más ancho que esto es la misma clase de bug: el selector de archivos
 * deja elegir algo que el bucket va a rechazar.
 *
 * `clientes` llevaba `accept=".pdf,image/*"`, e `image/*` incluye HEIC —lo que sale de un
 * iPhone—, GIF y SVG, ninguno admitido.
 */
export const BUCKET_MIME = {
  clientes: ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/avif"],
  planos: ["image/jpeg", "image/png", "image/webp", "image/avif"],
};

/** Tamaño máximo por bucket, en bytes. Espejo de `storage.buckets.file_size_limit`. */
export const BUCKET_MAX_BYTES = {
  clientes: 20 * 1024 * 1024,
  planos: 10 * 1024 * 1024,
};
