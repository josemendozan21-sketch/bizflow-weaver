import { describe, it, expect, vi } from "vitest";

// Base simulada: pedidos (con su envío) y solicitudes de Diseño.
const orders = [
  { id: "a1", submission_id: "S1" }, // línea con logo ajustado (sin aprobar)
  { id: "a2", submission_id: "S1" }, // otra línea del mismo envío, sin solicitud propia
  { id: "b1", submission_id: null }, // logo aprobado
  { id: "c1", submission_id: null }, // sin solicitud de logo
];
const logos = [
  { order_id: "a1", status: "ajustado" },
  { order_id: "b1", status: "aprobado" },
];

vi.mock("@/integrations/supabase/client", () => {
  const query = (table: string) => {
    let rows: any[] = table === "orders" ? orders : logos;
    const q: any = {
      select: () => q,
      in: (col: string, vals: string[]) => { rows = rows.filter((r) => vals.includes(r[col])); return q; },
      not: (_c: string, _op: string, list: string) => {
        const excl = list.replace(/[()]/g, "").split(",");
        rows = rows.filter((r) => !excl.includes(r.status));
        return q;
      },
      then: (res: any) => res({ data: rows, error: null }),
    };
    return q;
  };
  return { supabase: { from: query } };
});

import { fetchLogoPendingByOrder, assertLogoApproved } from "../logoPending";

describe("logo sin aprobar bloquea la entrada a Producción", () => {
  it("bloquea el pedido cuyo logo está ajustado y aún no aprobado", async () => {
    const map = await fetchLogoPendingByOrder(["a1"]);
    expect(map.get("a1")).toBe("ajustado");
  });

  it("bloquea también las otras líneas del mismo envío", async () => {
    const map = await fetchLogoPendingByOrder(["a2"]);
    expect(map.get("a2")).toBe("ajustado");
  });

  it("no bloquea pedidos con logo aprobado ni sin solicitud de logo", async () => {
    const map = await fetchLogoPendingByOrder(["b1", "c1"]);
    expect(map.has("b1")).toBe(false);
    expect(map.has("c1")).toBe(false);
  });

  it("frena la entrega antes de mover inventario si el logo no está aprobado", async () => {
    await expect(assertLogoApproved("a1")).rejects.toThrow("aprueben el logo");
    await expect(assertLogoApproved("b1")).resolves.toBeUndefined();
  });
});
