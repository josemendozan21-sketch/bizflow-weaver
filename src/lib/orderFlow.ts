import { supabase } from "@/integrations/supabase/client";

/**
 * Flujo único: Pedido (Ventas) → Inventarios → (Producción si hace falta) → Logística.
 *
 * Reglas:
 *  - El pedido SOLO nace en Ventas (tabla `orders`, un único registro con ID único).
 *  - Ventas NO crea órdenes de producción: el pedido queda "pendiente" de revisión de Inventarios.
 *  - Inventarios decide: reservar inventario (→ Estampación) o solicitar producción (→ Producción).
 *  - Producción nunca crea pedidos ni escribe referencias/cantidades: solo recibe órdenes creadas
 *    automáticamente a partir del pedido.
 */

export interface FlowOrder {
  id: string;
  brand: string;
  client_name: string;
  product: string;
  quantity: number;
  ink_color?: string | null;
  ink_count?: number | null;
  ink_color_2?: string | null;
  ink_color_3?: string | null;
  glitter_color?: string | null;
  gel_color?: string | null;
  silicone_color?: string | null;
  logo_url?: string | null;
  observations?: string | null;
  advisor_id?: string | null;
  delivery_date?: string | null;
}

const isThermic = (product: string) => /t[eé]rmico|calor/i.test(product || "");

const thermoSizeOf = (product: string) => {
  const m = (product || "").match(/(\d{2,4})\s*ml/i);
  return m ? `${m[1]} ml` : null;
};

export function buildStages(
  brand: string,
  opts: { hasLogo: boolean; needsCuerpos: boolean; product: string }
): string[] {
  if (brand === "sweatspot") {
    const full = opts.hasLogo
      ? ["estampacion", "produccion_tubos", "ensamble_cuello", "sello_base", "refile", "colocacion_boquilla", "listo"]
      : ["produccion_tubos", "ensamble_cuello", "sello_base", "refile", "colocacion_boquilla", "listo"];
    const short = opts.hasLogo
      ? ["estampacion", "colocacion_boquilla", "listo"]
      : ["colocacion_boquilla", "listo"];
    return opts.needsCuerpos ? full : short;
  }
  // magical
  const base = opts.hasLogo
    ? ["produccion_cuerpos", "estampacion", "dosificacion", "sellado", "recorte", "empaque", "listo"]
    : ["produccion_cuerpos", "dosificacion", "sellado", "recorte", "empaque", "listo"];
  const stages = isThermic(opts.product)
    ? (() => {
        const idx = base.indexOf("sellado");
        return [...base.slice(0, idx + 1), "descristalizacion", ...base.slice(idx + 1)];
      })()
    : base;
  // Si no hay que producir cuerpos, la orden arranca después de esa etapa
  return opts.needsCuerpos ? stages : stages.filter((s) => s !== "produccion_cuerpos");
}

/** Devuelve la orden de producción existente de un pedido (o null). Garantiza 1 pedido → 1 orden. */
export async function findProductionOrder(orderId: string) {
  const { data } = await supabase
    .from("production_orders")
    .select("id, current_stage, stage_status")
    .eq("order_id", orderId)
    .maybeSingle();
  return data ?? null;
}

/**
 * Crea (idempotente) la orden de producción del pedido y sincroniza `orders.production_status`.
 * `needsCuerpos = true` arranca en producción de cuerpos; si no, arranca en estampación/siguiente etapa.
 */
export async function ensureProductionOrder(
  order: FlowOrder,
  opts: { needsCuerpos: boolean; keepOrderStatus?: boolean; sampleOnly?: boolean }
): Promise<{ id: string; created: boolean; stage: string }> {
  const existing = await findProductionOrder(order.id);
  if (existing) return { id: existing.id, created: false, stage: existing.current_stage };

  const hasLogo = !!order.logo_url;
  const stages = buildStages(order.brand, {
    hasLogo,
    needsCuerpos: opts.needsCuerpos,
    product: order.product,
  });
  const initialStage = stages[0];

  const payload: Record<string, unknown> = {
    order_id: order.id,
    brand: order.brand,
    client_name: order.client_name,
    quantity: order.quantity,
    current_stage: initialStage,
    stage_status: "pendiente",
    workflow_type: opts.needsCuerpos ? "full" : "short",
    stages,
    ink_color: order.ink_color ?? null,
    ink_count: order.ink_count ?? 1,
    ink_color_2: order.ink_color_2 ?? null,
    ink_color_3: order.ink_color_3 ?? null,
    glitter_color: order.glitter_color ?? null,
    observations: opts.sampleOnly
      ? `MUESTRA (sin entrega de cuerpos) — ${order.observations ?? ""}`.trim()
      : order.observations ?? null,
    advisor_id: order.advisor_id ?? null,
    delivery_date: order.delivery_date ?? null,
    needs_cuerpos: opts.needsCuerpos,
    has_stock: !opts.needsCuerpos,
    logo_file: order.logo_url ?? null,
  };

  if (order.brand === "sweatspot") {
    payload.silicone_color = order.silicone_color ?? null;
    payload.thermo_size = thermoSizeOf(order.product);
  } else {
    payload.gel_color = order.gel_color ?? null;
    payload.molde = order.product;
  }

  const { data, error } = await supabase
    .from("production_orders")
    .insert(payload as never)
    .select("id")
    .single();

  if (error) {
    // Carrera: otro usuario ya la creó (índice único por order_id)
    const again = await findProductionOrder(order.id);
    if (again) return { id: again.id, created: false, stage: again.current_stage };
    throw error;
  }

  if (!opts.keepOrderStatus) {
    await supabase
      .from("orders")
      .update({ production_status: initialStage })
      .eq("id", order.id);
  }

  return { id: data.id as string, created: true, stage: initialStage };
}

