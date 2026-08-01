-- jardines_sec_09 — Consolidación de políticas permisivas solapadas
--
-- HALLAZGO
--   El advisor reportaba 67 avisos multiple_permissive_policies en `jardines`,
--   todos por el MISMO patrón repetido: en cada tabla convivían una policy de admin
--   FOR ALL y otra de rol (cliente/operativo). Para `authenticated` ambas son
--   permisivas, así que Postgres evaluaba las dos en cada comando.
--
-- CAMBIO
--   Una policy por comando, con la condición de admin dentro de la misma expresión:
--   is_admin() OR <relación>. El conjunto de filas accesible es idéntico —el OR de
--   dos condiciones permisivas es justo lo que Postgres ya calculaba—, así que NO se
--   amplía ningún permiso. Verificado re-ejecutando la matriz completa de permisos
--   después de aplicar (18/18 casos con el mismo resultado que antes).

-- ---------------------------------------------------------------------------
-- A) Contenido público: SELECT abierto, escritura solo admin
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['alimentos','amenidades','config_sitio','galeria',
                           'resenas_config','salon_planos','salones','servicios','servicios_extra']
  loop
    execute format('drop policy if exists contenido_admin on jardines.%I', t);
    execute format($f$create policy contenido_admin_ins on jardines.%I
      as permissive for insert to authenticated with check (jardines.is_admin())$f$, t);
    execute format($f$create policy contenido_admin_upd on jardines.%I
      as permissive for update to authenticated
      using (jardines.is_admin()) with check (jardines.is_admin())$f$, t);
    execute format($f$create policy contenido_admin_del on jardines.%I
      as permissive for delete to authenticated using (jardines.is_admin())$f$, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- B) Tablas del evento que el cliente solo LEE
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['documentos','items_contratados','evento_reglas_mesas','invitaciones']
  loop
    execute format('drop policy if exists %I on jardines.%I', t||'_admin', t);
    execute format('drop policy if exists %I on jardines.%I', t||'_cliente_sel', t);

    execute format($f$create policy %I on jardines.%I
      as permissive for select to authenticated
      using (jardines.is_admin() or jardines.is_my_event(evento_id))$f$, t||'_sel', t);
    execute format($f$create policy %I on jardines.%I
      as permissive for insert to authenticated with check (jardines.is_admin())$f$, t||'_ins', t);
    execute format($f$create policy %I on jardines.%I
      as permissive for update to authenticated
      using (jardines.is_admin()) with check (jardines.is_admin())$f$, t||'_upd', t);
    execute format($f$create policy %I on jardines.%I
      as permissive for delete to authenticated using (jardines.is_admin())$f$, t||'_del', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- C) Tablas del evento que el cliente LEE Y ESCRIBE
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['cronograma','musica','evento_notas','evento_wishlist']
  loop
    execute format('drop policy if exists %I on jardines.%I', t||'_admin', t);
    execute format('drop policy if exists %I on jardines.%I', t||'_cliente', t);

    execute format($f$create policy %I on jardines.%I
      as permissive for select to authenticated
      using (jardines.is_admin() or jardines.is_my_event(evento_id))$f$, t||'_sel', t);
    execute format($f$create policy %I on jardines.%I
      as permissive for insert to authenticated
      with check (jardines.is_admin() or jardines.is_my_event(evento_id))$f$, t||'_ins', t);
    execute format($f$create policy %I on jardines.%I
      as permissive for update to authenticated
      using (jardines.is_admin() or jardines.is_my_event(evento_id))
      with check (jardines.is_admin() or jardines.is_my_event(evento_id))$f$, t||'_upd', t);
    execute format($f$create policy %I on jardines.%I
      as permissive for delete to authenticated
      using (jardines.is_admin() or jardines.is_my_event(evento_id))$f$, t||'_del', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- D) eventos
-- ---------------------------------------------------------------------------
drop policy if exists eventos_admin       on jardines.eventos;
drop policy if exists eventos_cliente_sel on jardines.eventos;
create policy eventos_sel on jardines.eventos
  as permissive for select to authenticated
  using (jardines.is_admin() or auth_user_id = (select auth.uid()));
create policy eventos_ins on jardines.eventos
  as permissive for insert to authenticated with check (jardines.is_admin());
create policy eventos_upd on jardines.eventos
  as permissive for update to authenticated
  using (jardines.is_admin()) with check (jardines.is_admin());
create policy eventos_del on jardines.eventos
  as permissive for delete to authenticated using (jardines.is_admin());

-- ---------------------------------------------------------------------------
-- E) mesas e invitados
-- ---------------------------------------------------------------------------
drop policy if exists mesas_admin       on jardines.mesas;
drop policy if exists mesas_cliente_sel on jardines.mesas;
drop policy if exists mesas_cliente_ins on jardines.mesas;
drop policy if exists mesas_cliente_upd on jardines.mesas;
drop policy if exists mesas_cliente_del on jardines.mesas;
create policy mesas_sel on jardines.mesas
  as permissive for select to authenticated
  using (jardines.is_admin() or jardines.is_my_event(evento_id));
