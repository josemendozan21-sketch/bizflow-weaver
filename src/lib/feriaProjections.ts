import type { Feria, FeriaSale, ScenarioInput } from "@/hooks/useFerias";
import { calcFeriaTotalCost, calcFeriaTotalBudget } from "@/hooks/useFerias";

export interface BreakEvenResult {
  costsUsed: number;
  costsSource: "real" | "presupuestado";
  fixedCosts: number;          // costos fijos (todo menos mercancía)
  merchandiseCost: number;     // costo de mercancía (real o ppto, informativo)
  fixedWithMargin: number;     // costos fijos + utilidad objetivo
  targetMarginPct: number;
  ivaPct: number;
  breakEvenWithIva: number;
  breakEvenWithoutIva: number;
  breakEvenUnits: number;      // unidades necesarias para cubrir fijos + margen
  avgPriceConIva: number;
  varCostPerUnit: number;
  contributionPerUnitSinIva: number;
}

export function calcBreakEven(
  feria: Feria,
  inventarioConIva = 0,
  inventarioUnidades = 0,
  inventarioCosto = 0,
): BreakEvenResult {
  const real = calcFeriaTotalCost(feria);
  const budget = calcFeriaTotalBudget(feria);
  const useReal = real > 0;
  const costsUsed = useReal ? real : budget;
  const costsSource: "real" | "presupuestado" = useReal ? "real" : "presupuestado";
  const merchandiseCost = useReal
    ? (feria.merchandise_cost || 0)
    : (feria.budget_merchandise_cost || 0);
  // Mercancía es variable (proporcional a ventas), no debe entrar en costos fijos
  const fixedCosts = Math.max(0, costsUsed - merchandiseCost);
  const margin = (feria.target_margin_pct || 0) / 100;
  const iva = (feria.iva_pct || 0) / 100;
  const fixedWithMargin = fixedCosts * (1 + margin);

  // Punto de equilibrio real con margen de contribución
  const avgPriceConIva = inventarioUnidades > 0 ? inventarioConIva / inventarioUnidades : 0;
  const avgPriceSinIva = avgPriceConIva / (1 + iva);
  const varCostPerUnit = inventarioUnidades > 0 ? inventarioCosto / inventarioUnidades : 0;
  const contributionPerUnitSinIva = Math.max(0, avgPriceSinIva - varCostPerUnit);

  const breakEvenUnits = contributionPerUnitSinIva > 0
    ? fixedWithMargin / contributionPerUnitSinIva
    : 0;
  const breakEvenWithIva = breakEvenUnits * avgPriceConIva;
  const breakEvenWithoutIva = breakEvenUnits * avgPriceSinIva;

  return {
    costsUsed,
    costsSource,
    fixedCosts,
    merchandiseCost,
    fixedWithMargin,
    targetMarginPct: feria.target_margin_pct,
    ivaPct: feria.iva_pct,
    breakEvenWithIva,
    breakEvenWithoutIva,
    breakEvenUnits,
    avgPriceConIva,
    varCostPerUnit,
    contributionPerUnitSinIva,
  };
}

export interface ScenarioResult {
  unidades: number;
  ingresoConIva: number;
  ingresoSinIva: number;
  costoMercancia: number;
  costosFijos: number;
  costoTotal: number;
  utilidad: number;
  comisionTotal: number;
  utilidadNeta: number;
  excedente: number;
  superaEquilibrio: boolean;
  pctVsEquilibrio: number;
}

export function calcScenario(
  s: ScenarioInput,
  feria: Feria,
  be: BreakEvenResult,
  inventarioConIva: number,
  inventarioUnidades: number,
  inventarioCosto = 0,
): ScenarioResult {
  const pctInv = (s.pct_inventario || 0) / 100;
  const pctCom = (s.pct_comision || 0) / 100;
  const ingresoConIva = inventarioConIva * pctInv;
  const ingresoSinIva = ingresoConIva / (1 + (feria.iva_pct || 0) / 100);
  const unidades = inventarioUnidades * pctInv;
  // Costo de mercancía proporcional a las unidades vendidas
  const costoMercancia = inventarioCosto * pctInv;
  const costosFijos = be.fixedCosts;
  const costoTotal = costosFijos + costoMercancia;
  const utilidad = ingresoConIva - costoTotal;
  const excedente = Math.max(0, ingresoSinIva - be.breakEvenWithoutIva);
  const comisionTotal = excedente * pctCom;
  const utilidadNeta = utilidad - comisionTotal;
  const superaEquilibrio = be.breakEvenUnits > 0
    ? unidades >= be.breakEvenUnits
    : ingresoConIva >= be.breakEvenWithIva;
  const pctVsEquilibrio = be.breakEvenUnits > 0
    ? (unidades / be.breakEvenUnits) * 100
    : (be.breakEvenWithIva > 0 ? (ingresoConIva / be.breakEvenWithIva) * 100 : 0);
  return { unidades, ingresoConIva, ingresoSinIva, costoMercancia, costosFijos, costoTotal, utilidad, comisionTotal, utilidadNeta, excedente, superaEquilibrio, pctVsEquilibrio };
}

