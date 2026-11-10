"use client";
import { useEffect, useState } from "react";
import { crearClienteNavegador } from "@/lib/supabase/client";
import Link from "next/link";
import { pesos } from "@/lib/formato";

type Recibo = { id: string; folio: number; total: number; cancelado: boolean; motivo_cancelacion: string | null; emitido_en: string; alumnos: { nombre: string; apellidos: string } | null };

export default function Recibos() {
  const supabase = crearClienteNavegador();
  const [dia, setDia] = useState(new Date().toISOString().slice(0, 10));
  const [recibos, setRecibos] = useState<Recibo[]>([]);

  async function cargar() {
    const desde = new Date(dia + "T00:00:00"), hasta = new Date(dia + "T23:59:59");
    const { data } = await supabase.from("recibos").select("id, folio, total, cancelado, motivo_cancelacion, emitido_en, alumnos(nombre, apellidos)")
      .gte("emitido_en", desde.toISOString()).lte("emitido_en", hasta.toISOString()).order("folio", { ascending: false });
    setRecibos((data ?? []) as unknown as Recibo[]);
  }
  useEffect(() => { cargar(); }, [dia]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = recibos.filter((r) => !r.cancelado).reduce((s, r) => s + Number(r.total), 0);

  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-2xl font-semibold">Recibos</h1>
      <div className="flex items-center gap-3">
        <input type="date" className="campo w-auto" value={dia} onChange={(e) => setDia(e.target.value)} />
        <span className="text-sm text-slate-600">Total vigente: <b>{pesos(total)}</b></span>
      </div>
      <div className="tarjeta overflow-x-auto">
        <table className="tabla">
          <thead><tr><th>Folio</th><th>Hora</th><th>Alumno</th><th className="text-right">Total</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {recibos.length === 0 && <tr><td colSpan={6} className="text-slate-500">Sin recibos este día.</td></tr>}
            {recibos.map((r) => (
              <tr key={r.id} className={r.cancelado ? "text-slate-400" : ""}>
                <td className="font-mono">{r.folio}</td>
                <td>{new Date(r.emitido_en).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</td>
                <td>{r.alumnos ? `${r.alumnos.apellidos} ${r.alumnos.nombre}` : "Venta de mostrador"}</td>
                <td className="text-right">{pesos(r.total)}</td>
                <td>{r.cancelado ? <span title={r.motivo_cancelacion ?? ""} className="text-rojo">Cancelado</span> : "Vigente"}</td>
                <td className="text-right">{!r.cancelado && <Link className="text-sm text-rojo" href={`/cobranza/cancelar-recibo?folio=${r.folio}`}>Cancelar</Link>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
