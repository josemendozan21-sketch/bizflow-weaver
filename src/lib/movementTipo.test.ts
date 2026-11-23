import { describe, expect, it } from "vitest";
import { movementTipo, stripTipoSuffix } from "./movementTipo";

describe("movementTipo", () => {
  it("salida de cuerpo sin sufijo toma el tipo de la referencia", () => {
    expect(movementTipo({ item_name: "Pocket", stock_item: { product_type: "Frío" } })).toBe("Frío");
    expect(movementTipo({ item_name: "Handy", stock_item: { product_type: "Térmico" } })).toBe("Térmico");
  });
  it("entrada con sufijo en el nombre usa ese tipo", () => {
    expect(movementTipo({ item_name: "Muela (Frío)", stock_item: null })).toBe("Frío");
    expect(movementTipo({ item_name: "Handy (Calor)" })).toBe("Térmico");
  });
  it("sin tipo conocido no inventa uno", () => {
    expect(movementTipo({ item_name: "TERMO NEGRO 500", stock_item: { product_type: null } })).toBeNull();
  });
  it("quita el sufijo del nombre", () => {
    expect(stripTipoSuffix("Gafas pequeñas (Frío)")).toBe("Gafas pequeñas");
  });
});
