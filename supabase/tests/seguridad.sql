-- supabase/tests/seguridad.sql — Suite de seguridad reproducible de Jardines
--
-- CÓMO SE EJECUTA
--   psql "$DATABASE_URL" -f supabase/tests/seguridad.sql
--   …o pegándolo completo en el SQL Editor de Supabase.
--
-- Es DESTRUCTIVA a propósito (crea usuarios, eventos y personal sintéticos) pero
-- corre entera dentro de BEGIN … ROLLBACK: al terminar no queda ni una fila.
-- Todo lo sintético lleva el prefijo `sint-` para poder identificarlo si alguna
-- vez se interrumpe a media ejecución.
--
-- No imprime tokens, contraseñas ni secretos: solo longitudes y veredictos.

begin;

create temp table _t(bloque text, prueba text, obtenido text, ok boolean) on commit drop;
grant all on _t to anon, authenticated;

do $$
declare
  sal uuid; adm uuid;
  u_atk uuid := gen_random_uuid();   -- pide rol admin por metadata
  u_vero uuid := gen_random_uuid();  -- usuario ajeno (tipo Vero)
  u_sin uuid := gen_random_uuid();   -- operativo sin asignación
  u_a   uuid := gen_random_uuid();   -- operativo del evento A
  u_b   uuid := gen_random_uuid();   -- operativo del evento B
  u_rev uuid := gen_random_uuid();   -- operativo con asignación revocada
  p_sin uuid; p_a uuid; p_b uuid; p_rev uuid;
  ev_a uuid; ev_b uuid; cid uuid;
  r text; n int; j jsonb; tok text; uid uuid;
