import { type Order, isOrderFullyPaid } from "@/hooks/useOrders";
import {
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parseISO,
  getDay,
} from "date-fns";
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
  periodLabel,
  type ChargesMap,
  type ClientKind,
  type PeriodTotals,
} from "@/lib/commissions";

/**
 * Causación de comisión por RECAUDO.
 *
 * Reglas acordadas con la dirección comercial:
 * 1. La VENTA pertenece al mes en que entró el pedido (fecha de venta).
 * 2. El RECAUDO (y por lo tanto la comisión causada) pertenece al mes de cada
 *    pago: si un pedido se abonó mitad en julio y mitad en agosto, cada mitad
 *    queda en su mes.
 * 3. La comisión solo se PAGA cuando el pedido está 100% pagado, con soportes
 *    de pago y despachado. Mientras tanto queda causada pero retenida.
 */

export interface PaymentRow {
  order_id: string;
  amount: number | string | null;
  payment_date: string | null;
  proof_url?: string | null;
}

export type PaymentsByOrder = Record<string, PaymentRow[]>;

function num(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function parse(v: unknown): Date | null {
  if (!v) return null;
  const d = typeof v === "string" ? parseISO(v) : new Date(v as Date);
  return isNaN(d.getTime()) ? null : d;
}

export function groupPayments(rows: PaymentRow[]): PaymentsByOrder {
  const map: PaymentsByOrder = {};
  for (const r of rows) {
    (map[r.order_id] ||= []).push(r);
  }
  return map;
}

interface Collection {
  date: Date;
  amount: number;
  hasProof: boolean;
}

/**
 * Pagos del pedido. Si el pedido no tiene pagos registrados uno por uno
 * (pedidos históricos), se reconstruye un único pago con lo que se sabe:
 * el total si quedó pagado, o el abono registrado.
 */
export function getCollections(o: Order, payments?: PaymentsByOrder): Collection[] {
  const rows = payments?.[o.id] || [];
  const out: Collection[] = [];
  for (const r of rows) {
    const d = parse(r.payment_date) || parse((r as any).created_at);
    const amount = num(r.amount);
    if (!d || amount <= 0) continue;
    out.push({ date: d, amount, hasProof: Boolean(r.proof_url) });
  }
  if (out.length > 0) return out;

  const total = num(o.total_amount);
  const fallbackDate = parse((o as any).invoice_date) || getSaleDate(o);
  const hasProof = Boolean(o.payment_proof_url);
  if (isOrderFullyPaid(o) && total > 0) {
    return [{ date: fallbackDate, amount: total, hasProof }];
  }
  const abono = Math.min(num(o.abono), total);
  if (abono > 0) return [{ date: fallbackDate, amount: abono, hasProof }];
  return [];
}

/** ¿La comisión de este pedido ya se puede pagar? */
export function getPayability(
  o: Order,
  payments?: PaymentsByOrder
): { payable: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!isOrderFullyPaid(o)) missing.push("pago total");
  const rows = payments?.[o.id] || [];
  const hasProof =
    Boolean(o.payment_proof_url) || rows.some((r) => Boolean(r.proof_url));
  if (!hasProof) missing.push("soporte de pago");
  if (!(o as any).dispatched_at) missing.push("despacho");
  return { payable: missing.length === 0, missing };
}

function rateFor(o: Order, weekendUnlocked: boolean): number {
  const sale = getSaleDate(o);
  const day = getDay(sale);
  const clientKind: ClientKind = o.is_recompra ? "recompra" : "nuevo";
  return (
    getFlatRateFor(o.advisor_name) ??
    getCommissionRate({
      saleType: (o.sale_type as "menor" | "mayor") || "mayor",
      weekend: day === 0 || day === 6,
      paymentMode: getDefaultPaymentMode(o),
      clientKind,
      weekendUnlocked,
    })
  );
}

export interface AccrualRow {
  order: Order;
  salePeriod: string;
  salePeriodLabel: string;
  /** Recaudo del pedido dentro del mes consultado (con IVA) */
  collectedInMonth: number;
  /** Parte comisionable de ese recaudo (sin flete ni cargos) */
  commissionableInMonth: number;
  rate: number;
  commission: number;
  payable: boolean;
  missing: string[];
}

