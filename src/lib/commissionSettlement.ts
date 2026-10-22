import { type Order } from "@/hooks/useOrders";
import { getDay, parseISO } from "date-fns";
import {
  IVA_DIVISOR,
  UNLOCK_THRESHOLD,
  bonusFor,
  BONUS_TIER_1_THRESHOLD,
  BONUS_TIER_1_AMOUNT,
  BONUS_TIER_2_THRESHOLD,
  BONUS_TIER_2_AMOUNT,
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
 * 1. Un pedido está al 100% cuando tiene pago total y soporte de pago (contraentrega: además
 *    confirmación de cobro del asesor).
 * 2. La comisión pertenece al mes del último pago real (contraentrega: de la confirmación).
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

/** Canales web automáticos: no generan comisión. */
export const SYSTEM_WEB_ADVISOR_IDS = new Set([
  "00000000-0000-0000-0000-000000000001", // Sweatspot Web
  "00000000-0000-0000-0000-000000000002", // Magical Warmers Web
  "00000000-0000-0000-0000-000000000003", // Bionovations Mayorista Web
]);

export function isExcludedOrder(o: Order): boolean {
  return (
    SYSTEM_WEB_ADVISOR_IDS.has(o.advisor_id) ||
    isGiftOrder(o) ||
    Number(o.total_amount || 0) <= 0 ||
    Boolean(o.returned_at) ||
    o.production_status === "cancelado"
  );
}

/**
 * Contraentrega: desde que Logística despacha, el pedido queda "pendiente" hasta que el asesor
 * confirme que el cliente recibió y pagó. Solo suma si queda "cobrado" (mes = fecha de confirmación).
 * Pedidos anteriores a la regla (sin estado) siguen la regla general.
 */
export type CodStatus = "pendiente" | "cobrado" | "no_cobrado" | null;
export function codStatus(o: Order): CodStatus {
  if (o.payment_method !== "contra_entrega") return null;
  return ((o as any).cod_confirmation as CodStatus) ?? null;
}

/** Una sola razón, en palabras simples, de por qué un pedido aún no suma. */
export function pendingReason(o: Order, missing: string[]): string {
  const cod = codStatus(o);
  if (cod === "no_cobrado") return `No suma: contraentrega no cobrada${(o as any).cod_reason ? ` — ${(o as any).cod_reason}` : ""}`;
  const saldo = Math.max(Number(o.total_amount || 0) - Number(o.abono || 0), 0);
  if (missing.includes("pago total")) return saldo > 0 ? `Falta saldo $${Math.round(saldo).toLocaleString("es-CO")}` : "Falta pago total";
  if (missing.includes("soporte de pago")) return "Falta comprobante";
  if (cod === "pendiente") return "Falta confirmar entrega contraentrega";
  return missing[0] || "Pendiente";
}

export function isBackfillPayment(notes?: string | null): boolean {
  return Boolean(notes && notes.includes("corrección automática 2026-09-03"));
}

/** Fecha en que el pedido quedó al 100% (pago total + comprobante), o null si aún no. */
export function getCompletionDate(o: Order, payments?: PaymentsByOrder): Date | null {
  if (isExcludedOrder(o)) return null;
  if (!getPayability(o, payments).payable) return null;
  const cod = codStatus(o);
  if (cod === "pendiente" || cod === "no_cobrado") return null;
  if (cod === "cobrado") return parse((o as any).cod_confirmed_at) || new Date();
  const real = getFullPaymentDate(o, payments);
  if (real) return real;
  // Sin fecha real de pago (corrección del 3-sep o pedido histórico sin pagos):
  // despacho → factura → venta. Nunca el 3 de septiembre.
  return parse(o.dispatched_at) || parse(o.invoice_date) || getSaleDate(o);
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
  /** Una sola razón legible */
  reason: string;
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
      const missing = getPayability(o, payments).missing;
      pending.push({ order: o, saleDate: getSaleDate(o), missing, reason: pendingReason(o, missing) });
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

export const BONUS_GOALS = [
  { threshold: BONUS_TIER_1_THRESHOLD, amount: BONUS_TIER_1_AMOUNT },
  { threshold: BONUS_TIER_2_THRESHOLD, amount: BONUS_TIER_2_AMOUNT },
];

export interface SettlementSummary {
  ventas: number;
  pedidos: number;
  comision: number;
  bono: number;
  aPagar: number;
  porMarca: { brand: string; ventas: number; pedidos: number; comision: number }[];
  faltantes: { count: number; valor: number };
  /** Próxima meta de bono (o null si ya alcanzó todas) */
  proximaMeta: { threshold: number; amount: number; falta: number } | null;
}

/** Resumen simple para mostrar: lo mismo para Contabilidad y para el asesor. Montos al peso. */
export function summarizeSettlement(d: SettlementDraft): SettlementSummary {
  const lines = [...d.current, ...d.carryover];
  const r = Math.round;
  const by = new Map<string, { brand: string; ventas: number; pedidos: number; comision: number }>();
  for (const l of lines) {
    const b = l.order.brand === "sweatspot" ? "Sweat Spot" : "Magical";
    const e = by.get(b) || { brand: b, ventas: 0, pedidos: 0, comision: 0 };
    e.ventas += Number(l.order.total_amount || 0); e.pedidos += 1; e.comision += l.amount;
    by.set(b, e);
  }
  const comision = r(d.currentAmount + d.carryoverAmount);
  const bono = r(d.bonus);
  const next = BONUS_GOALS.find((g) => d.completedTotal < g.threshold);
  const pend = d.pending.filter((p) => codStatus(p.order) !== "no_cobrado");
  return {
    ventas: r(lines.reduce((s, l) => s + Number(l.order.total_amount || 0), 0)),
    pedidos: lines.length,
    comision,
    bono,
    aPagar: comision + bono,
    porMarca: Array.from(by.values()).map((e) => ({ ...e, ventas: r(e.ventas), comision: r(e.comision) })),
    faltantes: { count: pend.length, valor: r(pend.reduce((s, p) => s + Number(p.order.total_amount || 0), 0)) },
    proximaMeta: next ? { ...next, falta: r(next.threshold - d.completedTotal) } : null,
  };
}

// ================= Panel de comisiones (asesor y Contabilidad) =================

/** Día de pago: 20 del mes de pago; si no es miércoles o viernes, el primer miércoles o viernes siguiente. */
export function scheduledPayDate(payPeriod: string): Date {
  const [y, m] = payPeriod.split("-").map(Number);
  const d = new Date(y, m - 1, 20, 12);
  while (d.getDay() !== 3 && d.getDay() !== 5) d.setDate(d.getDate() + 1);
  return d;
}

export type OrderCommissionStatus =
  | "pendiente_pago" | "pago_parcial" | "falta_soporte" | "falta_entrega" | "no_suma"
  | "lista" | "en_revision" | "aprobada" | "pagada";

export const ORDER_STATUS_INFO: Record<OrderCommissionStatus, { label: string; help: string }> = {
  pendiente_pago: { label: "Pendiente de pago", help: "El cliente aún no ha pagado nada." },
  pago_parcial: { label: "Pago parcial", help: "Hay un abono; falta el saldo del cliente." },
  falta_soporte: { label: "Falta comprobante de pago", help: "El pago está completo pero falta el comprobante." },
  falta_entrega: { label: "Falta confirmar entrega", help: "Contraentrega: confirma que el cliente recibió y pagó." },
  no_suma: { label: "No suma", help: "Contraentrega no cobrada: esta venta no genera comisión." },
  lista: { label: "Lista para liquidar", help: "Cumple todo. Entra en la próxima liquidación." },
  en_revision: { label: "En revisión de Contabilidad", help: "Contabilidad está revisando la liquidación." },
  aprobada: { label: "Aprobada", help: "Contabilidad aprobó; falta la transferencia." },
  pagada: { label: "Pagada", help: "La comisión ya fue transferida." },
};

export interface OrderCommissionRow {
  order: Order;
  saleDate: Date;
  base: number;          // valor antes de IVA
  rate: number;
  estimated: number;     // comisión total estimada
  collected: number;     // recaudado (con IVA)
  balance: number;       // saldo del cliente
  caused: number;        // comisión respaldada por pagos
  future: number;        // comisión aún no causada
  status: OrderCommissionStatus;
  completedDate: Date | null;
  commissionPaid: number;
  commissionRemaining: number;
}

export interface CommissionOverview {
  rows: OrderCommissionRow[];
  cards: {
    ventasMes: number; recaudadoMes: number; futuras: number; causadas: number;
    pendientesRequisitos: number; disponibles: number; aprobadas: number; pagadas: number;
  };
}

/** Un cálculo, mismas cifras para asesor y Contabilidad. Las 8 cifras no se suman entre sí. */
export function buildCommissionOverview(params: {
  orders: Order[]; payments: PaymentsByOrder; charges?: ChargesMap; advisorId: string; period: string;
  settlements: { id: string; status: string; advisor_id: string }[];
  items: { id?: string; settlement_id: string; order_id: string; amount: number | string }[];
  payouts: LedgerPayment[];
  allocations?: LedgerAllocation[];
}): CommissionOverview {
  const { orders, payments, charges, advisorId, period } = params;
  const stById = new Map(params.settlements.filter((s) => s.advisor_id === advisorId).map((s) => [s.id, s.status]));
  const itemByOrder = new Map<string, { status: string; amount: number }>();
  for (const i of params.items) {
    const st = stById.get(i.settlement_id);
    if (st) itemByOrder.set(i.order_id, { status: st, amount: Number(i.amount || 0) });
  }
  const rows: OrderCommissionRow[] = [];
  let ventasMes = 0, recaudadoMes = 0;
  for (const o of orders) {
    if (o.advisor_id !== advisorId || isExcludedOrder(o)) continue;
    const total = Number(o.total_amount || 0);
    const base = getCommissionableTotal(o, charges) / IVA_DIVISOR;
    const rate = rateFor(o, false);
    const rowsP = (payments[o.id] || []).filter((r) => Number(r.amount || 0) > 0);
    const collected = Math.min(Math.max(Number(o.abono || 0), rowsP.reduce((s, r) => s + Number(r.amount || 0), 0)), total);
    for (const r of rowsP) if (r.payment_date && r.payment_date.slice(0, 7) === period) recaudadoMes += Number(r.amount || 0);
    const saleDate = getSaleDate(o);
    if (periodKey(saleDate) === period) ventasMes += base;
    const completedDate = getCompletionDate(o, payments);
    const settled = itemByOrder.get(o.id);
    const estimated = settled ? settled.amount : base * rate;
    const commissionPaid = appliedToTarget(params.payouts, params.allocations || [], "item", o.id, params.items);
    const commissionRemaining = Math.max(Math.round(estimated) - commissionPaid, 0);
    const cod = codStatus(o);
    let status: OrderCommissionStatus;
    if (cod === "no_cobrado") status = "no_suma";
    else if (commissionPaid > 0 && commissionRemaining === 0) status = "pagada";
    else if (settled) status = settled.status === "en_revision" ? "en_revision" : "aprobada";
    else if (completedDate) status = "lista";
    else {
      const missing = getPayability(o, payments).missing;
      if (missing.includes("pago total")) status = collected > 0 ? "pago_parcial" : "pendiente_pago";
      else if (missing.includes("soporte de pago")) status = "falta_soporte";
      else status = "falta_entrega";
    }
    const ratio = total > 0 ? collected / total : 0;
    const caused = status === "no_suma" ? 0 : estimated * Math.min(ratio, 1);
    rows.push({
      order: o, saleDate, base, rate, estimated: status === "no_suma" ? 0 : estimated, collected,
      balance: Math.max(total - collected, 0), caused, future: status === "no_suma" ? 0 : Math.max(estimated - caused, 0),
      status, completedDate, commissionPaid, commissionRemaining,
    });
  }
  const sum = (f: (r: OrderCommissionRow) => number) => Math.round(rows.reduce((s, r) => s + f(r), 0));
  const blocked: OrderCommissionStatus[] = ["pendiente_pago", "pago_parcial", "falta_soporte", "falta_entrega"];
  return {
    rows: rows.sort((a, b) => b.saleDate.getTime() - a.saleDate.getTime()),
    cards: {
      ventasMes: Math.round(ventasMes),
      recaudadoMes: Math.round(recaudadoMes),
      futuras: sum((r) => (blocked.includes(r.status) ? r.future : 0)),
      causadas: sum((r) => r.caused),
      pendientesRequisitos: sum((r) => (blocked.includes(r.status) ? r.caused : 0)),
      disponibles: sum((r) => (r.status === "lista" ? r.commissionRemaining : 0)),
      aprobadas: sum((r) => (r.status === "aprobada" || r.status === "en_revision" ? r.commissionRemaining : 0)),
      pagadas: ledgerSummary(params.payouts.filter((p) => p.advisor_id === advisorId && p.pay_period === period), params.allocations || []).applied,
    },
  };
}


export interface LedgerPayment {
  id?: string; advisor_id: string; amount: number | string; pay_period?: string;
  reconciliation_status?: string; payment_kind?: string; proof_url?: string | null;
}
export interface LedgerAllocation {
  id: string; payout_id: string; settlement_item_id: string | null; settlement_id: string | null;
  opening_balance_id: string | null; amount: number | string;
}
export function activeCommissionPayment(p: LedgerPayment): boolean {
  return ["pending", "partial", "reconciled"].includes(p.reconciliation_status || "");
}
export function ledgerSummary(payouts: LedgerPayment[], allocations: LedgerAllocation[]) {
  let applied = 0, unassigned = 0, historical = 0;
  for (const p of payouts) {
    if (p.reconciliation_status === "reversed") continue;
    const paid = activeCommissionPayment(p) ? allocations.filter(a => a.payout_id === p.id).reduce((s,a) => s + Number(a.amount),0) : 0;
    applied += paid; unassigned += Math.max(Number(p.amount) - paid, 0);
    if (p.payment_kind === "historico") historical += paid;
  }
  return { applied: Math.round(applied), unassigned: Math.round(unassigned), historical: Math.round(historical) };
}
export function appliedToTarget(payouts: LedgerPayment[], allocations: LedgerAllocation[], kind: "item" | "extra" | "opening", id: string, items: { id?: string; order_id: string; settlement_id: string }[] = []): number {
  const active = new Set(payouts.filter(activeCommissionPayment).map(p => p.id));
  const itemIds = new Set(items.filter(i => i.order_id === id).map(i => i.id));
  return Math.round(allocations.filter(a => active.has(a.payout_id) && (kind === "item" ? a.settlement_item_id === id || itemIds.has(a.settlement_item_id || "") : kind === "extra" ? a.settlement_id === id : a.opening_balance_id === id)).reduce((s,a) => s + Number(a.amount),0));
}
export function appliedToSettlement(id: string, payouts: LedgerPayment[], allocations: LedgerAllocation[], items: { id: string; settlement_id: string }[]): number {
  const ids = new Set(items.filter(i => i.settlement_id === id).map(i => i.id));
  const active = new Set(payouts.filter(activeCommissionPayment).map(p => p.id));
  return Math.round(allocations.filter(a => active.has(a.payout_id) && (a.settlement_id === id || ids.has(a.settlement_item_id || ""))).reduce((s,a) => s + Number(a.amount),0));
}
export function validateCommissionAllocation(paymentRemaining: number, commissionRemaining: number, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Ingresa un importe mayor a cero");
  if (amount > paymentRemaining) throw new Error("La suma asignada supera el importe del pago");
  if (amount > commissionRemaining) throw new Error("La asignación supera el saldo pendiente de la comisión");
}
export function requireCommissionProof(proof: unknown) {
  if (!proof) throw new Error("Adjunta el comprobante para confirmar");
}
