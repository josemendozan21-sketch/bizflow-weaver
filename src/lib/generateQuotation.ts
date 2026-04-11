import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface QuotationData {
  brand: "magical" | "sweatspot";
  clientName: string;
  empresa: string;
  cedulaNit: string;
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
  garantia: string;
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
    data.brand === "magical" ? [45, 55, 72] : [30, 58, 82]; // slate / navy
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
  doc.text(`Propuesta Comercial ${data.quotationNumber}`, pageW - margin, 18, { align: "right" });
  doc.text(`Fecha: ${data.fecha}`, pageW - margin, 26, { align: "right" });

  y = 50;

  // ── Client info ──
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...darkGray);
  doc.text("DATOS DEL CLIENTE", margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...medGray);

  const clientLines = [
    ["Cliente:", data.clientName],
    ...(data.cedulaNit ? [["Cédula/NIT:", data.cedulaNit]] : []),
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
    head: [["Producto", "Cant.", "P. Unitario", "IVA", "P. con IVA", "Total"]],
    body: data.products.map((p) => {
      const ivaUnit = Math.round(p.precioUnitario * 0.19);
      const priceWithIva = p.precioUnitario + ivaUnit;
      const totalLine = priceWithIva * p.cantidad;
      return [
        p.producto,
        p.cantidad.toString(),
        fmt(p.precioUnitario),
        fmt(ivaUnit),
        fmt(priceWithIva),
        fmt(totalLine),
      ];
    }),
    headStyles: {
      fillColor: brandColor,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: darkGray,
    },
    alternateRowStyles: {
      fillColor: lightBg,
    },
    columnStyles: {
      1: { halign: "center", cellWidth: 18 },
      2: { halign: "right", cellWidth: 28 },
      3: { halign: "right", cellWidth: 25 },
      4: { halign: "right", cellWidth: 28 },
      5: { halign: "right", cellWidth: 30 },
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
    ["Garantía:", data.garantia],
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
    "Bionovations SAS · NIT: 900793324-8",
    "Calle 168 #21-73, Bogotá, Colombia",
    "Tel: (+57) 310 333 3967 · contabilidad.mw@magicalwarmers.com",
  ];

  footerLines.forEach((line, i) => {
    doc.text(line, pageW / 2, footerY + 5 + i * 4, { align: "center" });
  });

  // ── Save ──
  doc.save(`${data.quotationNumber}_${data.clientName.replace(/\s+/g, "_")}.pdf`);
}
