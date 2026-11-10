"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase/client";

export default function Login() {
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const router = useRouter();
  const [mostrarRegistro, setMostrarRegistro] = useState(false);

  useEffect(() => {
    crearClienteNavegador().rpc("hay_administrador").then(({ data }) => setMostrarRegistro(data === false));
  }, []);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError("");
    const supabase = crearClienteNavegador();
    const { data, error } = await supabase.auth.signInWithPassword({ email: correo, password: clave });
    if (error) {
      setCargando(false);
      return setError(error.message.includes("not confirmed") ? "Confirma tu correo antes de entrar." : "Correo o contraseña incorrectos");
    }
    // Si aún no hay administrador, quien entra primero queda como administrador
    await supabase.rpc("crear_primer_admin", { p_nombre: data.user?.user_metadata?.nombre ?? "Administrador" });
    setCargando(false);
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <form onSubmit={entrar} className="tarjeta w-full max-w-sm p-6 space-y-4">
        <h1 className="text-xl font-semibold text-center">Iniciar sesión</h1>
        <input className="campo" type="email" placeholder="Correo" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
        <input className="campo" type="password" placeholder="Contraseña" value={clave} onChange={(e) => setClave(e.target.value)} required />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="boton w-full" disabled={cargando}>{cargando ? "Entrando..." : "Entrar"}</button>
        {mostrarRegistro && (
          <p className="text-sm text-center">¿Primera vez? <Link href="/registro" className="text-teal-700 font-medium">Crear cuenta</Link></p>
        )}
      </form>
    </div>
  );
}
