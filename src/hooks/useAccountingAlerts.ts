import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Subscribes to realtime INSERT events on the orders table
 * and shows toast popups in Contabilidad when new orders arrive.
 */
export function useAccountingAlerts() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("accounting-order-alerts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const order = payload.new as {
            client_name: string;
            brand: string;
            product: string;
            quantity: number;
            sale_type: string;
            total_amount: number | null;
            advisor_name: string;
          };

          const brandLabel = order.brand === "magical" ? "Magical Warmers" : "Sweatspot";
          const typeLabel = order.sale_type === "mayor" ? "Al por mayor" : "Al por menor";
          const total = order.total_amount
            ? `$${Number(order.total_amount).toLocaleString("es-CO")}`
            : "Sin monto";

          toast.info(`📋 Nuevo pedido — ${typeLabel}`, {
            description: `${order.client_name}: ${order.quantity} uds de ${order.product} (${brandLabel}) — ${total}. Asesor: ${order.advisor_name}`,
            duration: 10000,
          });

          // Refresh orders list
          queryClient.invalidateQueries({ queryKey: ["orders"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
