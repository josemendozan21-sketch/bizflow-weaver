import { describe, it, expect } from "vitest";
import { parseCOP, cashAlertState } from "@/lib/money";

describe("parseCOP", () => {
  it("el punto es separador de miles", () => {
    expect(parseCOP("24.100")).toBe(24100);
    expect(parseCOP("1.234.567")).toBe(1234567);
  });
  it("sin separadores", () => expect(parseCOP("215400")).toBe(215400));
  it("con signo de pesos", () => expect(parseCOP("$24.100")).toBe(24100));
});

describe("límites de caja", () => {
  it("$400.000 o más genera alerta de custodia", () => {
    expect(cashAlertState(400000, 200000, 400000)).toBe("max");
  });
  it("menos de $200.000 genera alerta de mínimo", () => {
    expect(cashAlertState(199999, 200000, 400000)).toBe("min");
  });
  it("$200.000 exactos no genera alerta", () => {
    expect(cashAlertState(200000, 200000, 400000)).toBe("ok");
  });
});
