"use client";
import { useEffect, useState } from "react";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { pesos } from "@/lib/formato";

type Corte = { id: string; abierto_en: string; cerrado_en: string | null; fondo_inicial: number; total_efectivo: number | null; total_tarjeta: number | null; total_transferencia: number | null; total_salidas: number | null; efectivo_contado: number | null; diferencia: number | null };

export default function CorteDeCaja() {
  const supabase = crearClienteNavegador();
  const [abierto, setAbierto] = useState<Corte | null>(null);
  const [historial, setHistorial] = useState<Corte[]>([]);
  const [fondo, setFondo] = useState("0");
  const [contado, setContado] = useState("");
  const [salida, setSalida] = useState({ concepto: "", monto: "" });
  const [salidas, setSalidas] = useState<{ concepto: string; monto: number }[]>([]);
  const [error, setError] = useState("");

  async function cargar() {
    const { data } = await supabase.from("cortes_caja").select("*").order("abierto_en", { ascending: false }).limit(15);
    const lista = (data ?? []) as Corte[];
    const a = lista.find((c) => !c.cerrado_en) ?? null;
    setAbierto(a); setHistorial(lista.filter((c) => c.cerrado_en));
    if (a) { const { data: s } = await supabase.from("salidas_caja").select("concepto, monto").eq("corte_id", a.id); setSalidas(s ?? []); }
  }
  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function abrir() {
    setError(""); const { error } = await supabase.rpc("abrir_corte", { p_fondo: Number(fondo) });
    if (error) setError(error.message); else cargar();
  }
  async function agregarSalida(e: React.FormEvent) {
    e.preventDefault(); if (!abierto) return;
    const { data: escuela } = await supabase.rpc("mi_escuela");
    const { error } = await supabase.from("salidas_caja").insert({ escuela_id: escuela, corte_id: abierto.id, concepto: salida.concepto, monto: Number(salida.monto) });
    if (error) return setError(error.message);
    setSalida({ concepto: "", monto: "" }); cargar();
  }
  async function cerrar() {
    if (!abierto || contado === "") return;
    setError(""); const { error } = await supabase.rpc("cerrar_corte", { p_corte: abierto.id, p_efectivo_contado: Number(contado) });
    if (error) setError(error.message); else { setContado(""); cargar(); }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-semibold">Corte de caja</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!abierto ? (
        <div className="tarjeta">
          <div className="titulo-tarjeta">Abrir caja</div>
          <div className="p-4 flex flex-wrap items-end gap-3">
            <label className="text-sm">Fondo inicial en efectivo<input className="campo mt-1 w-40" type="number" min="0" step="0.01" value={fondo} onChange={(e) => setFondo(e.target.value)} /></label>
            <button className="boton" onClick={abrir}>Abrir caja</button>
          </div>
        </div>
      ) : (
        <div className="tarjeta">
          <div className="titulo-tarjeta">Caja abierta desde {new Date(abierto.abierto_en).toLocaleString("es-MX")}</div>
          <div className="p-4 space-y-4">
            <p className="text-sm">Fondo inicial: <b>{pesos(abierto.fondo_inicial)}</b></p>
            <div>
              <div className="font-medium text-sm mb-2">Salidas de caja</div>
              <ul className="text-sm space-y-1 mb-2">{salidas.map((s, i) => <li key={i} className="flex justify-between"><span>{s.concepto}</span><span>{pesos(s.monto)}</span></li>)}</ul>
              <form onSubmit={agregarSalida} className="flex flex-wrap gap-2">
                <input className="campo flex-1 min-w-40" placeholder="Concepto" value={salida.concepto} onChange={(e) => setSalida({ ...salida, concepto: e.target.value })} required />
                <input className="campo w-32" type="number" step="0.01" min="0" placeholder="Monto" value={salida.monto} onChange={(e) => setSalida({ ...salida, monto: e.target.value })} required />
                <button className="boton-sec">Agregar salida</button>
              </form>
            </div>
            <div className="flex flex-wrap items-end gap-3 border-t pt-4">
              <label className="text-sm">Efectivo contado en caja<input className="campo mt-1 w-40" type="number" step="0.01" min="0" value={contado} onChange={(e) => setContado(e.target.value)} /></label>
              <button className="boton" onClick={cerrar} disabled={contado === ""}>Cerrar corte</button>
            </div>
          </div>
        </div>
      )}
      <div className="tarjeta overflow-x-auto">
        <div className="titulo-tarjeta">Cortes anteriores</div>
        <table className="tabla">
          <thead><tr><th>Cierre</th><th className="text-right">Efectivo</th><th className="text-right">Tarjeta</th><th className="text-right">Transf.</th><th className="text-right">Salidas</th><th className="text-right">Contado</th><th className="text-right">Diferencia</th></tr></thead>
          <tbody>
            {historial.length === 0 && <tr><td colSpan={7} className="text-slate-500">Aún no hay cortes.</td></tr>}
            {historial.map((c) => (
              <tr key={c.id}>
                <td>{new Date(c.cerrado_en!).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}</td>
                <td className="text-right">{pesos(c.total_efectivo)}</td><td className="text-right">{pesos(c.total_tarjeta)}</td>
                <td className="text-right">{pesos(c.total_transferencia)}</td><td className="text-right">{pesos(c.total_salidas)}</td>
                <td className="text-right">{pesos(c.efectivo_contado)}</td>
                <td className={`text-right font-medium ${Number(c.diferencia) < 0 ? "text-rojo" : Number(c.diferencia) > 0 ? "text-amber-600" : "text-green-700"}`}>{pesos(c.diferencia)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
