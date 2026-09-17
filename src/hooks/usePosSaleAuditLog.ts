import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PosSaleAuditEntry {
  id: string;
  sale_id: string | null;
  location_id: string | null;
  action: string;
  client_name: string | null;
  total_amount: number | null;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_by_email: string | null;
  changed_at: string;
}

export function usePosSaleAuditLog(locationId: string | null, limit = 1000) {
  return useQuery({
    queryKey: ["pos_sale_audit_log", locationId, limit],
    enabled: !!locationId,
    queryFn: async (): Promise<PosSaleAuditEntry[]> => {
      const { data, error } = await supabase
        .from("pos_sale_audit_log")
        .select("*")
        .eq("location_id", locationId!)
        .order("changed_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as PosSaleAuditEntry[];
    },
  });
}
