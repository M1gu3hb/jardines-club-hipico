-- jardines_sec_22 — Retira el ÚNICO perfil cruzado Vero → Jardines
--
-- Antes de sec_02, el trigger de auth.users creaba perfil de Jardines para TODOS
-- los usuarios, incluidos los de Vero. Eso ya se corrigió hacia adelante, pero
-- quedó una fila histórica: un administrador de Vero con perfil rol='cliente'.
-- No le da acceso a datos (sin evento, is_my_event() es false), pero SÍ pasa
-- `autorizarJardines()` en api/, que solo exige que el perfil exista.
--
-- NO toca auth.users, public.admin_users, ni ninguna tabla, función, trigger,
-- grant, policy o bucket de Vero. Solo borra UNA fila de jardines.perfiles.
-- El usuario sigue siendo admin de Vero: Vero autoriza con public.is_admin(),
-- que lee public.admin_users y jamás consulta jardines.perfiles.
do $$
declare v_n integer; v_uid uuid; v_borradas integer;
begin
  -- PRECONDICIÓN ESTRICTA: si no hay exactamente una coincidencia, falla sin tocar nada.
  select count(*) into v_n
  from jardines.perfiles p
  join public.admin_users a on a.user_id = p.user_id
  where p.rol = 'cliente'
    and not exists (select 1 from jardines.eventos e where e.auth_user_id = p.user_id)
    and not exists (select 1 from jardines.operativo_personal o where o.auth_user_id = p.user_id);

  if v_n <> 1 then
    raise exception
      'Precondicion no cumplida: se esperaba exactamente 1 perfil cruzado, se encontraron %. Nada modificado.', v_n;
  end if;

  select p.user_id into v_uid
  from jardines.perfiles p
  join public.admin_users a on a.user_id = p.user_id
  where p.rol = 'cliente'
    and not exists (select 1 from jardines.eventos e where e.auth_user_id = p.user_id)
    and not exists (select 1 from jardines.operativo_personal o where o.auth_user_id = p.user_id);

  -- Acotado por user_id Y rol: si el rol cambió entremedias, no se toca.
  delete from jardines.perfiles where user_id = v_uid and rol = 'cliente';
  get diagnostics v_borradas = row_count;
  if v_borradas <> 1 then
    raise exception 'Se esperaba borrar 1 fila y se borraron %. Se revierte.', v_borradas;
  end if;

  if not exists (select 1 from public.admin_users a where a.user_id = v_uid) then
    raise exception 'El usuario dejo de ser admin de Vero. Se revierte.';
  end if;
  if exists (select 1 from jardines.perfiles p where p.user_id = v_uid) then
    raise exception 'El perfil de Jardines sigue existiendo. Se revierte.';
  end if;

  perform jardines_private.auditar(
    'perfil_cruzado_retirado', 'ok', 'perfiles', v_uid, null, null,
    jsonb_build_object(
      'motivo', 'admin de Vero con perfil historico de Jardines, sin evento ni personal',
      'migracion', 'jardines_sec_22'));
end $$;
