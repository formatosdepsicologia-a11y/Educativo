-- Datos iniciales de ejemplo: niveles y grados
with e as (insert into escuelas (nombre) values ('Mi Colegio') returning id),
n as (
  insert into niveles (escuela_id, nombre, orden)
  select e.id, v.nombre, v.orden from e, (values ('Maternal',1),('Preescolar',2),('Primaria',3)) v(nombre,orden)
  returning id, escuela_id, nombre
)
insert into grados (escuela_id, nivel_id, nombre, orden)
select n.escuela_id, n.id, g.nombre, g.orden
from n join (values
  ('Maternal','Maternal 1',1),('Maternal','Maternal 2',2),
  ('Preescolar','1° Preescolar',1),('Preescolar','2° Preescolar',2),('Preescolar','3° Preescolar',3),
  ('Primaria','1° Primaria',1),('Primaria','2° Primaria',2),('Primaria','3° Primaria',3),
  ('Primaria','4° Primaria',4),('Primaria','5° Primaria',5),('Primaria','6° Primaria',6)
) g(nivel,nombre,orden) on g.nivel = n.nombre;
