-- jardines_sec_16 — Enlace de primer acceso: único, corto, de un solo uso
--
-- HALLAZGO: el correo de bienvenida llevaba la contraseña en texto claro Y un
-- "link mágico" con base64(usuario:contraseña). Base64 no es cifrado: quien
-- viera el correo reenviado, una captura o el historial se quedaba con la
-- credencial permanente del cliente.
create table if not exists jardines_private.acceso_unico (
  token_hash text primary key,
  user_id    uuid not null,
  proposito  text not null check (proposito in ('primer_acceso_cliente','primer_acceso_admin')),
  creado_at  timestamptz not null default now(),
  expira_at  timestamptz not null,
  usado_at   timestamptz
);
alter table jardines_private.acceso_unico enable row level security;
create index if not exists acceso_unico_expira_idx on jardines_private.acceso_unico (expira_at);
create index if not exists acceso_unico_user_idx   on jardines_private.acceso_unico (user_id);

create or replace function jardines.crear_acceso_unico(p_user_id uuid, p_proposito text, p_horas integer default 72)
returns text language plpgsql security definer set search_path = ''
as $$
declare v_token text;
begin
  if p_proposito not in ('primer_acceso_cliente','primer_acceso_admin') then
    raise exception 'proposito invalido';
  end if;
  delete from jardines_private.acceso_unico where expira_at < now();
  -- Un alta nueva invalida cualquier enlace anterior del mismo usuario.
  update jardines_private.acceso_unico set usado_at = now()
   where user_id = p_user_id and usado_at is null;
  v_token := jardines_private.token_seguro();
  insert into jardines_private.acceso_unico (token_hash, user_id, proposito, expira_at)
  values (jardines_private.hash_clave('acceso:' || v_token), p_user_id, p_proposito,
          now() + make_interval(hours => greatest(coalesce(p_horas,72),1)));
  perform jardines_private.auditar('acceso_unico_emitido','ok','perfiles',p_user_id,null,null,
    jsonb_build_object('proposito', p_proposito));
  return v_token;  -- única vez que existe fuera del hash
end $$;
revoke all on function jardines.crear_acceso_unico(uuid, text, integer) from public, anon, authenticated;
grant execute on function jardines.crear_acceso_unico(uuid, text, integer) to service_role;

-- UPDATE ... WHERE usado_at IS NULL ... RETURNING es atómico: dos canjes
-- simultáneos no pueden ganar los dos.
create or replace function jardines.canjear_acceso_unico(p_token text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid;
begin
  if coalesce(trim(p_token),'') = '' then return null; end if;
  update jardines_private.acceso_unico set usado_at = now()
   where token_hash = jardines_private.hash_clave('acceso:' || p_token)
     and usado_at is null and expira_at > now()
  returning user_id into v_uid;
  perform jardines_private.auditar('acceso_unico_canjeado',
    case when v_uid is null then 'denegado' else 'ok' end,'perfiles',v_uid);
  return v_uid;
end $$;
revoke all on function jardines.canjear_acceso_unico(text) from public, anon, authenticated;
grant execute on function jardines.canjear_acceso_unico(text) to service_role;

create or replace function jardines.revocar_acceso_unico(p_user_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  update jardines_private.acceso_unico set usado_at = now()
   where user_id = p_user_id and usado_at is null;
  perform jardines_private.auditar('acceso_unico_revocado','ok','perfiles',p_user_id);
end $$;
revoke all on function jardines.revocar_acceso_unico(uuid) from public, anon, authenticated;
grant execute on function jardines.revocar_acceso_unico(uuid) to service_role;

-- Un alta fallida no puede dejar viva una concesión de admin durante 7 días.
create or replace function jardines.revocar_aprovisionamiento(p_email text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  update jardines_private.aprovisionamiento set consumido_at = now()
   where lower(email) = lower(trim(p_email)) and consumido_at is null;
  perform jardines_private.auditar('aprovisionamiento_revocado','ok','aprovisionamiento',null,null,
    jardines_private.hash_clave(lower(trim(p_email))));
end $$;
revoke all on function jardines.revocar_aprovisionamiento(text) from public, anon, authenticated;
grant execute on function jardines.revocar_aprovisionamiento(text) to service_role;
