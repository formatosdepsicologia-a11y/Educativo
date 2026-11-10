-- Permite a la pantalla de inicio saber si ya existe un administrador (para mostrar "Crear cuenta")
create or replace function hay_administrador() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfiles where rol = 'admin')
$$;
grant execute on function hay_administrador() to anon, authenticated;
