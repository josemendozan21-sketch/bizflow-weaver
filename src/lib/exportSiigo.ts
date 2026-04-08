import * as XLSX from "xlsx";
import type { AccountingOrder } from "@/stores/accountingStore";

const SIIGO_HEADERS = [
  "Tipo de cliente",
  "Nombre",
  "Identificación",
  "Email",
  "Dirección",
  "Ciudad",
  "Producto",
  "Cantidad",
  "Valor unitario",
  "Valor total",
  "Marca",
  "Tipo de venta",
  "N° Factura",
  "Fecha",
  "Observaciones",
];

function orderToRow(order: AccountingOrder): (string | number)[] {
  const valorUnitario =
    order.totalAmount && order.quantity
      ? Math.round(order.totalAmount / order.quantity)
      : 0;

  return [
    order.clientType,
    order.clientName,
    order.cedula || (order.hasRut ? "RUT adjunto" : "—"),
    order.email || "—",
    order.direccion || "—",
    order.ciudad || "—",
    order.product,
    order.quantity,
    valorUnitario,
    order.totalAmount || 0,
    order.brand === "magical" ? "Magical Warmers" : "Sweatspot",
    order.saleType === "mayor" ? "Al por mayor" : "Al por menor",
    order.invoiceNumber || "—",
    order.invoiceDate || order.createdAt,
    order.observaciones || "",
  ];
}

export function exportOrdersToExcel(orders: AccountingOrder[], filename?: string) {
  const data = [SIIGO_HEADERS, ...orders.map(orderToRow)];
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Auto-size columns
  const colWidths = SIIGO_HEADERS.map((h, i) => {
    const maxLen = Math.max(
      h.length,
      ...orders.map((o) => String(orderToRow(o)[i]).length)
    );
    return { wch: Math.min(maxLen + 2, 40) };
  });
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "SIIGO Export");
  XLSX.writeFile(wb, filename || `contabilidad_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
