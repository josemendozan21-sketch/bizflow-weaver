import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Feria {
  id: string;
  name: string;
  city: string;
  venue: string | null;
  start_date: string;
  end_date: string;
  setup_date: string | null;
  stand_number: string | null;
  stand_size: string | null;
  // Costos detallados
  stand_cost: number;          // Costo Feria
  shipping_cost: number;       // Envío Mercancía
  tickets_cost: number;        // Tiquetes
  advertising_cost: number;    // Publicidad
  merchandise_cost: number;    // Costo de Mercancía
  employees_cost: number;      // Empleados
  lodging_cost: number;        // Viáticos: Hospedaje
  transport_cost: number;      // Viáticos: Transporte
  food_cost: number;           // Viáticos: Alimentación
  other_costs: number;
  assigned_staff: string[] | null;
  materials_needed: string[] | null;
  status: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function calcFeriaTotalCost(f: Feria): number {
  return (f.stand_cost || 0) + (f.shipping_cost || 0) + (f.tickets_cost || 0) +
    (f.advertising_cost || 0) + (f.merchandise_cost || 0) + (f.employees_cost || 0) +
    (f.lodging_cost || 0) + (f.transport_cost || 0) + (f.food_cost || 0) + (f.other_costs || 0);
}

export interface FeriaInventory {
  id: string;
  feria_id: string;
  brand: string;
  product_name: string;
  quantity_assigned: number;
  quantity_returned: number | null;
  unit_price: number;
  notes: string | null;
}

export interface FeriaSale {
  id: string;
  feria_id: string;
  brand: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_method: string | null;
  client_name: string | null;
  sale_date: string;
  notes: string | null;
}

export function useFerias() {
  return useQuery({
    queryKey: ["ferias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ferias")
        .select("*")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data as Feria[];
    },
  });
}

export function useFeriaInventory(feriaId: string | null) {
  return useQuery({
    queryKey: ["feria_inventory", feriaId],
    queryFn: async () => {
      if (!feriaId) return [];
      const { data, error } = await supabase
        .from("feria_inventory")
        .select("*")
        .eq("feria_id", feriaId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as FeriaInventory[];
    },
    enabled: !!feriaId,
  });
}

export function useFeriaSales(feriaId: string | null) {
  return useQuery({
    queryKey: ["feria_sales", feriaId],
    queryFn: async () => {
      if (!feriaId) return [];
      const { data, error } = await supabase
        .from("feria_sales")
        .select("*")
        .eq("feria_id", feriaId)
        .order("sale_date", { ascending: false });
      if (error) throw error;
      return data as FeriaSale[];
    },
    enabled: !!feriaId,
  });
}

export function useCreateFeria() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Omit<Feria, "id" | "created_at" | "updated_at" | "created_by">) => {
      const { data, error } = await supabase
        .from("ferias")
        .insert({ ...input, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ferias"] });
      toast.success("Feria creada");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateFeria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Feria> & { id: string }) => {
      const { error } = await supabase.from("ferias").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ferias"] });
      toast.success("Feria actualizada");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteFeria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ferias").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ferias"] });
      toast.success("Feria eliminada");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useAddFeriaInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<FeriaInventory, "id">) => {
      const { error } = await supabase.from("feria_inventory").insert(input);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["feria_inventory", vars.feria_id] });
      toast.success("Producto asignado");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteFeriaInventory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, feria_id }: { id: string; feria_id: string }) => {
      const { error } = await supabase.from("feria_inventory").delete().eq("id", id);
      if (error) throw error;
      return feria_id;
    },
    onSuccess: (feria_id) => {
      qc.invalidateQueries({ queryKey: ["feria_inventory", feria_id] });
      toast.success("Producto removido");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useAddFeriaSale() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Omit<FeriaSale, "id" | "sale_date">) => {
      const { error } = await supabase
        .from("feria_sales")
        .insert({ ...input, recorded_by: user?.id });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["feria_sales", vars.feria_id] });
      toast.success("Venta registrada");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteFeriaSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, feria_id }: { id: string; feria_id: string }) => {
      const { error } = await supabase.from("feria_sales").delete().eq("id", id);
      if (error) throw error;
      return feria_id;
    },
    onSuccess: (feria_id) => {
      qc.invalidateQueries({ queryKey: ["feria_sales", feria_id] });
      toast.success("Venta eliminada");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
