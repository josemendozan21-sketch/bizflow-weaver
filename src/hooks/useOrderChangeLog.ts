import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OrderChangeLogEntry {
  id: string;
  order_id: string;
  order_code: string | null;
  field: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_by_name: string | null;
  reason: string | null;
  created_at: string;
}

export const ORDER_FIELD_LABELS: Record<string, string> = {
  quantity: "Unidades",
  unit_price: "Valor unitario",
  total_amount: "Total del pedido",
  abono: "Abono",
  production_status: "Etapa de producción",
  ink_color: "Color de tinta",
  gel_color: "Color de gel",
  charge_added: "Cargo adicional agregado",
  charge_removed: "Cargo adicional eliminado",
};

export const MONEY_FIELDS = new Set(["unit_price", "total_amount", "abono", "charge_added", "charge_removed"]);

export function useOrderChangeLog(orderId: string | undefined) {
  return useQuery({
    queryKey: ["order_change_log", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_change_log" as any)
        .select("*")
        .eq("order_id", orderId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as OrderChangeLogEntry[]) || [];
    },
  });
}

export async function logOrderChange(entry: {
  order_id: string;
  order_code?: string | null;
  field: string;
  old_value?: string | null;
  new_value?: string | null;
  changed_by?: string | null;
  changed_by_name?: string | null;
  reason?: string | null;
}) {
  const { error } = await supabase.from("order_change_log" as any).insert(entry as any);
  if (error) console.warn("No se pudo registrar el cambio:", error.message);
}
