import type { Order } from "@/hooks/useOrders";
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { IVA_DIVISOR } from "./commissions";
import type { ComplianceArea, ComplianceRule } from "@/hooks/useComplianceRules";

export interface ComplianceLine {
  order: Order;
  area: ComplianceArea;
  dueDate: string | null;
  completedAt: string | null;
  totalWithVat: number;
  baseSinIva: number;
  status: "a_tiempo" | "atrasado" | "pendiente_a_tiempo" | "pendiente_vencido";
  daysDiff: number | null; // negative = late, positive = ahead, null = pendiente
}

export interface AreaComplianceSummary {
  area: ComplianceArea;
  rule: ComplianceRule | null;
  totalOrders: number;
  onTimeOrders: number;
  lateOrders: number;
  pendingOrders: number;
  compliancePct: number;
  totalSinIvaOnTime: number;
  totalSinIva: number;
  baseCommission: number;
  bonus: number;
  totalToPay: number;
  unlocked: boolean;
  lines: ComplianceLine[];
}

function getDueDate(o: Order, area: ComplianceArea): string | null {
  if (area === "produccion") return (o as any).production_due_date ?? null;
  if (area === "estampacion") return (o as any).stamping_due_date ?? null;
  return o.delivery_date ?? null;
}

function getCompletedAt(o: Order, area: ComplianceArea): string | null {
  if (area === "produccion") return (o as any).production_completed_at ?? null;
  if (area === "estampacion") return (o as any).stamping_completed_at ?? null;
  // logistica
  return o.dispatched_at ?? null;
}

function asDate(s: string | null): Date | null {
  if (!s) return null;
  try {
    return parseISO(s.length === 10 ? s + "T00:00:00" : s);
  } catch {
    return null;
  }
}

function lineStatus(due: Date | null, done: Date | null): {
  status: ComplianceLine["status"];
  daysDiff: number | null;
} {
  if (!due) return { status: "pendiente_a_tiempo", daysDiff: null };
  const now = new Date();
  if (!done) {
    return {
      status: now > due ? "pendiente_vencido" : "pendiente_a_tiempo",
      daysDiff: null,
    };
  }
  const diffMs = due.getTime() - done.getTime();
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return { status: days >= 0 ? "a_tiempo" : "atrasado", daysDiff: days };
}

export function summarizeAreaCompliance(
  orders: Order[],
  area: ComplianceArea,
  rule: ComplianceRule | null,
  year: number,
  month: number
): AreaComplianceSummary {
  const start = startOfMonth(new Date(year, month, 1));
  const end = endOfMonth(new Date(year, month, 1));

  // Scope: pedidos al por mayor del mes, con fecha de entrega definida
  const scoped = orders.filter((o) => {
    if (o.sale_type !== "mayor") return false;
    const dueStr = getDueDate(o, area);
    if (!dueStr) return false;
    const d = asDate(dueStr);
    if (!d) return false;
    return isWithinInterval(d, { start, end });
  });

  const lines: ComplianceLine[] = scoped.map((o) => {
    const dueStr = getDueDate(o, area);
    const completedStr = getCompletedAt(o, area);
    const { status, daysDiff } = lineStatus(asDate(dueStr), asDate(completedStr));
    const total = Number(o.total_amount || 0);
    return {
      order: o,
      area,
      dueDate: dueStr,
      completedAt: completedStr,
      totalWithVat: total,
      baseSinIva: total / IVA_DIVISOR,
      status,
      daysDiff,
    };
  });

  const onTime = lines.filter((l) => l.status === "a_tiempo");
  const late = lines.filter((l) => l.status === "atrasado");
  const pending = lines.filter(
    (l) => l.status === "pendiente_a_tiempo" || l.status === "pendiente_vencido"
  );

  const resolved = onTime.length + late.length;
  const compliancePct = resolved > 0 ? onTime.length / resolved : 0;
  const totalSinIvaOnTime = onTime.reduce((s, l) => s + l.baseSinIva, 0);
  const totalSinIva = lines.reduce((s, l) => s + l.baseSinIva, 0);

  const unlocked = !!rule && rule.active && compliancePct >= rule.min_threshold_pct;
  const pct = rule ? rule.percentage / 100 : 0;
  const baseCommission = unlocked ? totalSinIvaOnTime * pct : 0;
  const bonus = rule && compliancePct >= rule.bonus_threshold_pct ? rule.bonus_amount : 0;

  return {
    area,
    rule,
    totalOrders: lines.length,
    onTimeOrders: onTime.length,
    lateOrders: late.length,
    pendingOrders: pending.length,
    compliancePct,
    totalSinIvaOnTime,
    totalSinIva,
    baseCommission,
    bonus,
    totalToPay: baseCommission + bonus,
    unlocked,
    lines,
  };
}

export const AREA_LABELS: Record<ComplianceArea, string> = {
  produccion: "Producción",
  estampacion: "Estampación",
  logistica: "Logística",
};