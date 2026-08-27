-- ════════════════════════════════════════════════════════════════════════════════
-- jardines_01_schema_expose
-- ════════════════════════════════════════════════════════════════════════════════
--
-- RESCATADA DEL LEDGER, no escrita a mano. 2026-08-27.
--
-- Esta migración se aplicó a la base el 2026-07-05 y su archivo no existía en ningún
-- repositorio: se perdió, o nunca se guardó. Durante meses el historial estuvo incompleto sin
-- que se notara, porque una migración aplicada no vuelve a hacer falta hasta el día que hay que
-- reconstruir desde cero — y ese día es tarde para descubrirlo.
--
-- El texto de abajo es EXACTAMENTE el que Supabase guardó en
-- `supabase_migrations.schema_migrations.statements` al aplicarla. No se ha reformateado ni
-- corregido nada: si algo aquí parece mejorable, se arregla en una migración NUEVA, porque
-- reescribir una ya aplicada hace que el archivo y la base cuenten historias distintas.
--
-- EL NOMBRE DEL ARCHIVO LLEVA SU VERSIÓN ORIGINAL a propósito. Con ese prefijo, el CLI de
-- Supabase la da por aplicada y un `db push` NO la vuelve a ejecutar. Cambiarlo la convertiría
-- en una migración nueva que intentaría crear tablas que ya existen.
-- ════════════════════════════════════════════════════════════════════════════════


-- Schema aislado para Jardines Club Hípico (proyecto Supabase compartido con otro sitio)
create schema if not exists jardines;

create extension if not exists pgcrypto;

-- Roles de PostgREST pueden usar el schema
grant usage on schema jardines to anon, authenticated, service_role;

-- Privilegios por defecto para tablas/secuencias/funciones futuras del schema
alter default privileges in schema jardines grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges in schema jardines grant usage, select on sequences to anon, authenticated, service_role;
alter default privileges in schema jardines grant execute on functions to anon, authenticated, service_role;

-- Exponer el schema a la API (PostgREST) para que supabase-js pueda leerlo con Accept-Profile
alter role authenticator set pgrst.db_schemas = 'public, graphql_public, storage, jardines';
notify pgrst, 'reload config';
;
