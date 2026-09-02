import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LogoStatusLogEntry {
  id: string;
  logo_request_id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  changed_by_name: string | null;
  note: string | null;
  created_at: string;
}

export function useLogoStatusHistory(requestId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["logo_status_log", requestId],
    enabled: !!requestId && enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("logo_request_status_log" as any)
        .select("*")
        .eq("logo_request_id", requestId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as LogoStatusLogEntry[]) || [];
    },
  });
}
