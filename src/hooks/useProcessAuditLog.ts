import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProcessAuditEntry {
  id: string;
  area: string;
  table_name: string;
  record_id: string | null;
  order_code: string | null;
  entity_name: string | null;
  brand: string | null;
  action: string;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_by_email: string | null;
  changed_at: string;
}

/** Historial inmutable de cambios de procesos (producción / estampación) */
export function useProcessAuditLog(area?: "produccion" | "estampacion", limit = 1000) {
  return useQuery({
    queryKey: ["process_audit_log", area ?? "todas", limit],
    queryFn: async (): Promise<ProcessAuditEntry[]> => {
      let query = supabase
        .from("process_audit_log")
        .select("*")
        .order("changed_at", { ascending: false })
        .limit(limit);
      if (area) query = query.eq("area", area);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ProcessAuditEntry[];
    },
  });
}
