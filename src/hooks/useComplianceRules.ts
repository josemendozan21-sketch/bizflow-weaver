import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ComplianceArea = "produccion" | "estampacion" | "logistica";

export interface ComplianceRule {
  id: string;
  area: ComplianceArea;
  percentage: number;
  min_threshold_pct: number;
  bonus_amount: number;
  bonus_threshold_pct: number;
  active: boolean;
  notes: string | null;
}

export function useComplianceRules() {
  return useQuery({
    queryKey: ["area_compliance_rules"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("area_compliance_rules" as any)
        .select("*");
      if (error) throw error;
      return (data ?? []) as unknown as ComplianceRule[];
    },
  });
}