/**
 * Reserva unidades para un pedido: NO descuenta stock, mueve `available` → `in_process`
 * (el trigger de inventory_movements aplica movement_kind = 'reserva').
 */
export async function reserveStockForOrder(params: {
  order: FlowOrder;
  stockItemId: string | null;
  itemName: string;
  category: string;
  quantity: number;
  userId: string;
  userName?: string | null;
  note?: string;
}) {
  const { error } = await supabase.from("inventory_movements").insert({
    stock_item_id: params.stockItemId,
    item_name: params.itemName,
    brand: params.order.brand,
    category: params.category,
    quantity: params.quantity,
    direction: "entrega",
    movement_kind: "reserva",
    area: "estampacion",
    reason:
      `Reserva de inventario — Pedido de ${params.order.client_name}` +
      (params.note ? ` — ${params.note}` : ""),
    order_id: params.order.id,
    recorded_by: params.userId,
    recorded_by_name: params.userName || "Inventarios",
  } as never);
  if (error) throw error;
}

/**
 * Inventarios solicita producción: el sistema crea automáticamente la orden de producción
 * usando la referencia y la cantidad del pedido. Producción solo la recibe.
 */
export async function requestProductionForOrder(params: {
  order: FlowOrder;
  tipoPlastico?: "frio" | "calor";
  note?: string;
}) {
  const { order } = params;
  const po = await ensureProductionOrder(order, { needsCuerpos: true });

  if (order.brand !== "sweatspot") {
    // El producto manda: si la referencia dice "térmica/calor" siempre es térmico,
    // sin importar el valor por defecto del selector.
    const tipo = isThermic(order.product) ? "calor" : (params.tipoPlastico ?? "frio");
    const tipoLabel = tipo === "calor" ? "Térmico" : "Frío";
    const baseRef = (order.product || "")
      .replace(/\s*\((Frío|Frio|Calor|Térmico|Termico)\)\s*$/i, "")
      .replace(/\s*(t[eé]rmic[oa]s?|fr[ií][oa]s?)\s*$/i, "")
      .trim();
    const canonicalRef = `${baseRef} (${tipoLabel})`;
    const { data: existingTask } = await supabase
      .from("body_production_tasks")
      .select("id")
      .eq("order_id", order.id)
      .maybeSingle();

    if (!existingTask) {
      const { error } = await supabase.from("body_production_tasks").insert({
        referencia: canonicalRef,
        unidades: order.quantity,
        tipo_plastico: tipo,
        status: "pendiente",
        order_id: order.id,
        production_order_id: po.id,
        brand: order.brand,
      } as never);

      if (error) throw error;
    }
  }

  await supabase.from("notifications").insert([
    {
      target_role: "produccion",
      title: "Nueva orden de producción",
      message:
        `Inventarios solicitó producir ${order.quantity} uds de "${order.product}" para el pedido de ${order.client_name}.` +
        (params.note ? ` Obs: ${params.note}` : ""),
      type: "info",
      reference_id: order.id,
    },
    {
      // El pedido entra a Estampación siempre: pueden avanzar con la muestra
      // mientras Inventarios entrega los cuerpos para el pedido completo.
      target_role: "estampacion",
      title: "Pedido en camino (muestra)",
      message:
        `Pedido de ${order.client_name}: ${order.quantity} uds de "${order.product}". ` +
        `Puedes avanzar con la muestra; los cuerpos están en producción.`,
      type: "info",
      reference_id: order.id,
    },
  ] as never);

  return po;
}