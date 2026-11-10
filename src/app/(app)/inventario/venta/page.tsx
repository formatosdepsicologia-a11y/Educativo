"use client";
import { useEffect, useState } from "react";
import BuscarAlumno, { type AlumnoBasico } from "@/components/BuscarAlumno";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { pesos } from "@/lib/formato";

type Producto = { id: string; nombre: string; talla: string | null; precio: number; existencia: number };

export default function Venta() {
  const supabase = crearClienteNavegador();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [filtro, setFiltro] = useState("");
  const [carrito, setCarrito] = useState<Record<string, number>>({});
  const [alumno, setAlumno] = useState<AlumnoBasico | null>(null);
  const [forma, setForma] = useState("efectivo");
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);

  const cargar = () => supabase.from("productos").select("id, nombre, talla, precio, existencia").eq("activo", true).order("nombre")
    .then(({ data }) => setProductos((data ?? []) as Producto[]));
  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const agregar = (p: Producto, d: number) => setCarrito((c) => {
    const n = Math.max(0, Math.min(p.existencia, (c[p.id] ?? 0) + d));
    const r = { ...c }; if (n === 0) delete r[p.id]; else r[p.id] = n; return r;
  });
  const items = Object.entries(carrito).map(([id, cantidad]) => ({ p: productos.find((x) => x.id === id)!, cantidad })).filter((i) => i.p);
  const total = items.reduce((s, i) => s + i.cantidad * Number(i.p.precio), 0);

  async function vender() {
    setMensaje(null);
    const { data, error } = await supabase.rpc("registrar_venta", {
      p_alumno: alumno?.id ?? null, p_forma: forma,
      p_partidas: items.map((i) => ({ producto_id: i.p.id, cantidad: i.cantidad })),
    });
    if (error) return setMensaje({ ok: false, texto: error.message });
    const { data: r } = await supabase.from("recibos").select("folio").eq("id", data).single();
    setMensaje({ ok: true, texto: `Venta registrada. Recibo folio ${r?.folio ?? ""} por ${pesos(total)}.` });
    setCarrito({}); cargar();
  }

  const visibles = productos.filter((p) => `${p.nombre} ${p.talla ?? ""}`.toLowerCase().includes(filtro.toLowerCase()));

  return (
    <div className="space-y-6 max-w-6xl">
      <h1 className="text-2xl font-semibold">Venta de mostrador</h1>
      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="tarjeta">
          <div className="p-4 border-b"><input className="campo" placeholder="Buscar producto o talla" value={filtro} onChange={(e) => setFiltro(e.target.value)} /></div>
          <ul className="divide-y max-h-[60vh] overflow-y-auto">
            {visibles.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                <div className="flex-1">{p.nombre} {p.talla && <span className="text-slate-500">· Talla {p.talla}</span>}
                  <div className="text-xs text-slate-500">{pesos(p.precio)} · {p.existencia} en existencia</div></div>
                <button className="boton-sec px-3" disabled={p.existencia === 0} onClick={() => agregar(p, 1)}>Agregar</button>
              </li>
            ))}
          </ul>
        </div>
        <div className="tarjeta p-4 space-y-4 h-fit">
          <div className="font-semibold">Venta</div>
          {alumno ? <div className="text-sm flex justify-between">{alumno.apellidos} {alumno.nombre}<button className="text-azul" onClick={() => setAlumno(null)}>Quitar</button></div>
            : <BuscarAlumno onElegir={setAlumno} />}
          <ul className="space-y-2 text-sm">
            {items.map(({ p, cantidad }) => (
              <li key={p.id} className="flex items-center gap-2">
                <span className="flex-1">{p.nombre} {p.talla}</span>
                <button className="boton-sec px-2 py-0.5" onClick={() => agregar(p, -1)}>−</button>{cantidad}
                <button className="boton-sec px-2 py-0.5" onClick={() => agregar(p, 1)}>+</button>
                <span className="w-20 text-right">{pesos(cantidad * Number(p.precio))}</span>
              </li>
            ))}
          </ul>
          <select className="campo" value={forma} onChange={(e) => setForma(e.target.value)}>
            <option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option><option value="tarjeta">Tarjeta</option>
          </select>
          <button className="boton w-full" disabled={items.length === 0} onClick={vender}>Cobrar {pesos(total)}</button>
          {mensaje && <p className={`text-sm ${mensaje.ok ? "text-azul" : "text-red-600"}`}>{mensaje.texto}</p>}
        </div>
      </div>
    </div>
  );
}
