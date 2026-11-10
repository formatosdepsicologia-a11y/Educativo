"use client";
import { useState } from "react";
import BuscarAlumno, { type AlumnoBasico } from "@/components/BuscarAlumno";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { pesos, fecha } from "@/lib/formato";

type Cargo = { cargo_id: string; descripcion: string; vence: string | null; saldo: number };
const FORMAS = [
  { valor: "efectivo", texto: "Efectivo" },
  { valor: "transferencia", texto: "Transferencia" },
  { valor: "tarjeta", texto: "Tarjeta" },
  { valor: "cheque", texto: "Cheque" },
];

export default function PuntoDeCobro() {
  const supabase = crearClienteNavegador();
  const [alumno, setAlumno] = useState<AlumnoBasico | null>(null);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [montos, setMontos] = useState<Record<string, string>>({});
  const [forma, setForma] = useState("efectivo");
  const [referencia, setReferencia] = useState("");
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function cargar(a: AlumnoBasico) {
    setAlumno(a); setMensaje(null); setMontos({});
    const { data } = await supabase.from("estado_cuenta").select("cargo_id, descripcion, vence, saldo")
      .eq("alumno_id", a.id).gt("saldo", 0).order("vence");
    setCargos((data ?? []) as Cargo[]);
  }

  const alternar = (c: Cargo) => setMontos((m) => {
    const n = { ...m };
    if (n[c.cargo_id] !== undefined) delete n[c.cargo_id]; else n[c.cargo_id] = String(c.saldo);
    return n;
  });
  const total = Object.values(montos).reduce((a, v) => a + (Number(v) || 0), 0);
  const hoy = new Date().toISOString().slice(0, 10);

  async function cobrar() {
    if (!alumno || total <= 0) return;
    setGuardando(true); setMensaje(null);
    const partidas = Object.entries(montos).map(([cargo_id, monto]) => ({ cargo_id, monto: Number(monto) }));
    const { data, error } = await supabase.rpc("registrar_cobro", {
      p_alumno: alumno.id, p_partidas: partidas, p_forma: forma, p_referencia: referencia || null,
    });
    setGuardando(false);
    if (error) return setMensaje({ tipo: "error", texto: error.message });
    const { data: recibo } = await supabase.from("recibos").select("folio").eq("id", data).single();
    setMensaje({ tipo: "ok", texto: `Cobro registrado. Recibo folio ${recibo?.folio ?? ""} por ${pesos(total)}.` });
    setReferencia("");
    cargar(alumno);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-semibold">Punto de cobro</h1>
      <div className="tarjeta p-4"><BuscarAlumno onElegir={cargar} /></div>

      {alumno && (
        <div className="tarjeta">
          <div className="titulo-tarjeta">{alumno.apellidos} {alumno.nombre} <span className="font-normal text-slate-500">· {alumno.matricula}</span></div>
          {cargos.length === 0 ? <p className="p-4 text-sm text-slate-500">No tiene adeudos pendientes.</p> : (
            <div className="overflow-x-auto">
              <table className="tabla">
                <thead><tr><th></th><th>Concepto</th><th>Vence</th><th className="text-right">Saldo</th><th className="text-right">A cobrar</th></tr></thead>
                <tbody>
                  {cargos.map((c) => {
                    const sel = montos[c.cargo_id] !== undefined;
                    const vencido = c.vence && c.vence < hoy;
                    return (
                      <tr key={c.cargo_id}>
                        <td><input type="checkbox" checked={sel} onChange={() => alternar(c)} /></td>
                        <td>{c.descripcion}</td>
                        <td className={vencido ? "text-red-600" : ""}>{fecha(c.vence)}</td>
                        <td className="text-right">{pesos(c.saldo)}</td>
                        <td className="text-right">
                          <input className="campo w-28 text-right" type="number" min="0" max={c.saldo} step="0.01" disabled={!sel}
                            value={montos[c.cargo_id] ?? ""} onChange={(e) => setMontos({ ...montos, [c.cargo_id]: e.target.value })} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="p-4 grid sm:grid-cols-3 gap-3 items-end border-t">
            <label className="text-sm">Forma de pago
              <select className="campo mt-1" value={forma} onChange={(e) => setForma(e.target.value)}>
                {FORMAS.map((f) => <option key={f.valor} value={f.valor}>{f.texto}</option>)}
              </select>
            </label>
            <label className="text-sm">Referencia
              <input className="campo mt-1" value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Opcional" />
            </label>
            <button className="boton h-10" onClick={cobrar} disabled={guardando || total <= 0}>
              {guardando ? "Registrando..." : `Cobrar ${pesos(total)}`}
            </button>
          </div>
          {mensaje && <p className={`px-4 pb-4 text-sm ${mensaje.tipo === "ok" ? "text-teal-700" : "text-red-600"}`}>{mensaje.texto}</p>}
        </div>
      )}
    </div>
  );
}
