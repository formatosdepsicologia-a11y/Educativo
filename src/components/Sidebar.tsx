"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, GraduationCap } from "lucide-react";
import { menu } from "@/lib/nav";

export default function Sidebar({ nombreEscuela, usuario }: { nombreEscuela: string; usuario: string }) {
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between bg-white border-b px-4 h-14">
        <button onClick={() => setAbierto(true)} aria-label="Abrir menú"><Menu /></button>
        <span className="font-semibold text-slate-800 truncate">{nombreEscuela}</span>
        <span className="w-6" />
      </header>
      {abierto && <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setAbierto(false)} />}
      <aside
        className={`fixed z-50 inset-y-0 left-0 w-64 bg-slate-900 text-slate-200 flex flex-col transition-transform md:translate-x-0 md:sticky md:top-0 md:h-screen ${abierto ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center gap-2 px-4 h-16 border-b border-slate-800">
          <GraduationCap className="text-teal-400" />
          <div className="min-w-0">
            <div className="font-semibold text-white truncate">{nombreEscuela}</div>
            <div className="text-xs text-slate-400 truncate">{usuario}</div>
          </div>
          <button className="ml-auto md:hidden" onClick={() => setAbierto(false)} aria-label="Cerrar menú"><X size={20} /></button>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          {menu.map((g) => (
            <div key={g.titulo} className="mb-3">
              <div className="px-4 py-1 text-[11px] uppercase tracking-wider text-slate-500">{g.titulo}</div>
              {g.items.map((i) => {
                const activo = i.ruta === "/" ? ruta === "/" : ruta.startsWith(i.ruta);
                return (
                  <Link key={i.ruta} href={i.ruta} onClick={() => setAbierto(false)}
                    className={`block px-4 py-2 text-sm ${activo ? "bg-teal-600 text-white" : "hover:bg-slate-800"}`}>
                    {i.titulo}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <form action="/auth/salir" method="post" className="border-t border-slate-800 p-3">
          <button className="w-full text-sm text-slate-400 hover:text-white text-left px-1">Cerrar sesión</button>
        </form>
      </aside>
    </>
  );
}
