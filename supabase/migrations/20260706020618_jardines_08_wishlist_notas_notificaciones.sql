-- ════════════════════════════════════════════════════════════════════════════════
-- jardines_08_wishlist_notas_notificaciones
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

-- Wishlist del cliente: servicios/amenidades que le interesan (NO afecta items_contratados).
create table jardines.evento_wishlist (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references jardines.eventos(id) on delete cascade,
  titulo text not null,
  origen text,
  created_at timestamptz default now()
);
create unique index evento_wishlist_unico on jardines.evento_wishlist (evento_id, titulo);

-- Notas e ideas libres del cliente para su evento.
create table jardines.evento_notas (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references jardines.eventos(id) on delete cascade,
  texto text not null,
  created_at timestamptz default now()
);

-- Notificaciones para el dashboard del dueño (confirmaciones, reseñas, intereses).
create table jardines.notificaciones (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid references jardines.eventos(id) on delete set null,
  tipo text default 'info',
  titulo text not null,
  detalle text,
  leida boolean default false,
  created_at timestamptz default now()
);

grant select, insert, update, delete on jardines.evento_wishlist, jardines.evento_notas, jardines.notificaciones to authenticated, service_role;

alter table jardines.evento_wishlist enable row level security;
alter table jardines.evento_notas enable row level security;
alter table jardines.notificaciones enable row level security;

-- Wishlist: admin todo; cliente gestiona SOLO la de su evento.
create policy "admin wishlist" on jardines.evento_wishlist for all
  using (jardines.is_admin()) with check (jardines.is_admin());
create policy "cliente gestiona su wishlist" on jardines.evento_wishlist for all
  using (jardines.is_my_event(evento_id)) with check (jardines.is_my_event(evento_id));

-- Notas: igual que wishlist.
create policy "admin notas" on jardines.evento_notas for all
  using (jardines.is_admin()) with check (jardines.is_admin());
create policy "cliente gestiona sus notas" on jardines.evento_notas for all
  using (jardines.is_my_event(evento_id)) with check (jardines.is_my_event(evento_id));

-- Notificaciones: solo el admin las lee/gestiona; un cliente puede CREAR las de su evento.
create policy "admin notificaciones" on jardines.notificaciones for all
  using (jardines.is_admin()) with check (jardines.is_admin());
create policy "cliente crea notificacion de su evento" on jardines.notificaciones for insert
  to authenticated with check (evento_id is not null and jardines.is_my_event(evento_id));

-- El cliente puede LEER las reseñas de SU evento (para saber si ya dejó la suya).
create policy "cliente lee resenas de su evento" on jardines.resenas for select
  using (jardines.is_my_event(evento_id));;
