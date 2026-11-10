"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase/client";

export default function Registro() {
  const supabase = crearClienteNavegador();
  const router = useRouter();
  const [permitido, setPermitido] = useState<boolean | null>(null);
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    supabase.rpc("hay_administrador").then(({ data }) => setPermitido(data === false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    if (clave.length < 8) return setMensaje({ ok: false, texto: "La contraseña debe tener al menos 8 caracteres." });
    setCargando(true); setMensaje(null);
    const { data, error } = await supabase.auth.signUp({
      email: correo, password: clave,
      options: { data: { nombre }, emailRedirectTo: `${window.location.origin}/login` },
    });
    if (error) { setCargando(false); return setMensaje({ ok: false, texto: error.message }); }
    if (data.session) {
      await supabase.rpc("crear_primer_admin", { p_nombre: nombre || "Administrador" });
      router.replace("/"); router.refresh();
      return;
    }
    setCargando(false);
    setMensaje({ ok: true, texto: "Cuenta creada. Revisa tu correo y confirma tu cuenta; después inicia sesión." });
  }

  if (permitido === null) return null;

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="tarjeta w-full max-w-sm p-6 space-y-4">
        <h1 className="text-xl font-semibold text-center">Crear cuenta de administrador</h1>
        {!permitido ? (
          <p className="text-sm text-slate-600 text-center">Ya existe un administrador. Pídele que te dé de alta.</p>
        ) : (
          <form onSubmit={registrar} className="space-y-4">
            <input className="campo" placeholder="Tu nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            <input className="campo" type="email" placeholder="Correo" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
            <input className="campo" type="password" placeholder="Contraseña (mínimo 8)" value={clave} onChange={(e) => setClave(e.target.value)} required />
            <button className="boton w-full" disabled={cargando}>{cargando ? "Creando..." : "Crear cuenta"}</button>
          </form>
        )}
        {mensaje && <p className={`text-sm ${mensaje.ok ? "text-teal-700" : "text-red-600"}`}>{mensaje.texto}</p>}
        <p className="text-sm text-center"><Link href="/login" className="text-teal-700">Volver a iniciar sesión</Link></p>
      </div>
    </div>
  );
}
