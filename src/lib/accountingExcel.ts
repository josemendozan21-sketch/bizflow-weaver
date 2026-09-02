import * as XLSX from "xlsx";
import { MONTHS, GROUP_LABELS, type AccountingAccount, type AccountingAmount } from "@/hooks/useAccountingBudget";

export interface ParsedAccountRow {
  group_code: string;
  name: string;
  values: Record<number, number>; // month -> amount
}

function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function accountKey(groupCode: string, name: string) {
  return `${groupCode}|${norm(name)}`;
}

/** Parse a "Concepto + meses" sheet like the W.O. report. */
export function parseAccountingXlsx(file: ArrayBuffer): ParsedAccountRow[] {
  const wb = XLSX.read(file, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
  const out: ParsedAccountRow[] = [];

  for (const r of rows) {
    const conceptKey = Object.keys(r).find((k) => norm(k) === "concepto");
    const raw = conceptKey ? r[conceptKey] : null;
    if (typeof raw !== "string") continue;
    const m = raw.match(/^\s*(\d{2})\s*\.\s*(.+)$/);
    if (!m) continue;
    const values: Record<number, number> = {};
    MONTHS.forEach((label, idx) => {
      const key = Object.keys(r).find((k) => norm(k) === norm(label));
      if (!key) return;
      const v = r[key];
      const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/[^0-9.-]/g, ""));
      if (Number.isFinite(n) && n !== 0) values[idx + 1] = Math.abs(n);
    });
    out.push({ group_code: m[1], name: m[2].trim(), values });
  }
  return out;
}

export function exportAccountingYearXlsx(
  year: number,
  accounts: AccountingAccount[],
  amounts: AccountingAmount[],
  amountKind: "real" | "presupuesto",
) {
  const byKey = new Map<string, number>();
  amounts
    .filter((a) => a.amount_kind === amountKind)
    .forEach((a) => byKey.set(`${a.account_id}|${a.month}`, Number(a.amount || 0)));

  const data: (string | number)[][] = [["Concepto", ...MONTHS, "Total"]];
  const monthTotals = new Array(12).fill(0);

  const groups = Array.from(new Set(accounts.map((a) => a.group_code))).sort();
  for (const g of groups) {
    for (const acc of accounts.filter((a) => a.group_code === g)) {
      const vals = MONTHS.map((_, i) => byKey.get(`${acc.id}|${i + 1}`) ?? 0);
      vals.forEach((v, i) => (monthTotals[i] += v));
      data.push([`${acc.group_code}. ${acc.name}`, ...vals, vals.reduce((s, v) => s + v, 0)]);
    }
  }
  data.push(["Total general", ...monthTotals, monthTotals.reduce((s, v) => s + v, 0)]);

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = [{ wch: 42 }, ...MONTHS.map(() => ({ wch: 16 })), { wch: 18 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${year}`);
  XLSX.writeFile(wb, `presupuesto_cuentas_${amountKind}_${year}.xlsx`);
}

export function exportAccountingMonthXlsx(
  year: number,
  month: number,
  accounts: AccountingAccount[],
  amounts: AccountingAmount[],
) {
  const get = (accountId: string, kind: "real" | "presupuesto") =>
    Number(
      amounts.find((a) => a.account_id === accountId && a.month === month && a.amount_kind === kind)?.amount ?? 0,
    );

  const data: (string | number)[][] = [["Grupo", "Cuenta", "Presupuestado", "Real", "Diferencia"]];
  for (const acc of accounts) {
    const p = get(acc.id, "presupuesto");
    const r = get(acc.id, "real");
    data.push([GROUP_LABELS[acc.group_code] ?? acc.group_code, acc.name, p, r, p - r]);
  }
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = [{ wch: 34 }, { wch: 38 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${MONTHS[month - 1]}`);
  XLSX.writeFile(wb, `presupuesto_cuentas_${year}_${String(month).padStart(2, "0")}.xlsx`);
}
