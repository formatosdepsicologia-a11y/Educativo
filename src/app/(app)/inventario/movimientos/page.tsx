"use client";
import { useEffect, useState } from "react";
import { crearClienteNavegador } from "@/lib/supabase/client";

type Producto = { id: string; nombre: string; talla: string | null; existencia: number; almacen_id: string | null };
type Mov = { id: string; tipo: string; cantidad: number; nota: string | null; creado_en: string; productos: { nombre: string; talla: string | null } | null };
const TIPOS: Record<string, string> = { entrada: "Entrada", venta: "Venta", ajuste: "Ajuste", devolucion: "Devolución", entrega: "Entrega" };

export default function Movimientos() {
  const supabase = crearClienteNavegador();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [movs, setMovs] = useState<Mov[]>([]);
  const [f, setF] = useState({ producto: "", tipo: "entrada", cantidad: "", nota: "" });
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);

  async function cargar() {
    const [p, m] = await Promise.all([
      supabase.from("productos").select("id, nombre, talla, existencia, almacen_id").eq("activo", true).order("nombre").order("talla"),
      supabase.from("movimientos_inventario").select("id, tipo, cantidad, nota, creado_en, productos(nombre, talla)").order("creado_en", { ascending: false }).limit(50),
    ]);
    setProductos((p.data ?? []) as Producto[]); setMovs((m.data ?? []) as unknown as Mov[]);
  }
  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sel = productos.find((p) => p.id === f.producto);

  async function registrar(e: React.FormEvent) {
    e.preventDefault(); setMensaje(null);
    if (!sel) return;
    const n = Number(f.cantidad);
    // Entrada suma; en ajuste se captura la existencia real contada
    const cantidad = f.tipo === "entrada" ? n : f.tipo === "entrega" ? -n : n - sel.existencia;
    if (cantidad === 0) return setMensaje({ ok: false, texto: "No hay cambio en la existencia." });
    if (sel.existencia + cantidad < 0) return setMensaje({ ok: false, texto: "La existencia no puede quedar negativa." });
    const { data: escuela } = await supabase.rpc("mi_escuela");
    const { error } = await supabase.from("movimientos_inventario").insert({
      escuela_id: escuela, producto_id: sel.id, almacen_id: sel.almacen_id, tipo: f.tipo, cantidad, nota: f.nota || null,
    });
    if (error) return setMensaje({ ok: false, texto: error.message });
    setMensaje({ ok: true, texto: `Listo. Nueva existencia de ${sel.nombre} ${sel.talla ?? ""}: ${sel.existencia + cantidad}.` });
    setF({ ...f, cantidad: "", nota: "" }); cargar();
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-2xl font-semibold">Movimientos de inventario</h1>
      <form onSubmit={registrar} className="tarjeta">
        <div className="titulo-tarjeta">Registrar movimiento</div>
        <div className="p-4 grid sm:grid-cols-2 gap-3">
          <label className="text-sm sm:col-span-2">Producto
            <select className="campo mt-1" value={f.producto} onChange={(e) => setF({ ...f, producto: e.target.value })} required>
              <option value="">Elige un producto</option>
              {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}{p.talla ? ` · Talla ${p.talla}` : ""} ({p.existencia} en existencia)</option>)}
            </select>
          </label>
          <label className="text-sm">Tipo
            <select className="campo mt-1" value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>
              <option value="entrada">Entrada (llegó mercancía)</option>
              <option value="entrega">Entrega sin cobro (salida)</option>
              <option value="ajuste">Ajuste por conteo físico</option>
            </select>
          </label>
          <label className="text-sm">{f.tipo === "ajuste" ? "Existencia real contada" : "Cantidad"}
            <input className="campo mt-1" type="number" min="0" value={f.cantidad} onChange={(e) => setF({ ...f, cantidad: e.target.value })} required />
          </label>
          <label className="text-sm sm:col-span-2">Nota<input className="campo mt-1" value={f.nota} onChange={(e) => setF({ ...f, nota: e.target.value })} placeholder="Ej. Factura del proveedor 1234" /></label>
        </div>
        <div className="p-4 border-t space-y-2">
          <button className="boton">Registrar</button>
          {mensaje && <p className={`text-sm ${mensaje.ok ? "text-green-700" : "text-red-600"}`}>{mensaje.texto}</p>}
        </div>
      </form>
      <div className="tarjeta overflow-x-auto">
        <div className="titulo-tarjeta">Últimos movimientos</div>
        <table className="tabla">
          <thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th className="text-right">Cantidad</th><th>Nota</th></tr></thead>
          <tbody>
            {movs.length === 0 && <tr><td colSpan={5} className="text-slate-500">Sin movimientos.</td></tr>}
            {movs.map((m) => (
              <tr key={m.id}>
                <td>{new Date(m.creado_en).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}</td>
                <td>{m.productos?.nombre} {m.productos?.talla}</td>
                <td>{TIPOS[m.tipo] ?? m.tipo}</td>
                <td className={`text-right font-medium ${m.cantidad < 0 ? "text-rojo" : "text-green-700"}`}>{m.cantidad > 0 ? "+" : ""}{m.cantidad}</td>
                <td className="text-slate-500">{m.nota}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
