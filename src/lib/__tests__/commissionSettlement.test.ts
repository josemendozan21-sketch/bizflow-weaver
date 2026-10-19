import { describe, it, expect } from "vitest";
import { buildSettlement, getCompletionDate } from "@/lib/commissionSettlement";
import type { Order } from "@/hooks/useOrders";

const base = (over: Partial<Order>): Order =>
  ({
    id: "o1",
    advisor_id: "a1",
    advisor_name: "Asesor",
    brand: "magical",
    sale_type: "mayor",
    client_name: "C",
    product: "P",
    quantity: 1,
    total_amount: 1_190_000,
    abono: 1_190_000,
    payment_complete: true,
    payment_proof_url: "x",
    dispatched_at: "2026-10-20T10:00:00",
    created_at: "2026-10-05T10:00:00",
    production_status: "despachado",
    invoice_status: "pendiente",
    is_recompra: false,
    returned_at: null,
    shipping_cost: 0,
    ...over,
  }) as Order;

describe("liquidación de comisiones", () => {
  it("sin despacho el pedido no está al 100% y no se liquida", () => {
    const o = base({ dispatched_at: null });
    expect(getCompletionDate(o, {})).toBeNull();
    const s = buildSettlement({ orders: [o], payments: {}, advisorId: "a1", payPeriod: "2026-11" });
    expect(s.current).toHaveLength(0);
    expect(s.pending).toHaveLength(1);
  });

  it("sin pago total no se liquida (no hay comisión por abono)", () => {
    const o = base({ payment_complete: false, abono: 500_000 });
    const s = buildSettlement({ orders: [o], payments: {}, advisorId: "a1", payPeriod: "2026-11" });
    expect(s.current).toHaveLength(0);
  });

  it("lo completado en octubre se paga en noviembre", () => {
    const s = buildSettlement({ orders: [base({})], payments: {}, advisorId: "a1", payPeriod: "2026-11" });
    expect(s.current).toHaveLength(1);
    expect(s.current[0].causationPeriod).toBe("2026-10");
    expect(s.current[0].expectedPayPeriod).toBe("2026-11");
    const oct = buildSettlement({ orders: [base({})], payments: {}, advisorId: "a1", payPeriod: "2026-10" });
    expect(oct.current).toHaveLength(0);
  });

  it("el mes es el de la fecha en que quedó al 100%, no el de venta", () => {
    const o = base({ created_at: "2026-10-30T10:00:00", dispatched_at: "2026-11-03T10:00:00" });
    expect(buildSettlement({ orders: [o], payments: {}, advisorId: "a1", payPeriod: "2026-11" }).current).toHaveLength(0);
    expect(buildSettlement({ orders: [o], payments: {}, advisorId: "a1", payPeriod: "2026-12" }).current).toHaveLength(1);
  });

  it("un pedido no liquidado de un mes anterior llega como pendiente anterior, y no se repite si ya fue liquidado", () => {
    const o = base({});
    const dec = buildSettlement({ orders: [o], payments: {}, advisorId: "a1", payPeriod: "2026-12" });
    expect(dec.carryover).toHaveLength(1);
    expect(dec.carryover[0].causationPeriod).toBe("2026-10");
    const again = buildSettlement({ orders: [o], payments: {}, advisorId: "a1", payPeriod: "2026-12", settledOrderIds: new Set(["o1"]) });
    expect(again.carryover).toHaveLength(0);
    expect(again.total).toBe(0);
  });

  it("bono de $150.000 desde $10M completados en el mes", () => {
    const o = base({ total_amount: 10_000_000, abono: 10_000_000 });
    const s = buildSettlement({ orders: [o], payments: {}, advisorId: "a1", payPeriod: "2026-11" });
    expect(s.bonus).toBe(150_000);
  });
});
