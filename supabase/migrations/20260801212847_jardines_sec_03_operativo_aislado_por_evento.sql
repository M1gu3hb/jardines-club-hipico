-- jardines_sec_03 — Aislamiento del módulo operativo por evento (IDOR/BOLA)
--
-- HALLAZGO 1 — jardines.operativo_ubicar()
--   Autenticaba al empleado con mi_personal_id() pero insertaba `p_evento` tal cual,
--   sin comprobar que ese evento tuviera relación con él. Un operativo podía escribir
--   su ubicación en CUALQUIER evento pasándole otro uuid.
--
-- HALLAZGO 2 — política op_ubi_staff_sel
--   USING (mi_personal_id() IS NOT NULL): cualquier operativo leía las ubicaciones de
--   TODOS los eventos, incluidos los que no le corresponden.
--
-- HALLAZGO 3 — jardines.operativo_evento_activo()
--   Devolvía `staffToken` de todos los eventos operativamente activos a cualquier
--   operativo. Un token de staff de otro evento no tiene por qué salir de ahí.
--
-- MODELO DE AUTORIZACIÓN
--   Hoy no existe tabla de asignación persona↔evento: los canales son globales y el
--   único marcador operativo es eventos.operativo_activo. Para no inventar un paso
--   operativo que hoy nadie ejecuta, la autorización queda así:
--     · evento permitido = operativo_activo = true
--     · Y ADEMÁS, si la persona tiene asignaciones explícitas, el evento debe estar
--       entre ellas.
--   Con cero asignaciones el comportamiento es idéntico al actual (nada se rompe);
--   en cuanto el admin asigna a alguien, ese alguien queda encerrado en su evento.

-- ---------------------------------------------------------------------------
-- Asignación explícita persona ↔ evento (aditiva, opcional)
-- ---------------------------------------------------------------------------
create table if not exists jardines.operativo_asignacion (
  personal_id uuid not null references jardines.operativo_personal(id) on delete cascade,
  evento_id   uuid not null references jardines.eventos(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (personal_id, evento_id)
);
alter table jardines.operativo_asignacion enable row level security;

create index if not exists operativo_asignacion_evento_idx
  on jardines.operativo_asignacion (evento_id);

-- ---------------------------------------------------------------------------
-- Eventos que el operativo actual puede tocar (fuente de verdad server-side)
-- ---------------------------------------------------------------------------
create or replace function jardines_private.operativo_eventos_permitidos()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select e.id
  from jardines.eventos e
  where e.operativo_activo = true
    and jardines.mi_personal_id() is not null
    and (
      -- Sin asignaciones explícitas: comportamiento histórico (cualquier evento activo).
      not exists (
        select 1 from jardines.operativo_asignacion a
        where a.personal_id = jardines.mi_personal_id()
      )
      -- Con asignaciones: solo las suyas.
      or exists (
        select 1 from jardines.operativo_asignacion a
        where a.personal_id = jardines.mi_personal_id()
          and a.evento_id = e.id
      )
    );
$$;

-- Envoltorio en `jardines`. Las políticas RLS se evalúan con los privilegios de
-- quien consulta, y `authenticated` no tiene USAGE sobre jardines_private; por eso
-- las policies llaman a ESTE wrapper. Al ser SECURITY DEFINER su cuerpo corre como
-- postgres y sí alcanza el esquema privado. Solo devuelve los eventos del propio
-- llamador, así que exponerlo no filtra nada: es el grant mínimo que la RLS necesita.
create or replace function jardines.eventos_operativos_permitidos()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select jardines_private.operativo_eventos_permitidos();
$$;

-- ---------------------------------------------------------------------------
-- operativo_ubicar: el evento se deriva o se valida estrictamente
-- ---------------------------------------------------------------------------
create or replace function jardines.operativo_ubicar(
  p_evento    uuid,
  p_lat       double precision,
  p_lng       double precision,
  p_precision double precision
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pid    uuid;
  v_evento uuid;
  v_n      integer;
begin
  v_pid := jardines.mi_personal_id();
  if v_pid is null then
    perform jardines_private.error_generico();
  end if;

  -- Rate limit por persona: el GPS reporta seguido, pero no miles de veces.
  if not jardines_private.rate_limit_consumir('op_ubicar', v_pid::text, 120, interval '1 minute') then
    perform jardines_private.error_generico();
  end if;

  if p_evento is null then
    -- Derivar: si hay exactamente un evento permitido, es ese.
    select count(*), min(x) into v_n, v_evento
    from jardines_private.operativo_eventos_permitidos() x;
    if v_n <> 1 then
      perform jardines_private.auditar('operativo_ubicar', 'denegado', 'operativo_ubicaciones',
        v_pid, null, null, jsonb_build_object('motivo', 'evento_no_derivable', 'candidatos', v_n));
      perform jardines_private.error_generico();
    end if;
  else
    -- Validar estrictamente: nunca se confía en el p_evento del cliente.
    if not exists (
      select 1 from jardines_private.operativo_eventos_permitidos() x where x = p_evento
    ) then
      perform jardines_private.auditar('operativo_ubicar', 'denegado', 'operativo_ubicaciones',
        v_pid, p_evento, null, jsonb_build_object('motivo', 'evento_no_autorizado'));
      perform jardines_private.error_generico();
    end if;
    v_evento := p_evento;
  end if;

  insert into jardines.operativo_ubicaciones
    (personal_id, evento_id, lat, lng, precision_m, actualizado_at)
  values (v_pid, v_evento, p_lat, p_lng, p_precision, now())
  on conflict (personal_id) do update
    set evento_id     = excluded.evento_id,
        lat           = excluded.lat,
        lng           = excluded.lng,
        precision_m   = excluded.precision_m,
        actualizado_at = now();
end $$;

-- ---------------------------------------------------------------------------
-- operativo_evento_activo: deja de filtrar el staff_token
-- ---------------------------------------------------------------------------
create or replace function jardines.operativo_evento_activo()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare res jsonb;
begin
  if jardines.mi_personal_id() is null then
    perform jardines_private.error_generico();
  end if;

  -- Solo los eventos que esta persona puede operar, y SIN staffToken:
  -- el token de staff es una credencial, no un dato de listado.
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', e.id, 'nombre', e.nombre_evento, 'fecha', e.fecha_evento,
    'salon', s.nombre, 'desde', e.operativo_desde
  ) order by e.operativo_desde desc nulls last), '[]'::jsonb)
  into res
  from jardines.eventos e
  left join jardines.salones s on s.id = e.salon_id
  where e.id in (select jardines.eventos_operativos_permitidos());

  return res;
