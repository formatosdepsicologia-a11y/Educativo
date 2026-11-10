create or replace function es_personal() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from perfiles where id = auth.uid() and activo and rol in ('admin','control_escolar'))
$$;
revoke execute on function es_personal() from public, anon;
grant execute on function es_personal() to authenticated;

-- Escritura para personal de control escolar
do $$
declare t text;
begin
  foreach t in array array['alumnos','padres','datos_fiscales','inscripciones','movimientos_inventario',
    'salidas_caja','cargos','historial_estatus','documentos_alumno','candidatos','observaciones_conducta']
  loop
    execute format('create policy "personal_inserta" on %I for insert with check (escuela_id = mi_escuela() and es_personal())', t);
    execute format('create policy "personal_actualiza" on %I for update using (escuela_id = mi_escuela() and es_personal()) with check (escuela_id = mi_escuela() and es_personal())', t);
  end loop;
end $$;
create policy "personal_alumno_padre" on alumno_padre for insert
  with check (es_personal() and exists (select 1 from alumnos a where a.id = alumno_id and a.escuela_id = mi_escuela()));

-- Cobro, venta y corte: personal. Cancelar: solo admin (sin cambio).
create or replace function registrar_cobro(
  p_alumno uuid, p_partidas jsonb, p_forma forma_pago,
  p_referencia text default null, p_padre uuid default null, p_corte uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_escuela uuid := mi_escuela(); v_recibo uuid; v_total numeric := 0; v_item jsonb;
begin
  if not es_personal() then raise exception 'Sin permiso para cobrar'; end if;
  select coalesce(sum((x->>'monto')::numeric),0) into v_total from jsonb_array_elements(p_partidas) x;
  if v_total <= 0 then raise exception 'El total debe ser mayor a cero'; end if;
  if exists (select 1 from jsonb_array_elements(p_partidas) x
             where not exists (select 1 from cargos c where c.id = (x->>'cargo_id')::uuid and c.escuela_id = v_escuela and c.alumno_id = p_alumno))
  then raise exception 'Cargo inválido'; end if;
  insert into recibos (escuela_id, corte_id, alumno_id, padre_id, total, emitido_por)
  values (v_escuela, p_corte, p_alumno, p_padre, v_total, auth.uid()) returning id into v_recibo;
  for v_item in select * from jsonb_array_elements(p_partidas) loop
    insert into pagos (escuela_id, padre_id, cargo_id, monto, forma, referencia, recibo_id)
    values (v_escuela, p_padre, (v_item->>'cargo_id')::uuid, (v_item->>'monto')::numeric, p_forma, p_referencia, v_recibo);
    perform actualizar_estado_cargo((v_item->>'cargo_id')::uuid);
  end loop;
  return v_recibo;
end $$;

create or replace function registrar_venta(
  p_alumno uuid, p_partidas jsonb, p_forma forma_pago, p_padre uuid default null, p_corte uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_escuela uuid := mi_escuela(); v_venta uuid; v_recibo uuid; v_total numeric := 0;
        v_item jsonb; v_prod productos%rowtype; v_cant int;
begin
  if not es_personal() then raise exception 'Sin permiso para vender'; end if;
  insert into ventas (escuela_id, alumno_id, padre_id, creado_por) values (v_escuela, p_alumno, p_padre, auth.uid()) returning id into v_venta;
  for v_item in select * from jsonb_array_elements(p_partidas) loop
    v_cant := (v_item->>'cantidad')::int;
    if v_cant is null or v_cant <= 0 then raise exception 'Cantidad inválida'; end if;
    select * into v_prod from productos where id = (v_item->>'producto_id')::uuid and escuela_id = v_escuela for update;
    if not found then raise exception 'Producto no encontrado'; end if;
    if v_prod.existencia < v_cant then raise exception 'Sin existencia suficiente de % %', v_prod.nombre, coalesce(v_prod.talla,''); end if;
    insert into venta_partidas (venta_id, producto_id, cantidad, precio_unitario) values (v_venta, v_prod.id, v_cant, v_prod.precio);
    insert into movimientos_inventario (escuela_id, producto_id, almacen_id, tipo, cantidad, venta_id, creado_por)
    values (v_escuela, v_prod.id, v_prod.almacen_id, 'venta', -v_cant, v_venta, auth.uid());
    v_total := v_total + v_cant * v_prod.precio;
  end loop;
  insert into recibos (escuela_id, corte_id, alumno_id, padre_id, total, emitido_por)
  values (v_escuela, p_corte, p_alumno, p_padre, v_total, auth.uid()) returning id into v_recibo;
  update ventas set total = v_total, recibo_id = v_recibo where id = v_venta;
  insert into pagos (escuela_id, padre_id, venta_id, monto, forma, recibo_id) values (v_escuela, p_padre, v_venta, v_total, p_forma, v_recibo);
  return v_recibo;
end $$;

create or replace function abrir_corte(p_fondo numeric default 0) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not es_personal() then raise exception 'Sin permiso'; end if;
  select id into v_id from cortes_caja where escuela_id = mi_escuela() and cajero_id = auth.uid() and cerrado_en is null;
  if v_id is not null then return v_id; end if;
  insert into cortes_caja (escuela_id, cajero_id, fondo_inicial) values (mi_escuela(), auth.uid(), p_fondo) returning id into v_id;
  return v_id;
end $$;

create or replace function cerrar_corte(p_corte uuid, p_efectivo_contado numeric, p_notas text default null) returns cortes_caja
language plpgsql security definer set search_path = public as $$
declare c cortes_caja; v_ef numeric; v_tj numeric; v_tr numeric; v_sal numeric;
begin
  if not es_personal() then raise exception 'Sin permiso'; end if;
  select * into c from cortes_caja where id = p_corte and escuela_id = mi_escuela() and cerrado_en is null
    and (cajero_id = auth.uid() or es_admin()) for update;
  if not found then raise exception 'Corte no encontrado o ya cerrado'; end if;
  select coalesce(sum(p.monto) filter (where p.forma = 'efectivo'),0),
         coalesce(sum(p.monto) filter (where p.forma = 'tarjeta'),0),
         coalesce(sum(p.monto) filter (where p.forma in ('transferencia','cheque')),0)
    into v_ef, v_tj, v_tr
    from pagos p join recibos r on r.id = p.recibo_id
   where r.escuela_id = c.escuela_id and r.emitido_por = c.cajero_id and not r.cancelado and r.emitido_en >= c.abierto_en;
  select coalesce(sum(monto),0) into v_sal from salidas_caja where corte_id = p_corte;
  update cortes_caja set cerrado_en = now(), total_efectivo = v_ef, total_tarjeta = v_tj, total_transferencia = v_tr,
     total_salidas = v_sal, efectivo_contado = p_efectivo_contado,
     diferencia = p_efectivo_contado - (c.fondo_inicial + v_ef - v_sal), notas = p_notas
   where id = p_corte returning * into c;
  return c;
end $$;

revoke execute on function registrar_cobro(uuid, jsonb, forma_pago, text, uuid, uuid) from public, anon;
revoke execute on function registrar_venta(uuid, jsonb, forma_pago, uuid, uuid) from public, anon;
revoke execute on function abrir_corte(numeric) from public, anon;
revoke execute on function cerrar_corte(uuid, numeric, text) from public, anon;
grant execute on function registrar_cobro(uuid, jsonb, forma_pago, text, uuid, uuid) to authenticated;
grant execute on function registrar_venta(uuid, jsonb, forma_pago, uuid, uuid) to authenticated;
grant execute on function abrir_corte(numeric) to authenticated;
grant execute on function cerrar_corte(uuid, numeric, text) to authenticated;

-- Invitaciones: el admin registra el correo y el rol; al crear su cuenta, la persona queda con ese rol.
create table invitaciones (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  correo text not null,
  nombre text not null,
  rol rol_usuario not null,
  usada boolean not null default false,
  creado_en timestamptz not null default now(),
  unique (escuela_id, correo)
);
alter table invitaciones enable row level security;
create policy "admin_invitaciones" on invitaciones for all
  using (escuela_id = mi_escuela() and es_admin()) with check (escuela_id = mi_escuela() and es_admin());

create or replace function invitacion_pendiente(p_correo text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from invitaciones where lower(correo) = lower(trim(p_correo)) and not usada)
$$;
grant execute on function invitacion_pendiente(text) to anon, authenticated;

-- Activa la cuenta al iniciar sesión: primer administrador o invitación pendiente
create or replace function activar_cuenta(p_nombre text default 'Administrador') returns boolean
language plpgsql security definer set search_path = public as $$
declare v_correo text; inv invitaciones;
begin
  if auth.uid() is null then return false; end if;
  if exists (select 1 from perfiles where id = auth.uid()) then return false; end if;
  if not exists (select 1 from perfiles) then
    insert into perfiles (id, escuela_id, rol, nombre) select auth.uid(), id, 'admin', p_nombre from escuelas order by creado_en limit 1;
    return true;
  end if;
  select email into v_correo from auth.users where id = auth.uid() and email_confirmed_at is not null;
  select * into inv from invitaciones where lower(correo) = lower(v_correo) and not usada limit 1;
  if not found then return false; end if;
  insert into perfiles (id, escuela_id, rol, nombre) values (auth.uid(), inv.escuela_id, inv.rol, inv.nombre);
  update invitaciones set usada = true where id = inv.id;
  return true;
end $$;
revoke execute on function activar_cuenta(text) from public, anon;
grant execute on function activar_cuenta(text) to authenticated;

-- Usuarios desactivados pierden acceso
create or replace function mi_escuela() returns uuid
language sql stable security definer set search_path = public as $$
  select escuela_id from perfiles where id = auth.uid() and activo
$$;
create or replace function es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from perfiles where id = auth.uid() and rol = 'admin' and activo)
$$;
