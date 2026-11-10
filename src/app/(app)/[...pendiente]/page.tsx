import { menu } from "@/lib/nav";

export default async function Pendiente({ params }: { params: Promise<{ pendiente: string[] }> }) {
  const { pendiente } = await params;
  const ruta = "/" + pendiente.join("/");
  const item = menu.flatMap((g) => g.items).find((i) => i.ruta === ruta);
  return (
    <div className="tarjeta p-8 max-w-xl">
      <h1 className="text-xl font-semibold">{item?.titulo ?? "Página no encontrada"}</h1>
      <p className="mt-2 text-slate-600 text-sm">{item ? "Esta sección está en construcción." : "La dirección no existe."}</p>
    </div>
  );
}
