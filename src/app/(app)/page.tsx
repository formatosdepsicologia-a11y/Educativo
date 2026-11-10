import CalendarioCumpleanos from "@/components/CalendarioCumpleanos";
import { crearClienteServidor } from "@/lib/supabase/server";
import { pesos, fecha } from "@/lib/formato";

export default async function Inicio() {
  const supabase = await crearClienteServidor();
  const hoy = new Date().toISOString().slice(0, 10);

  const [cumples, eventos, avisos, cobradoHoy, vencidos, surtir, timbres] = await Promise.all([
    supabase.from("cumpleanos").select("nombre, tipo, fecha_nacimiento"),
    supabase.from("eventos").select("titulo, inicio"),
    supabase.from("avisos").select("id, titulo, contenido, publicado_en").order("publicado_en", { ascending: false }).limit(5),
    supabase.from("recibos").select("total").eq("cancelado", false).gte("emitido_en", hoy),
    supabase.from("estado_cuenta").select("saldo").lt("vence", hoy).gt("saldo", 0),
    supabase.from("productos_por_surtir").select("id", { count: "exact", head: true }),
    supabase.from("saldo_timbres").select("disponibles"),
  ]);

  const suma = (rows: { [k: string]: unknown }[] | null, k: string) => (rows ?? []).reduce((a, r) => a + Number(r[k] ?? 0), 0);
  const indicadores = [
    { titulo: "Cobrado hoy", valor: pesos(suma(cobradoHoy.data, "total")) },
    { titulo: "Adeudo vencido", valor: pesos(suma(vencidos.data, "saldo")), alerta: suma(vencidos.data, "saldo") > 0 },
    { titulo: "Productos por surtir", valor: String(surtir.count ?? 0), alerta: (surtir.count ?? 0) > 0 },
    { titulo: "Timbres disponibles", valor: String(suma(timbres.data, "disponibles")), alerta: suma(timbres.data, "disponibles") < 50 },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <h1 className="text-2xl font-semibold">Inicio</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {indicadores.map((i) => (
          <div key={i.titulo} className="tarjeta p-4">
            <div className="text-xs text-slate-500">{i.titulo}</div>
            <div className={`mt-1 text-xl font-semibold ${i.alerta ? "text-amber-600" : ""}`}>{i.valor}</div>
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CalendarioCumpleanos cumples={cumples.data ?? []} eventos={eventos.data ?? []} />
        </div>
        <div className="tarjeta">
          <div className="titulo-tarjeta">Avisos</div>
          {(avisos.data ?? []).length === 0 ? <p className="p-4 text-sm text-slate-500">Sin avisos.</p> : (
            <ul className="divide-y">
              {avisos.data!.map((a) => (
                <li key={a.id} className="p-4">
                  <div className="font-medium text-sm">{a.titulo}</div>
                  <div className="text-xs text-slate-500 mb-1">{fecha(a.publicado_en)}</div>
                  <p className="text-sm text-slate-600 line-clamp-3">{a.contenido}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
