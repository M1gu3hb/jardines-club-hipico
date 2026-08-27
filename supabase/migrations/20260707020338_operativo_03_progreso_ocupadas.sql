-- ════════════════════════════════════════════════════════════════════════════════
-- operativo_03_progreso_ocupadas
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

-- El avance de meseros ahora usa el contador directo mesas.ocupadas (flujo "cupo por mesa con QR").
create or replace function jardines.progreso_mesas_staff(p_staff text)
returns jsonb language plpgsql security definer set search_path to 'jardines','public' as $function$
declare ev jardines.eventos; res jsonb; treg int := 0; tcap int := 0;
begin
  select * into ev from jardines.eventos where staff_token = p_staff and p_staff is not null and p_staff <> '';
  if ev.id is null then raise exception 'staff no autorizado'; end if;
  select coalesce(jsonb_agg(x order by x->>'nombre'), '[]'::jsonb),
         coalesce(sum((x->>'registradas')::int),0), coalesce(sum((x->>'capacidad')::int),0)
    into res, treg, tcap
  from (
    select jsonb_build_object(
      'id', m.id, 'nombre', coalesce(m.nombre,'Mesa'),
      'capacidad', coalesce(m.capacidad,0),
      'registradas', coalesce(m.ocupadas,0),
      'ocupadas', coalesce(m.ocupadas,0)) as x
    from jardines.mesas m where m.evento_id = ev.id
  ) t;
  return jsonb_build_object('evento', ev.nombre_evento, 'mesas', res, 'totalReg', treg, 'totalCap', tcap);
end $function$;;
