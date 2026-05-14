import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { PosSale, PosSaleItem } from "@/hooks/usePuntosVenta";

export function isRemision(method: string | null | undefined): boolean {
  const parts = (method ?? "").toLowerCase().split("+").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return true;
  return parts.every((p) => p === "efectivo" || p === "nequi");
}

export function saleDocType(method: string | null | undefined): "factura" | "remision" {
  return isRemision(method) ? "remision" : "factura";
}

export type InvoiceLocation = { name: string; city: string; address: string | null };

export function buildSalePdf(opts: {
  sale: PosSale;
  items: PosSaleItem[];
  location: InvoiceLocation;
}): jsPDF {
  const { sale, items, location } = opts;
  const docType = saleDocType(sale.payment_method);
  const title = docType === "factura" ? "FACTURA DE VENTA" : "REMISIÓN";

  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 40;
  let y = margin;

  doc.setFont("helvetica", "bold").setFontSize(16);
  doc.text(title, margin, y);
  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.text(`No. ${sale.id.slice(0, 8).toUpperCase()}`, 612 - margin, y, { align: "right" });
  y += 18;
  doc.text(new Date(sale.sale_date).toLocaleString(), 612 - margin, y, { align: "right" });

  doc.setFont("helvetica", "bold").setFontSize(12);
  doc.text(location.name, margin, y);
  y += 14;
  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.text(`${location.city}${location.address ? " · " + location.address : ""}`, margin, y);
  y += 22;

  doc.setFont("helvetica", "bold").text("Cliente:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(sale.client_name || "Consumidor Final", margin + 50, y);
  y += 14;
  if (sale.client_document) {
    doc.text(`NIT/CC: ${sale.client_document}`, margin, y); y += 14;
  }
  if (sale.client_email) {
    doc.text(`Email: ${sale.client_email}`, margin, y); y += 14;
  }
  if (sale.client_phone) {
    doc.text(`Tel: ${sale.client_phone}`, margin, y); y += 14;
  }
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [["Producto", "Marca", "Cant.", "V. Unit.", "Total"]],
    body: items.map((it) => [
      it.product_name,
      it.brand ?? "",
      String(it.quantity),
      `$${Number(it.unit_price).toLocaleString()}`,
      `$${Number(it.line_total).toLocaleString()}`,
    ]),
    theme: "grid",
    headStyles: { fillColor: [40, 40, 40] },
    styles: { fontSize: 9 },
  });

  // @ts-ignore
  let endY = (doc as any).lastAutoTable.finalY + 16;
  const subtotal = items.reduce((a, b) => a + Number(b.line_total), 0);
  const right = 612 - margin;
  doc.setFontSize(10);
  doc.text(`Subtotal: $${subtotal.toLocaleString()}`, right, endY, { align: "right" }); endY += 14;
  if (Number(sale.discount) > 0) {
    doc.text(`Descuento: − $${Number(sale.discount).toLocaleString()}`, right, endY, { align: "right" }); endY += 14;
  }
  doc.setFont("helvetica", "bold").setFontSize(12);
  doc.text(`Total: $${Number(sale.total_amount).toLocaleString()}`, right, endY, { align: "right" });
  endY += 22;

  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.text(`Método de pago: ${sale.payment_method ?? "—"}`, margin, endY); endY += 14;
  doc.text(`Atendido por: ${sale.recorded_by_name ?? "—"}`, margin, endY); endY += 14;
  if (sale.notes) { doc.text(`Notas: ${sale.notes}`, margin, endY); endY += 14; }

  if (docType === "remision") {
    endY += 10;
    doc.setFont("helvetica", "italic").setFontSize(9);
    doc.text("Documento de remisión interno - No válido como factura electrónica DIAN.", margin, endY);
  }

  return doc;
}

export function downloadSalePdf(opts: { sale: PosSale; items: PosSaleItem[]; location: InvoiceLocation }) {
  const doc = buildSalePdf(opts);
  const docType = saleDocType(opts.sale.payment_method);
  doc.save(`${docType}_${opts.sale.id.slice(0, 8)}.pdf`);
}