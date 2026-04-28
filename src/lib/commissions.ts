import type { Order } from "@/hooks/useOrders";
import { startOfMonth, endOfMonth, isWithinInterval, getDay, parseISO } from "date-fns";

/**
 * Política de Comisiones y Bonos – Asesores Comerciales 2026
 *
 * Reglas oficiales:
 * - Base: pedidos FACTURADOS (invoice_status = 'facturado').
 * - Comisión sobre el valor SIN IVA (IVA 19%).
 * - % depende de: canal (detal/mayor), día (semana/FDS), forma de pago,
 *   y si es cliente nuevo o recompra (mayoristas).
 * - Bonos por facturación mensual (CON IVA): $150k @ $10M, +$100k @ $18M.
 * - Comisiones FDS y mix solo se desbloquean si la facturación mensual ≥ $15M.
 * - Cada pedido devuelto contraentrega descuenta $10.000.
 */

export const IVA_RATE = 0.19;
export const IVA_DIVISOR = 1 + IVA_RATE; // 1.19

export const BONUS_TIER_1_THRESHOLD = 10_000_000;
export const BONUS_TIER_1_AMOUNT = 150_000;
export const UNLOCK_THRESHOLD = 15_000_000;
export const BONUS_TIER_2_THRESHOLD = 18_000_000;
export const BONUS_TIER_2_AMOUNT = 100_000;

export const RETURN_PENALTY = 10_000;
export const MIN_TICKET_DETAL = 80_000;
export const MIN_WEEKEND_PCT = 0.10;

export type PaymentMode = "contado" | "contraentrega";
export type ClientKind = "nuevo" | "recompra";

export interface CommissionContext {
  /** Override manual: forma de pago (default: contado) */
  paymentMode: PaymentMode;
  /** Override manual: pedido devuelto (descuenta $10k) */
  returned: boolean;
}

/** Default context cuando no hay override */
export const defaultCtx: CommissionContext = {
  paymentMode: "contado",
  returned: false,
};

function isWeekend(date: Date): boolean {
  const d = getDay(date); // 0=Dom, 6=Sab
  return d === 0 || d === 6;
}

/**
 * Devuelve el % de comisión a aplicar según política.
 * @param weekendUnlocked Si el asesor tiene desbloqueadas las comisiones de FDS este mes.
 */
export function getCommissionRate(params: {
  saleType: "menor" | "mayor";
  weekend: boolean;
  paymentMode: PaymentMode;
  clientKind: ClientKind;
  weekendUnlocked: boolean;
}): number {
  const { saleType, weekend, paymentMode, clientKind, weekendUnlocked } = params;

  // Si es FDS pero no está desbloqueado, se paga como semana.
  const effectiveWeekend = weekend && weekendUnlocked;

  if (saleType === "menor") {
    if (effectiveWeekend) {
      return paymentMode === "contado" ? 0.20 : 0.17;
    }
    return paymentMode === "contado" ? 0.12 : 0.10;
  }
  // mayor
  if (clientKind === "recompra") {
    return effectiveWeekend ? 0.07 : 0.06;
  }
  // mayorista nuevo
  return effectiveWeekend ? 0.12 : 0.10;
}

export interface CommissionLine {
  order: Order;
  weekend: boolean;
  paymentMode: PaymentMode;
  clientKind: ClientKind;
  returned: boolean;
  totalWithVat: number;
  baseSinIva: number;
  ratePct: number; // ej 0.12
  rawCommission: number;
  penalty: number;
  netCommission: number;
}

/**
 * Resumen mensual por asesor con cálculo final, KPIs y bonos.
 */
export interface AdvisorMonthSummary {
  advisorId: string;
  advisorName: string;
  ordersCount: number;
  totalWithVat: number;
  totalSinIva: number;
  weekendSales: number;
  weekendPct: number;
  ticketAvgDetal: number;
  returnsCount: number;
  returnsPenalty: number;
  rawCommission: number;
  bonus: number;
  totalToPay: number;
  weekendUnlocked: boolean;
  kpiTicketOk: boolean;
  kpiWeekendPctOk: boolean;
  lines: CommissionLine[];
}

export type OrderOverrides = Record<string, Partial<CommissionContext>>;

function getOrderDate(o: Order): Date {
  const ref = o.invoice_date || o.created_at;
  return typeof ref === "string" ? parseISO(ref) : new Date(ref);
}