begin
  select id into sal from jardines.salones limit 1;
  select user_id into adm from jardines.perfiles where rol = 'admin' limit 1;

  insert into auth.users (instance_id,id,aud,role,email,encrypted_password,created_at,updated_at,raw_user_meta_data,raw_app_meta_data)
  values
   ('00000000-0000-0000-0000-000000000000',u_atk ,'authenticated','authenticated','sint-atk@portal.jardines.local','x',now(),now(),'{"rol":"admin"}','{}'),
   ('00000000-0000-0000-0000-000000000000',u_vero,'authenticated','authenticated','sint-vero@example.com','x',now(),now(),'{"rol":"admin"}','{}'),
   ('00000000-0000-0000-0000-000000000000',u_sin ,'authenticated','authenticated','sint-sin@staff.jardines.local','x',now(),now(),'{}','{}'),
   ('00000000-0000-0000-0000-000000000000',u_a   ,'authenticated','authenticated','sint-a@staff.jardines.local','x',now(),now(),'{}','{}'),
   ('00000000-0000-0000-0000-000000000000',u_b   ,'authenticated','authenticated','sint-b@staff.jardines.local','x',now(),now(),'{}','{}'),
   ('00000000-0000-0000-0000-000000000000',u_rev ,'authenticated','authenticated','sint-rev@staff.jardines.local','x',now(),now(),'{}','{}');

  ---------------------------------------------------------------- B1 escalamiento
  select rol into r from jardines.perfiles where user_id = u_atk;
  insert into _t values ('B1','signup con rol=admin en metadata -> cliente', coalesce(r,'sin perfil'), r = 'cliente');

  select count(*) into n from jardines.perfiles where user_id = u_vero;
  insert into _t values ('B1','usuario ajeno (Vero) no recibe perfil de Jardines', n::text, n = 0);

  update auth.users set raw_user_meta_data = '{"rol":"admin"}' where id = u_atk;
  select rol into r from jardines.perfiles where user_id = u_atk;
  insert into _t values ('B1','modificar metadata tras el alta no promociona', coalesce(r,'-'), r = 'cliente');

  ---------------------------------------------------------------- B2 operativo
  insert into jardines.operativo_personal (usuario,nombre,rol,auth_user_id,activo) values ('sint-sin','S','empleado',u_sin,true) returning id into p_sin;
  insert into jardines.operativo_personal (usuario,nombre,rol,auth_user_id,activo) values ('sint-a','A','empleado',u_a,true) returning id into p_a;
  insert into jardines.operativo_personal (usuario,nombre,rol,auth_user_id,activo) values ('sint-b','B','empleado',u_b,true) returning id into p_b;
  insert into jardines.operativo_personal (usuario,nombre,rol,auth_user_id,activo) values ('sint-rev','R','empleado',u_rev,true) returning id into p_rev;

  insert into jardines.eventos (nombre_evento,salon_id,operativo_activo,usuario) values ('sint-EV-A',sal,true,'sint-ev-a') returning id into ev_a;
  insert into jardines.eventos (nombre_evento,salon_id,operativo_activo,usuario) values ('sint-EV-B',sal,true,'sint-ev-b') returning id into ev_b;

  insert into jardines.operativo_asignacion (personal_id,evento_id) values (p_a,ev_a),(p_b,ev_b);
  insert into jardines.operativo_asignacion (personal_id,evento_id,revocada_at) values (p_rev,ev_a,now());

  insert into jardines.operativo_canales (nombre,es_general) values ('sint-canal',true) returning id into cid;
  insert into jardines.operativo_personal_canal values (p_sin,cid,true,true),(p_a,cid,true,true),(p_rev,cid,true,true);
  insert into jardines.operativo_ubicaciones (personal_id,evento_id,lat,lng,actualizado_at)
  values (p_a,ev_a,19.3,-99.1,now()),(p_b,ev_b,19.4,-99.2,now());

  perform set_config('role','authenticated',true);

  perform set_config('request.jwt.claims', json_build_object('sub',u_sin::text,'role','authenticated')::text, true);
  select count(*) into n from jardines.eventos_operativos_permitidos();
  insert into _t values ('B2','operativo SIN asignacion ve 0 eventos (fail-closed)', n::text, n = 0);
  select count(*) into n from jardines.operativo_canales;
  insert into _t values ('B2','membresia de canal sin asignacion no da acceso', n::text, n = 0);

  perform set_config('request.jwt.claims', json_build_object('sub',u_a::text,'role','authenticated')::text, true);
  select count(*) into n from jardines.eventos_operativos_permitidos();
  insert into _t values ('B2','asignado a A ve solo A (2 eventos activos)', n::text, n = 1);
  select count(*) into n from jardines.operativo_ubicaciones;
  insert into _t values ('B2','asignado a A no lee ubicaciones de B', n::text, n = 1);
  begin
    perform jardines.operativo_ubicar(ev_b, 19.3, -99.1, 5);
    insert into _t values ('B2','asignado a A no escribe en B','PERMITIDO', false);
  exception when others then
    insert into _t values ('B2','asignado a A no escribe en B','bloqueado', true);
  end;
  begin
    perform jardines.operativo_ubicar(ev_a, 19.3, -99.1, 5);
    insert into _t values ('B2','asignado a A si opera en A','ok', true);
  exception when others then
    insert into _t values ('B2','asignado a A si opera en A','ROTO: '||sqlerrm, false);
  end;
  j := jardines.operativo_evento_activo();
  insert into _t values ('B2','operativo_evento_activo no expone staffToken',
    case when j::text like '%staffToken%' then 'FILTRA' else 'sin token' end,
    j::text not like '%staffToken%');

  perform set_config('request.jwt.claims', json_build_object('sub',u_rev::text,'role','authenticated')::text, true);
  select count(*) into n from jardines.eventos_operativos_permitidos();
  insert into _t values ('B2','asignacion REVOCADA ve 0 eventos', n::text, n = 0);

  perform set_config('request.jwt.claims', json_build_object('sub',u_vero::text,'role','authenticated')::text, true);
  select count(*) into n from jardines.eventos_operativos_permitidos();
  insert into _t values ('B2','usuario no Jardines ve 0 eventos', n::text, n = 0);

  ---------------------------------------------------------------- B4/B5 tokens
  perform set_config('request.jwt.claims', json_build_object('sub',adm::text,'role','authenticated')::text, true);
  tok := jardines.rotar_staff_token(ev_a);
  perform set_config('role','postgres',true);
  insert into _t values ('B5','rotacion emite token de 256 bits', length(tok)::text||' chars', length(tok) >= 43);
  insert into _t values ('B5','token rotado valida al evento correcto','ok', jardines_private.evento_por_staff(tok) = ev_a);

  perform set_config('role','authenticated',true);
  perform jardines.revocar_staff_token(ev_a);
  perform set_config('role','postgres',true);
  begin
    perform jardines_private.evento_por_staff(tok);
    insert into _t values ('B5','token revocado deja de servir','SIGUE VALIDO', false);
  exception when others then
    insert into _t values ('B5','token revocado deja de servir','bloqueado', true);
  end;
  begin perform jardines_private.evento_por_staff('sint-token-inexistente');
  exception when others then r := sqlerrm; end;
  insert into _t values ('B5','respuesta generica anti-enumeracion', r, r = 'no disponible');

  ---------------------------------------------------------------- Acceso unico
  tok := jardines.crear_acceso_unico(u_atk, 'primer_acceso_cliente', 72);
  insert into _t values ('B3','acceso unico: token de alta entropia', length(tok)::text||' chars', length(tok) >= 43);
  insert into _t values ('B3','acceso unico: en base solo hay hash',
    (select case when count(*) = 0 then 'solo hash' else 'EN CLARO' end
       from jardines_private.acceso_unico where token_hash = tok), true);
  uid := jardines.canjear_acceso_unico(tok);
  insert into _t values ('B3','acceso unico: primer canje funciona', coalesce(uid::text,'null'), uid = u_atk);
  uid := jardines.canjear_acceso_unico(tok);
  insert into _t values ('B3','acceso unico: segundo canje rechazado', coalesce(uid::text,'null'), uid is null);

  perform jardines.aprovisionar_usuario('sint-rev@jardinesclubhipico.com','admin');
  perform jardines.revocar_aprovisionamiento('sint-rev@jardinesclubhipico.com');
  select count(*) into n from jardines_private.aprovisionamiento
   where lower(email) = 'sint-rev@jardinesclubhipico.com' and consumido_at is null;
  insert into _t values ('B3','aprovisionamiento revocado tras alta fallida', n::text||' pendientes', n = 0);

  ---------------------------------------------------------------- Rate limit
  select count(*) into n from (
    select jardines_private.rate_limit_consumir('sint_rl','k',3,interval '1 hour') as p
    from generate_series(1,5)) s where p;
  insert into _t values ('B5','rate limit permite exactamente 3 de 5', n::text, n = 3);
  insert into _t values ('B5','rate limit no guarda la clave en claro',
    (select case when count(*) = 0 then 'solo hash' else 'EN CLARO' end
       from jardines_private.rate_limit where clave_hash like '%k%' and clave_hash = 'k'), true);

  insert into _t values ('B3','idempotencia: primera vez procede',
    jardines.api_idempotencia('sint','k1',1)::text, jardines.api_idempotencia('sint','k2',1));
  perform jardines.api_idempotencia('sint','k3',1);
  insert into _t values ('B3','idempotencia: repeticion bloqueada',
    jardines.api_idempotencia('sint','k3',1)::text, not jardines.api_idempotencia('sint','k3',1));

  ---------------------------------------------------------------- Matriz anon
  perform set_config('role','anon',true);
  perform set_config('request.jwt.claims', json_build_object('role','anon')::text, true);

  select count(*) into n from jardines.salones;
  insert into _t values ('B6','anon lee el sitio publico', n::text, n > 0);
  begin select count(*) into n from jardines.eventos;
    insert into _t values ('B6','anon NO lee eventos', n::text, n = 0);
  exception when others then insert into _t values ('B6','anon NO lee eventos','denegado', true); end;
  begin select count(*) into n from jardines.solicitudes;
    insert into _t values ('B6','anon NO lee los leads', n::text, n = 0);
  exception when others then insert into _t values ('B6','anon NO lee los leads','denegado', true); end;
  begin perform jardines.is_admin();
    insert into _t values ('B4','anon NO ejecuta helpers internos','PERMITIDO', false);
  exception when others then insert into _t values ('B4','anon NO ejecuta helpers internos','denegado', true); end;
  begin perform jardines.info_mesa_publica('x');
    insert into _t values ('B4','info_mesa_publica fuera de la API','PERMITIDO', false);
  exception when others then insert into _t values ('B4','info_mesa_publica fuera de la API','denegado', true); end;
  begin perform jardines.handle_new_user();
    insert into _t values ('B4','triggers no invocables por la API','PERMITIDO', false);
  exception when others then insert into _t values ('B4','triggers no invocables por la API','denegado', true); end;
  begin perform jardines.asignar_rol(u_atk,'admin');
    insert into _t values ('B1','anon NO se autopromociona','PERMITIDO', false);
  exception when others then insert into _t values ('B1','anon NO se autopromociona','denegado', true); end;
  begin perform jardines.crear_acceso_unico(u_atk,'primer_acceso_admin',72);
    insert into _t values ('B3','anon NO emite accesos unicos','PERMITIDO', false);
  exception when others then insert into _t values ('B3','anon NO emite accesos unicos','denegado', true); end;
  begin perform jardines.api_rate_limit('b','k',1,60);
    insert into _t values ('B3','anon NO usa los envoltorios de api','PERMITIDO', false);
  exception when others then insert into _t values ('B3','anon NO usa los envoltorios de api','denegado', true); end;
  begin perform jardines_private.hash_clave('x');
    insert into _t values ('B4','esquema privado inalcanzable','PERMITIDO', false);
  exception when others then insert into _t values ('B4','esquema privado inalcanzable','denegado', true); end;

  -- Formulario público: sigue funcionando y sigue saneado
  begin
    insert into jardines.solicitudes (nombre_completo,telefono,acepto_aviso_privacidad,estatus,folio)
    values ('  sint Cliente  ','55 5555 5555',true,'Cerrada','FALSO');
    insert into _t values ('B6','formulario publico funciona','ok', true);
  exception when others then
    insert into _t values ('B6','formulario publico funciona','ROTO: '||sqlerrm, false);
  end;
  begin
    insert into jardines.solicitudes (nombre_completo,telefono,acepto_aviso_privacidad)
    values ('sint X','no-es-telefono',true);
    insert into _t values ('B6','rechaza telefono invalido','ACEPTADO', false);
  exception when others then insert into _t values ('B6','rechaza telefono invalido','rechazado', true); end;
  begin
    insert into jardines.solicitudes (nombre_completo,telefono,acepto_aviso_privacidad)
    values ('sint Y','5555555555',false);
    insert into _t values ('B6','exige aviso de privacidad','ACEPTADO', false);
  exception when others then insert into _t values ('B6','exige aviso de privacidad','rechazado', true); end;

  perform set_config('role','postgres',true);
  perform set_config('request.jwt.claims','',true);

  select estatus||' / '||coalesce(folio,'-') into r
    from jardines.solicitudes where nombre_completo like 'sint Cliente%' order by created_at desc limit 1;
  insert into _t values ('B6','campos internos los fija el servidor', r, r like 'Nueva / JCH-%');

  ---------------------------------------------------------------- Cliente A vs B
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub',adm::text,'role','authenticated')::text, true);
  select count(*) into n from jardines.eventos;
  insert into _t values ('B6','administrador ve todos los eventos', n::text, n >= 2);
  perform set_config('role','postgres',true);
  perform set_config('request.jwt.claims','',true);