end $$;

-- ---------------------------------------------------------------------------
-- RLS del módulo operativo — roles explícitos y alcance por evento
-- ---------------------------------------------------------------------------

-- Asignaciones: las gestiona el admin; el operativo solo ve las suyas.
drop policy if exists op_asig_admin    on jardines.operativo_asignacion;
drop policy if exists op_asig_staff_sel on jardines.operativo_asignacion;

create policy op_asig_admin on jardines.operativo_asignacion
  as permissive for all to authenticated
  using (jardines.es_admin()) with check (jardines.es_admin());

create policy op_asig_staff_sel on jardines.operativo_asignacion
  as permissive for select to authenticated
  using (personal_id = jardines.mi_personal_id());

-- Ubicaciones: lectura y escritura acotadas a los eventos permitidos.
drop policy if exists op_ubi_staff_sel on jardines.operativo_ubicaciones;
drop policy if exists op_ubi_staff_ins on jardines.operativo_ubicaciones;
drop policy if exists op_ubi_staff_upd on jardines.operativo_ubicaciones;
drop policy if exists op_ubi_admin     on jardines.operativo_ubicaciones;

create policy op_ubi_admin on jardines.operativo_ubicaciones
  as permissive for all to authenticated
  using (jardines.es_admin()) with check (jardines.es_admin());

create policy op_ubi_staff_sel on jardines.operativo_ubicaciones
  as permissive for select to authenticated
  using (evento_id in (select jardines.eventos_operativos_permitidos()));

create policy op_ubi_staff_ins on jardines.operativo_ubicaciones
  as permissive for insert to authenticated
  with check (
    personal_id = jardines.mi_personal_id()
    and evento_id in (select jardines.eventos_operativos_permitidos())
  );

create policy op_ubi_staff_upd on jardines.operativo_ubicaciones
  as permissive for update to authenticated
  using (
    personal_id = jardines.mi_personal_id()
    and evento_id in (select jardines.eventos_operativos_permitidos())
  )
  with check (
    personal_id = jardines.mi_personal_id()
    and evento_id in (select jardines.eventos_operativos_permitidos())
  );

-- Personal: el operativo deja de ver la plantilla completa; solo a sí mismo y a
-- quienes comparten canal con él (que es lo que la UI necesita para el radio).
drop policy if exists op_personal_staff_sel on jardines.operativo_personal;
drop policy if exists op_personal_admin     on jardines.operativo_personal;

create policy op_personal_admin on jardines.operativo_personal
  as permissive for all to authenticated
  using (jardines.es_admin()) with check (jardines.es_admin());

create policy op_personal_staff_sel on jardines.operativo_personal
  as permissive for select to authenticated
  using (
    id = jardines.mi_personal_id()
    or exists (
      select 1 from jardines.operativo_personal_canal pc
      where pc.personal_id = operativo_personal.id
        and pc.canal_id in (select jardines.mis_canales())
    )
  );

-- Canales y membresías: roles explícitos, misma semántica.
drop policy if exists op_canales_admin     on jardines.operativo_canales;
drop policy if exists op_canales_staff_sel on jardines.operativo_canales;

create policy op_canales_admin on jardines.operativo_canales
  as permissive for all to authenticated
  using (jardines.es_admin()) with check (jardines.es_admin());

create policy op_canales_staff_sel on jardines.operativo_canales
  as permissive for select to authenticated
  using (id in (select jardines.mis_canales()));

drop policy if exists op_pc_admin     on jardines.operativo_personal_canal;
drop policy if exists op_pc_staff_sel on jardines.operativo_personal_canal;

create policy op_pc_admin on jardines.operativo_personal_canal
  as permissive for all to authenticated
  using (jardines.es_admin()) with check (jardines.es_admin());

create policy op_pc_staff_sel on jardines.operativo_personal_canal
  as permissive for select to authenticated
  using (
    personal_id = jardines.mi_personal_id()
    or canal_id in (select jardines.mis_canales())
  );

-- Transmisiones: ya estaban acotadas por canal (correcto). Solo se hacen
-- explícitos los roles para que anon no quede alcanzado por una policy PUBLIC.
drop policy if exists op_tx_admin on jardines.operativo_transmisiones;
drop policy if exists op_tx_ins   on jardines.operativo_transmisiones;
drop policy if exists op_tx_sel   on jardines.operativo_transmisiones;

create policy op_tx_admin on jardines.operativo_transmisiones
  as permissive for all to authenticated
  using (jardines.es_admin()) with check (jardines.es_admin());

create policy op_tx_sel on jardines.operativo_transmisiones
  as permissive for select to authenticated
  using (canal_id in (select jardines.mis_canales_escuchar()));

create policy op_tx_ins on jardines.operativo_transmisiones
  as permissive for insert to authenticated
  with check (
    personal_id = jardines.mi_personal_id()
    and canal_id in (select jardines.mis_canales_hablar())
  );
