-- Control escolar: expediente, estatus, documentos, constancias y boletas

create type estatus_alumno as enum ('aspirante','inscrito','reinscrito','baja_temporal','baja_definitiva','egresado');

alter table alumnos
  add column estatus estatus_alumno not null default 'inscrito',
  add column sexo text,
  add column tipo_sangre text,
  add column alergias text,
  add column domicilio text,
  add column escuela_procedencia text;

create table historial_estatus (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  alumno_id uuid not null references alumnos(id) on delete cascade,
  estatus estatus_alumno not null,
  motivo text,
  fecha date not null default current_date,
  registrado_por uuid references perfiles(id)
);

-- Expediente digital (acta, CURP, certificados, fotos, etc.)
create table documentos_alumno (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  alumno_id uuid not null references alumnos(id) on delete cascade,
  tipo text not null,          -- acta_nacimiento, curp, certificado, cartilla, foto...
  archivo_url text,
  entregado boolean not null default false,
  fecha_entrega date,
  notas text
);

-- Constancias emitidas (estudios, inscripción, conducta)
create table constancias (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  alumno_id uuid not null references alumnos(id) on delete cascade,
  tipo text not null,
  folio text,
  pdf_url text,
  emitida_en timestamptz not null default now(),
  emitida_por uuid references perfiles(id)
);

-- Boletas / calificaciones (opcional)
create table calificaciones (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  alumno_id uuid not null references alumnos(id) on delete cascade,
  asignacion_id uuid not null references asignaciones(id) on delete cascade,
  parcial int not null,
  valor numeric(5,2) not null check (valor >= 0 and valor <= 10),
  observaciones text,
  unique (alumno_id, asignacion_id, parcial)
);

do $$
declare t text;
begin
  foreach t in array array['historial_estatus','documentos_alumno','constancias','calificaciones']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "leer_misma_escuela" on %I for select using (escuela_id = mi_escuela())', t);
    execute format('create policy "admin_escribe" on %I for all using (escuela_id = mi_escuela() and es_admin()) with check (escuela_id = mi_escuela() and es_admin())', t);
  end loop;
end $$;

create policy "profesor_calificaciones" on calificaciones for all
  using (escuela_id = mi_escuela() and exists (select 1 from asignaciones s join profesores p on p.id = s.profesor_id where s.id = asignacion_id and p.perfil_id = auth.uid()))
  with check (escuela_id = mi_escuela() and exists (select 1 from asignaciones s join profesores p on p.id = s.profesor_id where s.id = asignacion_id and p.perfil_id = auth.uid()));
