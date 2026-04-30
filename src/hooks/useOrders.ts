import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export interface Order {
  id: string;
  brand: string;
  sale_type: string;
  client_name: string;
  client_nit: string | null;
  client_phone: string | null;
  client_email: string | null;
  client_address: string | null;
  client_city: string | null;
  product: string;
  quantity: number;
  unit_price: number | null;
  total_amount: number | null;
  abono: number | null;
  ink_color: string | null;
  gel_color: string | null;
  silicone_color: string | null;
  logo_url: string | null;
  observations: string | null;
  personalization: string | null;
  advisor_id: string;
  advisor_name: string;
  production_status: string;
  delivery_date: string | null;
  created_at: string;
  updated_at: string;
  payment_method: string | null;
  payment_proof_url: string | null;
  payment_complete: boolean | null;
  dispatched_at: string | null;
  transportadora: string | null;
  numero_guia: string | null;
  dispatch_notes: string | null;
  invoice_number: string | null;
  invoice_amount: number | null;
  invoice_notes: string | null;
  invoice_date: string | null;
  invoice_status: string;
  invoice_file_url: string | null;
  is_recompra: boolean;
  shipping_cost: number | null;
  returned_at: string | null;
  return_notes: string | null;
}

export const PRODUCTION_STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  diseno: "En diseño",
  produccion_cuerpos: "Producción de cuerpos",
  estampacion: "Estampación",
  dosificacion: "Dosificación",
  sellado: "Sellado",
  recorte: "Recorte",
  empaque: "Empaque",
  listo: "Listo para despacho",
  despachado: "Despachado",
  entregado: "Entregado",
};

export const PRODUCTION_STATUS_COLORS: Record<string, string> = {
  pendiente: "bg-yellow-100 text-yellow-800",
  diseno: "bg-purple-100 text-purple-800",
  produccion_cuerpos: "bg-blue-100 text-blue-800",
  estampacion: "bg-indigo-100 text-indigo-800",
  dosificacion: "bg-cyan-100 text-cyan-800",
  sellado: "bg-teal-100 text-teal-800",
  recorte: "bg-orange-100 text-orange-800",
  empaque: "bg-pink-100 text-pink-800",
  listo: "bg-green-100 text-green-800",
  despachado: "bg-emerald-100 text-emerald-800",
  entregado: "bg-gray-100 text-gray-800",
};

export function useOrders() {
  const { user, role } = useAuth();

  return useQuery({
    queryKey: ["orders", user?.id, role],
    enabled: !!user && !!role,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (order: Omit<Order, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("orders")
        .insert(order)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err: any) => {
      toast({ title: "Error al crear pedido", description: err.message, variant: "destructive" });
    },
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, production_status }: { id: string; production_status: string }) => {
      const { error } = await supabase
        .from("orders")
        .update({ production_status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}
