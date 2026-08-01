-- jardines_sec_06 — Matriz de acceso: grants de tabla y de función
--
-- HALLAZGO
--   Las 31 tablas de `jardines` concedían SELECT/INSERT/UPDATE/DELETE a `anon` y a
--   `authenticated`. Lo único que frenaba a un anónimo era la RLS: un descuido en
--   una sola policy se convertía en escritura o lectura directa. Además TODAS las
--   funciones (incluidos los helpers internos y las de trigger) tenían EXECUTE
--   concedido a PUBLIC, anon y authenticated.
--
-- MATRIZ RESULTANTE
--   anon          → SELECT solo sobre el contenido público del sitio + las RPC
--                   públicas (que validan token, limitan tasa y responden genérico).
--   cliente       → su propio evento y lo que cuelga de él.
--   operativo     → su persona, sus canales y los eventos que tiene permitidos.
--   administrador → todo lo de Jardines.
--   service_role  → operaciones administrativas (asignar_rol, aprovisionar_usuario).

-- ===========================================================================
-- A) GRANTS DE TABLA
-- ===========================================================================
revoke insert, update, delete on all tables in schema jardines from anon;

revoke select on
  jardines.accesos, jardines.cronograma, jardines.documentos, jardines.evento_notas,
  jardines.evento_reglas_mesas, jardines.evento_wishlist, jardines.eventos,
  jardines.invitaciones, jardines.invitados, jardines.items_contratados,
  jardines.mesas, jardines.musica, jardines.notificaciones,
  jardines.operativo_asignacion, jardines.operativo_canales, jardines.operativo_personal,
  jardines.operativo_personal_canal, jardines.operativo_transmisiones,
  jardines.operativo_ubicaciones, jardines.perfiles, jardines.rsvps,
  jardines.solicitudes
from anon;

-- ===========================================================================
-- B) CONTENIDO PÚBLICO — lectura anónima, escritura solo admin
-- ===========================================================================
do $$
declare t text;
begin
  foreach t in array array['alimentos','amenidades','config_sitio','galeria',
                           'resenas_config','salon_planos','salones','servicios','servicios_extra']
  loop
    execute format('drop policy if exists "lectura publica" on jardines.%I', t);
    execute format('drop policy if exists "admin escribe" on jardines.%I', t);
    execute format('drop policy if exists contenido_lectura on jardines.%I', t);
    execute format('drop policy if exists contenido_admin on jardines.%I', t);

    execute format($f$create policy contenido_lectura on jardines.%I
      as permissive for select to anon, authenticated using (true)$f$, t);
    execute format($f$create policy contenido_admin on jardines.%I
      as permissive for all to authenticated
      using (jardines.is_admin()) with check (jardines.is_admin())$f$, t);
  end loop;
end $$;

-- ===========================================================================
-- C) TABLAS DEL EVENTO — rol explícito + relación de propiedad
-- ===========================================================================
drop policy if exists "admin eventos"        on jardines.eventos;
drop policy if exists "cliente ve su evento" on jardines.eventos;
create policy eventos_admin on jardines.eventos
  as permissive for all to authenticated
  using (jardines.is_admin()) with check (jardines.is_admin());
