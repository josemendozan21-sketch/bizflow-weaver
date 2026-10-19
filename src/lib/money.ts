/**
 * Lee un valor en pesos colombianos tal como lo escribe una persona.
 * "24.100", "24100", "$24.100", "1.234.567" → enteros. El punto es separador de miles.
 * Solo se acepta coma como decimal ("24.100,50" → 24100.5).
 */
export function parseCOP(input: string | number | null | undefined): number {
  if (typeof input === "number") return Number.isFinite(input) ? input : 0;
  if (!input) return 0;
  let s = String(input).replace(/[\s$]/g, "").replace(/COP/i, "");
  const [intPart, dec] = s.split(",");
  const digits = intPart.replace(/\./g, "").replace(/[^\d-]/g, "");
  const decDigits = (dec || "").replace(/\D/g, "");
  const n = Number(decDigits ? `${digits}.${decDigits}` : digits);
  return Number.isFinite(n) ? n : 0;
}

export const formatCOPInput = (n: number) => (n ? `$${Math.round(n).toLocaleString("es-CO")}` : "");

export type CashAlertState = "max" | "min" | "ok";

/** ≥ máximo → alerta de custodia; < mínimo → alerta de mínimo. Nunca bloquea movimientos. */
export function cashAlertState(balance: number, min: number, max: number): CashAlertState {
  if (balance >= max) return "max";
  if (balance < min) return "min";
  return "ok";
}
