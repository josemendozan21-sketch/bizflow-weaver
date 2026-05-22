import * as XLSX from "xlsx";
import type {
  BudgetLine,
  BudgetEntry,
  BudgetKind,
  ScheduledPayment,
  BankAccount,
} from "@/hooks/useMonthlyBudget";

export interface ParsedLine {
  kind: BudgetKind;
  category: string;
  description: string | null;
  projected_amount: number;
}

export interface ParsedScheduled {
  id?: string;
  kind: "costo" | "gasto" | "pasivo";
  category: string;
  description: string | null;
  budgeted_amount: number;
  due_date: string; // YYYY-MM-DD
  bank_name: string | null;
  notes: string | null;
}

const MONTHS = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

function toISODate(v: any): string {
  if (!v) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(v);
    if (d) {
      const mm = String(d.m).padStart(2, "0");
      const dd = String(d.d).padStart(2, "0");
      return `${d.y}-${mm}-${dd}`;
    }
  }
  const s = String(v).trim();
  // Try YYYY-MM-DD or DD/MM/YYYY
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return s;
}

export function exportBudgetXlsx(args: {
  year: number;
  month: number;
  lines: BudgetLine[];
  entries: BudgetEntry[];
  scheduled: ScheduledPayment[];
  banks: BankAccount[];
}) {
  const { year, month, lines, entries, scheduled, banks } = args;
  const wb = XLSX.utils.book_new();

  // Sheet 1: Presupuesto (líneas)
  const linesRows = lines.map((l) => ({
    Tipo: l.kind,
    Categoría: l.category,
    Descripción: l.description ?? "",
    Proyectado: Number(l.projected_amount) || 0,
  }));
  const ws1 = XLSX.utils.json_to_sheet(linesRows, {
    header: ["Tipo", "Categoría", "Descripción", "Proyectado"],
  });
  ws1["!cols"] = [{ wch: 10 }, { wch: 28 }, { wch: 30 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Presupuesto");

  // Sheet 2: Pagos programados (con fecha del calendario)
  const bankById = new Map(banks.map((b) => [b.id, b.name] as const));
  const schedRows = scheduled.map((p) => ({
    ID: p.id,
    Tipo: p.kind,
    Categoría: p.category,
    Descripción: p.description ?? "",
    Presupuestado: Number(p.budgeted_amount) || 0,
    "Fecha pago": p.due_date,
    Banco: p.bank_account_id ? bankById.get(p.bank_account_id) ?? "" : "",
    Estado: p.status,
    "Monto pagado": p.paid_amount != null ? Number(p.paid_amount) : "",
    "Fecha pagada": p.paid_date ?? "",
    Notas: p.notes ?? "",
  }));
  const ws2 = XLSX.utils.json_to_sheet(schedRows, {
    header: [
      "ID","Tipo","Categoría","Descripción","Presupuestado",
      "Fecha pago","Banco","Estado","Monto pagado","Fecha pagada","Notas",
    ],
  });
  ws2["!cols"] = [
    { wch: 12 },{ wch: 8 },{ wch: 22 },{ wch: 30 },{ wch: 14 },
    { wch: 12 },{ wch: 18 },{ wch: 12 },{ wch: 14 },{ wch: 14 },{ wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, "Pagos programados");

  // Sheet 3: Movimientos (solo lectura)
  const movRows = entries.map((e) => ({
    Fecha: e.entry_date,
    Tipo: e.kind,
    Categoría: e.category,
    Descripción: e.description ?? "",
    Monto: Number(e.amount) || 0,
    Registrado: e.recorded_by_name ?? "",
  }));
  const ws3 = XLSX.utils.json_to_sheet(movRows);
  XLSX.utils.book_append_sheet(wb, ws3, "Movimientos");

  // Sheet 4: Bancos (solo lectura)
  const bankRows = banks.map((b) => ({
    Banco: b.name,
    "Saldo inicial": Number(b.initial_balance) || 0,
    "Saldo actual": Number(b.current_balance) || 0,
    Notas: b.notes ?? "",
  }));
  const ws4 = XLSX.utils.json_to_sheet(bankRows);
  XLSX.utils.book_append_sheet(wb, ws4, "Bancos");

  // Instructions sheet
  const ws5 = XLSX.utils.aoa_to_sheet([
    ["INSTRUCCIONES"],
    [""],
    [`Mes: ${MONTHS[month - 1]} ${year}`],
    [""],
    ["1. Hoja 'Presupuesto': edite los montos proyectados o agregue filas."],
    ["   Tipo válido: ingreso | costo | gasto | pasivo"],
    ["   Al subir, se reemplazarán TODAS las líneas del mes."],
    [""],
    ["2. Hoja 'Pagos programados': edite o agregue filas con la fecha del calendario."],
    ["   - Filas con ID existente se actualizarán."],
    ["   - Filas con ID vacío se crearán como pagos pendientes."],
    ["   - No se eliminan filas que se quiten del archivo."],
    ["   - El 'Banco' debe coincidir exactamente con un banco de la hoja 'Bancos'."],
    [""],
    ["3. Hojas 'Movimientos' y 'Bancos' son solo lectura (no se importan)."],
  ]);
  ws5["!cols"] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, ws5, "Instrucciones");

  const filename = `Presupuesto_${year}_${String(month).padStart(2, "0")}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export async function parseBudgetXlsx(file: File): Promise<{
  lines: ParsedLine[];
  scheduled: ParsedScheduled[];
}> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });

  const linesSheet = wb.Sheets["Presupuesto"];
  const schedSheet = wb.Sheets["Pagos programados"];

  const lines: ParsedLine[] = [];
  if (linesSheet) {
    const rows: any[] = XLSX.utils.sheet_to_json(linesSheet, { defval: "" });
    for (const r of rows) {
      const kind = String(r["Tipo"] || "").toLowerCase().trim() as BudgetKind;
      const category = String(r["Categoría"] || r["Categoria"] || "").trim();
      if (!kind || !category) continue;
      if (!["ingreso", "costo", "gasto", "pasivo"].includes(kind)) continue;
      const amount = Number(r["Proyectado"] || 0);
      if (!Number.isFinite(amount)) continue;
      const description = String(r["Descripción"] || r["Descripcion"] || "").trim() || null;
      lines.push({ kind, category, description, projected_amount: amount });
    }
  }

  const scheduled: ParsedScheduled[] = [];
  if (schedSheet) {
    const rows: any[] = XLSX.utils.sheet_to_json(schedSheet, { defval: "" });
    for (const r of rows) {
      const kind = String(r["Tipo"] || "").toLowerCase().trim();
      const category = String(r["Categoría"] || r["Categoria"] || "").trim();
      if (!kind || !category) continue;
      if (!["costo", "gasto", "pasivo"].includes(kind)) continue;
      const due_date = toISODate(r["Fecha pago"] ?? r["Fecha"]);
      if (!due_date) continue;
      const budgeted_amount = Number(r["Presupuestado"] || 0);
      scheduled.push({
        id: String(r["ID"] || "").trim() || undefined,
        kind: kind as any,
        category,
        description: String(r["Descripción"] || r["Descripcion"] || "").trim() || null,
        budgeted_amount,
        due_date,
        bank_name: String(r["Banco"] || "").trim() || null,
        notes: String(r["Notas"] || "").trim() || null,
      });
    }
  }

  return { lines, scheduled };
}