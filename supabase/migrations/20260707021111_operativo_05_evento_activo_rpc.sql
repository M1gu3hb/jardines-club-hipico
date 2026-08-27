-- ════════════════════════════════════════════════════════════════════════════════
-- operativo_05_evento_activo_rpc
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

-- Evento(s) con operativo activo, SOLO campos seguros para el equipo (sin datos privados
-- del cliente ni montos). Incluye staff_token para el control de cupo por mesa.
create or replace function jardines.operativo_evento_activo()
returns jsonb language plpgsql security definer set search_path = jardines, public as $$
declare res jsonb;
begin
  if jardines.mi_personal_id() is null then raise exception 'no autorizado'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', e.id, 'nombre', e.nombre_evento, 'fecha', e.fecha_evento,
    'salon', s.nombre, 'staffToken', e.staff_token, 'desde', e.operativo_desde
  ) order by e.operativo_desde desc nulls last), '[]'::jsonb)
  into res
  from jardines.eventos e left join jardines.salones s on s.id = e.salon_id
  where e.operativo_activo = true;
  return res;
end $$;
grant execute on function jardines.operativo_evento_activo() to authenticated;;
