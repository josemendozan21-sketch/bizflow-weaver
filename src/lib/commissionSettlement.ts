import { type Order } from "@/hooks/useOrders";
import { getDay, parseISO } from "date-fns";
import {
  IVA_DIVISOR,
  UNLOCK_THRESHOLD,
  bonusFor,
  getCommissionRate,
  getCommissionableTotal,
  getDefaultPaymentMode,
  getFlatRateFor,
  getSaleDate,
  isGiftOrder,
  periodKey,
  type ChargesMap,
} from "@/lib/commissions";
import { getPayability, type PaymentsByOrder } from "@/lib/commissionAccrual";

/**
 * Liquidación mensual de comisiones — regla única de la plataforma.
 *
 * 1. Un pedido está al 100% cuando tiene pago total, soporte de pago y despacho.
 * 2. La comisión pertenece al mes en que el pedido quedó al 100%
 *    (la fecha más tardía entre el último pago y el despacho).
 * 3. Lo causado en un mes se paga el mes siguiente.
 * 4. Los bonos se calculan sobre lo que quedó al 100% en el mes de causación.
 * 5. Nada se paga parcial ni por abono.
 */

/** Desde este mes de causación se arrastran pendientes automáticamente.
 *  Antes se pagó por fuera: esos meses se pueden consultar y liquidar,
 *  pero no se suman solos como "pendientes anteriores". */
export const SETTLEMENT_START_PERIOD = "2026-10";
/** Primer mes de causación consultable (inicio de la plataforma). */
export const HISTORY_START_PERIOD = "2026-04";

function parse(v: unknown): Date | null {
  if (!v) return null;
  const d = typeof v === "string" ? parseISO(v) : new Date(v as Date);
  return isNaN(d.getTime()) ? null : d;
}

export function shiftPeriod(period: string, delta: number): string {
  const [y, m] = period.split("-").map(Number);
  return periodKey(new Date(y, m - 1 + delta, 1));
}

export function isExcludedOrder(o: Order): boolean {
  return (
    isGiftOrder(o) ||
    Number(o.total_amount || 0) <= 0 ||
    Boolean(o.returned_at) ||
    o.production_status === "cancelado"
  );
}

export function isBackfillPayment(notes?: string | null): boolean {
  return Boolean(notes && notes.includes("corrección automática 2026-09-03"));
}

/** Fecha en que el pedido quedó al 100%, o null si aún no lo está. */
export function getCompletionDate(o: Order, payments?: PaymentsByOrder): Date | null {
  if (isExcludedOrder(o)) return null;
  if (!getPayability(o, payments).payable) return null;
  const dates: Date[] = [];
  const dispatched = parse(o.dispatched_at);
  if (dispatched) dates.push(dispatched);
  for (const r of payments?.[o.id] || []) {
    // La corrección masiva del 3-sep-2026 registró saldos viejos con esa fecha:
    // no indica cuándo se cobró, así que no mueve el mes de la comisión.
    if (isBackfillPayment(r.notes)) continue;
    const d = parse(r.payment_date);
    if (d && Number(r.amount || 0) > 0) dates.push(d);
  }
  if (dates.length === 0) return null;
  return new Date(Math.max(...dates.map((d) => d.getTime())));
}

/** Fecha del último pago real del cliente (sin contar la corrección del 3-sep). */
export function getFullPaymentDate(o: Order, payments?: PaymentsByOrder): Date | null {
  let max: Date | null = null;
  const rows = payments?.[o.id] || [];
  // Si el saldo se cargó con la corrección del 3-sep, no se sabe cuándo se pagó completo.
  if (rows.some((r) => isBackfillPayment(r.notes))) return null;
  for (const r of rows) {
    if (Number(r.amount || 0) <= 0) continue;
    const d = parse(r.payment_date);
    if (d && (!max || d > max)) max = d;
  }
  return max;
}

export const causationPeriodOf = (completed: Date) => periodKey(completed);
export const expectedPayPeriod = (causation: string) => shiftPeriod(causation, 1);

export interface SettlementLine {
  order: Order;
  saleDate: Date;
  completedDate: Date;
  /** Fecha del último pago real del cliente (pago completo) */
  paidDate: Date | null;
  causationPeriod: string;
  expectedPayPeriod: string;
  base: number;
  rate: number;
  amount: number;
  isCarryover: boolean;
}

export interface PendingLine {
  order: Order;
  saleDate: Date;
  missing: string[];
}

