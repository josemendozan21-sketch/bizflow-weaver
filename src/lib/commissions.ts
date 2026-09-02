import { type Order, isOrderFullyPaid } from "@/hooks/useOrders";
import { startOfMonth, endOfMonth, isWithinInterval, getDay, parseISO } from "date-fns";

/**
 * Política de Comisiones y Bonos – Asesores Comerciales 2026
 *
 * Reglas oficiales:
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

/* ------------------------------------------------------------------ *
 * Causación de la comisión (regla única para Ventas y Contabilidad)
 * ------------------------------------------------------------------ */

export type CommissionStatus = "total" | "parcial" | "pendiente" | "excluido";

export interface CommissionClassification {
  /** Estado de causación del pedido. */
  status: CommissionStatus;
  /** Valor CON IVA que sí causa comisión (0 si no causa). */
  base: number;
  /** Motivo legible: por qué causa o por qué no. */
  reason: string;
}

/**
 * Política configurable: si un pedido con abono parcial causa comisión
 * proporcional al abono (true) o se difiere hasta el pago total (false).
 */
export const PARTIAL_PAYMENT_ACCRUES = true;

/** Mapa order_id -> suma de cargos adicionales del pedido. */
export type ChargesMap = Record<string, number>;

function num(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** Flete cobrado en el pedido (ya viene incluido dentro de total_amount). */
export function getShippingCost(o: Order): number {
  return num((o as any).shipping_cost);
}

/** Cargos adicionales (marcación, escarcha, etc.) del pedido. */
export function getExtraCharges(o: Order, charges?: ChargesMap): number {
  return num(charges?.[o.id]);
}

/**
 * Valor del pedido que sí comisiona: total menos flete y menos cargos
 * adicionales. La comisión se paga sobre producto.
 */
export function getCommissionableTotal(o: Order, charges?: ChargesMap): number {
  const total = num(o.total_amount);
  if (total <= 0) return 0;
  const net = total - getShippingCost(o) - getExtraCharges(o, charges);
  return Math.max(Math.min(net, total), 0);
}

/** ¿El pedido es un obsequio / muestra? No genera comisión y no es un error. */
export function isGiftOrder(o: Order): boolean {
  return String((o as any).payment_method || "").toLowerCase() === "obsequio";
}

/**
 * Decide si un pedido causa comisión, cuánto y por qué.
 * Maneja nulos explícitamente: antes un `payment_complete` nulo hacía que el
 * pedido desapareciera silenciosamente del cálculo.
 */
export function classifyOrderForCommission(
  o: Order,
  charges?: ChargesMap
): CommissionClassification {
  const total = num(o.total_amount);

  if (isGiftOrder(o)) {
    return {
      status: "excluido",
      base: 0,
      reason: "Obsequio / muestra — no genera comisión",
    };
  }

  if (total <= 0) {
    return {
      status: "excluido",
      base: 0,
      reason: "Pedido sin valor registrado (total en $0)",
    };
  }

  const net = getCommissionableTotal(o, charges);
  const noComisionable = total - net; // flete + cargos
  const nota =
    noComisionable > 0
      ? ` (se descuentan ${Math.round(noComisionable).toLocaleString("es-CO")} de flete/cargos)`
      : "";

  if (isOrderFullyPaid(o)) {
    return { status: "total", base: net, reason: `Pago completo registrado${nota}` };
  }

  if (o.invoice_status === "facturado") {
    return { status: "total", base: net, reason: `Pedido facturado${nota}` };
  }

  const abono = Math.min(num(o.abono), total);
  const hasProof = Boolean(o.payment_proof_url);

  if (abono > 0 && PARTIAL_PAYMENT_ACCRUES) {
    // El abono se prorratea sobre la parte comisionable del pedido.
    const baseAbono = total > 0 ? (abono * net) / total : 0;
    return {
      status: "parcial",
      base: baseAbono,
      reason: hasProof
        ? `Abono parcial con soporte de pago — comisión proporcional a lo abonado${nota}`
        : `Abono parcial registrado — comisión proporcional a lo abonado${nota}`,
    };
  }

  if (abono > 0) {
    return {
      status: "pendiente",
      base: 0,
      reason: "Abono parcial: la política difiere la comisión al pago total",
    };
  }

  if (o.returned_at) {
    return {
      status: "excluido",
      base: 0,
      reason: "Pedido devuelto sin pago registrado",
    };
  }

  return {
    status: "pendiente",
    base: 0,
    reason: "Sin abono ni soporte de pago del cliente",
  };
}

/** Compatibilidad: el pedido causa comisión (total o parcial). */
export function isCommissionable(o: Order, charges?: ChargesMap): boolean {
  const c = classifyOrderForCommission(o, charges);
  return c.status === "total" || c.status === "parcial";
}

export const STATUS_LABEL: Record<CommissionStatus, string> = {
  total: "Causa comisión",
  parcial: "Comisión parcial (abono)",
  pendiente: "Pendiente de pago",
  excluido: "Excluido",
};

/**
 * Asesores con tarifa plana: Valentina Mendoza percibe 10% sobre cualquier
 * venta (base sin IVA), sin importar canal, día o forma de pago.
 */
export const FLAT_RATE_ADVISORS: { match: string; rate: number }[] = [
  { match: "valentina mendoza", rate: 0.10 },
  { match: "valemendoza", rate: 0.10 },
];

export function getFlatRateFor(advisorName?: string | null): number | null {
  const n = (advisorName || "").toLowerCase().trim();
  if (!n) return null;
  const hit = FLAT_RATE_ADVISORS.find((f) => n.includes(f.match));
  return hit ? hit.rate : null;
}

export type PaymentMode = "contado" | "contraentrega";
export type ClientKind = "nuevo" | "recompra";

/** Criterio de asignación del período: fecha de venta o fecha de factura. */
export type PeriodBasis = "venta" | "factura";

/**
 * Criterio ÚNICO y oficial: la comisión pertenece al mes de la FACTURA.
 * Si el pedido aún no tiene factura se ubica por fecha de venta y se marca
 * como pendiente de facturar, para que asesor y contabilidad vean lo mismo.
 */
export const PERIOD_BASIS: PeriodBasis = "factura";

export interface CommissionContext {
  /** Override manual: forma de pago (default: contado) */
  paymentMode: PaymentMode;
}

/** Default context cuando no hay override */
export const defaultCtx: CommissionContext = {
  paymentMode: "contado",
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
  /** Valor total del pedido con IVA */
  totalWithVat: number;
  /** Flete incluido en el total (no comisiona) */
  shippingCost: number;
  /** Cargos adicionales del pedido (no comisionan) */
  extraCharges: number;
  /** Total menos flete y cargos: la parte que sí comisiona */
  netTotalWithVat: number;
  /** El pedido aún no tiene factura emitida */
  pendingInvoice: boolean;
  /** Valor con IVA que causa comisión (abono si es parcial) */
  commissionableWithVat: number;
  /** Base sin IVA sobre la que se aplica el % */
  baseSinIva: number;
  ratePct: number; // ej 0.12
  rawCommission: number;
  penalty: number;
  netCommission: number;
  status: CommissionStatus;
  reason: string;
  saleDate: Date;
  invoiceDate: Date | null;
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
  /** Pedidos del período que NO causaron comisión, con su motivo */
  excludedLines: CommissionLine[];
  excludedCount: number;
  excludedWithVat: number;
  /** Total vendido en el período incluyendo los excluidos */
  grossSalesWithVat: number;
  grossOrdersCount: number;
}

export type OrderOverrides = Record<string, Partial<CommissionContext>>;

function parseDate(v: unknown): Date | null {
  if (!v) return null;
  const d = typeof v === "string" ? parseISO(v) : new Date(v as Date);
  return isNaN(d.getTime()) ? null : d;
}

export function getSaleDate(o: Order): Date {
  return parseDate(o.created_at) || new Date();
}

export function getInvoiceDate(o: Order): Date | null {
  return parseDate(o.invoice_date);
}

/** Fecha usada para ubicar el pedido en el período según el criterio elegido. */
export function getPeriodDate(o: Order, basis: PeriodBasis = "venta"): Date {
  if (basis === "factura") return getInvoiceDate(o) || getSaleDate(o);
  return getSaleDate(o);
}

function buildLine(
  o: Order,
  paymentMode: PaymentMode,
  weekendUnlocked: boolean,
  basis: PeriodBasis
): CommissionLine {
  const cls = classifyOrderForCommission(o);
  const d = getPeriodDate(o, basis);
  const weekend = isWeekend(d);
  const clientKind: ClientKind = o.is_recompra ? "recompra" : "nuevo";
  const total = num(o.total_amount);
  const commissionableWithVat = cls.base;
  const baseSinIva = commissionableWithVat / IVA_DIVISOR;
  const rate =
    getFlatRateFor(o.advisor_name) ??
    getCommissionRate({
      saleType: (o.sale_type as "menor" | "mayor") || "mayor",
      weekend,
      paymentMode,
      clientKind,
      weekendUnlocked,
    });
  const rawCommission = baseSinIva * rate;
  const returned = !!o.returned_at;
  const penalty =
    returned && paymentMode === "contraentrega" && rawCommission > 0
      ? RETURN_PENALTY
      : 0;
  return {
    order: o,
    weekend,
    paymentMode,
    clientKind,
    returned,
    totalWithVat: total,
    commissionableWithVat,
    baseSinIva,
    ratePct: rate,
    rawCommission,
    penalty,
    netCommission: Math.max(rawCommission - penalty, 0),
    status: cls.status,
    reason: cls.reason,
    saleDate: getSaleDate(o),
    invoiceDate: getInvoiceDate(o),
  };
}

export function summarizeAdvisorMonth(
  orders: Order[],
  overrides: OrderOverrides,
  year: number,
  month: number,
  basis: PeriodBasis = "venta"
): AdvisorMonthSummary[] {
  const start = startOfMonth(new Date(year, month, 1));
  const end = endOfMonth(new Date(year, month, 1));

  // Agrupar por asesor primero (para calcular desbloqueo y KPIs).
  // Se incluyen TODOS los pedidos del período; la clasificación decide si causan.
  const byAdvisor = new Map<string, Order[]>();
  for (const o of orders) {
    const d = getPeriodDate(o, basis);
    if (!isWithinInterval(d, { start, end })) continue;
    const arr = byAdvisor.get(o.advisor_id) || [];
    arr.push(o);
    byAdvisor.set(o.advisor_id, arr);
  }

  const result: AdvisorMonthSummary[] = [];

  for (const [advisorId, advisorOrders] of byAdvisor) {
    const advisorName = advisorOrders[0]?.advisor_name || "—";

    const grossSalesWithVat = advisorOrders.reduce(
      (s, o) => s + num(o.total_amount),
      0
    );

    // Paso 1: total causado CON IVA para decidir desbloqueo y bonos.
    const totalWithVat = advisorOrders.reduce(
      (s, o) => s + classifyOrderForCommission(o).base,
      0
    );
    const weekendUnlocked = totalWithVat >= UNLOCK_THRESHOLD;

    // Paso 2: calcular cada línea con tasa final.
    const allLines = advisorOrders.map((o) => {
      const ctx = { ...defaultCtx, ...(overrides[o.id] || {}) };
      return buildLine(o, ctx.paymentMode, weekendUnlocked, basis);
    });

    const lines = allLines.filter(
      (l) => l.status === "total" || l.status === "parcial"
    );
    const excludedLines = allLines.filter(
      (l) => l.status === "pendiente" || l.status === "excluido"
    );

    const totalSinIva = totalWithVat / IVA_DIVISOR;
    const weekendSales = lines
      .filter((l) => l.weekend)
      .reduce((s, l) => s + l.commissionableWithVat, 0);
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

    const bonus = bonusFor(totalWithVat);

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
      excludedLines,
      excludedCount: excludedLines.length,
      excludedWithVat: excludedLines.reduce((s, l) => s + l.totalWithVat, 0),
      grossSalesWithVat,
      grossOrdersCount: advisorOrders.length,
    });
  }

  return result.sort((a, b) => b.totalToPay - a.totalToPay);
}

