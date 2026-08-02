-- jardines_sec_05 — Solicitudes por RPC validada + rate limit en las RPC públicas
--
-- HALLAZGOS
--   1. jardines.solicitudes tenía INSERT con WITH CHECK (true) para anon: el
--      formulario público podía escribir cualquier columna, incluidas las internas
--      (estatus, folio), sin límite de longitud, sin validación y sin rate limit.
--   2. El front intentaba un UPDATE posterior para fijar el folio; RLS lo rechazaba
--      en silencio, así que el folio del correo nunca coincidía con el de la base.
--   3. rsvp_crear e info_invitacion_publica no tenían ningún techo de peticiones.
--
-- CAMBIO
--   El alta pasa por jardines.solicitud_crear(): valida formato y longitudes,
--   aplica rate limit persistente y fija los campos internos del lado del servidor.
--   Se revoca el INSERT directo de anon sobre la tabla.

-- Si alguien escribe staff_token directo en la tabla, el hash se recalcula solo.
-- Sin esto, una rotación hecha por fuera de rotar_staff_token dejaría el hash
-- apuntando al token ANTERIOR, que seguiría siendo válido.
create or replace function jardines.sync_staff_token_hash()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.staff_token is distinct from old.staff_token then
    if new.staff_token is null then
      new.staff_token_hash := null;
    else
      new.staff_token_hash := jardines_private.hash_clave('staff:' || new.staff_token);
      if new.staff_token_expira is null or new.staff_token_expira <= now() then
        new.staff_token_expira := coalesce((new.fecha_evento + interval '2 days')::timestamptz,
                                           now() + interval '30 days');
      end if;
      new.staff_token_revocado_at := null;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_sync_staff_token_hash on jardines.eventos;
create trigger trg_sync_staff_token_hash
  before update of staff_token on jardines.eventos
  for each row execute function jardines.sync_staff_token_hash();

create or replace function jardines.solicitud_crear(
  p_nombre_completo text,
  p_telefono        text,
  p_email           text default null,
  p_salon           text default null,
  p_tipo_evento     text default null,
  p_fecha_tentativa date default null,
  p_numero_personas integer default null,
  p_comentarios     text default null,
  p_acepto          boolean default false
) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_ip text; v_id uuid; v_folio text; v_nombre text; v_tel text; v_email text;
begin
  v_ip := jardines_private.ip_solicitante();

  if not jardines_private.rate_limit_consumir('solicitud', coalesce(v_ip, 'global'),
        case when v_ip is not null then 5 else 200 end, interval '1 hour') then
    perform jardines_private.auditar('solicitud_crear', 'denegado', 'solicitudes', null, null, null,
      jsonb_build_object('motivo', 'rate_limit'));
    raise exception 'Demasiadas solicitudes. Intenta más tarde.' using errcode = '42501';
  end if;

  v_nombre := left(trim(coalesce(p_nombre_completo, '')), 120);
  v_tel    := left(trim(coalesce(p_telefono, '')), 30);
  v_email  := nullif(left(trim(lower(coalesce(p_email, ''))), 160), '');

  if length(v_nombre) < 2 then raise exception 'Nombre inválido'; end if;
  if v_tel !~ '^[0-9+()\-\s]{7,30}$' then raise exception 'Teléfono inválido'; end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Correo inválido';
  end if;
  if p_acepto is not true then raise exception 'Falta aceptar el aviso de privacidad'; end if;
  if p_numero_personas is not null and (p_numero_personas < 0 or p_numero_personas > 5000) then
    raise exception 'Número de personas inválido';
  end if;
  if p_fecha_tentativa is not null
     and (p_fecha_tentativa < current_date - 1 or p_fecha_tentativa > current_date + interval '5 years') then
    raise exception 'Fecha tentativa inválida';
  end if;

  insert into jardines.solicitudes (
    nombre_completo, telefono, email, salon_seleccionado, tipo_evento,
    fecha_tentativa, numero_personas, comentarios, acepto_aviso_privacidad,
    estatus, fecha_envio, hora_envio
  ) values (
    v_nombre, v_tel, v_email,
    left(trim(coalesce(p_salon, 'Por definir')), 120),
    left(trim(coalesce(p_tipo_evento, '')), 80),
    p_fecha_tentativa,
    p_numero_personas,
    left(trim(coalesce(p_comentarios, '')), 2000),
    true,
    'Nueva',
    to_char(now() at time zone 'America/Mexico_City', 'DD/MM/YYYY'),
    to_char(now() at time zone 'America/Mexico_City', 'HH24:MI')
  ) returning id into v_id;

  v_folio := 'JCH-' || upper(right(v_id::text, 6));
  update jardines.solicitudes set folio = v_folio where id = v_id;

  perform jardines_private.auditar('solicitud_crear', 'ok', 'solicitudes', v_id);

  return jsonb_build_object('id', v_id, 'folio', v_folio);
end $$;

grant execute on function jardines.solicitud_crear(text, text, text, text, text, date, integer, text, boolean)
  to anon, authenticated;

