-- jardines_sec_12 — CORRECCIÓN de un fallo introducido en sec_08
--
-- El trigger de auditoría resolvía `new.evento_id` dentro de un CASE. PL/pgSQL
-- resuelve los campos de un record en tiempo de ejecución para TODAS las ramas de
-- la expresión, así que en `operativo_personal` (que no tiene esa columna) fallaba
-- con "record new has no field evento_id", y eso rompía cualquier INSERT/UPDATE/
-- DELETE sobre personal, canales y membresías.
--
-- Además `new` no está asignado en DELETE, así que tampoco se puede leer directo.
--
-- Solución: convertir el record a jsonb y leer las claves por nombre. `->>` sobre
-- una clave inexistente devuelve NULL en lugar de fallar, así que la misma función
-- sirve para las cuatro tablas y para las tres operaciones.
--
-- Lo detectó la suite de regresión, no la interfaz: por eso las pruebas escriben
-- de verdad en las cuatro tablas operativas.
create or replace function jardines.auditar_cambio_operativo()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_row    jsonb;
  v_id     uuid;
  v_evento uuid;
begin
  if tg_op = 'DELETE' then
    v_row := to_jsonb(old);
  else
    v_row := to_jsonb(new);
  end if;

  v_id     := nullif(v_row ->> 'id', '')::uuid;
  v_evento := nullif(v_row ->> 'evento_id', '')::uuid;

  perform jardines_private.auditar(
    'cambio_' || tg_table_name, 'ok', tg_table_name, v_id, v_evento, null,
    jsonb_build_object('op', tg_op));

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end $$;

revoke all on function jardines.auditar_cambio_operativo() from public, anon, authenticated;
