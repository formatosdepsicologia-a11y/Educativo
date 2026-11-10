"use client";
import { useState } from "react";
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
    const { error } = await crearClienteNavegador().auth.signInWithPassword({ email: correo, password: clave });
    setCargando(false);
    if (error) return setError("Correo o contraseña incorrectos");
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
      </form>
    </div>
  );
}