export interface MonthAccrualSummary {
  period: string;
  periodLabel: string;
  /** Ventas tomadas en el mes */
  sold: PeriodTotals;
  /** De esas ventas, cuánto se ha recaudado hasta hoy y cuánto falta */
  soldCollectedToDate: number;
  soldPending: number;
  /** Recaudo registrado dentro del mes (venga del mes que venga) */
  collectedInMonth: number;
  collectedFromThisMonth: number;
  collectedFromOtherMonths: (PeriodTotals & { period: string; label: string })[];
  /** Comisión causada por el recaudo del mes */
  commissionAccrued: number;
  /** De la causada: lista para pagar (pedido completo) y retenida */
  commissionPayable: number;
  commissionHeld: number;
  heldCount: number;
  /** Motivos por los que hay comisión retenida */
  heldReasons: { reason: string; count: number; amount: number }[];
  bonus: number;
  toPay: number;
  rows: AccrualRow[];
}

const empty = (): PeriodTotals => ({ count: 0, total: 0 });

export function summarizeMonthAccrual(
  orders: Order[],
  payments: PaymentsByOrder,
  year: number,
  month: number,
  advisorId?: string,
  charges?: ChargesMap
): MonthAccrualSummary {
  const start = startOfMonth(new Date(year, month, 1));
  const end = endOfMonth(new Date(year, month, 1));
  const key = periodKey(start);

  const mine = orders.filter(
    (o) => (!advisorId || o.advisor_id === advisorId) && !isGiftOrder(o)
  );

  const sold = empty();
  let soldCollectedToDate = 0;
  let soldPending = 0;

  // Paso 1: recaudo del mes por pedido (sin tarifa todavía).
  const raw: {
    o: Order;
    collectedInMonth: number;
    commissionableInMonth: number;
  }[] = [];
  let collectedInMonth = 0;

  for (const o of mine) {
    const total = num(o.total_amount);
    const saleDate = getSaleDate(o);
    const isSoldHere = isWithinInterval(saleDate, { start, end });
    const cols = getCollections(o, payments);
    const collectedTotal = cols.reduce((s, c) => s + c.amount, 0);

    if (isSoldHere && total > 0) {
      sold.count += 1;
      sold.total += total;
      soldCollectedToDate += Math.min(collectedTotal, total);
      soldPending += Math.max(total - collectedTotal, 0);
    }

    const inMonth = cols
      .filter((c) => isWithinInterval(c.date, { start, end }))
      .reduce((s, c) => s + c.amount, 0);
    if (inMonth <= 0 || total <= 0) continue;

    const net = getCommissionableTotal(o, charges);
    const factor = total > 0 ? net / total : 0;
    const capped = Math.min(inMonth, total);
    collectedInMonth += capped;
    raw.push({
      o,
      collectedInMonth: capped,
      commissionableInMonth: capped * factor,
    });
  }

  // Paso 2: desbloqueo de fin de semana sobre el recaudo del mes.
  const weekendUnlocked = collectedInMonth >= UNLOCK_THRESHOLD;

  const rows: AccrualRow[] = raw.map((r) => {
    const rate = rateFor(r.o, weekendUnlocked);
    const commission = (r.commissionableInMonth / IVA_DIVISOR) * rate;
    const { payable, missing } = getPayability(r.o, payments);
    const sp = periodKey(getSaleDate(r.o));
    return {
      order: r.o,
      salePeriod: sp,
      salePeriodLabel: periodLabel(sp),
      collectedInMonth: r.collectedInMonth,
      commissionableInMonth: r.commissionableInMonth,
      rate,
      commission,
      payable,
      missing,
    };
  });

  const otherMap = new Map<string, PeriodTotals & { period: string; label: string }>();
  let collectedFromThisMonth = 0;
  for (const r of rows) {
    if (r.salePeriod === key) {
      collectedFromThisMonth += r.collectedInMonth;
      continue;
    }
    let b = otherMap.get(r.salePeriod);
    if (!b) {
      b = { period: r.salePeriod, label: r.salePeriodLabel, count: 0, total: 0 };
      otherMap.set(r.salePeriod, b);
    }
    b.count += 1;
    b.total += r.collectedInMonth;
  }

  const commissionAccrued = rows.reduce((s, r) => s + r.commission, 0);
  const payableRows = rows.filter((r) => r.payable);
  const heldRows = rows.filter((r) => !r.payable);
  const commissionPayable = payableRows.reduce((s, r) => s + r.commission, 0);
  const commissionHeld = heldRows.reduce((s, r) => s + r.commission, 0);

  const reasonMap = new Map<string, { count: number; amount: number }>();
  for (const r of heldRows) {
    const reason = `Falta ${r.missing.join(" y ")}`;
    const prev = reasonMap.get(reason) || { count: 0, amount: 0 };
    reasonMap.set(reason, {
      count: prev.count + 1,
      amount: prev.amount + r.commission,
    });
  }

  const bonus = bonusFor(collectedInMonth);

  return {
    period: key,
    periodLabel: periodLabel(key),
    sold,
    soldCollectedToDate,
    soldPending,
    collectedInMonth,
    collectedFromThisMonth,
    collectedFromOtherMonths: Array.from(otherMap.values()).sort((a, b) =>
      a.period.localeCompare(b.period)
    ),
    commissionAccrued,
    commissionPayable,
    commissionHeld,
    heldCount: heldRows.length,
    heldReasons: Array.from(reasonMap.entries())
      .map(([reason, v]) => ({ reason, ...v }))
      .sort((a, b) => b.amount - a.amount),
    bonus,
    toPay: commissionPayable + bonus,
    rows: rows.sort((a, b) => b.collectedInMonth - a.collectedInMonth),
  };
}

