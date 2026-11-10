-- Asignación de niveles a personal de control escolar
create table responsables_nivel (
  escuela_id uuid not null references escuelas(id) on delete cascade,
  nivel_id uuid not null references niveles(id) on delete cascade,
  perfil_id uuid not null references perfiles(id) on delete cascade,
  primary key (nivel_id, perfil_id)
);
alter table responsables_nivel enable row level security;
create policy "leer_misma_escuela" on responsables_nivel for select using (escuela_id = mi_escuela());
create policy "admin_escribe" on responsables_nivel for all
  using (escuela_id = mi_escuela() and es_admin()) with check (escuela_id = mi_escuela() and es_admin());