export function summarizeAdvisorMonth(
  orders: Order[],
  overrides: OrderOverrides,
  year: number,
  month: number
): AdvisorMonthSummary[] {
  const start = startOfMonth(new Date(year, month, 1));
  const end = endOfMonth(new Date(year, month, 1));

  // Agrupar por asesor primero (para calcular desbloqueo y KPIs)
  const byAdvisor = new Map<string, Order[]>();
  for (const o of orders) {
    if (o.invoice_status !== "facturado") continue;
    const d = getOrderDate(o);
    if (!isWithinInterval(d, { start, end })) continue;
    const arr = byAdvisor.get(o.advisor_id) || [];
    arr.push(o);
    byAdvisor.set(o.advisor_id, arr);
  }

  const result: AdvisorMonthSummary[] = [];

  for (const [advisorId, advisorOrders] of byAdvisor) {
    const advisorName = advisorOrders[0]?.advisor_name || "—";

    // Paso 1: total mensual CON IVA para decidir desbloqueo y bonos.
    const totalWithVat = advisorOrders.reduce(
      (s, o) => s + Number(o.total_amount || 0),
      0
    );
    const weekendUnlocked = totalWithVat >= UNLOCK_THRESHOLD;

    // Paso 2: calcular cada línea con tasa final.
    const lines: CommissionLine[] = advisorOrders.map((o) => {
      const ctx = { ...defaultCtx, ...(overrides[o.id] || {}) };
      const d = getOrderDate(o);
      const weekend = isWeekend(d);
      const clientKind: ClientKind = o.is_recompra ? "recompra" : "nuevo";
      const total = Number(o.total_amount || 0);
      const baseSinIva = total / IVA_DIVISOR;
      const rate = getCommissionRate({
        saleType: o.sale_type as "menor" | "mayor",
        weekend,
        paymentMode: ctx.paymentMode,
        clientKind,
        weekendUnlocked,
      });
      const rawCommission = baseSinIva * rate;
      const penalty =
        ctx.returned && ctx.paymentMode === "contraentrega" ? RETURN_PENALTY : 0;
      return {
        order: o,
        weekend,
        paymentMode: ctx.paymentMode,
        clientKind,
        returned: ctx.returned,
        totalWithVat: total,
        baseSinIva,
        ratePct: rate,
        rawCommission,
        penalty,
        netCommission: Math.max(rawCommission - penalty, 0),
      };
    });

    const totalSinIva = totalWithVat / IVA_DIVISOR;
    const weekendSales = lines
      .filter((l) => l.weekend)
      .reduce((s, l) => s + l.totalWithVat, 0);
    const weekendPct = totalWithVat > 0 ? weekendSales / totalWithVat : 0;

    const detalLines = lines.filter((l) => l.order.sale_type === "menor");
    const ticketAvgDetal =
      detalLines.length > 0
        ? detalLines.reduce((s, l) => s + l.totalWithVat, 0) / detalLines.length
        : 0;

    const returnsCount = lines.filter((l) => l.returned).length;
    const returnsPenalty = lines.reduce((s, l) => s + l.penalty, 0);
    const rawCommission = lines.reduce((s, l) => s + l.netCommission, 0);

    // KPIs visibles (no bloquean cálculo de bonos automáticamente — admin valida)
    const kpiTicketOk = ticketAvgDetal >= MIN_TICKET_DETAL || detalLines.length === 0;
    const kpiWeekendPctOk = weekendPct >= MIN_WEEKEND_PCT;

    let bonus = 0;
    if (totalWithVat >= BONUS_TIER_1_THRESHOLD) bonus += BONUS_TIER_1_AMOUNT;
    if (totalWithVat >= BONUS_TIER_2_THRESHOLD) bonus += BONUS_TIER_2_AMOUNT;

    result.push({
      advisorId,
      advisorName,
      ordersCount: lines.length,
      totalWithVat,
      totalSinIva,
      weekendSales,
      weekendPct,
      ticketAvgDetal,
      returnsCount,
      returnsPenalty,
      rawCommission,
      bonus,
      totalToPay: rawCommission + bonus,
      weekendUnlocked,
      kpiTicketOk,
      kpiWeekendPctOk,
      lines,
    });
  }

  return result.sort((a, b) => b.totalToPay - a.totalToPay);
}