create policy eventos_cliente_sel on jardines.eventos
  as permissive for select to authenticated
  using (auth_user_id = (select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array['documentos','items_contratados','evento_reglas_mesas','invitaciones']
  loop
    execute format('drop policy if exists "admin %s" on jardines.%I', t, t);
    execute format('drop policy if exists "cliente lee %s" on jardines.%I', t, t);
    execute format('drop policy if exists "admin documentos" on jardines.%I', t);
    execute format('drop policy if exists "cliente lee documentos" on jardines.%I', t);
    execute format('drop policy if exists %I on jardines.%I', t||'_admin', t);
    execute format('drop policy if exists %I on jardines.%I', t||'_cliente_sel', t);

    execute format($f$create policy %I on jardines.%I
      as permissive for all to authenticated
      using (jardines.is_admin()) with check (jardines.is_admin())$f$, t||'_admin', t);
    execute format($f$create policy %I on jardines.%I
      as permissive for select to authenticated
      using (jardines.is_my_event(evento_id))$f$, t||'_cliente_sel', t);
  end loop;
end $$;

do $$
declare t text;
begin
  foreach t in array array['cronograma','musica','evento_notas','evento_wishlist']
  loop
    execute format('drop policy if exists "admin %s" on jardines.%I', t, t);
    execute format('drop policy if exists "cliente %s" on jardines.%I', t, t);
    execute format('drop policy if exists "admin notas" on jardines.%I', t);
    execute format('drop policy if exists "cliente gestiona sus notas" on jardines.%I', t);
    execute format('drop policy if exists "admin wishlist" on jardines.%I', t);
    execute format('drop policy if exists "cliente gestiona su wishlist" on jardines.%I', t);
    execute format('drop policy if exists %I on jardines.%I', t||'_admin', t);
    execute format('drop policy if exists %I on jardines.%I', t||'_cliente', t);

    execute format($f$create policy %I on jardines.%I
      as permissive for all to authenticated
      using (jardines.is_admin()) with check (jardines.is_admin())$f$, t||'_admin', t);
    execute format($f$create policy %I on jardines.%I
      as permissive for all to authenticated
      using (jardines.is_my_event(evento_id)) with check (jardines.is_my_event(evento_id))$f$,
      t||'_cliente', t);
  end loop;
end $$;

drop policy if exists "admin mesas"          on jardines.mesas;
drop policy if exists "cliente lee mesas"    on jardines.mesas;
drop policy if exists "cliente edita mesas"  on jardines.mesas;
drop policy if exists "cliente update mesas" on jardines.mesas;
drop policy if exists "cliente borra mesas"  on jardines.mesas;
create policy mesas_admin on jardines.mesas
  as permissive for all to authenticated
  using (jardines.is_admin()) with check (jardines.is_admin());
create policy mesas_cliente_sel on jardines.mesas
  as permissive for select to authenticated using (jardines.is_my_event(evento_id));
create policy mesas_cliente_ins on jardines.mesas
  as permissive for insert to authenticated with check (jardines.client_can_edit(evento_id));
create policy mesas_cliente_upd on jardines.mesas
  as permissive for update to authenticated
  using (jardines.client_can_edit(evento_id)) with check (jardines.client_can_edit(evento_id));
create policy mesas_cliente_del on jardines.mesas
  as permissive for delete to authenticated using (jardines.client_can_edit(evento_id));

drop policy if exists "admin invitados"            on jardines.invitados;
drop policy if exists "cliente gestiona invitados" on jardines.invitados;
create policy invitados_admin on jardines.invitados
  as permissive for all to authenticated
  using (jardines.is_admin()) with check (jardines.is_admin());
create policy invitados_cliente on jardines.invitados
  as permissive for all to authenticated
  using (exists (select 1 from jardines.mesas m
                 where m.id = invitados.mesa_id and jardines.is_my_event(m.evento_id)))
  with check (exists (select 1 from jardines.mesas m
                 where m.id = invitados.mesa_id and jardines.client_can_edit(m.evento_id)));

drop policy if exists "admin accesos" on jardines.accesos;
create policy accesos_admin on jardines.accesos
  as permissive for all to authenticated
  using (jardines.is_admin()) with check (jardines.is_admin());

drop policy if exists "admin notificaciones" on jardines.notificaciones;
drop policy if exists "cliente crea notificacion de su evento" on jardines.notificaciones;
create policy notificaciones_admin on jardines.notificaciones
  as permissive for all to authenticated
  using (jardines.is_admin()) with check (jardines.is_admin());
create policy notificaciones_cliente_ins on jardines.notificaciones
  as permissive for insert to authenticated
  with check (evento_id is not null and jardines.is_my_event(evento_id));

drop policy if exists "admin rsvps" on jardines.rsvps;
drop policy if exists "cliente lee rsvps de su evento" on jardines.rsvps;
create policy rsvps_admin on jardines.rsvps
  as permissive for all to authenticated
  using (jardines.is_admin()) with check (jardines.is_admin());
create policy rsvps_cliente_sel on jardines.rsvps
  as permissive for select to authenticated using (jardines.is_my_event(evento_id));

drop policy if exists "admin resenas" on jardines.resenas;
drop policy if exists "cliente crea resena de su evento" on jardines.resenas;
drop policy if exists "cliente lee resenas de su evento" on jardines.resenas;
drop policy if exists "lectura aprobadas o admin" on jardines.resenas;
create policy resenas_admin on jardines.resenas
  as permissive for all to authenticated
  using (jardines.is_admin()) with check (jardines.is_admin());
create policy resenas_lectura_anon on jardines.resenas
  as permissive for select to anon using (aprobada = true);
create policy resenas_lectura_auth on jardines.resenas
  as permissive for select to authenticated
  using (aprobada = true or jardines.is_admin() or jardines.is_my_event(evento_id));
create policy resenas_cliente_ins on jardines.resenas
  as permissive for insert to authenticated
  with check (evento_id is not null and jardines.is_my_event(evento_id));

drop policy if exists "admin perfiles" on jardines.perfiles;
drop policy if exists "lee su perfil"  on jardines.perfiles;
create policy perfiles_admin on jardines.perfiles
  as permissive for all to authenticated
  using (jardines.is_admin()) with check (jardines.is_admin());
create policy perfiles_propio_sel on jardines.perfiles
  as permissive for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "admin solicitudes" on jardines.solicitudes;
create policy solicitudes_admin on jardines.solicitudes
  as permissive for all to authenticated
  using (jardines.is_admin()) with check (jardines.is_admin());

-- ===========================================================================
-- D) GRANTS DE FUNCIÓN — mínimo privilegio
-- ===========================================================================

-- D.1 Funciones de trigger: no son RPC, nadie debe invocarlas por la API.
revoke all on function jardines.handle_new_user()       from public, anon, authenticated;
revoke all on function jardines.resena_moderacion()     from public, anon, authenticated;
revoke all on function jardines.sync_staff_token_hash() from public, anon, authenticated;

-- D.2 Helpers internos: authenticated los necesita SOLO porque las policies RLS se
--     evalúan con sus privilegios. anon no tiene ninguna policy que los use.
do $$
declare f text;
begin
  foreach f in array array[
    'jardines.is_admin()', 'jardines.es_admin()', 'jardines.is_my_event(uuid)',
    'jardines.client_can_edit(uuid)', 'jardines.mi_personal_id()',
    'jardines.mis_canales()', 'jardines.mis_canales_escuchar()', 'jardines.mis_canales_hablar()',
    'jardines.eventos_operativos_permitidos()']
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- D.3 info_mesa_publica exponía nombre de evento, fecha y salón a cualquiera que
--     probara tokens de mesa, SIN token de staff y sin ningún control. No tiene
--     llamadores en el frontend: se retira del alcance de la API.
revoke all on function jardines.info_mesa_publica(text) from public, anon, authenticated;

-- D.4 RPC que requieren sesión
do $$
declare f text;
begin
  foreach f in array array[
    'jardines.info_invitacion(text)', 'jardines.registrar_acceso(text, integer)',
    'jardines.confirmar_evento(uuid)',
    'jardines.operativo_ubicar(uuid, double precision, double precision, double precision)',
    'jardines.operativo_evento_activo()']
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- D.5 RPC realmente públicas: el staff opera sin sesión, con su token en la URL.
--     Todas validan token, aplican rate limit y responden en genérico.
do $$
declare f text;
begin
  foreach f in array array[
    'jardines.info_invitacion_publica(text)',
    'jardines.rsvp_crear(text, text, integer, text)',
    'jardines.info_invitacion_staff(text, text)',
    'jardines.registrar_acceso_staff(text, text, integer)',
    'jardines.progreso_mesas_staff(text)',
    'jardines.info_mesa_token(text, text)',
    'jardines.registrar_llegada_mesa(text, text, integer)']
  loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
end $$;
