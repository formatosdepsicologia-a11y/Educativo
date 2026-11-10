"use client";
import { useState } from "react";
import BuscarAlumno, { type AlumnoBasico } from "@/components/BuscarAlumno";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { pesos, fecha } from "@/lib/formato";

type Fila = { cargo_id: string; descripcion: string; vence: string | null; monto: number; descuento: number; pagado: number; saldo: number; estado: string };
const COLOR: Record<string, string> = { pagado: "bg-teal-100 text-teal-700", parcial: "bg-amber-100 text-amber-700", pendiente: "bg-slate-100 text-slate-600" };

export default function EstadosDeCuenta() {
  const [alumno, setAlumno] = useState<AlumnoBasico | null>(null);
  const [filas, setFilas] = useState<Fila[]>([]);

  async function cargar(a: AlumnoBasico) {
    setAlumno(a);
    const { data } = await crearClienteNavegador().from("estado_cuenta").select("*").eq("alumno_id", a.id).order("vence");
    setFilas((data ?? []) as Fila[]);
  }
  const t = (k: keyof Fila) => filas.reduce((s, f) => s + Number(f[k] ?? 0), 0);

  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-2xl font-semibold">Estados de cuenta</h1>
      <div className="tarjeta p-4"><BuscarAlumno onElegir={cargar} /></div>
      {alumno && (
        <div className="tarjeta">
          <div className="titulo-tarjeta flex justify-between">
            <span>{alumno.apellidos} {alumno.nombre} · {alumno.matricula}</span>
            <button className="text-sm font-normal text-teal-700" onClick={() => window.print()}>Imprimir</button>
          </div>
          <div className="overflow-x-auto">
            <table className="tabla">
              <thead><tr><th>Concepto</th><th>Vence</th><th className="text-right">Cargo</th><th className="text-right">Descuento</th><th className="text-right">Pagado</th><th className="text-right">Saldo</th><th>Estado</th></tr></thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.cargo_id}>
                    <td>{f.descripcion}</td><td>{fecha(f.vence)}</td>
                    <td className="text-right">{pesos(f.monto)}</td><td className="text-right">{pesos(f.descuento)}</td>
                    <td className="text-right">{pesos(f.pagado)}</td><td className="text-right font-medium">{pesos(f.saldo)}</td>
                    <td><span className={`rounded px-2 py-0.5 text-xs capitalize ${COLOR[f.estado] ?? ""}`}>{f.estado}</span></td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="font-semibold">
                <td colSpan={2} className="px-3 py-2">Total</td>
                <td className="text-right px-3">{pesos(t("monto"))}</td><td className="text-right px-3">{pesos(t("descuento"))}</td>
                <td className="text-right px-3">{pesos(t("pagado"))}</td><td className="text-right px-3">{pesos(t("saldo"))}</td><td />
              </tr></tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
