-- jardines_sec_11 — Revoca el EXECUTE a PUBLIC que heredaron tres funciones nuevas
--
-- Al crear una función, PostgreSQL concede EXECUTE a PUBLIC por defecto. Las tres
-- funciones nuevas de sec_04 y sec_05 arrastraron ese grant: se revoca y se deja
-- únicamente el rol que cada una necesita.
--
-- rotar/revocar validan is_admin() por dentro, así que no había explotación real,
-- pero un anónimo no debe siquiera poder invocarlas.

revoke all on function jardines.rotar_staff_token(uuid, integer) from public, anon;
grant execute on function jardines.rotar_staff_token(uuid, integer) to authenticated;

revoke all on function jardines.revocar_staff_token(uuid) from public, anon;
grant execute on function jardines.revocar_staff_token(uuid) to authenticated;

revoke all on function jardines.solicitud_crear(text, text, text, text, text, date, integer, text, boolean) from public;
grant execute on function jardines.solicitud_crear(text, text, text, text, text, date, integer, text, boolean)
  to anon, authenticated;
