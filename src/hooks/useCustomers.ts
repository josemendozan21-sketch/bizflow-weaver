import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type Customer = {
  id: string;
  document: string | null;
  full_name: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  address: string | null;
  birth_date: string | null;
  sport: string | null;
  notes: string | null;
  tags: string[];
  status: string;
  points_current: number;
  points_accumulated: number;
  tier: string;
  last_redemption_at: string | null;
  referred_by: string | null;
  referral_code: string | null;
  purchase_count: number;
  total_spent: number;
  avg_ticket: number;
  first_purchase_at: string | null;
  last_purchase_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export const SPORT_OPTIONS = [
  "Running",
  "Trail Running",
  "Ciclismo",
  "Triatlón",
  "Gym",
  "Crossfit",
  "Senderismo",
  "Otro",
];

export function useCustomers(filters?: { search?: string; city?: string; sport?: string; status?: string }) {
  return useQuery({
    queryKey: ["customers", filters],
    queryFn: async () => {
      let q = (supabase as any).from("customers").select("*").order("created_at", { ascending: false });
      if (filters?.search) {
        const s = filters.search.trim();
        q = q.or(`full_name.ilike.%${s}%,document.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%`);
      }
      if (filters?.city) q = q.eq("city", filters.city);
      if (filters?.sport) q = q.eq("sport", filters.sport);
      if (filters?.status) q = q.eq("status", filters.status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Customer[];
    },
  });
}

export function useCustomer(id: string | null) {
  return useQuery({
    queryKey: ["customer", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("customers").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return (data ?? null) as Customer | null;
    },
  });
}

/** Lookup by document OR phone — for POS quick search. Returns null if not found. */
export function useCustomerLookup(query: string | null) {
  return useQuery({
    queryKey: ["customer-lookup", query],
    enabled: !!query && query.trim().length >= 4,
    queryFn: async () => {
      const q = (query ?? "").trim();
      const { data, error } = await (supabase as any)
        .from("customers")
        .select("*")
        .or(`document.eq.${q},phone.eq.${q}`)
        .limit(1)
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      return (data ?? null) as Customer | null;
    },
  });
}

export function useCustomerSales(customerId: string | null) {
  return useQuery({
    queryKey: ["customer-sales", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data: sales, error } = await (supabase as any)
        .from("pos_sales")
        .select("id, sale_date, total_amount, payment_method, location_id, notes")
        .eq("customer_id", customerId)
        .order("sale_date", { ascending: false });
      if (error) throw error;
      const ids = (sales ?? []).map((s: any) => s.id);
      let itemsBySale: Record<string, any[]> = {};
      if (ids.length > 0) {
        const { data: items } = await (supabase as any)
          .from("pos_sale_items")
          .select("sale_id, product_name, brand, quantity, unit_price, line_total")
          .in("sale_id", ids);
        for (const it of items ?? []) {
          (itemsBySale[it.sale_id] ||= []).push(it);
        }
      }
      return (sales ?? []).map((s: any) => ({ ...s, items: itemsBySale[s.id] ?? [] }));
    },
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<Customer> & { full_name: string }) => {
      const payload: any = {
        document: input.document?.trim() || null,
        full_name: input.full_name.trim(),
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        city: input.city?.trim() || null,
        address: input.address?.trim() || null,
        birth_date: input.birth_date || null,
        sport: input.sport || null,
        notes: input.notes || null,
        created_by: user?.id ?? null,
      };
      const { data, error } = await (supabase as any).from("customers").insert(payload).select().single();
      if (error) throw error;
      return data as Customer;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["customer-lookup"] });
    },
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Customer> & { id: string }) => {
      const { data, error } = await (supabase as any).from("customers").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data as Customer;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["customer", v.id] });
    },
  });
}

export function useCustomerDashboard() {
  return useQuery({
    queryKey: ["customers-dashboard"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("customers")
        .select("id, full_name, city, total_spent, purchase_count, last_purchase_at, created_at, status");
      if (error) throw error;
      const list = (data ?? []) as any[];
      const now = Date.now();
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const newThisMonth = list.filter((c) => new Date(c.created_at) >= monthStart).length;
      const active30 = list.filter((c) => c.last_purchase_at && now - new Date(c.last_purchase_at).getTime() <= 30 * 86400000).length;
      const inactive90 = list.filter((c) => !c.last_purchase_at || now - new Date(c.last_purchase_at).getTime() > 90 * 86400000).length;
      const totalCust = list.length;
      const avgPerCustomer = totalCust > 0 ? list.reduce((a, c) => a + Number(c.total_spent || 0), 0) / totalCust : 0;
      const top20 = [...list].sort((a, b) => Number(b.total_spent || 0) - Number(a.total_spent || 0)).slice(0, 20);
      return { totalCust, newThisMonth, active30, inactive90, avgPerCustomer, top20 };
    },
  });
}