-- Rol "control escolar": cobra, vende, registra inventario y da de alta alumnos.
-- Cancelar recibos/facturas, precios y configuración quedan solo para administradores.
alter type rol_usuario add value if not exists 'control_escolar';
