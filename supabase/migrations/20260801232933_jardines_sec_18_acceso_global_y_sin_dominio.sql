-- jardines_sec_18 — Regresión operativa de sec_14 + fin de la confianza en dominios
--
-- (A) sec_14 dejó el acceso fail-closed (correcto), pero producción tenía 3
--     operativos con 0 asignaciones y NO existe interfaz para asignarlos: se
--     habrían quedado sin acceso en el próximo evento. El modelo real es un
--     salón que opera un evento a la vez con plantilla fija, así que se les
--     concede `acceso_global` EXPLÍCITO y auditado. No se vuelve al implícito
--     "sin asignación = todo": el personal nuevo nace con acceso_global=false.
--
-- (B) handle_new_user ya no infiere pertenencia del dominio del correo. Bastaba
--     registrarse con @portal.jardines.local para provocar un perfil de Jardines.
do $$
declare v_n integer;
begin
  update jardines.operativo_personal p
     set acceso_global = true
   where p.activo and not p.acceso_global
     and p.created_at < timestamptz '2026-08-02'
     and not exists (select 1 from jardines.operativo_asignacion a
                     where a.personal_id = p.id and a.revocada_at is null);
  get diagnostics v_n = row_count;
  perform jardines_private.auditar('acceso_global_concedido','ok','operativo_personal',null,null,null,
    jsonb_build_object('personas',v_n,'migracion','jardines_sec_18',
      'motivo','plantilla fija preexistente; sec_14 los habria dejado sin acceso'));
end $$;

create or replace function jardines.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_apro jardines_private.aprovisionamiento; v_rol text;
begin
  select * into v_apro from jardines_private.aprovisionamiento a
   where lower(a.email) = lower(coalesce(new.email,''))
     and a.consumido_at is null and a.expira_at > now() limit 1;

  -- Solo dos señales, ambas server-side. El dominio del correo YA NO cuenta:
  -- es un dato que elige quien se registra.
  if v_apro.id is null and coalesce(new.raw_app_meta_data ->> 'app','') <> 'jardines' then
    return new;
  end if;

  v_rol := coalesce(v_apro.rol,'cliente');
  if v_rol not in ('cliente','operativo','admin') then v_rol := 'cliente'; end if;

  insert into jardines.perfiles (user_id, rol, nombre, email)
  values (new.id, v_rol, new.raw_user_meta_data ->> 'nombre', new.email)
  on conflict (user_id) do nothing;

  if v_apro.id is not null then
    update jardines_private.aprovisionamiento set consumido_at = now() where id = v_apro.id;
  end if;

  perform jardines_private.auditar('alta_usuario','ok','perfiles',new.id,null,null,
    jsonb_build_object('rol',v_rol,'via',
      case when v_apro.id is not null then 'aprovisionamiento' else 'app_metadata' end));
  return new;
exception when others then
  -- auth.users se comparte con Vero: este trigger jamás debe impedir un alta.
  perform jardines_private.auditar('alta_usuario','error','perfiles',new.id,null,null,
    jsonb_build_object('sqlstate',sqlstate));
  return new;
end $$;

drop function if exists jardines_private.es_dominio_jardines(text);