drop policy if exists "cualquiera envia solicitud" on jardines.solicitudes;
revoke insert, update, delete, select on jardines.solicitudes from anon;

create or replace function jardines.info_invitacion_publica(p_token text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare ev jardines.eventos; s jardines.salones; v_ip text;
begin
  v_ip := jardines_private.ip_solicitante();
  if not jardines_private.rate_limit_consumir('inv_publica', coalesce(v_ip, 'global'),
        case when v_ip is not null then 60 else 1000 end, interval '10 minutes') then
    perform jardines_private.error_generico();
  end if;

  select * into ev from jardines.eventos e
   where e.invitacion_token = p_token and p_token is not null and p_token <> '';

  if ev.id is null or ev.invitacion_activa is not true then
    perform jardines_private.fallo_token('invitacion_publica');
    perform jardines_private.error_generico();
  end if;

  select * into s from jardines.salones sa where sa.id = ev.salon_id;

  return jsonb_build_object(
    'evento', ev.nombre_evento, 'tipo', ev.tipo_evento, 'fecha', ev.fecha_evento,
    'mensaje', ev.invitacion_mensaje, 'dressCode', ev.invitacion_dress_code,
    'salon', coalesce(s.nombre, 'Jardines Club Hípico'), 'salonImagen', s.imagen_principal
  );
end $$;

create or replace function jardines.rsvp_crear(
  p_token text, p_nombre text, p_personas integer, p_mensaje text
) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare ev jardines.eventos; v_ip text; v_nombre text;
begin
  v_ip := jardines_private.ip_solicitante();

  if not jardines_private.rate_limit_consumir('rsvp_token', coalesce(p_token, ''), 30, interval '1 hour')
     or not jardines_private.rate_limit_consumir('rsvp_ip', coalesce(v_ip, 'global'),
             case when v_ip is not null then 10 else 500 end, interval '1 hour') then
    perform jardines_private.auditar('rsvp_crear', 'denegado', 'rsvps', null, null, null,
      jsonb_build_object('motivo', 'rate_limit'));
    raise exception 'Demasiados envíos. Intenta más tarde.' using errcode = '42501';
  end if;

  select * into ev from jardines.eventos e
   where e.invitacion_token = p_token and p_token is not null and p_token <> '';

  if ev.id is null or ev.invitacion_activa is not true then
    perform jardines_private.fallo_token('rsvp');
    perform jardines_private.error_generico();
  end if;

  v_nombre := left(trim(coalesce(p_nombre, '')), 120);
  if length(v_nombre) < 2 then raise exception 'nombre requerido'; end if;

  insert into jardines.rsvps (evento_id, nombre, personas, mensaje)
  values (ev.id, v_nombre,
          greatest(1, least(coalesce(p_personas, 1), 30)),
          left(coalesce(p_mensaje, ''), 500));

  perform jardines_private.auditar('rsvp_crear', 'ok', 'rsvps', null, ev.id);

  return jsonb_build_object('ok', true);
end $$;

create or replace function jardines.registrar_acceso(p_token text, p_personas integer)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare inv jardines.invitaciones; m jardines.mesas;
begin
  if not jardines.is_admin() then
    perform jardines_private.error_generico();
  end if;
  if not jardines_private.rate_limit_consumir('acceso_admin', auth.uid()::text, 600, interval '1 minute') then
    perform jardines_private.error_generico();
  end if;
  if p_personas is null or p_personas < 1 or p_personas > 50 then
    raise exception 'personas debe estar entre 1 y 50';
  end if;

  select * into inv from jardines.invitaciones i where i.token = p_token for update;
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
  values (inv.id, inv.mesa_id, p_personas, auth.uid());

  select * into m from jardines.mesas mm where mm.id = inv.mesa_id;

  perform jardines_private.auditar('registrar_acceso', 'ok', 'invitaciones', inv.id, inv.evento_id);

  return jsonb_build_object('ok', true, 'mesa', coalesce(m.nombre, 'Sin mesa'),
    'registradas', inv.personas_registradas + p_personas, 'max', inv.max_personas);
end $$;

create or replace function jardines.info_invitacion(p_token text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare inv jardines.invitaciones; m jardines.mesas; ev jardines.eventos;
begin
  if not jardines.is_admin() then
    perform jardines_private.error_generico();
  end if;

  select * into inv from jardines.invitaciones i where i.token = p_token;
  if inv.id is null then
    perform jardines_private.fallo_token('invitacion');
    perform jardines_private.error_generico();
  end if;

  select * into m  from jardines.mesas mm  where mm.id = inv.mesa_id;
  select * into ev from jardines.eventos e where e.id  = inv.evento_id;

  return jsonb_build_object('token', inv.token, 'evento', ev.nombre_evento,
    'invitado', inv.nombre_invitado, 'mesa', coalesce(m.nombre, 'Sin mesa'),
    'max', inv.max_personas, 'registradas', inv.personas_registradas, 'estatus', inv.estatus);
end $$;
