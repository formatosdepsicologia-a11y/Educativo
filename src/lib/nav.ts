export type ItemMenu = { titulo: string; ruta: string };
export type GrupoMenu = { titulo: string; items: ItemMenu[] };

export const menu: GrupoMenu[] = [
  { titulo: "General", items: [{ titulo: "Inicio", ruta: "/" }] },
  {
    titulo: "Cobranza",
    items: [
      { titulo: "Punto de cobro", ruta: "/cobranza/punto-de-cobro" },
      { titulo: "Estados de cuenta", ruta: "/cobranza/estados-de-cuenta" },
      { titulo: "Recibos y cancelaciones", ruta: "/cobranza/recibos" },
      { titulo: "Corte de caja", ruta: "/cobranza/corte-de-caja" },
      { titulo: "Facturación", ruta: "/cobranza/facturacion" },
      { titulo: "Colegiaturas y planes", ruta: "/cobranza/colegiaturas" },
      { titulo: "Becas y descuentos", ruta: "/cobranza/becas" },
      { titulo: "Recargos", ruta: "/cobranza/recargos" },
      { titulo: "Recordatorios", ruta: "/cobranza/recordatorios" },
    ],
  },
  {
    titulo: "Inventario",
    items: [
      { titulo: "Productos y existencias", ruta: "/inventario" },
      { titulo: "Venta de mostrador", ruta: "/inventario/venta" },
      { titulo: "Movimientos", ruta: "/inventario/movimientos" },
    ],
  },
  {
    titulo: "Control escolar",
    items: [
      { titulo: "Alumnos", ruta: "/control-escolar/alumnos" },
      { titulo: "Padres de familia", ruta: "/control-escolar/padres" },
      { titulo: "Inscripciones", ruta: "/control-escolar/inscripciones" },
      { titulo: "Candidatos", ruta: "/control-escolar/candidatos" },
      { titulo: "Asistencia", ruta: "/control-escolar/asistencia" },
      { titulo: "Niveles, grados y grupos", ruta: "/control-escolar/grupos" },
    ],
  },
  {
    titulo: "Académico",
    items: [
      { titulo: "Planeación", ruta: "/academico/planeacion" },
      { titulo: "Profesores", ruta: "/academico/profesores" },
    ],
  },
  {
    titulo: "Configuración",
    items: [
      { titulo: "Usuarios", ruta: "/configuracion/usuarios" },
      { titulo: "Empresas y timbres", ruta: "/configuracion/empresas" },
    ],
  },
];
