-- Cobranza avanzada: perfiles de cobro, planes de pago, becas, descuentos,
-- recargos, bonificaciones, comisiones, excepciones, bloqueos, recordatorios,
-- empresas emisoras, bancos, candidatos y conducta.

-- Empresas / razones sociales que emiten (una escuela puede facturar con varias)
create table empresas (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  razon_social text not null,
  rfc text not null,
  regimen_fiscal text not null,
  codigo_postal text not null,
  serie_factura text,
  nivel_id uuid references niveles(id)  -- opcional: empresa por nivel
);
alter table conceptos_cobro add column empresa_id uuid references empresas(id);
alter table facturas add column empresa_id uuid references empresas(id);

create table bancos (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  empresa_id uuid references empresas(id),
  banco text not null,
  cuenta text,
  clabe text,
  referencia_convenio text
);
alter table pagos add column banco_id uuid references bancos(id);

-- Comisión bancaria por forma de pago (ej. tarjeta 3.5%)
create table comisiones_bancarias (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  forma forma_pago not null,
  porcentaje numeric(5,2) not null default 0,
  monto_fijo numeric(10,2) not null default 0,
  trasladar_al_padre boolean not null default false
);
alter table pagos add column comision numeric(10,2) not null default 0;

-- Perfil de cobro: qué conceptos y montos aplican (por nivel/grado/ciclo)
create table perfiles_cobro (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  periodo_id uuid references periodos(id),
  nivel_id uuid references niveles(id),
  grado_id uuid references grados(id),
  nombre text not null
);

-- Plan de pagos: calendario de cargos del perfil (ej. 10 colegiaturas)
create table plan_pagos (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  perfil_cobro_id uuid not null references perfiles_cobro(id) on delete cascade,
  concepto_id uuid not null references conceptos_cobro(id),
  descripcion text not null,      -- ej. "Colegiatura septiembre"
  monto numeric(10,2) not null,
  vence date not null,
  dias_pronto_pago int default 0, -- descuento si paga antes
  descuento_pronto_pago numeric(10,2) default 0
);
alter table alumnos add column perfil_cobro_id uuid references perfiles_cobro(id);
alter table cargos add column plan_pago_id uuid references plan_pagos(id);

-- Recargos automáticos por pago tardío
create table reglas_recargo (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  concepto_id uuid references conceptos_cobro(id),
  dias_gracia int not null default 0,
  tipo text not null check (tipo in ('porcentaje','monto')),
  valor numeric(10,2) not null,
  repetir_cada_dias int,          -- null = una sola vez
  activo boolean not null default true
);
alter table cargos add column cargo_origen_id uuid references cargos(id); -- recargo ligado a su cargo

-- Becas y descuentos por alumno
create type tipo_beneficio as enum ('beca','descuento','bonificacion');
create table beneficios_alumno (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  alumno_id uuid not null references alumnos(id) on delete cascade,
  tipo tipo_beneficio not null,
  concepto_id uuid references conceptos_cobro(id), -- null = todos
  porcentaje numeric(5,2),
  monto numeric(10,2),
  motivo text,                     -- ej. hermanos, convenio empresa, beca SEP
  vigente_desde date,
  vigente_hasta date,
  autorizado_por uuid references perfiles(id)
);
alter table cargos add column descuento numeric(10,2) not null default 0;

-- Excepciones (no aplicar recargo, prórroga, etc.)
create table excepciones_cobro (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  alumno_id uuid not null references alumnos(id) on delete cascade,
  cargo_id uuid references cargos(id),
  tipo text not null,              -- sin_recargo, prorroga, exento
  nueva_fecha date,
  motivo text,
  autorizado_por uuid references perfiles(id)
);

-- Bloqueos por adeudo (portal de padres, boletas, constancias)
create table bloqueos (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  alumno_id uuid not null references alumnos(id) on delete cascade,
  motivo text not null,
  bloquea text[] not null default array['portal','boletas','constancias'],
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

-- Recordatorios de pago
create table recordatorios_pago (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  dias_relativos int not null,     -- -3 = tres días antes de vencer, 5 = cinco después
  canal text not null default 'correo', -- correo, whatsapp, sms
  mensaje text not null,
  activo boolean not null default true
);
create table recordatorios_enviados (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  cargo_id uuid not null references cargos(id) on delete cascade,
  padre_id uuid references padres(id),
  canal text not null,
  enviado_en timestamptz not null default now()
);

-- Candidatos / nuevo ingreso
create table candidatos (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  nombre text not null,
  apellidos text not null,
  fecha_nacimiento date,
  grado_id uuid references grados(id),
  periodo_id uuid references periodos(id),
  tutor_nombre text,
  tutor_telefono text,
  tutor_correo text,
  etapa text not null default 'interesado', -- interesado, entrevista, examen, aceptado, inscrito, rechazado
  alumno_id uuid references alumnos(id),     -- al inscribirse
  creado_en timestamptz not null default now()
);

-- Observaciones de conducta
create table observaciones_conducta (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  alumno_id uuid not null references alumnos(id) on delete cascade,
  fecha date not null default current_date,
  tipo text not null default 'incidencia',
  descripcion text not null,
  registrado_por uuid references perfiles(id)
);

do $$
declare t text;
begin
  foreach t in array array['empresas','bancos','comisiones_bancarias','perfiles_cobro','plan_pagos',
    'reglas_recargo','beneficios_alumno','excepciones_cobro','bloqueos','recordatorios_pago',
    'recordatorios_enviados','candidatos','observaciones_conducta']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "leer_misma_escuela" on %I for select using (escuela_id = mi_escuela())', t);
    execute format('create policy "admin_escribe" on %I for all using (escuela_id = mi_escuela() and es_admin()) with check (escuela_id = mi_escuela() and es_admin())', t);
  end loop;
end $$;

-- Estado de cuenta por alumno
create or replace view estado_cuenta with (security_invoker = true) as
select c.escuela_id, c.alumno_id, c.id as cargo_id, c.descripcion, c.vence, c.monto, c.descuento,
       coalesce((select sum(p.monto) from pagos p where p.cargo_id = c.id), 0) as pagado,
       c.monto - c.descuento - coalesce((select sum(p.monto) from pagos p where p.cargo_id = c.id), 0) as saldo,
       c.estado
from cargos c where c.estado <> 'cancelado';
