-- ════════════════════════════════════════════════════════════════════════════════
-- operativo_08_fix_rls_recursion
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

-- Helpers SECURITY DEFINER: devuelven los canales del usuario SIN pasar por RLS
-- (evita la recursión infinita de políticas que consultaban operativo_personal_canal).
create or replace function jardines.mis_canales() returns setof uuid
  language sql stable security definer set search_path = jardines, public as $$
  select canal_id from jardines.operativo_personal_canal where personal_id = jardines.mi_personal_id();
$$;
create or replace function jardines.mis_canales_hablar() returns setof uuid
  language sql stable security definer set search_path = jardines, public as $$
  select canal_id from jardines.operativo_personal_canal
  where personal_id = jardines.mi_personal_id() and puede_hablar;
$$;
create or replace function jardines.mis_canales_escuchar() returns setof uuid
  language sql stable security definer set search_path = jardines, public as $$
  select canal_id from jardines.operativo_personal_canal
  where personal_id = jardines.mi_personal_id() and puede_escuchar;
$$;
grant execute on function jardines.mis_canales() to authenticated;
grant execute on function jardines.mis_canales_hablar() to authenticated;
grant execute on function jardines.mis_canales_escuchar() to authenticated;

-- Recrear las políticas que se auto/cruzaban con operativo_personal_canal.
drop policy if exists op_canales_staff_sel on jardines.operativo_canales;
create policy op_canales_staff_sel on jardines.operativo_canales
  for select using (id in (select jardines.mis_canales()));

drop policy if exists op_pc_staff_sel on jardines.operativo_personal_canal;
create policy op_pc_staff_sel on jardines.operativo_personal_canal
  for select using (
    personal_id = jardines.mi_personal_id() or canal_id in (select jardines.mis_canales()));

drop policy if exists op_tx_ins on jardines.operativo_transmisiones;
create policy op_tx_ins on jardines.operativo_transmisiones
  for insert with check (
    personal_id = jardines.mi_personal_id() and canal_id in (select jardines.mis_canales_hablar()));

drop policy if exists op_tx_sel on jardines.operativo_transmisiones;
create policy op_tx_sel on jardines.operativo_transmisiones
  for select using (canal_id in (select jardines.mis_canales_escuchar()));;
