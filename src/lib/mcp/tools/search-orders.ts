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
function matches(field: unknown, search?: string) {
  if (!search) return true;
  const h = normalize(field);
  return normalize(search).split(/\s+/).filter(Boolean).every((t) => h.includes(t));
}

export default defineTool({
  name: "search_orders",
  title: "Buscar pedidos",
  description:
    "Busca pedidos de Bionovations por cliente, producto, estado de producción, marca o asesor. Devuelve datos filtrados por los permisos (RLS) del usuario.",
  inputSchema: {
    client: z.string().optional().describe("Nombre del cliente (búsqueda parcial, sin tildes)"),
    product: z.string().optional().describe("Nombre del producto (búsqueda parcial)"),
    production_status: z
      .enum([
        "pendiente","diseno","produccion_cuerpos","estampacion","dosificacion",
        "sellado","recorte","empaque","listo","despachado","entregado",
      ])
      .optional(),
    brand: z.enum(["magical_warmers", "sweatspot"]).optional(),
    advisor: z.string().optional().describe("Nombre del asesor"),
    limit: z.number().int().min(1).max(30).default(15),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (args, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    const hasText = Boolean(args.client || args.product || args.advisor);
    let q = sb(ctx)
      .from("orders")
      .select(
        "id, brand, client_name, product, quantity, total_amount, abono, payment_complete, production_status, advisor_name, created_at, delivery_date, dispatched_at, transportadora, numero_guia, invoice_number, invoice_status, sale_type",
      )
      .order("created_at", { ascending: false })
      .limit(hasText ? 500 : args.limit);
    if (args.production_status) q = q.eq("production_status", args.production_status);
    if (args.brand) q = q.eq("brand", args.brand);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const orders = (data ?? [])
      .filter((o: any) => matches(o.client_name, args.client))
      .filter((o: any) => matches(o.product, args.product))
      .filter((o: any) => matches(o.advisor_name, args.advisor))
      .slice(0, args.limit);
    return {
      content: [{ type: "text", text: `Se encontraron ${orders.length} pedidos.` }],
      structuredContent: { count: orders.length, orders },
    };
  },
});
