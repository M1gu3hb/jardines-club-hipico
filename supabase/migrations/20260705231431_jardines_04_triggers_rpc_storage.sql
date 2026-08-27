-- ════════════════════════════════════════════════════════════════════════════════
-- jardines_04_triggers_rpc_storage
-- ════════════════════════════════════════════════════════════════════════════════
--
-- RESCATADA DEL LEDGER, no escrita a mano. 2026-08-27.
--
-- Esta migración se aplicó a la base el 2026-07-05 y su archivo no existía en ningún
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


-- ===================== TRIGGER: crear perfil al crear usuario =====================
create or replace function jardines.handle_new_user()
returns trigger language plpgsql security definer set search_path = jardines, public, auth as $$
begin
  insert into jardines.perfiles (user_id, rol, nombre, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'rol','cliente'),
          new.raw_user_meta_data->>'nombre', new.email)
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function jardines.handle_new_user();

-- ===================== RPC: cliente confirma su evento (apartado) =====================
create or replace function jardines.confirmar_evento(evt uuid)
returns void language plpgsql security definer set search_path = jardines, public, auth as $$
begin
  update jardines.eventos set confirmado_cliente = true
   where id = evt and auth_user_id = auth.uid();
end $$;

-- ===================== RPC: info de invitación por token (meseros/admin) =====================
create or replace function jardines.info_invitacion(p_token text)
returns jsonb language plpgsql security definer set search_path = jardines, public, auth as $$
declare inv jardines.invitaciones; m jardines.mesas; ev jardines.eventos;
begin
  if not jardines.is_admin() then raise exception 'no autorizado'; end if;
  select * into inv from jardines.invitaciones where token = p_token;
  if inv.id is null then raise exception 'invitacion no encontrada'; end if;
  select * into m from jardines.mesas where id = inv.mesa_id;
  select * into ev from jardines.eventos where id = inv.evento_id;
  return jsonb_build_object('token', inv.token, 'evento', ev.nombre_evento, 'invitado', inv.nombre_invitado,
    'mesa', coalesce(m.nombre,'Sin mesa'), 'max', inv.max_personas, 'registradas', inv.personas_registradas,
    'estatus', inv.estatus);
end $$;

-- ===================== RPC: registrar acceso (meseros/admin) =====================
create or replace function jardines.registrar_acceso(p_token text, p_personas int)
returns jsonb language plpgsql security definer set search_path = jardines, public, auth as $$
declare inv jardines.invitaciones; m jardines.mesas;
begin
  if not jardines.is_admin() then raise exception 'no autorizado'; end if;
  if p_personas < 1 then raise exception 'personas debe ser >= 1'; end if;
  select * into inv from jardines.invitaciones where token = p_token for update;
  if inv.id is null then raise exception 'invitacion no encontrada'; end if;
  if inv.personas_registradas + p_personas > inv.max_personas then
    raise exception 'excede el cupo (max %, ya %, intento %)', inv.max_personas, inv.personas_registradas, p_personas;
  end if;
  update jardines.invitaciones
     set personas_registradas = personas_registradas + p_personas,
         estatus = case when personas_registradas + p_personas >= max_personas then 'completo' else 'parcial' end
   where id = inv.id;
  insert into jardines.accesos (invitacion_id, mesa_id, personas, registrado_por)
    values (inv.id, inv.mesa_id, p_personas, auth.uid());
  select * into m from jardines.mesas where id = inv.mesa_id;
  return jsonb_build_object('ok', true, 'mesa', coalesce(m.nombre,'Sin mesa'),
    'registradas', inv.personas_registradas + p_personas, 'max', inv.max_personas);
end $$;

grant execute on function jardines.confirmar_evento(uuid), jardines.info_invitacion(text), jardines.registrar_acceso(text,int)
  to authenticated, service_role;

-- ===================== STORAGE BUCKETS =====================
insert into storage.buckets (id, name, public) values
  ('sitio','sitio',true), ('planos','planos',true), ('clientes','clientes',false)
on conflict (id) do nothing;

-- Políticas de Storage
create policy "sitio lectura publica" on storage.objects for select using (bucket_id = 'sitio');
create policy "sitio admin escribe" on storage.objects for all to authenticated
  using (bucket_id = 'sitio' and jardines.is_admin()) with check (bucket_id = 'sitio' and jardines.is_admin());

create policy "planos lectura publica" on storage.objects for select using (bucket_id = 'planos');
create policy "planos admin escribe" on storage.objects for all to authenticated
  using (bucket_id = 'planos' and jardines.is_admin()) with check (bucket_id = 'planos' and jardines.is_admin());

create policy "clientes admin" on storage.objects for all to authenticated
  using (bucket_id = 'clientes' and jardines.is_admin()) with check (bucket_id = 'clientes' and jardines.is_admin());
create policy "clientes lee sus docs" on storage.objects for select to authenticated
  using (bucket_id = 'clientes' and exists (
    select 1 from jardines.eventos e where e.auth_user_id = auth.uid() and (storage.foldername(name))[1] = e.id::text
  ));
;
