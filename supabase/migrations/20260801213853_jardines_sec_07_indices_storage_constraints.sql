-- jardines_sec_07 — Índices de llave foránea, Storage de Jardines y validación
--
-- Los 12 índices son exactamente los que la auditoría confirmó SIN cobertura de
-- prefijo (se verificó contra pg_index, no se asumió). NO se toca
-- public.content_audit(actor): pertenece a Vero Seguros.
--
-- Storage: solo los buckets de Jardines (clientes, operativo, planos, sitio).
-- El bucket `site-media` es de Vero y no se modifica.

-- ===========================================================================
-- A) ÍNDICES DE LLAVE FORÁNEA
-- ===========================================================================
create index if not exists accesos_invitacion_id_idx            on jardines.accesos (invitacion_id);
create index if not exists accesos_mesa_id_idx                  on jardines.accesos (mesa_id);
create index if not exists evento_notas_evento_id_idx           on jardines.evento_notas (evento_id);
create index if not exists eventos_salon_id_idx                 on jardines.eventos (salon_id);
create index if not exists invitaciones_mesa_id_idx             on jardines.invitaciones (mesa_id);
create index if not exists invitados_mesa_id_idx                on jardines.invitados (mesa_id);
create index if not exists notificaciones_evento_id_idx         on jardines.notificaciones (evento_id);
create index if not exists operativo_personal_canal_canal_id_idx on jardines.operativo_personal_canal (canal_id);
create index if not exists operativo_transmisiones_personal_id_idx on jardines.operativo_transmisiones (personal_id);
create index if not exists operativo_ubicaciones_evento_id_idx  on jardines.operativo_ubicaciones (evento_id);
create index if not exists resenas_evento_id_idx                on jardines.resenas (evento_id);
create index if not exists salon_planos_salon_id_idx            on jardines.salon_planos (salon_id);

-- ===========================================================================
-- B) STORAGE
-- ===========================================================================

-- B.1 Límites de tamaño y tipo acordes a lo que realmente se sube.
update storage.buckets
   set file_size_limit = 20971520,
       allowed_mime_types = array['application/pdf','image/jpeg','image/png','image/webp','image/avif']
 where id = 'clientes';

update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array['audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/aac']
 where id = 'operativo';

-- Se excluye SVG (puede llevar script), HTML y cualquier ejecutable.
update storage.buckets
   set file_size_limit = 10485760,
       allowed_mime_types = array['image/jpeg','image/png','image/webp','image/avif']
 where id = 'planos';

update storage.buckets
   set file_size_limit = 52428800,
       allowed_mime_types = array['image/jpeg','image/png','image/webp','image/avif','image/gif',
                                  'video/mp4','video/webm','video/quicktime']
 where id = 'sitio';

-- B.2 Cerrar el LISTADO público de `planos` y `sitio`.
--     Al ser buckets públicos, la descarga por URL (/object/public/...) NO necesita
--     policy de SELECT: las imágenes del sitio siguen cargando igual. Lo que se
--     retira es poder enumerar el bucket completo. El admin conserva SELECT por su
--     policy de escritura (FOR ALL).
drop policy if exists "planos lectura publica" on storage.objects;
drop policy if exists "sitio lectura publica"  on storage.objects;

-- B.3 Operativo: escritura acotada a su ruta real `tx/<canal_id>/...` y solo en
--     canales donde la persona puede hablar. Antes bastaba con ser operativo activo
--     para escribir en cualquier ruta del bucket o sobrescribir audio ajeno.
drop policy if exists "op audio insert" on storage.objects;
drop policy if exists "op audio select" on storage.objects;
drop policy if exists "op audio update" on storage.objects;

create policy "op audio insert" on storage.objects
  as permissive for insert to authenticated
  with check (
    bucket_id = 'operativo'
    and (storage.foldername(name))[1] = 'tx'
    and ((storage.foldername(name))[2])::uuid in (select jardines.mis_canales_hablar())
  );

create policy "op audio select" on storage.objects
  as permissive for select to authenticated
  using (
    bucket_id = 'operativo'
    and (
      jardines.es_admin()
      or ((storage.foldername(name))[1] = 'tx'
          and ((storage.foldername(name))[2])::uuid in (select jardines.mis_canales_escuchar()))
    )
  );

