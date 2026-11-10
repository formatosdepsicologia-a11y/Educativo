import { crearClienteServidor } from "@/lib/supabase/server";
import Link from "next/link";
import { pesos } from "@/lib/formato";

export default async function Inventario({ searchParams }: { searchParams: Promise<{ almacen?: string }> }) {
  const { almacen = "" } = await searchParams;
  const supabase = await crearClienteServidor();
  const { data: almacenes } = await supabase.from("almacenes").select("id, nombre").order("nombre");
  let q = supabase.from("productos").select("id, nombre, talla, categoria, precio, existencia, existencia_minima, almacen_id")
    .eq("activo", true).order("nombre").order("talla");
  if (almacen) q = q.eq("almacen_id", almacen);
  const { data: productos } = await q;
  const valor = (productos ?? []).reduce((s, p) => s + Number(p.precio) * p.existencia, 0);

  return (
    <div className="space-y-6 max-w-6xl">
      <h1 className="text-2xl font-semibold">Productos y existencias</h1>
      <div className="flex flex-wrap gap-2">
        <Link href="/inventario" className={almacen ? "boton-sec" : "boton"}>Todos</Link>
        {(almacenes ?? []).map((a) => (
          <Link key={a.id} href={`/inventario?almacen=${a.id}`} className={almacen === a.id ? "boton" : "boton-sec"}>{a.nombre}</Link>
        ))}
      </div>
      <div className="tarjeta overflow-x-auto">
        <div className="titulo-tarjeta">Valor del inventario: {pesos(valor)}</div>
        <table className="tabla">
          <thead><tr><th>Producto</th><th>Talla</th><th className="text-right">Precio</th><th className="text-right">Existencia</th><th className="text-right">Mínimo</th></tr></thead>
          <tbody>
            {(productos ?? []).length === 0 && <tr><td colSpan={5} className="text-slate-500">Sin productos.</td></tr>}
            {(productos ?? []).map((p) => {
              const bajo = p.existencia <= p.existencia_minima;
              return (
                <tr key={p.id}>
                  <td>{p.nombre}</td><td>{p.talla ?? "—"}</td>
                  <td className="text-right">{pesos(p.precio)}</td>
                  <td className={`text-right font-medium ${bajo ? "text-amber-600" : ""}`}>{p.existencia}{bajo && " · surtir"}</td>
                  <td className="text-right text-slate-500">{p.existencia_minima}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
