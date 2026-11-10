"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { menu } from "@/lib/nav";

export default function Sidebar({ nombreEscuela, usuario }: { nombreEscuela: string; usuario: string }) {
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between bg-white border-b px-4 h-14">
        <button onClick={() => setAbierto(true)} aria-label="Abrir menú"><Menu /></button>
        <Image src="/logo.png" alt={nombreEscuela} width={800} height={483} className="h-9 w-auto" />
        <span className="w-6" />
      </header>
      {abierto && <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setAbierto(false)} />}
      <aside
        className={`fixed z-50 inset-y-0 left-0 w-64 bg-marino text-slate-200 flex flex-col transition-transform md:translate-x-0 md:sticky md:top-0 md:h-screen ${abierto ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="relative bg-white px-4 py-3 border-b-4 border-rojo">
          <Image src="/logo.png" alt={nombreEscuela} width={800} height={483} className="h-20 w-auto mx-auto" priority />
          <button className="absolute right-3 top-3 text-marino md:hidden" onClick={() => setAbierto(false)} aria-label="Cerrar menú"><X size={20} /></button>
        </div>
        <div className="px-4 py-3 border-b border-marino-claro text-center">
          <div className="text-sm font-medium text-white truncate">{usuario}</div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          {menu.map((g) => (
            <div key={g.titulo} className="mb-3">
              <div className="px-4 py-1 text-[11px] uppercase tracking-wider text-slate-400">{g.titulo}</div>
              {g.items.map((i) => {
                const activo = i.ruta === "/" ? ruta === "/" : ruta === i.ruta || ruta.startsWith(i.ruta + "/") && !g.items.some((o) => o.ruta !== i.ruta && o.ruta.startsWith(i.ruta) && ruta.startsWith(o.ruta));
                const Icono = i.icono;
                return (
                  <Link key={i.ruta} href={i.ruta} onClick={() => setAbierto(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm border-b border-white/5 ${activo ? "bg-celeste text-white border-l-4 border-rojo" : "hover:bg-marino-claro"}`}>
                    <Icono size={18} className="shrink-0 text-white" />{i.titulo}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <form action="/auth/salir" method="post" className="border-t border-marino-claro p-3">
          <button className="w-full text-sm text-slate-400 hover:text-white text-left px-1">Cerrar sesión</button>
        </form>
      </aside>
    </>
  );
}
