/**
 * Cálculo único de caja menor (Toberín y Chico).
 *
 * Reglas:
 *  - "ingreso"        → suma al saldo.
 *  - "gasto"          → resta al saldo (aplica a gastos y a ingresos mal cargados reclasificados).
 *  - "saldo_inicial"  → NO suma: fija el saldo de la sede en ese momento (arqueo / base contada).
 *  - "traslado_salida"/"traslado_entrada" → mueven plata entre sedes sin alterar el total.
 *  - Los gastos "rechazado" se ignoran; los "pendiente" sí descuentan (la plata ya salió).
 */

export type Sede = "toberin" | "chico";

export const SEDES: { value: Sede; label: string; short: string }[] = [
  { value: "toberin", label: "Toberín (Bodega Principal)", short: "Toberín" },
  { value: "chico", label: "Chicó (Tienda 92)", short: "Chicó" },
];

export const sedeLabel = (s: string | null | undefined) =>
  SEDES.find((x) => x.value === s)?.short ?? "Toberín";

export type FundKind =
  | "ingreso"
  | "saldo_inicial"
  | "gasto"
  | "traslado_entrada"
  | "traslado_salida";

export interface PettyFund {
  id: string;
  amount: number;
  set_by: string;
  notes: string | null;
  created_at: string;
  sede?: string | null;
  movement_kind?: string | null;
}

export interface PettyExpense {
  id: string;
  fund_id: string | null;
  amount: number;
  description: string;
  requested_by: string;
  proof_url: string | null;
  recorded_by: string;
  recorded_by_name: string;
  created_at: string;
  sede?: string | null;
  origin?: string | null;
  status?: string | null;
  rejection_reason?: string | null;
}

export type MovementKind = "ingreso" | "gasto" | "saldo_inicial" | "traslado";

export interface PettyMovement {
  id: string;
  source: "fund" | "expense";
  kind: MovementKind;
  /** efecto sobre el saldo: +1 suma, -1 resta, 0 fija saldo */
  signedAmount: number;
  amount: number;
  sede: Sede;
  date: string;
  description: string;
  requestedBy?: string;
  recordedBy?: string;
  proofUrl?: string | null;
  status: "aprobado" | "pendiente" | "rechazado";
  origin: "contabilidad" | "punto";
  raw: PettyFund | PettyExpense;
}

const asSede = (s: string | null | undefined): Sede => (s === "chico" ? "chico" : "toberin");

export function fundKind(f: PettyFund): FundKind {
  const k = (f.movement_kind ?? "ingreso") as FundKind;
  return ["ingreso", "saldo_inicial", "gasto", "traslado_entrada", "traslado_salida"].includes(k)
    ? k
    : "ingreso";
}

export function buildMovements(funds: PettyFund[], expenses: PettyExpense[]): PettyMovement[] {
  const fromFunds: PettyMovement[] = funds.map((f) => {
    const k = fundKind(f);
    const amount = Number(f.amount) || 0;
    const kind: MovementKind =
      k === "saldo_inicial"
        ? "saldo_inicial"
        : k === "gasto"
          ? "gasto"
          : k.startsWith("traslado")
            ? "traslado"
            : "ingreso";
    const signedAmount =
      k === "saldo_inicial" ? 0 : k === "gasto" || k === "traslado_salida" ? -amount : amount;
    return {
      id: f.id,
      source: "fund" as const,
      kind,
      signedAmount,
      amount,
      sede: asSede(f.sede),
      date: f.created_at,
      description:
        f.notes?.trim() ||
        (kind === "saldo_inicial" ? "Saldo inicial / arqueo" : "Ingreso a caja menor"),
      proofUrl: null,
      status: "aprobado" as const,
      origin: "contabilidad" as const,
      raw: f,
    };
  });

  const fromExpenses: PettyMovement[] = expenses.map((e) => {
    const amount = Number(e.amount) || 0;
    const status = (e.status ?? "aprobado") as PettyMovement["status"];
    return {
      id: e.id,
      source: "expense" as const,
      kind: "gasto" as const,
      signedAmount: status === "rechazado" ? 0 : -amount,
      amount,
      sede: asSede(e.sede),
      date: e.created_at,
      description: e.description,
      requestedBy: e.requested_by,
      recordedBy: e.recorded_by_name,
      proofUrl: e.proof_url,
      status,
      origin: (e.origin ?? "contabilidad") as PettyMovement["origin"],
      raw: e,
    };
  });

  return [...fromFunds, ...fromExpenses].sort((a, b) => +new Date(a.date) - +new Date(b.date));
}

