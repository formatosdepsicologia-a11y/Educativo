-- El primer usuario que entra queda como administrador (solo si aún no hay perfiles)
create or replace function crear_primer_admin(p_nombre text default 'Administrador') returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  if exists (select 1 from perfiles) then return false; end if;
  insert into perfiles (id, escuela_id, rol, nombre)
  select auth.uid(), id, 'admin', p_nombre from escuelas order by creado_en limit 1;
  return true;
end $$;
revoke execute on function crear_primer_admin(text) from public, anon;
grant execute on function crear_primer_admin(text) to authenticated;
