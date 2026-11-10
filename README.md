# Gestión Escolar

Sistema de cobranza, facturación, inventario y control escolar para un colegio
(Maternal, Preescolar y Primaria).

## Tecnología
- Next.js 15 + TypeScript + Tailwind
- Supabase (base de datos Postgres, inicio de sesión y archivos)
- Timbrado CFDI 4.0 mediante un PAC (por definir, sugerido Facturapi)

## Módulos
| Módulo | Estado |
|---|---|
| Inicio: cumpleaños, eventos, avisos e indicadores | Pantalla lista |
| Punto de cobro (colegiaturas y cargos) | Pantalla lista |
| Estados de cuenta | Pantalla lista |
| Venta de mostrador (uniformes y papelería) | Pantalla lista |
| Productos y existencias por almacén | Pantalla lista |
| Alumnos | Pantalla lista |
| Recibos, cancelaciones y corte de caja | Base de datos lista |
| Facturación y paquetes de timbres | Base de datos lista |
| Colegiaturas, planes de pago, becas, descuentos, hermanos, recargos | Base de datos lista |
| Padres, inscripciones, inscripción en línea, candidatos, asistencia | Base de datos lista |
| Planeación de profesores | Base de datos lista |

## Puesta en marcha
1. Crear un proyecto en Supabase.
2. Ejecutar en orden los archivos de `supabase/migrations/` y después `supabase/seed.sql`.
3. Copiar `.env.example` a `.env.local` con la URL y la clave pública del proyecto.
4. `npm install` y `npm run dev`.
