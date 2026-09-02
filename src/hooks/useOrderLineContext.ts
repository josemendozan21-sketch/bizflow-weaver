import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OrderLineContext {
  orderId: string;
  orderCode: string | null;
  /** Clave del pedido completo (envío del asesor). Si no hay submission_id, es el propio pedido. */
  groupKey: string;
  clientName: string;
  product: string | null;
  gelColor: string | null;
  inkColor: string | null;
  glitterColor: string | null;
  siliconeColor: string | null;
  /** Posición del producto dentro del pedido (1..total) */
  productIndex: number;
  /** Cantidad de productos del pedido */
  productCount: number;
  /** Texto corto que diferencia este producto de los demás del mismo pedido */
  variantLabel: string;
}

interface OrderRow {
  id: string;
  order_code: string | null;
  submission_id: string | null;
  client_name: string;
  product: string | null;
  gel_color: string | null;
  ink_color: string | null;
  glitter_color: string | null;
  silicone_color: string | null;
  created_at: string;
}

function buildVariantLabel(row: OrderRow): string {
  const parts: string[] = [];
  if (row.product) parts.push(row.product);
  if (row.gel_color) parts.push(`Gel ${row.gel_color}`);
  if (row.silicone_color) parts.push(`Silicona ${row.silicone_color}`);
  if (row.ink_color) parts.push(`Tinta ${row.ink_color}`);
  if (row.glitter_color) parts.push(`Escarcha ${row.glitter_color}`);
  return parts.join(" · ");
}

/**
 * Devuelve, para cada pedido (línea), su posición dentro del pedido completo del cliente
 * y una etiqueta que lo diferencia (referencia + colores). Se usa para que Estampación y
 * el asesor sepan a qué producto corresponde cada foto de aprobación.
 */
export function useOrderLineContext(orderIds: (string | null | undefined)[]) {
  const ids = Array.from(new Set(orderIds.filter(Boolean) as string[])).sort();

  const query = useQuery({
    queryKey: ["order_line_context", ids],
    enabled: ids.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<Record<string, OrderLineContext>> => {
      const select =
        "id, order_code, submission_id, client_name, product, gel_color, ink_color, glitter_color, silicone_color, created_at";
      const { data, error } = await supabase.from("orders").select(select).in("id", ids);
      if (error) throw error;
      const base = (data ?? []) as unknown as OrderRow[];

      const submissionIds = Array.from(
        new Set(base.map((r) => r.submission_id).filter(Boolean) as string[]),
      );

      let siblings: OrderRow[] = base;
      if (submissionIds.length > 0) {
        const { data: sib, error: sibErr } = await supabase
          .from("orders")
          .select(select)
          .in("submission_id", submissionIds);
        if (sibErr) throw sibErr;
        const merged = new Map<string, OrderRow>();
        for (const r of [...base, ...((sib ?? []) as unknown as OrderRow[])]) merged.set(r.id, r);
        siblings = Array.from(merged.values());
      }

      // Agrupar por pedido completo
      const groups = new Map<string, OrderRow[]>();
      for (const row of siblings) {
        const key = row.submission_id || row.id;
        const arr = groups.get(key) ?? [];
        arr.push(row);
        groups.set(key, arr);
      }

      const result: Record<string, OrderLineContext> = {};
      for (const [key, rows] of groups) {
        rows.sort((a, b) => {
          const ac = a.order_code ?? "";
          const bc = b.order_code ?? "";
          if (ac && bc && ac !== bc) return ac.localeCompare(bc);
          return a.created_at.localeCompare(b.created_at);
        });
        rows.forEach((row, idx) => {
          result[row.id] = {
            orderId: row.id,
            orderCode: row.order_code,
            groupKey: key,
            clientName: row.client_name,
            product: row.product,
            gelColor: row.gel_color,
            inkColor: row.ink_color,
            glitterColor: row.glitter_color,
            siliconeColor: row.silicone_color,
            productIndex: idx + 1,
            productCount: rows.length,
            variantLabel: buildVariantLabel(row),
          };
        });
      }
      return result;
    },
  });

  return {
    contextById: query.data ?? {},
    isLoading: query.isLoading,
  };
}
