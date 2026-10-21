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
  it("pagado al 100% con comprobante y sin despacho sí se liquida", () => {
    const o = base({ dispatched_at: null });
    const pays = { o1: [{ order_id: "o1", amount: 1190000, payment_date: "2026-10-15" }] };
    const s = buildSettlement({ orders: [o], payments: pays, advisorId: "a1", payPeriod: "2026-11" });
    expect(s.current).toHaveLength(1);
  });

  it("sin comprobante de pago no se liquida", () => {
    const o = base({ payment_proof_url: null });
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
    const o = base({ created_at: "2026-10-30T10:00:00", dispatched_at: null });
    const p = { o1: [{ order_id: "o1", amount: 1190000, payment_date: "2026-11-03" }] };
    expect(buildSettlement({ orders: [o], payments: p, advisorId: "a1", payPeriod: "2026-11" }).current).toHaveLength(0);
    expect(buildSettlement({ orders: [o], payments: p, advisorId: "a1", payPeriod: "2026-12" }).current).toHaveLength(1);
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

  it("el saldo cargado por la corrección del 3-sep no mueve el mes de la comisión", () => {
    const o = base({ dispatched_at: "2026-07-10T10:00:00", created_at: "2026-07-01T10:00:00" });
    const pays = { o1: [{ order_id: "o1", amount: 500000, payment_date: "2026-09-03", notes: "Saldo final confirmado por el asesor (corrección automática 2026-09-03)" }] };
    expect(getCompletionDate(o, pays)?.getMonth()).toBe(6);
  });
});

import { summarizeSettlement } from "@/lib/commissionSettlement";

describe("contraentrega", () => {
  const pays = { o1: [{ order_id: "o1", amount: 1190000, payment_date: "2026-10-15", proof_url: "p" }] };
  const cod = (over: Partial<Order>) => base({ payment_method: "contra_entrega", ...over } as Partial<Order>);

  it("pendiente de confirmar no suma y dice por qué", () => {
    const s = buildSettlement({ orders: [cod({ cod_confirmation: "pendiente" } as any)], payments: pays, advisorId: "a1", payPeriod: "2026-11" });
    expect(s.current).toHaveLength(0);
    expect(s.pending[0].reason).toBe("Falta confirmar entrega contraentrega");
  });

  it("no cobrada no suma y muestra el motivo", () => {
    const s = buildSettlement({ orders: [cod({ cod_confirmation: "no_cobrado", cod_reason: "Devolución" } as any)], payments: pays, advisorId: "a1", payPeriod: "2026-11" });
    expect(s.current).toHaveLength(0);
    expect(s.pending[0].reason).toBe("No suma: contraentrega no cobrada — Devolución");
  });

  it("cobrada suma en el mes de la confirmación", () => {
    const o = cod({ cod_confirmation: "cobrado", cod_confirmed_at: "2026-11-03T10:00:00" } as any);
    expect(buildSettlement({ orders: [o], payments: pays, advisorId: "a1", payPeriod: "2026-11" }).current).toHaveLength(0);
    expect(buildSettlement({ orders: [o], payments: pays, advisorId: "a1", payPeriod: "2026-12" }).current).toHaveLength(1);
  });

  it("un contraentrega anterior a la regla (sin estado) sigue sumando con la regla general", () => {
    const o = cod({});
    const s = buildSettlement({ orders: [o], payments: pays, advisorId: "a1", payPeriod: "2026-11" });
    expect(s.current).toHaveLength(1);
    expect(s.pending).toHaveLength(0);
    expect(getCompletionDate(o, pays)?.getMonth()).toBe(9);
  });
});

describe("resumen simple", () => {
  it("a pagar = comisión + bono, en pesos enteros", () => {
    const s = summarizeSettlement({ payPeriod: "2026-11", causationPeriod: "2026-10", current: [], carryover: [], pending: [],
      currentAmount: 1521228.4, carryoverAmount: 0, completedTotal: 12_000_000, bonus: 250000, total: 0 });
    expect(s.aPagar).toBe(1771228);
    expect(s.proximaMeta?.falta).toBe(6_000_000);
  });
});

import { scheduledPayDate } from "@/lib/commissionSettlement";
describe("scheduledPayDate", () => {
  it("usa el 20 si es miércoles o viernes", () => {
    expect(scheduledPayDate("2026-11-20".slice(0, 7)).getDate()).toBe(20); // vie 20 nov 2026
  });
  it("si el 20 no es miércoles ni viernes, pasa al siguiente", () => {
    // 20 oct 2026 es martes → miércoles 21
    expect(scheduledPayDate("2026-10").getDate()).toBe(21);
    // 20 dic 2026 es domingo → miércoles 23
    expect(scheduledPayDate("2026-12").getDate()).toBe(23);
  });
});
