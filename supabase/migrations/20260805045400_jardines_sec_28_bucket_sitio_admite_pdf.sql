-- ════════════════════════════════════════════════════════════════════════════
-- sec_28 · EL BUCKET `sitio` ADMITE `application/pdf`
-- ════════════════════════════════════════════════════════════════════════════
--
-- ESTADO: ✅ APLICADA el 2026-08-05. Registrada como `20260805045400`.
--         Autorizada por el dueño: «el bucket `sitio` está autorizado; nada más de Storage».
--
-- ── EL HALLAZGO ─────────────────────────────────────────────────────────────
--
-- `AdminAlimentos` sube el PDF del menú con `base44.integrations.Core.UploadFile`, que está
-- cableado al bucket público `sitio` (`src/api/base44Client.js`). Y `sitio` NO admitía PDF:
--
--   storage.buckets.allowed_mime_types['sitio'] =
--     {image/jpeg, image/png, image/webp, image/avif, image/gif,
--      video/mp4, video/webm, video/quicktime}
--
-- Storage rechaza la subida por MIME. El `input` decía `accept=".pdf"`, así que el panel invitaba
-- a elegir exactamente lo único que el bucket iba a tirar. Y `handlePdf` no tenía `catch`: el
-- `setUploading(false)` de la línea siguiente nunca corría, así que el dueño se quedaba mirando un
-- spinner eterno sin un solo mensaje. **La subida del menú en PDF no funcionó nunca.**
--
-- ── POR QUÉ SE ARREGLA DE ESTE LADO ─────────────────────────────────────────
--
-- La otra opción era mandar los PDF al bucket `clientes`, que sí los admite. No sirve: `clientes`
-- es PRIVADO —es donde viven los documentos de cada evento— y el menú es contenido público del
-- sitio, que cualquier visitante tiene que poder descargar. Meterlo ahí obligaría a firmar una URL
-- por descarga para algo que es un folleto. `sitio` es el bucket público del CMS; el menú es
-- contenido del CMS. Se amplía `sitio`.
--
-- ── EL CANDADO DE VERO ──────────────────────────────────────────────────────
--
-- El bucket de Vero Seguros es `site-media` y NO SE TOCA. Esta migración nombra `sitio`
-- explícitamente en el `where` y comprueba en la poscondición que `site-media` sigue byte a byte
-- como estaba. Comprobado tras aplicar: `site-media` = {image/jpeg,image/png,image/webp,image/avif},
-- 3 MB, público — idéntico a antes.

-- ── PRECONDICIONES ──────────────────────────────────────────────────────────
do $$
declare v_mimes text[]; v_vero text[];
begin
  select allowed_mime_types into v_mimes from storage.buckets where id = 'sitio';
  if v_mimes is null then
    raise exception 'Precondicion fallida: el bucket `sitio` no existe o no restringe MIME.';
  end if;
  if 'application/pdf' = any(v_mimes) then
    raise notice 'sec_28: `sitio` ya admitia application/pdf — nada que hacer.';
  end if;
  if not ('image/jpeg' = any(v_mimes)) then
    raise exception 'Precondicion fallida: `sitio` no tiene la lista esperada (falta image/jpeg).';
  end if;

  select allowed_mime_types into v_vero from storage.buckets where id = 'site-media';
  if v_vero is null then
    raise exception 'Precondicion fallida: no se puede leer `site-media` para comprobar que no cambia.';
  end if;
end $$;

-- Se guarda el estado de Vero ANTES, para poder compararlo al final dentro de la misma
-- transacción. Tabla temporal: muere con la sesión, no deja rastro.
create temporary table sec_28_vero_antes on commit drop as
  select allowed_mime_types, file_size_limit, public from storage.buckets where id = 'site-media';

-- ── EL CAMBIO ───────────────────────────────────────────────────────────────
-- Aditivo: se AÑADE `application/pdf`, no se reescribe la lista. Si mañana alguien añade otro
-- tipo por el panel de Supabase, este `array_append` no se lo lleva por delante. Y el `where`
-- lo hace idempotente: reejecutarla no duplica la entrada.
update storage.buckets
   set allowed_mime_types = array_append(allowed_mime_types, 'application/pdf')
 where id = 'sitio'
   and not ('application/pdf' = any(allowed_mime_types));

-- ── POSCONDICIONES ──────────────────────────────────────────────────────────
do $$
declare v_mimes text[]; n_dif int;
begin
  select allowed_mime_types into v_mimes from storage.buckets where id = 'sitio';
  if not ('application/pdf' = any(v_mimes)) then
    raise exception 'Poscondicion fallida: `sitio` sigue sin admitir application/pdf.';
  end if;
  if not ('image/jpeg' = any(v_mimes) and 'video/mp4' = any(v_mimes)) then
    raise exception 'Poscondicion fallida: se perdieron tipos que `sitio` ya admitia.';
  end if;

  -- VERO INTACTO, comprobado, no supuesto.
  select count(*) into n_dif
    from storage.buckets b, sec_28_vero_antes a
   where b.id = 'site-media'
     and (b.allowed_mime_types is distinct from a.allowed_mime_types
       or b.file_size_limit    is distinct from a.file_size_limit
       or b.public             is distinct from a.public);
  if n_dif <> 0 then
    raise exception 'Poscondicion fallida: el bucket `site-media` de Vero cambio. Abortar.';
  end if;

  raise notice 'sec_28: `sitio` admite application/pdf; `site-media` intacto.';
end $$;
