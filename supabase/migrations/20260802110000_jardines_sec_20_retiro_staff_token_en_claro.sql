-- jardines_sec_20 — Retiro definitivo del token de staff en claro
--
-- Se aplica DESPUÉS de que el panel dejó de leer `evento.staffToken` (desplegado
-- en el merge #1). Reconfirmado antes de aplicar: 0 eventos operativamente
-- activos, 0 eventos en los próximos 7 días, 0 mesas, 0 invitaciones, el único
-- token vigente ya tenía hash y ninguna vista ni función ajena leía la columna.
update jardines.eventos
   set staff_token_hash = jardines_private.hash_clave('staff:' || staff_token)
 where staff_token is not null and staff_token_hash is null;

create or replace function jardines_private.evento_por_staff(p_staff text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_ev jardines.eventos; v_hash text;
begin
  if coalesce(trim(p_staff), '') = '' then
    perform jardines_private.fallo_token('staff');
    perform jardines_private.error_generico();
  end if;
  if jardines_private.fallos_excedidos('staff') then
    perform jardines_private.auditar('staff_token_uso','denegado','eventos',null,null,
      jardines_private.hash_clave(p_staff), jsonb_build_object('motivo','rate_limit'));
    perform jardines_private.error_generico();
  end if;

  v_hash := jardines_private.hash_clave('staff:' || p_staff);
  select * into v_ev from jardines.eventos e where e.staff_token_hash = v_hash;

  -- Inexistente, revocado y expirado responden EXACTAMENTE igual.
  if v_ev.id is null
     or v_ev.staff_token_revocado_at is not null
     or (v_ev.staff_token_expira is not null and v_ev.staff_token_expira < now()) then
    perform jardines_private.fallo_token('staff');
    perform jardines_private.auditar('staff_token_uso','denegado','eventos',v_ev.id,v_ev.id,
      jardines_private.hash_clave(p_staff), jsonb_build_object('motivo','invalido'));
    perform jardines_private.error_generico();
  end if;

  if not jardines_private.rate_limit_consumir('staff_ok', v_hash, 300, interval '1 minute') then
    perform jardines_private.auditar('staff_token_uso','denegado','eventos',v_ev.id,v_ev.id,
      jardines_private.hash_clave(p_staff), jsonb_build_object('motivo','rate_limit_token'));
    perform jardines_private.error_generico();
  end if;
  return v_ev.id;
end $$;

create or replace function jardines.rotar_staff_token(p_evento uuid, p_dias integer default null)
returns text language plpgsql security definer set search_path = ''
as $$
declare v_token text; v_expira timestamptz; v_fecha date;
begin
  if not jardines.is_admin() then
    perform jardines_private.auditar('staff_token_rotar','denegado','eventos',p_evento,p_evento);
    perform jardines_private.error_generico();
  end if;
  select e.fecha_evento into v_fecha from jardines.eventos e where e.id = p_evento;
  if not found then perform jardines_private.error_generico(); end if;

  v_token  := jardines_private.token_seguro();
  v_expira := case
                when p_dias is not null then now() + make_interval(days => p_dias)
                when v_fecha is not null then (v_fecha + interval '2 days')::timestamptz
                else now() + interval '30 days' end;

  update jardines.eventos
     set staff_token_hash        = jardines_private.hash_clave('staff:' || v_token),
         staff_token_expira      = v_expira,
         staff_token_revocado_at = null,
         staff_token_rotado_at   = now()
   where id = p_evento;

  perform jardines_private.auditar('staff_token_rotar','ok','eventos',p_evento,p_evento,
    jardines_private.hash_clave(v_token), jsonb_build_object('expira',v_expira));
  return v_token;   -- única vez que el token existe fuera del hash
end $$;

drop trigger  if exists trg_sync_staff_token_hash on jardines.eventos;
drop function if exists jardines.sync_staff_token_hash();
alter table jardines.eventos drop column if exists staff_token;
