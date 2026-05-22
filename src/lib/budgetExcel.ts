import * as XLSX from "xlsx";
import type { BudgetLine, BudgetKind } from "@/hooks/useMonthlyBudget";

export interface ParsedLine {
  kind: BudgetKind;
  category: string;
  description: string | null;
  projected_amount: number;
}

const MONTHS = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

const KIND_SHEETS: { kind: BudgetKind; sheet: string }[] = [
  { kind: "ingreso", sheet: "Ingresos" },
  { kind: "costo", sheet: "Costos" },
  { kind: "gasto", sheet: "Gastos" },
  { kind: "pasivo", sheet: "Pasivos" },
];

export function exportBudgetXlsx(args: {
  year: number;
  month: number;
  lines: BudgetLine[];
}) {
  const { year, month, lines } = args;
  const wb = XLSX.utils.book_new();

  for (const { kind, sheet } of KIND_SHEETS) {
    const rows = lines
      .filter((l) => l.kind === kind)
      .map((l) => ({
        Categoría: l.category,
        Descripción: l.description ?? "",
        Proyectado: Number(l.projected_amount) || 0,
      }));
    const ws = XLSX.utils.json_to_sheet(rows, {
      header: ["Categoría", "Descripción", "Proyectado"],
    });
    ws["!cols"] = [{ wch: 28 }, { wch: 32 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws, sheet);
  }

  const wsInfo = XLSX.utils.aoa_to_sheet([
    [`Presupuesto ${MONTHS[month - 1]} ${year}`],
    [""],
    ["Edite los montos proyectados o agregue filas en cada hoja:"],
    ["Ingresos | Costos | Gastos | Pasivos"],
    [""],
    ["Al subir el archivo, se reemplazarán TODAS las líneas del presupuesto del mes."],
    ["Los movimientos del día a día NO se ven afectados."],
  ]);
  wsInfo["!cols"] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, "Instrucciones");

  XLSX.writeFile(wb, `Presupuesto_${year}_${String(month).padStart(2, "0")}.xlsx`);
}

export async function parseBudgetXlsx(file: File): Promise<{ lines: ParsedLine[] }> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });

  const lines: ParsedLine[] = [];
  for (const { kind, sheet } of KIND_SHEETS) {
    const ws = wb.Sheets[sheet];
    if (!ws) continue;
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
    for (const r of rows) {
      const category = String(r["Categoría"] || r["Categoria"] || "").trim();
      if (!category) continue;
      const amount = Number(r["Proyectado"] || 0);
      if (!Number.isFinite(amount)) continue;
      const description = String(r["Descripción"] || r["Descripcion"] || "").trim() || null;
      lines.push({ kind, category, description, projected_amount: amount });
    }
  }
  return { lines };
}