-- B.4 Documentos de cliente: el upsert del admin necesita INSERT + SELECT + UPDATE
--     (por eso FOR ALL); el cliente solo lee la carpeta de SU evento.
drop policy if exists "clientes admin"        on storage.objects;
drop policy if exists "clientes lee sus docs" on storage.objects;

create policy "clientes admin" on storage.objects
  as permissive for all to authenticated
  using (bucket_id = 'clientes' and jardines.is_admin())
  with check (bucket_id = 'clientes' and jardines.is_admin());

create policy "clientes lee sus docs" on storage.objects
  as permissive for select to authenticated
  using (
    bucket_id = 'clientes'
    and exists (
      select 1 from jardines.eventos e
      where e.auth_user_id = (select auth.uid())
        and (storage.foldername(objects.name))[1] = (e.id)::text
    )
  );

-- ===========================================================================
-- C) VALIDACIÓN EN LA BASE
-- ===========================================================================
-- Todas se verificaron contra los datos existentes antes de aplicarlas: ninguna
-- fila viola ninguna restricción (la migración habría fallado en caso contrario).
alter table jardines.solicitudes drop constraint if exists solicitudes_longitudes;
alter table jardines.solicitudes add constraint solicitudes_longitudes check (
  length(coalesce(nombre_completo, '')) <= 120
  and length(coalesce(telefono, ''))    <= 30
  and length(coalesce(email, ''))       <= 160
  and length(coalesce(comentarios, '')) <= 2000
  and length(coalesce(tipo_evento, '')) <= 80
  and length(coalesce(salon_seleccionado, '')) <= 120
  and (numero_personas is null or (numero_personas >= 0 and numero_personas <= 5000))
);

alter table jardines.solicitudes drop constraint if exists solicitudes_estatus_valido;
alter table jardines.solicitudes add constraint solicitudes_estatus_valido
  check (estatus is null or estatus in ('Nueva','En proceso','Cotizada','Cerrada','Descartada'));

alter table jardines.rsvps drop constraint if exists rsvps_valido;
alter table jardines.rsvps add constraint rsvps_valido check (
  length(coalesce(nombre, '')) between 1 and 120
  and length(coalesce(mensaje, '')) <= 500
  and (personas is null or (personas >= 1 and personas <= 30))
);

alter table jardines.invitaciones drop constraint if exists invitaciones_cupo_valido;
alter table jardines.invitaciones add constraint invitaciones_cupo_valido check (
  max_personas >= 1
  and personas_registradas >= 0
  and personas_registradas <= max_personas
);

alter table jardines.mesas drop constraint if exists mesas_ocupacion_valida;
alter table jardines.mesas add constraint mesas_ocupacion_valida check (
  (capacidad is null or capacidad >= 0)
  and (ocupadas is null or ocupadas >= 0)
  and (capacidad is null or ocupadas is null or ocupadas <= capacidad)
);

alter table jardines.accesos drop constraint if exists accesos_personas_valido;
alter table jardines.accesos add constraint accesos_personas_valido
  check (personas >= 1 and personas <= 50);

alter table jardines.operativo_ubicaciones drop constraint if exists ubicaciones_coords_validas;
alter table jardines.operativo_ubicaciones add constraint ubicaciones_coords_validas check (
  (lat is null or (lat between -90  and 90))
  and (lng is null or (lng between -180 and 180))
  and (precision_m is null or precision_m >= 0)
);

alter table jardines.resenas drop constraint if exists resenas_estrellas_validas;
alter table jardines.resenas add constraint resenas_estrellas_validas
  check (estrellas is null or (estrellas >= 1 and estrellas <= 5));

alter table jardines.invitaciones drop constraint if exists invitaciones_token_no_vacio;
alter table jardines.invitaciones add constraint invitaciones_token_no_vacio
  check (length(coalesce(token, '')) >= 16);

alter table jardines.mesas drop constraint if exists mesas_token_no_vacio;
alter table jardines.mesas add constraint mesas_token_no_vacio
  check (token is null or length(token) >= 16);
