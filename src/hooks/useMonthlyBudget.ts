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

export type BudgetKind = "ingreso" | "costo" | "gasto" | "pasivo";

export interface BudgetLine {
  id: string;
  budget_id: string;
  kind: BudgetKind;
  category: string;
  description: string | null;
  projected_amount: number;
  expected_date?: string | null;
}

export interface BudgetEntry {
  id: string;
  budget_id: string;
  kind: BudgetKind;
  category: string;
  description: string | null;
  amount: number;
  entry_date: string;
  proof_url: string | null;
  recorded_by: string | null;
  recorded_by_name: string | null;
  bank_account_id?: string | null;
  created_at: string;
}

export const ADVISORS = ["Valentina", "Angela", "Pilar", "Ilian", "Jose Mario", "Jailin"] as const;

/** Email aliases used to match orders.advisor_name (which often stores the email) to a display advisor. */
export const ADVISOR_EMAILS: Record<string, string[]> = {
  Valentina: ["valemendoza2228@gmail.com", "valentina"],
  Angela: ["angela.mendozan@gmail.com", "angela"],
  Pilar: ["beltran.pilar1923@gmail.com", "pilar"],
  Ilian: ["ilianghernandez@gmail.com", "ilian"],
  "Jose Mario": ["josemendozan21@gmail.com", "jose"],
  Jailin: ["herrerasotojailin@gmail.com", "jailin"],
};

export const INCOME_CATEGORIES = [
  "Ferias",
  "Punto 92",
  "Sub Arriendos",
  "Otros ingresos",
  // Legacy (presupuestos anteriores por asesor)
  "Asesores - Valentina",
  "Asesores - Angela",
  "Asesores - Pilar",
  "Asesores - Ilian",
  "Asesores - Jose Mario",
  "Asesores - Jailin",
];

export const COST_CATEGORIES = [
  "Materia Prima",
  "Producto terminado",
  "Stand ferias",
];

export const EXPENSE_CATEGORIES = [
  "Nómina",
  "Prima de servicios",
  "Seguridad social",
  "Cesantías",
  "Agua",
  "Luz",
  "Arriendo",
  "Internet",
  "Telesentinel",
  "Marketing - Community manager",
  "Marketing - UGGC",
  "Marketing - Pauta Magical",
  "Marketing - Pauta Sweatspot",
  "Marketing - Pauta Bionovations",
  "Contador",
  "Pólizas y Seguros",
  "Aseo",
  "Mensajería",
  "Gerencia",
  "Bonificaciones asesores",
  "Asesores externos (ferias/local)",
  "Asesores Empresa",
  "Asesores Eventos",
  "CCB",
  "Stand",
  "Publicidad stand",
  "Transporte",
  "Tiquetes",
  "Viáticos",
  "Hospedaje",
  "Otros gastos",
  // Legacy (presupuestos anteriores)
  "Compra de materia prima",
  "Servicios",
  "Gastos diarios",
];

export const LIABILITY_CATEGORIES = [
  "IVA",
  "Renta",
  "Reteiva",
];

export const KIND_LABELS: Record<BudgetKind, string> = {
  ingreso: "Ingreso",
  costo: "Costo",
  gasto: "Gasto",
  pasivo: "Pasivo",
};

export function categoriesForKind(kind: BudgetKind): string[] {
  switch (kind) {
    case "ingreso": return INCOME_CATEGORIES;
    case "costo": return COST_CATEGORIES;
    case "gasto": return EXPENSE_CATEGORIES;
    case "pasivo": return LIABILITY_CATEGORIES;
  }
}

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
      lines: { kind: BudgetKind; category: string; projected_amount: number; description?: string | null; expected_date?: string | null }[];
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
          expected_date: l.expected_date ?? null,
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
      kind: BudgetKind;
      category: string;
      description?: string | null;
      amount: number;
      entry_date: string;
      proof_url?: string | null;
      bank_account_id?: string | null;
    }) => {
      const { data: inserted, error } = await supabase.from("budget_entries" as any).insert({
        ...vars,
        recorded_by: user?.id ?? null,
        recorded_by_name: user?.email ?? null,
      }).select("id").single();
      if (error) throw error;
      // Also create bank movement if bank selected
      if (vars.bank_account_id) {
        await supabase.from("bank_movements" as any).insert({
          bank_account_id: vars.bank_account_id,
          movement_date: vars.entry_date,
          direction: vars.kind === "ingreso" ? "ingreso" : "egreso",
          amount: vars.amount,
          concept: `${vars.category}${vars.description ? " — " + vars.description : ""}`,
          reference_kind: "budget_entry",
          reference_id: (inserted as any)?.id,
          recorded_by: user?.id ?? null,
          recorded_by_name: user?.email ?? null,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budget_entries"] });
      qc.invalidateQueries({ queryKey: ["bank_accounts"] });
      qc.invalidateQueries({ queryKey: ["bank_movements"] });
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budget_entries"] });
      qc.invalidateQueries({ queryKey: ["bank_accounts"] });
      qc.invalidateQueries({ queryKey: ["bank_movements"] });
    },
  });
}

