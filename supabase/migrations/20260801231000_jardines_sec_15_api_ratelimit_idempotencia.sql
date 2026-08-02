-- jardines_sec_15 — Rate limit e idempotencia para las rutas serverless
--
-- Las funciones de api/ corren con service_role y necesitan los mismos controles
-- que ya tienen las RPC. Se exponen envoltorios EXCLUSIVOS de service_role para
-- que la ruta HTTP no pueda saltarse el control llamando directo a la base.
create table if not exists jardines_private.idempotencia (
  clave_hash text primary key,
  endpoint   text not null,
  creado_at  timestamptz not null default now(),
  expira_at  timestamptz not null,
  resultado  jsonb
);
alter table jardines_private.idempotencia enable row level security;
create index if not exists idempotencia_expira_idx on jardines_private.idempotencia (expira_at);

-- INSERT ... ON CONFLICT DO NOTHING es atómico: dos reintentos simultáneos no
-- pueden reclamar la misma clave.
create or replace function jardines.api_idempotencia(p_endpoint text, p_clave text, p_horas integer default 24)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_hash text; v_ins integer;
begin
  delete from jardines_private.idempotencia where expira_at < now();
  v_hash := jardines_private.hash_clave('idem:' || p_endpoint || ':' || coalesce(p_clave, ''));
  insert into jardines_private.idempotencia (clave_hash, endpoint, expira_at)
  values (v_hash, p_endpoint, now() + make_interval(hours => greatest(coalesce(p_horas,24),1)))
  on conflict (clave_hash) do nothing;
  get diagnostics v_ins = row_count;
  return v_ins = 1;
end $$;
revoke all on function jardines.api_idempotencia(text, text, integer) from public, anon, authenticated;
grant execute on function jardines.api_idempotencia(text, text, integer) to service_role;

create or replace function jardines.api_rate_limit(p_bucket text, p_clave text, p_max integer, p_segundos integer)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  return jardines_private.rate_limit_consumir('api:' || p_bucket, coalesce(p_clave,'global'),
    greatest(coalesce(p_max,1),1), make_interval(secs => greatest(coalesce(p_segundos,60),1)));
end $$;
revoke all on function jardines.api_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function jardines.api_rate_limit(text, text, integer, integer) to service_role;

create or replace function jardines.api_auditar(p_accion text, p_resultado text, p_entidad text default null,
  p_entidad_id uuid default null, p_evento_id uuid default null, p_detalle jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  perform jardines_private.auditar(p_accion, p_resultado, p_entidad, p_entidad_id, p_evento_id, null, p_detalle);
end $$;
revoke all on function jardines.api_auditar(text, text, text, uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function jardines.api_auditar(text, text, text, uuid, uuid, jsonb) to service_role;
