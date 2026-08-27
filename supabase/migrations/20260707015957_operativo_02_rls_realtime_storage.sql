-- ════════════════════════════════════════════════════════════════════════════════
-- operativo_02_rls_realtime_storage
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

-- ============ OPERATIVO: grants + RLS + realtime + storage + RPC ============

-- Grants (admin y staff usan el rol authenticated; RLS los diferencia)
grant select, insert, update, delete on jardines.operativo_personal to authenticated;
grant select, insert, update, delete on jardines.operativo_canales to authenticated;
grant select, insert, update, delete on jardines.operativo_personal_canal to authenticated;
grant select, insert, update, delete on jardines.operativo_ubicaciones to authenticated;
grant select, insert, update, delete on jardines.operativo_transmisiones to authenticated;

alter table jardines.operativo_personal        enable row level security;
alter table jardines.operativo_canales         enable row level security;
alter table jardines.operativo_personal_canal  enable row level security;
alter table jardines.operativo_ubicaciones     enable row level security;
alter table jardines.operativo_transmisiones   enable row level security;

-- PERSONAL: admin todo; staff lee el roster (para el mapa/directorio)
create policy op_personal_admin on jardines.operativo_personal
  for all using (jardines.es_admin()) with check (jardines.es_admin());
create policy op_personal_staff_sel on jardines.operativo_personal
  for select using (jardines.mi_personal_id() is not null);

-- CANALES: admin todo; staff lee los canales a los que pertenece
create policy op_canales_admin on jardines.operativo_canales
  for all using (jardines.es_admin()) with check (jardines.es_admin());
create policy op_canales_staff_sel on jardines.operativo_canales
  for select using (exists(
    select 1 from jardines.operativo_personal_canal pc
    where pc.canal_id = operativo_canales.id and pc.personal_id = jardines.mi_personal_id()));

-- MEMBRESÍAS: admin todo; staff lee las membresías de sus canales (saber quién está)
create policy op_pc_admin on jardines.operativo_personal_canal
  for all using (jardines.es_admin()) with check (jardines.es_admin());
create policy op_pc_staff_sel on jardines.operativo_personal_canal
  for select using (exists(
    select 1 from jardines.operativo_personal_canal me
    where me.personal_id = jardines.mi_personal_id() and me.canal_id = operativo_personal_canal.canal_id));

-- UBICACIONES: admin todo; staff ve todas y actualiza SOLO la suya
create policy op_ubi_admin on jardines.operativo_ubicaciones
  for all using (jardines.es_admin()) with check (jardines.es_admin());
create policy op_ubi_staff_sel on jardines.operativo_ubicaciones
  for select using (jardines.mi_personal_id() is not null);
create policy op_ubi_staff_ins on jardines.operativo_ubicaciones
  for insert with check (personal_id = jardines.mi_personal_id());
create policy op_ubi_staff_upd on jardines.operativo_ubicaciones
  for update using (personal_id = jardines.mi_personal_id())
  with check (personal_id = jardines.mi_personal_id());

-- TRANSMISIONES: enviar si es miembro con puede_hablar; escuchar si miembro con puede_escuchar
create policy op_tx_admin on jardines.operativo_transmisiones
  for all using (jardines.es_admin()) with check (jardines.es_admin());
create policy op_tx_ins on jardines.operativo_transmisiones
  for insert with check (
    personal_id = jardines.mi_personal_id() and exists(
      select 1 from jardines.operativo_personal_canal pc
      where pc.personal_id = jardines.mi_personal_id()
        and pc.canal_id = operativo_transmisiones.canal_id and pc.puede_hablar));
create policy op_tx_sel on jardines.operativo_transmisiones
  for select using (exists(
    select 1 from jardines.operativo_personal_canal pc
    where pc.personal_id = jardines.mi_personal_id()
      and pc.canal_id = operativo_transmisiones.canal_id and pc.puede_escuchar));

-- Realtime (mapa en vivo + radio)
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='jardines' and tablename='operativo_ubicaciones') then
    alter publication supabase_realtime add table jardines.operativo_ubicaciones; end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='jardines' and tablename='operativo_transmisiones') then
    alter publication supabase_realtime add table jardines.operativo_transmisiones; end if;
end $$;

-- Bucket privado para los clips de audio de la radio
insert into storage.buckets (id, name, public) values ('operativo','operativo', false)
  on conflict (id) do nothing;

drop policy if exists "op audio insert" on storage.objects;
drop policy if exists "op audio select" on storage.objects;
create policy "op audio insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'operativo' and jardines.mi_personal_id() is not null);
create policy "op audio select" on storage.objects for select to authenticated
  using (bucket_id = 'operativo' and (jardines.mi_personal_id() is not null or jardines.es_admin()));

-- RPC: registrar llegada de personas a una mesa (valida staff_token del evento + cupo)
create or replace function jardines.registrar_llegada_mesa(p_staff text, p_token text, p_personas int)
returns json language plpgsql security definer set search_path = jardines, public as $$
declare v_evento uuid; v_cap int; v_ocu int; v_nombre text; v_mesa uuid;
begin
  select m.id, m.evento_id, coalesce(m.capacidad,0), m.ocupadas, m.nombre
    into v_mesa, v_evento, v_cap, v_ocu, v_nombre
  from jardines.mesas m where m.token = p_token;
  if v_mesa is null then return json_build_object('ok',false,'error','QR de mesa no reconocido'); end if;
  if not exists(select 1 from jardines.eventos e where e.id = v_evento and e.staff_token = p_staff) then
    return json_build_object('ok',false,'error','No autorizado para este evento');
  end if;
  if p_personas is null or p_personas < 1 then
    return json_build_object('ok',false,'error','Número de personas inválido'); end if;
  if v_ocu + p_personas > v_cap then
    return json_build_object('ok',false,'error','lleno','mesa',v_nombre,'capacidad',v_cap,
      'ocupadas',v_ocu,'disponibles',greatest(v_cap - v_ocu,0));
  end if;
  update jardines.mesas set ocupadas = ocupadas + p_personas where id = v_mesa;
  return json_build_object('ok',true,'mesa',v_nombre,'capacidad',v_cap,
    'ocupadas',v_ocu + p_personas,'disponibles',v_cap - (v_ocu + p_personas));
end $$;
grant execute on function jardines.registrar_llegada_mesa(text,text,int) to anon, authenticated;

-- RPC auxiliar: info de una mesa por token (para mostrar antes de confirmar personas)
create or replace function jardines.info_mesa_token(p_staff text, p_token text)
returns json language plpgsql security definer set search_path = jardines, public as $$
declare v_evento uuid; v_cap int; v_ocu int; v_nombre text;
begin
  select m.evento_id, coalesce(m.capacidad,0), m.ocupadas, m.nombre
    into v_evento, v_cap, v_ocu, v_nombre
  from jardines.mesas m where m.token = p_token;
  if v_evento is null then return json_build_object('ok',false,'error','QR de mesa no reconocido'); end if;
  if not exists(select 1 from jardines.eventos e where e.id = v_evento and e.staff_token = p_staff) then
    return json_build_object('ok',false,'error','No autorizado para este evento');
  end if;
  return json_build_object('ok',true,'mesa',v_nombre,'capacidad',v_cap,
    'ocupadas',v_ocu,'disponibles',greatest(v_cap - v_ocu,0));
end $$;
grant execute on function jardines.info_mesa_token(text,text) to anon, authenticated;;