// =============== Bank accounts ===============

export interface BankAccount {
  id: string;
  name: string;
  initial_balance: number;
  current_balance: number;
  notes: string | null;
  active: boolean;
}

export interface BankMovement {
  id: string;
  bank_account_id: string;
  movement_date: string;
  direction: "ingreso" | "egreso";
  amount: number;
  concept: string;
  reference_kind: string | null;
  reference_id: string | null;
  created_at: string;
}

export function useBankAccounts() {
  return useQuery({
    queryKey: ["bank_accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts" as any)
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as BankAccount[];
    },
  });
}

export function useBankMovements(year?: number, month?: number) {
  return useQuery({
    queryKey: ["bank_movements", year, month],
    queryFn: async () => {
      let q = supabase.from("bank_movements" as any).select("*").order("movement_date", { ascending: false });
      if (year && month) {
        const start = new Date(year, month - 1, 1).toISOString().slice(0, 10);
        const end = new Date(year, month, 1).toISOString().slice(0, 10);
        q = q.gte("movement_date", start).lt("movement_date", end);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as BankMovement[];
    },
  });
}

export function useUpdateBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; name?: string; initial_balance?: number; notes?: string | null; active?: boolean }) => {
      const { id, ...rest } = vars;
      const { error } = await supabase.from("bank_accounts" as any).update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bank_accounts"] }),
  });
}

export function useCreateBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { name: string; initial_balance: number; notes?: string | null }) => {
      const { error } = await supabase.from("bank_accounts" as any).insert({
        name: vars.name,
        initial_balance: vars.initial_balance,
        current_balance: vars.initial_balance,
        notes: vars.notes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bank_accounts"] }),
  });
}

// =============== Scheduled payments ===============

export interface ScheduledPayment {
  id: string;
  budget_id: string | null;
  kind: "costo" | "gasto" | "pasivo";
  category: string;
  description: string | null;
  budgeted_amount: number;
  due_date: string;
  bank_account_id: string | null;
  status: "pendiente" | "pagado" | "cancelado";
  paid_amount: number | null;
  paid_date: string | null;
  paid_bank_account_id: string | null;
  proof_url: string | null;
  notes: string | null;
  created_at: string;
}

export function useScheduledPayments(year: number, month: number) {
  return useQuery({
    queryKey: ["scheduled_payments", year, month],
    queryFn: async () => {
      const start = new Date(year, month - 1, 1).toISOString().slice(0, 10);
      const end = new Date(year, month, 1).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("scheduled_payments" as any)
        .select("*")
        .gte("due_date", start)
        .lt("due_date", end)
        .order("due_date");
      if (error) throw error;
      return (data ?? []) as unknown as ScheduledPayment[];
    },
  });
}

export function useCreateScheduledPayment() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (vars: {
      budget_id?: string | null;
      kind: "costo" | "gasto" | "pasivo";
      category: string;
      description?: string | null;
      budgeted_amount: number;
      due_date: string;
      bank_account_id?: string | null;
      notes?: string | null;
    }) => {
      const { error } = await supabase.from("scheduled_payments" as any).insert({
        ...vars,
        created_by: user?.id ?? null,
        created_by_name: user?.email ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scheduled_payments"] }),
  });
}

export function useDeleteScheduledPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("scheduled_payments" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scheduled_payments"] }),
  });
}

/**
 * Marks a scheduled payment as paid:
 * - Creates a budget_entry (egreso real) with the paid_amount
 * - Creates a bank_movement (egreso) on the chosen bank
 * - Updates the scheduled_payment status & refs
 */
