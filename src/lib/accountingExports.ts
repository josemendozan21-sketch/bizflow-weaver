import * as XLSX from "xlsx";

type Row = (string | number)[];

function addSheet(wb: XLSX.WorkBook, name: string, headers: string[], rows: Row[]) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws["!cols"] = headers.map((h, i) => ({
    wch: Math.min(
      Math.max(h.length, ...rows.map((r) => String(r[i] ?? "").length), 8) + 2,
      40
    ),
  }));
  XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
}

const dt = (s: string) => new Date(s).toLocaleString("es-CO");

export interface PettyFundRow {
  id: string;
  amount: number;
  set_by: string;
  notes: string | null;
  created_at: string;
}
export interface PettyExpenseRow {
  id: string;
  fund_id: string;
  amount: number;
  description: string;
  requested_by: string;
  recorded_by_name: string;
  proof_url: string | null;
  created_at: string;
}

/** Caja menor: movimientos (ingresos y gastos) en un solo Excel. */
export function exportPettyCashXlsx(
  funds: PettyFundRow[],
  expenses: PettyExpenseRow[],
  filename?: string
) {
  const movements = [
    ...funds.map((f) => ({
      date: f.created_at,
      tipo: "Ingreso",
      concepto: f.notes || "Fondo / ingreso de caja menor",
      solicita: "",
      registra: f.set_by,
      ingreso: Number(f.amount),
      gasto: 0,
      soporte: "",
    })),
    ...expenses.map((e) => ({
      date: e.created_at,
      tipo: "Gasto",
      concepto: e.description,
      solicita: e.requested_by,
      registra: e.recorded_by_name,
      ingreso: 0,
      gasto: Number(e.amount),
      soporte: e.proof_url ? "Sí" : "No",
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  let saldo = 0;
  const rows: Row[] = movements.map((m) => {
    saldo += m.ingreso - m.gasto;
    return [
      dt(m.date), m.tipo, m.concepto, m.solicita, m.registra,
      m.ingreso, m.gasto, saldo, m.soporte,
    ];
  });

  const totalIngresos = movements.reduce((a, m) => a + m.ingreso, 0);
  const totalGastos = movements.reduce((a, m) => a + m.gasto, 0);
  rows.push(["TOTALES", "", "", "", "", totalIngresos, totalGastos, totalIngresos - totalGastos, ""]);

  const wb = XLSX.utils.book_new();
  addSheet(
    wb, "Caja menor",
    ["Fecha", "Tipo", "Concepto", "Solicitó", "Registró", "Ingreso", "Gasto", "Saldo", "Soporte"],
    rows
  );
  XLSX.writeFile(wb, filename || `caja_menor_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export interface PosSaleLike {
  id: string;
  sale_date: string;
  client_name: string | null;
  client_document: string | null;
  client_phone: string | null;
  client_email: string | null;
  payment_method: string | null;
  discount: number | null;
  total_amount: number;
  total_cost: number;
  recorded_by_name: string | null;
  notes: string | null;
}
export interface PosSaleItemLike {
  sale_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  unit_cost?: number | null;
}
export interface PosWithdrawalLike {
  created_at: string;
  movement_type: "retiro" | "consignacion";
  amount: number;
  concept: string;
  requested_by_name: string | null;
  status: string;
  approved_by_name: string | null;
  notes: string | null;
}

/** Reporte contable del punto: ventas, detalle por producto, resumen diario y caja. */
export function exportPosReportXlsx(opts: {
  locationName: string;
  from: string;
  to: string;
  sales: PosSaleLike[];
  items: PosSaleItemLike[];
  withdrawals: PosWithdrawalLike[];
  filename?: string;
}) {
  const { sales, items, withdrawals, from, to, locationName } = opts;
  const wb = XLSX.utils.book_new();

  // Ventas
  const salesRows: Row[] = sales.map((s) => [
    s.sale_date.slice(0, 10),
    new Date(s.sale_date).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
    s.id.slice(0, 8).toUpperCase(),
    s.client_name ?? "",
    s.client_document ?? "",
    s.client_phone ?? "",
    s.client_email ?? "",
    s.payment_method ?? "",
    Math.round(Number(s.discount || 0)),
    Math.round(Number(s.total_amount)),
    Math.round(Number(s.total_cost || 0)),
    Math.round(Number(s.total_amount) - Number(s.total_cost || 0)),
    s.recorded_by_name ?? "",
    s.notes ?? "",
  ]);
  const sumCol = (rows: Row[], i: number) =>
    rows.reduce((a, r) => a + (typeof r[i] === "number" ? (r[i] as number) : 0), 0);
  salesRows.push([
    "TOTALES", "", "", "", "", "", "", "",
    sumCol(salesRows, 8), sumCol(salesRows, 9), sumCol(salesRows, 10), sumCol(salesRows, 11), "", "",
  ]);
  addSheet(wb, "Ventas", [
    "Fecha", "Hora", "No.", "Cliente", "Documento", "Teléfono", "Email",
    "Método de pago", "Descuento", "Total", "Costo", "Utilidad", "Vendedor", "Notas",
  ], salesRows);

  // Detalle por producto
  const saleById = new Map(sales.map((s) => [s.id, s]));
  const detailRows: Row[] = items
    .filter((i) => saleById.has(i.sale_id))
    .map((i) => {
      const s = saleById.get(i.sale_id)!;
      return [
        s.sale_date.slice(0, 10),
        s.id.slice(0, 8).toUpperCase(),
        i.product_name,
        Number(i.quantity),
        Math.round(Number(i.unit_price)),
        Math.round(Number(i.line_total)),
        s.payment_method ?? "",
        s.client_name ?? "",
      ];
    });
  addSheet(wb, "Detalle productos", [
    "Fecha", "No. venta", "Producto", "Cantidad", "Precio unitario", "Total línea", "Pago", "Cliente",
  ], detailRows);

  // Resumen diario
  const byDay = new Map<string, { total: number; count: number; efectivo: number; tarjeta: number; otros: number }>();
  const isMethod = (m: string | null, t: string) =>
    (m ?? "").toLowerCase().split("+").some((p) => p.trim() === t);
  for (const s of sales) {
    const d = s.sale_date.slice(0, 10);
    const acc = byDay.get(d) ?? { total: 0, count: 0, efectivo: 0, tarjeta: 0, otros: 0 };
    const amt = Number(s.total_amount);
    acc.total += amt;
    acc.count += 1;
    if (isMethod(s.payment_method, "efectivo")) acc.efectivo += amt;
    else if (isMethod(s.payment_method, "tarjeta")) acc.tarjeta += amt;
    else acc.otros += amt;
    byDay.set(d, acc);
  }
  const dayRows: Row[] = [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([d, v]) => [d, v.count, Math.round(v.total), Math.round(v.efectivo), Math.round(v.tarjeta), Math.round(v.otros)]);
  dayRows.push([
    "TOTALES", sumCol(dayRows, 1), sumCol(dayRows, 2), sumCol(dayRows, 3), sumCol(dayRows, 4), sumCol(dayRows, 5),
  ]);
  addSheet(wb, "Resumen diario", ["Fecha", "Ventas", "Total", "Efectivo", "Tarjeta", "Otros"], dayRows);

  // Caja (retiros / consignaciones)
  const wRows: Row[] = withdrawals.map((w) => [
    dt(w.created_at),
    w.movement_type === "consignacion" ? "Consignación" : "Retiro",
    Math.round(Number(w.amount)),
    w.concept,
    w.requested_by_name ?? "",
    w.status,
    w.approved_by_name ?? "",
    w.notes ?? "",
  ]);
  wRows.push(["TOTALES", "", sumCol(wRows, 2), "", "", "", "", ""]);
  addSheet(wb, "Caja punto", [
    "Fecha", "Tipo", "Monto", "Concepto", "Solicitó", "Estado", "Aprobó", "Notas",
  ], wRows);

  XLSX.writeFile(
    wb,
    opts.filename ||
      `reporte_${locationName.toLowerCase().replace(/\s+/g, "_")}_${from}_a_${to}.xlsx`
  );
}
