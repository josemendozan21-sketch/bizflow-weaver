import { describe, expect, it, vi } from "vitest";
import { buildWebCatalog, createCatalogHandler, type CatalogStock } from "../../../supabase/functions/receive-bionovations-catalog/catalog";

const stock = (name: string, category = "materia_prima", product_type: string | null = null, brand = "magical"): CatalogStock => ({ name, category, product_type, brand });

describe("Bionovations read-only catalog", () => {
  it("strips inventory prefixes including PVC as in Ventas", () => {
    const result = buildWebCatalog([stock("Tinta PVC Azul"), stock("Tinta Azul"), stock("Colorante Verde"), stock("Escarcha Dorada"), stock("Tinta Rojo", "producto_terminado")]);
    expect(result.inks).toEqual(["Azul"]);
    expect(result.gels).toEqual(["Verde"]);
    expect(result.glitters).toEqual(["Dorada"]);
  });
  it("merges Magical reference types from finished products and bodies without requiring stock", () => {
    const result = buildWebCatalog([
      stock("Antifaz (Frío)", "cuerpos_referencias"),
      stock("Antifaz", "producto_terminado", "Calor"),
      stock("Antifaz", "producto_terminado", "Frio"),
      stock("Gel", "materia_prima"),
      stock("Otro", "producto_terminado", "Frío", "sweatspot"),
    ]);
    expect(result.references).toEqual([{ name: "Antifaz", types: ["Frío", "Térmico"] }]);
  });
  it("requires x-webhook-token before reading inventory", async () => {
    const readStock = vi.fn(async () => []);
    const handler = createCatalogHandler({ token: "test-only", headers: {}, readStock });
    for (const headers of [{}, { "x-webhook-token": "incorrect" }]) {
      expect((await handler(new Request("https://example.test", { headers }))).status).toBe(401);
    }
    expect(readStock).not.toHaveBeenCalled();
  });
  it("accepts authorized GET and returns only the requested catalog fields", async () => {
    const handler = createCatalogHandler({ token: "test-only", headers: {}, readStock: async () => [stock("Colorante Verde")] });
    const response = await handler(new Request("https://example.test", { headers: { "x-webhook-token": "test-only" } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ inks: [], gels: ["Verde"], glitters: [], references: [] });
  });
  it("rejects every write method without reading inventory", async () => {
    const readStock = vi.fn(async () => []);
    const handler = createCatalogHandler({ token: "test-only", headers: {}, readStock });
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      expect((await handler(new Request("https://example.test", { method, headers: { "x-webhook-token": "test-only" } }))).status).toBe(405);
    }
    expect(readStock).not.toHaveBeenCalled();
  });
});