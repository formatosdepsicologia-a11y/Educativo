"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase/client";

export default function NuevoProducto() {
  const supabase = crearClienteNavegador();
  const router = useRouter();
  const [almacenes, setAlmacenes] = useState<{ id: string; nombre: string }[]>([]);
  const [f, setF] = useState({ almacen: "", categoria: "uniforme", nombre: "", tallas: "", precio: "", minimo: "0", existencia: "0" });
  const [error, setError] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    supabase.from("almacenes").select("id, nombre").order("nombre").then(({ data }) => {
      setAlmacenes(data ?? []); if (data?.[0]) setF((x) => ({ ...x, almacen: data[0].id }));
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function guardar(e: React.FormEvent) {
    e.preventDefault(); setError("");
    const { data: escuela } = await supabase.rpc("mi_escuela");
    const tallas = f.tallas.split(",").map((t) => t.trim()).filter(Boolean);
    const filas = (tallas.length ? tallas : [null]).map((talla) => ({
      escuela_id: escuela, almacen_id: f.almacen, categoria: f.categoria, nombre: f.nombre, talla,
      precio: Number(f.precio), existencia_minima: Number(f.minimo), existencia: 0,
    }));
    const { data: creados, error: err } = await supabase.from("productos").insert(filas).select("id");
    if (err) return setError(err.message.includes("duplicate") ? "Ya existe ese producto con esa talla." : err.message);
    const inicial = Number(f.existencia);
    if (inicial > 0) await supabase.from("movimientos_inventario").insert(
      (creados ?? []).map((p) => ({ escuela_id: escuela, producto_id: p.id, almacen_id: f.almacen, tipo: "entrada", cantidad: inicial, nota: "Existencia inicial" })),
    );
    router.push("/inventario"); router.refresh();
  }

  return (
    <form onSubmit={guardar} className="tarjeta max-w-xl">
      <div className="titulo-tarjeta">Nuevo producto</div>
      <div className="p-4 grid sm:grid-cols-2 gap-3">
        <label className="text-sm">Almacén
          <select className="campo mt-1" value={f.almacen} onChange={set("almacen")}>{almacenes.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}</select>
        </label>
        <label className="text-sm">Tipo
          <select className="campo mt-1" value={f.categoria} onChange={set("categoria")}>
            <option value="uniforme">Uniforme</option><option value="papeleria">Papelería</option><option value="libro">Libro</option><option value="otro">Otro</option>
          </select>
        </label>
        <label className="text-sm sm:col-span-2">Nombre *<input className="campo mt-1" value={f.nombre} onChange={set("nombre")} required placeholder="Ej. Playera deportiva" /></label>
        <label className="text-sm sm:col-span-2">Tallas (separadas por coma)<input className="campo mt-1" value={f.tallas} onChange={set("tallas")} placeholder="Ej. 4, 6, 8, 10, 12, CH, M, G" /></label>
        <label className="text-sm">Precio *<input className="campo mt-1" type="number" step="0.01" min="0" value={f.precio} onChange={set("precio")} required /></label>
        <label className="text-sm">Existencia inicial (por talla)<input className="campo mt-1" type="number" min="0" value={f.existencia} onChange={set("existencia")} /></label>
        <label className="text-sm">Mínimo para avisar<input className="campo mt-1" type="number" min="0" value={f.minimo} onChange={set("minimo")} /></label>
      </div>
      {error && <p className="px-4 text-sm text-red-600">{error}</p>}
      <div className="p-4"><button className="boton">Guardar</button></div>
    </form>
  );
}
