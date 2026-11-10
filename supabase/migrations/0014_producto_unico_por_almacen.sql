-- Un mismo producto/talla puede existir en distintos almacenes
alter table productos drop constraint productos_escuela_id_nombre_talla_key;
alter table productos add constraint productos_almacen_nombre_talla_key unique (escuela_id, almacen_id, nombre, talla);
