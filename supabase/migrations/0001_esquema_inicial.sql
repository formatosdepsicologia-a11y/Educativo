-- Esquema inicial del sistema escolar (multi-escuela)
create extension if not exists "pgcrypto";

create table escuelas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  logo_url text,
  creado_en timestamptz not null default now()
);

create type rol_usuario as enum ('admin','profesor','padre','alumno');

create table perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  escuela_id uuid not null references escuelas(id) on delete cascade,
  rol rol_usuario not null,
  nombre text not null,
  apellidos text,
  telefono text,
  creado_en timestamptz not null default now()
);

create table periodos (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  nombre text not null,
  inicio date not null,
  fin date not null,
  activo boolean not null default false
);

create table niveles (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  nombre text not null,
  orden int not null default 0
);

create table grados (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  nivel_id uuid not null references niveles(id) on delete cascade,
  nombre text not null,
  orden int not null default 0
);

create table grupos (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  grado_id uuid not null references grados(id) on delete cascade,
  periodo_id uuid not null references periodos(id) on delete cascade,
  nombre text not null,
  tutor_id uuid references perfiles(id)
);

create table materias (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  grado_id uuid references grados(id) on delete set null,
  nombre text not null
);

create table alumnos (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  perfil_id uuid references perfiles(id) on delete set null,
  matricula text,
  nombre text not null,
  apellidos text not null,
  fecha_nacimiento date,
  curp text,
  foto_url text,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  unique (escuela_id, matricula)
);

create table inscripciones (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  alumno_id uuid not null references alumnos(id) on delete cascade,
  grupo_id uuid not null references grupos(id) on delete cascade,
  fecha date not null default current_date,
  unique (alumno_id, grupo_id)
);

create table padres (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  perfil_id uuid references perfiles(id) on delete set null,
  nombre text not null,
  apellidos text,
  telefono text,
  correo text,
  fecha_nacimiento date
);

create table alumno_padre (
  alumno_id uuid not null references alumnos(id) on delete cascade,
  padre_id uuid not null references padres(id) on delete cascade,
  parentesco text,
  primary key (alumno_id, padre_id)
);

create table profesores (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  perfil_id uuid references perfiles(id) on delete set null,
  nombre text not null,
  apellidos text,
  telefono text,
  correo text,
  fecha_nacimiento date
);

create table asignaciones (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  profesor_id uuid not null references profesores(id) on delete cascade,
  grupo_id uuid not null references grupos(id) on delete cascade,
  materia_id uuid not null references materias(id) on delete cascade,
  unique (grupo_id, materia_id)
);

create table eventos (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  titulo text not null,
  descripcion text,
  inicio timestamptz not null,
  fin timestamptz,
  creado_por uuid references perfiles(id)
);

create table avisos (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  titulo text not null,
  contenido text not null,
  dirigido_a rol_usuario[],
  publicado_en timestamptz not null default now(),
  creado_por uuid references perfiles(id)
);

create type estado_asistencia as enum ('presente','falta','retardo','justificada');

create table asistencias (
  id uuid primary key default gen_random_uuid(),
  escuela_id uuid not null references escuelas(id) on delete cascade,
  alumno_id uuid not null references alumnos(id) on delete cascade,
  grupo_id uuid references grupos(id) on delete set null,
  fecha date not null default current_date,
  estado estado_asistencia not null default 'presente',
  via_qr boolean not null default false,
  registrado_en timestamptz not null default now(),
  unique (alumno_id, fecha)
);

-- Seguridad: cada usuario solo ve los datos de su escuela
create or replace function mi_escuela() returns uuid
language sql stable security definer set search_path = public as $$
  select escuela_id from perfiles where id = auth.uid()
$$;

create or replace function es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from perfiles where id = auth.uid() and rol = 'admin')
$$;

do $$
declare t text;
begin
  foreach t in array array['periodos','niveles','grados','grupos','materias','alumnos','inscripciones',
    'padres','profesores','asignaciones','eventos','avisos','asistencias']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "leer_misma_escuela" on %I for select using (escuela_id = mi_escuela())', t);
    execute format('create policy "admin_escribe" on %I for all using (escuela_id = mi_escuela() and es_admin()) with check (escuela_id = mi_escuela() and es_admin())', t);
  end loop;
end $$;

alter table escuelas enable row level security;
create policy "ver_mi_escuela" on escuelas for select using (id = mi_escuela());
alter table perfiles enable row level security;
create policy "ver_perfiles_escuela" on perfiles for select using (escuela_id = mi_escuela());
create policy "admin_perfiles" on perfiles for all using (escuela_id = mi_escuela() and es_admin()) with check (escuela_id = mi_escuela() and es_admin());
alter table alumno_padre enable row level security;
create policy "ver_alumno_padre" on alumno_padre for select using (exists (select 1 from alumnos a where a.id = alumno_id and a.escuela_id = mi_escuela()));
create policy "admin_alumno_padre" on alumno_padre for all using (es_admin() and exists (select 1 from alumnos a where a.id = alumno_id and a.escuela_id = mi_escuela()));

-- Profesores pueden registrar asistencia
create policy "profesor_asistencia" on asistencias for insert with check (escuela_id = mi_escuela() and exists(select 1 from perfiles where id = auth.uid() and rol = 'profesor'));

-- Cumpleaños del mes (alumnos, padres y profesores) para el calendario
create or replace view cumpleanos with (security_invoker = true) as
  select escuela_id, 'alumno' as tipo, nombre || ' ' || apellidos as nombre, fecha_nacimiento from alumnos where fecha_nacimiento is not null and activo
  union all
  select escuela_id, 'padre', nombre || ' ' || coalesce(apellidos,''), fecha_nacimiento from padres where fecha_nacimiento is not null
  union all
  select escuela_id, 'profesor', nombre || ' ' || coalesce(apellidos,''), fecha_nacimiento from profesores where fecha_nacimiento is not null;
