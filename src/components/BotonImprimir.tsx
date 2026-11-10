"use client";
import { Printer } from "lucide-react";
export default function BotonImprimir() {
  return <button onClick={() => window.print()} className="boton-sec print:hidden"><Printer size={16} /> Imprimir</button>;
}
