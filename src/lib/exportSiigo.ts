import * as XLSX from "xlsx";
import type { AccountingOrder } from "@/stores/accountingStore";
import type { Order } from "@/hooks/useOrders";
import { getOrderPaidAmount, getOrderBalance, isOrderFullyPaid } from "@/hooks/useOrders";
import { IVA_DIVISOR, IVA_RATE, getCommissionRate } from "@/lib/commissions";

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

const FULL_HEADERS = [
  "Fecha pedido",
  "Fecha factura",
  "N° Factura",
  "Estado factura",
  "Estado producción",
  "Marca",
  "Tipo venta",
  "Asesor",
  "Cliente",
  "NIT/Cédula",
  "Email",
  "Teléfono",
  "Ciudad",
  "Dirección",
  "Producto",
  "Cantidad",
  "Precio unitario (con IVA)",
  "Subtotal sin IVA",
  `IVA (${Math.round(IVA_RATE * 100)}%)`,
  "Total con IVA",
  "Método de pago",
  "Pago completo",
  "Abono / Pagado",
  "Saldo pendiente",
  "Costo envío",
  "Transportadora",
  "N° Guía",
  "Fecha despacho",
  "Tipo de cliente",
  "Devuelto",
  "% Comisión",
  "Comisión estimada ($)",
  "Observaciones",
];

function fmtDate(s: string | null | undefined): string {
  if (!s) return "";
  return String(s).slice(0, 10);
}

function paymentLabel(o: Order): string {
  if (isOrderFullyPaid(o)) return "Sí";
  const paid = getOrderPaidAmount(o);
  return paid > 0 ? "Parcial" : "No";
}

function orderToFullRow(o: Order): (string | number)[] {
  const total = Number(o.total_amount || 0);
  const sinIva = total / IVA_DIVISOR;
  const iva = total - sinIva;
  const unit = o.quantity ? total / o.quantity : 0;
  const paid = getOrderPaidAmount(o);
  const balance = getOrderBalance(o);
  const weekday = (() => {
    const d = o.invoice_date || o.created_at;
    if (!d) return false;
    const day = new Date(d).getDay();
    return day === 0 || day === 6;
  })();
  const rate = getCommissionRate({
    saleType: (o.sale_type === "menor" ? "menor" : "mayor"),
    weekend: weekday,
    paymentMode: "contado",
    clientKind: o.is_recompra ? "recompra" : "nuevo",
    weekendUnlocked: false,
  });
  const commission = sinIva * rate;
  return [
    fmtDate(o.created_at),
    fmtDate(o.invoice_date),
    o.invoice_number || "",
    o.invoice_status || "",
    o.production_status || "",
    o.brand === "magical" ? "Magical Warmers" : "Sweatspot",
    o.sale_type === "mayor" ? "Al por mayor" : "Al por menor",
    o.advisor_name || "",
    o.client_name || "",
    o.client_nit || "",
    o.client_email || "",
    o.client_phone || "",
    o.client_city || "",
    o.client_address || "",
    o.product || "",
    o.quantity || 0,
    Math.round(unit),
    Math.round(sinIva),
    Math.round(iva),
    Math.round(total),
    o.payment_method || "",
    paymentLabel(o),
    Math.round(paid),
    Math.round(balance),
    Math.round(Number(o.shipping_cost || 0)),
    o.transportadora || "",
    o.numero_guia || "",
    fmtDate(o.dispatched_at),
    o.is_recompra ? "Recompra" : "Nuevo",
    o.returned_at ? "Sí" : "No",
    `${(rate * 100).toFixed(1)}%`,
    Math.round(commission),
    o.observations || "",
  ];
}

export function exportOrdersFullReport(orders: Order[], filename?: string) {
  const rows = orders.map(orderToFullRow);
  const data = [FULL_HEADERS, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(data);

  const colWidths = FULL_HEADERS.map((h, i) => {
    const maxLen = Math.max(
      h.length,
      ...rows.map((r) => String(r[i] ?? "").length)
    );
    return { wch: Math.min(maxLen + 2, 38) };
  });
  ws["!cols"] = colWidths;

  // Totals row
  const totalRow: (string | number)[] = new Array(FULL_HEADERS.length).fill("");
  totalRow[0] = "TOTALES";
  const sumCol = (idx: number) =>
    rows.reduce((s, r) => s + (typeof r[idx] === "number" ? (r[idx] as number) : 0), 0);
  totalRow[15] = sumCol(15); // cantidad
  totalRow[17] = sumCol(17); // sin iva
  totalRow[18] = sumCol(18); // iva
  totalRow[19] = sumCol(19); // total
  totalRow[22] = sumCol(22); // pagado
  totalRow[23] = sumCol(23); // saldo
  totalRow[24] = sumCol(24); // envío
  totalRow[31] = sumCol(31); // comisión
  XLSX.utils.sheet_add_aoa(ws, [totalRow], { origin: -1 });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Pedidos");
  XLSX.writeFile(
    wb,
    filename || `reporte_pedidos_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}
