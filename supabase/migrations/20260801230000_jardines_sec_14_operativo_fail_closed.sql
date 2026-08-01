-- jardines_sec_14 — El aislamiento operativo pasa a fail-closed
--
-- HALLAZGO: sec_03 leía "sin filas de asignación" como "puede operar cualquier
-- evento activo". Eso es fail-OPEN: la ausencia de un dato concedía permiso
-- universal. Ahora sin asignación = cero eventos, y el alcance global es un
-- permiso explícito y auditable (`acceso_global`), no un efecto secundario.
alter table jardines.operativo_asignacion add column if not exists revocada_at timestamptz;
alter table jardines.operativo_personal   add column if not exists acceso_global boolean not null default false;

create or replace function jardines_private.operativo_eventos_permitidos()
returns setof uuid language sql stable security definer set search_path = ''
as $$
  select e.id
  from jardines.eventos e
  where e.operativo_activo = true
    and jardines.mi_personal_id() is not null
    and (
      exists (select 1 from jardines.operativo_asignacion a
              where a.personal_id = jardines.mi_personal_id()
                and a.evento_id = e.id and a.revocada_at is null)
      or exists (select 1 from jardines.operativo_personal p
                 where p.id = jardines.mi_personal_id()
                   and p.activo = true and p.acceso_global = true)
    );
$$;

-- Los canales solo sirven mientras haya algún evento permitido: una membresía
-- olvidada de un evento pasado deja de dar acceso por sí sola.
create or replace function jardines.mis_canales()
returns setof uuid language sql stable security definer set search_path = ''
as $$
  select pc.canal_id from jardines.operativo_personal_canal pc
  where pc.personal_id = jardines.mi_personal_id()
    and exists (select 1 from jardines_private.operativo_eventos_permitidos());
$$;

create or replace function jardines.mis_canales_escuchar()
returns setof uuid language sql stable security definer set search_path = ''
as $$
  select pc.canal_id from jardines.operativo_personal_canal pc
  where pc.personal_id = jardines.mi_personal_id() and pc.puede_escuchar
    and exists (select 1 from jardines_private.operativo_eventos_permitidos());
$$;

create or replace function jardines.mis_canales_hablar()
returns setof uuid language sql stable security definer set search_path = ''
as $$
  select pc.canal_id from jardines.operativo_personal_canal pc
  where pc.personal_id = jardines.mi_personal_id() and pc.puede_hablar
    and exists (select 1 from jardines_private.operativo_eventos_permitidos());
$$;

drop policy if exists op_asig_sel on jardines.operativo_asignacion;
create policy op_asig_sel on jardines.operativo_asignacion
  as permissive for select to authenticated
  using (jardines.es_admin()
         or (personal_id = jardines.mi_personal_id() and revocada_at is null));
