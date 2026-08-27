-- ════════════════════════════════════════════════════════════════════════════════
-- operativo_04_ubicar_rpc
-- ════════════════════════════════════════════════════════════════════════════════
--
-- RESCATADA DEL LEDGER, no escrita a mano. 2026-08-27.
--
-- Esta migración se aplicó a la base el 2026-07-07 y su archivo no existía en ningún
-- repositorio: se perdió, o nunca se guardó. Durante meses el historial estuvo incompleto sin
-- que se notara, porque una migración aplicada no vuelve a hacer falta hasta el día que hay que
-- reconstruir desde cero — y ese día es tarde para descubrirlo.
--
-- El texto de abajo es EXACTAMENTE el que Supabase guardó en
-- `supabase_migrations.schema_migrations.statements` al aplicarla. No se ha reformateado ni
-- corregido nada: si algo aquí parece mejorable, se arregla en una migración NUEVA, porque
-- reescribir una ya aplicada hace que el archivo y la base cuenten historias distintas.
--
-- EL NOMBRE DEL ARCHIVO LLEVA SU VERSIÓN ORIGINAL a propósito. Con ese prefijo, el CLI de
-- Supabase la da por aplicada y un `db push` NO la vuelve a ejecutar. Cambiarlo la convertiría
-- en una migración nueva que intentaría crear tablas que ya existen.
-- ════════════════════════════════════════════════════════════════════════════════

-- Upsert seguro de la ubicación del propio trabajador (usa mi_personal_id()).
create or replace function jardines.operativo_ubicar(
  p_evento uuid, p_lat double precision, p_lng double precision, p_precision double precision)
returns void language plpgsql security definer set search_path = jardines, public as $$
declare v_pid uuid;
begin
  v_pid := jardines.mi_personal_id();
  if v_pid is null then raise exception 'no autorizado'; end if;
  insert into jardines.operativo_ubicaciones (personal_id, evento_id, lat, lng, precision_m, actualizado_at)
  values (v_pid, p_evento, p_lat, p_lng, p_precision, now())
  on conflict (personal_id) do update
    set evento_id = excluded.evento_id, lat = excluded.lat, lng = excluded.lng,
        precision_m = excluded.precision_m, actualizado_at = now();
end $$;
grant execute on function jardines.operativo_ubicar(uuid,double precision,double precision,double precision) to authenticated;;
