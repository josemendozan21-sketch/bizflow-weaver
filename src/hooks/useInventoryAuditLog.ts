import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface InventoryAuditEntry {
  id: string;
  table_name: string;
  record_id: string | null;
  action: string;
  item_name: string | null;
  brand: string | null;
  category: string | null;
  product_type: string | null;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_by_email: string | null;
  changed_at: string;
}

export function useInventoryAuditLog(limit = 1000) {
  return useQuery({
    queryKey: ["inventory_audit_log", limit],
    queryFn: async (): Promise<InventoryAuditEntry[]> => {
      const { data, error } = await supabase
        .from("inventory_audit_log")
        .select("*")
        .order("changed_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as InventoryAuditEntry[];
    },
  });
}
