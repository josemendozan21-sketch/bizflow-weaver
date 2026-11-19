import { describe, it, expect } from "vitest";
import { fetchAllRows } from "../fetchAllRows";

// Simula el servidor: nunca devuelve más de 1000 filas por consulta.
function server(total: number) {
  const rows = Array.from({ length: total }, (_, i) => ({ id: i }));
  return async (from: number, to: number) => ({
    data: rows.slice(from, Math.min(to + 1, from + 1000)),
    error: null,
  });
}

describe("fetchAllRows", () => {
  it("trae los 1644 pedidos, no solo los primeros 1000", async () => {
    const rows = await fetchAllRows(server(1644));
    expect(rows).toHaveLength(1644);
    expect(rows[1643]).toEqual({ id: 1643 });
  });

  it("funciona con exactamente 1000 filas", async () => {
    expect(await fetchAllRows(server(1000))).toHaveLength(1000);
  });

  it("propaga el error del servidor", async () => {
    await expect(fetchAllRows(async () => ({ data: null, error: new Error("x") }))).rejects.toThrow("x");
  });
});