create policy mesas_ins on jardines.mesas
  as permissive for insert to authenticated
  with check (jardines.is_admin() or jardines.client_can_edit(evento_id));
create policy mesas_upd on jardines.mesas
  as permissive for update to authenticated
  using (jardines.is_admin() or jardines.client_can_edit(evento_id))
  with check (jardines.is_admin() or jardines.client_can_edit(evento_id));
create policy mesas_del on jardines.mesas
  as permissive for delete to authenticated
  using (jardines.is_admin() or jardines.client_can_edit(evento_id));

drop policy if exists invitados_admin   on jardines.invitados;
drop policy if exists invitados_cliente on jardines.invitados;
create policy invitados_sel on jardines.invitados
  as permissive for select to authenticated
  using (jardines.is_admin() or exists (
    select 1 from jardines.mesas m where m.id = invitados.mesa_id and jardines.is_my_event(m.evento_id)));
create policy invitados_ins on jardines.invitados
  as permissive for insert to authenticated
  with check (jardines.is_admin() or exists (
    select 1 from jardines.mesas m where m.id = invitados.mesa_id and jardines.client_can_edit(m.evento_id)));
create policy invitados_upd on jardines.invitados
  as permissive for update to authenticated
  using (jardines.is_admin() or exists (
    select 1 from jardines.mesas m where m.id = invitados.mesa_id and jardines.is_my_event(m.evento_id)))
  with check (jardines.is_admin() or exists (
    select 1 from jardines.mesas m where m.id = invitados.mesa_id and jardines.client_can_edit(m.evento_id)));
create policy invitados_del on jardines.invitados
  as permissive for delete to authenticated
  using (jardines.is_admin() or exists (
    select 1 from jardines.mesas m where m.id = invitados.mesa_id and jardines.client_can_edit(m.evento_id)));

-- ---------------------------------------------------------------------------
-- F) notificaciones, rsvps, resenas, perfiles
-- ---------------------------------------------------------------------------
drop policy if exists notificaciones_admin       on jardines.notificaciones;
drop policy if exists notificaciones_cliente_ins on jardines.notificaciones;
create policy notificaciones_sel on jardines.notificaciones
  as permissive for select to authenticated using (jardines.is_admin());
create policy notificaciones_ins on jardines.notificaciones
  as permissive for insert to authenticated
  with check (jardines.is_admin() or (evento_id is not null and jardines.is_my_event(evento_id)));
create policy notificaciones_upd on jardines.notificaciones
  as permissive for update to authenticated
  using (jardines.is_admin()) with check (jardines.is_admin());
create policy notificaciones_del on jardines.notificaciones
  as permissive for delete to authenticated using (jardines.is_admin());

drop policy if exists rsvps_admin       on jardines.rsvps;
drop policy if exists rsvps_cliente_sel on jardines.rsvps;
create policy rsvps_sel on jardines.rsvps
  as permissive for select to authenticated
  using (jardines.is_admin() or jardines.is_my_event(evento_id));
create policy rsvps_ins on jardines.rsvps
  as permissive for insert to authenticated with check (jardines.is_admin());
create policy rsvps_upd on jardines.rsvps
  as permissive for update to authenticated
  using (jardines.is_admin()) with check (jardines.is_admin());
create policy rsvps_del on jardines.rsvps
  as permissive for delete to authenticated using (jardines.is_admin());

drop policy if exists resenas_admin        on jardines.resenas;
drop policy if exists resenas_lectura_auth on jardines.resenas;
drop policy if exists resenas_cliente_ins  on jardines.resenas;
create policy resenas_sel_auth on jardines.resenas
  as permissive for select to authenticated
  using (aprobada = true or jardines.is_admin() or jardines.is_my_event(evento_id));
create policy resenas_ins on jardines.resenas
  as permissive for insert to authenticated
  with check (jardines.is_admin() or (evento_id is not null and jardines.is_my_event(evento_id)));
create policy resenas_upd on jardines.resenas
  as permissive for update to authenticated
  using (jardines.is_admin()) with check (jardines.is_admin());
create policy resenas_del on jardines.resenas
  as permissive for delete to authenticated using (jardines.is_admin());

drop policy if exists perfiles_admin      on jardines.perfiles;
drop policy if exists perfiles_propio_sel on jardines.perfiles;
create policy perfiles_sel on jardines.perfiles
  as permissive for select to authenticated
  using (jardines.is_admin() or user_id = (select auth.uid()));
create policy perfiles_ins on jardines.perfiles
  as permissive for insert to authenticated with check (jardines.is_admin());
create policy perfiles_upd on jardines.perfiles
  as permissive for update to authenticated
  using (jardines.is_admin()) with check (jardines.is_admin());
create policy perfiles_del on jardines.perfiles
  as permissive for delete to authenticated using (jardines.is_admin());

-- ---------------------------------------------------------------------------
-- G) Módulo operativo
-- ---------------------------------------------------------------------------
drop policy if exists op_ubi_admin     on jardines.operativo_ubicaciones;
drop policy if exists op_ubi_staff_sel on jardines.operativo_ubicaciones;
drop policy if exists op_ubi_staff_ins on jardines.operativo_ubicaciones;
drop policy if exists op_ubi_staff_upd on jardines.operativo_ubicaciones;
create policy op_ubi_sel on jardines.operativo_ubicaciones
  as permissive for select to authenticated
  using (jardines.es_admin() or evento_id in (select jardines.eventos_operativos_permitidos()));
