import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface OrderPayment {
  id: string;
  order_id: string;
  amount: number;
  payment_date: string;
  proof_url: string | null;
  notes: string | null;
  method: string | null;
  recorded_by: string | null;
  recorded_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export function useOrderPayments(orderId: string | undefined) {
  return useQuery({
    queryKey: ["order_payments", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_payments" as any)
        .select("*")
        .eq("order_id", orderId!)
        .order("payment_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as OrderPayment[]) || [];
    },
  });
}

export function useOrderPaymentsByOrderIds(orderIds: string[]) {
  return useQuery({
    queryKey: ["order_payments_bulk", [...orderIds].sort().join(",")],
    enabled: orderIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_payments" as any)
        .select("*")
        .in("order_id", orderIds);
      if (error) throw error;
      return (data as unknown as OrderPayment[]) || [];
    },
  });
}

export function useCreateOrderPayment() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (payment: Omit<OrderPayment, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("order_payments" as any)
        .insert(payment as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as OrderPayment;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["order_payments", vars.order_id] });
      qc.invalidateQueries({ queryKey: ["order_payments_bulk"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: "Abono registrado" });
    },
    onError: (err: any) => {
      toast({ title: "Error al registrar abono", description: err.message, variant: "destructive" });
    },
  });
}

export function useDeleteOrderPayment() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id }: { id: string; order_id: string }) => {
      const { error } = await supabase.from("order_payments" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["order_payments", vars.order_id] });
      qc.invalidateQueries({ queryKey: ["order_payments_bulk"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast({ title: "Abono eliminado" });
    },
    onError: (err: any) => {
      toast({ title: "Error al eliminar abono", description: err.message, variant: "destructive" });
    },
  });
}

export async function uploadPaymentProof(orderId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${orderId}/abono_${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("payment-proofs").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("payment-proofs").getPublicUrl(path);
  return data.publicUrl;
}