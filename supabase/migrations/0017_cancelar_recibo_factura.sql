-- Cancelar recibo con opción de cancelar también su factura.
-- Facturas sin timbrar se cancelan de inmediato; las timbradas quedan marcadas para cancelarse ante el SAT vía el PAC.
alter table facturas add column cancelacion_solicitada boolean not null default false;

drop function if exists cancelar_recibo(uuid, text);
create or replace function cancelar_recibo(p_recibo uuid, p_motivo text, p_cancelar_factura boolean default false) returns void
language plpgsql security invoker set search_path = public as $$
declare v_pago record; v_part record; v_venta uuid;
begin
  if not es_admin() then raise exception 'Sin permiso para cancelar'; end if;
  if coalesce(trim(p_motivo), '') = '' then raise exception 'Escribe el motivo de la cancelación'; end if;
  update recibos set cancelado = true, motivo_cancelacion = p_motivo, cancelado_por = auth.uid(), cancelado_en = now()
   where id = p_recibo and escuela_id = mi_escuela() and not cancelado;
  if not found then raise exception 'Recibo no encontrado o ya cancelado'; end if;
  for v_pago in select cargo_id from pagos where recibo_id = p_recibo and cargo_id is not null loop
    perform actualizar_estado_cargo(v_pago.cargo_id);
  end loop;
  select id into v_venta from ventas where recibo_id = p_recibo;
  if v_venta is not null then
    for v_part in select vp.producto_id, vp.cantidad, p.almacen_id from venta_partidas vp join productos p on p.id = vp.producto_id where vp.venta_id = v_venta loop
      insert into movimientos_inventario (escuela_id, producto_id, almacen_id, tipo, cantidad, venta_id, nota, creado_por)
      values (mi_escuela(), v_part.producto_id, v_part.almacen_id, 'devolucion', v_part.cantidad, v_venta, 'Cancelación de recibo', auth.uid());
    end loop;
  end if;
  if p_cancelar_factura then
    update facturas f set estado = case when f.estado = 'borrador' then 'cancelada'::estado_factura else f.estado end,
           cancelacion_solicitada = (f.estado = 'timbrada'), motivo_cancelacion = '02', cancelada_en = case when f.estado = 'borrador' then now() end
     where f.escuela_id = mi_escuela() and f.estado in ('borrador','timbrada')
       and f.pago_id in (select id from pagos where recibo_id = p_recibo);
  end if;
end $$;
revoke execute on function cancelar_recibo(uuid, text, boolean) from public, anon;
grant execute on function cancelar_recibo(uuid, text, boolean) to authenticated;