export function usePayScheduled() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (vars: {
      payment: ScheduledPayment;
      paid_amount: number;
      paid_date: string;
      paid_bank_account_id: string;
      proof_url?: string | null;
      notes?: string | null;
    }) => {
      const p = vars.payment;
      // 1. Create budget_entry
      let budgetEntryId: string | null = null;
      if (p.budget_id) {
        const { data: be, error: beErr } = await supabase.from("budget_entries" as any).insert({
          budget_id: p.budget_id,
          kind: p.kind,
          category: p.category,
          description: p.description,
          amount: vars.paid_amount,
          entry_date: vars.paid_date,
          proof_url: vars.proof_url ?? null,
          bank_account_id: vars.paid_bank_account_id,
          recorded_by: user?.id ?? null,
          recorded_by_name: user?.email ?? null,
        }).select("id").single();
        if (beErr) throw beErr;
        budgetEntryId = (be as any)?.id ?? null;
      }
      // 2. Create bank_movement
      const { data: bm, error: bmErr } = await supabase.from("bank_movements" as any).insert({
        bank_account_id: vars.paid_bank_account_id,
        movement_date: vars.paid_date,
        direction: "egreso",
        amount: vars.paid_amount,
        concept: `Pago ${p.category}${p.description ? " — " + p.description : ""}`,
        reference_kind: "scheduled_payment",
        reference_id: p.id,
        recorded_by: user?.id ?? null,
        recorded_by_name: user?.email ?? null,
      }).select("id").single();
      if (bmErr) throw bmErr;
      // 3. Update scheduled_payment
      const { error: upErr } = await supabase.from("scheduled_payments" as any).update({
        status: "pagado",
        paid_amount: vars.paid_amount,
        paid_date: vars.paid_date,
        paid_bank_account_id: vars.paid_bank_account_id,
        proof_url: vars.proof_url ?? null,
        notes: vars.notes ?? p.notes,
        budget_entry_id: budgetEntryId,
        bank_movement_id: (bm as any)?.id,
        paid_by: user?.id ?? null,
        paid_by_name: user?.email ?? null,
      }).eq("id", p.id);
      if (upErr) throw upErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scheduled_payments"] });
      qc.invalidateQueries({ queryKey: ["bank_accounts"] });
      qc.invalidateQueries({ queryKey: ["bank_movements"] });
      qc.invalidateQueries({ queryKey: ["budget_entries"] });
    },
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

      const [ordersRes, feriaRes, pettyRes, posRes, feriasInfoRes] = await Promise.all([
        supabase
          .from("orders")
          .select("total_amount, sale_type, invoice_status, created_at, payment_date, advisor_name")
          .gte("payment_date", startDate)
          .lt("payment_date", endDate),
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
        supabase
          .from("pos_sales")
          .select("total_amount, sale_date")
          .gte("sale_date", startISO)
          .lt("sale_date", endISO),
        supabase
          .from("ferias")
          .select("stand_cost, start_date")
          .gte("start_date", startDate)
          .lt("start_date", endDate),
      ]);

      const orders = ordersRes.data ?? [];
      const feria = feriaRes.data ?? [];
      const petty = pettyRes.data ?? [];
      const pos = posRes.data ?? [];
      const feriasInfo = feriasInfoRes.data ?? [];

      const feriasTotal = feria.reduce((s: number, f: any) => s + Number(f.total_amount || 0), 0);
      const pettyTotal = petty.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      const posTotal = pos.reduce((s: number, p: any) => s + Number(p.total_amount || 0), 0);
      const standTotal = feriasInfo.reduce((s: number, f: any) => s + Number(f.stand_cost || 0), 0);

      // Sum sales per advisor by name (case/diacritic-insensitive matching)
      const norm = (s: string) =>
        (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

      const result: Record<string, number> = {
        Ferias: feriasTotal,
        "Gastos diarios": pettyTotal,
        "Punto 92": posTotal,
        "Stand ferias": standTotal,
      };
      for (const advisor of ADVISORS) {
        const aliases = (ADVISOR_EMAILS[advisor] || [advisor]).map(norm);
        const total = orders
          .filter((o: any) => {
            const a = norm(o.advisor_name || "");
            return aliases.some((alias) => a === alias || a.includes(alias));
          })
          .reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0);
        result[`Asesores - ${advisor}`] = total;
      }
      return result;
    },
  });
}