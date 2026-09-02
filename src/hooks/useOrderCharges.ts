import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OrderCharge {
  id: string;
  order_id: string;
  concept: string;
  amount: number;
  notes: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export function useOrderCharges(orderId: string | undefined) {
  return useQuery({
    queryKey: ["order_charges", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_charges" as any)
        .select("*")
        .eq("order_id", orderId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data as unknown as OrderCharge[]) || [];
    },
  });
}

export function useAddOrderCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (charge: {
      order_id: string;
      concept: string;
      amount: number;
      notes?: string | null;
      created_by?: string | null;
      created_by_name?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("order_charges" as any)
        .insert(charge as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as OrderCharge;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["order_charges", vars.order_id] });
    },
    onError: (err: any) => toast.error("No se pudo agregar el cargo", { description: err.message }),
  });
}

export function useDeleteOrderCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; order_id: string }) => {
      const { error } = await supabase.from("order_charges" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["order_charges", vars.order_id] });
    },
    onError: (err: any) => toast.error("No se pudo eliminar el cargo", { description: err.message }),
  });
}