/** Resumen por asesor para el panel de contabilidad. */
export function summarizeMonthAccrualByAdvisor(
  orders: Order[],
  payments: PaymentsByOrder,
  year: number,
  month: number,
  charges?: ChargesMap
): Record<string, MonthAccrualSummary> {
  const out: Record<string, MonthAccrualSummary> = {};
  for (const advisorId of Array.from(new Set(orders.map((o) => o.advisor_id)))) {
    if (!advisorId) continue;
    const s = summarizeMonthAccrual(orders, payments, year, month, advisorId, charges);
    if (s.sold.count > 0 || s.rows.length > 0) out[advisorId] = s;
  }
  return out;
}

/** Filas de conciliación para Excel y CSV. */
export function accrualSummaryRows(
  s: MonthAccrualSummary
): { Concepto: string; Valor: string | number }[] {
  const money = (n: number) => Math.round(n).toLocaleString("es-CO");
  return [
    {
      Concepto: "Ventas del mes (pedidos que entraron en el mes)",
      Valor: `${s.sold.count} pedido(s) · ${money(s.sold.total)}`,
    },
    { Concepto: "De esas ventas, ya recaudado", Valor: Math.round(s.soldCollectedToDate) },
    { Concepto: "De esas ventas, saldo por cobrar", Valor: Math.round(s.soldPending) },
    { Concepto: "Recaudo registrado en el mes", Valor: Math.round(s.collectedInMonth) },
    {
      Concepto: "Del recaudo, corresponde a ventas del mes",
      Valor: Math.round(s.collectedFromThisMonth),
    },
    ...s.collectedFromOtherMonths.map((b) => ({
      Concepto: `Del recaudo, corresponde a ventas de ${b.label}`,
      Valor: Math.round(b.total),
    })),
    { Concepto: "Comisión causada por el recaudo", Valor: Math.round(s.commissionAccrued) },
    {
      Concepto: "Comisión lista para pago (pedido completo y despachado)",
      Valor: Math.round(s.commissionPayable),
    },
    {
      Concepto: "Comisión retenida (pedido incompleto)",
      Valor: `${s.heldCount} pedido(s) · ${money(s.commissionHeld)}`,
    },
    ...s.heldReasons.map((r) => ({
      Concepto: `Retenida — ${r.reason}`,
      Valor: `${r.count} pedido(s) · ${money(r.amount)}`,
    })),
    { Concepto: "Bono del mes", Valor: Math.round(s.bonus) },
    { Concepto: "Total a pagar este mes", Valor: Math.round(s.toPay) },
  ];
}
