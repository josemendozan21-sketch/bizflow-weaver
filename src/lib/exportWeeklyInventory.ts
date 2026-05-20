import * as XLSX from "xlsx";
import type { InventoryMovement } from "@/hooks/useInventoryMovements";
import type { SupabaseStockItem } from "@/hooks/useInventory";

const CATEGORY_LABEL: Record<string, string> = {
  materia_prima: "Materia prima",
  cuerpos_referencias: "Cuerpos",
  producto_terminado: "Producto terminado",
  importados: "Importados",
};

const KIND_LABEL: Record<string, string> = {
  entrada: "Entrada",
  salida: "Salida",
  reserva: "Reserva (en proceso)",
  liberar_reserva: "Liberar reserva",
};

export function getWeekRange(date = new Date()): { start: Date; end: Date; label: string } {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diffToMon = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setDate(d.getDate() + diffToMon);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  const fmt = (x: Date) => x.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
  return { start, end, label: `${fmt(start)} – ${fmt(new Date(end.getTime() - 1))}` };
}

export function exportWeeklyInventory(
  movements: InventoryMovement[],
  stockItems: SupabaseStockItem[],
  range: { start: Date; end: Date; label: string },
) {
  const inRange = movements.filter((m) => {
    const t = new Date(m.recorded_at).getTime();
    return t >= range.start.getTime() && t < range.end.getTime();
  });

  // 1. Resumen por marca + categoría
  const summary = new Map<string, { brand: string; category: string; entradas: number; salidas: number; reservas: number }>();
  for (const m of inRange) {
    const key = `${m.brand}||${m.category}`;
    const cur = summary.get(key) || { brand: m.brand, category: m.category, entradas: 0, salidas: 0, reservas: 0 };
    const kind = m.movement_kind || (m.direction === "retorno" ? "entrada" : "salida");
    if (kind === "entrada") cur.entradas += Number(m.quantity);
    else if (kind === "salida") cur.salidas += Number(m.quantity);
    else if (kind === "reserva") cur.reservas += Number(m.quantity);
    else if (kind === "liberar_reserva") cur.reservas -= Number(m.quantity);
    summary.set(key, cur);
  }
  const resumenRows = [
    ["Marca", "Categoría", "Entradas", "Salidas", "Reservas netas"],
    ...Array.from(summary.values())
      .sort((a, b) => a.brand.localeCompare(b.brand) || a.category.localeCompare(b.category))
      .map((r) => [r.brand, CATEGORY_LABEL[r.category] || r.category, r.entradas, r.salidas, r.reservas]),
  ];

  // 2. Movimientos detalle
  const movRows = [
    ["Fecha", "Tipo", "Marca", "Categoría", "Ítem", "Cantidad", "Solicita", "Propósito / Motivo", "Proveedor", "Área", "Registrado por"],
    ...inRange
      .slice()
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
      .map((m) => [
        new Date(m.recorded_at).toLocaleString("es-CO"),
        KIND_LABEL[m.movement_kind || (m.direction === "retorno" ? "entrada" : "salida")] || "—",
        m.brand,
        CATEGORY_LABEL[m.category] || m.category,
        m.item_name,
        Number(m.quantity),
        m.requested_by_name || "—",
        m.purpose || m.reason || "—",
        m.supplier || "—",
        m.area,
        m.recorded_by_name || "—",
      ]),
  ];

  // 3. Stock final para facturación
  const stockRows = [
    ["Ítem", "Marca", "Categoría", "Unidad", "Disponible", "En proceso", "Total físico", "Mínimo"],
    ...stockItems
      .slice()
      .sort((a, b) =>
        a.brand.localeCompare(b.brand) ||
        (a.category || "").localeCompare(b.category || "") ||
        a.name.localeCompare(b.name),
      )
      .map((it) => {
        const inProc = Number((it as any).in_process || 0);
        return [
          it.name,
          it.brand,
          CATEGORY_LABEL[it.category] || it.category,
          it.unit,
          Number(it.available),
          inProc,
          Number(it.available) + inProc,
          Number(it.min_stock || 0),
        ];
      }),
  ];

  // 4. Entradas por compra
  const compras = inRange.filter((m) => (m.movement_kind || "") === "entrada" && (m.supplier || "").trim());
  const comprasRows = [
    ["Fecha", "Proveedor", "Marca", "Categoría", "Ítem", "Cantidad", "Registrado por", "Notas"],
    ...compras
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
      .map((m) => [
        new Date(m.recorded_at).toLocaleDateString("es-CO"),
        m.supplier || "—",
        m.brand,
        CATEGORY_LABEL[m.category] || m.category,
        m.item_name,
        Number(m.quantity),
        m.recorded_by_name || "—",
        m.purpose || m.reason || "",
      ]),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumenRows), "Resumen");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(movRows), "Movimientos");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(stockRows), "Stock final");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(comprasRows), "Compras");

  const isoStart = range.start.toISOString().slice(0, 10);
  XLSX.writeFile(wb, `inventario_semana_${isoStart}.xlsx`);
}