/** Movimientos de una sede, en orden cronológico, con saldo acumulado correcto. */
export function withRunningBalance(movements: PettyMovement[]) {
  let running = 0;
  return movements.map((m) => {
    if (m.kind === "saldo_inicial") running = m.amount;
    else running += m.signedAmount;
    return { ...m, balance: running };
  });
}

export interface SedeSummary {
  sede: Sede;
  balance: number;
  income: number;
  expense: number;
  pendingExpense: number;
  lastReset: PettyMovement | null;
}

/** Saldo de una sede: último saldo inicial + movimientos posteriores. */
export function sedeSummary(all: PettyMovement[], sede: Sede): SedeSummary {
  const list = all.filter((m) => m.sede === sede);
  let lastResetIdx = -1;
  list.forEach((m, i) => {
    if (m.kind === "saldo_inicial") lastResetIdx = i;
  });
  const base = lastResetIdx >= 0 ? list[lastResetIdx].amount : 0;
  const after = list.slice(lastResetIdx + 1);
  const income = after.filter((m) => m.signedAmount > 0).reduce((s, m) => s + m.amount, 0);
  const expense = after
    .filter((m) => m.signedAmount < 0)
    .reduce((s, m) => s + m.amount, 0);
  const pendingExpense = after
    .filter((m) => m.kind === "gasto" && m.status === "pendiente")
    .reduce((s, m) => s + m.amount, 0);
  return {
    sede,
    balance: base + income - expense,
    income,
    expense,
    pendingExpense,
    lastReset: lastResetIdx >= 0 ? list[lastResetIdx] : null,
  };
}

export function totalsBySede(funds: PettyFund[], expenses: PettyExpense[]) {
  const movements = buildMovements(funds, expenses);
  const toberin = sedeSummary(movements, "toberin");
  const chico = sedeSummary(movements, "chico");
  return {
    movements,
    toberin,
    chico,
    total: toberin.balance + chico.balance,
  };
}

export const formatCOP = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;

/* ------------------ Efectivo en el punto de venta (Chicó) ------------------ */

export interface PosCashInput {
  /** Base configurada del punto; solo se usa si aún no hay ningún arqueo. */
  cashBase: number;
  /** Último arqueo de la sede (efectivo contado y fecha), si existe. */
  lastCount?: { counted_amount: number; created_at: string } | null;
  sales: { sale_date: string; payment_method: string | null; total_amount: number }[];
  withdrawals: {
    created_at: string;
    amount: number;
    status: string;
    movement_type?: string | null;
  }[];
  /** Gastos en efectivo del punto (caja menor sede Chicó). */
  expenses: PettyExpense[];
}

export const isCashMethod = (m: string | null | undefined) =>
  (m ?? "").toLowerCase().split("+").some((p) => p.trim() === "efectivo");

/**
 * Efectivo en caja del punto = último arqueo (o base) + ventas en efectivo posteriores
 * − retiros − consignaciones − gastos en efectivo. Los movimientos rechazados se ignoran;
 * los pendientes sí descuentan porque la plata ya salió físicamente.
 */
export function computePosCash({ cashBase, lastCount, sales, withdrawals, expenses }: PosCashInput) {
  const since = lastCount ? +new Date(lastCount.created_at) : -Infinity;
  const base = lastCount ? Number(lastCount.counted_amount) : cashBase;

  const after = (d: string) => +new Date(d) > since;

  const cashSales = sales
    .filter((s) => isCashMethod(s.payment_method) && after(s.sale_date))
    .reduce((a, s) => a + Number(s.total_amount), 0);

  const live = withdrawals.filter((w) => w.status !== "rechazado" && after(w.created_at));
  const retiros = live
    .filter((w) => (w.movement_type ?? "retiro") === "retiro")
    .reduce((a, w) => a + Number(w.amount), 0);
  const consignaciones = live
    .filter((w) => w.movement_type === "consignacion")
    .reduce((a, w) => a + Number(w.amount), 0);
  const pending = live
    .filter((w) => w.status === "pendiente")
    .reduce((a, w) => a + Number(w.amount), 0);

  const liveExpenses = expenses.filter(
    (e) => (e.status ?? "aprobado") !== "rechazado" && after(e.created_at),
  );
  const gastos = liveExpenses.reduce((a, e) => a + Number(e.amount), 0);
  const gastosPendientes = liveExpenses
    .filter((e) => (e.status ?? "aprobado") === "pendiente")
    .reduce((a, e) => a + Number(e.amount), 0);

  return {
    base,
    baseFromCount: !!lastCount,
    cashSales,
    retiros,
    consignaciones,
    gastos,
    pending,
    gastosPendientes,
    cashOnHand: base + cashSales - retiros - consignaciones - gastos,
  };
}
