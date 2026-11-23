import { describe, it, expect } from "vitest";
import { feriaSent, feriaStockRow } from "./feriaStock";

describe("inventario enviado a feria", () => {
  it("lo asignado sin salida no cuenta como enviado", () => {
    expect(feriaSent({ quantity_assigned: 722, quantity_dispatched: 0 })).toBe(0);
  });

  it("solo cuenta la salida real, no lo asignado", () => {
    expect(feriaSent({ quantity_assigned: 50, quantity_dispatched: 10 })).toBe(10);
  });

  it("una referencia solo planeada no tiene movimiento", () => {
    expect(feriaStockRow({ quantity_assigned: 40, quantity_dispatched: 0 }, 0).hasMovement).toBe(false);
  });

  it("disponible = enviado - vendido - retornado", () => {
    expect(feriaStockRow({ quantity_dispatched: 10, quantity_returned: 2 }, 3).available).toBe(5);
  });
});
