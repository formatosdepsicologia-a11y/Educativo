"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase/client";

type Grupo = { id: string; nombre: string; grados: { nombre: string } | null };

export default function NuevoAlumno() {
  const supabase = crearClienteNavegador();
  const router = useRouter();
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [f, setF] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    supabase.from("grupos").select("id, nombre, grados(nombre)").order("nombre").then(({ data }) => setGrupos((data ?? []) as unknown as Grupo[]));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function guardar(e: React.FormEvent) {
    e.preventDefault(); setGuardando(true); setError("");
    const { data: escuela } = await supabase.rpc("mi_escuela");
    const { data: alumno, error: e1 } = await supabase.from("alumnos").insert({
      escuela_id: escuela, nombre: f.nombre, apellidos: f.apellidos, matricula: f.matricula || null,
      fecha_nacimiento: f.fecha_nacimiento || null, curp: f.curp?.toUpperCase() || null, sexo: f.sexo || null,
      alergias: f.alergias || null,
    }).select("id").single();
    if (e1) { setGuardando(false); return setError(e1.message); }
    if (f.grupo) await supabase.from("inscripciones").insert({ escuela_id: escuela, alumno_id: alumno.id, grupo_id: f.grupo });
    if (f.padre_nombre) {
      const { data: padre } = await supabase.from("padres").insert({
        escuela_id: escuela, nombre: f.padre_nombre, apellidos: f.padre_apellidos || null,
        telefono: f.padre_telefono || null, correo: f.padre_correo || null,
      }).select("id").single();
      if (padre) {
        await supabase.from("alumno_padre").insert({ alumno_id: alumno.id, padre_id: padre.id, parentesco: f.parentesco || null, tipo: "principal" });
        if (f.rfc) await supabase.from("datos_fiscales").insert({
          escuela_id: escuela, padre_id: padre.id, rfc: f.rfc.toUpperCase(), razon_social: f.razon_social || `${f.padre_nombre} ${f.padre_apellidos ?? ""}`.trim(),
          regimen_fiscal: f.regimen || "605", uso_cfdi: "D10", codigo_postal: f.cp || "", correo_factura: f.padre_correo || null,
        });
      }
    }
    router.push("/control-escolar/alumnos"); router.refresh();
  }

  const C = ({ k, label, type = "text", req = false }: { k: string; label: string; type?: string; req?: boolean }) => (
    <label className="text-sm">{label}{req && " *"}
      <input className="campo mt-1" type={type} value={f[k] ?? ""} onChange={set(k)} required={req} />
    </label>
  );

  return (
    <form onSubmit={guardar} className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-semibold">Nuevo alumno</h1>
      <div className="tarjeta">
        <div className="titulo-tarjeta">Datos del alumno</div>
        <div className="p-4 grid sm:grid-cols-2 gap-3">
          {C({ k: "nombre", label: "Nombre(s)", req: true })}
          {C({ k: "apellidos", label: "Apellidos", req: true })}
          {C({ k: "matricula", label: "Matrícula" })}
          {C({ k: "fecha_nacimiento", label: "Fecha de nacimiento", type: "date" })}
          {C({ k: "curp", label: "CURP" })}
          <label className="text-sm">Sexo
            <select className="campo mt-1" value={f.sexo ?? ""} onChange={set("sexo")}><option value="">—</option><option>F</option><option>M</option></select>
          </label>
          <label className="text-sm">Grupo
            <select className="campo mt-1" value={f.grupo ?? ""} onChange={set("grupo")}>
              <option value="">Sin grupo por ahora</option>
              {grupos.map((g) => <option key={g.id} value={g.id}>{g.grados?.nombre} {g.nombre}</option>)}
            </select>
          </label>
          {C({ k: "alergias", label: "Alergias o notas médicas" })}
        </div>
      </div>
      <div className="tarjeta">
        <div className="titulo-tarjeta">Padre, madre o tutor</div>
        <div className="p-4 grid sm:grid-cols-2 gap-3">
          {C({ k: "padre_nombre", label: "Nombre(s)" })}
          {C({ k: "padre_apellidos", label: "Apellidos" })}
          {C({ k: "parentesco", label: "Parentesco" })}
          {C({ k: "padre_telefono", label: "Teléfono", type: "tel" })}
          {C({ k: "padre_correo", label: "Correo", type: "email" })}
        </div>
      </div>
      <div className="tarjeta">
        <div className="titulo-tarjeta">Datos de facturación (opcional)</div>
        <div className="p-4 grid sm:grid-cols-2 gap-3">
          {C({ k: "rfc", label: "RFC" })}
          {C({ k: "razon_social", label: "Nombre o razón social" })}
          {C({ k: "regimen", label: "Régimen fiscal (clave SAT, ej. 605)" })}
          {C({ k: "cp", label: "Código postal fiscal" })}
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="boton" disabled={guardando}>{guardando ? "Guardando..." : "Guardar alumno"}</button>
    </form>
  );
}
