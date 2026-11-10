"use client";
import { useEffect, useState } from "react";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { pesos } from "@/lib/formato";

type Nivel = { id: string; nombre: string };
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export default function Colegiaturas() {
  const supabase = crearClienteNavegador();
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [f, setF] = useState({ nivel: "", concepto: "Colegiatura", mes: String(new Date().getMonth()), anio: String(new Date().getFullYear()), monto: "", dia: "10" });
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  useEffect(() => { supabase.from("niveles").select("id, nombre").order("orden").then(({ data }) => setNiveles(data ?? [])); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function generar(e: React.FormEvent) {
    e.preventDefault(); setMensaje(null); setGuardando(true);
    type Fila = { id: string; inscripciones: { grupos: { grados: { nivel_id: string } | null } | null }[] };
    const { data } = await supabase.from("alumnos").select("id, inscripciones(grupos(grados(nivel_id)))").eq("activo", true);
    const ids = ((data ?? []) as unknown as Fila[])
      .filter((a) => !f.nivel || a.inscripciones.some((i) => i.grupos?.grados?.nivel_id === f.nivel)).map((a) => a.id);
    if (ids.length === 0) { setGuardando(false); return setMensaje({ ok: false, texto: "No hay alumnos inscritos en ese nivel." }); }
    const descripcion = `${f.concepto} ${MESES[Number(f.mes)].toLowerCase()} ${f.anio}`;
    const { data: existentes } = await supabase.from("cargos").select("alumno_id").eq("descripcion", descripcion).in("alumno_id", ids);
    const ya = new Set((existentes ?? []).map((x) => x.alumno_id));
    const nuevos = ids.filter((id) => !ya.has(id));
    const { data: escuela } = await supabase.rpc("mi_escuela");
    const vence = `${f.anio}-${String(Number(f.mes) + 1).padStart(2, "0")}-${f.dia.padStart(2, "0")}`;
    const { error } = nuevos.length ? await supabase.from("cargos").insert(nuevos.map((alumno_id) => ({
      escuela_id: escuela, alumno_id, descripcion, monto: Number(f.monto), vence,
    }))) : { error: null };
    setGuardando(false);
    if (error) return setMensaje({ ok: false, texto: error.message });
    setMensaje({ ok: true, texto: `Se generaron ${nuevos.length} cargos de "${descripcion}" por ${pesos(f.monto)}${ya.size ? ` (${ya.size} alumnos ya lo tenían)` : ""}.` });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold">Colegiaturas y cargos</h1>
      <form onSubmit={generar} className="tarjeta">
        <div className="titulo-tarjeta">Generar cargo para un nivel</div>
        <div className="p-4 grid sm:grid-cols-2 gap-3">
          <label className="text-sm">Nivel
            <select className="campo mt-1" value={f.nivel} onChange={set("nivel")}>
              <option value="">Todos los niveles</option>{niveles.map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}
            </select>
          </label>
          <label className="text-sm">Concepto<input className="campo mt-1" value={f.concepto} onChange={set("concepto")} required /></label>
          <label className="text-sm">Mes
            <select className="campo mt-1" value={f.mes} onChange={set("mes")}>{MESES.map((m, i) => <option key={m} value={i}>{m}</option>)}</select>
          </label>
          <label className="text-sm">Año<input className="campo mt-1" type="number" value={f.anio} onChange={set("anio")} required /></label>
          <label className="text-sm">Monto por alumno<input className="campo mt-1" type="number" step="0.01" min="0" value={f.monto} onChange={set("monto")} required /></label>
          <label className="text-sm">Día de vencimiento<input className="campo mt-1" type="number" min="1" max="28" value={f.dia} onChange={set("dia")} required /></label>
        </div>
        <div className="p-4 border-t space-y-2">
          <button className="boton" disabled={guardando}>{guardando ? "Generando..." : "Generar cargos"}</button>
          {mensaje && <p className={`text-sm ${mensaje.ok ? "text-green-700" : "text-red-600"}`}>{mensaje.texto}</p>}
          <p className="text-xs text-slate-500">Si un alumno ya tiene ese mismo cargo, no se le duplica.</p>
        </div>
      </form>
    </div>
  );
}
