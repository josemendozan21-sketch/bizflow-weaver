import { describe, it, expect } from "vitest";
import { validatePosExit, validatePosExitBatch } from "./posExit";

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
  it("acepta el motivo José Mendoza sin exigir nota", () => {
    expect(validatePosExit({ quantity: 2, available: 5, reason: "entrega_jose_mendoza" })).toBeNull();
    expect(validatePosExit({ quantity: 6, available: 5, reason: "entrega_jose_mendoza" })).not.toBeNull();
  });
});

describe("validatePosExitBatch", () => {
  const stock = { a: 10, b: 3 };
  const names = { a: "Termo 150 Negro", b: "Gafas grandes" };

  it("registra varios productos juntos con un solo motivo", () => {
    expect(
      validatePosExitBatch({
        lines: [
          { product_id: "a", quantity: 4 },
          { product_id: "b", quantity: 3 },
        ],
        availableById: stock,
        nameById: names,
        reason: "devolucion_bodega",
      })
    ).toBeNull();
  });

  it("exige al menos un producto", () => {
    expect(
      validatePosExitBatch({ lines: [], availableById: stock, nameById: names, reason: "devolucion_bodega" })
    ).not.toBeNull();
  });

  it("suma las repeticiones del mismo producto y no deja pasarse", () => {
    expect(
      validatePosExitBatch({
        lines: [
          { product_id: "a", quantity: 6 },
          { product_id: "a", quantity: 4 },
        ],
        availableById: stock,
        nameById: names,
        reason: "devolucion_bodega",
      })
    ).toBeNull();
    expect(
      validatePosExitBatch({
        lines: [
          { product_id: "a", quantity: 6 },
          { product_id: "a", quantity: 5 },
        ],
        availableById: stock,
        nameById: names,
        reason: "devolucion_bodega",
      })
    ).not.toBeNull();
  });

  it("dice qué referencia se pasó, por nombre", () => {
    const err = validatePosExitBatch({
      lines: [
        { product_id: "a", quantity: 2 },
        { product_id: "b", quantity: 9 },
      ],
      availableById: stock,
      nameById: names,
      reason: "devolucion_bodega",
    });
    expect(err).toContain("Gafas grandes");
    expect(err).toContain("Solo hay 3 unidades disponibles");
  });

  it("exige nota en producto dañado para toda la salida", () => {
    expect(
      validatePosExitBatch({
        lines: [{ product_id: "a", quantity: 1 }],
        availableById: stock,
        nameById: names,
        reason: "producto_danado",
      })
    ).not.toBeNull();
    expect(
      validatePosExitBatch({
        lines: [{ product_id: "a", quantity: 1 }],
        availableById: stock,
        nameById: names,
        reason: "producto_danado",
        notes: "caída en transporte",
      })
    ).toBeNull();
  });

  it("rechaza filas sin producto o con cantidad inválida", () => {
    expect(
      validatePosExitBatch({
        lines: [{ product_id: "a", quantity: 1 }, { product_id: "", quantity: 2 }],
        availableById: stock,
        nameById: names,
        reason: "devolucion_bodega",
      })
    ).not.toBeNull();
    expect(
      validatePosExitBatch({
        lines: [{ product_id: "a", quantity: 0 }],
        availableById: stock,
        nameById: names,
        reason: "devolucion_bodega",
      })
    ).not.toBeNull();
    expect(
      validatePosExitBatch({
        lines: [{ product_id: "a", quantity: 1.5 }],
        availableById: stock,
        nameById: names,
        reason: "devolucion_bodega",
      })
    ).not.toBeNull();
  });
});
