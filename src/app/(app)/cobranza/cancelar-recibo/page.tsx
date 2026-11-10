"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Trash2, Search } from "lucide-react";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { pesos, fecha } from "@/lib/formato";

const FORMAS: Record<string, string> = { efectivo: "01 Efectivo", cheque: "02 Cheque", transferencia: "03 Transferencia", tarjeta: "04 Tarjeta" };

type Detalle = {
  id: string; folio: number; total: number; cancelado: boolean; motivo_cancelacion: string | null; emitido_en: string; corte_id: string | null;
  alumnos: { nombre: string; apellidos: string; matricula: string | null } | null;
  emisor: { nombre: string } | null;
  cortes_caja: { cerrado_en: string | null } | null;
  pagos: { id: string; forma: string }[];
};
type Factura = { id: string; serie: string | null; folio: string | null; estado: string; emitida_en: string | null };

function Celda({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="border border-slate-200 rounded overflow-hidden">
      <div className="bg-celeste-claro text-marino text-sm font-medium text-center py-1.5">{titulo}</div>
      <div className="text-sm text-center py-2 px-2">{children}</div>
    </div>
  );
}

function CancelarRecibo() {
  const supabase = crearClienteNavegador();
  const params = useSearchParams();
  const [folio, setFolio] = useState(params.get("folio") ?? "");
  const [r, setR] = useState<Detalle | null>(null);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [grupo, setGrupo] = useState("");
  const [clave, setClave] = useState("");
  const [motivo, setMotivo] = useState("");
  const [conFactura, setConFactura] = useState(false);
  const [esAdmin, setEsAdmin] = useState<boolean | null>(null);
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    supabase.rpc("es_admin").then(({ data }) => setEsAdmin(!!data));
    if (params.get("folio")) buscar(params.get("folio")!);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function buscar(f = folio) {
    setMensaje(null); setR(null); setFacturas([]); setGrupo("");
    const n = parseInt(f, 10);
    if (!n) return;
    const { data } = await supabase.from("recibos")
      .select("id, folio, total, cancelado, motivo_cancelacion, emitido_en, corte_id, alumno_id, alumnos(nombre, apellidos, matricula), emisor:perfiles!recibos_emitido_por_fkey(nombre), cortes_caja(cerrado_en), pagos(id, forma)")
      .eq("folio", n).maybeSingle();
    if (!data) return setMensaje({ ok: false, texto: `No existe el recibo ${n}.` });
    setR(data as unknown as Detalle);
    const pagos = (data.pagos ?? []).map((p: { id: string }) => p.id);
    if (pagos.length) {
      const { data: fs } = await supabase.from("facturas").select("id, serie, folio, estado, emitida_en").in("pago_id", pagos).neq("estado", "cancelada");
      setFacturas(fs ?? []);
      setConFactura((fs ?? []).length > 0);
    }
    if (data.alumno_id) {
      const { data: ins } = await supabase.from("inscripciones").select("grupos(nombre, grados(nombre, niveles(nombre)))")
        .eq("alumno_id", data.alumno_id).order("fecha", { ascending: false }).limit(1).maybeSingle();
      const g = (ins?.grupos as unknown as { nombre: string; grados: { nombre: string; niveles: { nombre: string } } } | null);
      if (g) setGrupo(`${g.grados?.nombre ?? ""} ${g.nombre} · ${g.grados?.niveles?.nombre ?? ""}`);
    }
  }

  async function cancelar(e: React.FormEvent) {
    e.preventDefault();
    if (!r) return;
    setMensaje(null); setCargando(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error: errClave } = await supabase.auth.signInWithPassword({ email: user?.email ?? "", password: clave });
    if (errClave) { setCargando(false); return setMensaje({ ok: false, texto: "La contraseña no es correcta." }); }
    const { error } = await supabase.rpc("cancelar_recibo", { p_recibo: r.id, p_motivo: motivo, p_cancelar_factura: conFactura });
    setCargando(false);
    if (error) return setMensaje({ ok: false, texto: error.message });
    const timbrada = conFactura && facturas.some((f) => f.estado === "timbrada");
    setMensaje({ ok: true, texto: `Recibo ${r.folio} cancelado.${timbrada ? " La factura quedó marcada para cancelarse ante el SAT." : ""}` });
    setClave(""); setMotivo("");
    buscar(String(r.folio));
  }

  const forma = r?.pagos?.[0]?.forma;
  const corte = r?.corte_id ? (r.cortes_caja?.cerrado_en ? `Cerrado ${fecha(r.cortes_caja.cerrado_en)}` : "Corte abierto") : "En espera de corte";

  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-2xl font-semibold text-marino">Cancelar recibos</h1>
      {esAdmin === false && <p className="text-sm text-rojo">Solo el administrador puede cancelar recibos y facturas.</p>}
      <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="space-y-4">
          <form onSubmit={(e) => { e.preventDefault(); buscar(); }} className="flex">
            <input className="campo rounded-r-none" inputMode="numeric" placeholder="Folio del recibo" value={folio} onChange={(e) => setFolio(e.target.value)} />
            <button className="boton rounded-l-none" aria-label="Buscar"><Search size={18} /></button>
          </form>
          {r && !r.cancelado && esAdmin && (
            <form onSubmit={cancelar} className="tarjeta">
              <div className="titulo-tarjeta">Validar cancelación</div>
              <div className="p-4 space-y-3">
                <input className="campo" type="password" placeholder="Tu contraseña" value={clave} onChange={(e) => setClave(e.target.value)} required />
                <textarea className="campo" rows={2} placeholder="Motivo de la cancelación" value={motivo} onChange={(e) => setMotivo(e.target.value)} required />
                <label className={`flex items-center justify-between border rounded px-3 py-2 text-sm ${facturas.length ? "" : "text-slate-400"}`}>
                  Cancelar factura también
                  <input type="checkbox" className="h-5 w-5 accent-rojo" checked={conFactura} disabled={!facturas.length} onChange={(e) => setConFactura(e.target.checked)} />
                </label>
                {!facturas.length && <p className="text-xs text-slate-500">Este recibo no tiene factura.</p>}
                <button className="boton w-full !bg-rojo hover:!bg-red-700 flex items-center justify-center gap-2" disabled={cargando}>
                  <Trash2 size={18} />{cargando ? "Cancelando..." : "Cancelar recibo"}
                </button>
              </div>
            </form>
          )}
          {mensaje && <p className={`text-sm ${mensaje.ok ? "text-azul" : "text-red-600"}`}>{mensaje.texto}</p>}
        </div>

        {r && (
          <div className="grid grid-cols-2 gap-3 content-start">
            <Celda titulo="Alumno">{r.alumnos ? `${r.alumnos.apellidos} ${r.alumnos.nombre}` : "Venta de mostrador"}</Celda>
            <Celda titulo="Matrícula">{r.alumnos?.matricula ?? "—"}</Celda>
            <Celda titulo="Grado, grupo y nivel">{grupo || "—"}</Celda>
            <Celda titulo="Fecha de pago">{fecha(r.emitido_en)}</Celda>
            <Celda titulo="Cobró">{r.emisor?.nombre ?? "—"}</Celda>
            <Celda titulo="Forma de pago">{forma ? FORMAS[forma] ?? forma : "—"}</Celda>
            <Celda titulo="Estado">{r.cancelado ? <span className="text-rojo" title={r.motivo_cancelacion ?? ""}>Cancelado</span> : "Cobrado"}</Celda>
            <Celda titulo="Factura">{facturas.length ? facturas.map((f) => `${f.estado === "timbrada" ? "Facturado" : "Borrador"} ${f.emitida_en ? fecha(f.emitida_en) : ""} ${f.serie ?? ""}-${f.folio ?? ""}`).join(", ") : "Sin factura"}</Celda>
            <Celda titulo="Corte">{corte}</Celda>
            <Celda titulo="Total del recibo"><b>{pesos(r.total)}</b></Celda>
            {r.cancelado && <div className="col-span-2"><Celda titulo="Motivo de cancelación">{r.motivo_cancelacion}</Celda></div>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Pagina() {
  return <Suspense><CancelarRecibo /></Suspense>;
}
