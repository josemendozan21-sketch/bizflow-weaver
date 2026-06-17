import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { CommissionProposal } from "@/lib/feriaProjections";

export interface FeriaCommission {
  id: string;
  feria_id: string;
  advisor_id: string | null;
  advisor_name: string;
  sales_with_iva: number;
  sales_without_iva: number;
  excedente: number;
  applied_pct: number;
  commission_amount: number;
  status: "propuesta" | "aprobada" | "rechazada";
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useFeriaCommissions(feriaId: string | null) {
  return useQuery({
    queryKey: ["feria_commissions", feriaId],
    queryFn: async () => {
      if (!feriaId) return [] as FeriaCommission[];
      const { data, error } = await supabase
        .from("feria_commissions")
        .select("*")
        .eq("feria_id", feriaId)
        .order("commission_amount", { ascending: false });
      if (error) throw error;
      return (data as unknown) as FeriaCommission[];
    },
    enabled: !!feriaId,
  });
}

export function useApproveCommission() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (args: { feriaId: string; proposal: CommissionProposal }) => {
      const { feriaId, proposal } = args;
      const row = {
        feria_id: feriaId,
        advisor_id: proposal.advisor_id,
        advisor_name: proposal.advisor_name,
        sales_with_iva: proposal.sales_with_iva,
        sales_without_iva: proposal.sales_without_iva,
        excedente: proposal.excedente,
        applied_pct: proposal.applied_pct,
        commission_amount: proposal.commission_amount,
        status: "aprobada" as const,
        approved_by: user?.id || null,
        approved_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("feria_commissions")
        .upsert(row as any, { onConflict: "feria_id,advisor_id" });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["feria_commissions", v.feriaId] });
      toast.success("Comisión aprobada");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useApproveAllCommissions() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (args: { feriaId: string; proposals: CommissionProposal[] }) => {
      const { feriaId, proposals } = args;
      const rows = proposals.map((p) => ({
        feria_id: feriaId,
        advisor_id: p.advisor_id,
        advisor_name: p.advisor_name,
        sales_with_iva: p.sales_with_iva,
        sales_without_iva: p.sales_without_iva,
        excedente: p.excedente,
        applied_pct: p.applied_pct,
        commission_amount: p.commission_amount,
        status: "aprobada" as const,
        approved_by: user?.id || null,
        approved_at: new Date().toISOString(),
      }));
      if (rows.length === 0) return;
      const { error } = await supabase
        .from("feria_commissions")
        .upsert(rows as any, { onConflict: "feria_id,advisor_id" });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["feria_commissions", v.feriaId] });
      toast.success("Comisiones aprobadas");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useRejectCommission() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (args: { feriaId: string; proposal: CommissionProposal; notes?: string }) => {
      const { feriaId, proposal, notes } = args;
      const row = {
        feria_id: feriaId,
        advisor_id: proposal.advisor_id,
        advisor_name: proposal.advisor_name,
        sales_with_iva: proposal.sales_with_iva,
        sales_without_iva: proposal.sales_without_iva,
        excedente: proposal.excedente,
        applied_pct: proposal.applied_pct,
        commission_amount: 0,
        status: "rechazada" as const,
        approved_by: user?.id || null,
        approved_at: new Date().toISOString(),
        notes: notes || null,
      };
      const { error } = await supabase
        .from("feria_commissions")
        .upsert(row as any, { onConflict: "feria_id,advisor_id" });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["feria_commissions", v.feriaId] });
      toast.success("Comisión rechazada");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
