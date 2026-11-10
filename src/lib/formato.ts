export const pesos = (n: number | string | null | undefined) =>
  Number(n ?? 0).toLocaleString("es-MX", { style: "currency", currency: "MXN" });

export const fecha = (d: string | null | undefined) =>
  d ? new Date(d.length === 10 ? d + "T12:00:00" : d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "";
