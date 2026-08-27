-- ════════════════════════════════════════════════════════════════════════════════
-- jardines_11_staff_invitacion_rsvp
-- ════════════════════════════════════════════════════════════════════════════════
--
-- RESCATADA DEL LEDGER, no escrita a mano. 2026-08-27.
--
-- Esta migración se aplicó a la base el 2026-07-06 y su archivo no existía en ningún
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

alter table jardines.eventos add column if not exists staff_token text;
create unique index if not exists eventos_staff_token_key on jardines.eventos(staff_token) where staff_token is not null;
alter table jardines.eventos add column if not exists invitacion_token text;
create unique index if not exists eventos_invitacion_token_key on jardines.eventos(invitacion_token) where invitacion_token is not null;
alter table jardines.eventos add column if not exists invitacion_activa boolean default false;
alter table jardines.eventos add column if not exists invitacion_mensaje text;
alter table jardines.eventos add column if not exists invitacion_dress_code text;
alter table jardines.eventos add column if not exists resena_recordada boolean default false;
create table if not exists jardines.rsvps (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references jardines.eventos(id) on delete cascade,
  nombre text not null, personas integer default 1, mensaje text, created_at timestamptz default now()
);
create index if not exists rsvps_evento_id_idx on jardines.rsvps(evento_id);
grant select, insert, update, delete on jardines.rsvps to authenticated, service_role;
alter table jardines.rsvps enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='jardines' and tablename='rsvps' and policyname='admin rsvps') then
    create policy "admin rsvps" on jardines.rsvps for all using (jardines.is_admin()) with check (jardines.is_admin());
  end if;
  if not exists (select 1 from pg_policies where schemaname='jardines' and tablename='rsvps' and policyname='cliente lee rsvps de su evento') then
    create policy "cliente lee rsvps de su evento" on jardines.rsvps for select using (jardines.is_my_event(evento_id));
  end if;
end $$;;
