import { describe, it, expect } from "vitest";
import { exchangeSummary, returnableQty, isWithinExchangeWindow } from "../posExchange";

describe("cambio de prendas POS", () => {
  it("cliente paga solo la diferencia cuando lo nuevo vale más", () => {
    const s = exchangeSummary([{ quantity: 1, unit_price: 569000 }], [{ quantity: 1, unit_price: 569800 }]);
    expect(s.difference).toBe(800);
    expect(s.kind).toBe("cobro");
  });
  it("mismo valor no genera cobro", () => {
    expect(exchangeSummary([{ quantity: 2, unit_price: 50000 }], [{ quantity: 1, unit_price: 100000 }]).kind).toBe("sin_diferencia");
  });
  it("nunca se devuelve dinero: si lo nuevo vale menos, falta por elegir", () => {
    const s = exchangeSummary([{ quantity: 1, unit_price: 100000 }], [{ quantity: 1, unit_price: 60000 }]);
    expect(s.difference).toBe(-40000);
    expect(s.kind).toBe("falta");
  });
  it("no deja devolver más de lo vendido descontando cambios anteriores", () => {
    expect(returnableQty(3, 2)).toBe(1);
    expect(returnableQty(2, 2)).toBe(0);
  });
  it("permite el cambio hasta el último día del mes de la compra (hora Bogotá)", () => {
    // Venta 3-nov, hoy 30-nov 23:00 Bogotá (1-dic 04:00 UTC)
    expect(isWithinExchangeWindow("2026-11-03T15:00:00Z", new Date("2026-12-01T04:00:00Z"))).toBe(true);
  });
  it("no permite el cambio después de terminar el mes de la compra", () => {
    expect(isWithinExchangeWindow("2026-10-31T15:00:00Z", new Date("2026-11-01T15:00:00Z"))).toBe(false);
  });
});
