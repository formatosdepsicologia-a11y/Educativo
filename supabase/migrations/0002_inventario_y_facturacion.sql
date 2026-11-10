-- Inventario (uniformes y papelería), cobranza y datos de facturación

-- Datos fiscales de padres (CFDI 4.0)
create table datos_fiscales (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  padre_id uuid not null references padres(id) on delete cascade,
  rfc text not null,
  razon_social text not null,
  regimen_fiscal text not null,      -- clave SAT, ej. 605
  uso_cfdi text not null default 'D10', -- D10 = servicios educativos (colegiaturas)
  codigo_postal text not null,
  correo_factura text,
  predeterminado boolean not null default true
);

-- Catálogo de productos
create type categoria_producto as enum ('uniforme','papeleria','libro','otro');

create table productos (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  categoria categoria_producto not null,
  nombre text not null,
  talla text,                 -- solo uniformes
  sku text,
  precio numeric(10,2) not null default 0,
  costo numeric(10,2),
  existencia int not null default 0,
  existencia_minima int not null default 0,
  activo boolean not null default true,
  unique (escuela_id, nombre, talla)
);

create type tipo_movimiento as enum ('entrada','venta','ajuste','devolucion','entrega');

create table movimientos_inventario (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  producto_id uuid not null references productos(id) on delete cascade,
  tipo tipo_movimiento not null,
  cantidad int not null,      -- positiva entra, negativa sale
  nota text,
  venta_id uuid,
  creado_por uuid references perfiles(id),
  creado_en timestamptz not null default now()
);

-- Mantener existencia al registrar movimientos
create or replace function aplicar_movimiento() returns trigger language plpgsql set search_path = public as $$
begin
  update productos set existencia = existencia + new.cantidad where id = new.producto_id;
  return new;
end $$;
create trigger trg_aplicar_movimiento after insert on movimientos_inventario
  for each row execute function aplicar_movimiento();

-- Cobranza: conceptos (colegiatura, inscripción, etc.), cargos y pagos
create table conceptos_cobro (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  nombre text not null,
  monto numeric(10,2) not null,
  clave_sat text default '86121500',  -- servicios educativos
  recurrente boolean not null default false
);

create type estado_cargo as enum ('pendiente','parcial','pagado','cancelado');

create table cargos (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  alumno_id uuid not null references alumnos(id) on delete cascade,
  concepto_id uuid references conceptos_cobro(id),
  descripcion text not null,
  monto numeric(10,2) not null,
  vence date,
  estado estado_cargo not null default 'pendiente',
  creado_en timestamptz not null default now()
);

-- Ventas de mostrador (uniformes / papelería)
create table ventas (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  alumno_id uuid references alumnos(id),
  padre_id uuid references padres(id),
  total numeric(10,2) not null default 0,
  creado_por uuid references perfiles(id),
  creado_en timestamptz not null default now()
);

create table venta_partidas (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references ventas(id) on delete cascade,
  producto_id uuid not null references productos(id),
  cantidad int not null check (cantidad > 0),
  precio_unitario numeric(10,2) not null
);

alter table movimientos_inventario add constraint fk_mov_venta foreign key (venta_id) references ventas(id) on delete set null;

create type forma_pago as enum ('efectivo','transferencia','tarjeta','cheque');

create table pagos (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  padre_id uuid references padres(id),
  cargo_id uuid references cargos(id),
  venta_id uuid references ventas(id),
  monto numeric(10,2) not null,
  forma forma_pago not null,
  referencia text,
  pagado_en timestamptz not null default now()
);

-- Facturas emitidas (timbrado vía PAC)
create type estado_factura as enum ('borrador','timbrada','cancelada','error');

create table facturas (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  datos_fiscales_id uuid not null references datos_fiscales(id),
  pago_id uuid references pagos(id),
  alumno_id uuid references alumnos(id),
  total numeric(10,2) not null,
  uuid_sat text,
  serie text,
  folio text,
  estado estado_factura not null default 'borrador',
  xml_url text,
  pdf_url text,
  emitida_en timestamptz
);

do $$
declare t text;
begin
  foreach t in array array['datos_fiscales','productos','movimientos_inventario','conceptos_cobro',
    'cargos','ventas','pagos','facturas']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "leer_misma_escuela" on %I for select using (escuela_id = mi_escuela())', t);
    execute format('create policy "admin_escribe" on %I for all using (escuela_id = mi_escuela() and es_admin()) with check (escuela_id = mi_escuela() and es_admin())', t);
  end loop;
end $$;

alter table venta_partidas enable row level security;
create policy "ver_partidas" on venta_partidas for select using (exists (select 1 from ventas v where v.id = venta_id and v.escuela_id = mi_escuela()));
create policy "admin_partidas" on venta_partidas for all using (es_admin() and exists (select 1 from ventas v where v.id = venta_id and v.escuela_id = mi_escuela()));

-- Productos por debajo del mínimo
create or replace view productos_por_surtir with (security_invoker = true) as
  select * from productos where activo and existencia <= existencia_minima;
