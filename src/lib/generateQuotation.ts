import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface QuotationData {
  brand: "magical" | "sweatspot";
  clientName: string;
  empresa: string;
  ciudad: string;
  fecha: string;
  quotationNumber: string;
  products: { producto: string; cantidad: number; precioUnitario: number; total: number }[];
  subtotal: number;
  iva: number;
  total: number;
  tiempoProduccion: string;
  condicionesPago: string;
  vigencia: string;
}

const fmt = (n: number) =>
  n.toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 });

export function generateQuotationPDF(data: QuotationData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  // ── Colors ──
  const brandColor: [number, number, number] =
    data.brand === "magical" ? [220, 38, 38] : [37, 99, 235]; // red / blue
  const darkGray: [number, number, number] = [31, 41, 55];
  const medGray: [number, number, number] = [107, 114, 128];
  const lightBg: [number, number, number] = [249, 250, 251];

  // ── Header bar ──
  doc.setFillColor(...brandColor);
  doc.rect(0, 0, pageW, 40, "F");

  // Company name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("BIONOVATIONS SAS", margin, 18);

  // Brand
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  const brandLabel = data.brand === "magical" ? "Magical Warmers" : "Sweatspot";
  doc.text(brandLabel, margin, 28);

  // Quotation number right-aligned
  doc.setFontSize(10);
  doc.text(`Cotización ${data.quotationNumber}`, pageW - margin, 18, { align: "right" });
  doc.text(`Fecha: ${data.fecha}`, pageW - margin, 26, { align: "right" });

  y = 50;

  // ── Client info ──
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkGray);
  doc.text("INFORMACIÓN DEL CLIENTE", margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...medGray);

  const clientLines = [
    ["Cliente:", data.clientName],
    ...(data.empresa ? [["Empresa:", data.empresa]] : []),
    ...(data.ciudad ? [["Ciudad:", data.ciudad]] : []),
  ];

  clientLines.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...darkGray);
    doc.text(label as string, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...medGray);
    doc.text(value as string, margin + 25, y);
    y += 5;
  });

  y += 5;

  // ── Separator ──
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // ── Product table ──
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkGray);
  doc.text("DETALLE DE PRODUCTOS", margin, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Producto", "Cantidad", "Precio Unitario", "Total"]],
    body: data.products.map((p) => [
      p.producto,
      p.cantidad.toString(),
      fmt(p.precioUnitario),
      fmt(p.total),
    ]),
    headStyles: {
      fillColor: brandColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      halign: "left",
    },
    bodyStyles: {
      fontSize: 9,
      textColor: darkGray,
    },
    alternateRowStyles: {
      fillColor: lightBg,
    },
    columnStyles: {
      1: { halign: "center", cellWidth: 25 },
      2: { halign: "right", cellWidth: 35 },
      3: { halign: "right", cellWidth: 35 },
    },
    theme: "grid",
    styles: {
      lineColor: [229, 231, 235],
      lineWidth: 0.3,
    },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Totals ──
  const totalsX = pageW - margin - 70;
  const valX = pageW - margin;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...medGray);
  doc.text("Subtotal:", totalsX, y);
  doc.setTextColor(...darkGray);
  doc.text(fmt(data.subtotal), valX, y, { align: "right" });
  y += 6;

  doc.setTextColor(...medGray);
  doc.text("IVA (19%):", totalsX, y);
  doc.setTextColor(...darkGray);
  doc.text(fmt(data.iva), valX, y, { align: "right" });
  y += 7;

  // Total highlight
  doc.setFillColor(...brandColor);
  doc.roundedRect(totalsX - 5, y - 5, 75, 10, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TOTAL:", totalsX, y + 1);
  doc.text(fmt(data.total), valX, y + 1, { align: "right" });
  y += 18;

  // ── Notes ──
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkGray);
  doc.text("NOTAS Y CONDICIONES", margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...medGray);

  const notes = [
    ["Tiempo de producción:", data.tiempoProduccion],
    ["Condiciones de pago:", data.condicionesPago],
    ["Vigencia de la cotización:", data.vigencia],
  ];

  notes.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...darkGray);
    doc.text(label, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...medGray);
    doc.text(value, margin + 55, y);
    y += 6;
  });

  // ── Footer ──
  const footerY = doc.internal.pageSize.getHeight() - 25;
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY, pageW - margin, footerY);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...medGray);

  const footerLines = [
    "Bionovations SAS · NIT: 901.XXX.XXX-X",
    "Dirección: Cra XX #XX-XX, Bogotá, Colombia",
    "Tel: (+57) XXX XXX XXXX · contacto@bionovations.com · www.bionovations.com",
  ];

  footerLines.forEach((line, i) => {
    doc.text(line, pageW / 2, footerY + 5 + i * 4, { align: "center" });
  });

  // ── Save ──
  doc.save(`${data.quotationNumber}_${data.clientName.replace(/\s+/g, "_")}.pdf`);
}
