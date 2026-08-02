-- jardines_sec_21 — Retiro del INSERT público de compatibilidad en solicitudes
--
-- ORDEN RESPETADO: el frontend que usa `solicitud_crear` ya estaba desplegado en
-- producción (merge #1) antes de retirar la vía antigua. Se conserva la RPC
-- (anon/authenticated) y la vía administrativa.
revoke insert, update, delete, select on jardines.solicitudes from anon;
revoke insert on jardines.solicitudes from authenticated;
drop policy if exists solicitudes_anon_ins on jardines.solicitudes;
