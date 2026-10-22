import { describe, it, expect } from "vitest";
import { discountedUnit, saleTotal } from "../posDiscount";

describe("descuento por producto Punto 92", () => {
  it("termo $50.000 al 20% + juguetón $40.000 = $80.000", () => {
    expect(saleTotal([{ unit: discountedUnit(50000, 20), qty: 1 }, { unit: 40000, qty: 1 }], 10000, true)).toBe(80000);
  });
  it("termo $50.000 al 50% + $57.000 + $70.000 = $152.000", () => {
    expect(saleTotal([{ unit: discountedUnit(50000, 50), qty: 1 }, { unit: 57000, qty: 1 }, { unit: 70000, qty: 1 }], 25000, true)).toBe(152000);
  });
  it("50% sobre $25.000 da $12.500, nunca $0", () => {
    expect(saleTotal([{ unit: discountedUnit(25000, 50), qty: 1 }], 12500, true)).toBe(12500);
  });
  it("sin descuento no genera centavos", () => {
    expect(saleTotal([{ unit: 44999.85, qty: 1 }])).toBe(45000);
  });
});
