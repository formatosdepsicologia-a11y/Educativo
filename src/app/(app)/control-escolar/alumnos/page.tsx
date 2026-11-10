import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/server";

type Params = Promise<{ q?: string; nivel?: string }>;

export default async function Alumnos({ searchParams }: { searchParams: Params }) {
  const { q = "", nivel = "" } = await searchParams;
  const supabase = await crearClienteServidor();
  const { data: niveles } = await supabase.from("niveles").select("id, nombre").order("orden");

  let consulta = supabase.from("alumnos")
    .select("id, matricula, nombre, apellidos, estatus, fecha_nacimiento, inscripciones(grupos(nombre, grados(nombre, nivel_id)))")
    .order("apellidos").limit(100);
  const t = q.trim().replace(/[%,()]/g, "");
  if (t) consulta = consulta.or(`nombre.ilike.%${t}%,apellidos.ilike.%${t}%,matricula.ilike.%${t}%`);
  const { data: alumnos } = await consulta;

  type Insc = { grupos: { nombre: string; grados: { nombre: string; nivel_id: string } | null } | null };
  const filas = (alumnos ?? []).map((a) => {
    const ins = (a.inscripciones as unknown as Insc[])?.at(-1)?.grupos;
    return { ...a, grado: ins ? `${ins.grados?.nombre ?? ""} ${ins.nombre}` : "Sin grupo", nivelId: ins?.grados?.nivel_id };
  }).filter((a) => !nivel || a.nivelId === nivel);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">Alumnos</h1><Link href="/control-escolar/alumnos/nuevo" className="boton">Nuevo alumno</Link></div>
      <form className="tarjeta p-4 grid sm:grid-cols-[1fr_200px_auto] gap-2">
        <input name="q" defaultValue={q} className="campo" placeholder="Nombre, apellidos o matrícula" />
        <select name="nivel" defaultValue={nivel} className="campo">
          <option value="">Todos los niveles</option>
          {(niveles ?? []).map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}
        </select>
        <button className="boton">Buscar</button>
      </form>
      <div className="tarjeta overflow-x-auto">
        <table className="tabla">
          <thead><tr><th>Matrícula</th><th>Alumno</th><th>Grado y grupo</th><th>Estatus</th></tr></thead>
          <tbody>
            {filas.length === 0 && <tr><td colSpan={4} className="text-slate-500">Sin resultados.</td></tr>}
            {filas.map((a) => (
              <tr key={a.id}>
                <td className="font-mono text-xs">{a.matricula}</td>
                <td>{a.apellidos} {a.nombre}</td>
                <td>{a.grado}</td>
                <td className="capitalize">{a.estatus?.replace("_", " ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
