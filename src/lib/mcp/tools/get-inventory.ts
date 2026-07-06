import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

function sb(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function normalize(v: unknown) {
  return String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export default defineTool({
  name: "get_inventory",
  title: "Consultar inventario",
  description: "Consulta existencias en stock_items por nombre, marca o categoría. Marca opcional bajo mínimo.",
  inputSchema: {
    query: z.string().optional().describe("Buscar por nombre (parcial)"),
    brand: z.enum(["magical_warmers", "sweatspot"]).optional(),
    category: z.string().optional().describe("p.ej. cuerpos_referencias, producto_terminado, materia_prima"),
    low_stock_only: z.boolean().default(false),
    limit: z.number().int().min(1).max(80).default(30),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (args, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    let q = sb(ctx)
      .from("stock_items")
      .select("name, brand, category, color, product_type, available, in_process, min_stock, unit")
      .order("name")
      .limit(args.query ? 500 : args.limit);
    if (args.brand) q = q.eq("brand", args.brand);
    if (args.category) q = q.eq("category", args.category);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    let items = (data ?? []).filter((i: any) => {
      if (!args.query) return true;
      return normalize(i.name).includes(normalize(args.query));
    });
    if (args.low_stock_only) {
      items = items.filter((i: any) => Number(i.available) <= Number(i.min_stock));
    }
    items = items.slice(0, args.limit);
    return {
      content: [{ type: "text", text: `Se encontraron ${items.length} items.` }],
      structuredContent: { count: items.length, items },
    };
  },
});
