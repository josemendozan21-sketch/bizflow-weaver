import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface MonthlyBudget {
  id: string;
  year: number;
  month: number;
  status: "abierto" | "cerrado";
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetLine {
  id: string;
  budget_id: string;
  kind: "ingreso" | "egreso";
  category: string;
  description: string | null;
  projected_amount: number;
}

export interface BudgetEntry {
  id: string;
  budget_id: string;
  kind: "ingreso" | "egreso";
  category: string;
  description: string | null;
  amount: number;
  entry_date: string;
  proof_url: string | null;
  recorded_by: string | null;
  recorded_by_name: string | null;
  created_at: string;
}

export const ADVISORS = ["Valentina", "Angela", "Pilar", "Ilian", "Jose Mario"] as const;

export const INCOME_CATEGORIES = [
  ...ADVISORS.map((a) => `Asesores - ${a}`),
  "Ferias",
  "Otros ingresos",
];

export const EXPENSE_CATEGORIES = [
  "Compra de materia prima",
  "Gastos diarios",
  "Nómina",
  "Seguridad social",
  "Servicios",
  "Arriendo",
  "Otros gastos",
];

export function useMonthlyBudget(year: number, month: number) {
  return useQuery({
    queryKey: ["monthly_budget", year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_budgets" as any)
        .select("*")
        .eq("year", year)
        .eq("month", month)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as MonthlyBudget) ?? null;
    },
  });
}

export function useBudgetLines(budgetId: string | undefined) {
  return useQuery({
    queryKey: ["budget_lines", budgetId],
    queryFn: async () => {
      if (!budgetId) return [];
      const { data, error } = await supabase
        .from("budget_lines" as any)
        .select("*")
        .eq("budget_id", budgetId);
      if (error) throw error;
      return (data ?? []) as unknown as BudgetLine[];
    },
    enabled: !!budgetId,
  });
}

export function useBudgetEntries(budgetId: string | undefined) {
  return useQuery({
    queryKey: ["budget_entries", budgetId],
    queryFn: async () => {
      if (!budgetId) return [];
      const { data, error } = await supabase
        .from("budget_entries" as any)
        .select("*")
        .eq("budget_id", budgetId)
        .order("entry_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BudgetEntry[];
    },
    enabled: !!budgetId,
  });
}

export function useUpsertBudget() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (vars: {
      year: number;
      month: number;
      lines: { kind: "ingreso" | "egreso"; category: string; projected_amount: number; description?: string | null }[];
      notes?: string | null;
    }) => {
      // upsert budget row
      const { data: existing } = await supabase
        .from("monthly_budgets" as any)
        .select("*")
        .eq("year", vars.year)
        .eq("month", vars.month)
        .maybeSingle();

      let budgetId: string;
      if (existing) {
        budgetId = (existing as any).id;
        await supabase
          .from("monthly_budgets" as any)
          .update({ notes: vars.notes ?? null })
          .eq("id", budgetId);
      } else {
        const { data, error } = await supabase
          .from("monthly_budgets" as any)
          .insert({
            year: vars.year,
            month: vars.month,
            notes: vars.notes ?? null,
            created_by: user?.id ?? null,
          })
          .select("id")
          .single();
        if (error) throw error;
        budgetId = (data as any).id;
      }

      // Replace all lines
      await supabase.from("budget_lines" as any).delete().eq("budget_id", budgetId);
      if (vars.lines.length > 0) {
        const rows = vars.lines.map((l) => ({
          budget_id: budgetId,
          kind: l.kind,
          category: l.category,
          description: l.description ?? null,
          projected_amount: l.projected_amount,
        }));
        const { error } = await supabase.from("budget_lines" as any).insert(rows);
        if (error) throw error;
      }
      return budgetId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["monthly_budget"] });
      qc.invalidateQueries({ queryKey: ["budget_lines"] });
    },
  });
}

export function useAddBudgetEntry() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (vars: {
      budget_id: string;
      kind: "ingreso" | "egreso";
      category: string;
      description?: string | null;
      amount: number;
      entry_date: string;
      proof_url?: string | null;
    }) => {
      const { error } = await supabase.from("budget_entries" as any).insert({
        ...vars,
        recorded_by: user?.id ?? null,
        recorded_by_name: user?.email ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budget_entries"] });
    },
  });
}

export function useDeleteBudgetEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("budget_entries" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budget_entries"] }),
  });
}

export function useCloseBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; status: "abierto" | "cerrado" }) => {
      const { error } = await supabase
        .from("monthly_budgets" as any)
        .update({ status: vars.status })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["monthly_budget"] }),
  });
}

/** Auto-readings: real values from other tables for the given month */
export function useAutoReadings(year: number, month: number) {
  return useQuery({
    queryKey: ["budget_auto_readings", year, month],
    queryFn: async () => {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 1);
      const startISO = start.toISOString();
      const endISO = end.toISOString();
      const startDate = start.toISOString().slice(0, 10);
      const endDate = end.toISOString().slice(0, 10);

      const [ordersRes, feriaRes, pettyRes] = await Promise.all([
        supabase
          .from("orders")
          .select("total_amount, sale_type, invoice_status, created_at, advisor_name")
          .eq("invoice_status", "facturado")
          .gte("created_at", startISO)
          .lt("created_at", endISO),
        supabase
          .from("feria_sales")
          .select("total_amount, sale_date")
          .gte("sale_date", startISO)
          .lt("sale_date", endISO),
        supabase
          .from("petty_cash_expenses")
          .select("amount, created_at")
          .gte("created_at", startISO)
          .lt("created_at", endISO),
      ]);

      const orders = ordersRes.data ?? [];
      const feria = feriaRes.data ?? [];
      const petty = pettyRes.data ?? [];

      const feriasTotal = feria.reduce((s: number, f: any) => s + Number(f.total_amount || 0), 0);
      const pettyTotal = petty.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

      // Sum sales per advisor by name (case/diacritic-insensitive matching)
      const norm = (s: string) =>
        (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

      const result: Record<string, number> = {
        Ferias: feriasTotal,
        "Gastos diarios": pettyTotal,
      };
      for (const advisor of ADVISORS) {
        const target = norm(advisor);
        const total = orders
          .filter((o: any) => norm(o.advisor_name || "").includes(target))
          .reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);
        result[`Asesores - ${advisor}`] = total;
      }
      return result;
    },
  });
}