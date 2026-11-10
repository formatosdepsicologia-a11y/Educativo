import Sidebar from "@/components/Sidebar";
import { crearClienteServidor } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: perfil } = await supabase.from("perfiles").select("nombre, rol, escuelas(nombre)").eq("id", user?.id ?? "").maybeSingle();
  const escuela = (perfil?.escuelas as unknown as { nombre: string } | null)?.nombre ?? "Colegio Bucareli";

  return (
    <div className="md:flex min-h-screen">
      <Sidebar nombreEscuela={escuela} usuario={perfil ? `${perfil.nombre} · ${perfil.rol}` : user?.email ?? ""} />
      <main className="flex-1 min-w-0 p-4 md:p-6">{children}</main>
    </div>
  );
}