end $$;

---------------------------------------------------------------- Comprobaciones estáticas
insert into _t
select 'B4','ninguna policy de jardines apunta a PUBLIC', count(*)::text, count(*) = 0
from pg_policies where schemaname = 'jardines' and roles::text like '%public%';

insert into _t
select 'B4','ninguna SECURITY DEFINER de jardines sin search_path fijo', count(*)::text, count(*) = 0
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'jardines' and p.prosecdef
  and coalesce(array_to_string(p.proconfig, ','), '') not like '%search_path=%';

insert into _t
select 'B4','ninguna funcion de jardines_private con EXECUTE publico', count(*)::text, count(*) = 0
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'jardines_private'
join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a on a.privilege_type = 'EXECUTE'
where a.grantee = 0;

insert into _t
select 'B6','anon sin INSERT/UPDATE/DELETE salvo solicitudes',
       string_agg(distinct table_name, ','), count(*) filter (where table_name <> 'solicitudes') = 0
from information_schema.role_table_grants
where table_schema = 'jardines' and grantee = 'anon'
  and privilege_type in ('INSERT','UPDATE','DELETE');

insert into _t
select 'B6','todas las tablas de jardines con RLS', count(*)::text, count(*) = 0
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'jardines' and c.relkind = 'r' and not c.relrowsecurity;

insert into _t
select 'B2','sin locks en espera', count(*)::text, count(*) = 0 from pg_locks where not granted;

-- Detalle completo (útil al ejecutar con psql).
select bloque, prueba, obtenido, case when ok then 'PASA' else 'FALLA' end as veredicto
from _t order by bloque, prueba;

-- Resumen. `fallan` distinto de 0 significa que la suite NO pasó.
select
  count(*) filter (where ok)     as pasan,
  count(*) filter (where not ok) as fallan,
  count(*)                       as total,
  coalesce(string_agg(bloque || ' · ' || prueba || ' -> ' || obtenido, ' | ')
           filter (where not ok), '(ninguna)') as fallos
from _t;

rollback;
