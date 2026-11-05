import { describe, it, expect } from "vitest";
import { canInvoiceOrder } from "../invoiceRules";

describe("canInvoiceOrder", () => {
  it("permite facturar contraentrega despachada al detal sin pago completo", () => {
    expect(canInvoiceOrder({ sale_type: "menor", payment_method: "contra_entrega", production_status: "despachado" }, false)).toBe(true);
  });
  it("sigue bloqueando ventas al detal no contraentrega sin pago completo", () => {
    expect(canInvoiceOrder({ sale_type: "menor", payment_method: "pagado", production_status: "despachado" }, false)).toBe(false);
  });
  it("bloquea contraentrega aún no despachada", () => {
    expect(canInvoiceOrder({ sale_type: "menor", payment_method: "contra_entrega", production_status: "listo" }, false)).toBe(false);
  });
});
