import { describe, it, expect } from "vitest";
import { validatePosExit } from "./posExit";
describe("validatePosExit", () => {
  it("no deja sacar más de lo disponible", () => {
    expect(validatePosExit({ quantity: 6, available: 5, reason: "devolucion_bodega" })).not.toBeNull();
    expect(validatePosExit({ quantity: 5, available: 5, reason: "devolucion_bodega" })).toBeNull();
  });
  it("exige motivo", () => {
    expect(validatePosExit({ quantity: 1, available: 5, reason: "" })).not.toBeNull();
  });
  it("exige nota en producto dañado y muestra", () => {
    expect(validatePosExit({ quantity: 1, available: 5, reason: "producto_danado" })).not.toBeNull();
    expect(validatePosExit({ quantity: 1, available: 5, reason: "muestra_regalo", notes: "cliente X" })).toBeNull();
  });
});
