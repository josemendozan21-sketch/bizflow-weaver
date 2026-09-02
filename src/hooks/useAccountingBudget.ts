import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AccountKind = "costo" | "gasto";
export type AmountKind = "real" | "presupuesto";

export interface AccountingAccount {
  id: string;
  group_code: string;
  name: string;
  kind: AccountKind;
  active: boolean;
  sort_order: number;
}

export interface AccountingAmount {
  id: string;
  account_id: string;
  year: number;
  month: number;
  amount_kind: AmountKind;
  amount: number;
}

export const GROUP_LABELS: Record<string, string> = {
  "51": "51. Gastos de administración",
  "52": "52. Gastos de ventas",
  "53": "53. Gastos no operacionales",
  "61": "61. Costo de ventas",
  "72": "72. Mano de obra producción",
  "73": "73. Costos indirectos producción",
};

export const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function canManageBudget(role?: string | null) {
  return role === "admin" || role === "contabilidad";
}

export function useAccountingAccounts(includeInactive = false) {
  return useQuery({
    queryKey: ["accounting_accounts", includeInactive],
    queryFn: async () => {
      let q = supabase.from("accounting_accounts" as any).select("*");
      if (!includeInactive) q = q.eq("active", true);
      const { data, error } = await q
        .order("group_code", { ascending: true })
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as AccountingAccount[];
    },
  });
}

export function useAccountingAmounts(year: number) {
  return useQuery({
    queryKey: ["accounting_amounts", year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounting_monthly_amounts" as any)
        .select("*")
        .eq("year", year);
      if (error) throw error;
      return (data ?? []) as unknown as AccountingAmount[];
    },
  });
}

export function useSaveAmount() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (vars: {
      account_id: string;
      year: number;
      month: number;
      amount_kind: AmountKind;
      amount: number;
    }) => {
      const { error } = await supabase
        .from("accounting_monthly_amounts" as any)
        .upsert(
          { ...vars, created_by: user?.id ?? null },
          { onConflict: "account_id,year,month,amount_kind" },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounting_amounts"] }),
  });
}

/** Bulk upsert used by the monthly Excel upload. */
export function useBulkSaveAmounts() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (vars: {
      year: number;
      month: number;
      amount_kind: AmountKind;
      rows: { account_id: string; amount: number }[];
    }) => {
      if (vars.rows.length === 0) return;
      const payload = vars.rows.map((r) => ({
        account_id: r.account_id,
        year: vars.year,
        month: vars.month,
        amount_kind: vars.amount_kind,
        amount: r.amount,
        created_by: user?.id ?? null,
      }));
      const { error } = await supabase
        .from("accounting_monthly_amounts" as any)
        .upsert(payload, { onConflict: "account_id,year,month,amount_kind" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounting_amounts"] }),
  });
}

export function useSaveAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      id?: string;
      group_code: string;
      name: string;
      kind: AccountKind;
      active?: boolean;
    }) => {
      if (vars.id) {
        const { error } = await supabase
          .from("accounting_accounts" as any)
          .update({
            group_code: vars.group_code,
            name: vars.name,
            kind: vars.kind,
            active: vars.active ?? true,
          })
          .eq("id", vars.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("accounting_accounts" as any).insert({
          group_code: vars.group_code,
          name: vars.name,
          kind: vars.kind,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounting_accounts"] }),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("accounting_accounts" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounting_accounts"] });
      qc.invalidateQueries({ queryKey: ["accounting_amounts"] });
    },
  });
}
