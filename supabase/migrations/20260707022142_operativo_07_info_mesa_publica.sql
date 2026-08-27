-- ════════════════════════════════════════════════════════════════════════════════
-- operativo_07_info_mesa_publica
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

-- Info pública de una mesa por token (para /m/<token>): solo datos seguros del evento,
-- para que el invitado que tiene el boleto vea su entrada. El token es una capacidad
-- (aleatorio, va en su boleto), como los tokens de invitación.
create or replace function jardines.info_mesa_publica(p_token text)
returns json language plpgsql security definer set search_path = jardines, public as $$
declare r json;
begin
  select json_build_object('ok', true, 'mesa', m.nombre, 'evento', e.nombre_evento,
    'fecha', e.fecha_evento, 'salon', s.nombre, 'tipo', e.tipo_evento)
  into r
  from jardines.mesas m
    join jardines.eventos e on e.id = m.evento_id
    left join jardines.salones s on s.id = e.salon_id
  where m.token = p_token;
  return coalesce(r, json_build_object('ok', false));
end $$;
grant execute on function jardines.info_mesa_publica(text) to anon, authenticated;;
