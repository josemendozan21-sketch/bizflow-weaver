import { startOfMonth, endOfMonth, isWithinInterval, subMonths, format } from "date-fns";
import { es } from "date-fns/locale";
import type { Order } from "@/hooks/useOrders";

export interface MonthBucket {
  key: string; // yyyy-MM
  label: string; // ej "Nov 2025"
  start: Date;
  end: Date;
  ventas: number;
  pedidos: number;
  cobrado: number;
  unidades: number;
  ventasMagical: number;
  ventasSweatspot: number;
}

export function buildLast12Months(refDate: Date = new Date()): MonthBucket[] {
  const buckets: MonthBucket[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = subMonths(refDate, i);
    const start = startOfMonth(d);
    const end = endOfMonth(d);
    buckets.push({
      key: format(start, "yyyy-MM"),
      label: format(start, "MMM yy", { locale: es }),
      start,
      end,
      ventas: 0,
      pedidos: 0,
      cobrado: 0,
      unidades: 0,
      ventasMagical: 0,
      ventasSweatspot: 0,
    });
  }
  return buckets;
}

function brandKey(b: string | null | undefined): "magical" | "sweatspot" | "otro" {
  const v = (b || "").toLowerCase();
  if (v.includes("magical")) return "magical";
  if (v.includes("sweatspot") || v.includes("sweat")) return "sweatspot";
  return "otro";
}

export function aggregateMonthly(orders: Order[], refDate: Date = new Date()): MonthBucket[] {
  const buckets = buildLast12Months(refDate);
  for (const o of orders) {
    const created = new Date(o.created_at);
    const bucket = buckets.find((b) => isWithinInterval(created, { start: b.start, end: b.end }));
    if (!bucket) continue;
    const total = Number(o.total_amount || 0);
    bucket.ventas += total;
    bucket.pedidos += 1;
    bucket.cobrado += Number(o.abono || 0);
    bucket.unidades += Number(o.quantity || 0);
    const bk = brandKey(o.brand);
    if (bk === "magical") bucket.ventasMagical += total;
    else if (bk === "sweatspot") bucket.ventasSweatspot += total;
  }
  return buckets;
}

export interface ProductRotation {
  product: string;
  brand: string;
  unidades: number;
  pedidos: number;
  ingresos: number;
  pct: number; // porcentaje del mes en unidades
}

export function productRotationForMonth(orders: Order[], year: number, month: number): ProductRotation[] {
  const ref = new Date(year, month, 1);
  const start = startOfMonth(ref);
  const end = endOfMonth(ref);
  const map = new Map<string, ProductRotation>();
  let totalUnits = 0;
  for (const o of orders) {
    const created = new Date(o.created_at);
    if (!isWithinInterval(created, { start, end })) continue;
    const product = o.product || "—";
    const brand = o.brand || "—";
    const k = `${brand}|${product}`;
    const prev = map.get(k) || { product, brand, unidades: 0, pedidos: 0, ingresos: 0, pct: 0 };
    prev.unidades += Number(o.quantity || 0);
    prev.pedidos += 1;
    prev.ingresos += Number(o.total_amount || 0);
    map.set(k, prev);
    totalUnits += Number(o.quantity || 0);
  }
  const list = Array.from(map.values());
  for (const r of list) r.pct = totalUnits > 0 ? (r.unidades / totalUnits) * 100 : 0;
  return list.sort((a, b) => b.unidades - a.unidades);
}

export interface ProductHistoryRow {
  product: string;
  brand: string;
  byMonth: Record<string, number>; // key yyyy-MM -> unidades
  total: number;
}

export function productHistory12Months(
  orders: Order[],
  refDate: Date = new Date()
): { rows: ProductHistoryRow[]; months: MonthBucket[]; maxCell: number } {
  const months = buildLast12Months(refDate);
  const map = new Map<string, ProductHistoryRow>();
  for (const o of orders) {
    const created = new Date(o.created_at);
    const bucket = months.find((b) => isWithinInterval(created, { start: b.start, end: b.end }));
    if (!bucket) continue;
    const product = o.product || "—";
    const brand = o.brand || "—";
    const k = `${brand}|${product}`;
    const prev =
      map.get(k) ||
      ({ product, brand, byMonth: Object.fromEntries(months.map((m) => [m.key, 0])), total: 0 } as ProductHistoryRow);
    const qty = Number(o.quantity || 0);
    prev.byMonth[bucket.key] = (prev.byMonth[bucket.key] || 0) + qty;
    prev.total += qty;
    map.set(k, prev);
  }
  const rows = Array.from(map.values()).sort((a, b) => b.total - a.total);
  let maxCell = 0;
  for (const r of rows) for (const k of Object.keys(r.byMonth)) if (r.byMonth[k] > maxCell) maxCell = r.byMonth[k];
  return { rows, months, maxCell };
}

export function productionByStatusForMonth(
  orders: Order[],
  year: number,
  month: number
): { status: string; count: number }[] {
  const ref = new Date(year, month, 1);
  const start = startOfMonth(ref);
  const end = endOfMonth(ref);
  const counts = new Map<string, number>();
  for (const o of orders) {
    const created = new Date(o.created_at);
    if (!isWithinInterval(created, { start, end })) continue;
    const s = o.production_status || "pendiente";
    counts.set(s, (counts.get(s) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);
}

export function formatCOP(n: number): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0);
}

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}