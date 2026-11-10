-- Timbrado de CFDI 4.0 desde el sistema (vía PAC) y control de paquetes de timbres.
-- El CSD (.cer/.key y contraseña) se guarda en el PAC, no en esta base de datos.

alter table empresas
  add column pac_proveedor text,        -- ej. facturapi, facturama
  add column pac_organizacion_id text,  -- id de la empresa dentro del PAC
  add column csd_vigente_hasta date,
  add column lugar_expedicion text;     -- CP de expedición

-- Complemento IEDU (obligatorio en facturas de colegiaturas)
alter table niveles add column rvoe text, add column nivel_iedu text; -- Preescolar, Primaria, Secundaria...

alter table facturas
  add column forma_pago_sat text,       -- 01 efectivo, 03 transferencia, 04 tarjeta...
  add column metodo_pago text default 'PUE', -- PUE / PPD
  add column uso_cfdi text,
  add column pac_factura_id text,
  add column motivo_cancelacion text,   -- 01..04 SAT
  add column cancelada_en timestamptz,
  add column error text;

create table factura_conceptos (
  id uuid primary key default gen_random_uuid(),
  factura_id uuid not null references facturas(id) on delete cascade,
  clave_prod_serv text not null default '86121500',
  clave_unidad text not null default 'E48',
  descripcion text not null,
  cantidad numeric(10,2) not null default 1,
  valor_unitario numeric(10,2) not null,
  objeto_impuesto text not null default '01', -- colegiaturas exentas
  iedu_alumno_id uuid references alumnos(id)   -- para complemento IEDU
);

-- Paquetes de timbres comprados y consumo
create table paquetes_timbres (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  empresa_id uuid references empresas(id),
  cantidad int not null,
  costo numeric(10,2),
  comprado_en date not null default current_date,
  vence date
);
create or replace view saldo_timbres with (security_invoker = true) as
select p.escuela_id, p.empresa_id,
  sum(p.cantidad) - coalesce((select count(*) from facturas f
     where f.escuela_id = p.escuela_id and f.empresa_id is not distinct from p.empresa_id
       and f.estado in ('timbrada','cancelada')), 0) as disponibles
from paquetes_timbres p
where p.vence is null or p.vence >= current_date
group by p.escuela_id, p.empresa_id;

do $$
declare t text;
begin
  foreach t in array array['paquetes_timbres'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "leer_misma_escuela" on %I for select using (escuela_id = mi_escuela())', t);
    execute format('create policy "admin_escribe" on %I for all using (escuela_id = mi_escuela() and es_admin()) with check (escuela_id = mi_escuela() and es_admin())', t);
  end loop;
end $$;
alter table factura_conceptos enable row level security;
create policy "ver_conceptos" on factura_conceptos for select using (exists (select 1 from facturas f where f.id = factura_id and f.escuela_id = mi_escuela()));
create policy "admin_conceptos" on factura_conceptos for all using (es_admin() and exists (select 1 from facturas f where f.id = factura_id and f.escuela_id = mi_escuela()));
