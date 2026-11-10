-- Abrir y cerrar corte de caja
create or replace function abrir_corte(p_fondo numeric default 0) returns uuid
language plpgsql security invoker set search_path = public as $$
declare v_id uuid;
begin
  if not es_admin() then raise exception 'Sin permiso'; end if;
  select id into v_id from cortes_caja where escuela_id = mi_escuela() and cajero_id = auth.uid() and cerrado_en is null;
  if v_id is not null then return v_id; end if;
  insert into cortes_caja (escuela_id, cajero_id, fondo_inicial) values (mi_escuela(), auth.uid(), p_fondo) returning id into v_id;
  return v_id;
end $$;

create or replace function cerrar_corte(p_corte uuid, p_efectivo_contado numeric, p_notas text default null) returns cortes_caja
language plpgsql security invoker set search_path = public as $$
declare c cortes_caja; v_ef numeric; v_tj numeric; v_tr numeric; v_sal numeric;
begin
  if not es_admin() then raise exception 'Sin permiso'; end if;
  select * into c from cortes_caja where id = p_corte and escuela_id = mi_escuela() and cerrado_en is null for update;
  if not found then raise exception 'Corte no encontrado o ya cerrado'; end if;
  select coalesce(sum(p.monto) filter (where p.forma = 'efectivo'),0),
         coalesce(sum(p.monto) filter (where p.forma = 'tarjeta'),0),
         coalesce(sum(p.monto) filter (where p.forma in ('transferencia','cheque')),0)
    into v_ef, v_tj, v_tr
    from pagos p join recibos r on r.id = p.recibo_id
   where r.escuela_id = c.escuela_id and r.emitido_por = c.cajero_id and not r.cancelado
     and r.emitido_en >= c.abierto_en;
  select coalesce(sum(monto),0) into v_sal from salidas_caja where corte_id = p_corte;
  update cortes_caja set cerrado_en = now(), total_efectivo = v_ef, total_tarjeta = v_tj, total_transferencia = v_tr,
     total_salidas = v_sal, efectivo_contado = p_efectivo_contado,
     diferencia = p_efectivo_contado - (c.fondo_inicial + v_ef - v_sal), notas = p_notas
   where id = p_corte returning * into c;
  return c;
end $$;

revoke execute on function abrir_corte(numeric) from public, anon;
revoke execute on function cerrar_corte(uuid, numeric, text) from public, anon;
