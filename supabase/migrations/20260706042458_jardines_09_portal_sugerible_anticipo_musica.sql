-- ════════════════════════════════════════════════════════════════════════════════
-- jardines_09_portal_sugerible_anticipo_musica
-- ════════════════════════════════════════════════════════════════════════════════
--
-- RESCATADA DEL LEDGER, no escrita a mano. 2026-08-27.
--
-- Esta migración se aplicó a la base el 2026-07-06 y su archivo no existía en ningún
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

-- Curación de "Arma tu evento": qué se sugiere en el portal del cliente.
-- Por defecto: amenidades SÍ (son add-ons), servicios NO (son estándar/incluidos).
alter table jardines.amenidades add column if not exists portal_sugerible boolean default true;
alter table jardines.servicios  add column if not exists portal_sugerible boolean default false;

-- Anticipo / pagos del evento (montos, no solo el booleano).
alter table jardines.eventos add column if not exists monto_total numeric;
alter table jardines.eventos add column if not exists anticipo_monto numeric;

-- Música: permitir adjuntar un enlace (Spotify / YouTube).
alter table jardines.musica add column if not exists enlace text;;