export interface SettlementDraft {
  payPeriod: string;
  causationPeriod: string;
  current: SettlementLine[];
  carryover: SettlementLine[];
  pending: PendingLine[];
  currentAmount: number;
  carryoverAmount: number;
  /** Total con IVA de lo que quedó al 100% en el mes de causación */
  completedTotal: number;
  bonus: number;
  total: number;
}

function rateFor(o: Order, weekendUnlocked: boolean): number {
  const day = getDay(getSaleDate(o));
  return (
    getFlatRateFor(o.advisor_name) ??
    getCommissionRate({
      saleType: (o.sale_type as "menor" | "mayor") || "mayor",
      weekend: day === 0 || day === 6,
      paymentMode: getDefaultPaymentMode(o),
      clientKind: o.is_recompra ? "recompra" : "nuevo",
      weekendUnlocked,
    })
  );
}

/**
 * Arma la liquidación que se paga en `payPeriod` para un asesor:
 * - current: pedidos al 100% en el mes anterior a payPeriod.
 * - carryover: pedidos al 100% en meses anteriores (desde SETTLEMENT_START_PERIOD)
 *   que no están en ninguna liquidación ya creada.
 * `settledOrderIds` son los pedidos ya incluidos en otra liquidación: nunca se repiten.
 */
export function buildSettlement(params: {
  orders: Order[];
  payments: PaymentsByOrder;
  charges?: ChargesMap;
  advisorId: string;
  payPeriod: string;
  settledOrderIds?: Set<string>;
  startPeriod?: string;
}): SettlementDraft {
  const { orders, payments, charges, advisorId, payPeriod } = params;
  const settled = params.settledOrderIds || new Set<string>();
  const start = params.startPeriod || SETTLEMENT_START_PERIOD;
  const causation = shiftPeriod(payPeriod, -1);

  const mine = orders.filter((o) => o.advisor_id === advisorId && !isExcludedOrder(o));
  const pending: PendingLine[] = [];
  const done: { o: Order; completed: Date; period: string; net: number }[] = [];

  for (const o of mine) {
    const completed = getCompletionDate(o, payments);
    if (!completed) {
      pending.push({ order: o, saleDate: getSaleDate(o), missing: getPayability(o, payments).missing });
      continue;
    }
    done.push({ o, completed, period: causationPeriodOf(completed), net: getCommissionableTotal(o, charges) });
  }

  // Desbloqueo FDS y bonos: por lo que quedó al 100% en cada mes de causación.
  const completedByPeriod = new Map<string, number>();
  for (const d of done) {
    completedByPeriod.set(d.period, (completedByPeriod.get(d.period) || 0) + Number(d.o.total_amount || 0));
  }

  const current: SettlementLine[] = [];
  const carryover: SettlementLine[] = [];
  for (const d of done) {
    if (d.period > causation) continue;
    if (d.period < causation && d.period < start) continue;
    if (settled.has(d.o.id)) continue;
    const unlocked = (completedByPeriod.get(d.period) || 0) >= UNLOCK_THRESHOLD;
    const rate = rateFor(d.o, unlocked);
    const base = d.net / IVA_DIVISOR;
    const line: SettlementLine = {
      order: d.o,
      saleDate: getSaleDate(d.o),
      completedDate: d.completed,
      paidDate: getFullPaymentDate(d.o, payments),
      causationPeriod: d.period,
      expectedPayPeriod: expectedPayPeriod(d.period),
      base,
      rate,
      amount: base * rate,
      isCarryover: d.period < causation,
    };
    (line.isCarryover ? carryover : current).push(line);
  }

  const completedTotal = completedByPeriod.get(causation) || 0;
  const bonus = bonusFor(completedTotal);
  const currentAmount = current.reduce((s, l) => s + l.amount, 0);
  const carryoverAmount = carryover.reduce((s, l) => s + l.amount, 0);
  const sortL = (a: SettlementLine, b: SettlementLine) => a.completedDate.getTime() - b.completedDate.getTime();

  return {
    payPeriod,
    causationPeriod: causation,
    current: current.sort(sortL),
    carryover: carryover.sort(sortL),
    pending: pending.sort((a, b) => a.saleDate.getTime() - b.saleDate.getTime()),
    currentAmount,
    carryoverAmount,
    completedTotal,
    bonus,
    total: currentAmount + carryoverAmount + bonus,
  };
}

export const SETTLEMENT_STATUS_LABEL: Record<string, string> = {
  pendiente_liquidacion: "Pendiente de liquidación",
  pendiente_pago: "Pendiente de pago",
  pago_registrado: "Pago registrado",
  en_revision: "En revisión",
  saldado: "Saldado",
};
