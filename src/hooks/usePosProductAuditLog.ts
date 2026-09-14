import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PosProductAuditEntry {
  id: string;
  location_id: string | null;
  product_id: string | null;
  action: string;
  product_name: string | null;
  brand: string | null;
  category: string | null;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_by_email: string | null;
  source: string | null;
  changed_at: string;
}

export function usePosProductAuditLog(locationId: string | null, limit = 1000) {
  return useQuery({
    queryKey: ["pos_product_audit_log", locationId, limit],
    enabled: !!locationId,
    queryFn: async (): Promise<PosProductAuditEntry[]> => {
      const { data, error } = await supabase
        .from("pos_product_audit_log")
        .select("*")
        .eq("location_id", locationId!)
        .order("changed_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as PosProductAuditEntry[];
    },
  });
}
