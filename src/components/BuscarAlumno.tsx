"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/client";

export type AlumnoBasico = { id: string; nombre: string; apellidos: string; matricula: string | null };

export default function BuscarAlumno({ onElegir }: { onElegir: (a: AlumnoBasico) => void }) {
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<AlumnoBasico[]>([]);
  const [buscando, setBuscando] = useState(false);

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    const t = texto.trim().replace(/[%,()]/g, "");
    if (!t) return;
    setBuscando(true);
    const { data } = await crearClienteNavegador().from("alumnos")
      .select("id, nombre, apellidos, matricula")
      .or(`nombre.ilike.%${t}%,apellidos.ilike.%${t}%,matricula.ilike.%${t}%`)
      .eq("activo", true).order("apellidos").limit(20);
    setResultados(data ?? []);
    setBuscando(false);
  }

  return (
    <div>
      <form onSubmit={buscar} className="flex gap-2">
        <input className="campo" placeholder="Nombre, apellidos o matrícula" value={texto} onChange={(e) => setTexto(e.target.value)} />
        <button className="boton" disabled={buscando}><Search size={16} /> Buscar</button>
      </form>
      {resultados.length > 0 && (
        <ul className="mt-2 divide-y rounded-lg border">
          {resultados.map((a) => (
            <li key={a.id}>
              <button className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm" onClick={() => { onElegir(a); setResultados([]); }}>
                {a.apellidos} {a.nombre} <span className="text-slate-500">· {a.matricula}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
