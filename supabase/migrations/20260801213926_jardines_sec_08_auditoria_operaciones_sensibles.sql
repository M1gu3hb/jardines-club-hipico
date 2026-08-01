-- jardines_sec_08 — Auditoría de las operaciones sensibles restantes (Bloque 10)
--
-- Vive en jardines_private.auditoria. NO se reutiliza ni se modifica
-- public.content_audit, que es la bitácora de Vero Seguros.
--
-- No se guarda ningún token completo, PIN, contraseña ni service_role: cuando hace
-- falta identificar a un actor sin sesión se guarda un HMAC irreversible.
--
-- El resto de acciones ya quedaron auditadas en sus propias migraciones:
--   alta_usuario, cambio_rol, aprovisionar_usuario  → sec_02
--   operativo_ubicar (denegaciones)                 → sec_03
--   staff_token_uso / _rotar / _revocar,
--   registrar_acceso_staff, registrar_llegada_mesa  → sec_04
--   solicitud_crear, rsvp_crear, registrar_acceso   → sec_05

create or replace function jardines.confirmar_evento(evt uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare n integer;
begin
  update jardines.eventos
     set confirmado_cliente = true
   where id = evt and auth_user_id = auth.uid();
  get diagnostics n = row_count;

  perform jardines_private.auditar('confirmar_evento',
    case when n > 0 then 'ok' else 'denegado' end, 'eventos', evt, evt);
end $$;

revoke all on function jardines.confirmar_evento(uuid) from public, anon, authenticated;
grant execute on function jardines.confirmar_evento(uuid) to authenticated;

create or replace function jardines.auditar_cambio_operativo()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;
begin
  v_id := case
            when tg_table_name = 'operativo_personal' then coalesce(new.id, old.id)
            else null
          end;

  perform jardines_private.auditar(
    'cambio_' || tg_table_name, 'ok', tg_table_name, v_id,
    case when tg_table_name = 'operativo_asignacion' then coalesce(new.evento_id, old.evento_id) end,
    null,
    jsonb_build_object('op', tg_op));

  return coalesce(new, old);
end $$;

revoke all on function jardines.auditar_cambio_operativo() from public, anon, authenticated;

drop trigger if exists trg_aud_operativo_personal on jardines.operativo_personal;
create trigger trg_aud_operativo_personal
  after insert or update or delete on jardines.operativo_personal
  for each row execute function jardines.auditar_cambio_operativo();

drop trigger if exists trg_aud_operativo_personal_canal on jardines.operativo_personal_canal;
create trigger trg_aud_operativo_personal_canal
  after insert or update or delete on jardines.operativo_personal_canal
  for each row execute function jardines.auditar_cambio_operativo();

drop trigger if exists trg_aud_operativo_asignacion on jardines.operativo_asignacion;
create trigger trg_aud_operativo_asignacion
  after insert or update or delete on jardines.operativo_asignacion
  for each row execute function jardines.auditar_cambio_operativo();

drop trigger if exists trg_aud_operativo_canales on jardines.operativo_canales;
create trigger trg_aud_operativo_canales
  after insert or update or delete on jardines.operativo_canales
  for each row execute function jardines.auditar_cambio_operativo();

-- Lectura de la bitácora: solo admin, y solo lectura.
create or replace function jardines.auditoria_reciente(p_limite integer default 100)
returns table (
  ocurrido_at timestamptz, accion text, entidad text,
  entidad_id uuid, evento_id uuid, actor_uid uuid, resultado text, detalle jsonb
) language plpgsql security definer set search_path = ''
as $$
begin
  if not jardines.is_admin() then
    perform jardines_private.error_generico();
  end if;

  return query
    select a.ocurrido_at, a.accion, a.entidad, a.entidad_id, a.evento_id,
           a.actor_uid, a.resultado, a.detalle
    from jardines_private.auditoria a
    order by a.ocurrido_at desc
    limit least(greatest(coalesce(p_limite, 100), 1), 500);
end $$;

revoke all on function jardines.auditoria_reciente(integer) from public, anon, authenticated;
grant execute on function jardines.auditoria_reciente(integer) to authenticated;