export interface CommissionProposal {
  advisor_id: string | null;
  advisor_name: string;
  sales_with_iva: number;
  sales_without_iva: number;
  excedente: number;
  applied_pct: number;
  commission_amount: number;
}

// Tiered commission on excedente above break-even (without IVA).
// Tier 1: BE .. BE*(1+t1)
// Tier 2: BE*(1+t1) .. BE*(1+t2)
// Tier 3: > BE*(1+t2)
function tieredCommission(salesSinIva: number, beSinIva: number, feria: Feria): { applied: number; amount: number; excedente: number } {
  if (salesSinIva <= beSinIva || beSinIva <= 0) {
    return { applied: 0, amount: 0, excedente: 0 };
  }
  const t1 = (feria.commission_tier_1_to_pct || 0) / 100;
  const t2 = (feria.commission_tier_2_to_pct || 0) / 100;
  const upper1 = beSinIva * (1 + t1);
  const upper2 = beSinIva * (1 + t2);
  const p1 = (feria.commission_tier_1_pct || 0) / 100;
  const p2 = (feria.commission_tier_2_pct || 0) / 100;
  const p3 = (feria.commission_tier_3_pct || 0) / 100;

  const tramo1 = Math.max(0, Math.min(salesSinIva, upper1) - beSinIva);
  const tramo2 = Math.max(0, Math.min(salesSinIva, upper2) - upper1);
  const tramo3 = Math.max(0, salesSinIva - upper2);
  const amount = tramo1 * p1 + tramo2 * p2 + tramo3 * p3;
  const excedente = tramo1 + tramo2 + tramo3;
  // weighted applied pct
  const applied = excedente > 0 ? (amount / excedente) * 100 : 0;
  return { applied, amount, excedente };
}

export function proposeCommissions(
  sales: FeriaSale[],
  advisorLookup: Map<string, string>,
  feria: Feria,
  be: BreakEvenResult
): CommissionProposal[] {
  const ivaFactor = 1 + (feria.iva_pct || 0) / 100;
  // group by recorded_by
  const groups = new Map<string, { advisor_id: string | null; advisor_name: string; with_iva: number }>();
  for (const s of sales) {
    const key = (s as any).recorded_by || "__unassigned__";
    const name = (s as any).recorded_by ? advisorLookup.get((s as any).recorded_by) || "Asesor" : "Sin asesor";
    const cur = groups.get(key) || { advisor_id: (s as any).recorded_by || null, advisor_name: name, with_iva: 0 };
    cur.with_iva += Number(s.total_amount) || 0;
    groups.set(key, cur);
  }
  // Total without IVA across the fair
  const totalSinIva = Array.from(groups.values()).reduce((a, g) => a + g.with_iva / ivaFactor, 0);
  // Compute tiered commission on TOTAL excedente, then distribute by share
  const fairTier = tieredCommission(totalSinIva, be.breakEvenWithoutIva, feria);
  return Array.from(groups.values()).map((g) => {
    const sinIva = g.with_iva / ivaFactor;
    const share = totalSinIva > 0 ? sinIva / totalSinIva : 0;
    const excedente = fairTier.excedente * share;
    const amount = fairTier.amount * share;
    const applied = excedente > 0 ? (amount / excedente) * 100 : 0;
    return {
      advisor_id: g.advisor_id,
      advisor_name: g.advisor_name,
      sales_with_iva: g.with_iva,
      sales_without_iva: sinIva,
      excedente,
      applied_pct: applied,
      commission_amount: amount,
    };
  }).sort((a, b) => b.sales_with_iva - a.sales_with_iva);
}
