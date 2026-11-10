-- Solo usuarios con sesión pueden usar las funciones
revoke execute on function mi_escuela() from public, anon;
revoke execute on function es_admin() from public, anon;
grant execute on function mi_escuela() to authenticated;
grant execute on function es_admin() to authenticated;
revoke execute on function registrar_cobro(uuid, jsonb, forma_pago, text, uuid, uuid) from public, anon;
revoke execute on function registrar_venta(uuid, jsonb, forma_pago, uuid, uuid) from public, anon;
revoke execute on function cancelar_recibo(uuid, text) from public, anon;
revoke execute on function actualizar_estado_cargo(uuid) from public, anon;
