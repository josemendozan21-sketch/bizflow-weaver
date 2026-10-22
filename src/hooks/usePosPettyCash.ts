import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PettyExpense, Sede } from "@/lib/pettyCash";

export interface PettyCashCount {
  id: string;
  sede: string;
  count_date: string;
  expected_amount: number;
  counted_amount: number;
  difference: number;
  notes: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  resolved_at?: string | null;
  resolved_by_name?: string | null;
  resolution_note?: string | null;
}

/** Gastos en efectivo registrados para una sede (por defecto, el punto de Chicó). */
export function useSedePettyExpenses(sede: Sede = "chico") {
  return useQuery({
    queryKey: ["petty_cash_expenses_sede", sede],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("petty_cash_expenses")
        .select("*")
        .eq("sede", sede)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PettyExpense[];
    },
  });
}

export function useSedeCashCounts(sede: Sede = "chico") {
  return useQuery({
    queryKey: ["petty_cash_counts_sede", sede],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("petty_cash_counts" as any)
        .select("*")
        .eq("sede", sede)
        .order("count_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PettyCashCount[];
    },
  });
}

export function useCreateSedePettyExpense(sede: Sede = "chico") {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      amount: number;
      description: string;
      requested_by: string;
      proof_url?: string | null;
    }) => {
      const { error } = await supabase.from("petty_cash_expenses").insert({
        amount: input.amount,
        description: input.description,
        requested_by: input.requested_by,
        proof_url: input.proof_url ?? null,
        recorded_by: user!.id,
        recorded_by_name: user!.email,
        sede,
        origin: "punto",
        status: "pendiente",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["petty_cash_expenses_sede", sede] });
      qc.invalidateQueries({ queryKey: ["petty_cash_expenses_all"] });
    },
  });
}

export function useCreateSedeCashCount(sede: Sede = "chico") {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      expected_amount: number;
      counted_amount: number;
      notes?: string | null;
    }) => {
      const diff = Math.round((input.counted_amount - input.expected_amount) * 100) / 100;
      const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
      const { error } = await supabase.from("petty_cash_counts" as any).insert({
        sede,
        count_date: today,
        expected_amount: input.expected_amount,
        counted_amount: input.counted_amount,
        difference: diff,
        notes: input.notes ?? null,
        created_by: user!.id,
        created_by_name: user!.email,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["petty_cash_counts_sede", sede] });
      qc.invalidateQueries({ queryKey: ["petty_cash_counts"] });
    },
  });
}

/** Contabilidad marca como resuelta la diferencia de un cierre, con explicación. */
export function useResolveCashCount(sede: Sede = "chico") {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { id: string; note: string }) => {
      const { error } = await supabase
        .from("petty_cash_counts" as any)
        .update({ resolved_at: new Date().toISOString(), resolved_by_name: user!.email, resolution_note: input.note } as any)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["petty_cash_counts_sede", sede] }),
  });
}
