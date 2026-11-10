"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Cake } from "lucide-react";

type Cumple = { nombre: string; tipo: string; fecha_nacimiento: string };
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DIAS = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

export default function CalendarioCumpleanos({ cumples, eventos }: { cumples: Cumple[]; eventos: { titulo: string; inicio: string }[] }) {
  const hoy = new Date();
  const [mes, setMes] = useState(hoy.getMonth());
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [diaSel, setDiaSel] = useState<number | null>(null);

  const primerDia = new Date(anio, mes, 1).getDay();
  const diasMes = new Date(anio, mes + 1, 0).getDate();
  const delDia = (d: number) => cumples.filter((c) => {
    const [, m, dd] = c.fecha_nacimiento.split("-").map(Number);
    return m - 1 === mes && dd === d;
  });
  const eventosDia = (d: number) => eventos.filter((e) => {
    const f = new Date(e.inicio);
    return f.getFullYear() === anio && f.getMonth() === mes && f.getDate() === d;
  });
  const mover = (delta: number) => {
    const f = new Date(anio, mes + delta, 1);
    setMes(f.getMonth()); setAnio(f.getFullYear()); setDiaSel(null);
  };
  const celdas = [...Array(primerDia).fill(null), ...Array.from({ length: diasMes }, (_, i) => i + 1)];
  const seleccion = diaSel ? delDia(diaSel) : [];

  return (
    <div className="tarjeta">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <button className="boton-sec px-2" onClick={() => mover(-1)} aria-label="Mes anterior"><ChevronLeft size={18} /></button>
        <div className="font-semibold">{MESES[mes]} {anio}</div>
        <button className="boton-sec px-2" onClick={() => mover(1)} aria-label="Mes siguiente"><ChevronRight size={18} /></button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs text-slate-500 border-b">
        {DIAS.map((d) => <div key={d} className="py-2">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {celdas.map((d, i) => {
          if (!d) return <div key={i} className="min-h-16 border-b border-r border-slate-100 bg-slate-50" />;
          const c = delDia(d); const ev = eventosDia(d);
          const esHoy = d === hoy.getDate() && mes === hoy.getMonth() && anio === hoy.getFullYear();
          return (
            <button key={i} onClick={() => setDiaSel(d)}
              className={`min-h-16 border-b border-r border-slate-100 p-1 text-left align-top ${esHoy ? "bg-sky-50" : ""} ${diaSel === d ? "ring-2 ring-azul ring-inset" : ""}`}>
              <div className={`text-xs ${esHoy ? "font-bold text-azul" : "text-slate-500"}`}>{d}</div>
              {c.length > 0 && (
                <div className="mt-1 inline-flex items-center gap-1 rounded bg-pink-100 px-1 text-[10px] text-pink-700">
                  <Cake size={10} />{c.length}
                </div>
              )}
              {ev.map((e, j) => <div key={j} className="mt-1 truncate rounded bg-sky-100 px-1 text-[10px] text-sky-700">{e.titulo}</div>)}
            </button>
          );
        })}
      </div>
      {diaSel && (
        <div className="p-4 text-sm">
          <div className="font-medium mb-2">Cumpleaños del {diaSel} de {MESES[mes].toLowerCase()}</div>
          {seleccion.length === 0 ? <p className="text-slate-500">Nadie cumple años este día.</p> : (
            <ul className="space-y-1">
              {seleccion.map((c, i) => (
                <li key={i} className="flex justify-between">
                  <span>{c.nombre}</span>
                  <span className="text-slate-500 capitalize">{c.tipo} · {anio - Number(c.fecha_nacimiento.slice(0, 4))} años</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
