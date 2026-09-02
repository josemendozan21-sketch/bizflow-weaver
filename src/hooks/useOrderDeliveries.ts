import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface OrderDelivery {
  id: string;
  order_id: string;
  quantity: number;
  delivered_at: string;
  delivered_by: string | null;
  delivered_by_name: string | null;
  notes: string | null;
  created_at: string;
}

/** Entregas parciales de un pedido (historial + registro) */
export function useOrderDeliveries(orderId?: string | null) {
  const queryClient = useQueryClient();
  const { user, role } = useAuth();

  const canManage = ["admin", "inventarios", "logistica", "produccion"].includes(role ?? "");
  const canDelete = ["admin", "inventarios", "logistica"].includes(role ?? "");

  const { data: deliveries = [], isLoading } = useQuery({
    queryKey: ["order-deliveries", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_deliveries")
        .select("*")
        .eq("order_id", orderId!)
        .order("delivered_at", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as OrderDelivery[];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["order-deliveries"] });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["all-orders"] });
    queryClient.invalidateQueries({ queryKey: ["production-orders"] });
  };

  const addDelivery = useMutation({
    mutationFn: async (input: {
      order_id: string;
      quantity: number;
      delivered_at: string;
      notes?: string | null;
    }) => {
      const { error } = await supabase.from("order_deliveries").insert({
        order_id: input.order_id,
        quantity: input.quantity,
        delivered_at: input.delivered_at,
        notes: input.notes || null,
        delivered_by: user?.id ?? null,
        delivered_by_name:
          (user?.user_metadata?.display_name as string) || user?.email || "Sistema",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Entrega parcial registrada");
    },
    onError: (e: Error) => toast.error("No se pudo registrar", { description: e.message }),
  });

  const deleteDelivery = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("order_deliveries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Entrega eliminada");
    },
    onError: (e: Error) => toast.error("No se pudo eliminar", { description: e.message }),
  });

  const totalDelivered = deliveries.reduce((s, d) => s + (Number(d.quantity) || 0), 0);

  return { deliveries, isLoading, addDelivery, deleteDelivery, totalDelivered, canManage, canDelete };
}
