-- ════════════════════════════════════════════════════════════════════════════════
-- jardines_06_resena_moderacion
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

-- Modera reseñas: las creadas por un cliente entran como NO aprobadas (el admin las aprueba).
-- Las que crea el admin conservan su valor (por defecto aprobada=true).
create or replace function jardines.resena_moderacion()
returns trigger
language plpgsql
security definer
set search_path to 'jardines','public','auth'
as $$
begin
  if not jardines.is_admin() then
    new.aprobada := false;
    new.enviada_google := coalesce(new.enviada_google, false);
  end if;
  return new;
end $$;

drop trigger if exists trg_resena_moderacion on jardines.resenas;
create trigger trg_resena_moderacion
  before insert on jardines.resenas
  for each row execute function jardines.resena_moderacion();;
