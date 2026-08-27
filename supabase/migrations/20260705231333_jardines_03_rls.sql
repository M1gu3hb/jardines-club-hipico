-- ════════════════════════════════════════════════════════════════════════════════
-- jardines_03_rls
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


-- ===================== FUNCIONES DE SEGURIDAD =====================
create or replace function jardines.is_admin()
returns boolean language sql stable security definer set search_path = jardines, public, auth as $$
  select exists (select 1 from jardines.perfiles p where p.user_id = auth.uid() and p.rol = 'admin');
$$;

create or replace function jardines.is_my_event(evt uuid)
returns boolean language sql stable security definer set search_path = jardines, public, auth as $$
  select exists (select 1 from jardines.eventos e where e.id = evt and e.auth_user_id = auth.uid());
$$;

create or replace function jardines.client_can_edit(evt uuid)
returns boolean language sql stable security definer set search_path = jardines, public, auth as $$
  select exists (
    select 1 from jardines.eventos e
    join jardines.evento_reglas_mesas r on r.evento_id = e.id
    where e.id = evt and e.auth_user_id = auth.uid() and r.cliente_puede_editar = true
  );
$$;

grant execute on function jardines.is_admin(), jardines.is_my_event(uuid), jardines.client_can_edit(uuid)
  to anon, authenticated, service_role;

-- Grants explícitos sobre las tablas ya creadas
grant select, insert, update, delete on all tables in schema jardines to anon, authenticated, service_role;
grant usage, select on all sequences in schema jardines to anon, authenticated, service_role;

-- ===================== RLS: CONTENIDO PÚBLICO =====================
do $$
declare t text;
begin
  foreach t in array array['config_sitio','salones','galeria','servicios','amenidades','servicios_extra','alimentos','resenas_config','salon_planos']
  loop
    execute format('alter table jardines.%I enable row level security', t);
    execute format('create policy "lectura publica" on jardines.%I for select using (true)', t);
    execute format('create policy "admin escribe" on jardines.%I for all to authenticated using (jardines.is_admin()) with check (jardines.is_admin())', t);
  end loop;
end $$;

-- ===================== RESEÑAS =====================
alter table jardines.resenas enable row level security;
create policy "lectura aprobadas o admin" on jardines.resenas for select using (aprobada = true or jardines.is_admin());
create policy "admin resenas" on jardines.resenas for all to authenticated using (jardines.is_admin()) with check (jardines.is_admin());
create policy "cliente crea resena de su evento" on jardines.resenas for insert to authenticated
  with check (evento_id is not null and jardines.is_my_event(evento_id));

-- ===================== SOLICITUDES (leads) =====================
alter table jardines.solicitudes enable row level security;
create policy "admin solicitudes" on jardines.solicitudes for all to authenticated using (jardines.is_admin()) with check (jardines.is_admin());
-- inserts vía service_role (api/solicitud.js), que ignora RLS.

-- ===================== PERFILES =====================
alter table jardines.perfiles enable row level security;
create policy "lee su perfil" on jardines.perfiles for select to authenticated using (user_id = auth.uid() or jardines.is_admin());
create policy "admin perfiles" on jardines.perfiles for all to authenticated using (jardines.is_admin()) with check (jardines.is_admin());

-- ===================== EVENTOS =====================
alter table jardines.eventos enable row level security;
create policy "admin eventos" on jardines.eventos for all to authenticated using (jardines.is_admin()) with check (jardines.is_admin());
create policy "cliente ve su evento" on jardines.eventos for select to authenticated using (auth_user_id = auth.uid());

-- ===================== TABLAS HIJAS: solo lectura para el cliente dueño, admin todo =====================
do $$
declare t text;
begin
  foreach t in array array['documentos','items_contratados','evento_reglas_mesas']
  loop
    execute format('alter table jardines.%I enable row level security', t);
    execute format('create policy "admin %I" on jardines.%I for all to authenticated using (jardines.is_admin()) with check (jardines.is_admin())', t, t);
    execute format('create policy "cliente lee %I" on jardines.%I for select to authenticated using (jardines.is_my_event(evento_id))', t, t);
  end loop;
end $$;

-- ===================== MESAS: cliente edita si la regla lo permite =====================
alter table jardines.mesas enable row level security;
create policy "admin mesas" on jardines.mesas for all to authenticated using (jardines.is_admin()) with check (jardines.is_admin());
create policy "cliente lee mesas" on jardines.mesas for select to authenticated using (jardines.is_my_event(evento_id));
create policy "cliente edita mesas" on jardines.mesas for insert to authenticated with check (jardines.client_can_edit(evento_id));
create policy "cliente update mesas" on jardines.mesas for update to authenticated using (jardines.client_can_edit(evento_id)) with check (jardines.client_can_edit(evento_id));
create policy "cliente borra mesas" on jardines.mesas for delete to authenticated using (jardines.client_can_edit(evento_id));

-- invitados (por su mesa)
alter table jardines.invitados enable row level security;
create policy "admin invitados" on jardines.invitados for all to authenticated using (jardines.is_admin()) with check (jardines.is_admin());
create policy "cliente gestiona invitados" on jardines.invitados for all to authenticated
  using (exists (select 1 from jardines.mesas m where m.id = mesa_id and jardines.is_my_event(m.evento_id)))
  with check (exists (select 1 from jardines.mesas m where m.id = mesa_id and jardines.client_can_edit(m.evento_id)));

-- ===================== CRONOGRAMA / MÚSICA: cliente dueño edita libremente =====================
do $$
declare t text;
begin
  foreach t in array array['cronograma','musica']
  loop
    execute format('alter table jardines.%I enable row level security', t);
    execute format('create policy "admin %I" on jardines.%I for all to authenticated using (jardines.is_admin()) with check (jardines.is_admin())', t, t);
    execute format('create policy "cliente %I" on jardines.%I for all to authenticated using (jardines.is_my_event(evento_id)) with check (jardines.is_my_event(evento_id))', t, t);
  end loop;
end $$;

-- ===================== QR / ACCESOS: solo admin (meseros usan panel admin) =====================
alter table jardines.invitaciones enable row level security;
create policy "admin invitaciones" on jardines.invitaciones for all to authenticated using (jardines.is_admin()) with check (jardines.is_admin());
create policy "cliente lee invitaciones" on jardines.invitaciones for select to authenticated using (jardines.is_my_event(evento_id));

alter table jardines.accesos enable row level security;
create policy "admin accesos" on jardines.accesos for all to authenticated using (jardines.is_admin()) with check (jardines.is_admin());
;
