import JSZip from "jszip";
import { buildSalePdf, saleDocType, type InvoiceLocation } from "./posInvoicePdf";
import type { PosSale, PosSaleItem } from "@/hooks/usePuntosVenta";

export function downloadCsvDay(opts: {
  sales: PosSale[];
  itemsBySale: Record<string, PosSaleItem[]>;
  date: string;
}) {
  const headers = [
    "Fecha", "Tipo", "No.", "Cliente", "Documento", "Email",
    "Items", "Subtotal", "Descuento", "Total", "Pago", "Atendido por",
  ];
  const rows = opts.sales.map((s) => {
    const its = opts.itemsBySale[s.id] ?? [];
    const subtotal = its.reduce((a, b) => a + Number(b.line_total), 0);
    const itemsStr = its.map((i) => `${i.quantity}x ${i.product_name}`).join("; ");
    return [
      new Date(s.sale_date).toLocaleString(),
      saleDocType(s.payment_method) === "factura" ? "Factura DIAN" : "Remisión",
      s.id.slice(0, 8).toUpperCase(),
      s.client_name ?? "",
      s.client_document ?? "",
      s.client_email ?? "",
      itemsStr,
      String(subtotal),
      String(Number(s.discount || 0)),
      String(Number(s.total_amount)),
      s.payment_method ?? "",
      s.recorded_by_name ?? "",
    ];
  });
  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ventas_${opts.date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadInvoicesZip(opts: {
  sales: PosSale[];
  itemsBySale: Record<string, PosSaleItem[]>;
  location: InvoiceLocation;
  date: string;
  onlyFacturas?: boolean;
}) {
  const zip = new JSZip();
  const filtered = opts.onlyFacturas
    ? opts.sales.filter((s) => saleDocType(s.payment_method) === "factura")
    : opts.sales;
  for (const sale of filtered) {
    const items = opts.itemsBySale[sale.id] ?? [];
    const doc = buildSalePdf({ sale, items, location: opts.location });
    const blob = doc.output("blob");
    const docType = saleDocType(sale.payment_method);
    zip.file(`${docType}_${sale.id.slice(0, 8)}.pdf`, blob);
  }
  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${opts.onlyFacturas ? "facturas_dian" : "documentos"}_${opts.date}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}