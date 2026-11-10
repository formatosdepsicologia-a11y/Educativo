-- Almacenes, punto de cobro (recibos, cancelaciones, cortes, salidas),
-- descuento por hermanos, padre principal/alterno, pre-registro e inscripción en línea.

-- Almacenes de inventario (ej. Uniformes, Libretas, Otros cobros)
create table almacenes (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  nombre text not null,
  unique (escuela_id, nombre)
);
alter table productos add column almacen_id uuid references almacenes(id);
alter table movimientos_inventario add column almacen_id uuid references almacenes(id);

-- Caja y recibos
create table cajas (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  nombre text not null
);

create table cortes_caja (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  caja_id uuid references cajas(id),
  cajero_id uuid references perfiles(id),
  abierto_en timestamptz not null default now(),
  cerrado_en timestamptz,
  fondo_inicial numeric(10,2) not null default 0,
  total_efectivo numeric(10,2),
  total_tarjeta numeric(10,2),
  total_transferencia numeric(10,2),
  total_salidas numeric(10,2),
  efectivo_contado numeric(10,2),
  diferencia numeric(10,2),
  notas text
);

create type tipo_recibo as enum ('normal','abierto','especial');
create table recibos (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  folio bigint generated always as identity,
  corte_id uuid references cortes_caja(id),
  alumno_id uuid references alumnos(id),
  padre_id uuid references padres(id),
  tipo tipo_recibo not null default 'normal',  -- abierto: concepto libre; especial: monto autorizado
  total numeric(10,2) not null,
  cancelado boolean not null default false,
  motivo_cancelacion text,
  cancelado_por uuid references perfiles(id),
  cancelado_en timestamptz,
  emitido_por uuid references perfiles(id),
  emitido_en timestamptz not null default now()
);
alter table pagos add column recibo_id uuid references recibos(id);
alter table ventas add column recibo_id uuid references recibos(id);

create table salidas_caja (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  corte_id uuid references cortes_caja(id),
  concepto text not null,
  monto numeric(10,2) not null,
  autorizado_por uuid references perfiles(id),
  creado_en timestamptz not null default now()
);

-- Becas por concepto y descuento por hermanos
create table reglas_hermanos (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  numero_hermano int not null,          -- 2 = segundo hermano, 3 = tercero...
  concepto_id uuid references conceptos_cobro(id),
  porcentaje numeric(5,2) not null
);
create table familias (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  nombre text not null
);
alter table alumnos add column familia_id uuid references familias(id);
alter table perfiles_cobro add column clonado_de uuid references perfiles_cobro(id);

-- Padre principal / alterno y validación de pre-registro
alter table alumno_padre add column tipo text not null default 'principal' check (tipo in ('principal','alterno'));
alter table padres add column pre_registro boolean not null default false,
                   add column validado boolean not null default true,
                   add column validado_por uuid references perfiles(id);

-- Usuarios activos / inactivos
alter table perfiles add column activo boolean not null default true;

-- Inscripción en línea
create table solicitudes_inscripcion (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  alumno_id uuid references alumnos(id),
  candidato_id uuid references candidatos(id),
  periodo_id uuid not null references periodos(id),
  nivel_id uuid references niveles(id),
  grado_id uuid references grados(id),
  iniciada_en timestamptz not null default now(),
  paso text not null default 'datos_alumno', -- datos_alumno, padres, documentos, pago, completada
  completada_en timestamptz,
  datos jsonb not null default '{}'
);
create table config_inscripcion_linea (
  escuela_id uuid not null references escuelas(id) on delete cascade,
  periodo_id uuid not null references periodos(id) on delete cascade,
  nivel_id uuid not null references niveles(id) on delete cascade,
  abierta boolean not null default false,
  desde date,
  hasta date,
  primary key (periodo_id, nivel_id)
);

do $$
declare t text;
begin
  foreach t in array array['almacenes','cajas','cortes_caja','recibos','salidas_caja','reglas_hermanos',
    'familias','solicitudes_inscripcion','config_inscripcion_linea']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "leer_misma_escuela" on %I for select using (escuela_id = mi_escuela())', t);
    execute format('create policy "admin_escribe" on %I for all using (escuela_id = mi_escuela() and es_admin()) with check (escuela_id = mi_escuela() and es_admin())', t);
  end loop;
end $$;
