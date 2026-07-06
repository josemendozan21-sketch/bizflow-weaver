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
  name: "get_production_tasks",
  title: "Tareas de producción",
  description: "Consulta tareas de producción activas (production_orders).",
  inputSchema: {
    brand: z.enum(["magical_warmers", "sweatspot"]).optional(),
    current_stage: z.string().optional().describe("estampacion, dosificacion, sellado, recorte, empaque, listo, etc."),
    stage_status: z.enum(["pendiente", "en_proceso", "completado"]).optional(),
    molde: z.string().optional().describe("Filtro por molde/referencia (parcial)"),
    limit: z.number().int().min(1).max(40).default(20),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (args, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    let q = sb(ctx)
      .from("production_orders")
      .select(
        "id, brand, client_name, quantity, current_stage, stage_status, workflow_type, molde, gel_color, ink_color, thermo_size, created_at, completed_at",
      )
      .order("created_at", { ascending: false })
      .limit(args.molde ? 500 : args.limit);
    if (args.brand) q = q.eq("brand", args.brand);
    if (args.current_stage) q = q.eq("current_stage", args.current_stage);
    if (args.stage_status) q = q.eq("stage_status", args.stage_status);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const tasks = (data ?? [])
      .filter((t: any) => (args.molde ? normalize(t.molde).includes(normalize(args.molde)) : true))
      .slice(0, args.limit);
    return {
      content: [{ type: "text", text: `Se encontraron ${tasks.length} tareas.` }],
      structuredContent: { count: tasks.length, tasks },
    };
  },
});
