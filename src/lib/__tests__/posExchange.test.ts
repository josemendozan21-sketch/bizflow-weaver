import { describe, it, expect } from "vitest";
import { exchangeSummary, returnableQty } from "../posExchange";

describe("cambio de prendas POS", () => {
  it("cliente paga solo la diferencia cuando lo nuevo vale más", () => {
    const s = exchangeSummary([{ quantity: 1, unit_price: 569000 }], [{ quantity: 1, unit_price: 569800 }]);
    expect(s.difference).toBe(800);
    expect(s.kind).toBe("cobro");
  });
  it("mismo valor no genera cobro", () => {
    expect(exchangeSummary([{ quantity: 2, unit_price: 50000 }], [{ quantity: 1, unit_price: 100000 }]).kind).toBe("sin_diferencia");
  });
  it("sobra a favor del cliente cuando lo nuevo vale menos", () => {
    const s = exchangeSummary([{ quantity: 1, unit_price: 100000 }], [{ quantity: 1, unit_price: 60000 }]);
    expect(s.difference).toBe(-40000);
    expect(s.kind).toBe("a_favor");
  });
  it("no deja devolver más de lo vendido descontando cambios anteriores", () => {
    expect(returnableQty(3, 2)).toBe(1);
    expect(returnableQty(2, 2)).toBe(0);
  });
});
