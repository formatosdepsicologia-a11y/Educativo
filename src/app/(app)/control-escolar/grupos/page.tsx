"use client";
import { useEffect, useState } from "react";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { fecha } from "@/lib/formato";

type Nivel = { id: string; nombre: string; grados: { id: string; nombre: string; orden: number }[] };
type Periodo = { id: string; nombre: string; inicio: string; fin: string; activo: boolean };
type Grupo = { id: string; nombre: string; grado_id: string; periodo_id: string };

export default function Grupos() {
  const supabase = crearClienteNavegador();
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [periodo, setPeriodo] = useState("");
  const [nuevoP, setNuevoP] = useState({ nombre: "", inicio: "", fin: "" });
  const [error, setError] = useState("");

  async function cargar() {
    const [n, p, g] = await Promise.all([
      supabase.from("niveles").select("id, nombre, grados(id, nombre, orden)").order("orden"),
      supabase.from("periodos").select("*").order("inicio", { ascending: false }),
      supabase.from("grupos").select("id, nombre, grado_id, periodo_id"),
    ]);
    setNiveles((n.data ?? []) as Nivel[]); setPeriodos((p.data ?? []) as Periodo[]); setGrupos((g.data ?? []) as Grupo[]);
    if (!periodo && p.data?.length) setPeriodo((p.data.find((x) => x.activo) ?? p.data[0]).id);
  }
  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function crearPeriodo(e: React.FormEvent) {
    e.preventDefault(); setError("");
    const { data: escuela } = await supabase.rpc("mi_escuela");
    const { data, error } = await supabase.from("periodos").insert({ escuela_id: escuela, ...nuevoP, activo: periodos.length === 0 }).select("id").single();
    if (error) return setError(error.message);
    setNuevoP({ nombre: "", inicio: "", fin: "" }); setPeriodo(data.id); cargar();
  }
  async function agregarGrupo(gradoId: string) {
    const nombre = window.prompt("Nombre del grupo (ej. A, B, Único):", "A");
    if (!nombre || !periodo) return;
    const { data: escuela } = await supabase.rpc("mi_escuela");
    const { error } = await supabase.from("grupos").insert({ escuela_id: escuela, grado_id: gradoId, periodo_id: periodo, nombre });
    if (error) setError(error.message); else cargar();
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-semibold">Niveles, grados y grupos</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="tarjeta">
        <div className="titulo-tarjeta">Ciclo escolar</div>
        <div className="p-4 space-y-3">
          {periodos.length > 0 && (
            <select className="campo" value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
              {periodos.map((p) => <option key={p.id} value={p.id}>{p.nombre} ({fecha(p.inicio)} – {fecha(p.fin)})</option>)}
            </select>
          )}
          <form onSubmit={crearPeriodo} className="grid sm:grid-cols-4 gap-2">
            <input className="campo" placeholder="Ej. 2026-2027" value={nuevoP.nombre} onChange={(e) => setNuevoP({ ...nuevoP, nombre: e.target.value })} required />
            <input className="campo" type="date" value={nuevoP.inicio} onChange={(e) => setNuevoP({ ...nuevoP, inicio: e.target.value })} required />
            <input className="campo" type="date" value={nuevoP.fin} onChange={(e) => setNuevoP({ ...nuevoP, fin: e.target.value })} required />
            <button className="boton-sec">Agregar ciclo</button>
          </form>
        </div>
      </div>
      {periodo && niveles.map((n) => (
        <div key={n.id} className="tarjeta">
          <div className="titulo-tarjeta">{n.nombre}</div>
          <ul className="divide-y">
            {[...n.grados].sort((a, b) => a.orden - b.orden).map((g) => {
              const gs = grupos.filter((x) => x.grado_id === g.id && x.periodo_id === periodo);
              return (
                <li key={g.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                  <span className="flex-1">{g.nombre}</span>
                  <span className="text-slate-500">{gs.length ? gs.map((x) => x.nombre).join(", ") : "Sin grupos"}</span>
                  <button className="text-azul" onClick={() => agregarGrupo(g.id)}>+ Grupo</button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {!periodo && <p className="text-sm text-slate-600">Primero agrega el ciclo escolar para poder crear grupos.</p>}
    </div>
  );
}
