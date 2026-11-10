"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase/client";

export default function Login() {
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const router = useRouter();


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
    // Primer usuario queda como administrador; si tiene invitación, queda con el rol que le asignaron
    await supabase.rpc("activar_cuenta", { p_nombre: data.user?.user_metadata?.nombre ?? "Administrador" });
    setCargando(false);
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <form onSubmit={entrar} className="tarjeta w-full max-w-sm p-6 space-y-4 border-t-4 border-t-rojo">
        <Image src="/logo.png" alt="Logo de la escuela" width={800} height={483} className="h-28 w-auto mx-auto" priority />
        <h1 className="text-xl font-semibold text-center text-marino">Iniciar sesión</h1>
        <input className="campo" type="email" placeholder="Correo" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
        <input className="campo" type="password" placeholder="Contraseña" value={clave} onChange={(e) => setClave(e.target.value)} required />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="boton w-full" disabled={cargando}>{cargando ? "Entrando..." : "Entrar"}</button>
        <p className="text-sm text-center">¿Primera vez? <Link href="/registro" className="text-azul font-medium">Crear cuenta</Link></p>
      </form>
    </div>
  );
}