/* ------------------------------------------------------------------ *
 * Progreso del asesor (vista para el propio asesor)
 * Incluye pedidos que causan y los que aún no.
 * ------------------------------------------------------------------ */

export interface ProgressLine extends CommissionLine {
  invoiced: boolean;
  date: Date;
}

export interface AdvisorProgressSummary {
  ordersCount: number;
  totalWithVat: number;
  totalSinIva: number;
  invoicedCount: number;
  invoicedWithVat: number;
  invoicedCommission: number;
  pendingCount: number;
  pendingWithVat: number;
  pendingCommission: number;
  excludedCount: number;
  excludedWithVat: number;
  bonusInvoiced: number;
  bonusProjected: number;
  toPayInvoiced: number;
  toPayProjected: number;
  weekendUnlocked: boolean;
  lines: ProgressLine[];
}

function bonusFor(totalWithVat: number): number {
  let b = 0;
  if (totalWithVat >= BONUS_TIER_1_THRESHOLD) b += BONUS_TIER_1_AMOUNT;
  if (totalWithVat >= BONUS_TIER_2_THRESHOLD) b += BONUS_TIER_2_AMOUNT;
  return b;
}

export function summarizeAdvisorProgress(
  orders: Order[],
  year: number,
  month: number,
  advisorId?: string,
  basis: PeriodBasis = "venta"
): AdvisorProgressSummary {
  const start = startOfMonth(new Date(year, month, 1));
  const end = endOfMonth(new Date(year, month, 1));

  const monthOrders = orders.filter((o) => {
    if (advisorId && o.advisor_id !== advisorId) return false;
    const d = getPeriodDate(o, basis);
    return isWithinInterval(d, { start, end });
  });

  const totalWithVat = monthOrders.reduce(
    (s, o) => s + num(o.total_amount),
    0
  );
  const causadoWithVat = monthOrders.reduce(
    (s, o) => s + classifyOrderForCommission(o).base,
    0
  );

  // El desbloqueo FDS se evalúa sobre lo causado (política oficial).
  const weekendUnlocked = causadoWithVat >= UNLOCK_THRESHOLD;

  const lines: ProgressLine[] = monthOrders.map((o) => {
    const paymentMode: PaymentMode =
      o.payment_method === "contra_entrega" ? "contraentrega" : "contado";
    const base = buildLine(o, paymentMode, weekendUnlocked, basis);
    return {
      ...base,
      date: getPeriodDate(o, basis),
      invoiced: base.status === "total" || base.status === "parcial",
    };
  });

  const invoicedLines = lines.filter((l) => l.invoiced);
  const pendingLines = lines.filter((l) => l.status === "pendiente");
  const excludedLines = lines.filter((l) => l.status === "excluido");

  const invoicedCommission = invoicedLines.reduce((s, l) => s + l.netCommission, 0);

  // Comisión proyectada de lo que aún no causa (si el cliente paga todo).
  const pendingCommission = pendingLines.reduce((s, l) => {
    const rate = l.ratePct;
    const restante = Math.max(l.totalWithVat - l.commissionableWithVat, 0);
    return s + (restante / IVA_DIVISOR) * rate;
  }, 0);
  // Saldo aún no causado de los pedidos parciales.
  const partialRemaining = invoicedLines.reduce((s, l) => {
    const restante = Math.max(l.totalWithVat - l.commissionableWithVat, 0);
    return s + (restante / IVA_DIVISOR) * l.ratePct;
  }, 0);

  const bonusInvoiced = bonusFor(causadoWithVat);
  const bonusProjected = bonusFor(totalWithVat);

  return {
    ordersCount: lines.length,
    totalWithVat,
    totalSinIva: totalWithVat / IVA_DIVISOR,
    invoicedCount: invoicedLines.length,
    invoicedWithVat: causadoWithVat,
    invoicedCommission,
    pendingCount: pendingLines.length,
    pendingWithVat: pendingLines.reduce((s, l) => s + l.totalWithVat, 0),
    pendingCommission: pendingCommission + partialRemaining,
    excludedCount: excludedLines.length,
    excludedWithVat: excludedLines.reduce((s, l) => s + l.totalWithVat, 0),
    bonusInvoiced,
    bonusProjected,
    toPayInvoiced: invoicedCommission + bonusInvoiced,
    toPayProjected:
      invoicedCommission + pendingCommission + partialRemaining + bonusProjected,
    weekendUnlocked,
    lines: lines.sort((a, b) => b.date.getTime() - a.date.getTime()),
  };
}
