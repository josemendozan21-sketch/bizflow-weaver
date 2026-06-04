import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_calls?: any;
  tool_call_id?: string;
  name?: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

function jres(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function textMatches(field: unknown, search: unknown): boolean {
  const haystack = normalizeText(field);
  const needle = normalizeText(search);
  if (!needle) return true;
  return needle
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

const tools = [
  {
    type: "function",
    function: {
      name: "search_orders",
      description:
        "Busca pedidos por cliente, producto, estado de producción, marca o asesor. Devuelve resumen de cada pedido (cliente, producto, cantidad, marca, estado, fecha, asesor, despacho, factura).",
      parameters: {
        type: "object",
        properties: {
          client: { type: "string", description: "Filtro por nombre de cliente (ilike)" },
          product: { type: "string", description: "Filtro por nombre de producto (ilike)" },
          production_status: {
            type: "string",
            description:
              "Estado: pendiente, diseno, produccion_cuerpos, estampacion, dosificacion, sellado, recorte, empaque, listo, despachado, entregado",
          },
          brand: { type: "string", description: "magical_warmers o sweatspot" },
          advisor: { type: "string", description: "Nombre del asesor (ilike)" },
          limit: { type: "number", description: "Máx resultados (default 15)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_inventory",
      description:
        "Consulta inventario (stock_items): existencias por nombre, marca, categoría. Devuelve nombre, marca, categoría, color, disponible, en_proceso, min_stock.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Buscar por nombre (ilike)" },
          brand: { type: "string", description: "magical_warmers o sweatspot" },
          category: { type: "string", description: "p.ej. cuerpos_referencias, producto_terminado, materia_prima" },
          low_stock_only: { type: "boolean", description: "Solo items con available <= min_stock" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_production_tasks",
      description: "Consulta tareas de producción activas (production_orders).",
      parameters: {
        type: "object",
        properties: {
          brand: { type: "string" },
          current_stage: { type: "string", description: "estampacion, dosificacion, sellado, recorte, empaque, listo, etc." },
          stage_status: { type: "string", description: "pendiente, en_proceso, completado" },
          molde: { type: "string", description: "Filtro por molde/referencia (ilike)" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_advisor_summary",
      description:
        "Resumen de ventas por asesor: número de pedidos, total vendido, total cobrado, pendiente. Opcional filtro por asesor o rango de fechas.",
      parameters: {
        type: "object",
        properties: {
          advisor: { type: "string", description: "Nombre del asesor (ilike)" },
          since: { type: "string", description: "Fecha inicio ISO (YYYY-MM-DD)" },
          until: { type: "string", description: "Fecha fin ISO" },
        },
      },
    },
  },
];

async function runTool(
  name: string,
  args: any,
  ctx: { admin: ReturnType<typeof createClient>; userId: string; role: string; roles: string[]; advisorName: string | null },
): Promise<any> {
  const { admin, roles, userId } = ctx;
  const isAsesor = roles.length === 0 || (roles.includes("asesor_comercial") && !roles.some((r) => r !== "asesor_comercial"));

  if (name === "search_orders") {
    const requestedLimit = Math.min(args.limit ?? 15, 30);
    const hasTextFilters = Boolean(args.client || args.product || args.advisor);
    let q = admin.from("orders").select(
      "id, brand, client_name, product, quantity, total_amount, abono, payment_complete, production_status, advisor_name, created_at, delivery_date, dispatched_at, transportadora, numero_guia, invoice_number, invoice_status, sale_type",
    ).order("created_at", { ascending: false }).limit(hasTextFilters ? 500 : requestedLimit);
    if (isAsesor) q = q.eq("advisor_id", userId);
    if (args.production_status) q = q.eq("production_status", args.production_status);
    if (args.brand) q = q.eq("brand", args.brand);
    const { data, error } = await q;
    if (error) return { error: error.message };
    const orders = (data ?? [])
      .filter((o: any) => textMatches(o.client_name, args.client))
      .filter((o: any) => textMatches(o.product, args.product))
      .filter((o: any) => isAsesor || textMatches(o.advisor_name, args.advisor))
      .slice(0, requestedLimit);
    return { count: orders.length, orders };
  }

  if (name === "get_inventory") {
    const requestedLimit = Math.min(args.limit ?? 30, 80);
    let q = admin.from("stock_items").select("name, brand, category, color, product_type, available, in_process, min_stock, unit")
      .order("name").limit(args.query ? 500 : requestedLimit);
    if (args.brand) q = q.eq("brand", args.brand);
    if (args.category) q = q.eq("category", args.category);
    const { data, error } = await q;
    if (error) return { error: error.message };
    let items = (data ?? []).filter((i: any) => textMatches(i.name, args.query));
    if (args.low_stock_only) items = items.filter((i: any) => Number(i.available) <= Number(i.min_stock));
    return { count: items.length, items: items.slice(0, requestedLimit) };
  }

  if (name === "get_production_tasks") {
    const requestedLimit = Math.min(args.limit ?? 20, 40);
    let q = admin.from("production_orders").select(
      "id, brand, client_name, quantity, current_stage, stage_status, workflow_type, molde, gel_color, ink_color, thermo_size, created_at, completed_at",
    ).order("created_at", { ascending: false }).limit(args.molde ? 500 : requestedLimit);
    if (isAsesor) q = q.eq("advisor_id", userId);
    if (args.brand) q = q.eq("brand", args.brand);
    if (args.current_stage) q = q.eq("current_stage", args.current_stage);
    if (args.stage_status) q = q.eq("stage_status", args.stage_status);
    const { data, error } = await q;
    if (error) return { error: error.message };
    const tasks = (data ?? []).filter((t: any) => textMatches(t.molde, args.molde)).slice(0, requestedLimit);
    return { count: tasks.length, tasks };
  }

  if (name === "get_advisor_summary") {
    let q = admin.from("orders").select("advisor_name, total_amount, abono, payment_complete, payment_method, sale_type, payment_proof_url, created_at");
    if (isAsesor) q = q.eq("advisor_id", userId);
    else if (args.advisor) q = q.ilike("advisor_name", `%${args.advisor}%`);
    if (args.since) q = q.gte("created_at", args.since);
    if (args.until) q = q.lte("created_at", args.until);
    const { data, error } = await q.limit(2000);
    if (error) return { error: error.message };
    const map = new Map<string, { advisor: string; orders: number; total: number; cobrado: number; pendiente: number }>();
    for (const o of data ?? []) {
      const k = o.advisor_name ?? "—";
      const cur = map.get(k) ?? { advisor: k, orders: 0, total: 0, cobrado: 0, pendiente: 0 };
      const total = Number(o.total_amount) || 0;
      const paid =
        o.payment_complete || o.payment_method === "pagado" || o.payment_method === "obsequio" || (o.sale_type === "menor" && o.payment_proof_url)
          ? total
          : Math.min(Number(o.abono) || 0, total);
      cur.orders += 1;
      cur.total += total;
      cur.cobrado += paid;
      cur.pendiente += Math.max(total - paid, 0);
      map.set(k, cur);
    }
    return { summary: Array.from(map.values()).sort((a, b) => b.total - a.total) };
  }

  return { error: `Tool desconocida: ${name}` };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return jres({ error: "unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return jres({ error: "unauthorized" }, 401);
    const userId = userData.user.id;

    const { data: roleRows } = await admin.from("user_roles").select("role").eq("user_id", userId);
    const roles = (roleRows ?? []).map((r: any) => String(r.role)).filter(Boolean);
    const role = roles.join(", ") || "asesor_comercial";
    const { data: profile } = await admin.from("profiles").select("full_name").eq("id", userId).maybeSingle();
    const advisorName = (profile as any)?.full_name ?? null;

    const { messages } = await req.json() as { messages: ChatMessage[] };
    if (!Array.isArray(messages)) return jres({ error: "messages requerido" }, 400);

    const today = new Date().toISOString().slice(0, 10);
    const system: ChatMessage = {
      role: "system",
      content: `Eres el asesor IA interno de Bionovations SAS (marcas Magical Warmers y Sweatspot). Ayudas al equipo a consultar pedidos, producción, inventarios y ventas por asesor.

Usuario actual: ${advisorName ?? "(sin nombre)"} (rol: ${role}, user_id: ${userId}). Fecha: ${today}.

Reglas:
- Usa las herramientas para responder con datos reales. No inventes.
- Si el usuario es asesor_comercial, los datos ya están filtrados a sus propios pedidos.
- Para ubicar pedidos por nombre, busca coincidencias parciales y acepta nombres sin tildes: "andres lopez" debe encontrar "Andrés López".
- Responde corto y claro en español, en formato útil (listas, tablas markdown).
- Si una búsqueda no devuelve resultados, dilo y sugiere ajustar filtros.
- Para "¿dónde está el pedido X?" busca por cliente o producto y reporta production_status, fecha, transportadora y guía si aplica.`,
    };

    const convo: any[] = [system, ...messages];

    for (let step = 0; step < 6; step++) {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: convo,
          tools,
        }),
      });
      if (!resp.ok) {
        if (resp.status === 429) return jres({ error: "Demasiadas solicitudes, intenta en unos segundos." }, 429);
        if (resp.status === 402) return jres({ error: "Créditos de IA agotados. Agrega créditos al workspace." }, 402);
        const t = await resp.text();
        console.error("AI error", resp.status, t);
        return jres({ error: "Error de IA" }, 500);
      }
      const data = await resp.json();
      const msg = data.choices?.[0]?.message;
      if (!msg) return jres({ error: "Sin respuesta" }, 500);

      if (msg.tool_calls?.length) {
        convo.push(msg);
        for (const tc of msg.tool_calls) {
          let args: any = {};
          try { args = JSON.parse(tc.function.arguments || "{}"); } catch {}
          const result = await runTool(tc.function.name, args, { admin, userId, role, roles, advisorName });
          convo.push({
            role: "tool",
            tool_call_id: tc.id,
            name: tc.function.name,
            content: JSON.stringify(result),
          });
        }
        continue;
      }

      return jres({ reply: msg.content ?? "" });
    }
    return jres({ reply: "Se alcanzó el límite de pasos de la consulta." });
  } catch (e) {
    console.error("ai-assistant error", e);
    return jres({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});