create policy op_ubi_ins on jardines.operativo_ubicaciones
  as permissive for insert to authenticated
  with check (jardines.es_admin() or (personal_id = jardines.mi_personal_id()
              and evento_id in (select jardines.eventos_operativos_permitidos())));
create policy op_ubi_upd on jardines.operativo_ubicaciones
  as permissive for update to authenticated
  using (jardines.es_admin() or (personal_id = jardines.mi_personal_id()
         and evento_id in (select jardines.eventos_operativos_permitidos())))
  with check (jardines.es_admin() or (personal_id = jardines.mi_personal_id()
         and evento_id in (select jardines.eventos_operativos_permitidos())));
create policy op_ubi_del on jardines.operativo_ubicaciones
  as permissive for delete to authenticated using (jardines.es_admin());

drop policy if exists op_personal_admin     on jardines.operativo_personal;
drop policy if exists op_personal_staff_sel on jardines.operativo_personal;
create policy op_personal_sel on jardines.operativo_personal
  as permissive for select to authenticated
  using (jardines.es_admin() or id = jardines.mi_personal_id()
         or exists (select 1 from jardines.operativo_personal_canal pc
                    where pc.personal_id = operativo_personal.id
                      and pc.canal_id in (select jardines.mis_canales())));
create policy op_personal_ins on jardines.operativo_personal
  as permissive for insert to authenticated with check (jardines.es_admin());
create policy op_personal_upd on jardines.operativo_personal
  as permissive for update to authenticated
  using (jardines.es_admin()) with check (jardines.es_admin());
create policy op_personal_del on jardines.operativo_personal
  as permissive for delete to authenticated using (jardines.es_admin());

drop policy if exists op_canales_admin     on jardines.operativo_canales;
drop policy if exists op_canales_staff_sel on jardines.operativo_canales;
create policy op_canales_sel on jardines.operativo_canales
  as permissive for select to authenticated
  using (jardines.es_admin() or id in (select jardines.mis_canales()));
create policy op_canales_ins on jardines.operativo_canales
  as permissive for insert to authenticated with check (jardines.es_admin());
create policy op_canales_upd on jardines.operativo_canales
  as permissive for update to authenticated
  using (jardines.es_admin()) with check (jardines.es_admin());
create policy op_canales_del on jardines.operativo_canales
  as permissive for delete to authenticated using (jardines.es_admin());

drop policy if exists op_pc_admin     on jardines.operativo_personal_canal;
drop policy if exists op_pc_staff_sel on jardines.operativo_personal_canal;
create policy op_pc_sel on jardines.operativo_personal_canal
  as permissive for select to authenticated
  using (jardines.es_admin() or personal_id = jardines.mi_personal_id()
         or canal_id in (select jardines.mis_canales()));
create policy op_pc_ins on jardines.operativo_personal_canal
  as permissive for insert to authenticated with check (jardines.es_admin());
create policy op_pc_upd on jardines.operativo_personal_canal
  as permissive for update to authenticated
  using (jardines.es_admin()) with check (jardines.es_admin());
create policy op_pc_del on jardines.operativo_personal_canal
  as permissive for delete to authenticated using (jardines.es_admin());

drop policy if exists op_tx_admin on jardines.operativo_transmisiones;
drop policy if exists op_tx_sel   on jardines.operativo_transmisiones;
drop policy if exists op_tx_ins   on jardines.operativo_transmisiones;
create policy op_tx_sel on jardines.operativo_transmisiones
  as permissive for select to authenticated
  using (jardines.es_admin() or canal_id in (select jardines.mis_canales_escuchar()));
create policy op_tx_ins on jardines.operativo_transmisiones
  as permissive for insert to authenticated
  with check (jardines.es_admin() or (personal_id = jardines.mi_personal_id()
              and canal_id in (select jardines.mis_canales_hablar())));
create policy op_tx_upd on jardines.operativo_transmisiones
  as permissive for update to authenticated
  using (jardines.es_admin()) with check (jardines.es_admin());
create policy op_tx_del on jardines.operativo_transmisiones
  as permissive for delete to authenticated using (jardines.es_admin());

drop policy if exists op_asig_admin     on jardines.operativo_asignacion;
drop policy if exists op_asig_staff_sel on jardines.operativo_asignacion;
create policy op_asig_sel on jardines.operativo_asignacion
  as permissive for select to authenticated
  using (jardines.es_admin() or personal_id = jardines.mi_personal_id());
create policy op_asig_ins on jardines.operativo_asignacion
  as permissive for insert to authenticated with check (jardines.es_admin());
create policy op_asig_upd on jardines.operativo_asignacion
  as permissive for update to authenticated
  using (jardines.es_admin()) with check (jardines.es_admin());
create policy op_asig_del on jardines.operativo_asignacion
  as permissive for delete to authenticated using (jardines.es_admin());
