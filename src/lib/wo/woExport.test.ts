import { describe, it, expect } from "vitest";
import { buildInvoices, matchWoProduct, normalizeId, classifyPayment, type WoSettings, type WoOrder } from "./woExport";

const S: WoSettings = { empresa: "BIONOVATIONS SAS", prefijo: "FEVC", bodega: "Principal", credito_name: "Crédito", contado_name: "Contado", transfer_payment_name: "Bancolombia 68", cash_payment_name: "Caja General" };
const base: WoOrder = {
  id: "o1", order_code: "MW-AM-1", created_at: "2026-10-27T15:00:00Z", client_name: "X", client_nit: "1019048349",
  product: "Muela (Frío)", quantity: 100, unit_price: 1190, subtotal_amount: 119000, total_amount: 119000,
  paid_amount: 59500, payment_method: null, advisor_id: "a", advisor_name: "Ángela", delivery_date: "2026-11-10",
};

describe("exportación WO", () => {
  it("pago parcial factura el 100% a Crédito con vencimiento en la fecha de despacho", () => {
    const [i] = buildInvoices([base], S, { a: "1019048349" });
    expect(i.headerPayment).toBe("Crédito");
    expect(i.dueDate).toBe("2026-11-10");
    expect(i.total).toBe(119000);
    expect(i.payments).toEqual([{ name: "Bancolombia 68", value: 59500 }]);
  });
  it("pago total es Contado", () => {
    const [i] = buildInvoices([{ ...base, paid_amount: 119000 }], S, { a: "1" });
    expect(i.headerPayment).toBe("Contado");
  });
  it("valor unitario antes de IVA 19%", () => {
    const [i] = buildInvoices([base], S, { a: "1" });
    expect(i.lines[0].unitValue).toBe(1000);
    expect(i.lines[0].code).toBe("MW-Muela");
  });
  it("efectivo va a Caja General", () => {
    expect(classifyPayment(["Efectivo"])).toBe("cash");
    expect(classifyPayment([null])).toBe("transfer");
    expect(classifyPayment(["mercadopago"])).toBe("unknown");
  });
  it("marca faltantes: asesor sin cédula y crédito sin fecha de despacho", () => {
    const [i] = buildInvoices([{ ...base, delivery_date: null }], S, {});
    expect(i.missing.some((m) => m.includes("asesor"))).toBe(true);
    expect(i.missing.some((m) => m.includes("despacho"))).toBe(true);
  });
  it("normaliza NIT y empareja térmicos", () => {
    expect(normalizeId("Nit 901.960.350-1")).toBe("901960350");
    expect(matchWoProduct("Shoulder (Térmico)")?.code).toBe("MW-MW-Shoulder");
  });
});
