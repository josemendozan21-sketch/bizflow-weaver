import { format as fmtDate } from "date-fns";
import {
  STATUS_LABEL,
  type CommissionLine,
} from "@/lib/commissions";

const d = (v: Date | null) => (v ? fmtDate(v, "dd/MM/yyyy") : "—");
const r = (n: number) => Math.round(n || 0);

export interface CommissionSummaryRow {
  Concepto: string;
  Valor: string | number;
}

export function buildCommissionRows(lines: CommissionLine[]) {
  return lines.map((l) => {
    const o = l.order as any;
    return {
      "N° pedido": o.order_code || "",
      "Fecha de venta": d(l.saleDate),
      "Fecha de factura": d(l.invoiceDate),
      Cliente: o.client_name || "",
      Referencia: o.product || "",
      Unidades: Number(o.quantity) || 0,
      Canal: o.sale_type === "menor" ? "Detal" : "Mayor",
      Cliente_tipo: l.clientKind === "recompra" ? "Recompra" : "Nuevo",
      "Estado del pedido": o.production_status || "",
      "Forma de pago": o.payment_method || "—",
      "Valor total (con IVA)": r(l.totalWithVat),
      Flete: r(l.shippingCost),
      "Cargos adicionales": r(l.extraCharges),
      "Valor producto (comisionable)": r(l.netTotalWithVat),
      "Factura emitida": l.pendingInvoice ? "No" : "Sí",
      Abono: r(Number(o.abono) || 0),
      "Estado de comisión": STATUS_LABEL[l.status],
      Motivo: l.reason,
      "Base usada (con IVA)": r(l.commissionableWithVat),
      "Base sin IVA": r(l.baseSinIva),
      "% comisión": `${(l.ratePct * 100).toFixed(0)}%`,
      Penalización: r(l.penalty),
      Comisión: r(l.netCommission),
    };
  });
}

function totalsRow(rows: ReturnType<typeof buildCommissionRows>) {
  const sum = (k: string) => rows.reduce((s, x) => s + (Number((x as any)[k]) || 0), 0);
  return {
    ...rows[0],
    "N° pedido": "",
    "Fecha de venta": "",
    "Fecha de factura": "",
    Cliente: "TOTAL",
    Referencia: "",
    Unidades: sum("Unidades"),
    Canal: "",
    Cliente_tipo: "",
    "Estado del pedido": "",
    "Forma de pago": "",
    "Valor total (con IVA)": sum("Valor total (con IVA)"),
    Flete: sum("Flete"),
    "Cargos adicionales": sum("Cargos adicionales"),
    "Valor producto (comisionable)": sum("Valor producto (comisionable)"),
    "Factura emitida": "",
    Abono: sum("Abono"),
    "Estado de comisión": "",
    Motivo: "",
    "Base usada (con IVA)": sum("Base usada (con IVA)"),
    "Base sin IVA": sum("Base sin IVA"),
    "% comisión": "",
    Penalización: sum("Penalización"),
    Comisión: sum("Comisión"),
  };
}

export interface CommissionExportInput {
  fileBase: string;
  summary: CommissionSummaryRow[];
  lines: CommissionLine[];
  excluded?: CommissionLine[];
}

export async function exportCommissionsXlsx({
  fileBase,
  summary,
  lines,
  excluded = [],
}: CommissionExportInput) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const wsResumen = XLSX.utils.json_to_sheet(summary);
  wsResumen["!cols"] = [{ wch: 40 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

  const rows = buildCommissionRows(lines);
  if (rows.length > 0) rows.push(totalsRow(rows) as (typeof rows)[number]);
  const ws = XLSX.utils.json_to_sheet(
    rows.length > 0 ? rows : [{ Aviso: "Sin pedidos que causen comisión" }]
  );
  ws["!cols"] = new Array(19).fill({ wch: 18 });
  XLSX.utils.book_append_sheet(wb, ws, "Detalle");

  const exRows = buildCommissionRows(excluded);
  const wsEx = XLSX.utils.json_to_sheet(
    exRows.length > 0 ? exRows : [{ Aviso: "Sin pedidos excluidos" }]
  );
  wsEx["!cols"] = new Array(19).fill({ wch: 18 });
  XLSX.utils.book_append_sheet(wb, wsEx, "Excluidos");

  XLSX.writeFile(wb, `${fileBase}.xlsx`);
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(";"),
    ...rows.map((row) => headers.map((h) => esc(row[h])).join(";")),
  ].join("\n");
}

export function exportCommissionsCsv({
  fileBase,
  summary,
  lines,
  excluded = [],
}: CommissionExportInput) {
  const parts = [
    "RESUMEN",
    toCsv(summary as unknown as Record<string, unknown>[]),
    "",
    "DETALLE (pedidos que causan comisión)",
    toCsv(buildCommissionRows(lines)),
    "",
    "EXCLUIDOS / PENDIENTES",
    toCsv(buildCommissionRows(excluded)),
  ];
  const blob = new Blob(["\uFEFF" + parts.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileBase}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
