import { describe, expect, it } from "vitest";
import type { Order } from "@/hooks/useOrders";
import { getOrderCommissionRate, VALENTINA_ADVISOR_ID, summarizeAdvisorMonth } from "@/lib/commissions";
import { buildCommissionOverview, buildSettlement, isSettlementSnapshotLocked } from "@/lib/commissionSettlement";
import { summarizeMonthAccrual } from "@/lib/commissionAccrual";
import { buildCommissionRows } from "@/lib/commissionExports";

const context = { saleType: "mayor", weekend: false, paymentMode: "contado", clientKind: "nuevo", weekendUnlocked: false } as const;
const order = (over: Partial<Order> = {}): Order => ({
  id: "volume-order", advisor_id: "general", advisor_name: "Asesor", brand: "magical", sale_type: "mayor",
  client_name: "Cliente", product: "Producto", quantity: 1000, total_amount: 1_190_000, abono: 1_190_000,
  payment_complete: true, payment_proof_url: "proof", created_at: "2026-10-05T12:00:00", production_status: "pendiente",
  invoice_status: "pendiente", is_recompra: false, shipping_cost: 0, ...over,
} as Order);

describe("umbrales de volumen", () => {
  for (const brand of ["magical", "sweatspot"]) {
    it(`${brand}: 999 conserva tarifa habitual`, () => {
      expect(getOrderCommissionRate(order({ brand, quantity: 999 }), context)).toBe(0.10);
    });
    for (const quantity of [1000, 1001]) it(`${brand}: ${quantity} reemplaza tarifa por 5%`, () => {
      expect(getOrderCommissionRate(order({ brand, quantity }), context)).toBe(0.05);
    });
  }
  for (const [quantity, rate] of [[999, 0.10], [1000, 0.10], [1001, 0.075], [2000, 0.075]]) {
    it(`Valentina Sweatspot ${quantity}: ${rate}`, () => {
      expect(getOrderCommissionRate(order({ brand: "sweatspot", advisor_id: VALENTINA_ADVISOR_ID, quantity }), context)).toBe(rate);
    });
  }
  it("nombre coincidente con otro ID no recibe excepción", () => {
    expect(getOrderCommissionRate(order({ brand: "sweatspot", advisor_name: "valemendoza", quantity: 1001 }), context)).toBe(0.05);
  });
  it("Valentina Magical sigue política general", () => {
    expect(getOrderCommissionRate(order({ advisor_id: VALENTINA_ADVISOR_ID }), context)).toBe(0.05);
    expect(getOrderCommissionRate(order({ advisor_id: VALENTINA_ADVISOR_ID, quantity: 999, is_recompra: true }), { ...context, clientKind: "recompra" })).toBe(0.06);
  });
  it("ID sigue funcionando aunque cambie el nombre", () => {
    expect(getOrderCommissionRate(order({ advisor_id: VALENTINA_ADVISOR_ID, advisor_name: "Nuevo nombre", brand: "sweatspot", quantity: 1001 }), context)).toBe(0.075);
  });
  it("volumen sustituye recompra, detal, contraentrega y fin de semana", () => {
    expect(getOrderCommissionRate(order(), { saleType: "menor", weekend: true, paymentMode: "contraentrega", clientKind: "recompra", weekendUnlocked: true })).toBe(0.05);
    expect(getOrderCommissionRate(order({ advisor_id: VALENTINA_ADVISOR_ID, brand: "sweatspot", quantity: 1001 }), { ...context, weekend: true, weekendUnlocked: true })).toBe(0.075);
  });
  it("tarifa y base coinciden en ventas, recaudo, liquidación y panel", () => {
    const o = order({ advisor_id: VALENTINA_ADVISOR_ID, brand: "sweatspot", quantity: 1001 });
    const sales = summarizeAdvisorMonth([o], {}, 2026, 9)[0];
    const accrual = summarizeMonthAccrual([o], {}, 2026, 9, o.advisor_id);
    const draft = buildSettlement({ orders: [o], payments: {}, advisorId: o.advisor_id, payPeriod: "2026-11" });
    const overview = buildCommissionOverview({ orders: [o], payments: {}, advisorId: o.advisor_id, period: "2026-10", settlements: [], items: [], payouts: [] });
    expect(sales.lines[0].ratePct).toBe(0.075);
    expect(accrual.rows[0].rate).toBe(0.075);
    expect(draft.current[0].amount).toBe(75000);
    expect(overview.rows[0].estimated).toBe(75000);
    expect(buildCommissionRows(sales.lines)[0]["% comisión"]).toBe("7,5%");
  });
  it("total después de descuento, flete incluido, cargos e IVA se descuentan una sola vez", () => {
    const o = order({ total_amount: 952000, abono: 952000, shipping_cost: 119000 });
    const draft = buildSettlement({ orders: [o], payments: {}, charges: { [o.id]: 119000 }, advisorId: o.advisor_id, payPeriod: "2026-11" });
    expect(draft.current[0].base).toBe(600000);
    expect(draft.current[0].amount).toBe(30000);
  });
  it("flete registrado aparte no se resta otra vez", () => {
    const o = order({ shipping_cost: 119000, shipping_set_at: "2026-10-05" } as Partial<Order>);
    expect(buildSettlement({ orders: [o], payments: {}, advisorId: o.advisor_id, payPeriod: "2026-11" }).current[0].amount).toBe(50000);
  });
});

describe("protección de liquidaciones históricas", () => {
  for (const status of ["pendiente_pago", "en_revision", "pago_registrado", "saldado"]) {
    it(`${status}: conserva aprobación y snapshot`, () => {
      expect(isSettlementSnapshotLocked({ status, approved_at: "2026-09-20" })).toBe(true);
      const o = order();
      const result = buildCommissionOverview({ orders: [o], payments: {}, advisorId: o.advisor_id, period: "2026-10",
        settlements: [{ id: "s1", advisor_id: o.advisor_id, status }],
        items: [{ id: "i1", settlement_id: "s1", order_id: o.id, base_amount: 800000, rate: 0.12, amount: 96000 }], payouts: [] });
      expect(result.rows[0].base).toBe(800000);
      expect(result.rows[0].rate).toBe(0.12);
      expect(result.rows[0].estimated).toBe(96000);
    });
  }
  it("borrador sin aprobación permite aprobar", () => {
    expect(isSettlementSnapshotLocked({ status: "pendiente_liquidacion", approved_at: null })).toBe(false);
  });
});