import type { Order } from "@/hooks/useOrders";
import { startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

export interface CommissionRule {
  id: string;
  brand: string;
  sale_type: string;
  percentage: number;
  active: boolean;
  notes: string | null;
}

function brandKey(b: string | null | undefined): string {
  const v = (b || "").toLowerCase();
  if (v.includes("magical")) return "magical_warmers";
  if (v.includes("sweat")) return "sweatspot";
  return v;
}

function findRule(rules: CommissionRule[], brand: string, saleType: string): CommissionRule | undefined {
  const bk = brandKey(brand);
  return rules.find((r) => r.active && r.brand === bk && r.sale_type === (saleType || "mayor"));
}

/**
 * Defaults aplicados:
 * - Base: ventas FACTURADAS (invoice_status === 'facturado').
 * - Descontamos shipping_cost del subtotal antes de aplicar el %.
 * - Excluimos recompras (is_recompra).
 */
export interface CommissionLine {
  order: Order;
  base: number;
  percentage: number;
  commission: number;
  excluded?: string;
}

export function calculateCommissionForOrder(
  order: Order,
  rules: CommissionRule[]
): CommissionLine | null {
  if (order.invoice_status !== "facturado") return null;
  if (order.is_recompra) {
    return {
      order,
      base: 0,
      percentage: 0,
      commission: 0,
      excluded: "Recompra",
    };
  }
  const rule = findRule(rules, order.brand, order.sale_type);
  if (!rule) return null;
  const total = Number(order.total_amount || 0);
  const shipping = Number(order.shipping_cost || 0);
  const base = Math.max(total - shipping, 0);
  const commission = base * (Number(rule.percentage) / 100);
  return { order, base, percentage: rule.percentage, commission };
}

export interface AdvisorCommissionSummary {
  advisorId: string;
  advisorName: string;
  ordersCount: number;
  baseTotal: number;
  commissionTotal: number;
  lines: CommissionLine[];
}

export function summarizeCommissionsByAdvisor(
  orders: Order[],
  rules: CommissionRule[],
  year: number,
  month: number
): AdvisorCommissionSummary[] {
  const start = startOfMonth(new Date(year, month, 1));
  const end = endOfMonth(new Date(year, month, 1));
  const map = new Map<string, AdvisorCommissionSummary>();

  for (const o of orders) {
    // Usamos invoice_date si existe, si no created_at (fallback)
    const ref = o.invoice_date ? new Date(o.invoice_date) : new Date(o.created_at);
    if (!isWithinInterval(ref, { start, end })) continue;
    const line = calculateCommissionForOrder(o, rules);
    if (!line) continue;
    const prev =
      map.get(o.advisor_id) ||
      ({
        advisorId: o.advisor_id,
        advisorName: o.advisor_name,
        ordersCount: 0,
        baseTotal: 0,
        commissionTotal: 0,
        lines: [],
      } as AdvisorCommissionSummary);
    prev.ordersCount += 1;
    prev.baseTotal += line.base;
    prev.commissionTotal += line.commission;
    prev.lines.push(line);
    map.set(o.advisor_id, prev);
  }
  return Array.from(map.values()).sort((a, b) => b.commissionTotal - a.commissionTotal);
}