-- Funciones transaccionales para el punto de cobro

-- Recalcula el estado de un cargo según lo pagado
create or replace function actualizar_estado_cargo(p_cargo uuid) returns void
language plpgsql set search_path = public as $$
declare v_pagado numeric; v_neto numeric;
begin
  select coalesce(sum(p.monto),0) into v_pagado
    from pagos p left join recibos r on r.id = p.recibo_id
   where p.cargo_id = p_cargo and coalesce(r.cancelado,false) = false;
  select monto - descuento into v_neto from cargos where id = p_cargo;
  update cargos set estado = case
      when estado = 'cancelado' then 'cancelado'
      when v_pagado >= v_neto then 'pagado'
      when v_pagado > 0 then 'parcial'
      else 'pendiente' end::estado_cargo
   where id = p_cargo;
end $$;

-- Cobrar uno o varios cargos de un alumno. p_partidas: [{"cargo_id": "...", "monto": 1500}]
create or replace function registrar_cobro(
  p_alumno uuid, p_partidas jsonb, p_forma forma_pago,
  p_referencia text default null, p_padre uuid default null, p_corte uuid default null
) returns uuid
language plpgsql security invoker set search_path = public as $$
declare v_escuela uuid := mi_escuela(); v_recibo uuid; v_total numeric := 0; v_item jsonb;
begin
  if not es_admin() then raise exception 'Sin permiso para cobrar'; end if;
  select coalesce(sum((x->>'monto')::numeric),0) into v_total from jsonb_array_elements(p_partidas) x;
  if v_total <= 0 then raise exception 'El total debe ser mayor a cero'; end if;

  insert into recibos (escuela_id, corte_id, alumno_id, padre_id, total, emitido_por)
  values (v_escuela, p_corte, p_alumno, p_padre, v_total, auth.uid()) returning id into v_recibo;

  for v_item in select * from jsonb_array_elements(p_partidas) loop
    insert into pagos (escuela_id, padre_id, cargo_id, monto, forma, referencia, recibo_id)
    values (v_escuela, p_padre, (v_item->>'cargo_id')::uuid, (v_item->>'monto')::numeric, p_forma, p_referencia, v_recibo);
    perform actualizar_estado_cargo((v_item->>'cargo_id')::uuid);
  end loop;
  return v_recibo;
end $$;

-- Venta de mostrador (uniformes/papelería). p_partidas: [{"producto_id": "...", "cantidad": 2}]
create or replace function registrar_venta(
  p_alumno uuid, p_partidas jsonb, p_forma forma_pago, p_padre uuid default null, p_corte uuid default null
) returns uuid
language plpgsql security invoker set search_path = public as $$
declare v_escuela uuid := mi_escuela(); v_venta uuid; v_recibo uuid; v_total numeric := 0;
        v_item jsonb; v_prod productos%rowtype; v_cant int;
begin
  if not es_admin() then raise exception 'Sin permiso para vender'; end if;
  insert into ventas (escuela_id, alumno_id, padre_id, creado_por) values (v_escuela, p_alumno, p_padre, auth.uid()) returning id into v_venta;
  for v_item in select * from jsonb_array_elements(p_partidas) loop
    v_cant := (v_item->>'cantidad')::int;
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

-- Cancelar recibo: revierte estado de cargos y regresa inventario
create or replace function cancelar_recibo(p_recibo uuid, p_motivo text) returns void
language plpgsql security invoker set search_path = public as $$
declare v_pago record; v_part record; v_venta uuid;
begin
  if not es_admin() then raise exception 'Sin permiso para cancelar'; end if;
  update recibos set cancelado = true, motivo_cancelacion = p_motivo, cancelado_por = auth.uid(), cancelado_en = now()
   where id = p_recibo and escuela_id = mi_escuela() and not cancelado;
  if not found then raise exception 'Recibo no encontrado o ya cancelado'; end if;
  for v_pago in select cargo_id from pagos where recibo_id = p_recibo and cargo_id is not null loop
    perform actualizar_estado_cargo(v_pago.cargo_id);
  end loop;
  select id into v_venta from ventas where recibo_id = p_recibo;
  if v_venta is not null then
    for v_part in select producto_id, cantidad from venta_partidas where venta_id = v_venta loop
      insert into movimientos_inventario (escuela_id, producto_id, tipo, cantidad, venta_id, nota, creado_por)
      values (mi_escuela(), v_part.producto_id, 'devolucion', v_part.cantidad, v_venta, 'Cancelación de recibo', auth.uid());
    end loop;
  end if;
end $$;

-- El estado de cuenta no debe contar pagos de recibos cancelados
create or replace view estado_cuenta with (security_invoker = true) as
select c.escuela_id, c.alumno_id, c.id as cargo_id, c.descripcion, c.vence, c.monto, c.descuento,
       coalesce(pg.pagado, 0) as pagado,
       c.monto - c.descuento - coalesce(pg.pagado, 0) as saldo,
       c.estado
from cargos c
left join lateral (
  select sum(p.monto) as pagado from pagos p left join recibos r on r.id = p.recibo_id
   where p.cargo_id = c.id and coalesce(r.cancelado,false) = false
) pg on true
where c.estado <> 'cancelado';
