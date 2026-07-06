import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

function sb(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_advisor_summary",
  title: "Resumen por asesor",
  description: "Resumen de ventas por asesor: pedidos, total vendido, cobrado y pendiente.",
  inputSchema: {
    advisor: z.string().optional().describe("Nombre del asesor (parcial)"),
    since: z.string().optional().describe("Fecha inicio ISO YYYY-MM-DD"),
    until: z.string().optional().describe("Fecha fin ISO YYYY-MM-DD"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (args, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    let q = sb(ctx)
      .from("orders")
      .select(
        "advisor_name, total_amount, abono, payment_complete, payment_method, sale_type, payment_proof_url, created_at",
      );
    if (args.advisor) q = q.ilike("advisor_name", `%${args.advisor}%`);
    if (args.since) q = q.gte("created_at", args.since);
    if (args.until) q = q.lte("created_at", args.until);
    const { data, error } = await q.limit(2000);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const map = new Map<string, { advisor: string; orders: number; total: number; cobrado: number; pendiente: number }>();
    for (const o of data ?? []) {
      const k = (o as any).advisor_name ?? "—";
      const cur = map.get(k) ?? { advisor: k, orders: 0, total: 0, cobrado: 0, pendiente: 0 };
      const total = Number((o as any).total_amount) || 0;
      const paid =
        (o as any).payment_complete ||
        (o as any).payment_method === "pagado" ||
        (o as any).payment_method === "obsequio" ||
        ((o as any).sale_type === "menor" && (o as any).payment_proof_url)
          ? total
          : Math.min(Number((o as any).abono) || 0, total);
      cur.orders += 1;
      cur.total += total;
      cur.cobrado += paid;
      cur.pendiente += Math.max(total - paid, 0);
      map.set(k, cur);
    }
    const summary = Array.from(map.values()).sort((a, b) => b.total - a.total);
    return {
      content: [{ type: "text", text: `Resumen para ${summary.length} asesor(es).` }],
      structuredContent: { summary },
    };
  },
});
