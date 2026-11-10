import Sidebar from "@/components/Sidebar";
import { ROLES } from "@/lib/nav";
import { crearClienteServidor } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: perfil } = await supabase.from("perfiles").select("nombre, rol, escuelas(nombre)").eq("id", user?.id ?? "").maybeSingle();
  const escuela = (perfil?.escuelas as unknown as { nombre: string } | null)?.nombre ?? "Colegio Bucareli";

  return (
    <div className="md:flex min-h-screen">
      <Sidebar nombreEscuela={escuela} usuario={perfil ? `${perfil.nombre} · ${ROLES[perfil.rol] ?? perfil.rol}` : user?.email ?? ""} esAdmin={perfil?.rol === "admin"} />
      <main className="flex-1 min-w-0 p-4 md:p-6">
        {perfil ? children : <p className="text-slate-600">Tu cuenta todavía no tiene acceso. Pide al administrador que te dé de alta en Usuarios.</p>}
      </main>
    </div>
  );
}
