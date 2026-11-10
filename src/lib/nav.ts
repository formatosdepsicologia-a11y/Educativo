import type { LucideIcon } from "lucide-react";
import { ArrowLeftRight, Briefcase, Building2, Calculator, CircleCheck, CirclePlus, ClipboardList, FileCheck, FileText, House, Landmark, Monitor, NotebookPen, Package, Percent, Receipt, Send, ShoppingCart, Star, Trash2, User, UserCog, UserPlus, Users } from "lucide-react";

export type ItemMenu = { titulo: string; ruta: string; icono: LucideIcon; soloAdmin?: boolean };

export const ROLES: Record<string, string> = {
  admin: "Administrador",
  control_escolar: "Control escolar",
  profesor: "Profesor",
  padre: "Padre de familia",
  alumno: "Alumno",
};
export type GrupoMenu = { titulo: string; items: ItemMenu[] };

export const menu: GrupoMenu[] = [
  { titulo: "General", items: [{ titulo: "Inicio", ruta: "/", icono: House }] },
  {
    titulo: "Cobranza",
    items: [
      { titulo: "Punto de cobro", ruta: "/cobranza/punto-de-cobro", icono: Monitor },
      { titulo: "Estados de cuenta", ruta: "/cobranza/estados-de-cuenta", icono: FileText },
      { titulo: "Recibos", ruta: "/cobranza/recibos", icono: Receipt },
      { titulo: "Cancelar recibos", ruta: "/cobranza/cancelar-recibo", icono: Trash2, soloAdmin: true },
      { titulo: "Corte de caja", ruta: "/cobranza/corte-de-caja", icono: Calculator },
      { titulo: "Facturación", ruta: "/cobranza/facturacion", icono: FileCheck },
      { titulo: "Colegiaturas y planes", ruta: "/cobranza/colegiaturas", icono: Star },
      { titulo: "Becas y descuentos", ruta: "/cobranza/becas", icono: Percent },
      { titulo: "Recargos", ruta: "/cobranza/recargos", icono: CirclePlus },
      { titulo: "Recordatorios", ruta: "/cobranza/recordatorios", icono: Send },
    ],
  },
  {
    titulo: "Inventario",
    items: [
      { titulo: "Productos y existencias", ruta: "/inventario", icono: Package },
      { titulo: "Venta de mostrador", ruta: "/inventario/venta", icono: ShoppingCart },
      { titulo: "Movimientos", ruta: "/inventario/movimientos", icono: ArrowLeftRight },
    ],
  },
  {
    titulo: "Control escolar",
    items: [
      { titulo: "Alumnos", ruta: "/control-escolar/alumnos", icono: User },
      { titulo: "Padres de familia", ruta: "/control-escolar/padres", icono: Users },
      { titulo: "Inscripciones", ruta: "/control-escolar/inscripciones", icono: ClipboardList },
      { titulo: "Candidatos", ruta: "/control-escolar/candidatos", icono: UserPlus },
      { titulo: "Asistencia", ruta: "/control-escolar/asistencia", icono: CircleCheck },
      { titulo: "Niveles, grados y grupos", ruta: "/control-escolar/grupos", icono: Landmark },
    ],
  },
  {
    titulo: "Académico",
    items: [
      { titulo: "Planeación", ruta: "/academico/planeacion", icono: NotebookPen },
      { titulo: "Profesores", ruta: "/academico/profesores", icono: Briefcase },
    ],
  },
  {
    titulo: "Configuración",
    items: [
      { titulo: "Usuarios", ruta: "/configuracion/usuarios", icono: UserCog, soloAdmin: true },
      { titulo: "Empresas y timbres", ruta: "/configuracion/empresas", icono: Building2, soloAdmin: true },
    ],
  },
];
