-- Planeación de profesores
create type estado_planeacion as enum ('borrador','enviada','aprobada','con_observaciones');

create table planeaciones (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  profesor_id uuid not null references profesores(id) on delete cascade,
  grupo_id uuid references grupos(id) on delete set null,
  materia_id uuid references materias(id) on delete set null,
  semana_inicio date not null,
  semana_fin date,
  objetivos text,
  actividades text,
  materiales text,
  evaluacion text,
  archivo_url text,
  estado estado_planeacion not null default 'borrador',
  observaciones text,
  revisado_por uuid references perfiles(id),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

alter table planeaciones enable row level security;
create policy "leer_misma_escuela" on planeaciones for select using (escuela_id = mi_escuela());
create policy "admin_escribe" on planeaciones for all
  using (escuela_id = mi_escuela() and es_admin()) with check (escuela_id = mi_escuela() and es_admin());
create policy "profesor_propias" on planeaciones for all
  using (escuela_id = mi_escuela() and exists (select 1 from profesores p where p.id = profesor_id and p.perfil_id = auth.uid()))
  with check (escuela_id = mi_escuela() and exists (select 1 from profesores p where p.id = profesor_id and p.perfil_id = auth.uid()));
