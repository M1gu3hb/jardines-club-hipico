-- jardines_sec_04 — Tokens de staff: hash, expiración, rotación, revocación,
--                    rate limit, auditoría y respuestas sin enumeración.
--
-- SITUACIÓN PREVIA
--   eventos.staff_token era un UUID v4 en claro, sin expiración, sin forma de
--   revocarlo ni rotarlo, sin rate limit y sin registro de uso. Cualquiera que lo
--   viera (foto del QR, historial del navegador, captura del chat donde se compartió)
--   quedaba con acceso permanente a las operaciones de staff de ese evento.
--   Además los errores distinguían "QR no reconocido" de "no autorizado para este
--   evento", lo que permitía enumerar mesas e invitaciones evento por evento.
--
-- COMPATIBILIDAD (ventana documentada)
--   Los QR y enlaces vigentes NO se rompen. Se guarda el hash como vía principal de
--   validación y se conserva la columna en claro como SEGUNDA lectura, para que el
--   panel pueda seguir mostrando y recompartiendo el enlace actual.
--   El retiro de la columna en claro va en la migración `..._sec_11_retiro_compat`,
--   que queda ESCRITA PERO NO APLICADA hasta validar el flujo nuevo en la interfaz.

-- ---------------------------------------------------------------------------
-- Generador de tokens de alta entropía (256 bits, url-safe)
-- ---------------------------------------------------------------------------
create or replace function jardines_private.token_seguro()
returns text
language sql
volatile
security definer
set search_path = ''
as $$
  select rtrim(translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/', '-_'), '=');
$$;

-- ---------------------------------------------------------------------------
-- Estado del token de staff en el evento
-- ---------------------------------------------------------------------------
alter table jardines.eventos add column if not exists staff_token_hash       text;
alter table jardines.eventos add column if not exists staff_token_expira     timestamptz;
alter table jardines.eventos add column if not exists staff_token_revocado_at timestamptz;
alter table jardines.eventos add column if not exists staff_token_rotado_at  timestamptz;

create unique index if not exists eventos_staff_token_hash_key
  on jardines.eventos (staff_token_hash) where staff_token_hash is not null;

-- Backfill de los tokens ya emitidos: se calcula su hash y se les da una vigencia
-- holgada (2 días después del evento) para no invalidar nada que esté en circulación.
update jardines.eventos
   set staff_token_hash = jardines_private.hash_clave('staff:' || staff_token),
       staff_token_expira = coalesce(staff_token_expira,
                                     (fecha_evento + interval '2 days')::timestamptz,
                                     now() + interval '90 days')
 where staff_token is not null
   and staff_token_hash is null;

-- ---------------------------------------------------------------------------
-- Registro de intentos fallidos (anti-enumeración)
-- ---------------------------------------------------------------------------
-- La clave es la IP que declara el gateway de Supabase, NUNCA un campo del body.
-- Si no hay IP disponible se cae a un cubo global con umbral alto: acota una
-- enumeración masiva sin que un solo atacante pueda dejar fuera a todo el mundo.
create or replace function jardines_private.fallo_token(p_accion text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_ip text;
begin
  v_ip := jardines_private.ip_solicitante();
  if v_ip is not null then
    perform jardines_private.rate_limit_consumir('fallo:' || p_accion, v_ip, 10, interval '10 minutes');
  else
    perform jardines_private.rate_limit_consumir('fallo_global:' || p_accion, 'global', 200, interval '10 minutes');
  end if;
end $$;

create or replace function jardines_private.fallos_excedidos(p_accion text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_ip text; v_n integer;
begin
  v_ip := jardines_private.ip_solicitante();
  select rl.intentos into v_n
  from jardines_private.rate_limit rl
  where rl.bucket = case when v_ip is not null then 'fallo:' || p_accion else 'fallo_global:' || p_accion end
    and rl.clave_hash = jardines_private.hash_clave(
          (case when v_ip is not null then 'fallo:' || p_accion else 'fallo_global:' || p_accion end)
          || ':' || coalesce(v_ip, 'global'))
    and rl.ventana_inicio = date_bin(interval '10 minutes', now(), timestamptz 'epoch');
  return coalesce(v_n, 0) > (case when v_ip is not null then 10 else 200 end);
end $$;

-- ---------------------------------------------------------------------------
-- Validación del token de staff — única puerta de entrada
-- ---------------------------------------------------------------------------
-- Devuelve el evento_id o lanza SIEMPRE el mismo error genérico. Quien llama no
-- puede distinguir "no existe" de "expiró" de "revocado" de "bloqueado por límite".
create or replace function jardines_private.evento_por_staff(p_staff text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ev     jardines.eventos;
  v_hash   text;
begin
  if coalesce(trim(p_staff), '') = '' then
    perform jardines_private.fallo_token('staff');
    perform jardines_private.error_generico();
  end if;

  -- Si esta IP ya quemó su cuota de fallos, ni siquiera se consulta la tabla.
  if jardines_private.fallos_excedidos('staff') then
    perform jardines_private.auditar('staff_token_uso', 'denegado', 'eventos', null, null,
      jardines_private.hash_clave(p_staff), jsonb_build_object('motivo', 'rate_limit'));
    perform jardines_private.error_generico();
  end if;

  v_hash := jardines_private.hash_clave('staff:' || p_staff);

  -- 1) Vía principal: comparación sobre el hash (nunca sobre el secreto en claro).
  select * into v_ev from jardines.eventos e where e.staff_token_hash = v_hash;

  -- 2) Doble lectura de compatibilidad: tokens emitidos antes de esta migración
  --    que todavía no tuvieran hash calculado.
  if v_ev.id is null then
    select * into v_ev from jardines.eventos e
     where e.staff_token = p_staff and e.staff_token is not null;
  end if;

  if v_ev.id is null then
    perform jardines_private.fallo_token('staff');
    perform jardines_private.auditar('staff_token_uso', 'denegado', 'eventos', null, null,
      jardines_private.hash_clave(p_staff), jsonb_build_object('motivo', 'desconocido'));
    perform jardines_private.error_generico();
  end if;

  if v_ev.staff_token_revocado_at is not null then
    perform jardines_private.fallo_token('staff');
    perform jardines_private.auditar('staff_token_uso', 'denegado', 'eventos', v_ev.id, v_ev.id,
      jardines_private.hash_clave(p_staff), jsonb_build_object('motivo', 'revocado'));
    perform jardines_private.error_generico();
  end if;

  if v_ev.staff_token_expira is not null and v_ev.staff_token_expira < now() then
    perform jardines_private.fallo_token('staff');
    perform jardines_private.auditar('staff_token_uso', 'denegado', 'eventos', v_ev.id, v_ev.id,
      jardines_private.hash_clave(p_staff), jsonb_build_object('motivo', 'expirado'));
    perform jardines_private.error_generico();
  end if;

  -- Techo de uso por token: un turno de meseros escanea decenas de QR, no miles.
  if not jardines_private.rate_limit_consumir('staff_ok', v_hash, 300, interval '1 minute') then
    perform jardines_private.auditar('staff_token_uso', 'denegado', 'eventos', v_ev.id, v_ev.id,
      jardines_private.hash_clave(p_staff), jsonb_build_object('motivo', 'rate_limit_token'));
    perform jardines_private.error_generico();
  end if;

  return v_ev.id;
end $$;

-- ---------------------------------------------------------------------------
-- Rotación y revocación (solo admin autenticado)
-- ---------------------------------------------------------------------------
-- Devuelve el token nuevo UNA vez. Se guarda el hash y, durante la ventana de
-- compatibilidad, también la columna en claro para que el panel pueda recompartir
-- el enlace sin obligar a rotarlo cada vez.
create or replace function jardines.rotar_staff_token(
  p_evento uuid,
  p_dias   integer default null
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token  text;
  v_expira timestamptz;
  v_fecha  date;
begin
  if not jardines.is_admin() then
    perform jardines_private.auditar('staff_token_rotar', 'denegado', 'eventos', p_evento, p_evento);
    perform jardines_private.error_generico();
  end if;

  select e.fecha_evento into v_fecha from jardines.eventos e where e.id = p_evento;
  if not found then
    perform jardines_private.error_generico();
  end if;

  v_token  := jardines_private.token_seguro();
  v_expira := case
                when p_dias is not null then now() + make_interval(days => p_dias)
                when v_fecha is not null then (v_fecha + interval '2 days')::timestamptz
                else now() + interval '30 days'
              end;

  update jardines.eventos
     set staff_token          = v_token,
         staff_token_hash     = jardines_private.hash_clave('staff:' || v_token),
         staff_token_expira   = v_expira,
         staff_token_revocado_at = null,
         staff_token_rotado_at = now()
   where id = p_evento;

  -- Nunca se registra el token completo: solo su hash irreversible.
  perform jardines_private.auditar('staff_token_rotar', 'ok', 'eventos', p_evento, p_evento,
    jardines_private.hash_clave(v_token), jsonb_build_object('expira', v_expira));

  return v_token;
end $$;

create or replace function jardines.revocar_staff_token(p_evento uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not jardines.is_admin() then
    perform jardines_private.auditar('staff_token_revocar', 'denegado', 'eventos', p_evento, p_evento);
    perform jardines_private.error_generico();
  end if;

  update jardines.eventos
     set staff_token_revocado_at = now()
   where id = p_evento;

  perform jardines_private.auditar('staff_token_revocar', 'ok', 'eventos', p_evento, p_evento);
end $$;

-- ---------------------------------------------------------------------------
-- RPCs de staff reescritas sobre la validación única
-- ---------------------------------------------------------------------------
create or replace function jardines.progreso_mesas_staff(p_staff text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_evento uuid; v_nombre text; res jsonb; treg int := 0; tcap int := 0;
begin
  v_evento := jardines_private.evento_por_staff(p_staff);
  select e.nombre_evento into v_nombre from jardines.eventos e where e.id = v_evento;

  select coalesce(jsonb_agg(x order by x ->> 'nombre'), '[]'::jsonb),
         coalesce(sum((x ->> 'registradas')::int), 0),
         coalesce(sum((x ->> 'capacidad')::int), 0)
    into res, treg, tcap
  from (
    select jsonb_build_object(
      'id', m.id, 'nombre', coalesce(m.nombre, 'Mesa'),
      'capacidad', coalesce(m.capacidad, 0),
      'registradas', coalesce(m.ocupadas, 0),
      'ocupadas', coalesce(m.ocupadas, 0)) as x
    from jardines.mesas m where m.evento_id = v_evento
  ) t;

  return jsonb_build_object('evento', v_nombre, 'mesas', res, 'totalReg', treg, 'totalCap', tcap);
end $$;

create or replace function jardines.info_invitacion_staff(p_staff text, p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_evento uuid; v_nombre text; inv jardines.invitaciones; m jardines.mesas;
begin
  v_evento := jardines_private.evento_por_staff(p_staff);

  select * into inv from jardines.invitaciones i
   where i.token = p_token and i.evento_id = v_evento;
  if inv.id is null then
    -- Misma respuesta que un token de staff inválido: no revela si la invitación
    -- existe en otro evento.
    perform jardines_private.fallo_token('invitacion');
    perform jardines_private.error_generico();
  end if;

  select e.nombre_evento into v_nombre from jardines.eventos e where e.id = v_evento;
  select * into m from jardines.mesas mm where mm.id = inv.mesa_id;

  return jsonb_build_object('evento', v_nombre, 'invitado', inv.nombre_invitado,
    'mesa', coalesce(m.nombre, 'Sin mesa'), 'max', inv.max_personas,
    'registradas', inv.personas_registradas, 'estatus', inv.estatus);
end $$;

create or replace function jardines.registrar_acceso_staff(p_staff text, p_token text, p_personas integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_evento uuid; inv jardines.invitaciones; m jardines.mesas;
begin
  v_evento := jardines_private.evento_por_staff(p_staff);

  if p_personas is null or p_personas < 1 or p_personas > 50 then
    raise exception 'numero de personas invalido';
  end if;

  select * into inv from jardines.invitaciones i
   where i.token = p_token and i.evento_id = v_evento for update;
  if inv.id is null then
    perform jardines_private.fallo_token('invitacion');
    perform jardines_private.error_generico();
  end if;

  if inv.personas_registradas + p_personas > inv.max_personas then
    raise exception 'excede el cupo (max %, ya %, intento %)',
      inv.max_personas, inv.personas_registradas, p_personas;
  end if;

  update jardines.invitaciones
     set personas_registradas = personas_registradas + p_personas,
         estatus = case when personas_registradas + p_personas >= max_personas
                        then 'completo' else 'parcial' end
   where id = inv.id;

  insert into jardines.accesos (invitacion_id, mesa_id, personas, registrado_por)
  values (inv.id, inv.mesa_id, p_personas, null);

  select * into m from jardines.mesas mm where mm.id = inv.mesa_id;

  perform jardines_private.auditar('registrar_acceso_staff', 'ok', 'invitaciones', inv.id, v_evento,
    jardines_private.hash_clave(p_staff), jsonb_build_object('personas', p_personas));

  return jsonb_build_object('ok', true, 'mesa', coalesce(m.nombre, 'Sin mesa'),
    'registradas', inv.personas_registradas + p_personas, 'max', inv.max_personas);
end $$;

create or replace function jardines.info_mesa_token(p_staff text, p_token text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare v_evento uuid; v_cap int; v_ocu int; v_nombre text;
begin
  v_evento := jardines_private.evento_por_staff(p_staff);

  select coalesce(m.capacidad, 0), m.ocupadas, m.nombre
    into v_cap, v_ocu, v_nombre
  from jardines.mesas m where m.token = p_token and m.evento_id = v_evento;

  if v_nombre is null then
    -- Respuesta única: no distingue "mesa inexistente" de "mesa de otro evento".
    perform jardines_private.fallo_token('mesa');
    return json_build_object('ok', false, 'error', 'No disponible');
  end if;

  return json_build_object('ok', true, 'mesa', v_nombre, 'capacidad', v_cap,
    'ocupadas', v_ocu, 'disponibles', greatest(v_cap - v_ocu, 0));
end $$;

create or replace function jardines.registrar_llegada_mesa(p_staff text, p_token text, p_personas integer)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare v_evento uuid; v_cap int; v_ocu int; v_nombre text; v_mesa uuid;
begin
  v_evento := jardines_private.evento_por_staff(p_staff);

  select m.id, coalesce(m.capacidad, 0), m.ocupadas, m.nombre
    into v_mesa, v_cap, v_ocu, v_nombre
  from jardines.mesas m where m.token = p_token and m.evento_id = v_evento for update;

  if v_mesa is null then
    perform jardines_private.fallo_token('mesa');
    return json_build_object('ok', false, 'error', 'No disponible');
  end if;

  if p_personas is null or p_personas < 1 or p_personas > 50 then
    return json_build_object('ok', false, 'error', 'Número de personas inválido');
  end if;

  if v_ocu + p_personas > v_cap then
    return json_build_object('ok', false, 'error', 'lleno', 'mesa', v_nombre,
      'capacidad', v_cap, 'ocupadas', v_ocu, 'disponibles', greatest(v_cap - v_ocu, 0));
  end if;

  update jardines.mesas set ocupadas = ocupadas + p_personas where id = v_mesa;

  perform jardines_private.auditar('registrar_llegada_mesa', 'ok', 'mesas', v_mesa, v_evento,
    jardines_private.hash_clave(p_staff), jsonb_build_object('personas', p_personas));

  return json_build_object('ok', true, 'mesa', v_nombre, 'capacidad', v_cap,
    'ocupadas', v_ocu + p_personas, 'disponibles', v_cap - (v_ocu + p_personas));
end $$;

-- ---------------------------------------------------------------------------
-- Tokens nuevos de mesa e invitación: 256 bits en lugar de UUID
-- ---------------------------------------------------------------------------
alter table jardines.mesas        alter column token set default jardines_private.token_seguro();
alter table jardines.invitaciones alter column token set default jardines_private.token_seguro();

grant execute on function jardines.rotar_staff_token(uuid, integer)  to authenticated;
grant execute on function jardines.revocar_staff_token(uuid)         to authenticated;
revoke all on function jardines.rotar_staff_token(uuid, integer) from anon;
revoke all on function jardines.revocar_staff_token(uuid)        from anon;
