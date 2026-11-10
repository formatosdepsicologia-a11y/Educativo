"use client";
import { useEffect, useState } from "react";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { fecha } from "@/lib/formato";
import { ROLES } from "@/lib/nav";

type Perfil = { id: string; nombre: string; rol: string; activo: boolean };
type Invitacion = { id: string; nombre: string; correo: string; rol: string; usada: boolean; creado_en: string };


export default function Usuarios() {
  const supabase = crearClienteNavegador();
  const [yo, setYo] = useState<string>("");
  const [esAdmin, setEsAdmin] = useState<boolean | null>(null);
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([]);
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [rol, setRol] = useState("control_escolar");
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);

  async function cargar() {
    const { data: { user } } = await supabase.auth.getUser();
    setYo(user?.id ?? "");
    const { data: p } = await supabase.from("perfiles").select("id, nombre, rol, activo").order("nombre");
    setPerfiles(p ?? []);
    setEsAdmin((p ?? []).some((x) => x.id === user?.id && x.rol === "admin"));
    const { data: i } = await supabase.from("invitaciones").select("*").eq("usada", false).order("creado_en", { ascending: false });
    setInvitaciones(i ?? []);
  }
  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function invitar(e: React.FormEvent) {
    e.preventDefault();
    setMensaje(null);
    const { data: escuela } = await supabase.rpc("mi_escuela");
    const { error } = await supabase.from("invitaciones").insert({ escuela_id: escuela, nombre, correo: correo.trim().toLowerCase(), rol });
    if (error) return setMensaje({ ok: false, texto: error.message.includes("duplicate") ? "Ese correo ya fue invitado." : error.message });
    setMensaje({ ok: true, texto: `Listo. Pídele a ${nombre} que entre a la página, toque "Crear cuenta" y se registre con ${correo}.` });
    setNombre(""); setCorreo("");
    cargar();
  }

  async function quitarInvitacion(id: string) {
    await supabase.from("invitaciones").delete().eq("id", id);
    cargar();
  }

  async function cambiarActivo(p: Perfil) {
    const { error } = await supabase.from("perfiles").update({ activo: !p.activo }).eq("id", p.id);
    if (error) return setMensaje({ ok: false, texto: error.message });
    cargar();
  }

  if (esAdmin === null) return null;
  if (!esAdmin) return <p className="text-slate-600">Solo el administrador puede ver esta sección.</p>;

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-semibold text-marino">Usuarios</h1>

      <form onSubmit={invitar} className="tarjeta">
        <div className="titulo-tarjeta">Dar de alta un usuario</div>
        <div className="p-4 grid gap-3 md:grid-cols-4 items-end">
          <label className="text-sm md:col-span-1">Nombre
            <input className="campo" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </label>
          <label className="text-sm md:col-span-1">Correo
            <input className="campo" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
          </label>
          <label className="text-sm">Tipo de usuario
            <select className="campo" value={rol} onChange={(e) => setRol(e.target.value)}>
              <option value="control_escolar">Control escolar</option>
              <option value="admin">Administrador</option>
            </select>
          </label>
          <button className="boton">Dar de alta</button>
        </div>
        {mensaje && <p className={`px-4 pb-4 text-sm ${mensaje.ok ? "text-azul" : "text-red-600"}`}>{mensaje.texto}</p>}
        <p className="px-4 pb-4 text-xs text-slate-500">
          Control escolar puede cobrar, vender en mostrador, hacer su corte de caja, registrar entradas de inventario y dar de alta alumnos.
          Cancelar recibos y facturas, cambiar precios y la configuración quedan solo para administradores.
        </p>
      </form>

      {invitaciones.length > 0 && (
        <div className="tarjeta">
          <div className="titulo-tarjeta">Pendientes de crear su cuenta</div>
          <table className="tabla">
            <thead><tr><th>Nombre</th><th>Correo</th><th>Tipo</th><th>Alta</th><th></th></tr></thead>
            <tbody>
              {invitaciones.map((i) => (
                <tr key={i.id}>
                  <td>{i.nombre}</td><td>{i.correo}</td><td>{ROLES[i.rol] ?? i.rol}</td><td>{fecha(i.creado_en)}</td>
                  <td className="text-right"><button className="text-sm text-rojo" onClick={() => quitarInvitacion(i.id)}>Quitar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="tarjeta">
        <div className="titulo-tarjeta">Usuarios con acceso</div>
        <table className="tabla">
          <thead><tr><th>Nombre</th><th>Tipo</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {perfiles.map((p) => (
              <tr key={p.id}>
                <td>{p.nombre}</td><td>{ROLES[p.rol] ?? p.rol}</td>
                <td>{p.activo ? "Activo" : <span className="text-rojo">Desactivado</span>}</td>
                <td className="text-right">
                  {p.id !== yo && (
                    <button className="text-sm text-azul" onClick={() => cambiarActivo(p)}>{p.activo ? "Desactivar" : "Reactivar"}</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
